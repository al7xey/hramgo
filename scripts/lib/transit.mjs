export function distanceMeters(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))));
}

export function nearestStations(temple, stations, limit = 3) {
  const ranked = stations
    .map((s) => ({ ...s, distance_meters: distanceMeters(temple, s) }))
    .filter((s) => s.distance_meters <= 5000)
    .sort((a, b) => a.distance_meters - b.distance_meters);
  // Keep the closest platform when several lines share a station name.
  const seen = new Set();
  return ranked
    .filter((s) => {
      const key = s.station.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
