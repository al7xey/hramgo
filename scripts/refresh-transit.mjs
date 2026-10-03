import { writeFile } from "node:fs/promises";
import pg from "pg";
import { fetchCached, digest } from "./lib/http-cache.mjs";

const sourceUrl = "https://api.hh.ru/metro/1";
const source = await fetchCached(sourceUrl, { maxAgeDays: 30 });
if (!source.body || ![200, 304].includes(source.http_status))
  throw new Error("Station source unavailable");
const network = JSON.parse(source.body.toString("utf8"));
const canonical = {
  133: "8A",
  95: "14",
  97: "11",
  98: "15",
  131: "D1",
  132: "D2",
  135: "D3",
  136: "D4",
  137: "16",
  171: "17"
};
const stations = network.lines
  .filter((line) => line.id !== "11")
  .flatMap((line) =>
    line.stations.map((s) => ({
      station: s.name,
      latitude: s.lat,
      longitude: s.lng,
      line_id: canonical[line.id] ?? line.id,
      line_name: line.name.trim(),
      line_color: "#" + line.hex_color,
      system: line.name.startsWith("МЦД")
        ? "mcd"
        : line.id === "95"
          ? "mcc"
          : "metro"
    }))
  )
  .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
function distance(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const temples = (
    await db.query(
      "select id,latitude,longitude from public.temples where status='PUBLISHED' and latitude is not null and longitude is not null"
    )
  ).rows;
  const old = (await db.query("select * from public.temple_transit")).rows;
  const rows = [],
    changed = [];
  for (const temple of temples) {
    const candidates = stations
      .map((s) => ({ ...s, distance_meters: distance(temple, s) }))
      .sort((a, b) => a.distance_meters - b.distance_meters);
    const unique = (items) => [
      ...new Map(items.map((s) => [s.station, s])).values()
    ];
    const nearest = [
      ...unique(
        candidates.filter(
          (s) => s.system !== "mcd" && s.distance_meters <= 10000
        )
      ).slice(0, 2),
      ...unique(
        candidates.filter(
          (s) => s.system === "mcd" && s.distance_meters <= 5000
        )
      ).slice(0, 1)
    ];
    const next = nearest.map(({ latitude: _lat, longitude: _lng, ...s }) => ({
      ...s,
      id: "transit-" + digest(temple.id + s.station + s.line_id).slice(0, 24),
      temple_id: temple.id,
      walk_minutes: Math.ceil((s.distance_meters * 1.3) / 80),
      route_verified: false,
      source_url: sourceUrl
    }));
    const comparable = (items) =>
      JSON.stringify(
        items
          .filter((s) => !s.route_verified)
          .map((s) => [
            s.station,
            s.line_id,
            s.distance_meters,
            s.walk_minutes,
            s.source_url
          ])
          .sort()
      );
    if (
      next.length &&
      comparable(next) !==
        comparable(old.filter((s) => s.temple_id === temple.id))
    ) {
      changed.push(temple.id);
      rows.push(...next);
    }
  }
  if (process.argv.includes("--apply") && rows.length) {
    await writeFile(
      "tmp/backups/transit-before-refresh-" + Date.now() + ".json",
      JSON.stringify(old)
    );
    await db.query("begin");
    try {
      // Preserve any independently verified walking route.
      await db.query(
        "delete from public.temple_transit where temple_id=any($1::text[]) and not route_verified",
        [changed]
      );
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100),
          columns = Object.keys(batch[0]);
        await db.query(
          `insert into public.temple_transit(${columns.join(",")}) select ${columns.join(",")} from jsonb_populate_recordset(null::public.temple_transit,$1::jsonb) on conflict(temple_id,station,line_id) do nothing`,
          [JSON.stringify(batch)]
        );
      }
      await db.query("commit");
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
  }
  const report = {
    checkedAt: source.last_checked_at,
    sourceUrl,
    sourceHash: source.content_hash,
    stations: stations.length,
    templesWithCoordinates: temples.length,
    templesChanged: changed.length,
    mode: process.argv.includes("--apply") ? "apply" : "dry-run",
    distanceMethod: "haversine-straight-line",
    walkingTime:
      "estimate: distance * 1.3 / 80 metres per minute; route not verified",
    openingSources: [
      "https://transport.mos.ru/mostrans/all_news/131519",
      "https://transport.mos.ru/mostrans/all_news/126335"
    ]
  };
  if (process.argv.includes("--apply"))
    await writeFile(
      "data/transit-refresh-report.json",
      JSON.stringify(report, null, 2) + "\n"
    );
  console.log(JSON.stringify(report));
} finally {
  await db.end();
}
