const TECHNICAL_CENTER_BOUNDS = {
  minLatitude: 55.75,
  maxLatitude: 55.7522,
  minLongitude: 37.6173,
  maxLongitude: 37.6195
} as const;

export function isKnownTechnicalMoscowCenterCoordinate(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) {
    return false;
  }

  return (
    latitude >= TECHNICAL_CENTER_BOUNDS.minLatitude &&
    latitude <= TECHNICAL_CENTER_BOUNDS.maxLatitude &&
    longitude >= TECHNICAL_CENTER_BOUNDS.minLongitude &&
    longitude <= TECHNICAL_CENTER_BOUNDS.maxLongitude
  );
}

export function hasExplicitNonMoscowRegion(address?: string | null) {
  if (!address) {
    return false;
  }

  const normalized = address.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  return /(?:московск(?:ая|ой)\s+обл(?:асть|\.)?|сахалинск(?:ая|ой)\s+обл(?:асть|\.)?|\bобл(?:асть|\.)\s*,)/u.test(normalized);
}
