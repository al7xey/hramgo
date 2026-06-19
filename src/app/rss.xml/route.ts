import { listTempleFeedEntries } from "@/features/temples/repository";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const siteUrl = "https://hramgo.ru";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const temples = await listTempleFeedEntries(150);
  const now = new Date().toUTCString();

  const items = temples
    .map((temple) => {
      const title = temple.shortName ?? temple.name;
      const link = `${siteUrl}/temples/${temple.slug}`;
      const description = [
        temple.description,
        temple.address ? `Адрес: ${temple.address}.` : null,
        "HramGo помогает найти православные храмы Москвы: расписания богослужений, контакты, метро, МЦД и карту."
      ]
        .filter(Boolean)
        .join(" ");

      return [
        "    <item>",
        `      <title>${escapeXml(title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <description>${escapeXml(description)}</description>`,
        `      <pubDate>${new Date(temple.updatedAt).toUTCString()}</pubDate>`,
        "    </item>"
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HramGo — поиск храмов Москвы</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Свежие обновления каталога православных храмов Москвы: адреса, расписания, метро, МЦД, контакты и карта.</description>
    <language>ru</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
