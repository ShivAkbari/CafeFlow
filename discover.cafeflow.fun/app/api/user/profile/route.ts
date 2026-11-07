import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser, DISCOVER_SESSION_COOKIE } from "@/lib/auth";

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

    // Fetch user wallets across all cafes
    let wallets: Array<{ cafeId: string; cafeName: string; balance: number }> = [];
    let totalWalletBalance = 0;

    try {
      const walletRows = await d1Query<{ cafe_id: string; balance: number; cafe_name?: string }>(
        `SELECT w.cafe_id, w.balance, c.name as cafe_name 
         FROM user_wallets w 
         LEFT JOIN cafes c ON c.id = w.cafe_id 
         WHERE w.user_id = ? AND w.balance > 0`,
        [user.id]
      );

      wallets = (walletRows || []).map((w) => ({
        cafeId: w.cafe_id,
        cafeName: w.cafe_name || (w.cafe_id === "__global__" ? "CafeFlow Global Wallet" : w.cafe_id),
        balance: Number(w.balance) || 0
      }));

      totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    } catch (wErr) {
      console.warn("[Discover user profile wallet fetch warning]", wErr);
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
        dietaryPreferences,
        wallets,
        totalWalletBalance
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

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { reason, feedback } = body || {};

    const userId = user.id;

    // 1. Safety check: Verify user does not own any registered cafes
    const ownedCafes = await d1Query<{ id: string; name: string }>(
      "SELECT id, name FROM cafes WHERE owner_id = ? LIMIT 1",
      [userId]
    ).catch(() => []);

    if (ownedCafes && ownedCafes.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete account: You are the registered owner of cafe "${ownedCafes[0].name}". Please transfer ownership or close your cafe in the admin dashboard before deleting this account.`
        },
        { status: 400 }
      );
    }

    // 2. Log deletion concern / audit log (without personal identifiable data)
    try {
      await d1Exec(
        `INSERT INTO audit_logs (id, org_id, actor_id, actor_email, action, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          "customer_app",
          userId,
          "deleted@cafeflow.fun",
          "customer_account_deleted",
          JSON.stringify({ reason: reason || "Unspecified", feedback: feedback || "" }),
          Date.now()
        ]
      ).catch(() => {});
    } catch {}

    // 3. Wipe all user data across all tables
    await Promise.allSettled([
      d1Exec("DELETE FROM customer_profiles WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM user_wallets WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM wallet_ledger WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM user_scratch_cards WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM user_loyalty_progress WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM push_subscriptions WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM customer_notification_preferences WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM customer_cafe_notification_opt_outs WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM auth_accounts WHERE user_id = ?", [userId]),
      d1Exec("DELETE FROM sessions WHERE user_id = ?", [userId]),
      d1Exec(
        "UPDATE table_reservations SET user_id = NULL, customer_name = 'Deleted Customer', customer_phone = '', customer_email = NULL WHERE user_id = ?",
        [userId]
      ),
      d1Exec("UPDATE cafe_reviews SET user_name = 'Deleted User', user_photo = NULL WHERE user_id = ?", [userId]),
      d1Exec(
        "UPDATE orders SET user_id = NULL, user_name = 'Deleted Customer', user_email = NULL WHERE user_id = ?",
        [userId]
      )
    ]);

    // Finally delete user row
    await d1Exec("DELETE FROM users WHERE id = ?", [userId]);

    // 4. Expire and clear session cookies
    const response = NextResponse.json({
      success: true,
      message: "Account and all personal data have been permanently wiped."
    });

    response.cookies.set({
      name: DISCOVER_SESSION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0
    });
    response.cookies.set({
      name: "cafeflow_session",
      value: "",
      path: "/",
      maxAge: 0
    });

    return response;
  } catch (error: any) {
    console.error("[Discover /api/user/profile DELETE error]", error);
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
