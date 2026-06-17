import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

import { metroLines } from "../src/features/temples/metro";

const prisma = new PrismaClient();
const METRO_DATA_URL = "https://raw.githubusercontent.com/morphey83/MetroAndDistrict/master/metro.msk.json";
const LOCAL_METRO_DATA = new URL("./data/metro.msk.json", import.meta.url);

type MetroLineSource = {
  name: string;
  hex_color: string;
  stations: {
    name: string;
    lat: number;
    lng: number;
    status?: string;
  }[];
};

function parseArgs() {
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
    limit: args.has("limit") ? Number(args.get("limit")) : undefined
  };
}

function normalize(value: string) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[^а-яa-z0-9]+/g, "");
}

function getLine(lineName: string, color: string, index: number) {
  const normalized = normalize(lineName);
  const aliases: Record<string, string> = {
    московскоецентральноекольцо: "14",
    большаякольцеваялиния: "11"
  };
  const aliased = aliases[normalized];

  if (aliased) {
    return metroLines.find((line) => line.id === aliased) ?? metroLines[0];
  }

  const byName = metroLines.find((line) => normalize(line.name).includes(normalized) || normalized.includes(normalize(line.name)));
  const byColor = metroLines.find((line) => line.color.replace("#", "").toLowerCase() === color.toLowerCase());

  return byName ?? byColor ?? metroLines[index] ?? metroLines[0];
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

async function loadStations() {
  let lines: MetroLineSource[];

  try {
    lines = JSON.parse(await readFile(LOCAL_METRO_DATA, "utf8")) as MetroLineSource[];
  } catch {
    const response = await fetch(METRO_DATA_URL);

    if (!response.ok) {
      throw new Error(`Cannot load metro stations: ${response.status}`);
    }

    lines = (await response.json()) as MetroLineSource[];
  }

  const stations = lines.flatMap((line, index) => {
    if (/монорельс|каховская/i.test(line.name)) {
      return [];
    }

    const mappedLine = getLine(line.name, line.hex_color, index);

    return line.stations
      .filter((station) => station.status !== "строится")
      .map((station) => ({
        station: station.name,
        latitude: station.lat,
        longitude: station.lng,
        line: mappedLine
      }));
  });

  return stations;
}

async function main() {
  const options = parseArgs();
  const stations = await loadStations();
  const temples = await prisma.temple.findMany({
    where: {
      moderationStatus: "PUBLISHED",
      latitude: { not: null },
      longitude: { not: null }
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true
    },
    take: options.limit
  });

  let updated = 0;

  for (const temple of temples) {
    const nearest = stations
      .map((station) => {
        const meters = distanceMeters(temple.latitude!, temple.longitude!, station.latitude, station.longitude);

        return {
          ...station,
          distanceMeters: meters,
          walkMinutes: Math.max(1, Math.round(meters / 80))
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3);

    await prisma.templeTransit.deleteMany({ where: { templeId: temple.id } });
    await prisma.templeTransit.createMany({
      data: nearest.map((item) => ({
        templeId: temple.id,
        station: item.station,
        lineId: item.line.id,
        lineName: item.line.name,
        lineColor: item.line.color,
        system: item.line.system,
        distanceMeters: item.distanceMeters,
        walkMinutes: item.walkMinutes
      }))
    });

    updated += 1;

    if (updated % 50 === 0 || options.limit) {
      console.log(`Transit updated ${updated}/${temples.length}: ${temple.name}`);
    }
  }

  console.log(JSON.stringify({ temples: temples.length, updated, stations: stations.length, source: METRO_DATA_URL }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
