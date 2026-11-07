import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Delivery quotes are currently disabled.",
      code: "DELIVERY_DISABLED"
    },
    { status: 403 }
  );
}
