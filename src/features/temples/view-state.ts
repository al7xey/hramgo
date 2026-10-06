export type ListViewState = { url: string; limit: number; scrollY: number };
export type MapViewState = {
  key: string;
  center: [number, number];
  zoom: number;
};
export function normalizeViewUrl(url: string) {
  const parsed = new URL(url, "https://hramgo.ru");
  for (const field of ["latitude", "longitude"]) {
    const raw = parsed.searchParams.get(field);
    if (raw != null && Number.isFinite(Number(raw)))
      parsed.searchParams.set(
        field,
        String(Math.round(Number(raw) * 1000) / 1000)
      );
  }
  parsed.searchParams.sort();
  return parsed.pathname.replace(/\/?$/, "/") + parsed.search;
}
export function saveListView(url: string, limit: number) {
  try {
    sessionStorage.setItem(
      "hramgo-list-view",
      JSON.stringify({
        url: normalizeViewUrl(url),
        limit,
        scrollY: window.scrollY
      })
    );
  } catch {
    /* Storage is optional. */
  }
}
export function readListView(url: string): ListViewState | undefined {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("hramgo-list-view") ?? "null"
    );
    if (
      value?.url === normalizeViewUrl(url) &&
      Number.isFinite(value.scrollY) &&
      Number.isInteger(value.limit) &&
      value.limit > 0 &&
      value.limit <= 10000
    )
      return value;
  } catch {
    /* Storage is optional. */
  }
}
export function readMapView(key: string): MapViewState | undefined {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("hramgo-map-view") ?? "null"
    );
    if (
      value?.key === normalizeViewUrl("/map/?" + key) &&
      value.center?.length === 2 &&
      value.center.every(
        (n: unknown) => typeof n === "number" && Number.isFinite(n)
      ) &&
      Math.abs(value.center[0]) <= 90 &&
      Math.abs(value.center[1]) <= 180 &&
      Number.isFinite(value.zoom) &&
      value.zoom >= 1 &&
      value.zoom <= 21
    )
      return value;
  } catch {
    /* Storage is optional. */
  }
}
export function saveMapView(
  key: string,
  center: [number, number],
  zoom: number
) {
  // Local session only; rounding avoids retaining an unnecessary precise position.
  try {
    sessionStorage.setItem(
      "hramgo-map-view",
      JSON.stringify({
        key: normalizeViewUrl("/map/?" + key),
        center: center.map((value) => Math.round(value * 1000) / 1000),
        zoom
      })
    );
  } catch {
    /* Storage is optional. */
  }
}
