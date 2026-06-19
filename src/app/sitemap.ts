import type { MetadataRoute } from "next";

import { listPublishedTempleSitemapEntries } from "@/features/temples/repository";

const baseUrl = "https://hramgo.ru";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const temples = await listPublishedTempleSitemapEntries();
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${baseUrl}/temples`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95
    },
    {
      url: `${baseUrl}/map`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${baseUrl}/legal/support-terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${baseUrl}/legal/payment-and-refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${baseUrl}/legal/contacts`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2
    },
    ...temples.map((temple) => ({
      url: `${baseUrl}/temples/${temple.slug}`,
      lastModified: temple.lastVerifiedAt ? new Date(temple.lastVerifiedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.75
    }))
  ];
}
