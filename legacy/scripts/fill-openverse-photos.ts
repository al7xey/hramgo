import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAX_PHOTOS_PER_TEMPLE = Number(process.env.TEMPLE_OPENVERSE_PHOTO_LIMIT ?? 8);
const REQUEST_DELAY_MS = Number(process.env.TEMPLE_OPENVERSE_DELAY_MS ?? 120);
const PAGE_SIZE = Number(process.env.TEMPLE_OPENVERSE_PAGE_SIZE ?? 8);

type TempleForPhotos = {
  id: string;
  name: string;
  shortName: string | null;
  address: string | null;
  district: string | null;
  photos: Array<{ imageUrl: string; sourceUrl: string | null; isMain: boolean }>;
};

type OpenverseImage = {
  id?: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  foreign_landing_url?: string;
  license?: string;
  license_version?: string;
  creator?: string;
  width?: number;
  height?: number;
  tags?: Array<{ name?: string }>;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to import Openverse temple photos.");
  }

  const limitArg = getNumberArg("--limit");
  const onlyMissing = process.argv.includes("--missing-only");
  const replaceMain = process.argv.includes("--replace-main");

  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED" },
    orderBy: { name: "asc" },
    take: limitArg,
    select: {
      id: true,
      name: true,
      shortName: true,
      address: true,
      district: true,
      photos: {
        select: { imageUrl: true, sourceUrl: true, isMain: true },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  const stats = {
    scanned: 0,
    skippedWithEnoughPhotos: 0,
    photosAdded: 0,
    mainReplaced: 0,
    withoutNewPhoto: [] as string[]
  };

  for (const temple of temples) {
    stats.scanned += 1;
    if (stats.scanned % 25 === 0) {
      console.error(`openverse photo progress: ${stats.scanned}/${temples.length}, added=${stats.photosAdded}`);
    }

    const existingCount = temple.photos.length;
    if (onlyMissing && existingCount > 0) {
      stats.skippedWithEnoughPhotos += 1;
      continue;
    }

    if (existingCount >= MAX_PHOTOS_PER_TEMPLE) {
      stats.skippedWithEnoughPhotos += 1;
      continue;
    }

    const added = await fillTemplePhotos(temple, MAX_PHOTOS_PER_TEMPLE - existingCount, replaceMain && existingCount > 0);
    stats.photosAdded += added.photosAdded;
    stats.mainReplaced += Number(added.mainReplaced);

    if (added.photosAdded === 0) {
      stats.withoutNewPhoto.push(`${temple.name} — ${temple.address ?? "адрес не указан"}`);
    }
  }

  console.log(JSON.stringify(stats, null, 2));
}

async function fillTemplePhotos(temple: TempleForPhotos, need: number, replaceMain: boolean) {
  const existing = new Set(temple.photos.flatMap((photo) => [photo.imageUrl, photo.sourceUrl].filter(Boolean) as string[]));
  const candidates = await findTempleImages(temple);
  let photosAdded = 0;
  let mainReplaced = false;

  for (const image of candidates) {
    if (photosAdded >= need) break;
    const imageUrl = image.url ?? image.thumbnail;
    const sourceUrl = image.foreign_landing_url;
    if (!imageUrl || !sourceUrl) continue;
    if (existing.has(imageUrl) || existing.has(sourceUrl)) continue;

    if (replaceMain && !mainReplaced) {
      await prisma.templePhoto.updateMany({ where: { templeId: temple.id }, data: { isMain: false } });
      mainReplaced = true;
    }

    await prisma.templePhoto.create({
      data: {
        templeId: temple.id,
        imageUrl,
        sourceUrl,
        alt: `${temple.shortName ?? temple.name}: фотография здания`,
        copyrightStatus: "OPEN_LICENSE",
        moderationStatus: "APPROVED",
        isApproved: true,
        isMain: (replaceMain && photosAdded === 0) || (temple.photos.length === 0 && photosAdded === 0)
      }
    });

    existing.add(imageUrl);
    existing.add(sourceUrl);
    photosAdded += 1;
  }

  return { photosAdded, mainReplaced };
}

async function findTempleImages(temple: TempleForPhotos) {
  const seen = new Map<string, OpenverseImage>();

  for (const query of buildQueries(temple)) {
    if (seen.size >= MAX_PHOTOS_PER_TEMPLE) break;
    const images = await searchOpenverse(query);
    for (const image of images) {
      if (seen.size >= MAX_PHOTOS_PER_TEMPLE) break;
      const key = image.foreign_landing_url ?? image.url ?? image.thumbnail;
      if (!key) continue;
      if (!isRelevantTempleImage(temple, image)) continue;
      seen.set(key, image);
    }
  }

  return [...seen.values()].slice(0, MAX_PHOTOS_PER_TEMPLE);
}

function buildQueries(temple: TempleForPhotos) {
  const name = temple.name.trim();
  const shortName = temple.shortName?.trim();
  const street = extractStreet(temple.address);
  return [
    `${name} Москва`,
    shortName && shortName !== name ? `${shortName} Москва` : null,
    street ? `${name} ${street} Москва` : null,
    temple.district ? `${name} ${temple.district} Москва` : null
  ].filter(Boolean) as string[];
}

async function searchOpenverse(query: string) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.search = new URLSearchParams({
    q: query,
    page_size: String(PAGE_SIZE),
    mature: "false"
  }).toString();

  const data = await fetchJson(url);
  await delay(REQUEST_DELAY_MS);
  return ((data?.results ?? []) as OpenverseImage[]).filter(Boolean);
}

