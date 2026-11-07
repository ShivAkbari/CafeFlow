"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { GoogleAuthModal } from "@/components/google-login-modal";

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<string>("500");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [topupError, setTopupError] = useState<string>("");
  const [topupSuccess, setTopupSuccess] = useState<string>("");

  const loadWallet = () => {
    setLoading(true);
    fetch("/api/wallet")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setBalance(data.balance || 0);
          setLedger(data.ledger || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // Check user auth
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    loadWallet();
  }, []);

  const handleTopup = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const amt = Number(topupAmount);
    if (!amt || amt < 50) {
      setTopupError("Minimum top-up amount is ₹50.");
      return;
    }

    setIsProcessing(true);
    setTopupError("");
    setTopupSuccess("");

    try {
      // 1. Initiate Razorpay top-up order
      const initRes = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate_topup",
          amount: amt
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initiate top-up");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: initData.keyId,
        amount: Math.round(amt * 100),
        currency: "INR",
        name: "CafeFlow Wallet",
        description: `Wallet Recharge: ₹${amt}`,
        order_id: initData.razorpayOrderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "verify_topup",
                amount: amt,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setBalance(verifyData.newBalance);
              setTopupSuccess(`₹${amt} added to your CafeFlow wallet!`);
              loadWallet();
            } else {
              setTopupError(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            setTopupError(err.message || "Failed to complete top-up");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user.name || "",
          contact: user.phone || "",
          email: user.email || ""
        },
        theme: {
          color: "#002D23"
        }
      };

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        throw new Error("Payment gateway is loading. Please try again in a moment.");
      }
    } catch (err: any) {
      setTopupError(err.message || "Top-up failed");
      setIsProcessing(false);
    }
  };

  const presetAmounts = ["200", "500", "1000", "2000"];

  return (
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <main className="max-w-[430px] md:max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-28 md:pb-12 space-y-4">
        
        {/* Top Header */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#0B1714] dark:text-white shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[16px] leading-tight text-[#0B1714] dark:text-white">CafeFlow Wallet</h1>
            <p className="text-[11px] text-[#73716B]">Prepaid balance &amp; transaction ledger</p>
          </div>
          <button
            onClick={() => loadWallet()}
            aria-label="Refresh wallet"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] flex items-center justify-center text-[#0B1714] dark:text-white shadow-xs shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#002D23] dark:text-[#34D399] ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        {/* 1. Wallet Balance Card */}
        <section className="p-5 rounded-[24px] bg-[#002D23] text-white shadow-md relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Authoritative Balance</span>
            </div>
            <Wallet className="w-6 h-6 text-emerald-300 opacity-80" />
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] text-emerald-100 opacity-80">Available to spend</div>
            <div className="text-[34px] font-black tracking-tight leading-tight">
              ₹{balance.toFixed(0)}
            </div>
          </div>

          <div className="text-[10px] text-emerald-100 opacity-70 pt-1 border-t border-emerald-800/40">
            Usable across all CafeFlow table QR ordering and takeaway checkouts.
          </div>
        </section>

        {/* 2. Instant Top-Up Section */}
        <section className="p-5 rounded-[22px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[14px] text-[#0B1714] dark:text-white">
              Add Money to Wallet
            </h3>
            <span className="text-[10px] font-bold text-[#73716B]">Secure Razorpay</span>
          </div>

          <div className="flex gap-2">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTopupAmount(amt)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  topupAmount === amt
                    ? "bg-[#002D23] text-white border-[#002D23] shadow-xs"
                    : "bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#73716B]">Or enter custom amount (₹)</label>
            <input
              type="number"
              min="50"
              max="50000"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent text-sm font-bold text-[#0B1714] dark:text-white focus:outline-none focus:border-[#002D23]"
            />
          </div>

          {topupError && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs">
              {topupError}
            </div>
          )}

          {topupSuccess && (
            <div className="p-2.5 rounded-xl bg-[#E6F0DD] dark:bg-[#002D23]/30 border border-[#002D23]/30 text-[#002D23] dark:text-[#34D399] text-xs font-bold">
              {topupSuccess}
            </div>
          )}

          <button
            type="button"
            onClick={handleTopup}
            disabled={isProcessing}
            className="w-full py-3 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isProcessing ? "Opening Gateway..." : `Top Up ₹${topupAmount || "0"}`}</span>
          </button>
        </section>

        {/* 3. Transaction History Ledger */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="font-extrabold text-[14px] text-[#0B1714] dark:text-white">
              Transaction History
            </h3>
            <span className="text-[11px] text-[#73716B]">{ledger.length} entries</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#73716B] animate-pulse">
              Loading ledger transactions...
            </div>
          ) : ledger.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] text-center space-y-1.5">
              <Clock className="w-6 h-6 text-[#73716B] mx-auto opacity-50" />
              <div className="font-bold text-xs text-[#0B1714] dark:text-white">No transactions yet</div>
              <p className="text-[11px] text-[#73716B]">Wallet debits and top-ups will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ledger.map((item) => {
                const isCredit = item.entryType === "credit" || Number(item.amount) > 0;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-xs text-[#0B1714] dark:text-white truncate">
                          {item.description || (isCredit ? "Wallet Top-up" : "Order Payment")}
                        </div>
                        <div className="text-[10px] text-[#73716B]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "Recent"}
                        </div>
                      </div>
                    </div>

                    <div className={`font-black text-sm shrink-0 ${
                      isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-[#0B1714] dark:text-white"
                    }`}>
                      {isCredit ? "+" : "-"}₹{Math.abs(Number(item.amount)).toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Google Authentication Modal */}
        <GoogleAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(u) => {
            setUser(u);
            loadWallet();
          }}
        />

      </main>
    </div>
  );
}
