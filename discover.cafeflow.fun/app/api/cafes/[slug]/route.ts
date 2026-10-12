import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1QueryOne } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Missing cafe slug" }, { status: 400 });
    }

    // 1. Fetch cafe details
    const cafe = await d1QueryOne<any>(
      `SELECT id, name, slug, address, logo, currency, status, theme, custom_notice, created_at, timezone
       FROM cafes
       WHERE slug = ? OR id = ?
       LIMIT 1`,
      [slug, slug]
    );

    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    const cafeId = cafe.id;

    // 2. Fetch categories and menu items
    const [categories, items, tables, promotions, settings] = await Promise.all([
      d1Query<any>(
        `SELECT id, name, description, sort_order, active, image 
         FROM menu_categories 
         WHERE cafe_id = ? AND active = 1 
         ORDER BY sort_order ASC`,
        [cafeId]
      ),
      d1Query<any>(
        `SELECT id, category_id, name, description, price, cost_price, image, 
                is_veg, is_spicy, is_chef_special, is_popular, in_stock, 
                sort_order, variants_json, addons_json, ingredients_json, tags_json, tax_rate
         FROM menu_items 
         WHERE cafe_id = ? AND in_stock = 1
         ORDER BY sort_order ASC`,
        [cafeId]
      ),
      d1Query<any>(
        `SELECT id, name, capacity, section, active, public_token
         FROM tables
         WHERE cafe_id = ? AND active = 1
         ORDER BY name ASC`,
        [cafeId]
      ),
      d1Query<any>(
        `SELECT id, code, title, description, promo_type, value, min_order_value, max_discount
         FROM promotions
         WHERE cafe_id = ? AND active = 1
         ORDER BY created_at DESC`,
        [cafeId]
      ),
      d1Query<any>(
        `SELECT section, data_json FROM cafe_settings WHERE cafe_id = ?`,
        [cafeId]
      )
    ]);

    // Parse settings
    const settingsMap: Record<string, any> = {};
    for (const s of settings) {
      try {
        settingsMap[s.section] = JSON.parse(s.data_json || "{}");
      } catch {}
    }

    // Format menu items
    const formattedItems = items.map((item) => {
      let variants = [];
      let addons = [];
      let tags = [];
      try { variants = JSON.parse(item.variants_json || "[]"); } catch {}
      try { addons = JSON.parse(item.addons_json || "[]"); } catch {}
      try { tags = JSON.parse(item.tags_json || "[]"); } catch {}

      return {
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        image: item.image || "",
        isVeg: Boolean(item.is_veg),
        isSpicy: Boolean(item.is_spicy),
        isChefSpecial: Boolean(item.is_chef_special),
        isPopular: Boolean(item.is_popular),
        inStock: Boolean(item.in_stock),
        variants,
        addons,
        tags,
        taxRate: item.tax_rate || 0
      };
    });

    return NextResponse.json({
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        address: cafe.address || settingsMap.general?.address || "",
        logo: cafe.logo || settingsMap.general?.logo || "",
        currency: cafe.currency || "INR",
        customNotice: cafe.custom_notice || null,
        timezone: cafe.timezone || "UTC",
        theme: cafe.theme || "classic-light",
        generalSettings: settingsMap.general || {},
        presenceSettings: settingsMap.presence || {},
        qrSettings: settingsMap.qr || {}
      },
      categories,
      items: formattedItems,
      tables,
      promotions
    });
  } catch (error: any) {
    console.error("[Discover /api/cafes/[slug] error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load cafe details" },
      { status: 500 }
    );
  }
}
