"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Tag,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { items, cafeName, cafeSlug, cafeId, currency, updateQuantity, removeItem, clearCart, subtotal } = useCart();

  const [orderType, setOrderType] = useState<"takeaway" | "dine-in">("takeaway");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");

  const tax = subtotal * 0.05; // 5% GST
  const discount = appliedPromo ? appliedPromo.discount : 0;
  const total = Math.max(0, subtotal + tax - discount);

  // Apply promo against real cafe promotions
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError("");

    try {
      const res = await fetch(`/api/cafes/${cafeSlug}`);
      const data = await res.json();
      const promotions = data.promotions || [];

      const matched = promotions.find(
        (p: any) => p.code.toLowerCase() === promoCode.trim().toLowerCase()
      );

      if (!matched) {
        setPromoError("Invalid promo code for this cafe.");
        return;
      }

      if (matched.min_order_value && subtotal < matched.min_order_value) {
        setPromoError(`Minimum order of ${currency} ${matched.min_order_value} required.`);
        return;
      }

      let disc = 0;
      if (matched.promo_type === "percentage") {
        disc = (subtotal * matched.value) / 100;
        if (matched.max_discount > 0 && disc > matched.max_discount) {
          disc = matched.max_discount;
        }
      } else {
        disc = Math.min(subtotal, matched.value);
      }

      setAppliedPromo({ code: matched.code, discount: disc, title: matched.title });
    } catch {
      setPromoError("Could not verify promo code.");
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || items.length === 0 || !cafeId) return;

    setSubmitting(true);
    setOrderError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          customerName,
          customerPhone,
          customerEmail,
          orderType,
          tableId: orderType === "dine-in" ? tableNumber : undefined,
          items,
          notes,
          paymentMethod,
          promoCode: appliedPromo ? appliedPromo.code : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // If Razorpay checkout required
      if (paymentMethod === "online" && data.order?.razorpayOrderId) {
        const options = {
          key: data.order.razorpayKeyId,
          amount: Math.round(data.order.total * 100),
          currency: data.order.currency || "INR",
          name: cafeName || "CafeFlow",
          description: `Order ${data.order.orderNumber}`,
          order_id: data.order.razorpayOrderId,
          handler: async function (response: any) {
            await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            clearCart();
            router.push(`/orders/${data.order.publicOrderRef || data.order.id}`);
          },
          prefill: {
            name: customerName,
            contact: customerPhone,
            email: customerEmail
          },
          theme: {
            color: "#064E3B"
          }
        };

        if (typeof window !== "undefined" && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          clearCart();
          router.push(`/orders/${data.order.publicOrderRef || data.order.id}`);
        }
      } else {
        clearCart();
        router.push(`/orders/${data.order.publicOrderRef || data.order.id}`);
      }
    } catch (err: any) {
      setOrderError(err.message || "Failed to place order");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
        <main className="max-w-[430px] md:max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center mx-auto text-[#777D79] shadow-subtle">
            <ShoppingBag className="w-6 h-6 text-[#064E3B]" />
          </div>
          <h2 className="text-[17px] font-bold">Your cart is empty</h2>
          <p className="text-[12px] text-[#777D79]">Explore partner cafes and add fresh artisan specials to your order.</p>
          <Link
            href="/"
            className="inline-block mt-2 px-5 py-2.5 rounded-full bg-[#064E3B] text-white font-bold text-xs shadow-sm hover:bg-[#043B2C] transition-colors"
          >
            Explore Cafes
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-4">

        {/* 1. COMPACT HEADER */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back to cafe"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[16px] leading-tight">Your Cart</h1>
            <p className="text-[11px] text-[#777D79] truncate max-w-[200px]">{cafeName}</p>
          </div>
          <button
            onClick={clearCart}
            aria-label="Clear cart"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-rose-500 shadow-subtle shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </header>

        {/* 2. ORDER TYPE SELECTOR */}
        <div className="grid grid-cols-2 gap-2 bg-white dark:bg-[#181C1A] p-1 rounded-2xl border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle">
          <button
            type="button"
            onClick={() => setOrderType("takeaway")}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              orderType === "takeaway"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-[#777D79] hover:text-[#191D1B]"
            }`}
          >
            🥡 Takeaway / Pickup
          </button>
          <button
            type="button"
            onClick={() => setOrderType("dine-in")}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              orderType === "dine-in"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-[#777D79] hover:text-[#191D1B]"
            }`}
          >
            ☕ Dine-In Table
          </button>
        </div>

        {orderType === "dine-in" && (
          <div className="bg-white dark:bg-[#181C1A] p-3 rounded-2xl border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#777D79]">Table Number</span>
            <input
              type="text"
              required
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 4"
              className="w-20 px-2.5 py-1.5 rounded-xl border border-[#E9E8E2] text-center font-bold focus:outline-none focus:border-[#064E3B]"
            />
          </div>
        )}

        {/* 3. CART ITEMS LIST */}
        <section className="bg-white dark:bg-[#181C1A] rounded-2xl border border-[#E9E8E2] dark:border-[#242B27] shadow-card divide-y divide-[#F2F1EB] dark:divide-[#242B27]">
          {items.map((item) => (
            <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-13 h-13 rounded-xl object-cover bg-stone-100 dark:bg-stone-800 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-[14px] text-[#191D1B] dark:text-white truncate">
                    {item.name}
                  </h4>
                  <span className="text-[12px] text-[#777D79] font-medium">
                    {currency} {item.price.toFixed(2)} each
                  </span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 border border-[#E9E8E2] dark:border-[#242B27] rounded-xl px-2 py-1 bg-stone-50/50 dark:bg-stone-800/50">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-0.5 text-[#777D79] hover:text-[#191D1B]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-0.5 text-[#777D79] hover:text-[#191D1B]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-extrabold text-[14px] text-[#191D1B] dark:text-white w-14 text-right">
                  {currency} {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* 4. COUPON & OFFERS SECTION */}
        <section className="bg-[#FFF0D5] dark:bg-[#252018] p-3.5 rounded-2xl border border-[#F3E2C4] dark:border-[#3D3323] space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A6700] uppercase tracking-wide">
            <Tag className="w-3.5 h-3.5" />
            <span>Apply Coupon</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. MP2709"
              className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#181C1A] border border-[#F3E2C4] text-xs font-bold text-[#191D1B] placeholder-[#777D79] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-4 py-1.5 rounded-xl bg-[#064E3B] text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
            >
              Apply
            </button>
          </div>

          {appliedPromo && (
            <div className="flex items-center justify-between text-[11px] text-[#064E3B] font-bold bg-[#EAF3EC] p-2 rounded-xl">
              <span>Applied: {appliedPromo.code}</span>
              <span>-{currency} {appliedPromo.discount.toFixed(2)}</span>
            </div>
          )}

          {promoError && (
            <p className="text-[11px] text-rose-600 font-medium">{promoError}</p>
          )}
        </section>

        {/* 5. CUSTOMER INFORMATION & CHECKOUT FORM */}
        <form onSubmit={handleCheckout} className="space-y-4">
          <div className="bg-white dark:bg-[#181C1A] rounded-2xl border border-[#E9E8E2] dark:border-[#242B27] p-4 space-y-3 shadow-card">
            <h3 className="font-bold text-[14px]">Customer Contact</h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[#777D79] font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3 py-2 rounded-xl border border-[#E9E8E2] focus:outline-none focus:border-[#064E3B]"
                />
              </div>

              <div>
                <label className="block text-[#777D79] font-medium mb-1">Phone Number (for SMS tracking)</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl border border-[#E9E8E2] focus:outline-none focus:border-[#064E3B]"
                />
              </div>

              <div>
                <label className="block text-[#777D79] font-medium mb-1">Email (for e-receipt)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-[#E9E8E2] focus:outline-none focus:border-[#064E3B]"
                />
              </div>

              {/* Payment Mode Selection */}
              <div className="pt-2">
                <label className="block text-[#777D79] font-medium mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      paymentMethod === "online"
                        ? "border-[#064E3B] bg-[#EAF3EC] text-[#064E3B]"
                        : "border-[#E9E8E2] text-[#777D79]"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>UPI / Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      paymentMethod === "cash"
                        ? "border-[#064E3B] bg-[#EAF3EC] text-[#064E3B]"
                        : "border-[#E9E8E2] text-[#777D79]"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Pay at Counter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="pt-3 border-t border-[#E9E8E2] space-y-1.5 text-[12px]">
              <div className="flex justify-between text-[#777D79]">
                <span>Item Subtotal</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#777D79]">
                <span>GST / Taxes (5%)</span>
                <span>{currency} {tax.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#064E3B] font-bold">
                  <span>Discount</span>
                  <span>-{currency} {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between font-extrabold text-[15px] text-[#191D1B] dark:text-white border-t border-[#E9E8E2]">
                <span>Grand Total</span>
                <span>{currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {orderError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {orderError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-[#064E3B] hover:bg-[#043B2C] disabled:opacity-50 text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {submitting ? "Placing Order..." : `Proceed to Pay • ${currency} ${total.toFixed(2)}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}
