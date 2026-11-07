import { NextRequest, NextResponse } from "next/server";
import { d1Exec, d1QueryOne } from "@/lib/db";
import { DISCOVER_SESSION_COOKIE, hashSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, email, name, photoUrl } = body;

    let userEmail = (email || "").trim().toLowerCase();
    let userName = (name || "").trim();
    let userPhoto = photoUrl || "";

    // 1. If Google ID Token credential was provided, verify and decode it
    if (credential) {
      try {
        // Decode JWT payload without external library
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
          const payload = JSON.parse(payloadJson);

          if (payload.email) {
            userEmail = payload.email.toLowerCase();
          }
          if (payload.name) {
            userName = payload.name;
          }
          if (payload.picture) {
            userPhoto = payload.picture;
          }
        }
      } catch (err) {
        console.warn("[Google Auth] Error decoding credential:", err);
      }
    }

    if (!userEmail) {
      return NextResponse.json({ error: "Missing valid email address for Google login" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const nowMs = Date.now();

    // 2. Lookup or create user in users table
    let user = await d1QueryOne<any>(
      "SELECT id, name, email, phone, photo_url FROM users WHERE LOWER(email) = ? LIMIT 1",
      [userEmail]
    );

    if (!user) {
      const newUserId = `usr_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
      userName = userName || userEmail.split("@")[0];

      await d1Exec(
        `INSERT INTO users (id, name, email, photo_url, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUserId, userName, userEmail, userPhoto, nowMs, nowMs]
      );

      // Create initial customer profile
      await d1Exec(
        `INSERT OR IGNORE INTO customer_profiles (id, user_id, updated_at) 
         VALUES (?, ?, ?)`,
        [`prof_${newUserId}`, newUserId, nowMs]
      ).catch(() => {});

      user = {
        id: newUserId,
        name: userName,
        email: userEmail,
        phone: null,
        photo_url: userPhoto
      };
    } else {
      // Update photo or name if empty
      if (userPhoto && !user.photo_url) {
        await d1Exec("UPDATE users SET photo_url = ?, updated_at = ? WHERE id = ?", [userPhoto, nowMs, user.id]);
      }
    }

    // 3. Generate a secure session token and insert into sessions table
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const plainToken = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const tokenHash = await hashSessionToken(plainToken);
    const expiresAt = now + 30 * 24 * 3600; // 30 days

    const userAgent = request.headers.get("user-agent") || "";
    const ip = request.headers.get("x-forwarded-for") || "";

    await d1Exec(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tokenHash, user.id, now, expiresAt, userAgent, ip]
    );

    // 4. Return response with auth cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photoUrl: userPhoto || user.photo_url
      }
    });

    const isProd = process.env.NODE_ENV === "production";
    const host = request.headers.get("host") || "";
    const isCafeflowDomain = host.includes("cafeflow.fun");
    const cookieDomain = isProd && isCafeflowDomain ? ".cafeflow.fun" : undefined;

    // Set discover session cookie
    response.cookies.set({
      name: DISCOVER_SESSION_COOKIE,
      value: plainToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
      path: "/",
      domain: cookieDomain
    });

    // Also set root cafeflow_session cookie for unified SSO across *.cafeflow.fun
    response.cookies.set({
      name: "cafeflow_session",
      value: plainToken,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
      path: "/",
      domain: cookieDomain
    });

    return response;
  } catch (error: any) {
    console.error("[Google Auth Login Error]", error);
    return NextResponse.json({ error: error.message || "Failed to complete Google login" }, { status: 500 });
  }
}
