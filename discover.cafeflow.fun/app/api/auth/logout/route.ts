import { NextRequest, NextResponse } from "next/server";
import { DISCOVER_SESSION_COOKIE, hashSessionToken } from "@/lib/auth";
import { d1Exec } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(DISCOVER_SESSION_COOKIE)?.value;
    if (token) {
      const tokenHash = await hashSessionToken(token);
      await d1Exec("UPDATE sessions SET revoked_at = ? WHERE id = ?", [
        Math.floor(Date.now() / 1000),
        tokenHash
      ]).catch(() => {});
    }

    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.set({
      name: DISCOVER_SESSION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0
    });

    return response;
  } catch (error: any) {
    console.error("[Logout Error]", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
