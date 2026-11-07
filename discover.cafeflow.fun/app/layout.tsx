import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Navbar } from "@/components/navbar";
import { CartProvider } from "@/lib/cart-context";
import Script from "next/script";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationPromptModal } from "@/components/notification-prompt-modal";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://discover.cafeflow.fun"),
  title: {
    default: "CafeFlow Discover — Find Cafes, Reserve Tables & Order Online",
    template: "%s | CafeFlow Discover",
  },
  description:
    "The complete customer marketplace for artisan cafes, specialty coffee, and dining. Reserve tables with real-time validation, browse digital menus, order takeaway or dine-in, and track orders live.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://discover.cafeflow.fun",
    siteName: "CafeFlow Discover",
    title: "CafeFlow Discover — Find Artisan Cafes, Reserve Tables & Order Online",
    description:
      "The complete customer marketplace for artisan cafes, specialty coffee, and dining. Reserve tables with real-time validation, browse digital menus, and order online.",
    images: [
      {
        url: "https://cafeflow.fun/og-image.png",
        width: 1200,
        height: 630,
        alt: "CafeFlow Discover – Artisan Cafe Marketplace & Digital Ordering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CafeFlow Discover — Find Artisan Cafes, Reserve Tables & Order Online",
    description:
      "The complete customer marketplace for artisan cafes, specialty coffee, and dining.",
    images: ["https://cafeflow.fun/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#064E3B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://discover.cafeflow.fun/#website",
        url: "https://discover.cafeflow.fun",
        name: "CafeFlow Discover",
        description:
          "Find artisan cafes, reserve tables in real-time, view digital menus, and place dine-in and takeaway orders.",
        publisher: {
          "@type": "Organization",
          "@id": "https://cafeflow.fun/#organization",
          name: "CafeFlow",
          url: "https://cafeflow.fun",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://cafeflow.fun/#organization",
        name: "CafeFlow",
        url: "https://cafeflow.fun",
        logo: "https://cafeflow.fun/icon-512.png",
      },
    ],
  };

  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#064E3B" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6] flex flex-col font-sans antialiased selection:bg-[#064E3B] selection:text-white pb-20 md:pb-0">
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>

          {/* Cross-Domain Footer linking to CafeFlow POS */}
          <footer className="hidden md:block py-6 border-t border-[#E9E3D9] dark:border-white/10 bg-[#F4EFE6] dark:bg-[#0E1B16] text-xs text-[#73716B] dark:text-stone-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                © {new Date().getFullYear()} CafeFlow Discover. Connecting diners with artisan cafes.
              </div>
              <div className="flex items-center gap-2">
                <span>Are you a cafe owner?</span>
                <a
                  href="https://cafeflow.fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#002D23] dark:text-emerald-400 font-bold hover:underline"
                >
                  Run your cafe on CafeFlow POS (₹0/mo forever) →
                </a>
              </div>
            </div>
          </footer>

          <BottomNav />
          <NotificationPromptModal />
        </CartProvider>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
