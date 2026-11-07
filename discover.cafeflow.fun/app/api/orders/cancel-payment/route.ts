import { NextRequest, NextResponse } from "next/server";
import { d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { orderId, reason = "customer_cancelled" } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await d1QueryOne<any>(
      "SELECT * FROM orders WHERE id = ? OR public_order_ref = ? LIMIT 1",
      [orderId, orderId]
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Do NOT alter if order is already paid or confirmed
    if (order.payment_status === "paid" || order.status === "confirmed") {
      return NextResponse.json({
        success: true,
        message: "Order already confirmed and paid. Cannot mark as cancelled.",
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.payment_status
        }
      });
    }

    const now = Date.now();
    const newPaymentStatus = reason === "payment_failed" ? "payment_failed" : "payment_cancelled";

    // Update orders table atomically
    await d1Exec(
      `UPDATE orders 
       SET payment_status = ?, 
           updated_at = ? 
       WHERE id = ? AND payment_status != 'paid'`,
      [newPaymentStatus, now, order.id]
    );

    // Update order_payment_splits table
    await d1Exec(
      `UPDATE order_payment_splits 
       SET payment_status = ?, 
           updated_at = ? 
       WHERE order_id = ? AND payment_status != 'captured'`,
      [newPaymentStatus, now, order.id]
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      paymentStatus: newPaymentStatus
    });
  } catch (error: any) {
    console.error("[Cancel Payment Attempt Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to update payment status" }, { status: 500 });
  }
}
