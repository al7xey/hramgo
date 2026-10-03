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
  if(transit.routeVerified && transit.walkMinutes>0)return `${transit.station} · ${transit.walkMinutes} мин пешком`;
  return transit.distanceMeters>0?`${transit.station} · ${(transit.distanceMeters/1000).toLocaleString('ru',{maximumFractionDigits:1})} км по прямой`:transit.station;
}

export function getNearestTransit(transit: TempleTransitView[]) {
  return sortTransitByWalkMinutes(transit)[0] ?? null;
}

export function getNearestTransitList(transit: TempleTransitView[], limit = 3) {
  return sortTransitByWalkMinutes(transit).slice(0, limit);
}
