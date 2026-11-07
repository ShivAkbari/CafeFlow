import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://discover.cafeflow.fun";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cafe/", "/search", "/reservations"],
        disallow: [
          "/api/",
          "/cart",
          "/orders/",
          "/profile",
          "/wallet",
          "/settings",
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Applebot",
          "DuckDuckBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "Claude-SearchBot",
          "Claude-User",
          "ClaudeBot",
          "PerplexityBot",
        ],
        allow: ["/", "/cafe/", "/search", "/reservations"],
        disallow: [
          "/api/",
          "/cart",
          "/orders/",
          "/profile",
          "/wallet",
          "/settings",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

