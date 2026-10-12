"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  ChevronRight,
  Store,
  RefreshCw,
  UtensilsCrossed
} from "lucide-react";

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  const fetchOrders = (queryPhone?: string) => {
    setLoading(true);
    const searchVal = queryPhone !== undefined ? queryPhone : phone;
    const url = searchVal ? `/api/orders?phone=${encodeURIComponent(searchVal)}` : "/api/orders";
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    fetchOrders(phone);
  };

  // Filter orders by active vs completed
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return ["pending", "confirmed", "preparing", "ready"].includes(order.status);
    }
    if (statusFilter === "completed") {
      return ["completed", "delivered", "cancelled"].includes(order.status);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-4">
        
        {/* Top App Header */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[16px] leading-tight">Your Orders</h1>
            <p className="text-[11px] text-[#777D79]">Track live meals & order receipts</p>
          </div>
          <button
            onClick={() => fetchOrders(phone)}
            aria-label="Refresh orders"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#064E3B] dark:text-[#34D399] ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        {/* Search by Phone Lookup */}
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center bg-white dark:bg-[#181C1A] rounded-full border border-[#E9E8E2] dark:border-[#242B27] px-3.5 py-1.5 shadow-subtle focus-within:border-[#064E3B] transition-colors">
            <Search className="w-4 h-4 text-[#777D79] shrink-0 mr-2" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Find by mobile number..."
              className="w-full bg-transparent text-[12px] text-[#191D1B] dark:text-white placeholder-[#777D79] focus:outline-none"
            />
            {phone && (
              <button
                type="submit"
                className="px-3 py-1 rounded-full bg-[#064E3B] text-white text-[11px] font-bold shrink-0 hover:bg-[#043B2C] transition-colors"
              >
                Find
              </button>
            )}
          </div>
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Orders" },
            { id: "active", label: "Active & Cooking" },
            { id: "completed", label: "Past Receipts" }
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-tight transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#064E3B] text-white shadow-xs"
                    : "bg-white dark:bg-[#181C1A] text-[#777D79] border border-[#E9E8E2] dark:border-[#242B27] hover:border-stone-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Orders Content */}
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-[20px] bg-stone-200/70 dark:bg-stone-800/70 animate-pulse border border-[#E9E8E2]/60 dark:border-[#242B27]"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#181C1A] rounded-[24px] border border-[#E9E8E2] dark:border-[#242B27] p-8 space-y-3 shadow-subtle">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F4] dark:bg-[#111413] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center mx-auto text-[#777D79]">
              <ShoppingBag className="w-6 h-6 text-[#064E3B] dark:text-[#34D399]" />
            </div>
            <h3 className="font-extrabold text-[15px] text-[#191D1B] dark:text-white">
              {searched ? "No orders for this number" : "No orders found"}
            </h3>
            <p className="text-[12px] text-[#777D79] max-w-xs mx-auto">
              {searched
                ? "Try searching with the phone number entered at checkout."
                : "Explore top cafes and order fresh coffee, brunch, and artisan treats."}
            </p>
            <Link
              href="/"
              className="inline-block mt-2 px-5 py-2.5 rounded-full bg-[#064E3B] text-white font-bold text-[12px] shadow-sm hover:bg-[#043B2C] transition-colors"
            >
              Explore Cafes
            </Link>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {filteredOrders.map((order) => {
              const isLive = ["pending", "confirmed", "preparing", "ready"].includes(order.status);
              const itemsCount = order.items?.length || 0;
              const dateStr = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "Recent";

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.publicOrderRef || order.id}`}
                  className="group block p-4 rounded-[20px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] hover:border-[#064E3B]/40 dark:hover:border-[#34D399]/40 hover:shadow-subtle transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-[#EAF3EC] dark:bg-[#064E3B]/20 flex items-center justify-center text-[#064E3B] dark:text-[#34D399] shrink-0 mt-0.5 border border-[#E9E8E2]/60 dark:border-[#242B27]">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-[14px] text-[#191D1B] dark:text-white leading-snug">
                            {order.cafeName}
                          </h4>
                        </div>
                        <p className="text-[11px] font-mono text-[#777D79] mt-0.5">
                          {order.orderNumber || order.publicOrderRef} • {dateStr}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase shrink-0 ${
                        order.status === "completed" || order.status === "delivered"
                          ? "bg-[#EAF3EC] text-[#064E3B] dark:bg-[#064E3B]/30 dark:text-[#34D399]"
                          : isLive
                          ? "bg-[#FFF0D5] text-[#9A6B00] animate-pulse"
                          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Order items preview line */}
                  <div className="mt-3 pt-3 border-t border-[#E9E8E2]/60 dark:border-[#242B27] flex items-center justify-between text-[12px]">
                    <div className="text-[#777D79] truncate max-w-[220px]">
                      {itemsCount > 0 ? (
                        <span>
                          {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
                        </span>
                      ) : (
                        <span>Order details</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-extrabold text-[13px] text-[#191D1B] dark:text-white shrink-0">
                      <span>{order.currency || "₹"} {Number(order.total || 0).toFixed(2)}</span>
                      <ChevronRight className="w-4 h-4 text-[#777D79] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
