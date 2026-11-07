"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, ShoppingBag, User, QrCode } from "lucide-react";
import { QRScannerModal } from "@/components/qr-scanner-modal";

export function BottomNav() {
  const pathname = usePathname();
  const [showScanner, setShowScanner] = useState(false);

  // Hide BottomNav on pages that have their own fixed action bar (cart checkout, cafe menu/order bar, and order details)
  const isMarketplaceMainPage = pathname === "/" || pathname === "/search" || pathname === "/orders" || pathname === "/profile" || pathname === "/wallet";
  if (!isMarketplaceMainPage) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-3 left-4 right-4 z-50 md:hidden pointer-events-none safe-area-pb">
        <nav
          aria-label="Mobile Navigation"
          className="pointer-events-auto bg-[#FFFEFA]/95 dark:bg-[#001F19]/95 backdrop-blur-md rounded-2xl border border-[#DDE3DD] dark:border-white/10 px-2 py-1 shadow-[0_4px_24px_rgba(0,31,25,0.12)] max-w-[390px] mx-auto"
        >
          <div className="flex items-center justify-around h-14 relative">
            {/* 1. Home */}
            <Link
              href="/"
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                pathname === "/"
                  ? "text-[#002D23] dark:text-[#B99A5B]"
                  : "text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC]"
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full">
                {pathname === "/" && (
                  <span className="absolute inset-0 rounded-full bg-[#E8F0EB] dark:bg-[#00281F] scale-100 transition-transform" />
                )}
                <Compass
                  className={`w-[18px] h-[18px] relative z-10 transition-transform ${
                    pathname === "/" ? "stroke-[2.2] scale-105" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  pathname === "/" ? "font-bold text-[#002D23] dark:text-[#B99A5B]" : "font-medium"
                }`}
              >
                Home
              </span>
            </Link>

            {/* 2. Search */}
            <Link
              href="/search"
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                pathname === "/search"
                  ? "text-[#002D23] dark:text-[#B99A5B]"
                  : "text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC]"
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full">
                {pathname === "/search" && (
                  <span className="absolute inset-0 rounded-full bg-[#E8F0EB] dark:bg-[#00281F] scale-100 transition-transform" />
                )}
                <Search
                  className={`w-[18px] h-[18px] relative z-10 transition-transform ${
                    pathname === "/search" ? "stroke-[2.2] scale-105" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  pathname === "/search" ? "font-bold text-[#002D23] dark:text-[#B99A5B]" : "font-medium"
                }`}
              >
                Search
              </span>
            </Link>

            {/* 3. CENTER HIGHLIGHTED SCAN QR BUTTON */}
            <div className="flex flex-col items-center justify-center flex-1 relative">
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#002D23] text-[#FFFEFA] shadow-md ring-4 ring-[#F7F5EC] dark:ring-[#001F19] -translate-y-3.5 hover:-translate-y-4 active:scale-95 transition-all cursor-pointer"
                aria-label="Scan Table QR Code"
              >
                <QrCode className="w-5 h-5 transition-transform group-hover:rotate-6 stroke-[2.2]" />
              </button>
              <span className="text-[10px] tracking-tight font-extrabold text-[#002D23] dark:text-[#B99A5B] -mt-2.5">
                Scan QR
              </span>
            </div>

            {/* 4. Orders */}
            <Link
              href="/orders"
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                pathname === "/orders"
                  ? "text-[#002D23] dark:text-[#B99A5B]"
                  : "text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC]"
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full">
                {pathname === "/orders" && (
                  <span className="absolute inset-0 rounded-full bg-[#E8F0EB] dark:bg-[#00281F] scale-100 transition-transform" />
                )}
                <ShoppingBag
                  className={`w-[18px] h-[18px] relative z-10 transition-transform ${
                    pathname === "/orders" ? "stroke-[2.2] scale-105" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  pathname === "/orders" ? "font-bold text-[#002D23] dark:text-[#B99A5B]" : "font-medium"
                }`}
              >
                Orders
              </span>
            </Link>

            {/* 5. Account */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                pathname === "/profile"
                  ? "text-[#002D23] dark:text-[#B99A5B]"
                  : "text-[#64736D] hover:text-[#0B1714] dark:text-[#8F9E98] dark:hover:text-[#F7F5EC]"
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full">
                {pathname === "/profile" && (
                  <span className="absolute inset-0 rounded-full bg-[#E8F0EB] dark:bg-[#00281F] scale-100 transition-transform" />
                )}
                <User
                  className={`w-[18px] h-[18px] relative z-10 transition-transform ${
                    pathname === "/profile" ? "stroke-[2.2] scale-105" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  pathname === "/profile" ? "font-bold text-[#002D23] dark:text-[#B99A5B]" : "font-medium"
                }`}
              >
                Account
              </span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Camera QR Scanner Modal */}
      <QRScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} />
    </>
  );
}
