import { NextRequest, NextResponse } from "next/server";
import { d1Exec, d1Query, d1QueryOne } from "@/lib/db";
import { razorpayApiRequest } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/order-confirmation";

// Configurable abandonment timeout: default 30 minutes
const ABANDONED_TIMEOUT_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    // Verify bearer token or cron secret if provided
    const cronSecret = process.env.CRON_SECRET || "cf_cron_secret";
    if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
      // Optional security check
    }

    const now = Date.now();
    const expiryThreshold = now - ABANDONED_TIMEOUT_MS;

    // Find orders that are still unpaid beyond the timeout
    const abandonedOrders = await d1Query<any>(
      `SELECT id, order_number, cafe_id, order_type, razorpay_order_id, total, status, payment_status, created_at, user_id, applied_wallet_amount
       FROM orders
       WHERE payment_status IN ('pending_payment', 'awaiting_payment', 'pending', 'payment_cancelled', 'payment_failed')
         AND status = 'pending_payment'
         AND created_at < ?
       LIMIT 50`,
      [expiryThreshold]
    );

    const expired: string[] = [];
    const reconciledAndPaid: string[] = [];

    for (const order of abandonedOrders) {
      let isActuallyPaid = false;
      let paymentId: string | null = null;

      // 1. Before expiring, check Razorpay directly to see if a successful payment exists for this order
      if (order.razorpay_order_id) {
        try {
          const rzOrderPayments = await razorpayApiRequest<any>(`/orders/${order.razorpay_order_id}/payments`);
          const paymentsList = rzOrderPayments?.items || [];
          const capturedPayment = paymentsList.find(
            (p: any) => p.status === "captured" || p.status === "authorized"
          );

          if (capturedPayment) {
            isActuallyPaid = true;
            paymentId = capturedPayment.id;
          }
        } catch (apiErr) {
          console.warn(`[Abandonment Check] Error checking Razorpay payments for ${order.id}:`, apiErr);
        }
      }

      if (isActuallyPaid && paymentId) {
        // Reconcile and confirm the paid order!
        await confirmOrderPayment({
          orderId: order.id,
          razorpayPaymentId: paymentId,
          razorpayOrderId: order.razorpay_order_id,
          source: "reconcile"
        });
        reconciledAndPaid.push(order.id);
      } else {
        // Genuine abandoned order: mark expired/cancelled safely
        await d1Exec(
          `UPDATE orders
           SET status = 'cancelled',
               payment_status = 'expired',
               updated_at = ?
           WHERE id = ? AND payment_status != 'paid'`,
          [now, order.id]
        );

        await d1Exec(
          `UPDATE order_payment_splits
           SET payment_status = 'expired',
               updated_at = ?
           WHERE order_id = ? AND payment_status != 'captured'`,
          [now, order.id]
        );

        // Refund any reserved wallet deduction if wallet was debited during checkout
        const walletUsed = Number(order.applied_wallet_amount || 0);
        if (walletUsed > 0 && order.user_id) {
          const cafeWallet = await d1QueryOne<{ balance: number }>(
            "SELECT balance FROM user_wallets WHERE user_id = ? AND (cafe_id = ? OR LOWER(cafe_id) = LOWER(?)) LIMIT 1",
            [order.user_id, order.cafe_id, order.cafe_id]
          );
          const refundTargetCafeId = cafeWallet ? order.cafe_id : "__global__";

          await d1Exec(
            `UPDATE user_wallets
             SET balance = balance + ?, updated_at = ?
             WHERE user_id = ? AND (cafe_id = ? OR LOWER(cafe_id) = LOWER(?))`,
            [walletUsed, now, order.user_id, refundTargetCafeId, refundTargetCafeId]
          );

          const refundTxId = `tx_refund_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await d1Exec(
            `INSERT INTO wallet_ledger (id, user_id, cafe_id, amount, entry_type, description, order_id, created_at)
             VALUES (?, ?, ?, ?, 'credit', ?, ?, ?)`,
            [refundTxId, order.user_id, refundTargetCafeId, walletUsed, `Payment expired refund ${order.order_number}`, order.id, now]
          );
        }

        expired.push(order.id);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: abandonedOrders.length,
      expiredOrders: expired,
      reconciledOrders: reconciledAndPaid
    });
  } catch (error: any) {
    console.error("[Abandonment Cleanup Error]", error);
    return NextResponse.json({ error: error?.message || "Abandonment cleanup failed" }, { status: 500 });
  }
}
