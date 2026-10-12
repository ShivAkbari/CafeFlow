import { NextRequest } from "next/server";
import { d1QueryOne } from "./db";

export interface DiscoverUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
}

export const DISCOVER_SESSION_COOKIE = "cafeflow_discover_session";

/**
 * Verify user from session token or authorization header
 */
export async function getSessionUser(request: NextRequest): Promise<DiscoverUser | null> {
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : "";

  if (!token) {
    token = request.cookies.get(DISCOVER_SESSION_COOKIE)?.value || "";
  }

  // Also check main cafeflow_session cookie for seamless SSO across subdomains
  if (!token) {
    token = request.cookies.get("cafeflow_session")?.value || "";
  }

  if (!token) return null;

  try {
    // 1. Hash token to check sessions table
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const now = Math.floor(Date.now() / 1000);
    const session = await d1QueryOne<{ user_id: string }>(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ? AND revoked_at IS NULL LIMIT 1",
      [tokenHash, now]
    );

    if (!session || !session.user_id) return null;

    const user = await d1QueryOne<{ id: string; name: string; email: string; phone: string; photo_url: string }>(
      "SELECT id, name, email, phone, photo_url FROM users WHERE id = ? LIMIT 1",
      [session.user_id]
    );

    if (!user) return null;

    return {
      id: user.id,
      name: user.name || "Customer",
      email: user.email,
      phone: user.phone,
      photoUrl: user.photo_url
    };
  } catch (err) {
    console.error("[Discover auth] Error verifying session:", err);
    return null;
  }
}
