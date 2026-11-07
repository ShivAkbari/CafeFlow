import { NextRequest, NextResponse } from "next/server";
import { d1Exec, d1QueryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { razorpayClient } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/order-confirmation";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await d1QueryOne<any>(
      `SELECT o.*, c.name as cafe_name, c.currency as cafe_currency
       FROM orders o
       JOIN cafes c ON o.cafe_id = c.id
       WHERE o.id = ? OR o.public_order_ref = ? LIMIT 1`,
      [orderId, orderId]
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify user authorization if authenticated
    if (user?.id && order.user_id && order.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to order" }, { status: 403 });
    }

    // If order is already paid, do not generate a new payment order
    if (order.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          publicOrderRef: order.public_order_ref,
          status: order.status,
          paymentStatus: "paid"
        }
      });
    }

    const now = Date.now();
    const totalMinor = Math.round(Number(order.total || 0) * 100);

    let rzOrderId: string;
    try {
      const rzOrder = await razorpayClient.orders.create({
        amount: totalMinor,
        currency: order.cafe_currency || "INR",
        receipt: order.public_order_ref || order.id,
        notes: {
          cafeId: order.cafe_id,
          orderId: order.id,
          orderType: order.order_type,
          source: "discover_retry_payment",
          retryAt: String(now)
        }
      });
      rzOrderId = rzOrder.id;
    } catch (rzErr: any) {
      console.error("[Razorpay retry order generation error]", rzErr);
      const isDev = process.env.NODE_ENV !== "production";
      const isTestKey = (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_");
      if (isDev && (isTestKey || rzErr?.statusCode === 401)) {
        console.warn("[Local Mode] Razorpay test retry order fallback generated for development/testing.");
        rzOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      } else {
        return NextResponse.json(
          { 
            error: "Failed to initiate payment retry with gateway. Please try again.",
            details: rzErr?.error?.description || rzErr?.message 
          },
          { status: 502 }
        );
      }
    }

    // 2. Update orders table with new razorpay_order_id and set status to pending_payment
    await d1Exec(
      `UPDATE orders 
       SET razorpay_order_id = ?, 
           payment_status = 'pending_payment',
           updated_at = ? 
       WHERE id = ? AND payment_status != 'paid'`,
      [rzOrderId, now, order.id]
    );

    // 3. Update order_payment_splits with new razorpay_order_id
    await d1Exec(
      `UPDATE order_payment_splits 
       SET razorpay_order_id = ?, 
           payment_status = 'pending',
           updated_at = ? 
       WHERE order_id = ? AND payment_status != 'captured'`,
      [rzOrderId, now, order.id]
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        publicOrderRef: order.public_order_ref,
        total: order.total,
        currency: order.cafe_currency || "INR",
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        razorpayOrderId: rzOrderId,
        razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_Thrq6vnuNr5MEg"
      }
    });
  } catch (error: any) {
    console.error("[Retry Payment Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to initiate payment retry" }, { status: 500 });
  }
}
