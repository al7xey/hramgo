import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAX_PHOTOS_PER_TEMPLE = Number(process.env.TEMPLE_COMMONS_PHOTO_LIMIT ?? 8);
const REQUEST_DELAY_MS = Number(process.env.TEMPLE_COMMONS_DELAY_MS ?? 40);
const MAX_TITLES_PER_QUERY = Number(process.env.TEMPLE_COMMONS_TITLES_PER_QUERY ?? 8);

type CommonsImage = {
  imageUrl: string;
  sourceUrl: string;
  title: string;
};

type TempleForPhotos = {
  id: string;
  name: string;
  shortName: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: Array<{ imageUrl: string; sourceUrl: string | null; isMain: boolean }>;
};

async function main() {
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
      latitude: true,
      longitude: true,
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
      console.error(`photo search progress: ${stats.scanned}/${temples.length}, added=${stats.photosAdded}`);
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
    if (existing.has(image.imageUrl) || existing.has(image.sourceUrl)) continue;

    if (replaceMain && !mainReplaced) {
      await prisma.templePhoto.updateMany({ where: { templeId: temple.id }, data: { isMain: false } });
      mainReplaced = true;
    }

    await prisma.templePhoto.create({
      data: {
        templeId: temple.id,
        imageUrl: image.imageUrl,
        sourceUrl: image.sourceUrl,
        alt: `${temple.shortName ?? temple.name}: фотография здания`,
        copyrightStatus: "OPEN_LICENSE",
        moderationStatus: "APPROVED",
        isApproved: true,
        isMain: (replaceMain && photosAdded === 0) || temple.photos.length === 0 && photosAdded === 0
      }
    });

    existing.add(image.imageUrl);
    existing.add(image.sourceUrl);
    photosAdded += 1;
  }

  return { photosAdded, mainReplaced };
}

async function findTempleImages(temple: TempleForPhotos) {
  const seen = new Map<string, CommonsImage>();
  const queries = buildQueries(temple);

  for (const query of queries) {
    if (seen.size >= MAX_PHOTOS_PER_TEMPLE) break;
    for (const title of (await searchCommonsFiles(query)).slice(0, MAX_TITLES_PER_QUERY)) {
      if (seen.size >= MAX_PHOTOS_PER_TEMPLE) break;
      const image = await getCommonsImage(title);
      if (image) seen.set(image.sourceUrl, image);
    }
  }

  return [...seen.values()].slice(0, MAX_PHOTOS_PER_TEMPLE);
}

function buildQueries(temple: TempleForPhotos) {
  return [`${temple.name} Москва`];
}

async function searchCommonsFiles(query: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    list: "search",
    srnamespace: "6",
    srlimit: "8",
    srsearch: query,
    origin: "*"
  }).toString();

  const data = await fetchJson(url);
  await delay(REQUEST_DELAY_MS);
  return (data?.query?.search ?? []).map((item: { title: string }) => item.title).filter(Boolean);
}

async function getCommonsImage(title: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    titles: title,
    iiprop: "url|mime|size",
    origin: "*"
  }).toString();

  const data = await fetchJson(url);
  await delay(REQUEST_DELAY_MS);
  const page = Object.values(data?.query?.pages ?? {})[0] as
    | { title?: string; imageinfo?: Array<{ url: string; mime: string; width: number; height: number }> }
    | undefined;
  const image = page?.imageinfo?.[0];

  if (!page?.title || !image?.url || !image.mime?.startsWith("image/")) return null;
  if (!/\.(jpe?g|png|webp)$/iu.test(image.url)) return null;
  if (image.width < 520 || image.height < 360) return null;
  if (image.width / image.height > 3 || image.height / image.width > 3) return null;

  const text = safeDecode(`${page.title} ${image.url}`).toLowerCase();
  if (isBadImageText(text)) return null;

  return {
    title: page.title,
    imageUrl: image.url,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`
  };
}

function isBadImageText(text: string) {
  return /(qr|logo|icon|sprite|captcha|counter|banner|poster|afisha|promo|schedule|calendar|docs?|scan|receipt|oferta|avatar|person|face|portrait|priest|duhoven|klir|nastoyatel|ornament|pattern|ikona|iconostasis|map|plan|schema|coat|emblem|plate|engraving|drawing|donbass|novoross|gumanitarn|volunteer|telegram|whatsapp|vk\.com|191[0-9]|190[0-9]|18[0-9]{2})/iu.test(text);
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
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
