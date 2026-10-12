"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Tag, Calendar, Heart, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Explore", href: "/", icon: Compass },
    { label: "Offers", href: "/#offers", icon: Tag },
    { label: "Bookings", href: "/reservations", icon: Calendar },
    { label: "Saved", href: "/profile#saved", icon: Heart },
    { label: "Profile", href: "/profile", icon: User }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#FAF8F4]/95 dark:bg-[#181C1A]/95 backdrop-blur-md border-t border-[#E9E8E2] dark:border-[#242B27] px-4 py-1.5 safe-area-pb"
    >
      <div className="flex items-center justify-around h-13 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/" && pathname === "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
                isActive
                  ? "text-[#064E3B] dark:text-[#34D399]"
                  : "text-[#777D79] hover:text-[#191D1B] dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <span className="absolute -inset-1.5 rounded-full bg-[#EAF3EC] dark:bg-[#064E3B]/30 scale-100" />
                )}
                <Icon
                  className={`w-[20px] h-[20px] ${
                    isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  isActive ? "font-bold text-[#064E3B] dark:text-[#34D399]" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
