import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { env, shouldUseDemoData } from "@/lib/env";
import { normalizeSearch } from "@/lib/utils";
import { demoTemples } from "@/features/temples/demo-data";
import { getPublicTempleName, getPublicTempleShortName } from "@/features/temples/display";
import { metroLines } from "@/features/temples/metro";
import { moscowDistricts } from "@/features/temples/moscow-districts";
import { filterableParishServiceKinds } from "@/features/temples/parish-services";
import { filterTemplePhotos } from "@/features/temples/photo-quality";
import { sortTransitByWalkMinutes } from "@/features/temples/transit";
import type {
  TempleCardView,
  TempleMapView,
  TempleParishServiceView,
  TempleSearchInput,
  TempleView,
  TransitStationOptionView
} from "@/features/temples/types";

const PUBLIC_TEMPLE_CACHE_TTL_MS = 5 * 60 * 1000;
const templeMemoryCache = new Map<string, { expiresAt: number; value: TempleView[] }>();

function getCachedTempleList(key: string) {
  const cached = templeMemoryCache.get(key);

  if (!cached || cached.expiresAt < Date.now()) {
    templeMemoryCache.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedTempleList(key: string, value: TempleView[]) {
  if (templeMemoryCache.size > 80) {
    templeMemoryCache.clear();
  }

  templeMemoryCache.set(key, { expiresAt: Date.now() + PUBLIC_TEMPLE_CACHE_TTL_MS, value });
}

function normalizeCacheValue(value: unknown) {
  if (Array.isArray(value)) {
    return [...value].filter(Boolean).map(String).sort();
  }

  return value;
}

function getCacheKey(scope: string, input: TempleSearchInput = {}) {
  const entries = Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0))
    .map(([key, value]) => [key, normalizeCacheValue(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  return `${scope}:${JSON.stringify(entries)}`;
}

function filterDemoTemples(input: TempleSearchInput = {}) {
  const normalizedQuery = input.query ? normalizeSearch(input.query) : "";

  let temples = demoTemples.filter((temple) => {
    const haystack = normalizeSearch(
      [
        temple.name,
        temple.shortName,
        temple.address,
        temple.district,
        temple.metro,
        temple.transit.map((item) => `${item.station} ${item.line.name}`).join(" "),
        temple.vicariate,
        temple.deanery,
        temple.description,
        temple.historySummary,
        temple.shrines,
        temple.scheduleSummary,
        temple.scheduleSourceUrl,
        temple.socialLinks.map((item) => `${item.label} ${item.url} ${item.type}`).join(" "),
        temple.parishServices.map((item) => `${item.title} ${item.description}`).join(" "),
        temple.clergy.map((item) => `${item.name} ${item.rank ?? ""} ${item.role} ${item.details ?? ""}`).join(" ")
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (normalizedQuery && !haystack.includes(normalizedQuery)) {
      return false;
    }

    if (input.district?.length && !input.district.includes(temple.district ?? "")) {
      return false;
    }

    if (input.metro?.length && !input.metro.includes(temple.metro ?? "")) {
      return false;
    }

    if (input.metroLine?.length && !temple.transit.some((item) => input.metroLine?.includes(item.line.id))) {
      return false;
    }

    if (input.service?.length && !input.service.every((kind) => temple.parishServices.some((item) => item.kind === kind))) {
      return false;
    }

    if (input.sundaySchool && temple.sundaySchoolStatus !== "YES") {
      return false;
    }

    if (input.hasSchedule && !temple.scheduleSummary) {
      return false;
    }

    if (input.hasWebsite && !temple.websiteUrl) {
      return false;
    }

    if (input.hasPhotos && temple.photos.length === 0) {
      return false;
    }

    if (input.childFriendly && !temple.childFriendly) {
      return false;
    }

    if (input.hasParking && !temple.hasParking) {
      return false;
    }

    return true;
  });

  temples = sortTemples(temples, input.sort, input.query);

  return temples;
}

function sortTemples(temples: TempleView[], sort: TempleSearchInput["sort"] = "relevance", query?: string) {
  const normalizedQuery = query ? normalizeSearch(query) : "";
  const searchTerms = getSearchTerms(query).map((term) => normalizeSearch(term));
  const lineIds = getLineIdsFromSearch(query, searchTerms);

  return [...temples].sort((a, b) => {
    switch (sort) {
      case "alphabet":
        return a.name.localeCompare(b.name, "ru");
      case "sundaySchool":
        return Number(b.sundaySchoolStatus === "YES") - Number(a.sundaySchoolStatus === "YES");
      case "impressions":
        return b.approvedReviewsCount - a.approvedReviewsCount || b.averageHelpfulnessRating - a.averageHelpfulnessRating;
      default:
        if (normalizedQuery) {
          const priorityDiff = getTempleSearchPriority(b, normalizedQuery, searchTerms) - getTempleSearchPriority(a, normalizedQuery, searchTerms);
          const scoreDiff = scoreTempleSearch(b, normalizedQuery, lineIds) - scoreTempleSearch(a, normalizedQuery, lineIds);
          return priorityDiff || scoreDiff || a.name.localeCompare(b.name, "ru");
        }

        return a.name.localeCompare(b.name, "ru");
    }
  });
}

function getTempleSearchPriority(temple: TempleView, query: string, terms: string[]) {
  const name = normalizeSearch(temple.name);
  const shortName = normalizeSearch(temple.shortName ?? "");
  const address = normalizeAddressForSearch(temple.address ?? "");
  const district = normalizeSearch(temple.district ?? "");
  const transitStations = temple.transit.map((item) => normalizeSearch(item.station));
  const nearestTransit = getNearestTempleTransit(temple);
  const nearestStation = nearestTransit ? normalizeSearch(nearestTransit.station) : "";
  const services = temple.parishServices.map((item) => `${normalizeSearch(item.title)} ${normalizeSearch(item.description)}`).join(" ");
  const schedule = normalizeSearch(temple.scheduleSummary ?? "");
  const content = normalizeSearch([temple.description, temple.historySummary, temple.shrines].filter(Boolean).join(" "));
  const clergy = temple.clergy.map((item) => normalizeSearch(`${item.name} ${item.rank ?? ""} ${item.role} ${item.details ?? ""}`)).join(" ");
  const needles = Array.from(new Set([query, ...terms].map((term) => normalizeSearch(term)).filter((term) => term.length >= 3)));
  const exact = (value: string) => needles.some((term) => value === term);
  const starts = (value: string) => needles.some((term) => value.startsWith(term));
  const includes = (value: string) => needles.some((term) => value.includes(term));

  if (nearestStation && exact(nearestStation)) return 90;
  if (transitStations.some(exact)) return 85;
  if (exact(name) || exact(shortName)) return 80;
  if (starts(name) || starts(shortName)) return 70;
  if (includes(name) || includes(shortName)) return 60;
  if (nearestStation && starts(nearestStation)) return 55;
  if (transitStations.some((station) => starts(station) || includes(station))) return 50;
  if (includes(address) || includes(district)) return 40;
  if (includes(services) || includes(schedule)) return 20;
  if (includes(content) || includes(clergy)) return 10;
  return 0;
}

function scoreTempleSearch(temple: TempleView, query: string, lineIds = new Set<string>()) {
  const name = normalizeSearch(temple.name);
  const shortName = normalizeSearch(temple.shortName ?? "");
  const address = normalizeAddressForSearch(temple.address ?? "");
  const district = normalizeSearch(temple.district ?? "");
  const metro = normalizeSearch(temple.metro ?? "");
  const transitStations = temple.transit.map((item) => normalizeSearch(item.station));
  const transit = temple.transit.map((item) => `${normalizeSearch(item.station)} ${normalizeSearch(item.line.name)} ${item.line.system}`).join(" ");
  const services = temple.parishServices.map((item) => `${normalizeSearch(item.title)} ${normalizeSearch(item.description)}`).join(" ");
  const schedule = normalizeSearch(temple.scheduleSummary ?? "");
  const content = normalizeSearch([temple.description, temple.historySummary, temple.shrines].filter(Boolean).join(" "));
  const clergy = temple.clergy.map((item) => normalizeSearch(`${item.name} ${item.rank ?? ""} ${item.role} ${item.details ?? ""}`)).join(" ");
  const terms = getSearchTerms(query);
  const nearestTransit = getNearestTempleTransit(temple);

  let score = 0;
  if (shortName === query || name === query) score += 1200;
  if (transitStations.some((station) => station === query)) score += 900;
  if (shortName.startsWith(query) || name.startsWith(query)) score += 800;
  if (transitStations.some((station) => station.startsWith(query))) score += 650;
  if (shortName.includes(query) || name.includes(query)) score += 500;
  if (address.includes(query)) score += 360;
  if (transit.includes(query) || metro.includes(query)) score += 320;
  if (district.includes(query)) score += 180;
  if (services.includes(query)) score += 90;
  if (schedule.includes(query)) score += 90;
  if (content.includes(query)) score += 80;
  if (clergy.includes(query)) score += 70;
  if (nearestTransit && lineIds.has(nearestTransit.line.id)) score += 460;
  if (lineIds.size > 0 && temple.transit.some((item) => lineIds.has(item.line.id))) score += 210;
  for (const term of terms) {
    const normalizedTerm = normalizeSearch(term);
    if (name.includes(normalizedTerm) || shortName.includes(normalizedTerm)) score += 120;
    if (transitStations.some((station) => station === normalizedTerm)) score += 220;
    if (address.includes(normalizedTerm)) score += 80;
    if (transit.includes(normalizedTerm) || metro.includes(normalizedTerm)) score += 70;
    if (district.includes(normalizedTerm)) score += 50;
    if (schedule.includes(normalizedTerm) || services.includes(normalizedTerm)) score += 35;
    if (content.includes(normalizedTerm) || clergy.includes(normalizedTerm)) score += 25;
  }
  score += Math.min(80, temple.approvedReviewsCount * 5);
  score += temple.averageHelpfulnessRating;
  return score;
}

function getNearestTempleTransit(temple: Pick<TempleView, "transit">) {
  return sortTransitByWalkMinutes(temple.transit)[0] ?? null;
}

export function sanitizeTempleAddress(address?: string | null) {
  const normalized = (address ?? "")
    .replace(/^\s*\d{6},?\s*/u, "")
    .replace(/^\s*\d{1,6},?\s*(г\.?\s*)?Москва,?\s*/iu, "")
    .replace(/^\s*(г\.?\s*)?Москва,?\s*/iu, "")
    .replace(/^\s*(город\s*)?Москва,?\s*/iu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^(Московский\s+)?Кремль\.?$/iu.test(normalized)) {
    return "";
  }

  return normalized;
}

export function toTempleCardDto(temple: TempleView): TempleCardView {
  return {
    id: temple.id,
    slug: temple.slug,
    name: temple.name,
    shortName: temple.shortName,
    address: sanitizeTempleAddress(temple.address),
    averageHelpfulnessRating: temple.averageHelpfulnessRating,
    reviewsCount: temple.reviewsCount,
    approvedReviewsCount: temple.approvedReviewsCount,
    photos: filterTemplePhotos(temple.photos).slice(0, 1),
    transit: sortTransitByWalkMinutes(temple.transit).slice(0, 1)
  };
}

export function toTempleMapDto(temple: TempleView): TempleMapView {
  const mainPhoto = filterTemplePhotos(temple.photos)[0];

  return {
    id: temple.id,
    slug: temple.slug,
    name: temple.name,
    shortName: temple.shortName,
    address: sanitizeTempleAddress(temple.address),
    latitude: temple.latitude,
    longitude: temple.longitude,
    websiteUrl: temple.websiteUrl,
    photoUrl: mainPhoto?.imageUrl ?? null,
    photoAlt: mainPhoto?.alt ?? temple.name,
    transit: sortTransitByWalkMinutes(temple.transit).slice(0, 1)
  };
}

function normalizeAddressForSearch(value: string) {
  return normalizeSearch(value)
    .replace(/\bулица\b/g, "ул")
    .replace(/\bпроспект\b/g, "пр т")
    .replace(/\bпереулок\b/g, "пер")
    .replace(/\bбульвар\b/g, "бул")
    .replace(/\bмосква\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapDbTemple(temple: Awaited<ReturnType<typeof fetchDbTemples>>[number]): TempleView {
  return {
    id: temple.id,
    slug: temple.slug,
    name: getPublicTempleName(temple),
    shortName: getPublicTempleShortName(temple),
    description: temple.description,
    address: temple.address,
    district: temple.district,
    metro: temple.metro,
    transit: sortTransitByWalkMinutes(
      temple.transitStations.map((item) => ({
        station: item.station,
        distanceMeters: item.distanceMeters,
        walkMinutes: item.walkMinutes,
        line: {
          id: item.lineId,
          name: item.lineName,
          color: item.lineColor,
          system: item.system as "metro" | "mcc" | "mcd"
        }
      }))
    ),
    latitude: temple.latitude,
    longitude: temple.longitude,
    websiteUrl: temple.websiteUrl,
    phone: temple.phone,
    email: temple.email,
    rectorName: temple.rectorName,
    vicariate: temple.vicariate,
    deanery: temple.deanery,
    objectType: temple.objectType,
    scheduleSummary: temple.scheduleSummary,
    scheduleSourceUrl: temple.scheduleSourceUrl,
    sundaySchoolStatus: temple.sundaySchoolStatus,
    sundaySchoolDescription: temple.sundaySchoolDescription,
    sundaySchoolSourceUrl: temple.sundaySchoolSourceUrl,
    sundaySchoolConfidence: temple.sundaySchoolConfidence,
    sourcePrimaryUrl: temple.sourcePrimaryUrl,
    dataConfidence: temple.dataConfidence,
    moderationStatus: temple.moderationStatus,
    averageHelpfulnessRating: temple.averageHelpfulnessRating,
    reviewsCount: temple.reviewsCount,
    approvedReviewsCount: temple.approvedReviewsCount,
    lastVerifiedAt: temple.lastVerifiedAt?.toISOString() ?? null,
    photos: filterTemplePhotos(temple.photos).slice(0, 1).map((photo) => ({
      id: photo.id,
      imageUrl: photo.imageUrl,
      alt: photo.alt ?? temple.name,
      isMain: photo.isMain,
      sourceUrl: photo.sourceUrl
    })),
    socialLinks:
      temple.socialLinks.length > 0
        ? temple.socialLinks.map((link) => ({
            label: link.label,
            url: link.url,
            type: link.type as "website" | "vk" | "telegram" | "youtube" | "instagram" | "other"
          }))
        : temple.websiteUrl
          ? [{ label: "Официальный сайт", url: temple.websiteUrl, type: "website" }]
          : [],
    clergy:
      temple.clergy.length > 0
        ? temple.clergy.map((person) => ({
            name: person.name,
            rank: person.rank ?? undefined,
            role: person.role,
            details: person.details ?? undefined
          }))
        : temple.rectorName
          ? [{ name: temple.rectorName, role: "Настоятель" }]
          : [],
    historySummary: temple.historySummary,
    shrines: temple.shrinesSummary,
    parishServices: temple.parishServices.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      kind: item.kind as TempleParishServiceView["kind"],
      sourceUrl: item.sourceUrl
    })),
    reviews: temple.reviews.map((review) => ({
      id: review.id,
      authorName: review.user.name ?? "Посетитель",
      text: review.text,
      rating: review.rating,
      helpfulCount: review.helpfulCount,
      visitType: review.visitType,
      publishedAt: (review.publishedAt ?? review.createdAt).toISOString(),
      tags: review.tags.map((item) => item.tag.name)
    }))
  };
}

function getSearchTerms(query?: string) {
  if (!query) {
    return [];
  }

  const normalized = normalizeAddressForSearch(query);
  const words = normalized
    .split(/\s+/u)
    .filter((word) => word.length >= 3 && !["храм", "церковь", "улица", "метро", "мцд", "москва"].includes(word));
  return Array.from(new Set([query, normalized, ...words.flatMap(expandSearchTerm)])).filter(Boolean).slice(0, 16);
}

function normalizeLineToken(value: string) {
  return normalizeSearch(value).replace(/[^a-zа-я0-9]+/giu, "");
}

function getLineIdsFromSearch(query?: string, terms: string[] = []) {
  const rawTokens = [query, ...terms].filter(Boolean) as string[];
  const tokens = rawTokens.map(normalizeLineToken).filter(Boolean);
  const ids = new Set<string>();

  for (const line of metroLines) {
    const id = normalizeLineToken(line.id);
    const name = normalizeLineToken(line.name);
    const digit = line.id.match(/\d+/u)?.[0];
    const variants = new Set([id, name]);

    if (line.system === "mcd" && digit) {
      variants.add(`мцд${digit}`);
      variants.add(`d${digit}`);
    }

    if (line.system === "mcc") {
      variants.add("мцк");
    }

    for (const token of tokens) {
      if (variants.has(token) || (token.length >= 6 && name.startsWith(token))) {
        ids.add(line.id);
      }
    }
  }

  return ids;
}

function expandSearchTerm(term: string) {
  const normalized = normalizeSearch(term);
  const variants = [normalized];
  const stripped = normalized.replace(/(ого|ему|ыми|ими|ая|яя|ое|ее|ий|ый|ой|ом|ем|ам|ям|ах|ях|ов|ев|ей|ия|иям|ию|ии|ия|ью|а|я|ы|и|е|у|ю|о)$/u, "");

  if (stripped.length >= 4) {
    variants.push(stripped);
  }

  if (normalized.endsWith("ий") && normalized.length > 4) {
    variants.push(`${normalized.slice(0, -2)}ия`);
    variants.push(`${normalized.slice(0, -2)}ий`);
  }

  return variants;
}

function buildTempleWhere(input: TempleSearchInput = {}): Prisma.TempleWhereInput {
  const andFilters: Prisma.TempleWhereInput[] = [];

  if (input.metro?.length) {
    andFilters.push({
      OR: [
        { metro: { in: input.metro } },
        { transitStations: { some: { station: { in: input.metro } } } }
      ]
    });
  }

  if (input.service?.length) {
    andFilters.push(
      ...input.service.map((kind) => ({
        parishServices: { some: { kind } }
      }))
    );
  }

  return {
    moderationStatus: "PUBLISHED",
    NOT: [{ name: { equals: "Храмы Московского Кремля" } }, { slug: { equals: "sprav-916-kremlya-moskovskogo-hramy" } }],
    ...(input.ids?.length ? { id: { in: input.ids } } : {}),
    ...(input.district?.length ? { district: { in: input.district } } : {}),
    ...(input.metroLine?.length ? { transitStations: { some: { lineId: { in: input.metroLine } } } } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
    ...(input.sundaySchool ? { sundaySchoolStatus: "YES" } : {}),
    ...(input.hasSchedule ? { scheduleSummary: { not: null } } : {}),
    ...(input.hasWebsite ? { websiteUrl: { not: null } } : {}),
    ...(input.hasPhotos ? { photos: { some: { OR: [{ isApproved: true }, { isMain: true }] } } } : {})
  };
}

async function fetchDbTemples(input: TempleSearchInput = {}) {
  return prisma.temple.findMany({
    where: buildTempleWhere(input),
    include: {
      photos: {
        where: {
          OR: [{ isApproved: true }, { isMain: true }]
        },
        take: 1,
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }]
      },
      socialLinks: true,
      clergy: true,
      parishServices: true,
      transitStations: {
        orderBy: { walkMinutes: "asc" }
      },
      reviews: {
        where: { status: "APPROVED" },
        include: {
          user: true,
          tags: { include: { tag: true } }
        },
        take: 5,
        orderBy: { helpfulCount: "desc" }
      }
    }
  });
}

export async function listTemples(input: TempleSearchInput = {}) {
  if (shouldUseDemoData) {
    return filterDemoTemples(input);
  }

  const cacheKey = getCacheKey("list", input);
  const cached = getCachedTempleList(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const queryLineIds = Array.from(getLineIdsFromSearch(input.query, getSearchTerms(input.query)));
    const effectiveInput =
      queryLineIds.length > 0
        ? { ...input, metroLine: Array.from(new Set([...(input.metroLine ?? []), ...queryLineIds])) }
        : input;
    const temples = await fetchDbTemples(effectiveInput);
    const mapped = temples.map(mapDbTemple);
    const searched = filterBySearchQuery(mapped, input.query);
    const result = sortTemples(dedupeTemples(filterByNearestTransit(searched, effectiveInput)), input.sort, input.query);
    setCachedTempleList(cacheKey, result);
    return result;
  } catch (error) {
    if (env.USE_DEMO_DATA === "false") {
      throw error;
    }

    return filterDemoTemples(input);
  }
}

export async function listMapTemples(input: TempleSearchInput = {}) {
  if (shouldUseDemoData) {
    return filterDemoTemples(input).filter((temple) => temple.latitude && temple.longitude);
  }

  const cacheKey = getCacheKey("map", input);
  const cached = getCachedTempleList(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const queryLineIds = Array.from(getLineIdsFromSearch(input.query, getSearchTerms(input.query)));
    const effectiveInput =
      queryLineIds.length > 0
        ? { ...input, metroLine: Array.from(new Set([...(input.metroLine ?? []), ...queryLineIds])) }
        : input;
    const temples = await fetchDbMapTemples(effectiveInput);
    const mapped = temples.map(mapDbMapTemple);
    const searched = filterBySearchQuery(mapped, input.query);
    const result = sortTemples(dedupeTemples(filterByNearestTransit(searched, effectiveInput)), input.sort, input.query);
    setCachedTempleList(cacheKey, result);
    return result;
  } catch (error) {
    if (env.USE_DEMO_DATA === "false") {
      throw error;
    }

    return filterDemoTemples(input).filter((temple) => temple.latitude && temple.longitude);
  }
}

export async function listPublishedTempleSitemapEntries() {
  if (shouldUseDemoData) {
    return demoTemples.map((temple) => ({
      slug: temple.slug,
      lastVerifiedAt: temple.lastVerifiedAt ?? null
    }));
  }

  try {
    return prisma.temple.findMany({
      where: { moderationStatus: "PUBLISHED" },
      select: { slug: true, lastVerifiedAt: true, updatedAt: true },
      orderBy: { slug: "asc" }
    });
  } catch (error) {
    if (env.USE_DEMO_DATA === "false") {
      throw error;
    }

    return demoTemples.map((temple) => ({
      slug: temple.slug,
      lastVerifiedAt: temple.lastVerifiedAt ?? null
    }));
  }
}

export async function listTempleFeedEntries(limit = 150) {
  const take = Math.min(Math.max(limit, 1), 150);

  if (shouldUseDemoData) {
    return demoTemples.slice(0, take).map((temple) => ({
      slug: temple.slug,
      name: temple.name,
      shortName: temple.shortName,
      description: temple.description ?? temple.scheduleSummary ?? null,
      address: sanitizeTempleAddress(temple.address),
      updatedAt: temple.lastVerifiedAt ? new Date(temple.lastVerifiedAt) : new Date()
    }));
  }

  try {
    const temples = await prisma.temple.findMany({
      where: { moderationStatus: "PUBLISHED" },
      select: {
        slug: true,
        name: true,
        shortName: true,
        description: true,
        address: true,
        scheduleSummary: true,
        lastVerifiedAt: true,
        updatedAt: true
      },
      orderBy: [{ lastVerifiedAt: "desc" }, { updatedAt: "desc" }],
      take
    });

    return temples.map((temple) => ({
      slug: temple.slug,
      name: temple.name,
      shortName: temple.shortName,
      description: temple.description ?? temple.scheduleSummary ?? null,
      address: sanitizeTempleAddress(temple.address),
      updatedAt: temple.lastVerifiedAt ?? temple.updatedAt
    }));
  } catch (error) {
    if (env.USE_DEMO_DATA === "false") {
      throw error;
    }

    return demoTemples.slice(0, take).map((temple) => ({
      slug: temple.slug,
      name: temple.name,
      shortName: temple.shortName,
      description: temple.description ?? temple.scheduleSummary ?? null,
      address: sanitizeTempleAddress(temple.address),
      updatedAt: temple.lastVerifiedAt ? new Date(temple.lastVerifiedAt) : new Date()
    }));
  }
}

function filterBySearchQuery(temples: TempleView[], query?: string) {
  if (!query) {
    return temples;
  }

  const normalizedQuery = normalizeSearch(query);
  const terms = getSearchTerms(query).map((term) => normalizeSearch(term));
  const lineIds = getLineIdsFromSearch(query, terms);

  if (lineIds.size > 0) {
    return temples;
  }

  return temples.filter((temple) => getTempleSearchPriority(temple, normalizedQuery, terms) > 0 || scoreTempleSearch(temple, normalizedQuery, lineIds) > 0);
}

function filterByNearestTransit(temples: TempleView[], input: TempleSearchInput) {
  const lineIds = new Set([
    ...(input.metroLine ?? []),
    ...Array.from(getLineIdsFromSearch(input.query, getSearchTerms(input.query)))
  ]);

  if (lineIds.size === 0) {
    return temples;
  }

  return temples.filter((temple) => {
    const nearest = getNearestTempleTransit(temple);
    return nearest ? lineIds.has(nearest.line.id) : false;
  });
}

async function fetchDbMapTemples(input: TempleSearchInput = {}) {
  return prisma.temple.findMany({
    where: {
      ...buildTempleWhere(input),
      latitude: { not: null },
      longitude: { not: null }
    },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      description: true,
      address: true,
      district: true,
      metro: true,
      objectType: true,
      latitude: true,
      longitude: true,
      websiteUrl: true,
      scheduleSummary: true,
      sundaySchoolStatus: true,
      dataConfidence: true,
      moderationStatus: true,
      averageHelpfulnessRating: true,
      reviewsCount: true,
      approvedReviewsCount: true,
      historySummary: true,
      shrinesSummary: true,
      lastVerifiedAt: true,
      photos: {
        where: {
          OR: [{ isApproved: true }, { isMain: true }]
        },
        take: 1,
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          imageUrl: true,
          alt: true,
          isMain: true,
          sourceUrl: true
        }
      },
      transitStations: {
        orderBy: { walkMinutes: "asc" },
        select: {
          station: true,
          distanceMeters: true,
          walkMinutes: true,
          lineId: true,
          lineName: true,
          lineColor: true,
          system: true
        }
      },
      parishServices: {
        select: {
          id: true,
          title: true,
          description: true,
          kind: true,
          sourceUrl: true
        }
      },
      clergy: {
        select: {
          name: true,
          rank: true,
          role: true,
          details: true
        }
      }
    }
  });
}

function mapDbMapTemple(temple: Awaited<ReturnType<typeof fetchDbMapTemples>>[number]): TempleView {
  return {
    id: temple.id,
    slug: temple.slug,
    name: getPublicTempleName(temple),
    shortName: getPublicTempleShortName(temple),
    description: temple.description,
    address: temple.address,
    district: temple.district,
    metro: temple.metro,
    transit: sortTransitByWalkMinutes(
      temple.transitStations.map((item) => ({
        station: item.station,
        distanceMeters: item.distanceMeters,
        walkMinutes: item.walkMinutes,
        line: {
          id: item.lineId,
          name: item.lineName,
          color: item.lineColor,
          system: item.system as "metro" | "mcc" | "mcd"
        }
      }))
    ),
    latitude: temple.latitude,
    longitude: temple.longitude,
    websiteUrl: temple.websiteUrl,
    phone: null,
    email: null,
    rectorName: null,
    vicariate: null,
    deanery: null,
    objectType: null,
    scheduleSummary: temple.scheduleSummary,
    scheduleSourceUrl: null,
    sundaySchoolStatus: temple.sundaySchoolStatus,
    sundaySchoolDescription: null,
    sundaySchoolSourceUrl: null,
    sundaySchoolConfidence: null,
    sourcePrimaryUrl: null,
    dataConfidence: temple.dataConfidence,
    moderationStatus: temple.moderationStatus as TempleView["moderationStatus"],
    averageHelpfulnessRating: temple.averageHelpfulnessRating,
    reviewsCount: temple.reviewsCount,
    approvedReviewsCount: temple.approvedReviewsCount,
    lastVerifiedAt: temple.lastVerifiedAt?.toISOString() ?? null,
    photos: filterTemplePhotos(temple.photos).slice(0, 1).map((photo) => ({
      id: photo.id,
      imageUrl: photo.imageUrl,
      alt: photo.alt ?? temple.name,
      isMain: photo.isMain,
      sourceUrl: photo.sourceUrl
    })),
    socialLinks: [],
    clergy: temple.clergy.map((person) => ({
      name: person.name,
      rank: person.rank ?? undefined,
      role: person.role,
      details: person.details ?? undefined
    })),
    historySummary: temple.historySummary,
    shrines: temple.shrinesSummary,
    parishServices: temple.parishServices.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      kind: item.kind as TempleParishServiceView["kind"],
      sourceUrl: item.sourceUrl
    })),
    reviews: []
  };
}