function isRelevantTempleImage(temple: TempleForPhotos, image: OpenverseImage) {
  const imageUrl = image.url ?? image.thumbnail ?? "";
  const sourceUrl = image.foreign_landing_url ?? "";
  const text = safeDecode(
    [
      image.title,
      image.creator,
      image.license,
      image.license_version,
      imageUrl,
      sourceUrl,
      ...(image.tags ?? []).map((tag) => tag.name)
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();

  if (!imageUrl || !sourceUrl) return false;
  if (!/^https?:\/\//iu.test(imageUrl)) return false;
  if (!/\.(jpe?g|png|webp)(\?|$)/iu.test(imageUrl)) return false;
  if (Number(image.width ?? 0) > 0 && Number(image.width) < 520) return false;
  if (Number(image.height ?? 0) > 0 && Number(image.height) < 360) return false;
  if (Number(image.width ?? 0) > 0 && Number(image.height ?? 0) > 0) {
    const ratio = Number(image.width) / Number(image.height);
    if (ratio > 3 || ratio < 1 / 3) return false;
  }
  if (isBadImageText(text)) return false;

  const nameWords = meaningfulWords(temple.name);
  const hasStrongNameMatch = nameWords.some((word) => text.includes(word));
  const hasTempleHint = /(храм|церк|собор|монаст|church|cathedral|monastery|temple|moscow|москва)/iu.test(text);

  return hasStrongNameMatch && hasTempleHint;
}

function meaningfulWords(value: string) {
  return safeDecode(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 5)
    .filter((word) => !/^(храма?|церк(?:овь|ви)?|собор|монастырь|москв[аы]?|святого|святой|пресвятой|богородицы)$/iu.test(word));
}

function extractStreet(address?: string | null) {
  if (!address) return null;
  return address
    .replace(/\b(г\.?\s*)?москва\b/giu, "")
    .split(",")
    .map((part) => part.trim())
    .find((part) => /(ул\.|улица|пер\.|переулок|просп\.|проспект|наб\.|набережная|шоссе|проезд|площадь)/iu.test(part));
}

function isBadImageText(text: string) {
  return /(qr|logo|icon|sprite|captcha|counter|banner|poster|afisha|promo|schedule|calendar|docs?|scan|receipt|oferta|avatar|person|face|portrait|priest|duhoven|klir|nastoyatel|ornament|pattern|ikona|iconostasis|map|plan|schema|coat|emblem|plate|engraving|drawing|donbass|novoross|gumanitarn|volunteer|telegram|whatsapp|vk\.com|191[0-9]|190[0-9]|18[0-9]{2}|расписан|афиш|плакат|баннер|икон|образ|священ|духовен|клирик|настоятель)/iu.test(
    text
  );
}

async function fetchJson(url: URL) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "HramGo photo search bot/1.0 (https://hramgo.ru)" }
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function getNumberArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const raw = process.argv[index + 1];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
