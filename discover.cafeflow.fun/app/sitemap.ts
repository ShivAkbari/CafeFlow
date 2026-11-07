import { MetadataRoute } from "next";
import { d1Query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://discover.cafeflow.fun";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/reservations`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  let cafeRoutes: MetadataRoute.Sitemap = [];
  try {
    const rawCafes = await d1Query<any>(
      `SELECT slug, updated_at FROM cafes WHERE status NOT IN ('disabled', 'deleted', 'suspended')`
    );
    const validCafes = (rawCafes || []).filter(
      (c) => c?.slug && !c.slug.startsWith("__")
    );

    cafeRoutes = validCafes.map((c) => ({
      url: `${baseUrl}/cafe/${encodeURIComponent(c.slug)}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    }));
  } catch (err) {
    console.warn("Could not dynamically query cafes for Discover sitemap:", err);
  }

  return [...staticRoutes, ...cafeRoutes];
}

