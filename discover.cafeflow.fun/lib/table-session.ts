import { d1QueryOne } from "@/lib/db";
import { generateTableToken } from "../../app.cafeflow.fun/lib/db/table-tokens";

export interface TableSessionPayload {
  cafeId: string;
  tableId: string;
  tableName: string;
  verifiedAt: number;
  expiresAt: number;
}

const TABLE_SESSION_SECRET = process.env.JWT_SECRET || "cafeflow-table-session-secret-key-32";
export const TABLE_SESSION_COOKIE = "cafeflow_table_session";

/**
 * Sign table session payload with HMAC-SHA256
 */
export async function signTableSession(payload: TableSessionPayload): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr).toString("base64url");
  
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(TABLE_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sigBase64 = Buffer.from(signature).toString("base64url");
  
  return `${data}.${sigBase64}`;
}

/**
 * Verify signed table session string
 */
export async function verifyTableSessionToken(token: string): Promise<TableSessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [data, sigBase64] = token.split(".");
  if (!data || !sigBase64) return null;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(TABLE_SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(sigBase64, "base64url"),
      enc.encode(data)
    );

    if (!valid) return null;

    const payload: TableSessionPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );

    // Check expiration (default 3 hours)
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
