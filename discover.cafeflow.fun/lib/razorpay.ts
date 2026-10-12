import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TX8S7xF1HU77Ye";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "V5XL133FMdgygQm6MOWtoR6j";

export const razorpayClient = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");
    return expectedSignature === signature;
  } catch (err) {
    console.error("[Razorpay signature verification failed]", err);
    return false;
  }
}
