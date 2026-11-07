import { NextRequest, NextResponse } from "next/server";
import { d1QueryOne } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, cafeId } = body || {};

    if (!itemId || !cafeId) {
      return NextResponse.json(
        { available: false, error: "Missing itemId or cafeId" },
        { status: 400 }
      );
    }

    // Verify cafe status
    const cafe = await d1QueryOne<any>(
      `SELECT id, name, slug, currency, status FROM cafes WHERE id = ? LIMIT 1`,
      [cafeId]
    );

    if (!cafe || ["disabled", "deleted", "suspended"].includes(cafe.status)) {
      return NextResponse.json(
        { available: false, error: "This restaurant is currently unavailable." },
        { status: 404 }
      );
    }

    // Verify item existence, belonging to cafe, in_stock
    const item = await d1QueryOne<any>(
      `SELECT id, cafe_id, name, description, price, image, in_stock, tax_rate, variants_json, addons_json
       FROM menu_items
       WHERE id = ? AND cafe_id = ?
       LIMIT 1`,
      [itemId, cafeId]
    );

    if (!item) {
      return NextResponse.json(
        { available: false, error: "Item not found in this restaurant's menu." },
        { status: 404 }
      );
    }

    if (!item.in_stock) {
      return NextResponse.json(
        { available: false, error: `"${item.name}" is currently out of stock.` },
        { status: 409 }
      );
    }

    let variants: Array<{ name: string; price: number }> = [];
    let addons: Array<{ name: string; price: number }> = [];
    try { variants = JSON.parse(item.variants_json || "[]"); } catch {}
    try { addons = JSON.parse(item.addons_json || "[]"); } catch {}

    return NextResponse.json({
      available: true,
      item: {
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price),
        image: item.image || "",
        taxRate: Number(item.tax_rate) || 0,
        variants,
        addons
      },
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        currency: cafe.currency || "INR"
      }
    });
  } catch (err: any) {
    console.error("[Validate Item Error]", err);
    return NextResponse.json(
      { available: false, error: err.message || "Failed to validate item." },
      { status: 500 }
    );
  }
}
