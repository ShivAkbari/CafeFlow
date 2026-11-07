"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Coffee, ShoppingBag, Calendar, Compass, User } from "lucide-react";

export function Navbar() {
  const { itemCount } = useCart();

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full border-b border-[#DDE3DD] dark:border-white/10 bg-[#F7F5EC]/90 dark:bg-[#001F19]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-[10px] bg-[#002D23] flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <img src="/logos/cafeflow-emblem-white.png" alt="CafeFlow Emblem" className="w-5 h-5 object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <img src="/logos/cafeflow-wordmark-black.png" alt="CafeFlow" className="h-6 w-auto object-contain dark:hidden" />
            <img src="/logos/cafeflow-wordmark-white.png" alt="CafeFlow" className="h-6 w-auto object-contain hidden dark:block" />
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#002D23]/10 text-[#002D23] dark:bg-[#B99A5B]/20 dark:text-[#E2C98D] ml-1">
              Discover
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="flex items-center gap-7">
          <Link
            href="/"
            className="text-sm font-semibold text-[#002D23] dark:text-[#B99A5B] flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            Explore
          </Link>
          <Link
            href="/#offers"
            className="text-sm font-medium text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC] transition-colors"
          >
            Offers
          </Link>
          <Link
            href="/reservations"
            className="text-sm font-medium text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC] transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            Bookings
          </Link>
          <Link
            href="/wallet"
            className="text-sm font-medium text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC] transition-colors"
          >
            Wallet
          </Link>
          <Link
            href="/profile#saved"
            className="text-sm font-medium text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC] transition-colors"
          >
            Saved Spots
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative p-2.5 rounded-[10px] border border-[#DDE3DD] dark:border-white/10 bg-[#FFFEFA] dark:bg-[#002D23] hover:bg-[#F7F5EC] dark:hover:bg-[#00382C] transition-colors flex items-center justify-center shadow-xs"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[#0B1714] dark:text-[#F7F5EC]" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#002D23] dark:bg-[#B99A5B] text-white dark:text-[#001F19] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className="p-2.5 rounded-[10px] border border-[#DDE3DD] dark:border-white/10 bg-[#FFFEFA] dark:bg-[#002D23] hover:bg-[#F7F5EC] dark:hover:bg-[#00382C] transition-colors flex items-center justify-center shadow-xs"
            aria-label="Account Profile"
          >
            <User className="w-5 h-5 text-[#0B1714] dark:text-[#F7F5EC]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
