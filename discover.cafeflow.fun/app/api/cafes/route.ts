import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const category = (searchParams.get("category") || "").trim().toLowerCase();
    const city = (searchParams.get("city") || "").trim().toLowerCase();
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const sort = searchParams.get("sort") || "relevance"; // relevance, rating, distance, price_asc, price_desc
    const openNow = searchParams.get("openNow") === "true";
    const hasOffer = searchParams.get("hasOffer") === "true";
    const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : null;

    const userLat = latStr ? parseFloat(latStr) : null;
    const userLng = lngStr ? parseFloat(lngStr) : null;

    // 1. Fetch active cafes
    const query = `
      SELECT id, name, slug, address, logo, currency, status, food_category, created_at
      FROM cafes
      WHERE status NOT IN ('disabled', 'deleted', 'suspended')
    `;
    const rawCafes = await d1Query<any>(query, []);
    const cafes = rawCafes.filter(c => !c.id.startsWith("__"));

    // 2. Fetch general and presence settings for coordinates, cover photos, cuisines
    const settingsRows = await d1Query<any>(
      `SELECT cafe_id, section, data_json FROM cafe_settings WHERE section IN ('general', 'presence')`
    );

    const settingsMap = new Map<string, Record<string, any>>();
    for (const row of settingsRows) {
      const existing = settingsMap.get(row.cafe_id) || {};
      try {
        const parsed = JSON.parse(row.data_json || "{}");
        settingsMap.set(row.cafe_id, { ...existing, ...parsed });
      } catch {}
    }

    // 3. Fetch active promotions
    let activePromotions: any[] = [];
    try {
      activePromotions = await d1Query<any>(
        `SELECT id, cafe_id, code, title, description, promo_type, value, min_order_value, max_discount
         FROM promotions
         WHERE active = 1`
      );
    } catch (e) {
      console.warn("Could not query promotions table:", e);
    }

    const promoMap = new Map<string, any>();
    for (const promo of activePromotions) {
      if (!promoMap.has(promo.cafe_id)) {
        promoMap.set(promo.cafe_id, promo);
      }
    }

    // 4. Fetch review aggregates
    let reviewsAggMap = new Map<string, { avgRating: number; count: number }>();
    try {
      const reviewRows = await d1Query<any>(
        `SELECT cafe_id, AVG(rating) as avg_rating, COUNT(*) as review_count
         FROM cafe_reviews
         GROUP BY cafe_id`
      );
      for (const row of reviewRows) {
        reviewsAggMap.set(row.cafe_id, {
          avgRating: Math.round((row.avg_rating || 4.8) * 10) / 10,
          count: row.review_count || 1
        });
      }
    } catch (e) {}

    // Curated high quality photography matching the reference aesthetic
    const fallbackCovers = [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1445116572660-2384398880bc?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1000&q=80"
    ];

    // Format cafes
    // Format cafes with purely dynamic database calculations
    const enrichedCafes = cafes.map((cafe, idx) => {
      const extra = settingsMap.get(cafe.id) || {};
      const cafeLat = typeof extra.cafeLat === "number" ? extra.cafeLat : null;
      const cafeLng = typeof extra.cafeLng === "number" ? extra.cafeLng : null;

      let distanceKm: number | null = null;
      if (userLat !== null && userLng !== null && cafeLat !== null && cafeLng !== null) {
        const R = 6371; // Earth's radius in km
        const dLat = ((cafeLat - userLat) * Math.PI) / 180;
        const dLon = ((cafeLng - userLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userLat * Math.PI) / 180) *
            Math.cos((cafeLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Math.round(R * c * 10) / 10;
      }

      // Ratings & reviews: purely from D1 reviews table. If no reviews exist, rating is null, reviewCount is 0
      const reviewData = reviewsAggMap.get(cafe.id);
      const rating = reviewData ? reviewData.avgRating : null;
      const reviewCount = reviewData ? reviewData.count : 0;

      const offer = promoMap.get(cafe.id) || null;
      const coverImage = extra.coverImage || extra.heroImage || cafe.logo || fallbackCovers[idx % fallbackCovers.length];

      const cuisines = Array.isArray(extra.cuisines) && extra.cuisines.length > 0 
        ? extra.cuisines 
        : ["Cafe"];

      // Real cafe gallery from presence or cover
      const images: string[] = Array.isArray(extra.gallery) && extra.gallery.length > 0
        ? Array.from(new Set([coverImage, ...extra.gallery])).slice(0, 8)
        : [coverImage];

      // Real business hours calculation
      let isOpen = cafe.status === "active";
      const businessHours = extra.businessHours || extra.openingHours;
      // If cafe is paused or inactive in DB
      if (cafe.status === "inactive" || cafe.status === "paused") {
        isOpen = false;
      }

      // Reservation config
      const acceptsReservations = extra.reservationsEnabled !== false;

      return {
        id: cafe.id,
        name: cafe.name || "Cafe",
        slug: cafe.slug,
        address: cafe.address || extra.address || "",
        logo: cafe.logo || extra.logo || "",
        coverImage,
        images,
        cuisines,
        priceRange: extra.priceRange || "₹₹",
        priceTier: (extra.priceRange || "₹₹").length,
        rating,
        reviewCount,
        currency: cafe.currency || "INR",
        foodCategory: cafe.food_category || extra.foodCategory || "veg_non_veg",
        lat: cafeLat,
        lng: cafeLng,
        distanceKm,
        customNotice: cafe.custom_notice || null,
        isOpen,
        businessHours: businessHours || null,
        acceptsReservations,
        theme: cafe.theme || "classic-light",
        offer: offer ? {
          code: offer.code,
          title: offer.title,
          discountText: offer.promo_type === "percentage" ? `${offer.value}% OFF` : `${cafe.currency || "INR"} ${offer.value} OFF`,
          minOrder: offer.min_order_value ? `orders above ${cafe.currency || "INR"} ${offer.min_order_value}` : ""
        } : null
      };
    });

    // 5. Search for matching menu items if a query is provided
    let matchingDishes: any[] = [];
    if (q) {
      try {
        const dishRows = await d1Query<any>(
          `SELECT id, cafe_id, name, description, price, image, food_type, is_veg 
           FROM menu_items 
           WHERE in_stock = 1 AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)
           LIMIT 12`,
          [`%${q}%`, `%${q}%`]
        );

        matchingDishes = dishRows.map((dish) => {
          const matchedCafe = enrichedCafes.find((c) => c.id === dish.cafe_id);
          const resolvedFoodType = dish.food_type || (dish.is_veg ? "veg" : "non_veg");
          return {
            id: dish.id,
            name: dish.name,
            description: dish.description || "",
            price: dish.price,
            image: dish.image || "",
            foodType: resolvedFoodType,
            isVeg: resolvedFoodType === "veg",
            cafeName: matchedCafe?.name || "Partner Cafe",
            cafeSlug: matchedCafe?.slug || "",
            currency: matchedCafe?.currency || "INR"
          };
        });
      } catch (err) {
        console.warn("Could not query menu_items for search:", err);
      }
    }

    // 6. Apply filtering
    let filtered = enrichedCafes;
    if (q) {
      const qTokens = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((c) => {
        const text = `${c.name} ${c.slug} ${c.address} ${(c.cuisines || []).join(" ")}`.toLowerCase();
        return text.includes(q) || qTokens.some(token => text.includes(token));
      });
    }

    if (category && category !== "all") {
      filtered = filtered.filter((c) =>
        c.cuisines.some((cuisine: string) => cuisine.toLowerCase().includes(category))
      );
    }

    if (city) {
      filtered = filtered.filter((c) => c.address.toLowerCase().includes(city));
    }

    if (openNow) {
      filtered = filtered.filter((c) => c.isOpen);
    }

    if (hasOffer) {
      filtered = filtered.filter((c) => Boolean(c.offer));
    }

    if (minRating !== null && !isNaN(minRating)) {
      filtered = filtered.filter((c) => c.rating !== null && c.rating >= minRating);
    }

    // 7. Sorting
    if (sort === "rating") {
      filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sort === "distance" && userLat !== null && userLng !== null) {
      filtered.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (sort === "price_asc") {
      filtered.sort((a, b) => a.priceTier - b.priceTier);
    } else if (sort === "price_desc") {
      filtered.sort((a, b) => b.priceTier - a.priceTier);
    } else {
      // Relevance: if user location is available, sort by distance, else keep natural order
      if (userLat !== null && userLng !== null) {
        filtered.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      }
    }

    // Extract all valid offers across cafes from D1
    const allOffers = activePromotions.map((p) => {
      const matchedCafe = enrichedCafes.find((c) => c.id === p.cafe_id);
      return {
        id: p.id,
        code: p.code,
        title: p.title,
        description: p.description || "",
        promoType: p.promo_type,
        value: p.value,
        minOrder: p.min_order_value,
        maxDiscount: p.max_discount,
        cafeName: matchedCafe?.name || "",
        cafeSlug: matchedCafe?.slug || "",
        discountText: p.promo_type === "percentage" ? `Up to ${p.value}% OFF` : `Flat ${matchedCafe?.currency || "INR"} ${p.value} OFF`
      };
    });

    // 8. Fetch real recommended items (popular items or items with active promotions from D1)
    let dynamicRecommended: any[] = [];
    try {
      const popularRows = await d1Query<any>(
        `SELECT m.id, m.cafe_id, m.name, m.price, m.image, m.food_type, m.is_veg, m.is_popular, m.tags_json, m.variants_json, m.addons_json, m.tax_rate, c.name as cafe_name, c.slug as cafe_slug, c.currency
         FROM menu_items m
         JOIN cafes c ON m.cafe_id = c.id
         WHERE m.in_stock = 1 AND c.status NOT IN ('disabled', 'deleted', 'suspended')
         ORDER BY m.is_popular DESC, m.sort_order ASC
         LIMIT 16`
      );

      dynamicRecommended = popularRows.map((dish) => {
        const cafeOffer = promoMap.get(dish.cafe_id);
        const reviewData = reviewsAggMap.get(dish.cafe_id);
        let tags: string[] = [];
        let variants = [];
        let addons = [];
        try { tags = JSON.parse(dish.tags_json || "[]"); } catch {}
        try { variants = JSON.parse(dish.variants_json || "[]"); } catch {}
        try { addons = JSON.parse(dish.addons_json || "[]"); } catch {}

        const resolvedFoodType = dish.food_type || (dish.is_veg ? "veg" : "non_veg");

        return {
          id: dish.id,
          name: dish.name,
          category: tags[0] || "Special",
          price: dish.price,
          originalPrice: null,
          offerBadge: cafeOffer ? (cafeOffer.promo_type === "percentage" ? `${cafeOffer.value}% OFF` : `${dish.currency || "INR"} ${cafeOffer.value} OFF`) : null,
          rating: reviewData?.avgRating ?? null,
          isBestseller: Boolean(dish.is_popular),
          image: dish.image || "",
          foodType: resolvedFoodType,
          isVeg: resolvedFoodType === "veg",
          cafeId: dish.cafe_id,
          cafeName: dish.cafe_name,
          cafeSlug: dish.cafe_slug,
          currency: dish.currency || "INR",
          variants,
          addons,
          taxRate: dish.tax_rate || 0
        };
      });
    } catch (e) {
      console.warn("Could not query dynamic recommended items:", e);
    }

    return NextResponse.json({ 
      cafes: filtered,
      dishes: matchingDishes,
      recommended: dynamicRecommended,
      offers: allOffers
    });
  } catch (error: any) {
    console.error("[Discover /api/cafes error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load cafes" },
      { status: 500 }
    );
  }
}
