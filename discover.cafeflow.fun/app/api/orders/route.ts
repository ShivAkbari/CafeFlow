import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { razorpayClient } from "@/lib/razorpay";
import { resolveCafeCustomerFee } from "@/lib/country-fees";
import { calculateSplitAllocation } from "@/lib/split-payments";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const orderRef = searchParams.get("ref");
    const orderId = searchParams.get("id");

    if (orderRef || orderId) {
      const order = await d1QueryOne<any>(
        `SELECT o.*, c.name as cafe_name, c.slug as cafe_slug, c.currency as cafe_currency, c.upi_id as cafe_upi_id
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

      // Fetch split payment details if available
      const splitRow = await d1QueryOne<any>(
        "SELECT * FROM order_payment_splits WHERE order_id = ? LIMIT 1",
        [order.id]
      );

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
          upiId: order.cafe_upi_id || null,
          items,
          subtotal: order.subtotal,
          tax: order.tax,
          deliveryFee: order.delivery_fee,
          discount: order.discount,
          total: order.total,
          notes: order.notes,
          razorpayOrderId: order.razorpay_order_id || null,
          currency: order.cafe_currency || "INR",
          createdAt: order.created_at,
          paymentSplit: splitRow ? {
            foodAmount: splitRow.food_amount_minor / 100,
            taxAmount: splitRow.tax_amount_minor / 100,
            deliveryFee: splitRow.delivery_fee_minor / 100,
            deliveryProviderFare: splitRow.delivery_provider_fare_minor / 100,
            deliveryMarkup: splitRow.delivery_markup_minor / 100,
            cafeflowFee: splitRow.cafeflow_fee_minor / 100,
            cafeNetPayable: splitRow.cafe_net_payable_minor / 100,
            cafeflowNetPayable: splitRow.cafeflow_net_payable_minor / 100,
            customerPayable: splitRow.customer_payable_minor / 100,
            transferStatus: splitRow.transfer_status,
            settlementStatus: splitRow.settlement_status,
            reconciliationStatus: splitRow.reconciliation_status
          } : null
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
      paymentMethod: rawPaymentMethod = "upi", // "upi" | "cash"
      promoCode,
      deliveryAddress
    } = body;

    const normalizedPaymentMethod = String(rawPaymentMethod || "").toLowerCase() === "cash" ? "cash" : "upi";
    const paymentMethod = normalizedPaymentMethod;

    // Authoritatively resolve customer identity: fallback to authenticated user from session
    const resolvedCustomerEmail = customerEmail?.trim() || user?.email || null;
    const resolvedCustomerName = customerName?.trim() || user?.name || (resolvedCustomerEmail ? resolvedCustomerEmail.split("@")[0] : "Customer");
    let sanitizedPhone = (customerPhone || "").replace(/[\s\-()]/g, "");
    if (!sanitizedPhone && user?.phone) {
      sanitizedPhone = (user.phone || "").replace(/[\s\-()]/g, "");
    }
    const resolvedCustomerPhone = sanitizedPhone || null;

    // Strict customer authentication check: guest mode is strictly prohibited
    if (!user) {
      return NextResponse.json(
        { error: "Customer login required. Guest orders are strictly prohibited. Please sign in with Google." },
        { status: 401 }
      );
    }

    if (!cafeId || !resolvedCustomerName || !items || !items.length) {
      return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
    }

    // Phone number format validation (required for cash/counter orders; optional for UPI if authenticated)
    if (paymentMethod === "cash" && !sanitizedPhone) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit phone number for Pay at Counter" },
        { status: 400 }
      );
    }
    if (sanitizedPhone && !/^\+?[0-9]{10,14}$/.test(sanitizedPhone)) {
      sanitizedPhone = "";
    }

    const normalizedOrderType = (orderType || "dine-in").toLowerCase().replace("_", "-");
    if (normalizedOrderType === "takeaway" || normalizedOrderType === "delivery") {
      return NextResponse.json(
        {
          error: "Takeaway and Delivery orders are temporarily disabled. Please choose Dine-in table ordering.",
          code: "ORDER_MODE_DISABLED"
        },
        { status: 403 }
      );
    }

    // 0b. Delivery Validation: Customer Address and Quote Token Required
    let validatedDeliveryFeeMinor = 0;
    let validatedDeliveryProviderFareMinor = 0;
    let validatedDeliveryMarkupMinor = 0;
    let validatedQuoteToken = body.quoteId || null;
    let validatedAddress = deliveryAddress || null;

    if (orderType === "delivery") {
      if (!user) {
        return NextResponse.json(
          { error: "Authentication is required to place a delivery order." },
          { status: 401 }
        );
      }

      if (!validatedAddress || (!validatedAddress.formattedAddress && typeof validatedAddress !== "string")) {
        return NextResponse.json(
          { error: "A valid delivery address is required for delivery orders." },
          { status: 400 }
        );
      }

      // Revalidate quote from D1 delivery_quotes table
      if (!validatedQuoteToken) {
        return NextResponse.json(
          { error: "A valid delivery quote token is required for delivery orders. Please check delivery fare before ordering." },
          { status: 400 }
        );
      }

      const quoteRow = await d1QueryOne<any>(
        "SELECT provider_fare_minor, cafeflow_markup_minor, customer_fee_minor, expires_at, status FROM delivery_quotes WHERE id = ? AND cafe_id = ?",
        [validatedQuoteToken, cafeId]
      );
      if (!quoteRow) {
        return NextResponse.json(
          { error: "Delivery quote not found or expired. Please re-check delivery fare." },
          { status: 400 }
        );
      }
      if (quoteRow.expires_at < Date.now()) {
        return NextResponse.json(
          { error: "Delivery quote has expired. Please calculate a new quote." },
          { status: 400 }
        );
      }
      if (!quoteRow.customer_fee_minor || quoteRow.customer_fee_minor <= 0) {
        return NextResponse.json(
          { error: "Invalid delivery fare in quote record." },
          { status: 400 }
        );
      }
      validatedDeliveryFeeMinor = Number(quoteRow.customer_fee_minor);
      validatedDeliveryProviderFareMinor = Number(quoteRow.provider_fare_minor || (quoteRow.customer_fee_minor - 500));
      validatedDeliveryMarkupMinor = Number(quoteRow.cafeflow_markup_minor || 500);
    }

    // 0c. Dine-in Security Enforcement: Must have valid, verified table session
    if (orderType === "dine-in") {
      const { verifyTableSessionToken, TABLE_SESSION_COOKIE } = await import("@/lib/table-session");
      const sessionCookie = request.cookies.get(TABLE_SESSION_COOKIE)?.value;
      const tableSession = sessionCookie ? await verifyTableSessionToken(sessionCookie) : null;

      if (!tableSession || tableSession.cafeId !== cafeId) {
        return NextResponse.json(
          {
            error: "Dine-in orders require a valid, verified table QR session. Please scan your table QR code to order.",
            code: "UNVERIFIED_TABLE_SESSION"
          },
          { status: 403 }
        );
      }

      // Authoritative table binding from server-verified session
      body.tableId = tableSession.tableId;
    }

    // 1. Fetch Cafe & Menu Items to calculate genuine server prices
    const cafe = await d1QueryOne<any>(
      "SELECT id, name, currency, status, food_category FROM cafes WHERE id = ?",
      [cafeId]
    );
    if (!cafe) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }

    // Fetch cafe general settings for fee mode
    const genSettingRow = await d1QueryOne<any>(
      "SELECT data_json FROM cafe_settings WHERE cafe_id = ? AND section = 'general' LIMIT 1",
      [cafeId]
    );
    let resolvedFeeMode: "customer" | "cafe" = "customer";
    if (genSettingRow?.data_json) {
      try {
        const parsedGen = JSON.parse(genSettingRow.data_json);
        if (parsedGen.cafeFlowFeeMode === "cafe") {
          resolvedFeeMode = "cafe";
        }
      } catch {}
    }

    const cafeFoodCategory = cafe.food_category || "veg_non_veg";

    const itemIds = Array.from(new Set(items.map((i: any) => {
      if (i.baseItemId) return i.baseItemId;
      if (i.itemId) return i.itemId;
      if (typeof i.id === "string") return i.id.split("-")[0];
      return i.id;
    })));
    const placeholders = itemIds.map(() => "?").join(",");
    const dbItems = await d1Query<any>(
      `SELECT id, name, price, in_stock, tax_rate, food_type, is_veg FROM menu_items WHERE id IN (${placeholders}) AND cafe_id = ?`,
      [...itemIds, cafeId]
    );

    const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

    // 2. Validate prices, stock, and food classification against restaurant category
    let subtotalMinor = 0;
    let taxMinor = 0;
    const verifiedOrderItems = [];

    for (const item of items) {
      const baseId = item.baseItemId || item.itemId || (typeof item.id === "string" ? item.id.split("-")[0] : item.id);
      const dbItem = dbItemMap.get(baseId) || dbItemMap.get(item.id);
      if (!dbItem || !dbItem.in_stock) {
        return NextResponse.json({ error: `Item "${item.name}" is currently unavailable.` }, { status: 400 });
      }

      const itemFoodType = dbItem.food_type || (dbItem.is_veg ? "veg" : "non_veg");
      if (cafeFoodCategory === "pure_veg" && itemFoodType !== "veg") {
        return NextResponse.json(
          { error: `Item "${dbItem.name}" is ${itemFoodType} and cannot be ordered from Pure Veg restaurant.` },
          { status: 400 }
        );
      }
      if (cafeFoodCategory === "veg_egg" && itemFoodType === "non_veg") {
        return NextResponse.json(
          { error: `Item "${dbItem.name}" is Non-Veg and cannot be ordered from Veg & Egg restaurant.` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const basePrice = Math.max(0, Number(dbItem.price) || 0);

      // Calculate variant adjustments & addons
      let variantDelta = 0;
      if (item.selectedVariants && typeof item.selectedVariants === "object") {
        variantDelta = Object.values(item.selectedVariants).reduce(
          (sum: number, v: any) => sum + (Number(v?.priceAdjustment) || 0),
          0
        );
      } else if (item.selectedVariant?.price) {
        variantDelta = Math.max(0, Number(item.selectedVariant.price) - basePrice);
      }

      let addonsDelta = 0;
      if (Array.isArray(item.selectedAddons)) {
        addonsDelta = item.selectedAddons.reduce(
          (sum: number, a: any) => sum + (Number(a.price) || 0),
          0
        );
      }

      const unitPrice = Math.max(0, basePrice + variantDelta + addonsDelta);
      const unitPriceMinor = Math.round(unitPrice * 100);
      const itemSubtotalMinor = unitPriceMinor * qty;
      const taxRate = Number(dbItem.tax_rate) || 0;
      const itemTaxMinor = Math.round((itemSubtotalMinor * taxRate) / 100);

      subtotalMinor += itemSubtotalMinor;
      taxMinor += itemTaxMinor;

      const now = Date.now();
      verifiedOrderItems.push({
        id: dbItem.id,
        itemId: dbItem.id,
        itemKey: `${dbItem.id}-${verifiedOrderItems.length}-${now}`,
        name: item.name || dbItem.name,
        price: unitPrice,
        priceMinor: unitPriceMinor,
        quantity: qty,
        status: "pending",
        deliveredQty: 0,
        preparedQty: 0,
        foodType: itemFoodType,
        isVeg: itemFoodType === "veg",
        selectedVariant: item.selectedVariant || null,
        selectedVariants: item.selectedVariants || null,
        selectedAddons: item.selectedAddons || []
      });
    }

    // 3. Check coupon / discount & identify who funds it
    let discountMinor = 0;
    let discountFundedBy: "cafe" | "platform" | "partner" = "cafe";
    let promoSnapshot = null;

    if (promoCode) {
      const promo = await d1QueryOne<any>(
        `SELECT * FROM promotions WHERE cafe_id = ? AND code = ? AND active = 1`,
        [cafeId, promoCode.trim().toUpperCase()]
      );
      if (promo) {
        discountFundedBy = (promo.funded_by as any) || "cafe";
        if (promo.promo_type === "percentage") {
          discountMinor = Math.round((subtotalMinor * promo.value) / 100);
          const maxDiscountMinor = Math.round((Number(promo.max_discount) || 0) * 100);
          if (maxDiscountMinor > 0 && discountMinor > maxDiscountMinor) {
            discountMinor = maxDiscountMinor;
          }
        } else {
          const promoValMinor = Math.round((Number(promo.value) || 0) * 100);
          discountMinor = Math.min(subtotalMinor, promoValMinor);
        }
        promoSnapshot = JSON.stringify({
          code: promo.code,
          discountMinor,
          discount: discountMinor / 100,
          id: promo.id,
          fundedBy: discountFundedBy
        });
      }
    }

    // Resolve CafeFlow platform customer fee
    const feeResolution = resolveCafeCustomerFee({
      currency: cafe.currency || "INR",
      cafeFlowFeeMode: resolvedFeeMode
    });
    const cafeFlowFeeMinor = feeResolution.success
      ? Math.round(feeResolution.feeAddedToCustomerBill * 100)
      : (resolvedFeeMode === "cafe" ? 0 : 100);

    // 3b. Wallet Deduction Validation
    let requestedWalletMinor = Math.round(Number(body.appliedWalletAmount || 0) * 100);
    let walletDeductionMinor = 0;

    let targetWalletCafeId = cafeId;
    if (requestedWalletMinor > 0 && user?.id) {
      let userWallet = await d1QueryOne<{ balance: number; cafe_id: string }>(
        "SELECT balance, cafe_id FROM user_wallets WHERE user_id = ? AND (cafe_id = ? OR LOWER(cafe_id) = LOWER(?)) LIMIT 1",
        [user.id, cafeId, cafeId]
      );
      if (!userWallet || Number(userWallet.balance) <= 0) {
        const globalWallet = await d1QueryOne<{ balance: number; cafe_id: string }>(
          "SELECT balance, cafe_id FROM user_wallets WHERE user_id = ? AND cafe_id = '__global__' LIMIT 1",
          [user.id]
        );
        if (globalWallet && Number(globalWallet.balance) > 0) {
          userWallet = globalWallet;
          targetWalletCafeId = "__global__";
        }
      }
      const availableBalanceMinor = Math.round(Number(userWallet?.balance || 0) * 100);
      if (availableBalanceMinor > 0) {
        walletDeductionMinor = Math.min(availableBalanceMinor, requestedWalletMinor);
      }
    }

    // 4. Calculate Authoritative Split Payment Allocation
    const allocation = calculateSplitAllocation({
      foodSubtotalMinor: subtotalMinor,
      taxMinor,
      deliveryProviderFareMinor: validatedDeliveryProviderFareMinor,
      deliveryMarkupMinor: validatedDeliveryMarkupMinor,
      cafeflowFeeMinor: cafeFlowFeeMinor,
      discountMinor,
      discountFundedBy,
      walletAppliedMinor: walletDeductionMinor,
      currency: cafe.currency || "INR"
    });

    const subtotal = allocation.foodAmountMinor / 100;
    const tax = allocation.taxAmountMinor / 100;
    const deliveryFee = allocation.deliveryFeeMinor / 100;
    const discount = allocation.discountMinor / 100;
    const total = allocation.customerPayableMinor / 100;
    const cafeNetPayable = allocation.cafeNetPayableMinor / 100;
    const walletDeduction = allocation.walletAppliedMinor / 100;

    // 5. Generate unique order and transfer IDs
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const publicOrderRef = `CF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const splitId = `split_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // 5b. Perform wallet debit if wallet was applied
    if (walletDeductionMinor > 0 && user?.id) {
      await d1Exec(
        `UPDATE user_wallets 
         SET balance = MAX(0, balance - ?), updated_at = ? 
         WHERE user_id = ? AND (cafe_id = ? OR LOWER(cafe_id) = LOWER(?))`,
        [walletDeduction, now, user.id, targetWalletCafeId, targetWalletCafeId]
      );

      const txId = `tx_order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await d1Exec(
        `INSERT INTO wallet_ledger (id, user_id, cafe_id, amount, entry_type, description, order_id, created_at)
         VALUES (?, ?, ?, ?, 'debit', ?, ?, ?)`,
        [txId, user.id, targetWalletCafeId, -walletDeduction, `Order payment ${orderNumber}`, orderId, now]
      );
    }

    // 6. Handle Payment Method: UPI vs Cash
    let razorpayOrderId: string | null = null;
    let upiUri: string | null = null;
    let upiId: string | null = null;

    if (paymentMethod === "upi") {
      upiId = cafe.upi_id || null;
      if (!upiId) {
        // Try fetching upiId from cafe_settings
        const upiSetting = await d1QueryOne<any>(
          "SELECT data_json FROM cafe_settings WHERE cafe_id = ? AND section IN ('general', 'upi') ORDER BY section DESC LIMIT 1",
          [cafeId]
        );
        if (upiSetting?.data_json) {
          try {
            const parsed = JSON.parse(upiSetting.data_json);
            upiId = parsed.upiId || parsed.upi_id || null;
          } catch {}
        }
      }

      if (!upiId) {
        return NextResponse.json(
          {
            error: "This cafe has not configured UPI payments yet. Please choose Pay at Counter (Cash) instead.",
            code: "UPI_NOT_CONFIGURED"
          },
          { status: 400 }
        );
      }

      // Generate standard NPCI UPI payment URI
      const encodedPa = encodeURIComponent(upiId);
      const encodedPn = encodeURIComponent(cafe.name || "CafeFlow Merchant");
      const encodedAm = total.toFixed(2);
      const encodedTn = encodeURIComponent(`Order ${orderNumber}`);
      upiUri = `upi://pay?pa=${encodedPa}&pn=${encodedPn}&am=${encodedAm}&cu=INR&tn=${encodedTn}`;
    }

    const orderInitialStatus = "pending";
    const paymentStatus = "pending";
    const upiSelectedAt = paymentMethod === "upi" ? now : null;

    // 7. Insert into Orders Table
    const orderNotes = orderType === "delivery"
      ? `${notes ? notes + " | " : ""}Delivery Address: ${typeof validatedAddress === "object" ? validatedAddress.formattedAddress : validatedAddress}`
      : (notes || null);

    await d1Exec(
      `INSERT INTO orders (
        id, cafe_id, user_id, order_number, customer_name, customer_phone, customer_email,
        table_id, order_type, status, payment_status, payment_method, items_json,
        subtotal, tax, delivery_fee, discount, total, notes, promotion_snapshot_json,
        source, razorpay_order_id, public_order_ref, created_at, updated_at,
        cafeflow_fee, cafeflow_fee_minor, cafeflow_fee_mode, cafeflow_fee_status,
        cafe_amount, customer_payable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discover', ?, ?, ?, ?, ?, ?, ?, 'pending_settlement', ?, ?)`,
      [
        orderId,
        cafeId,
        user?.id || null,
        orderNumber,
        resolvedCustomerName,
        resolvedCustomerPhone,
        resolvedCustomerEmail,
        tableId || null,
        orderType,
        orderInitialStatus,
        paymentStatus,
        paymentMethod,
        JSON.stringify(verifiedOrderItems),
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
        orderNotes,
        promoSnapshot,
        razorpayOrderId,
        publicOrderRef,
        now,
        now,
        allocation.cafeflowFeeMinor / 100,
        allocation.cafeflowFeeMinor,
        resolvedFeeMode,
        cafeNetPayable,
        total
      ]
    );

    // 8. Insert Immutable Record into order_payment_splits
    await d1Exec(
      `INSERT INTO order_payment_splits (
        id, order_id, cafe_id, order_type, currency,
        food_amount_minor, tax_amount_minor, delivery_fee_minor,
        delivery_provider_fare_minor, delivery_markup_minor, cafeflow_fee_minor,
        discount_minor, cafe_discount_minor, platform_discount_minor, discount_funded_by,
        cafe_net_payable_minor, cafeflow_net_payable_minor, customer_payable_minor, wallet_applied_minor,
        razorpay_order_id, razorpay_account_id,
        payment_status, transfer_status, settlement_status,
        reconciliation_status, raw_breakdown_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unsettled', 'matched', ?, ?, ?)`,
      [
        splitId,
        orderId,
        cafeId,
        orderType,
        allocation.currency,
        allocation.foodAmountMinor,
        allocation.taxAmountMinor,
        allocation.deliveryFeeMinor,
        allocation.deliveryProviderFareMinor,
        allocation.deliveryMarkupMinor,
        allocation.cafeflowFeeMinor,
        allocation.discountMinor,
        allocation.cafeDiscountMinor,
        allocation.platformDiscountMinor,
        allocation.discountFundedBy,
        allocation.cafeNetPayableMinor,
        allocation.cafeflowNetPayableMinor,
        allocation.customerPayableMinor,
        allocation.walletAppliedMinor,
        razorpayOrderId,
        null, // No linked account required; centralized collection
        "pending",
        "pending_daily_payout",
        JSON.stringify(allocation),
        now,
        now
      ]
    );

    // 9. If delivery quote was used, link order_id to delivery_quotes
    if (validatedQuoteToken) {
      await d1Exec(
        "UPDATE delivery_quotes SET order_id = ?, status = 'used' WHERE id = ?",
        [orderId, validatedQuoteToken]
      );
    }

    // 10. Generate Bill record immediately for both Cash and UPI pending orders
    try {
      const billId = `bill_${orderId}`;
      const billNumber = `BILL-${String(orderNumber).replace(/^ORD-/i, "").trim()}`;
      const billItems = verifiedOrderItems.map((item: any, idx: number) => ({
        itemId: item.id || `item-${idx}`,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity
      }));

      await d1Exec(
        `INSERT OR IGNORE INTO bills (
          id, cafe_id, order_id, bill_number,
          cafe_name, cafe_address, cafe_phone, cafe_email, cafe_gst,
          customer_name, customer_phone, customer_email,
          order_type, table_id,
          items_json, subtotal, discount, discount_name,
          tax, delivery_fee, additional_charge_amount, additional_charge_name,
          total, payment_method, payment_status,
          currency, timezone, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )`,
        [
          billId,
          cafeId,
          orderId,
          billNumber,
          cafe.name || "Cafe",
          null,
          null,
          null,
          null,
          resolvedCustomerName,
          resolvedCustomerPhone,
          resolvedCustomerEmail,
          orderType,
          tableId || null,
          JSON.stringify(billItems),
          subtotal,
          discount,
          promoSnapshot ? "Promotional Discount" : null,
          tax,
          deliveryFee,
          0,
          null,
          total,
          paymentMethod,
          paymentStatus,
          cafe.currency || "INR",
          "Asia/Kolkata",
          now,
          now
        ]
      );
    } catch (billSaveErr) {
      console.error("[Discover /api/orders] Error saving bill to D1:", billSaveErr);
    }

    // 11. Upsert customer profile in cafe customer directory
    if (resolvedCustomerPhone || resolvedCustomerEmail) {
      try {
        const cleanPhone = (resolvedCustomerPhone || "").replace(/\D/g, "");
        const custKey = cleanPhone.length >= 10
          ? `phone_${cleanPhone.slice(-10)}`
          : (resolvedCustomerEmail ? `email_${resolvedCustomerEmail.toLowerCase()}` : `guest_${orderId}`);
        const existingCustRow = await d1QueryOne<any>(
          "SELECT data_json FROM cafe_settings WHERE cafe_id = ? AND section = ?",
          [cafeId, `customers_${custKey}`]
        );
        let custData: any = {};
        if (existingCustRow?.data_json) {
          try { custData = JSON.parse(existingCustRow.data_json); } catch {}
        }
        const updatedCust = {
          id: custKey,
          userId: user?.id || custData.userId || undefined,
          name: resolvedCustomerName || custData.name || "Customer",
          phone: resolvedCustomerPhone || custData.phone || "",
          email: resolvedCustomerEmail || custData.email || "",
          totalOrders: (Number(custData.totalOrders) || 0) + 1,
          totalSpent: Math.round(((Number(custData.totalSpent) || 0) + total) * 100) / 100,
          firstVisit: custData.firstVisit || now,
          lastVisit: now,
          lastOrder: now,
          lastTable: tableId || "Walk-in",
          updatedAt: now
        };
        await d1Exec(
          `INSERT INTO cafe_settings (cafe_id, section, data_json, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(cafe_id, section) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
          [cafeId, `customers_${custKey}`, JSON.stringify(updatedCust), now]
        );
      } catch (custErr) {
        console.warn("[Discover /api/orders] Error upserting customer:", custErr);
      }
    }

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
        upiId,
        upiUri,
        splitBreakdown: {
          foodAmount: allocation.foodAmountMinor / 100,
          taxAmount: allocation.taxAmountMinor / 100,
          deliveryFee: allocation.deliveryFeeMinor / 100,
          deliveryFare: allocation.deliveryProviderFareMinor / 100,
          deliveryMarkup: allocation.deliveryMarkupMinor / 100,
          cafeFlowFee: allocation.cafeflowFeeMinor / 100,
          discount: allocation.discountMinor / 100,
          cafeNetPayable: allocation.cafeNetPayableMinor / 100,
          cafeflowNetPayable: allocation.cafeflowNetPayableMinor / 100,
          customerPayable: allocation.customerPayableMinor / 100,
          walletApplied: allocation.walletAppliedMinor / 100
        }
      }
    });
  } catch (error: any) {
    console.error("[Discover /api/orders POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
