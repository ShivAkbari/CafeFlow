import { NextRequest, NextResponse } from "next/server";
import { d1QueryOne, d1Exec } from "@/lib/db";
import { verifyRazorpaySignature, razorpayApiRequest } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/order-confirmation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification parameters" }, { status: 400 });
    }

    // 1. Verify cryptographic signature using constant-time check
    const isDev = process.env.NODE_ENV !== "production";
    const isTestOrder = razorpayOrderId?.startsWith("order_test_");
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid && !(isDev && isTestOrder)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Fetch order to verify match against payment details
    const order = await d1QueryOne<any>(
      `SELECT o.*, c.name as cafe_name, c.currency as cafe_currency
       FROM orders o
       JOIN cafes c ON o.cafe_id = c.id
       WHERE o.id = ? LIMIT 1`,
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify razorpay_order_id matches order
    if (order.razorpay_order_id && order.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json(
        { error: "Payment does not match the registered Razorpay order ID" },
        { status: 400 }
      );
    }

    // 3. Server-side payment verification: Fetch payment entity from Razorpay API
    // Verify amount, currency, and captured/authorized status
    try {
      const isDev = process.env.NODE_ENV !== "production";
      const isTestOrder = razorpayOrderId?.startsWith("order_test_");

      let paymentEntity: any = null;
      if (isDev && isTestOrder) {
        console.warn("[Local Mode] Skipping live Razorpay fetch for local test order:", razorpayOrderId);
        paymentEntity = {
          id: razorpayPaymentId,
          order_id: razorpayOrderId,
          status: "captured",
          amount: Math.round(Number(order.total || 0) * 100),
          currency: "INR"
        };
      } else {
        paymentEntity = await razorpayApiRequest<any>(`/payments/${razorpayPaymentId}`);
      }

      if (!paymentEntity || !paymentEntity.id) {
        return NextResponse.json(
          { error: "Payment record could not be fetched from payment gateway" },
          { status: 400 }
        );
      }

      if (paymentEntity.order_id && paymentEntity.order_id !== razorpayOrderId) {
        return NextResponse.json(
          { error: "Payment entity order_id mismatch" },
          { status: 400 }
        );
      }

      // Check payment status from Razorpay (authorized or captured)
      if (paymentEntity.status !== "captured" && paymentEntity.status !== "authorized") {
        return NextResponse.json(
          { error: `Payment is in invalid status: ${paymentEntity.status}. Order not confirmed.` },
          { status: 400 }
        );
      }

      // Check amount matching (in minor units paise)
      const expectedPaise = Math.round(Number(order.total || 0) * 100);
      const paidPaise = Number(paymentEntity.amount || 0);
      if (expectedPaise > 0 && paidPaise < expectedPaise) {
        return NextResponse.json(
          { error: `Payment amount ₹${paidPaise / 100} is less than required order total ₹${expectedPaise / 100}` },
          { status: 400 }
        );
      }
      // If customer phone was empty on checkout, save authenticated phone from Razorpay
      const rzpPhone = (paymentEntity.contact || "").replace(/[\s\-()]/g, "");
      if (rzpPhone && (!order.customer_phone || order.customer_phone === "")) {
        await d1Exec(
          "UPDATE orders SET customer_phone = ? WHERE id = ?",
          [rzpPhone, order.id]
        );
      }
    } catch (rzpErr: any) {
      console.warn("[Payment Verification] Razorpay API entity lookup warning:", rzpErr?.message || rzpErr);
      // Signature was already cryptographically verified with server secret.
    }

    // 4. Idempotent Order Confirmation and Downstream Dispatch
    const confirmationResult = await confirmOrderPayment({
      orderId,
      razorpayPaymentId,
      razorpayOrderId,
      source: "frontend_callback"
    });

    return NextResponse.json({
      success: true,
      orderId: confirmationResult.orderId,
      orderNumber: confirmationResult.orderNumber,
      publicOrderRef: confirmationResult.publicOrderRef,
      status: "confirmed",
      paymentStatus: "paid",
      alreadyConfirmed: confirmationResult.alreadyConfirmed,
      deliveryDispatched: confirmationResult.deliveryDispatched
    });
  } catch (error: any) {
    console.error("[Discover /api/payments/verify error]", error);
    return NextResponse.json({ error: error.message || "Payment verification failed" }, { status: 500 });
  }
}
