"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, CheckCircle, ArrowRight } from "lucide-react";

export default function ReservationsOverviewPage() {
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cafes")
      .then((res) => res.json())
      .then((data) => {
        setCafes(data.cafes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Book a Table with Real-Time Seating
        </h1>
        <p className="text-xs md:text-sm text-stone-500">
          Choose a partner cafe to check live table availability, select timeslots, and reserve instantly.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cafes.map((cafe) => (
            <div
              key={cafe.id}
              className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-500/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">{cafe.name}</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Live Booking
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1 line-clamp-1">{cafe.address}</p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 text-xs">
                <span className="text-stone-500 font-medium">90 min table sessions</span>
                <Link
                  href={`/cafe/${cafe.slug}`}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold inline-flex items-center gap-1 shadow-sm"
                >
                  Select Time & Book <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
