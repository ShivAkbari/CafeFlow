"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Coffee, ShoppingBag, Calendar, Compass, User } from "lucide-react";

export function Navbar() {
  const { itemCount } = useCart();

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full border-b border-[#E9E8E2] dark:border-[#242B27] bg-[#FAF8F4]/90 dark:bg-[#111413]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-[#064E3B] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Coffee className="w-5 h-5 text-[#86EFAC]" />
          </div>
          <div className="flex items-baseline">
            <span className="font-extrabold text-[18px] tracking-tight text-[#191D1B] dark:text-white">
              CafeFlow
            </span>
            <span className="text-[12px] font-medium text-[#777D79] dark:text-stone-400 ml-1.5">
              Discover
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="flex items-center gap-7">
          <Link
            href="/"
            className="text-sm font-semibold text-[#064E3B] dark:text-[#34D399] flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            Explore
          </Link>
          <Link
            href="/#offers"
            className="text-sm font-medium text-[#777D79] hover:text-[#191D1B] dark:text-stone-300 dark:hover:text-white transition-colors"
          >
            Offers
          </Link>
          <Link
            href="/reservations"
            className="text-sm font-medium text-[#777D79] hover:text-[#191D1B] dark:text-stone-300 dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            Bookings
          </Link>
          <Link
            href="/profile#saved"
            className="text-sm font-medium text-[#777D79] hover:text-[#191D1B] dark:text-stone-300 dark:hover:text-white transition-colors"
          >
            Saved Spots
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative p-2.5 rounded-xl border border-[#E9E8E2] dark:border-[#242B27] bg-white dark:bg-[#181C1A] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center shadow-subtle"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[#191D1B] dark:text-stone-300" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#064E3B] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className="p-2.5 rounded-xl border border-[#E9E8E2] dark:border-[#242B27] bg-white dark:bg-[#181C1A] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center shadow-subtle"
            aria-label="Account Profile"
          >
            <User className="w-5 h-5 text-[#191D1B] dark:text-stone-300" />
          </Link>
        </div>
      </div>
    </header>
  );
}
