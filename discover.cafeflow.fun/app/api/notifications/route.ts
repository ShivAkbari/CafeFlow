import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { d1Query, d1QueryOne, d1Exec } from "@/lib/db";

/**
 * GET: Retrieve public VAPID key and customer's notification preferences.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      "BMJkiYP_DZ_fKfAxI1klXFe8YHCqZU0k541wpDO_fPG0fncdPF6HUgXsvfNIS_Y9r3qc-kw9FwskEwKoc2gKrD4";

    if (!user) {
      return NextResponse.json({
        vapidPublicKey,
        authenticated: false,
        promotionalEnabled: false,
        activeSubscriptionsCount: 0
      });
    }

    // Fetch customer's promotional preference
    const pref = await d1QueryOne<{ promotional_enabled: number }>(
      "SELECT promotional_enabled FROM customer_notification_preferences WHERE user_id = ? LIMIT 1",
      [user.id]
    );

    // Fetch active subscriptions count for this user
    const subsCount = await d1QueryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ? AND is_active = 1",
      [user.id]
    );

    return NextResponse.json({
      vapidPublicKey,
      authenticated: true,
      promotionalEnabled: pref ? Boolean(pref.promotional_enabled) : true, // Opt-in by default
      activeSubscriptionsCount: subsCount?.count || 0
    });
  } catch (err: any) {
    console.error("[Notifications Preferences GET]", err);
    return NextResponse.json({ error: err.message || "Failed to load preferences" }, { status: 500 });
  }
}

/**
 * POST: Subscribe to Web Push notifications or update customer consent preferences.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to manage notifications" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, subscription, promotionalEnabled, cafeId } = body;

    const now = Date.now();

    // Action 1: Toggle promotional notifications On/Off
    if (action === "update_preference") {
      const isEnabled = promotionalEnabled !== false ? 1 : 0;
      await d1Exec(
        `INSERT INTO customer_notification_preferences (user_id, promotional_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET promotional_enabled = excluded.promotional_enabled, updated_at = excluded.updated_at`,
        [user.id, isEnabled, now, now]
      );

      // If user disabled notifications, also deactivate current push subscriptions
      if (isEnabled === 0) {
        await d1Exec("UPDATE push_subscriptions SET is_active = 0, updated_at = ? WHERE user_id = ?", [
          now,
          user.id
        ]);
      }

      return NextResponse.json({ success: true, promotionalEnabled: Boolean(isEnabled) });
    }

    // Action 2: Opt-out from a specific cafe
    if (action === "opt_out_cafe" && cafeId) {
      await d1Exec(
        `INSERT OR IGNORE INTO customer_cafe_notification_opt_outs (user_id, cafe_id, created_at)
         VALUES (?, ?, ?)`,
        [user.id, cafeId, now]
      );
      return NextResponse.json({ success: true, optedOutCafe: cafeId });
    }

    // Action 3: Register / store a new browser push subscription
    if (action === "subscribe" && subscription?.endpoint) {
      const endpoint = String(subscription.endpoint).trim();
      const p256dh = String(subscription.keys?.p256dh || "").trim();
      const auth = String(subscription.keys?.auth || "").trim();

      if (!endpoint || !p256dh || !auth) {
        return NextResponse.json({ error: "Invalid subscription keys" }, { status: 400 });
      }

      const userAgent = request.headers.get("user-agent") || "";
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Ensure preference row exists
      await d1Exec(
        `INSERT INTO customer_notification_preferences (user_id, promotional_enabled, created_at, updated_at)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET promotional_enabled = 1, updated_at = excluded.updated_at`,
        [user.id, now, now]
      );

      // Save subscription record
      await d1Exec(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           user_id = excluded.user_id,
           p256dh = excluded.p256dh,
           auth = excluded.auth,
           user_agent = excluded.user_agent,
           is_active = 1,
           updated_at = excluded.updated_at`,
        [subId, user.id, endpoint, p256dh, auth, userAgent, now, now]
      );

      return NextResponse.json({ success: true, subscribed: true });
    }

    // Action 4: Unsubscribe / revoke a subscription
    if (action === "unsubscribe" && subscription?.endpoint) {
      await d1Exec(
        "UPDATE push_subscriptions SET is_active = 0, updated_at = ? WHERE endpoint = ?",
        [now, subscription.endpoint]
      );
      return NextResponse.json({ success: true, unsubscribed: true });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (err: any) {
    console.error("[Notifications API POST]", err);
    return NextResponse.json({ error: err.message || "Failed to update notification subscription" }, { status: 500 });
  }
}
