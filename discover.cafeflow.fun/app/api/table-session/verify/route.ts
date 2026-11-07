import { NextRequest, NextResponse } from "next/server";
import { d1QueryOne, d1Query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  signTableSession,
  verifyTableSessionToken,
  calculateDistanceMeters,
  TABLE_SESSION_COOKIE
} from "@/lib/table-session";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(TABLE_SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ verified: false });
    }

    const payload = await verifyTableSessionToken(sessionCookie);
    if (!payload) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({
      verified: true,
      session: {
        cafeId: payload.cafeId,
        tableId: payload.tableId,
        tableName: payload.tableName,
        expiresAt: payload.expiresAt
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Session verification failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cafeSlug, tableToken, customerLat, customerLng } = body;

    if (!cafeSlug || !tableToken) {
      return NextResponse.json(
        { error: "Missing cafeSlug or tableToken" },
        { status: 400 }
      );
    }

    // 1. Verify cafe exists & is active
    const cafe = await d1QueryOne<any>(
      `SELECT id, name, slug, status FROM cafes WHERE slug = ? OR id = ? LIMIT 1`,
      [cafeSlug, cafeSlug]
    );

    if (!cafe || cafe.status === "disabled" || cafe.status === "suspended") {
      return NextResponse.json({ error: "Cafe is inactive or not found" }, { status: 404 });
    }

    // 2. Fetch table by public_token
    const trimmedToken = (tableToken || "").trim();
    const table = await d1QueryOne<any>(
      `SELECT id, name, capacity, section, public_token, active 
       FROM tables 
       WHERE cafe_id = ? AND (public_token = ? OR id = ?) AND active = 1 
       LIMIT 1`,
      [cafe.id, trimmedToken, trimmedToken]
    );

    if (!table) {
      return NextResponse.json(
        {
          error: "Invalid or expired table QR code. You can still browse the public menu or reserve a table.",
          code: "INVALID_TABLE_TOKEN"
        },
        { status: 403 }
      );
    }

    // 3. Proximity check if cafe coordinates are configured
    const settingRow = await d1QueryOne<any>(
      `SELECT data_json FROM cafe_settings WHERE cafe_id = ? AND section = 'general' LIMIT 1`,
      [cafe.id]
    );

    if (settingRow?.data_json) {
      try {
        const general = JSON.parse(settingRow.data_json);
        if (
          general.enforceGeofence &&
          typeof general.cafeLat === "number" &&
          typeof general.cafeLng === "number"
        ) {
          if (typeof customerLat !== "number" || typeof customerLng !== "number") {
            return NextResponse.json(
              {
                error: "This cafe requires location verification to order at the table. Please enable GPS location permission.",
                code: "LOCATION_REQUIRED"
              },
              { status: 403 }
            );
          }

          const distanceMeters = calculateDistanceMeters(
            customerLat,
            customerLng,
            general.cafeLat,
            general.cafeLng
          );

          const maxAllowedMeters = general.geofenceRadiusMeters || 300;
          if (distanceMeters > maxAllowedMeters) {
            return NextResponse.json(
              {
                error: `Location check failed. You appear to be ${Math.round(distanceMeters)}m away (max allowed ${maxAllowedMeters}m). Dine-in ordering is restricted to on-site guests.`,
                code: "PROXIMITY_EXCEEDED",
                distanceMeters
              },
              { status: 403 }
            );
          }
        }
      } catch (err) {}
    }

    // 4. Server-Side Time-Aware Table Reservation Lock Check
    const user = await getSessionUser(request).catch(() => null);
    const cafeTz = cafe.timezone || "UTC";

    // Format wall-clock date string "YYYY-MM-DD" and current minutes
    const now = Date.now();
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: cafeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = dtf.formatToParts(new Date(now));
    let y = 1970, m = 1, d = 1, hr = 0, min = 0;
    for (const p of parts) {
      if (p.type === "year") y = parseInt(p.value, 10);
      else if (p.type === "month") m = parseInt(p.value, 10);
      else if (p.type === "day") d = parseInt(p.value, 10);
      else if (p.type === "hour") hr = parseInt(p.value, 10) === 24 ? 0 : parseInt(p.value, 10);
      else if (p.type === "minute") min = parseInt(p.value, 10);
    }
    const todayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const currentMinutes = hr * 60 + min;

    // Check active reservations on this table today
    const holdCutoff = now - 10 * 60 * 1000;
    const activeReservations = await d1Query<any>(
      `SELECT id, user_id, customer_name, customer_phone, customer_email,
              reservation_time, duration_minutes, status, created_at
       FROM table_reservations
       WHERE cafe_id = ? AND table_id = ? AND reservation_date = ?
         AND (status IN ('confirmed', 'seated', 'arrived')
              OR (status = 'held' AND created_at > ?))
       ORDER BY reservation_time ASC`,
      [cafe.id, table.id, todayStr, holdCutoff]
    ).catch(() => []);

    let isReservedForOther = false;
    let isReservedForThisCustomer = false;
    let matchingReservation: any = null;

    if (activeReservations && activeReservations.length > 0) {
      for (const res of activeReservations) {
        const [resH, resM] = (res.reservation_time || "00:00").split(":").map(Number);
        const startMin = resH * 60 + resM;
        const duration = res.duration_minutes || 90;
        const lockStart = Math.max(0, startMin - 15); // 15-minute buffer before booking
        const lockEnd = startMin + duration;

        if (currentMinutes >= lockStart && currentMinutes <= lockEnd) {
          // Check if this reservation belongs to the scanning customer
          const isUserMatch = user?.id && res.user_id && user.id === res.user_id;
          const isPhoneMatch = user?.phone && res.customer_phone && user.phone.replace(/\D/g, "").endsWith(res.customer_phone.replace(/\D/g, "").slice(-10));
          const isEmailMatch = user?.email && res.customer_email && user.email.toLowerCase() === res.customer_email.toLowerCase();

          if (isUserMatch || isPhoneMatch || isEmailMatch) {
            isReservedForThisCustomer = true;
            matchingReservation = res;
            break;
          } else {
            isReservedForOther = true;
            matchingReservation = res;
          }
        }
      }
    }

    if (isReservedForOther && !isReservedForThisCustomer) {
      return NextResponse.json(
        {
          error: "This table is reserved right now. It cannot accept new dine-in orders during this booking.",
          code: "TABLE_RESERVED",
          reservation: {
            startTime: matchingReservation.reservation_time,
            durationMinutes: matchingReservation.duration_minutes || 90
          }
        },
        { status: 403 }
      );
    }

    // 5. Issue cryptographically signed table session
    const expiresAt = now + 3 * 60 * 60 * 1000; // 3 hours

    const token = await signTableSession({
      cafeId: cafe.id,
      tableId: table.id,
      tableName: table.name,
      verifiedAt: now,
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      verified: true,
      table: {
        id: table.id,
        name: table.name,
        section: table.section || null
      },
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug
      }
    });

    response.cookies.set({
      name: TABLE_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3 * 3600,
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("[Table QR Verify Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify table session" },
      { status: 500 }
    );
  }
}
