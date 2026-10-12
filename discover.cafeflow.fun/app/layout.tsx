import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { CartProvider } from "@/lib/cart-context";
import { BottomNav } from "@/components/bottom-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "CafeFlow Discover — Find Cafes, Reserve Tables, Order Online",
  description: "The complete customer marketplace for artisan cafes, specialty coffee, and dining. Reserve tables with real-time validation, order takeaway or dine-in, and track orders live.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png"
  },
  themeColor: "#e76f3c"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#e76f3c" />
      </head>
      <body className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white pb-20 md:pb-0">
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
