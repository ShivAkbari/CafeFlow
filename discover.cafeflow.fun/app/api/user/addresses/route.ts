import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { reverseGeocodeCoords } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, addresses: [] });
    }

    const addresses = await d1Query<any>(
      `SELECT id, user_id, label, recipient_name, contact_number, formatted_address,
              house_flat, building_name, landmark, city, state, postal_code,
              latitude, longitude, is_default, created_at, updated_at
       FROM customer_delivery_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [user.id]
    );

    return NextResponse.json({
      authenticated: true,
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipientName: a.recipient_name,
        contactNumber: a.contact_number,
        formattedAddress: a.formatted_address,
        houseFlat: a.house_flat || "",
        buildingName: a.building_name || "",
        landmark: a.landmark || "",
        city: a.city || "",
        state: a.state || "",
        postalCode: a.postal_code || "",
        latitude: a.latitude,
        longitude: a.longitude,
        isDefault: Boolean(a.is_default),
        createdAt: a.created_at
      }))
    });
  } catch (error: any) {
    console.error("[Discover /api/user/addresses GET error]", error);
    return NextResponse.json({ error: error.message || "Failed to load addresses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      label = "Home",
      recipientName,
      contactNumber,
      formattedAddress,
      houseFlat = "",
      buildingName = "",
      landmark = "",
      city = "",
      state = "",
      postalCode = "",
      latitude,
      longitude,
      isDefault = false
    } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    let resolvedAddress = (formattedAddress || "").trim();
    if (!resolvedAddress || resolvedAddress.length < 5 || resolvedAddress.startsWith("Coordinate Location")) {
      resolvedAddress = await reverseGeocodeCoords(latNum, lngNum);
    }

    const now = Date.now();
    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If marked default, unset others for this user
    if (isDefault) {
      await d1Exec(
        "UPDATE customer_delivery_addresses SET is_default = 0 WHERE user_id = ?",
        [user.id]
      );
    }

    await d1Exec(
      `INSERT INTO customer_delivery_addresses (
        id, user_id, label, recipient_name, contact_number, formatted_address,
        house_flat, building_name, landmark, city, state, postal_code,
        latitude, longitude, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        addressId,
        user.id,
        label,
        recipientName?.trim() || user.name || "Customer",
        contactNumber?.trim() || user.phone || "",
        resolvedAddress,
        houseFlat?.trim() || null,
        buildingName?.trim() || null,
        landmark?.trim() || null,
        city?.trim() || null,
        state?.trim() || null,
        postalCode?.trim() || null,
        latNum,
        lngNum,
        isDefault ? 1 : 0,
        now,
        now
      ]
    );

    return NextResponse.json({
      success: true,
      address: {
        id: addressId,
        label,
        recipientName: recipientName?.trim() || user.name,
        contactNumber: contactNumber?.trim() || user.phone,
        formattedAddress: resolvedAddress,
        houseFlat,
        buildingName,
        landmark,
        city,
        state,
        postalCode,
        latitude: latNum,
        longitude: lngNum,
        isDefault: Boolean(isDefault)
      }
    });
  } catch (error: any) {
    console.error("[Discover /api/user/addresses POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to save address" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing address ID" }, { status: 400 });
    }

    await d1Exec(
      "DELETE FROM customer_delivery_addresses WHERE id = ? AND user_id = ?",
      [id, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Discover /api/user/addresses DELETE error]", error);
    return NextResponse.json({ error: error.message || "Failed to delete address" }, { status: 500 });
  }
}
