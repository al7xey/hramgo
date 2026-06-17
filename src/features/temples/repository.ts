import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { env, shouldUseDemoData } from "@/lib/env";
import { normalizeSearch } from "@/lib/utils";
import { demoTemples } from "@/features/temples/demo-data";
import { metroLines } from "@/features/temples/metro";
import { moscowDistricts } from "@/features/temples/moscow-districts";
import { filterableParishServiceKinds } from "@/features/temples/parish-services";
import { sortTransitByWalkMinutes } from "@/features/temples/transit";
import type { TempleParishServiceView, TempleSearchInput, TempleView, TransitStationOptionView } from "@/features/temples/types";

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
        temple.parishServices.map((item) => `${item.title} ${item.description}`).join(" "),
        temple.clergy.map((item) => `${item.name} ${item.role}`).join(" ")
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
          return scoreTempleSearch(b, normalizedQuery) - scoreTempleSearch(a, normalizedQuery);
        }

        return a.name.localeCompare(b.name, "ru");
    }
  });
}

function scoreTempleSearch(temple: TempleView, query: string) {
  const name = normalizeSearch(temple.name);
  const shortName = normalizeSearch(temple.shortName ?? "");
  const address = normalizeAddressForSearch(temple.address ?? "");
  const district = normalizeSearch(temple.district ?? "");
  const metro = normalizeSearch(temple.metro ?? "");
  const transit = temple.transit.map((item) => `${normalizeSearch(item.station)} ${normalizeSearch(item.line.name)} ${item.line.system}`).join(" ");
  const services = temple.parishServices.map((item) => `${normalizeSearch(item.title)} ${normalizeSearch(item.description)}`).join(" ");
  const terms = getSearchTerms(query);

  let score = 0;
  if (shortName === query || name === query) score += 1200;
  if (shortName.startsWith(query) || name.startsWith(query)) score += 800;
  if (shortName.includes(query) || name.includes(query)) score += 500;
  if (address.includes(query)) score += 360;
  if (transit.includes(query) || metro.includes(query)) score += 320;
  if (district.includes(query)) score += 180;
  if (services.includes(query)) score += 90;
  for (const term of terms) {
    if (name.includes(term) || shortName.includes(term)) score += 120;
    if (address.includes(term)) score += 80;
    if (transit.includes(term) || metro.includes(term)) score += 70;
    if (district.includes(term)) score += 50;
  }
  score += Math.min(80, temple.approvedReviewsCount * 5);
  score += temple.averageHelpfulnessRating;
  return score;
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
    name: temple.name,
    shortName: temple.shortName,
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
    photos: temple.photos.map((photo) => ({
      id: photo.id,
      imageUrl: photo.imageUrl,
      alt: photo.alt ?? temple.name,
      isMain: photo.isMain
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

function buildSearchWhere(query: string, terms: string[]): Prisma.TempleWhereInput {
  const phraseFilters = searchFieldFilters(query);
  const wordTerms = terms.filter((term) => normalizeSearch(term) !== normalizeSearch(query));
  const wordFilter =
    wordTerms.length > 1
      ? {
          AND: wordTerms.map((term) => ({
            OR: searchFieldFilters(term)
          }))
        }
      : undefined;

  if (wordFilter) {
    return { OR: [{ OR: phraseFilters }, wordFilter] };
  }

  return { OR: phraseFilters };
}

function searchFieldFilters(term: string): Prisma.TempleWhereInput[] {
  const filter = { contains: term, mode: "insensitive" as const };

  return [
    { name: filter },
    { shortName: filter },
    { address: filter },
    { district: filter },
    { metro: filter },
    { vicariate: filter },
    { deanery: filter },
    { description: filter },
    { objectType: filter },
    { affiliation: filter },
    { transitStations: { some: { station: filter } } },
    { transitStations: { some: { lineName: filter } } },
    { clergy: { some: { name: filter } } },
    { clergy: { some: { role: filter } } },
    { parishServices: { some: { title: filter } } },
    { parishServices: { some: { description: filter } } }
  ];
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

async function fetchDbTemples(input: TempleSearchInput = {}) {
  const queryTerms = getSearchTerms(input.query);
  const queryFilter = input.query ? buildSearchWhere(input.query, queryTerms) : undefined;
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

  return prisma.temple.findMany({
    where: {
      moderationStatus: "PUBLISHED",
      ...(input.ids?.length ? { id: { in: input.ids } } : {}),
      ...(queryFilter ? queryFilter : {}),
      ...(input.district?.length ? { district: { in: input.district } } : {}),
      ...(input.metroLine?.length ? { transitStations: { some: { lineId: { in: input.metroLine } } } } : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
      ...(input.sundaySchool ? { sundaySchoolStatus: "YES" } : {}),
      ...(input.hasSchedule ? { scheduleSummary: { not: null } } : {}),
      ...(input.hasWebsite ? { websiteUrl: { not: null } } : {}),
      ...(input.hasPhotos ? { photos: { some: { OR: [{ isApproved: true }, { isMain: true }] } } } : {}),
    },
    include: {
      photos: {
        where: {
          OR: [{ isApproved: true }, { isMain: true }]
        },
        take: 4,
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

  try {
    const temples = await fetchDbTemples(input);
    return sortTemples(temples.map(mapDbTemple), input.sort, input.query);
  } catch (error) {
    if (env.USE_DEMO_DATA === "false") {
      throw error;
    }

    return filterDemoTemples(input);
  }
}

export async function getTempleBySlug(slug: string) {
  if (shouldUseDemoData) {
    return demoTemples.find((temple) => temple.slug === slug) ?? null;
  }

  try {
    const temple = await prisma.temple.findUnique({
      where: { slug },
      include: {
        photos: {
          where: {
            OR: [{ isApproved: true }, { isMain: true }]
          },
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
