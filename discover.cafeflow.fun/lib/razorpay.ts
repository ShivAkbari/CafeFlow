import Razorpay from "razorpay";
import crypto from "crypto";

const keyId =
  process.env.RAZORPAY_KEY_ID ||
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
  "rzp_live_Thrq6vnuNr5MEg";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "j4LxMjWEpoUojTUttYULsFOl";

export const razorpayClient = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

/**
 * Verifies Razorpay Checkout signature using constant-time timingSafeEqual
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    if (!orderId || !paymentId || !signature) return false;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const receivedBuf = Buffer.from(signature.trim(), "utf-8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch (err) {
    console.error("[Razorpay signature verification failed]", err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature using constant-time timingSafeEqual
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string
): boolean {
  try {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || keySecret;
    if (!rawBody || !signature || !webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret.trim())
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const receivedBuf = Buffer.from(signature.trim(), "utf-8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch (err) {
    console.error("[Razorpay webhook signature verification failed]", err);
    return false;
  }
}

/**
 * Direct REST helper for Razorpay API calls (Orders, Transfers, Refunds)
 */
export async function razorpayApiRequest<T = any>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: any
): Promise<T> {
  const credentials = `${keyId}:${keySecret}`;
  const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;
  const url = `https://api.razorpay.com/v1${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg =
      data?.error?.description ||
      data?.error?.message ||
      `Razorpay API error: ${res.statusText} (${res.status})`;
    const error: any = new Error(errMsg);
    error.status = res.status;
    error.razorpayError = data?.error;
    throw error;
  }

  return data as T;
}
