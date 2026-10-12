import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Fetch customer profile preferences
    const profile = await d1QueryOne<any>(
      "SELECT * FROM customer_profiles WHERE user_id = ?",
      [user.id]
    );

    let favorites = [];
    let savedAddresses = [];
    let dietaryPreferences = [];

    if (profile) {
      try { favorites = JSON.parse(profile.favorite_cafes_json || "[]"); } catch {}
      try { savedAddresses = JSON.parse(profile.saved_addresses_json || "[]"); } catch {}
      try { dietaryPreferences = JSON.parse(profile.dietary_preferences_json || "[]"); } catch {}
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || profile?.default_phone || "",
        photoUrl: user.photoUrl,
        favorites,
        savedAddresses,
        dietaryPreferences
      }
    });
  } catch (error: any) {
    console.error("[Discover /api/user/profile GET error]", error);
    return NextResponse.json({ error: error.message || "Failed to load profile" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, dietaryPreferences, favoriteCafes, savedAddresses } = body;

    const now = Date.now();

    // Update users table
    if (name || phone) {
      await d1Exec(
        `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = ? WHERE id = ?`,
        [name?.trim() || null, phone?.trim() || null, now, user.id]
      );
    }

    // Upsert customer_profiles
    const existing = await d1QueryOne<any>("SELECT user_id FROM customer_profiles WHERE user_id = ?", [user.id]);
    if (existing) {
      await d1Exec(
        `UPDATE customer_profiles 
         SET dietary_preferences_json = COALESCE(?, dietary_preferences_json),
             favorite_cafes_json = COALESCE(?, favorite_cafes_json),
             saved_addresses_json = COALESCE(?, saved_addresses_json),
             default_phone = COALESCE(?, default_phone),
             updated_at = ?
         WHERE user_id = ?`,
        [
          dietaryPreferences ? JSON.stringify(dietaryPreferences) : null,
          favoriteCafes ? JSON.stringify(favoriteCafes) : null,
          savedAddresses ? JSON.stringify(savedAddresses) : null,
          phone?.trim() || null,
          now,
          user.id
        ]
      );
    } else {
      await d1Exec(
        `INSERT INTO customer_profiles (
          user_id, dietary_preferences_json, favorite_cafes_json, saved_addresses_json, default_phone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          JSON.stringify(dietaryPreferences || []),
          JSON.stringify(favoriteCafes || []),
          JSON.stringify(savedAddresses || []),
          phone?.trim() || null,
          now,
          now
        ]
      );
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully" });
  } catch (error: any) {
    console.error("[Discover /api/user/profile POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