function dedupeTemples(temples: TempleView[]) {
  const result: TempleView[] = [];

  for (const temple of temples) {
    const duplicateIndex = result.findIndex((existing) => areLikelyDuplicateTemples(existing, temple));

    if (duplicateIndex === -1) {
      result.push(temple);
      continue;
    }

    if (getTempleQualityScore(temple) > getTempleQualityScore(result[duplicateIndex])) {
      result[duplicateIndex] = temple;
    }
  }

  return result;
}

function areLikelyDuplicateTemples(left: TempleView, right: TempleView) {
  const leftName = normalizeSearch(left.name);
  const rightName = normalizeSearch(right.name);

  if (leftName !== rightName) {
    return false;
  }

  const leftAddress = normalizeDuplicateAddress(left.address ?? "");
  const rightAddress = normalizeDuplicateAddress(right.address ?? "");
  if (leftAddress && rightAddress && leftAddress === rightAddress) {
    return true;
  }

  if (left.latitude && left.longitude && right.latitude && right.longitude) {
    return estimateDistanceKm(left.latitude, left.longitude, right.latitude, right.longitude) < 0.35;
  }

  return false;
}

function normalizeDuplicateAddress(address: string) {
  return normalizeAddressForSearch(address)
    .replace(/\b(ул|улица|д|дом|стр|строение|корп|корпус|вл|владение)\b/giu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function getTempleQualityScore(temple: TempleView) {
  const nearest = getNearestTempleTransit(temple);
  return (
    temple.photos.length * 80 +
    temple.parishServices.length * 16 +
    temple.clergy.length * 10 +
    Number(Boolean(temple.websiteUrl)) * 30 +
    Number(Boolean(temple.description)) * 18 +
    Number(Boolean(temple.historySummary)) * 18 +
    Number(Boolean(nearest)) * 15 +
    (nearest ? Math.max(0, 20 - nearest.walkMinutes) : 0) +
    temple.dataConfidence * 20
  );
}

export async function getTempleBySlug(slug: string) {
  if (shouldUseDemoData) {
    return demoTemples.find((temple) => temple.slug === slug) ?? null;
  }

  try {
    const temple = await prisma.temple.findFirst({
      where: { slug, moderationStatus: "PUBLISHED" },
      include: {
        photos: {
          where: {
            OR: [{ isApproved: true }, { isMain: true }]
          },
          take: 8,
          orderBy: [{ isMain: "desc" }, { createdAt: "desc" }]
        },
        socialLinks: true,
        clergy: true,
        parishServices: true,
        transitStations: {
          orderBy: { walkMinutes: "asc" }
        },
        reviews: {
          where: { status: "APPROVED" },
          include: {
            user: true,
            tags: { include: { tag: true } }
          },
          orderBy: { helpfulCount: "desc" }
        }
      }
    });

    return temple ? mapDbTemple(temple) : null;
  } catch (error) {
    if (env.USE_DEMO_DATA === "false") {
      throw error;
    }

    return demoTemples.find((temple) => temple.slug === slug) ?? null;
  }
}

export async function listNearbyTemples(input: { latitude?: number; longitude?: number; radiusKm?: number }) {
  const temples = await listTemples({});

  if (!input.latitude || !input.longitude) {
    return temples.slice(0, 5);
  }

  return [...temples]
    .map((temple) => ({
      temple,
      distance: estimateDistanceKm(input.latitude!, input.longitude!, temple.latitude ?? 0, temple.longitude ?? 0)
    }))
    .filter((item) => item.distance <= (input.radiusKm ?? 8))
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.temple);
}

export function getDistricts(temples = demoTemples) {
  return Array.from(new Set([...moscowDistricts, ...temples.map((temple) => temple.district).filter(Boolean)])).sort() as string[];
}

export function getMetros(temples = demoTemples) {
  return Array.from(
    new Set(
      temples
        .flatMap((temple) => [temple.metro, ...temple.transit.map((item) => item.station)])
        .filter(Boolean)
    )
  ).sort() as string[];
}

export function getMetroOptions(temples = demoTemples): TransitStationOptionView[] {
  const stations = new Map<string, TransitStationOptionView>();

  temples.forEach((temple) => {
    sortTransitByWalkMinutes(temple.transit).forEach((item) => {
      const existing = stations.get(item.station);

      if (existing) {
        return;
      }

      stations.set(item.station, {
        name: item.station,
        lineId: item.line.id,
        lineName: item.line.name,
        lineColor: item.line.color,
        system: item.line.system
      });
    });
  });

  return Array.from(stations.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function getMetroLines() {
  return metroLines;
}

export function getParishServiceKinds(temples = demoTemples) {
  const usedKinds = new Set(temples.flatMap((temple) => temple.parishServices.map((item) => item.kind)));

  return filterableParishServiceKinds.filter((kind) => usedKinds.has(kind) || kind === "sundaySchool");
}

function estimateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}
