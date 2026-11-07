import React from "react";
import type { Metadata } from "next";
import { d1Query } from "@/lib/db";
import CafeDetailClient from "./cafe-detail-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCafeDetails(slug: string) {
  try {
    const rows = await d1Query<any>(
      `SELECT id, name, slug, address, logo, currency, food_category FROM cafes WHERE slug = ? LIMIT 1`,
      [slug]
    );
    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (e) {
    console.warn("Could not query cafe details for SSR metadata:", e);
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const cafe = await getCafeDetails(slug);

  const name = cafe?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const address = cafe?.address || "Artisan Cafe";
  const title = `${name} — Menu, Online Ordering & Table Booking`;
  const description = `Order online, view the digital menu, and reserve tables at ${name} in ${address}. Live order tracking powered by CafeFlow.`;
  const canonicalUrl = `https://discover.cafeflow.fun/cafe/${encodeURIComponent(slug)}`;
  const ogImage = cafe?.logo || "https://cafeflow.fun/og-image.png";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: "CafeFlow Discover",
      images: [
        {
          url: ogImage,
          width: 800,
          height: 600,
          alt: `${name} on CafeFlow Discover`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CafeDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const cafe = await getCafeDetails(slug);

  const name = cafe?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const address = cafe?.address || "";
  const foodCategory = cafe?.food_category || "Cafe & Dining";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name,
    url: `https://discover.cafeflow.fun/cafe/${encodeURIComponent(slug)}`,
    image: cafe?.logo || "https://cafeflow.fun/og-image.png",
    address: address ? {
      "@type": "PostalAddress",
      streetAddress: address,
    } : undefined,
    servesCuisine: foodCategory,
    acceptsReservations: "True",
    priceRange: "$$",
    provider: {
      "@type": "Organization",
      name: "CafeFlow",
      url: "https://cafeflow.fun",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Semantic server-rendered content for search crawlers */}
      <div className="sr-only" aria-hidden="true">
        <h1>{name} — Menu, Online Ordering &amp; Table Reservations</h1>
        <p>{address}</p>
        <p>{foodCategory}</p>
        <p>Order online, book tables, and browse specialty dishes powered by CafeFlow Discover.</p>
      </div>

      <CafeDetailClient slug={slug} />
    </>
  );
}
