import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get("cafeId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const partySize = parseInt(searchParams.get("partySize") || "2", 10);

    if (!cafeId || !date) {
      return NextResponse.json({ error: "Missing cafeId or date" }, { status: 400 });
    }

    // 1. Fetch all active tables for this cafe
    const tables = await d1Query<any>(
      `SELECT id, name, capacity, section 
       FROM tables 
       WHERE cafe_id = ? AND active = 1 AND capacity >= ?
       ORDER BY capacity ASC`,
      [cafeId, partySize]
    );

    // 2. Fetch existing confirmed/seated reservations for that date
    const existingReservations = await d1Query<any>(
      `SELECT table_id, reservation_time, duration_minutes, status
       FROM table_reservations
       WHERE cafe_id = ? AND reservation_date = ? AND status IN ('confirmed', 'seated', 'pending')`,
      [cafeId, date]
    );

    // Standard reservation time slots (e.g., 10:00 to 22:00 every 30 mins)
    const timeSlots = [
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
      "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
    ];

    // For each slot, determine available tables
    const slotAvailability = timeSlots.map((slot) => {
      const [slotH, slotM] = slot.split(":").map(Number);
      const slotMinutes = slotH * 60 + slotM;

      // Find booked table IDs at this time
      const bookedTableIds = new Set<string>();
      for (const res of existingReservations) {
        if (!res.table_id) continue;
        const [resH, resM] = (res.reservation_time || "00:00").split(":").map(Number);
        const resStart = resH * 60 + resM;
        const resEnd = resStart + (res.duration_minutes || 90);

        // Check overlap
        if (slotMinutes >= resStart && slotMinutes < resEnd) {
          bookedTableIds.add(res.table_id);
        }
      }

      const availableTables = tables.filter((t) => !bookedTableIds.has(t.id));
      return {
        time: slot,
        available: availableTables.length > 0,
        availableTableCount: availableTables.length,
        suggestedTable: availableTables[0] || null
      };
    });

    return NextResponse.json({
      date,
      partySize,
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
      specialRequests,
      tableId
    } = body;

    if (!cafeId || !customerName || !customerPhone || !date || !time) {
      return NextResponse.json(
        { error: "Missing required reservation details (cafe, name, phone, date, time)" },
        { status: 400 }
      );
    }

    // 1. Verify cafe exists
    const cafe = await d1QueryOne<any>("SELECT id, name FROM cafes WHERE id = ?", [cafeId]);
    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    // 2. Validate availability genuine check
    let assignedTableId = tableId;
    if (assignedTableId) {
      // Check if chosen table is occupied
      const existing = await d1QueryOne<any>(
        `SELECT id FROM table_reservations 
         WHERE cafe_id = ? AND table_id = ? AND reservation_date = ? AND reservation_time = ? AND status IN ('confirmed', 'seated')`,
        [cafeId, assignedTableId, date, time]
      );
      if (existing) {
        return NextResponse.json(
          { error: "The selected table is already reserved at this time. Please select another slot or table." },
          { status: 409 }
        );
      }
    } else {
      // Auto-assign first available table matching party size
      const tables = await d1Query<any>(
        `SELECT id, capacity FROM tables 
         WHERE cafe_id = ? AND active = 1 AND capacity >= ? 
         ORDER BY capacity ASC`,
        [cafeId, Number(partySize) || 2]
      );

      const conflicts = await d1Query<any>(
        `SELECT table_id FROM table_reservations 
         WHERE cafe_id = ? AND reservation_date = ? AND reservation_time = ? AND status IN ('confirmed', 'seated')`,
        [cafeId, date, time]
      );
      const bookedSet = new Set(conflicts.map((c) => c.table_id));

      const freeTable = tables.find((t) => !bookedSet.has(t.id));
      if (!freeTable) {
        return NextResponse.json(
          { error: "No tables available for this party size at the selected time." },
          { status: 409 }
        );
      }
      assignedTableId = freeTable.id;
    }

    // 3. Create server-verified reservation
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    await d1Exec(
      `INSERT INTO table_reservations (
        id, cafe_id, user_id, table_id, customer_name, customer_phone, customer_email,
        party_size, reservation_date, reservation_time, duration_minutes,
        special_requests, status, deposit_amount, deposit_status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 0, 'none', 'discover', ?, ?)`,
      [
        reservationId,
        cafeId,
        user?.id || null,
        assignedTableId,
        customerName.trim(),
        customerPhone.trim(),
        customerEmail?.trim() || null,
        Number(partySize) || 2,
        date,
        time,
        90,
        specialRequests || null,
        now,
        now
      ]
    );

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservationId,
        cafeId,
        cafeName: cafe.name,
        tableId: assignedTableId,
        customerName,
        customerPhone,
        date,
        time,
        partySize,
        status: "confirmed"
      }
    });
  } catch (error: any) {
    console.error("[Discover /api/reservations POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to make reservation" }, { status: 500 });
  }
}
