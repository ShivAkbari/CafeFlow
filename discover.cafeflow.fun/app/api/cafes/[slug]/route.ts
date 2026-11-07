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
      `SELECT id, name, slug, address, logo, currency, status, food_category, custom_notice, created_at, timezone, upi_id
       FROM cafes
       WHERE slug = ? OR id = ?
       LIMIT 1`,
      [slug, slug]
    );

    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    const cafeId = cafe.id;

    // 2. Fetch categories, menu items, tables, promotions, settings, variants, and addons
    const [categories, items, tables, promotions, settings, dbVariants, dbAddons] = await Promise.all([
      d1Query<any>(
        `SELECT id, name, description, sort_order, active, image 
         FROM menu_categories 
         WHERE cafe_id = ? AND active = 1 
         ORDER BY sort_order ASC`,
        [cafeId]
      ),
      d1Query<any>(
        `SELECT id, category_id, name, description, price, cost_price, image, 
                food_type, is_veg, is_spicy, is_chef_special, is_popular, in_stock, 
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
      ),
      d1Query<any>(
        `SELECT id, cafe_id, name, type, required, options_json, price, available
         FROM variants
         WHERE cafe_id = ?`,
        [cafeId]
      ),
      d1Query<any>(
        `SELECT id, cafe_id, name, price, available
         FROM addons
         WHERE cafe_id = ?`,
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

    // Index variant groups and addons for fast lookup
    const variantGroupsMap: Record<string, any> = {};
    for (const vg of dbVariants) {
      let optionsList: any[] = [];
      if (vg.options_json) {
        try {
          const parsed = JSON.parse(vg.options_json);
          if (Array.isArray(parsed)) {
            optionsList = parsed.map((o) => ({
              id: o.id || o.name,
              name: o.name || "Option",
              priceAdjustment: Number(o.priceAdjustment ?? o.price ?? 0)
            }));
          } else if (parsed && typeof parsed === "object") {
            optionsList = Object.values(parsed).map((o: any) => ({
              id: o.id || o.name,
              name: o.name || "Option",
              priceAdjustment: Number(o.priceAdjustment ?? o.price ?? 0)
            }));
          }
        } catch {}
      }
      variantGroupsMap[vg.id] = {
        id: vg.id,
        name: vg.name,
        type: vg.type || "single",
        required: vg.required !== undefined ? Boolean(vg.required) : true,
        options: optionsList
      };
    }

    const addonsMap: Record<string, any> = {};
    for (const a of dbAddons) {
      addonsMap[a.id] = {
        id: a.id,
        name: a.name,
        price: Number(a.price) || 0,
        available: a.available !== undefined ? Boolean(a.available) : true
      };
    }

    // Format menu items with fully resolved variants and addons
    const formattedItems: any[] = items.map((item) => {
      let rawVariants: any[] = [];
      let rawAddons: any[] = [];
      let tags: any[] = [];
      try { rawVariants = JSON.parse(item.variants_json || "[]"); } catch {}
      try { rawAddons = JSON.parse(item.addons_json || "[]"); } catch {}
      try { tags = JSON.parse(item.tags_json || "[]"); } catch {}

      const resolvedVariantGroups: any[] = [];
      for (const v of rawVariants) {
        if (typeof v === "string") {
          if (variantGroupsMap[v]) {
            resolvedVariantGroups.push(variantGroupsMap[v]);
          }
        } else if (v && typeof v === "object") {
          if (v.options && Array.isArray(v.options)) {
            resolvedVariantGroups.push(v);
          } else if (v.name) {
            resolvedVariantGroups.push({
              id: v.id || v.name,
              name: v.name,
              type: "single",
              required: true,
              options: [{ id: v.id || v.name, name: v.name, priceAdjustment: Number(v.price ?? 0) - Number(item.price ?? 0) }]
            });
          }
        }
      }

      const resolvedAddons: any[] = [];
      for (const a of rawAddons) {
        if (typeof a === "string") {
          if (addonsMap[a]) {
            resolvedAddons.push(addonsMap[a]);
          }
        } else if (a && typeof a === "object") {
          resolvedAddons.push({
            id: a.id || a.name,
            name: a.name,
            price: Number(a.price) || 0
          });
        }
      }

      const resolvedFoodType = item.food_type || (item.is_veg ? "veg" : "non_veg");
      return {
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price) || 0,
        originalPrice: null,
        offerBadge: null,
        image: item.image || "",
        foodType: resolvedFoodType,
        isVeg: resolvedFoodType === "veg",
        isSpicy: Boolean(item.is_spicy),
        isChefSpecial: Boolean(item.is_chef_special),
        isPopular: Boolean(item.is_popular),
        inStock: Boolean(item.in_stock),
        variants: resolvedVariantGroups,
        addons: resolvedAddons,
        tags,
        taxRate: item.tax_rate || 0
      };
    });

    // Fetch reviews aggregate for this cafe
    let reviewData = { avgRating: null as number | null, reviewCount: 0 };
    try {
      const reviewRow = await d1QueryOne<any>(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
         FROM cafe_reviews
         WHERE cafe_id = ?`,
        [cafeId]
      );
      if (reviewRow && reviewRow.review_count > 0) {
        reviewData = {
          avgRating: Math.round(reviewRow.avg_rating * 10) / 10,
          reviewCount: reviewRow.review_count
        };
      }
    } catch {}

    // Parse reservation settings
    const resSettings = settingsMap.reservations || {};
    const genSettings = settingsMap.general || {};
    const presenceSettings = settingsMap.presence || {};

    // Determine configured seating types from tables or settings
    const uniqueTableSections = Array.from(
      new Set(tables.map((t: any) => t.section || "Indoor").filter(Boolean))
    );
    const configuredSeatingTypes: string[] = Array.isArray(resSettings.seatingTypes) && resSettings.seatingTypes.length > 0
      ? resSettings.seatingTypes
      : uniqueTableSections.length > 0
      ? uniqueTableSections
      : ["Indoor"];

    const reservationsConfig = {
      enabled: resSettings.enabled !== false,
      seatingTypes: configuredSeatingTypes,
      minGuests: resSettings.minGuests || 1,
      maxGuests: resSettings.maxGuests || 12,
      durationMinutes: resSettings.durationMinutes || 90,
      leadTimeMinutes: resSettings.leadTimeMinutes || 30,
      bookingHorizonDays: resSettings.bookingHorizonDays || 7,
      openingTime: genSettings.openingTime || "10:00",
      closingTime: genSettings.closingTime || "22:00"
    };

    return NextResponse.json({
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        address: cafe.address || genSettings.address || "",
        logo: cafe.logo || genSettings.logo || "",
        coverImage: presenceSettings.coverImage || presenceSettings.heroImage || cafe.logo || "",
        gallery: Array.isArray(presenceSettings.gallery) ? presenceSettings.gallery : [],
        currency: cafe.currency || "INR",
        foodCategory: cafe.food_category || genSettings.foodCategory || "veg_non_veg",
        customNotice: cafe.custom_notice || null,
        timezone: cafe.timezone || "UTC",
        theme: cafe.theme || "classic-light",
        rating: reviewData.avgRating,
        reviewCount: reviewData.reviewCount,
        businessHours: genSettings.businessHours || null,
        isOpen: cafe.status === "active",
        upiId: cafe.upi_id || settingsMap.general?.upiId || settingsMap.upi?.upiId || "",
        cafeFlowFeeMode: genSettings.cafeFlowFeeMode || "customer",
        generalSettings: genSettings,
        presenceSettings: presenceSettings,
        qrSettings: settingsMap.qr || {},
        reservationsConfig
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
