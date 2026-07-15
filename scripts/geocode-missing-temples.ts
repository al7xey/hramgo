import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const endpoint = "https://nominatim.openstreetmap.org/search";
const delayMs = Number(process.env.NOMINATIM_DELAY_MS ?? 1100);
const userAgent = process.env.NOMINATIM_USER_AGENT ?? "HramGo data validation (https://hramgo.ru)";

type GeocodeResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

function parseArgs() {
  const limitIndex = process.argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : undefined;

  return {
    apply: process.argv.includes("--apply"),
    limit: Number.isFinite(limit) && limit! > 0 ? limit : undefined
  };
}

function isWithinMoscow(lat: number, lon: number) {
  return lat >= 55.15 && lat <= 56.05 && lon >= 36.65 && lon <= 37.95;
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeAddressForGeocoding(address: string) {
  return address
    .replace(/^Русская Православная Церковь\s*[—-]\s*/iu, "")
    .replace(/\b\d{6}\b\s*,?\s*/gu, "")
    .replace(/(?:^|[\s,])г\.?\s*Москва\s*,?\s*/giu, " ")
    .replace(/(?:^|[\s,])(?:ул|улица)\.?\s*/giu, " ")
    .replace(/(?:^|[\s,])(?:д|дом)\.?\s*/giu, " ")
    .replace(/(?:^|[\s,])(?:корп|корпус)\.?\s*/giu, " ")
    .replace(/(?:^|[\s,])(?:стр|строение)\.?\s*/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasAddressMatch(address: string, displayName?: string) {
  if (!displayName) {
    return false;
  }

  const ignored = new Set(["москва", "россия", "проспект", "шоссе", "переулок", "площадь", "набережная", "улица"]);
  const tokens = normalizeText(address)
    .split(" ")
    .filter((token) => token.length >= 4 && !ignored.has(token));
  const display = normalizeText(displayName);

  return tokens.length === 0 || tokens.some((token) => display.includes(token));
}

function isMoscowCandidate(displayName?: string) {
  return Boolean(displayName && normalizeText(displayName).includes("москва"));
}

function wait() {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function lookup(address: string) {
  const normalizedAddress = normalizeAddressForGeocoding(address);
  if (!normalizedAddress) {
    return null;
  }

  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
    countrycodes: "ru",
    q: `${normalizedAddress}, Москва, Россия`
  }).toString();

  const response = await fetch(url, { headers: { "user-agent": userAgent } });
  await wait();

  if (!response.ok) {
    return null;
  }

  const [candidate] = (await response.json()) as GeocodeResult[];
  const latitude = Number(candidate?.lat);
  const longitude = Number(candidate?.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !isWithinMoscow(latitude, longitude) ||
    !isMoscowCandidate(candidate?.display_name) ||
    !hasAddressMatch(normalizedAddress, candidate?.display_name)
  ) {
    return null;
  }

  return { latitude, longitude, sourceUrl: url.toString(), quote: candidate.display_name ?? address };
}

async function main() {
  const options = parseArgs();
  const temples = await prisma.temple.findMany({
    where: {
      moderationStatus: "PUBLISHED",
      OR: [{ latitude: null }, { longitude: null }]
    },
    orderBy: { name: "asc" },
    take: options.limit,
    select: { id: true, name: true, address: true }
  });

  const stats = { scanned: temples.length, matched: 0, updated: 0, skipped: 0, errors: 0 };
  const sample: Array<{ name: string; address: string; latitude: number; longitude: number }> = [];

  for (const temple of temples) {
    if (!temple.address) {
      stats.skipped += 1;
      continue;
    }

    try {
      const result = await lookup(temple.address);
      if (!result) {
        stats.skipped += 1;
        continue;
      }

      stats.matched += 1;
      sample.push({ name: temple.name, address: temple.address, latitude: result.latitude, longitude: result.longitude });

      if (!options.apply) {
        continue;
      }

      await prisma.$transaction([
        prisma.temple.update({
          where: { id: temple.id },
          data: { latitude: result.latitude, longitude: result.longitude }
        }),
        prisma.templeFieldEvidence.deleteMany({
          where: { templeId: temple.id, fieldName: "coordinates", sourceUrl: { startsWith: endpoint } }
        }),
        prisma.templeFieldEvidence.create({
          data: {
            templeId: temple.id,
            fieldName: "coordinates",
            value: `${result.latitude}, ${result.longitude}`,
            sourceUrl: result.sourceUrl,
            quote: result.quote,
            confidence: 0.7,
            lastCheckedAt: new Date()
          }
        })
      ]);
      stats.updated += 1;
    } catch {
      stats.errors += 1;
    }
  }

  console.log(JSON.stringify({ apply: options.apply, stats, sample: sample.slice(0, 30) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
