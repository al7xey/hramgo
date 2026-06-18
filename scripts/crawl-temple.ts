import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEYWORD_PATHS = [
  "/",
  "/raspisanie",
  "/schedule",
  "/bogosluzheniya",
  "/kontakty",
  "/contacts",
  "/history",
  "/istoriya",
  "/duhovenstvo",
  "/voskresnaya-shkola",
  "/molodezh",
  "/social",
  "/sitemap.xml"
];

const LINK_KEYWORDS = [
  "распис",
  "богослуж",
  "контакт",
  "истор",
  "духов",
  "настоятель",
  "клир",
  "воскрес",
  "школ",
  "молод",
  "социал",
  "служен",
  "приход",
  "палом",
  "хор",
  "лавк",
  "фото"
];

type CrawlOptions = {
  limit?: number;
  pagesPerTemple: number;
  delayMs: number;
};

type CrawlSnapshot = {
  hash: string;
  title: string | null;
  text: string;
  links: string[];
  images: string[];
  phones: string[];
  emails: string[];
};

type RobotsRules = {
  allow: string[];
  disallow: string[];
};

const robotsCache = new Map<string, Promise<RobotsRules>>();

function parseArgs(): CrawlOptions {
  const args = new Map<string, string | boolean>();

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split("=", 2);
      args.set(key, value);
    } else if (arg.startsWith("--")) {
      args.set(arg.slice(2), true);
    }
  }

  return {
    limit: args.has("limit") ? Number(args.get("limit")) : undefined,
    pagesPerTemple: args.has("pages") ? Number(args.get("pages")) : 8,
    delayMs: args.has("delay") ? Number(args.get("delay")) : 450
  };
}

