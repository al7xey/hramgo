import type { TempleTransitView } from "@/features/temples/types";

export function sortTransitByWalkMinutes(transit: TempleTransitView[]) {
  return [...transit].sort((a, b) => {
    if (a.walkMinutes !== b.walkMinutes) {
      return a.walkMinutes - b.walkMinutes;
    }

    return a.station.localeCompare(b.station, "ru");
  });
}

export function formatTransitShort(transit: TempleTransitView) {
  if (!Number.isFinite(transit.walkMinutes) || transit.walkMinutes <= 0) {
    return transit.station;
  }

  if (transit.walkMinutes <= 40) {
    return `${transit.station} · ${transit.walkMinutes} мин`;
  }

  if (transit.distanceMeters > 0) {
    const carMinutes = Math.max(3, Math.round((transit.distanceMeters / 1000 / 25) * 60));
    return `${transit.station} · ${carMinutes} мин на машине`;
  }

  return transit.station;
}

export function getNearestTransit(transit: TempleTransitView[]) {
  return sortTransitByWalkMinutes(transit)[0] ?? null;
}

export function getNearestTransitList(transit: TempleTransitView[], limit = 3) {
  return sortTransitByWalkMinutes(transit).slice(0, limit);
}
