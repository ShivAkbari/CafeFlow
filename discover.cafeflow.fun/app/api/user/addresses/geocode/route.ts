import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodeCoords } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const formattedAddress = await reverseGeocodeCoords(latNum, lngNum);
    return NextResponse.json({
      formattedAddress
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Geocoding failed" }, { status: 500 });
  }
}
