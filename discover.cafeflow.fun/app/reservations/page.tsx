"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  CalendarCheck
} from "lucide-react";
import { GoogleAuthModal, ContinueWithGoogleButton } from "@/components/google-login-modal";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  confirmed: {
    label: "Confirmed",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2
  },
  held: {
    label: "Hold (10m)",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock
  },
  arrived: {
    label: "Guest Arrived",
    bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60",
    text: "text-blue-700 dark:text-blue-400",
    icon: CheckCircle2
  },
  seated: {
    label: "Seated",
    bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60",
    text: "text-purple-700 dark:text-purple-400",
    icon: CheckCircle2
  },
  completed: {
    label: "Completed",
    bg: "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800",
    text: "text-stone-600 dark:text-stone-400",
    icon: CheckCircle2
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60",
    text: "text-rose-700 dark:text-rose-400",
    icon: XCircle
  },
  no_show: {
    label: "No Show",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60",
    text: "text-rose-700 dark:text-rose-400",
    icon: AlertCircle
  }
};

export default function UserReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchReservations = (queryPhone?: string, isBackground = false) => {
    if (!isBackground) setLoading(true);
    const searchVal = queryPhone !== undefined ? queryPhone : phone;
    const url = searchVal ? `/api/reservations?phone=${encodeURIComponent(searchVal)}` : "/api/reservations";

    fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
    })
      .then((res) => res.json())
      .then((data) => {
        setReservations(data.reservations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // Check if user is signed in
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (data.user.phone) setPhone(data.user.phone);
        }
      })
      .catch(() => {});

    fetchReservations(undefined, false);

    // Sync polling every 5 seconds
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      fetchReservations(undefined, true);
    }, 5000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchReservations(undefined, true);
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [phone]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReservations(phone);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredReservations = reservations.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "upcoming") {
      return (
        r.reservation_date > todayStr ||
        (r.reservation_date === todayStr && !["completed", "cancelled", "no_show"].includes(r.status))
      );
    }
    if (statusFilter === "past") {
      return (
        r.reservation_date < todayStr ||
        ["completed", "cancelled", "no_show"].includes(r.status)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <main className="max-w-[430px] md:max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-28 md:pb-12 space-y-4">
        {/* Top App Header */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#0B1714] dark:text-white shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[16px] leading-tight text-[#0B1714] dark:text-white">
              My Table Bookings
            </h1>
            <p className="text-[11px] text-[#73716B]">
              Your cafe reservations &amp; confirmed seats
            </p>
          </div>
          <button
            onClick={() => fetchReservations(phone)}
            aria-label="Refresh bookings"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] flex items-center justify-center text-[#0B1714] dark:text-white shadow-xs shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#002D23] dark:text-[#34D399] ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </header>

        {/* Search by Phone Lookup */}
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD] dark:border-[#002D23] px-3.5 py-1.5 shadow-xs focus-within:border-[#002D23] transition-colors">
            <Search className="w-4 h-4 text-[#73716B] shrink-0 mr-2" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Find by mobile number..."
              className="w-full bg-transparent text-[12px] text-[#0B1714] dark:text-white placeholder-[#73716B] focus:outline-none"
            />
            {phone && (
              <button
                type="submit"
                className="px-3 py-1 rounded-full bg-[#002D23] text-white text-[11px] font-bold shrink-0 hover:bg-[#001F19] transition-colors"
              >
                Find
              </button>
            )}
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Bookings" },
            { id: "upcoming", label: "Upcoming & Today" },
            { id: "past", label: "Past Bookings" }
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-tight transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#002D23] text-white shadow-xs"
                    : "bg-white dark:bg-[#002D23] text-[#73716B] border border-[#DDE3DD] dark:border-[#002D23] hover:border-stone-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-[20px] bg-stone-200/70 dark:bg-stone-800/70 animate-pulse border border-[#E9E8E2]/60 dark:border-[#242B27]"
              />
            ))}
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#002D23] rounded-[24px] border border-[#DDE3DD] dark:border-[#002D23] p-8 space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-[#002D23] dark:text-[#34D399]">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0B1714] dark:text-white">
                No reservations found
              </h3>
              <p className="text-xs text-[#73716B] max-w-xs mx-auto mt-1">
                {!user && !phone
                  ? "Sign in with Google or enter your mobile number above to view your confirmed bookings."
                  : "You don't have any bookings matching this view. Explore cafes and book your table instantly!"}
              </p>
            </div>

            {!user && (
              <div className="pt-2 flex justify-center">
                <ContinueWithGoogleButton
                  onClick={() => setShowAuthModal(true)}
                  label="Sign In to View Bookings"
                />
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#002D23] text-white text-[12px] font-bold hover:bg-[#001F19] transition-colors"
              >
                <span>Browse Cafes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {filteredReservations.map((res) => {
              const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.confirmed;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={res.id}
                  className="bg-white dark:bg-[#002D23] rounded-[22px] border border-[#DDE3DD] dark:border-[#002D23] p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#002D23] dark:text-[#34D399] shrink-0" />
                        <h3 className="font-extrabold text-[15px] text-[#0B1714] dark:text-white truncate">
                          {res.cafe_name || "Partner Cafe"}
                        </h3>
                      </div>
                      {res.cafe_address && (
                        <p className="text-[11px] text-[#73716B] truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{res.cafe_address}</span>
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#FAF7F2] dark:bg-[#12221B] rounded-xl p-2.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#0B1714] dark:text-stone-200">
                      <Calendar className="w-3.5 h-3.5 text-[#002D23] dark:text-[#34D399] shrink-0" />
                      <span className="font-bold">{res.reservation_date}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#0B1714] dark:text-stone-200">
                      <Clock className="w-3.5 h-3.5 text-[#002D23] dark:text-[#34D399] shrink-0" />
                      <span className="font-bold">{res.reservation_time}</span>
                      <span className="text-[#73716B] text-[10px]">({res.duration_minutes || 90}m)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#0B1714] dark:text-stone-200 col-span-2 sm:col-span-1">
                      <Users className="w-3.5 h-3.5 text-[#002D23] dark:text-[#34D399] shrink-0" />
                      <span className="font-bold">{res.party_size} Guests</span>
                    </div>
                  </div>

                  {/* Guest Info & Reference */}
                  <div className="flex items-center justify-between text-[11px] text-[#73716B] pt-1 border-t border-[#F2ECE1] dark:border-[#002D23]">
                    <span className="font-medium">
                      Booked for <strong className="text-[#0B1714] dark:text-white">{res.customer_name}</strong>
                    </span>
                    <span className="font-mono text-[10px] text-stone-500">
                      Ref #{res.id.slice(-6)}
                    </span>
                  </div>

                  {/* Actions */}
                  {res.cafe_slug && (
                    <div className="pt-1 flex justify-end">
                      <Link
                        href={`/cafe/${res.cafe_slug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#002D23] dark:text-[#34D399] hover:underline"
                      >
                        <span>View Cafe Menu &amp; Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          fetchReservations(undefined, false);
        }}
      />
    </div>
  );
}
