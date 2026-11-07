import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get("cafeId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const partySize = parseInt(searchParams.get("partySize") || "2", 10);
    const phone = searchParams.get("phone") || user?.phone;

    // If listing customer reservations
    const searchPhone = phone || user?.phone;
    if (!cafeId && (user || searchPhone)) {
      let query = `
        SELECT r.*, c.name as cafe_name, c.slug as cafe_slug, c.logo as cafe_logo, c.address as cafe_address
        FROM table_reservations r
        LEFT JOIN cafes c ON (r.cafe_id = c.id OR r.cafe_id = c.slug)
        WHERE 1=1
      `;
      const params: any[] = [];
      if (user?.id && searchPhone) {
        const cleanPhone = searchPhone.replace(/[\s\-()]/g, "");
        query += ` AND (r.user_id = ? OR r.customer_phone = ? OR REPLACE(REPLACE(r.customer_phone, ' ', ''), '-', '') LIKE ?)`;
        params.push(user.id, searchPhone, `%${cleanPhone.slice(-10)}`);
      } else if (user?.id) {
        query += ` AND r.user_id = ?`;
        params.push(user.id);
      } else if (searchPhone) {
        const cleanPhone = searchPhone.replace(/[\s\-()]/g, "");
        query += ` AND (r.customer_phone = ? OR REPLACE(REPLACE(r.customer_phone, ' ', ''), '-', '') LIKE ?)`;
        params.push(searchPhone, `%${cleanPhone.slice(-10)}`);
      }
      query += ` ORDER BY r.reservation_date DESC, r.reservation_time DESC LIMIT 50`;

      const reservations = await d1Query<any>(query, params);
      return NextResponse.json({ reservations });
    }

    if (!cafeId || !date) {
      return NextResponse.json({ error: "Missing cafeId or date" }, { status: 400 });
    }

    // Ensure reservations table exists
    await d1Exec(`
      CREATE TABLE IF NOT EXISTS table_reservations (
        id TEXT PRIMARY KEY,
        cafe_id TEXT NOT NULL,
        user_id TEXT,
        table_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        party_size INTEGER NOT NULL DEFAULT 2,
        reservation_date TEXT NOT NULL,
        reservation_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 90,
        special_requests TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        deposit_amount REAL NOT NULL DEFAULT 0,
        deposit_status TEXT NOT NULL DEFAULT 'none',
        source TEXT NOT NULL DEFAULT 'discover',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).catch(() => {});

    const seatingPreference = searchParams.get("seatingPreference"); // Indoor, Outdoor, Rooftop, etc.

    // 1. Fetch cafe and reservation settings
    const cafe = await d1QueryOne<any>("SELECT id, name, slug, timezone FROM cafes WHERE id = ? OR slug = ?", [cafeId, cafeId]);
    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    const settingsRows = await d1Query<any>(
      `SELECT section, data_json FROM cafe_settings WHERE cafe_id = ?`,
      [cafe.id]
    );
    const settingsMap: Record<string, any> = {};
    for (const row of settingsRows) {
      try { settingsMap[row.section] = JSON.parse(row.data_json || "{}"); } catch {}
    }

    const resConfig = settingsMap.reservations || {};
    const genConfig = settingsMap.general || {};

    if (resConfig.enabled === false) {
      return NextResponse.json({
        date,
        partySize,
        enabled: false,
        message: "Reservations are currently disabled for this cafe.",
        tables: [],
        slots: []
      });
    }

    const minGuests = resConfig.minGuests || 1;
    const maxGuests = resConfig.maxGuests || 12;
    const durationMinutes = resConfig.durationMinutes || 90;
    const bufferMinutes = resConfig.bufferMinutes || 0;

    // 2. Fetch all active tables for this cafe
    let tableQueryParams: any[] = [cafe.id];
    let tableQuery = `SELECT id, name, capacity, section FROM tables WHERE cafe_id = ? AND active = 1`;
    
    if (partySize) {
      tableQuery += ` AND capacity >= ?`;
      tableQueryParams.push(partySize);
    }

    if (seatingPreference && seatingPreference !== "Any" && seatingPreference !== "Any available seating") {
      tableQuery += ` AND LOWER(section) = LOWER(?)`;
      tableQueryParams.push(seatingPreference);
    }

    tableQuery += ` ORDER BY capacity ASC`;
    let tables: any[] = await d1Query<any>(tableQuery, tableQueryParams).catch(() => []);

    // 3. Fetch existing reservations (confirmed, seated, pending, or held) for that date
    // Note: Held reservations are considered active if within valid hold window (e.g. 10 mins)
    const holdCutoff = Date.now() - (10 * 60 * 1000);
    const existingReservations = await d1Query<any>(
      `SELECT table_id, reservation_time, duration_minutes, status, created_at
       FROM table_reservations
       WHERE cafe_id = ? AND reservation_date = ? 
         AND (status IN ('confirmed', 'seated', 'pending') 
              OR (status = 'held' AND created_at > ?))`,
      [cafe.id, date, holdCutoff]
    ).catch(() => []);

    // 4. Time slot generation based on cafe hours
    // Parse opening and closing times, e.g. "10:00" to "22:00"
    const openTimeStr = genConfig.openingTime || "10:00";
    const closeTimeStr = genConfig.closingTime || "22:00";
    const [openH, openM] = openTimeStr.split(":").map(Number);
    const [closeH, closeM] = closeTimeStr.split(":").map(Number);
    const startOfDayMinutes = (isNaN(openH) ? 10 : openH) * 60 + (isNaN(openM) ? 0 : openM);
    const endOfDayMinutes = (isNaN(closeH) ? 22 : closeH) * 60 + (isNaN(closeM) ? 0 : closeM);

    const timeSlots: string[] = [];
    for (let m = startOfDayMinutes; m <= endOfDayMinutes - durationMinutes; m += 30) {
      const hh = Math.floor(m / 60).toString().padStart(2, "0");
      const mm = (m % 60).toString().padStart(2, "0");
      timeSlots.push(`${hh}:${mm}`);
    }

    // If no slots generated due to irregular hours, fallback to standard range
    if (timeSlots.length === 0) {
      for (let m = 600; m <= 1320 - durationMinutes; m += 30) {
        const hh = Math.floor(m / 60).toString().padStart(2, "0");
        const mm = (m % 60).toString().padStart(2, "0");
        timeSlots.push(`${hh}:${mm}`);
      }
    }

    // 5. Calculate slot availability using interval overlap: [T, T + durationMinutes + bufferMinutes]
    const slotAvailability = timeSlots.map((slot) => {
      const [slotH, slotM] = slot.split(":").map(Number);
      const reqStart = slotH * 60 + slotM;
      const reqEnd = reqStart + durationMinutes + bufferMinutes;

      // Find booked table IDs during this 90-minute window
      const bookedTableIds = new Set<string>();
      for (const res of existingReservations) {
        if (!res.table_id) continue;
        const [resH, resM] = (res.reservation_time || "00:00").split(":").map(Number);
        const resStart = resH * 60 + resM;
        const resDuration = res.duration_minutes || durationMinutes;
        const resEnd = resStart + resDuration + bufferMinutes;

        // Interval Overlap condition:
        // Two intervals [A, B] and [C, D] overlap if and only if A < D and C < B
        if (reqStart < resEnd && resStart < reqEnd) {
          bookedTableIds.add(res.table_id);
        }
      }

      // If cafe has configured tables in D1, verify against table capacities
      const availableTables = tables.filter((t) => !bookedTableIds.has(t.id));
      
      // If cafe has no specific table records created yet in DB, check overall capacity count (default 6 virtual tables)
      const isAvailable = tables.length > 0 
        ? availableTables.length > 0 
        : bookedTableIds.size < 6;

      return {
        time: slot,
        available: isAvailable,
        availableTableCount: tables.length > 0 ? availableTables.length : Math.max(0, 6 - bookedTableIds.size),
        suggestedTable: availableTables[0] || null
      };
    });

    return NextResponse.json({
      date,
      partySize,
      durationMinutes,
      seatingTypes: resConfig.seatingTypes || ["Indoor", "Outdoor"],
      tables,
      slots: slotAvailability
    });
  } catch (error: any) {
    console.error("[Discover /api/reservations GET error]", error);
    return NextResponse.json({ error: error.message || "Failed to check reservations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();

    const {
      cafeId,
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      date,
      time,
      seatingPreference,
      specialRequests,
      tableId,
      action // "hold" | "confirm" | "release"
    } = body;

    if (!cafeId) {
      return NextResponse.json({ error: "Missing cafeId" }, { status: 400 });
    }

    // 1. Verify cafe exists
    const cafe = await d1QueryOne<any>("SELECT id, name, slug FROM cafes WHERE id = ? OR slug = ?", [cafeId, cafeId]);
    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    // If releasing a temporary hold
    if (action === "release") {
      const holdId = body.reservationId;
      if (holdId) {
        await d1Exec("DELETE FROM table_reservations WHERE id = ? AND status = 'held'", [holdId]).catch(() => {});
      }
      return NextResponse.json({ success: true, released: true });
    }

    if (!customerName || !customerPhone || !date || !time) {
      return NextResponse.json(
        { error: "Missing required reservation details (name, phone, date, time)" },
        { status: 400 }
      );
    }

    // Phone number format validation (allows +91 or standard 10-15 digit phone formats)
    const sanitizedPhone = customerPhone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^\+?[0-9]{10,14}$/;
    if (!phoneRegex.test(sanitizedPhone)) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit phone number (e.g. 9876543210 or +919876543210)" },
        { status: 400 }
      );
    }

    // 2. Fetch cafe reservation settings
    const settingsRows = await d1Query<any>(
      `SELECT section, data_json FROM cafe_settings WHERE cafe_id = ?`,
      [cafe.id]
    );
    const settingsMap: Record<string, any> = {};
    for (const row of settingsRows) {
      try { settingsMap[row.section] = JSON.parse(row.data_json || "{}"); } catch {}
    }

    const resConfig = settingsMap.reservations || {};
    if (resConfig.enabled === false) {
      return NextResponse.json({ error: "Reservations are currently disabled for this cafe." }, { status: 400 });
    }

    const guests = Number(partySize) || 2;
    const minGuests = resConfig.minGuests || 1;
    const maxGuests = resConfig.maxGuests || 12;
    if (guests < minGuests || guests > maxGuests) {
      return NextResponse.json(
        { error: `Guest count must be between ${minGuests} and ${maxGuests} for this cafe.` },
        { status: 400 }
      );
    }

    const durationMinutes = resConfig.durationMinutes || 90;
    const bufferMinutes = resConfig.bufferMinutes || 0;

    // 3. Precise 90-minute time interval overlap detection
    const [reqH, reqM] = time.split(":").map(Number);
    const reqStart = reqH * 60 + reqM;
    const reqEnd = reqStart + durationMinutes + bufferMinutes;

    const holdCutoff = Date.now() - (10 * 60 * 1000); // 10 minute temporary hold expiry
    const conflictingBookings = await d1Query<any>(
      `SELECT id, table_id, reservation_time, duration_minutes, status, created_at
       FROM table_reservations
       WHERE cafe_id = ? AND reservation_date = ? 
         AND (status IN ('confirmed', 'seated', 'pending') 
              OR (status = 'held' AND created_at > ?))`,
      [cafe.id, date, holdCutoff]
    ).catch(() => []);

    const bookedTableIds = new Set<string>();
    for (const b of conflictingBookings) {
      if (!b.table_id) continue;
      const [bH, bM] = (b.reservation_time || "00:00").split(":").map(Number);
      const bStart = bH * 60 + bM;
      const bDuration = b.duration_minutes || durationMinutes;
      const bEnd = bStart + bDuration + bufferMinutes;

      // Interval overlap test: reqStart < bEnd && bStart < reqEnd
      if (reqStart < bEnd && bStart < reqEnd) {
        bookedTableIds.add(b.table_id);
      }
    }

    // 4. Table Allocation
    let assignedTableId: string | null = tableId || null;

    if (assignedTableId) {
      if (bookedTableIds.has(assignedTableId)) {
        return NextResponse.json(
          { error: "The selected table is occupied during this 90-minute interval. Please select another slot or table." },
          { status: 409 }
        );
      }
    } else {
      // Find candidate tables matching seating preference and party size
      let tableQuery = `SELECT id, name, capacity, section FROM tables WHERE cafe_id = ? AND active = 1 AND capacity >= ?`;
      const tableQueryParams: any[] = [cafe.id, guests];

      if (seatingPreference && seatingPreference !== "Any" && seatingPreference !== "Any available seating") {
        tableQuery += ` AND LOWER(section) = LOWER(?)`;
        tableQueryParams.push(seatingPreference);
      }
      tableQuery += ` ORDER BY capacity ASC`;

      const candidateTables = await d1Query<any>(tableQuery, tableQueryParams).catch(() => []);

      if (candidateTables.length > 0) {
        const availableTable = candidateTables.find((t: any) => !bookedTableIds.has(t.id));
        if (!availableTable) {
          return NextResponse.json(
            { error: `No tables available matching your seating preference (${seatingPreference || "Any"}) for ${guests} guests for the 90-minute slot starting at ${time}.` },
            { status: 409 }
          );
        }
        assignedTableId = availableTable.id;
      } else {
        // If cafe does not have table objects yet, check virtual capacity
        if (bookedTableIds.size >= 6) {
          return NextResponse.json(
            { error: `Fully booked at ${time}. All tables are reserved for this 90-minute window.` },
            { status: 409 }
          );
        }
        assignedTableId = `tbl_auto_${bookedTableIds.size + 1}`;
      }
    }

    // 5. Atomic Reservation Creation in D1
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const isHoldOnly = action === "hold";
    const status = isHoldOnly ? "held" : "confirmed";

    await d1Exec(
      `INSERT INTO table_reservations (
        id, cafe_id, user_id, table_id, customer_name, customer_phone, customer_email,
        party_size, reservation_date, reservation_time, duration_minutes,
        special_requests, status, deposit_amount, deposit_status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'none', 'discover', ?, ?)`,
      [
        reservationId,
        cafe.id,
        user?.id || null,
        assignedTableId,
        customerName.trim(),
        customerPhone.trim(),
        customerEmail?.trim() || null,
        guests,
        date,
        time,
        durationMinutes,
        specialRequests || null,
        status,
        now,
        now
      ]
    );

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservationId,
        cafeId: cafe.id,
        cafeName: cafe.name,
        tableId: assignedTableId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        date,
        time,
        partySize: guests,
        durationMinutes,
        status,
        expiresAt: isHoldOnly ? now + 10 * 60 * 1000 : null
      }
    });
  } catch (error: any) {
    console.error("[Discover /api/reservations POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to make reservation" }, { status: 500 });
  }
}
