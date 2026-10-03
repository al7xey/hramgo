import type { MetadataRoute } from "next";
export const dynamic='force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/representative", "/api", "/login", "/profile", "/favorites"]
    },
    sitemap: "https://hramgo.ru/sitemap.xml",
    host: "hramgo.ru"
  };
}
