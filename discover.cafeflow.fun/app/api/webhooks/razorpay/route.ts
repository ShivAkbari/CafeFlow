import { NextRequest, NextResponse } from "next/server";
import { d1Exec, d1QueryOne } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/order-confirmation";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      console.warn("[Razorpay Webhook] Missing x-razorpay-signature");
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[Razorpay Webhook] Invalid webhook signature received");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId = payload.event_id || payload.contains?.[0] || `evt_${Date.now()}`;
    const now = Date.now();

    console.log(`[Razorpay Webhook] Event received: ${event} (id: ${eventId})`);

    // 1. Idempotency Check via webhook_events in D1
    const existing = await d1QueryOne<any>(
      "SELECT id FROM webhook_events WHERE id = ? AND provider = 'razorpay'",
      [eventId]
    );

    if (existing) {
      console.log(`[Razorpay Webhook] Duplicate event ignored: ${eventId}`);
      return NextResponse.json({ success: true, duplicated: true });
    }

    // Persist event idempotency token
    await d1Exec(
      "INSERT OR IGNORE INTO webhook_events (id, provider, event_type, received_at) VALUES (?, 'razorpay', ?, ?)",
      [eventId, event, now]
    );

    // 2. Handle Payment Captured & Order Paid
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id;

      if (!rzpOrderId) {
        return NextResponse.json({ error: "Missing order_id in webhook payload" }, { status: 400 });
      }

      // Find order in D1
      const order = await d1QueryOne<any>(
        `SELECT o.*
         FROM orders o
         WHERE o.razorpay_order_id = ? OR o.id = ? LIMIT 1`,
        [rzpOrderId, rzpOrderId]
      );

      if (!order) {
        console.warn(`[Razorpay Webhook] No matching order found for Razorpay order ${rzpOrderId}`);
        return NextResponse.json({ success: true, message: "Order not found in Discover database" });
      }

      // Centralized idempotent order payment confirmation and downstream delivery dispatch
      const confirmationResult = await confirmOrderPayment({
        orderId: order.id,
        razorpayPaymentId: rzpPaymentId || order.razorpay_payment_id || `pay_${rzpOrderId}`,
        razorpayOrderId: rzpOrderId,
        source: "webhook"
      });

      console.log(
        `[Razorpay Webhook] Order ${order.id} payment confirmed via webhook. Already confirmed: ${confirmationResult.alreadyConfirmed}, delivery dispatched: ${confirmationResult.deliveryDispatched}`
      );
      return NextResponse.json({
        success: true,
        orderId: order.id,
        alreadyConfirmed: confirmationResult.alreadyConfirmed,
        deliveryDispatched: confirmationResult.deliveryDispatched
      });
    }

    // 3. Handle Payment Failed
    if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;
      const errorDesc = paymentEntity?.error_description || "Payment failed at gateway";

      if (rzpOrderId) {
        // Do not alter order if it was already marked paid
        await d1Exec(
          "UPDATE orders SET payment_status = 'payment_failed', updated_at = ? WHERE razorpay_order_id = ? AND payment_status != 'paid'",
          [now, rzpOrderId]
        );

        await d1Exec(
          "UPDATE order_payment_splits SET payment_status = 'payment_failed', updated_at = ? WHERE razorpay_order_id = ? AND payment_status != 'captured'",
          [now, rzpOrderId]
        );
      }
      return NextResponse.json({ success: true, processed: "payment.failed" });
    }

    // 4. Handle Refunds
    if (event === "refund.processed" || event === "payment.refunded") {
      const refundEntity = payload.payload?.refund?.entity || payload.payload?.payment?.entity;
      const rzpPaymentId = refundEntity?.payment_id || refundEntity?.id;
      const refundAmountMinor = refundEntity?.amount || 0;
      const refundId = refundEntity?.id || null;

      if (rzpPaymentId) {
        const split = await d1QueryOne<any>(
          "SELECT * FROM order_payment_splits WHERE razorpay_payment_id = ? LIMIT 1",
          [rzpPaymentId]
        );

        if (split) {
          const isFull = refundAmountMinor >= split.customer_payable_minor;
          await d1Exec(
            `UPDATE order_payment_splits
             SET refund_status = ?,
                 refund_amount_minor = refund_amount_minor + ?,
                 refund_id = ?,
                 updated_at = ?
             WHERE id = ?`,
            [isFull ? "full" : "partial", refundAmountMinor, refundId, now, split.id]
          );

          await d1Exec(
            "UPDATE orders SET payment_status = 'refunded', updated_at = ? WHERE id = ?",
            [now, split.order_id]
          );
        }
      }
      return NextResponse.json({ success: true, processed: "refund" });
    }

    return NextResponse.json({ success: true, message: "Event ignored" });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
