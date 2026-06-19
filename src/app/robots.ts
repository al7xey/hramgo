import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/representative", "/api", "/login"]
    },
    sitemap: "https://hramgo.ru/sitemap.xml",
    host: "hramgo.ru"
  };
}
