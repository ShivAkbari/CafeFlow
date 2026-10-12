import { NextRequest, NextResponse } from "next/server";
import { d1Exec, d1QueryOne } from "@/lib/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification parameters" }, { status: 400 });
    }

    // 1. Verify cryptographic signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Fetch order to verify match
    const order = await d1QueryOne<any>("SELECT id, status, payment_status FROM orders WHERE id = ?", [orderId]);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Mark order as paid and confirmed
    const now = Date.now();
    await d1Exec(
      `UPDATE orders 
       SET payment_status = 'paid', 
           status = 'confirmed', 
           razorpay_payment_id = ?, 
           updated_at = ? 
       WHERE id = ?`,
      [razorpayPaymentId, now, orderId]
    );

    return NextResponse.json({
      success: true,
      orderId,
      status: "confirmed",
      paymentStatus: "paid"
    });
  } catch (error: any) {
    console.error("[Discover /api/payments/verify error]", error);
    return NextResponse.json({ error: error.message || "Payment verification failed" }, { status: 500 });
  }
}
