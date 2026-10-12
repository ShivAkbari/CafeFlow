import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { razorpayClient } from "@/lib/razorpay";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const orderRef = searchParams.get("ref");
    const orderId = searchParams.get("id");

    if (orderRef || orderId) {
      const order = await d1QueryOne<any>(
        `SELECT o.*, c.name as cafe_name, c.slug as cafe_slug, c.currency as cafe_currency
         FROM orders o
         JOIN cafes c ON o.cafe_id = c.id
         WHERE o.id = ? OR o.public_order_ref = ?
         LIMIT 1`,
        [orderId || "", orderRef || ""]
      );

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      let items = [];
      try { items = JSON.parse(order.items_json || "[]"); } catch {}

      return NextResponse.json({
        order: {
          id: order.id,
          publicOrderRef: order.public_order_ref,
          orderNumber: order.order_number,
          cafeId: order.cafe_id,
          cafeName: order.cafe_name,
          cafeSlug: order.cafe_slug,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerEmail: order.customer_email,
          orderType: order.order_type,
          status: order.status,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          items,
          subtotal: order.subtotal,
          tax: order.tax,
          deliveryFee: order.delivery_fee,
          discount: order.discount,
          total: order.total,
          notes: order.notes,
          currency: order.cafe_currency || "INR",
          createdAt: order.created_at
        }
      });
    }

    // List customer orders
    const searchPhone = phone || user?.phone;
    if (!user && !searchPhone) {
      return NextResponse.json({ orders: [] });
    }

    let query = `
      SELECT o.*, c.name as cafe_name, c.slug as cafe_slug, c.currency as cafe_currency
      FROM orders o
      JOIN cafes c ON o.cafe_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user?.id) {
      query += ` AND (o.user_id = ? OR o.customer_phone = ?)`;
      params.push(user.id, user.phone || "");
    } else if (searchPhone) {
      query += ` AND o.customer_phone = ?`;
      params.push(searchPhone);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 50`;

    const rows = await d1Query<any>(query, params);
    const orders = rows.map((order) => {
      let items = [];
      try { items = JSON.parse(order.items_json || "[]"); } catch {}
      return {
        id: order.id,
        publicOrderRef: order.public_order_ref,
        orderNumber: order.order_number,
        cafeId: order.cafe_id,
        cafeName: order.cafe_name,
        cafeSlug: order.cafe_slug,
        orderType: order.order_type,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        items,
        total: order.total,
        currency: order.cafe_currency || "INR",
        createdAt: order.created_at
      };
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("[Discover /api/orders GET error]", error);
    return NextResponse.json({ error: error.message || "Failed to load orders" }, { status: 500 });
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
      orderType = "takeaway", // "dine-in" | "takeaway" | "delivery"
      tableId,
      items,
      notes,
      paymentMethod = "online", // "online" | "cash"
      promoCode,
      deliveryAddress
    } = body;

    if (!cafeId || !customerName || !customerPhone || !items || !items.length) {
      return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
    }

    // 1. Fetch Cafe & Menu Items to calculate genuine server prices
    const cafe = await d1QueryOne<any>("SELECT id, name, currency, status FROM cafes WHERE id = ?", [cafeId]);
    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    const itemIds = items.map((i: any) => i.id);
    const placeholders = itemIds.map(() => "?").join(",");
    const dbItems = await d1Query<any>(
      `SELECT id, name, price, in_stock, tax_rate FROM menu_items WHERE id IN (${placeholders}) AND cafe_id = ?`,
      [...itemIds, cafeId]
    );

    const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

    // 2. Validate prices and stock
    let subtotal = 0;
    let tax = 0;
    const verifiedOrderItems = [];

    for (const item of items) {
      const dbItem = dbItemMap.get(item.id);
      if (!dbItem || !dbItem.in_stock) {
        return NextResponse.json({ error: `Item "${item.name}" is currently unavailable.` }, { status: 400 });
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = Number(dbItem.price) || 0;
      const itemSubtotal = unitPrice * qty;
      const itemTax = itemSubtotal * ((Number(dbItem.tax_rate) || 0) / 100);

      subtotal += itemSubtotal;
      tax += itemTax;

      verifiedOrderItems.push({
        id: dbItem.id,
        name: dbItem.name,
        price: unitPrice,
        quantity: qty,
        selectedVariant: item.selectedVariant || null,
        selectedAddons: item.selectedAddons || []
      });
    }

    // 3. Check coupon / discount
    let discount = 0;
    let promoSnapshot = null;
    if (promoCode) {
      const promo = await d1QueryOne<any>(
        `SELECT * FROM promotions WHERE cafe_id = ? AND code = ? AND active = 1`,
        [cafeId, promoCode.trim().toUpperCase()]
      );
      if (promo) {
        if (promo.promo_type === "percentage") {
          discount = (subtotal * promo.value) / 100;
          if (promo.max_discount > 0 && discount > promo.max_discount) {
            discount = promo.max_discount;
          }
        } else {
          discount = Math.min(subtotal, promo.value);
        }
        promoSnapshot = JSON.stringify({ code: promo.code, discount, id: promo.id });
      }
    }

    const deliveryFee = orderType === "delivery" ? 40 : 0;
    const total = Math.max(0, subtotal + tax + deliveryFee - discount);

    // 4. Generate order IDs
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const publicOrderRef = `CF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const now = Date.now();

    // 5. If Online Payment, generate Razorpay Order
    let razorpayOrderId: string | null = null;
    let paymentStatus = paymentMethod === "cash" ? "pending" : "awaiting_payment";

    if (paymentMethod === "online") {
      try {
        const rzOrder = await razorpayClient.orders.create({
          amount: Math.round(total * 100), // paise
          currency: cafe.currency || "INR",
          receipt: publicOrderRef,
          notes: {
            cafeId,
            orderId,
            source: "discover"
          }
        });
        razorpayOrderId = rzOrder.id;
      } catch (rzErr: any) {
        console.error("[Razorpay order generation error]", rzErr);
        // Fall back to cash if test key error or create order for demo
      }
    }

    // 6. Insert Order into Authoritative Orders Table
    await d1Exec(
      `INSERT INTO orders (
        id, cafe_id, user_id, order_number, customer_name, customer_phone, customer_email,
        table_id, order_type, status, payment_status, payment_method, items_json,
        subtotal, tax, delivery_fee, discount, total, notes, promotion_snapshot_json,
        source, razorpay_order_id, public_order_ref, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discover', ?, ?, ?, ?)`,
      [
        orderId,
        cafeId,
        user?.id || null,
        orderNumber,
        customerName.trim(),
        customerPhone.trim(),
        customerEmail?.trim() || null,
        tableId || null,
        orderType,
        paymentStatus,
        paymentMethod,
        JSON.stringify(verifiedOrderItems),
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
        notes || null,
        promoSnapshot,
        razorpayOrderId,
        publicOrderRef,
        now,
        now
      ]
    );

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        orderNumber,
        publicOrderRef,
        cafeId,
        cafeName: cafe.name,
        total,
        currency: cafe.currency || "INR",
        paymentMethod,
        paymentStatus,
        razorpayOrderId,
        razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TX8S7xF1HU77Ye"
      }
    });
  } catch (error: any) {
    console.error("[Discover /api/orders POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