function normalizeUrl(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function sameHost(left: string, right: string) {
  try {
    return new URL(left).hostname.replace(/^www\./u, "") === new URL(right).hostname.replace(/^www\./u, "");
  } catch {
    return false;
  }
}

function getOrigin(url: string) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname}`;
}

function parseRobots(text: string): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let current: { agents: string[]; allow: string[]; disallow: string[] } | null = null;

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*/u, "").trim();
    if (!line.includes(":")) continue;

    const [rawKey, ...rawValue] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join(":").trim();

    if (key === "user-agent") {
      if (!current || current.allow.length > 0 || current.disallow.length > 0) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && key === "allow") {
      current.allow.push(value);
    } else if (current && key === "disallow") {
      current.disallow.push(value);
    }
  }

  return groups
    .filter((group) => group.agents.some((agent) => agent === "*" || agent.includes("hramgobot")))
    .reduce<RobotsRules>(
      (rules, group) => ({
        allow: [...rules.allow, ...group.allow.filter(Boolean)],
        disallow: [...rules.disallow, ...group.disallow.filter(Boolean)]
      }),
      { allow: [], disallow: [] }
    );
}

async function loadRobots(url: string) {
  const origin = getOrigin(url);
  if (!robotsCache.has(origin)) {
    robotsCache.set(
      origin,
      fetch(`${origin}/robots.txt`, {
        headers: { "user-agent": "HramGoBot/1.0 (+https://hramgo.ru)" },
        signal: AbortSignal.timeout(6_000)
      })
        .then((response) => (response.ok ? response.text() : ""))
        .then(parseRobots)
        .catch(() => ({ allow: [], disallow: [] }))
    );
  }

  return robotsCache.get(origin)!;
}

function robotsPatternToRegExp(pattern: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*");
  return new RegExp(`^${escaped.replace(/\$$/u, "$")}`, "u");
}

function matchesRule(path: string, rule: string) {
  if (!rule) return false;
  return robotsPatternToRegExp(rule).test(path);
}

async function canCrawl(url: string) {
  const rules = await loadRobots(url);
  const path = `${new URL(url).pathname}${new URL(url).search}`;
  const allow = rules.allow.filter((rule) => matchesRule(path, rule)).sort((a, b) => b.length - a.length)[0];
  const disallow = rules.disallow.filter((rule) => matchesRule(path, rule)).sort((a, b) => b.length - a.length)[0];

  if (!disallow) return true;
  return Boolean(allow && allow.length >= disallow.length);
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

function stripHtml(html: string) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/giu, " ")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|tr|section|article)>/giu, "\n");

  return decodeEntities(withoutNoise.replace(/<[^>]+>/g, " "))
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 120_000);
}

function extractTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1];
  return title ? stripHtml(title).slice(0, 240) : null;
}

function absolutize(value: string, baseUrl: string) {
  try {
    return new URL(decodeEntities(value), baseUrl).toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string) {
  const links = new Set<string>();
  const hrefPattern = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu;

  for (const match of html.matchAll(hrefPattern)) {
    const url = absolutize(match[1], baseUrl);
    const label = stripHtml(match[2]).toLowerCase();

    if (!url || !sameHost(url, baseUrl)) continue;
    const lowered = decodeURIComponent(url).toLowerCase();
    if (LINK_KEYWORDS.some((keyword) => lowered.includes(keyword) || label.includes(keyword))) {
      links.add(url);
    }
  }

  return Array.from(links);
}

function extractImages(html: string, baseUrl: string) {
  const images = new Set<string>();
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/iu)?.[1];
  if (ogImage) {
    const url = absolutize(ogImage, baseUrl);
    if (url) images.add(url);
  }

  for (const match of html.matchAll(/<img\b[^>]*?(?:src|data-src)=["']([^"']+)["'][^>]*>/giu)) {
    const url = absolutize(match[1], baseUrl);
    if (!url || !sameHost(url, baseUrl)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/iu.test(url)) continue;
    if (/logo|icon|sprite|captcha|counter|banner/iu.test(url)) continue;
    images.add(url);
  }

  return Array.from(images).slice(0, 12);
}

function extractPhones(text: string) {
  return Array.from(new Set(text.match(/(?:\+7|8)\s*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/gu) ?? [])).slice(0, 5);
}

function extractEmails(text: string) {
  return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu) ?? [])).slice(0, 5);
}

async function fetchPage(url: string): Promise<CrawlSnapshot | null> {
  if (!(await canCrawl(url))) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "HramGoBot/1.0 (+https://hramgo.ru)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5"
      }
    });

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!/html|xml|text/iu.test(contentType)) return null;

    const raw = (await response.text()).slice(0, 1_500_000);
    const text = stripHtml(raw);
    const hash = createHash("sha256").update(raw).digest("hex");

    return {
      hash,
      title: extractTitle(raw),
      text,
      links: extractLinks(raw, url),
      images: extractImages(raw, url),
      phones: extractPhones(text),
      emails: extractEmails(text)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function candidateUrls(baseUrl: string, knownUrls: string[]) {
  const urls = new Set<string>();
  const base = normalizeUrl(baseUrl);
  if (!base) return [];

  for (const url of [base, ...knownUrls]) {
    const normalized = normalizeUrl(url);
    if (normalized && sameHost(normalized, base)) {
      urls.add(normalized);
    }
  }

  for (const path of KEYWORD_PATHS) {
    urls.add(new URL(path, base).toString());
  }

  return Array.from(urls);
}

async function upsertSource(templeId: string, url: string, snapshot: CrawlSnapshot, sourceType: string) {
  const existing = await prisma.templeSource.findFirst({ where: { templeId, url } });
  const data = {
    sourceType,
    rawTitle: snapshot.title,
    rawText: snapshot.text,
    extractedJson: {
      hash: snapshot.hash,
      links: snapshot.links,
      images: snapshot.images,
      phones: snapshot.phones,
      emails: snapshot.emails
    } as Prisma.InputJsonValue,
    confidence: sourceType === "official_site" ? 0.82 : 0.62,
    crawledAt: new Date()
  };

  if (existing) {
    await prisma.templeSource.update({ where: { id: existing.id }, data });
    return "updated";
  }

  await prisma.templeSource.create({ data: { templeId, url, ...data } });
  return "created";
}

async function main() {
  const options = parseArgs();
  const job = await prisma.importJob.create({
    data: { type: "crawl:temple", status: "RUNNING", startedAt: new Date(), stats: { options } as Prisma.InputJsonValue }
  });
  const temples = await prisma.temple.findMany({
    where: {
      moderationStatus: "PUBLISHED",
      OR: [{ websiteUrl: { not: null } }, { sourcePrimaryUrl: { not: null } }, { sources: { some: {} } }]
    },
    include: { sources: true },
    orderBy: [{ lastCrawledAt: "asc" }, { name: "asc" }],
    take: options.limit
  });

  let fetched = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const temple of temples) {
    const baseUrl = normalizeUrl(temple.websiteUrl ?? temple.sourcePrimaryUrl);
    if (!baseUrl) {
      failed += 1;
      continue;
    }

    const queue = candidateUrls(baseUrl, temple.sources.map((source) => source.url));
    const seen = new Set<string>();
    let pagesForTemple = 0;

    for (const url of queue) {
      if (pagesForTemple >= options.pagesPerTemple || seen.has(url)) continue;
      seen.add(url);

      const snapshot = await fetchPage(url);
      await delay(options.delayMs);

      if (!snapshot || snapshot.text.length < 80) {
        failed += 1;
        continue;
      }

      fetched += 1;
      pagesForTemple += 1;
      const result = await upsertSource(temple.id, url, snapshot, sameHost(url, temple.websiteUrl ?? "") ? "official_site" : "source_page");
      if (result === "created") created += 1;
      else updated += 1;

      for (const link of snapshot.links) {
        if (pagesForTemple + queue.length < 200 && sameHost(link, baseUrl)) {
          queue.push(link);
        }
      }
    }

    await prisma.temple.update({ where: { id: temple.id }, data: { lastCrawledAt: new Date() } });
    console.log(`Crawled ${pagesForTemple}/${options.pagesPerTemple}: ${temple.name}`);
  }

  const stats = { temples: temples.length, fetched, created, updated, failed };
  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: "COMPLETED", finishedAt: new Date(), stats: stats as Prisma.InputJsonValue }
  });
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.importJob.create({
      data: {
        type: "crawl:temple",
        status: "FAILED",
        error: error instanceof Error ? error.stack ?? error.message : String(error),
        finishedAt: new Date()
      }
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
