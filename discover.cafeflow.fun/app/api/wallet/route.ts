import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1QueryOne, d1Exec } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { razorpayClient, verifyRazorpaySignature } from "@/lib/razorpay";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, balance: 0, ledger: [] });
    }

    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get("cafeId") || "__global__";

    // 1. Fetch balance from user_wallets table
    let walletRow = await d1QueryOne<{ balance: number; updated_at: number }>(
      "SELECT balance, updated_at FROM user_wallets WHERE user_id = ? AND (cafe_id = ? OR LOWER(cafe_id) = LOWER(?)) LIMIT 1",
      [user.id, cafeId, cafeId]
    );

    // If no cafe-specific balance found or 0, and cafeId is not __global__, check __global__ wallet
    if ((!walletRow || Number(walletRow.balance) <= 0) && cafeId !== "__global__") {
      const globalRow = await d1QueryOne<{ balance: number; updated_at: number }>(
        "SELECT balance, updated_at FROM user_wallets WHERE user_id = ? AND cafe_id = '__global__' LIMIT 1",
        [user.id]
      );
      if (globalRow && Number(globalRow.balance) > 0) {
        walletRow = globalRow;
      }
    }

    // Also check global or legacy settings balance if available
    let balance = Number(walletRow?.balance || 0);

    // 2. Fetch ledger entries
    const ledgerRows = await d1Query<any>(
      `SELECT * FROM wallet_ledger 
       WHERE user_id = ? AND (cafe_id = ? OR LOWER(cafe_id) = LOWER(?) OR cafe_id = '__global__')
       ORDER BY created_at DESC LIMIT 50`,
      [user.id, cafeId, cafeId]
    );

    const ledger = ledgerRows.map((r) => ({
      id: r.id,
      amount: r.amount,
      entryType: r.entry_type,
      description: r.description,
      orderId: r.order_id,
      createdAt: r.created_at
    }));

    return NextResponse.json({
      authenticated: true,
      balance,
      updatedAt: walletRow?.updated_at || Date.now(),
      ledger
    });
  } catch (error: any) {
    console.error("[Discover /api/wallet GET error]", error);
    return NextResponse.json({ error: error.message || "Failed to load wallet" }, { status: 500 });
  }
}

/**
 * Top up customer wallet or create top-up payment order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, cafeId = "__global__", razorpayPaymentId, razorpayOrderId, razorpaySignature } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: "Please specify a valid top-up amount" }, { status: 400 });
    }

    // Phase 1: Initiate Razorpay payment order for wallet topup
    if (action === "initiate_topup") {
      const topupReceipt = `wtop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const rzOrder = await razorpayClient.orders.create({
        amount: Math.round(numAmount * 100),
        currency: "INR",
        receipt: topupReceipt,
        notes: {
          userId: user.id,
          userEmail: user.email,
          cafeId,
          type: "wallet_topup"
        }
      });

      return NextResponse.json({
        success: true,
        razorpayOrderId: rzOrder.id,
        amount: numAmount,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_Thrq6vnuNr5MEg"
      });
    }

    // Phase 2: Verify payment and credit wallet
    if (action === "verify_topup") {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json({ error: "Missing Razorpay verification tokens" }, { status: 400 });
      }

      const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }

      const now = Date.now();
      const currentWallet = await d1QueryOne<{ balance: number }>(
        "SELECT balance FROM user_wallets WHERE user_id = ? AND cafe_id = ?",
        [user.id, cafeId]
      );

      const currentBal = Number(currentWallet?.balance || 0);
      const newBalance = currentBal + numAmount;
      const walletId = `${user.id}_${cafeId}`;

      await d1Exec(
        `INSERT INTO user_wallets (id, user_id, cafe_id, balance, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, cafe_id) DO UPDATE SET balance = ?, updated_at = ?`,
        [walletId, user.id, cafeId, newBalance, now, newBalance, now]
      );

      const txId = `tx_topup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await d1Exec(
        `INSERT INTO wallet_ledger (id, user_id, cafe_id, amount, entry_type, description, order_id, created_at)
         VALUES (?, ?, ?, ?, 'credit', ?, ?, ?)`,
        [txId, user.id, cafeId, numAmount, `Wallet Top-up via Razorpay (${razorpayPaymentId})`, razorpayPaymentId, now]
      );

      return NextResponse.json({
        success: true,
        message: "Wallet topped up successfully",
        newBalance
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Discover /api/wallet POST error]", error);
    return NextResponse.json({ error: error.message || "Failed to process wallet transaction" }, { status: 500 });
  }
}
