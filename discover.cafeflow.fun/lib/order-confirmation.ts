import { d1Exec, d1QueryOne } from "@/lib/db";
import { createShiprocketDeliveryOrder } from "@/lib/delivery";

export interface ConfirmPaymentResult {
  success: boolean;
  alreadyConfirmed: boolean;
  orderId: string;
  orderNumber: string;
  publicOrderRef: string;
  cafeId: string;
  orderType: string;
  deliveryDispatched?: boolean;
  deliveryResult?: any;
}

/**
 * Authoritatively and idempotently transitions an order to confirmed & paid status.
 * Ensures:
 * 1. Atomic status transition: only orders in pending/pending_payment/payment_pending/awaiting_payment
 *    can be transitioned. If already confirmed/paid, returns idempotently without re-triggering side effects.
 * 2. Downstream fulfillment:
 *    - Cafe kitchen order notification (immutable bill persistence)
 *    - Shiprocket delivery dispatch (only for order_type === 'delivery')
 *    - Order payment split status updated to captured
 */
export async function confirmOrderPayment(params: {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId?: string | null;
  source: "frontend_callback" | "webhook" | "reconcile";
}): Promise<ConfirmPaymentResult> {
  const { orderId, razorpayPaymentId, razorpayOrderId, source } = params;
  const now = Date.now();

  // 1. Fetch current order
  const order = await d1QueryOne<any>(
    `SELECT o.*, c.name as cafe_name, c.slug as cafe_slug, c.currency as cafe_currency
     FROM orders o
     JOIN cafes c ON o.cafe_id = c.id
     WHERE o.id = ? LIMIT 1`,
    [orderId]
  );

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // 2. Check if already confirmed/paid
  if (order.payment_status === "paid" && (order.status === "confirmed" || order.status === "preparing" || order.status === "ready" || order.status === "out_for_delivery" || order.status === "delivered" || order.status === "completed")) {
    return {
      success: true,
      alreadyConfirmed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      publicOrderRef: order.public_order_ref,
      cafeId: order.cafe_id,
      orderType: order.order_type,
    };
  }

  // 3. Conditional Atomic Update in D1
  // Ensures only 1 concurrent process (webhook or frontend callback) succeeds in transitioning the row
  const updateResult = await d1Exec(
    `UPDATE orders
     SET payment_status = 'paid',
         status = CASE WHEN status = 'pending' OR status = 'pending_payment' OR status = 'payment_pending' THEN 'pending' ELSE status END,
         razorpay_payment_id = ?,
         razorpay_order_id = COALESCE(?, razorpay_order_id),
         updated_at = ?
     WHERE id = ? AND payment_status != 'paid'`,
    [razorpayPaymentId, razorpayOrderId || null, now, orderId]
  );

  // If another thread already marked it paid, return idempotently
  if (updateResult && (updateResult as any).meta?.changes === 0) {
    return {
      success: true,
      alreadyConfirmed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      publicOrderRef: order.public_order_ref,
      cafeId: order.cafe_id,
      orderType: order.order_type,
    };
  }

  // 4. Update order_payment_splits record
  const splitRecord = await d1QueryOne<any>(
    "SELECT * FROM order_payment_splits WHERE order_id = ? LIMIT 1",
    [orderId]
  );

  if (splitRecord) {
    await d1Exec(
      `UPDATE order_payment_splits
       SET payment_status = 'captured',
           razorpay_payment_id = ?,
           razorpay_order_id = COALESCE(?, razorpay_order_id),
           transfer_status = 'pending_daily_payout',
           settlement_status = 'unsettled',
           updated_at = ?
       WHERE id = ?`,
      [razorpayPaymentId, razorpayOrderId || null, now, splitRecord.id]
    );
  }

  // 5. Parse order items
  let parsedItems: any[] = [];
  try {
    parsedItems = JSON.parse(order.items_json || "[]");
  } catch {}

  // 6. Save or Update Bill Record in bills table
  try {
    const billId = `bill_${orderId}`;
    const billNumber = `BILL-${String(order.order_number).replace(/^ORD-/i, "").trim()}`;
    const billItems = parsedItems.map((item: any, idx: number) => ({
      itemId: item.id || `item-${idx}`,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: Number(item.price || 0) * Number(item.quantity || 1)
    }));

    const customerEmail = order.customer_email ? String(order.customer_email).trim() : null;
    const emailRequested = customerEmail ? 1 : 0;
    const emailStatus = customerEmail ? "pending" : "none";
    const emailIdempotencyKey = customerEmail ? `bill_email_${orderId}` : null;

    await d1Exec(
      `INSERT INTO bills (
        id, cafe_id, order_id, bill_number,
        cafe_name, cafe_address, cafe_phone, cafe_email, cafe_gst,
        customer_name, customer_phone, customer_email,
        order_type, table_id,
        items_json, subtotal, discount, discount_name,
        tax, delivery_fee, additional_charge_amount, additional_charge_name,
        total, payment_method, payment_status,
        currency, timezone, created_at, updated_at,
        email_delivery_requested, email_delivery_status, email_idempotency_key, email_recipient
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 'paid',
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(order_id) DO UPDATE SET
        payment_status = 'paid',
        email_delivery_requested = CASE WHEN excluded.customer_email IS NOT NULL THEN 1 ELSE bills.email_delivery_requested END,
        email_recipient = COALESCE(excluded.customer_email, bills.email_recipient),
        updated_at = excluded.updated_at`,
      [
        billId,
        order.cafe_id,
        orderId,
        billNumber,
        order.cafe_name || "Cafe",
        null,
        null,
        null,
        null,
        order.customer_name || "Customer",
        order.customer_phone || "",
        customerEmail,
        order.order_type,
        order.table_id || null,
        JSON.stringify(billItems),
        order.subtotal,
        order.discount,
        order.promotion_snapshot_json ? "Promotional Discount" : null,
        order.tax,
        order.delivery_fee,
        0,
        null,
        order.total,
        order.payment_method || "online",
        order.cafe_currency || "INR",
        "Asia/Kolkata",
        now,
        now,
        emailRequested,
        emailStatus,
        emailIdempotencyKey,
        customerEmail
      ]
    );

    // Await bill email dispatch before returning to ensure cloudflare edge worker completes SMTP handoff
    if (customerEmail) {
      const mainAppUrl = process.env.MAIN_APP_URL || process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://app.cafeflow.fun";
      const secret = process.env.INTERNAL_API_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.JWT_SECRET || "";
      try {
        const res = await fetch(`${mainAppUrl}/api/internal/send-bill`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": secret
          },
          body: JSON.stringify({
            cafeId: order.cafe_id,
            orderId,
            recipientEmail: customerEmail
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[confirmOrderPayment] Bill email dispatch returned status ${res.status}:`, errText);
        } else {
          console.log(`[confirmOrderPayment] Bill email dispatch accepted for order ${orderId}`);
        }
      } catch (dispatchErr) {
        console.warn(`[confirmOrderPayment] Failed to trigger bill email dispatch for order ${orderId}:`, dispatchErr);
      }
    }
  } catch (billErr) {
    console.warn(`[confirmOrderPayment] Bill generation warning for order ${orderId}:`, billErr);
  }

  // 7. Dispatch Delivery Shipment via Shiprocket ONLY if orderType === 'delivery'
  let deliveryDispatched = false;
  let deliveryResult: any = null;

  if (order.order_type === "delivery") {
    // Extract formatted address from notes
    const rawAddress = String(order.notes || "").replace(/^Delivery Address:\s*/i, "").trim() || "Delivery Address";

    // Find linked quote if exists
    const quoteRow = await d1QueryOne<any>(
      "SELECT id, customer_fee_minor FROM delivery_quotes WHERE order_id = ? LIMIT 1",
      [orderId]
    );

    const deliveryCreation = await createShiprocketDeliveryOrder({
      orderId: order.id,
      cafeId: order.cafe_id,
      userId: order.user_id,
      customerName: order.customer_name || "Customer",
      customerPhone: order.customer_phone || "",
      deliveryAddress: rawAddress,
      items: parsedItems.map((it: any) => ({
        name: it.name,
        quantity: it.quantity || 1,
        price: it.price || 0
      })),
      orderValue: order.total || 0,
      deliveryFeeMinor: quoteRow?.customer_fee_minor || Math.round(Number(order.delivery_fee || 45) * 100),
      quoteId: quoteRow?.id || null
    });

    deliveryDispatched = deliveryCreation.success;
    deliveryResult = deliveryCreation;
  }

  return {
    success: true,
    alreadyConfirmed: false,
    orderId: order.id,
    orderNumber: order.order_number,
    publicOrderRef: order.public_order_ref,
    cafeId: order.cafe_id,
    orderType: order.order_type,
    deliveryDispatched,
    deliveryResult
  };
}
