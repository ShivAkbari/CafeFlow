import { NextRequest, NextResponse } from "next/server";
import { DELETE as deleteProfileHandler } from "../profile/route";

export async function POST(request: NextRequest) {
  return deleteProfileHandler(request);
}

export async function DELETE(request: NextRequest) {
  return deleteProfileHandler(request);
}

