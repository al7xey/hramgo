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

type StationCandidate = {
  station: string;
  latitude: number;
  longitude: number;
  line: (typeof metroLines)[number];
};

const extraMcdStations: StationCandidate[] = [
  { station: "Белорусская", latitude: 55.7767, longitude: 37.5823, line: getLineById("D1") },
  { station: "Беговая", latitude: 55.7736, longitude: 37.5456, line: getLineById("D1") },
  { station: "Кунцевская", latitude: 55.7307, longitude: 37.4459, line: getLineById("D1") },
  { station: "Славянский бульвар", latitude: 55.7296, longitude: 37.4706, line: getLineById("D1") },
  { station: "Савеловская", latitude: 55.7941, longitude: 37.5889, line: getLineById("D1") },
  { station: "Окружная", latitude: 55.8473, longitude: 37.5716, line: getLineById("D1") },
  { station: "Покровское", latitude: 55.602778, longitude: 37.631667, line: getLineById("D2") },
  { station: "Царицыно", latitude: 55.6207, longitude: 37.6694, line: getLineById("D2") },
  { station: "Текстильщики", latitude: 55.7088, longitude: 37.7316, line: getLineById("D2") },
  { station: "Курская", latitude: 55.7585, longitude: 37.6597, line: getLineById("D2") },
  { station: "Рижская", latitude: 55.7924, longitude: 37.6342, line: getLineById("D2") },
  { station: "Дмитровская", latitude: 55.8078, longitude: 37.5811, line: getLineById("D2") },
  { station: "Щукинская", latitude: 55.8094, longitude: 37.4646, line: getLineById("D2") },
  { station: "Тушинская", latitude: 55.8252, longitude: 37.4369, line: getLineById("D2") },
  { station: "Волоколамская", latitude: 55.835, longitude: 37.3822, line: getLineById("D2") },
  { station: "Ховрино", latitude: 55.8785, longitude: 37.4862, line: getLineById("D3") },
  { station: "Лихоборы", latitude: 55.8472, longitude: 37.5515, line: getLineById("D3") },
  { station: "Электрозаводская", latitude: 55.7816, longitude: 37.703, line: getLineById("D3") },
  { station: "Авиамоторная", latitude: 55.7519, longitude: 37.716, line: getLineById("D3") },
  { station: "Нижегородская", latitude: 55.7317, longitude: 37.7282, line: getLineById("D4") },
  { station: "Серп и Молот", latitude: 55.747, longitude: 37.681, line: getLineById("D4") },
  { station: "Кутузовская", latitude: 55.7397, longitude: 37.5355, line: getLineById("D4") },
  { station: "Поклонная", latitude: 55.7355, longitude: 37.5199, line: getLineById("D4") },
  { station: "Минская", latitude: 55.7247, longitude: 37.4978, line: getLineById("D4") }
];

function getLineById(id: string) {
  return metroLines.find((line) => line.id === id) ?? metroLines[0];
}

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

  const byKey = new Map<string, StationCandidate>();
  [...stations, ...extraMcdStations].forEach((station) => {
    byKey.set(`${station.station}-${station.line.id}`, station);
  });

  return Array.from(byKey.values());
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
