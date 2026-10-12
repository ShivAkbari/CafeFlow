import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get("cafeId");

    let query = `
      SELECT r.*, c.name as cafe_name
      FROM cafe_reviews r
      JOIN cafes c ON r.cafe_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cafeId) {
      query += ` AND r.cafe_id = ?`;
      params.push(cafeId);
    }

    query += ` ORDER BY r.created_at DESC LIMIT 50`;

    const reviews = await d1Query<any>(query, params);
    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error("[Discover /api/reviews GET error]", error);
    return NextResponse.json({ error: error.message || "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { cafeId, rating, reviewText, customerName } = body;

    if (!cafeId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating or missing cafe" }, { status: 400 });
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const name = user?.name || customerName || "Customer";

    await d1Exec(
      `INSERT INTO cafe_reviews (id, cafe_id, user_id, user_name, user_photo, rating, review_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        cafeId,
        user?.id || "guest",
        name,
        user?.photoUrl || null,
        Math.round(rating),
        reviewText?.trim() || null,
        now,
        now
      ]
    );

    return NextResponse.json({ success: true, reviewId });
  } catch (error: any) {
    console.error("[Discover /api/reviews POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to post review" }, { status: 500 });
  }
}
