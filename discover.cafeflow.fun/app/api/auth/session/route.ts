import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        uid: user.id,
        name: user.name,
        displayName: user.name,
        email: user.email,
        phone: user.phone || null,
        photoURL: user.photoUrl || null,
        picture: user.photoUrl || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch session" }, { status: 500 });
  }
}
