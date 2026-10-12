"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Store,
  Receipt,
  Phone,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check
} from "lucide-react";

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderRef = resolvedParams.id;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = (isManual = false) => {
    if (isManual) setRefreshing(true);
    fetch(`/api/orders?ref=${orderRef}&id=${orderRef}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        setLoading(false);
        if (isManual) setTimeout(() => setRefreshing(false), 400);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        if (isManual) setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => fetchOrder(false), 6000); // 6s live polling
    return () => clearInterval(interval);
  }, [orderRef]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
        <main className="max-w-[430px] md:max-w-xl mx-auto px-4 py-16 space-y-4">
          <div className="h-8 w-24 bg-stone-200 dark:bg-stone-800 rounded-full animate-pulse" />
          <div className="h-44 rounded-[22px] bg-stone-200/70 dark:bg-stone-800/70 animate-pulse border border-[#E9E8E2]/60" />
          <div className="h-56 rounded-[22px] bg-stone-200/70 dark:bg-stone-800/70 animate-pulse border border-[#E9E8E2]/60" />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
        <main className="max-w-md mx-auto text-center py-20 px-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-[17px] font-bold text-[#191D1B] dark:text-white">Order Not Found</h2>
          <p className="text-[#777D79] text-[12px]">We could not locate this order reference in our database.</p>
          <Link
            href="/"
            className="inline-block mt-2 px-5 py-2.5 rounded-full bg-[#064E3B] text-white font-bold text-xs shadow-sm hover:bg-[#043B2C] transition-colors"
          >
            Return to Discover
          </Link>
        </main>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "Received", desc: "Sent directly to kitchen" },
    { key: "confirmed", label: "Accepted", desc: "Cafe confirmed your items" },
    { key: "preparing", label: "Cooking & Brewing", desc: "Barista & chef are preparing" },
    { key: "ready", label: "Ready", desc: "Ready for pickup or table service" },
    { key: "completed", label: "Served", desc: "Enjoy your meal!" }
  ];

  const currentIdx = steps.findIndex((s) => s.key === order.status);
  const activeStep = currentIdx === -1 ? 0 : currentIdx;
  const isFinished = order.status === "completed" || order.status === "delivered";

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-4">
        
        {/* Header */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[15px] leading-tight">Order Tracking</h1>
            <p className="text-[11px] font-mono text-[#777D79]">{order.orderNumber || order.publicOrderRef}</p>
          </div>
          <button
            onClick={() => fetchOrder(true)}
            aria-label="Refresh status"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#064E3B] dark:text-[#34D399] ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </header>

        {/* Cafe Identity Banner */}
        <section className="p-4 rounded-[22px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#EAF3EC] dark:bg-[#064E3B]/20 flex items-center justify-center text-[#064E3B] dark:text-[#34D399] shrink-0 border border-[#E9E8E2]/60 dark:border-[#242B27]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-[14px] text-[#191D1B] dark:text-white leading-tight">
                {order.cafeName}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-[#777D79] mt-0.5">
                <span className="capitalize">{order.orderType || "Takeaway"}</span>
                {order.tableId && <span>• Table {order.tableId}</span>}
              </div>
            </div>
          </div>

          <Link
            href={`/cafe/${order.cafeSlug || ""}`}
            className="px-3 py-1.5 rounded-full bg-[#EAF3EC] dark:bg-[#064E3B]/20 text-[#064E3B] dark:text-[#34D399] text-[11px] font-bold hover:bg-[#d8ebd9] transition-colors"
          >
            View Menu
          </Link>
        </section>

        {/* Live Stepper Status */}
        <section className="p-5 rounded-[22px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#064E3B] animate-ping" />
              <span className="text-[12px] font-extrabold text-[#191D1B] dark:text-white tracking-tight">
                Live Status
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${
                isFinished
                  ? "bg-[#EAF3EC] text-[#064E3B] dark:bg-[#064E3B]/30 dark:text-[#34D399]"
                  : "bg-[#FFF0D5] text-[#9A6B00]"
              }`}
            >
              {order.status}
            </span>
          </div>

          {/* Stepper Vertical Track */}
          <div className="relative pl-6 space-y-5 ml-1 border-l-2 border-[#E9E8E2] dark:border-[#242B27]">
            {steps.map((step, idx) => {
              const isDone = idx <= activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div key={step.key} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone
                        ? "bg-[#064E3B] border-[#064E3B] text-white"
                        : "bg-white dark:bg-[#181C1A] border-[#E9E8E2] dark:border-[#242B27] text-transparent"
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <h3
                      className={`text-[13px] leading-snug ${
                        isCurrent
                          ? "font-extrabold text-[#064E3B] dark:text-[#34D399]"
                          : isDone
                          ? "font-bold text-[#191D1B] dark:text-white"
                          : "font-medium text-[#777D79]"
                      }`}
                    >
                      {step.label}
                    </h3>
                    <p className="text-[11px] text-[#777D79]">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Receipt Breakdown Card */}
        <section className="p-5 rounded-[22px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9E8E2]/60 dark:border-[#242B27]">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#191D1B] dark:text-white">
              <Receipt className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#34D399]" />
              <span>Receipt Breakdown</span>
            </div>
            <span className="text-[11px] font-mono text-[#777D79]">
              {order.publicOrderRef}
            </span>
          </div>

          <div className="divide-y divide-[#E9E8E2]/60 dark:divide-[#242B27] text-[12px]">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-[#191D1B] dark:text-white">
                    {item.quantity}x {item.name}
                  </div>
                  {item.selectedVariant && (
                    <div className="text-[10px] text-[#777D79]">Size: {item.selectedVariant.name}</div>
                  )}
                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                    <div className="text-[10px] text-[#777D79]">
                      Add-ons: {item.selectedAddons.map((a: any) => a.name).join(", ")}
                    </div>
                  )}
                </div>
                <div className="font-bold text-[#191D1B] dark:text-white shrink-0">
                  {order.currency || "₹"} {(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing calculations */}
          <div className="pt-2 border-t border-[#E9E8E2]/60 dark:border-[#242B27] space-y-1.5 text-[12px]">
            <div className="flex justify-between text-[#777D79]">
              <span>Subtotal</span>
              <span>{order.currency || "₹"} {Number(order.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-[#064E3B] dark:text-[#34D399] font-medium">
                <span>Discount</span>
                <span>-{order.currency || "₹"} {Number(order.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#777D79]">
              <span>Taxes & GST</span>
              <span>{order.currency || "₹"} {Number(order.tax || 0).toFixed(2)}</span>
            </div>
            {Number(order.deliveryFee) > 0 && (
              <div className="flex justify-between text-[#777D79]">
                <span>Packaging / Delivery</span>
                <span>{order.currency || "₹"} {Number(order.deliveryFee).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#E9E8E2] dark:border-[#242B27] flex justify-between text-[14px] font-black text-[#191D1B] dark:text-white">
              <span>Total Amount</span>
              <span className="text-[#064E3B] dark:text-[#34D399]">
                {order.currency || "₹"} {Number(order.total || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Status Bar */}
          <div className="mt-3 p-3 rounded-[14px] bg-[#FAF8F4] dark:bg-[#111413] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-between text-[11px]">
            <span className="text-[#777D79]">
              Paid via <strong className="text-[#191D1B] dark:text-white uppercase">{order.paymentMethod}</strong>
            </span>
            <span
              className={`font-bold capitalize ${
                order.paymentStatus === "paid" || order.paymentStatus === "completed"
                  ? "text-[#064E3B] dark:text-[#34D399]"
                  : "text-[#9A6B00]"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </section>

        {/* Customer Assistance & Reorder action */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/orders"
            className="flex-1 py-3 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] font-bold text-[12px] text-center text-[#191D1B] dark:text-white shadow-subtle hover:bg-stone-50 transition-colors"
          >
            All Orders
          </Link>
          <Link
            href={`/cafe/${order.cafeSlug || ""}`}
            className="flex-1 py-3 rounded-full bg-[#064E3B] hover:bg-[#043B2C] text-white font-bold text-[12px] text-center shadow-sm transition-colors"
          >
            Order More
          </Link>
        </div>

      </main>
    </div>
  );
}
