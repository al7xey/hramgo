import { writeFile, readFile } from "node:fs/promises";
import pg from "pg";
import { fetchCached, digest } from "./lib/http-cache.mjs";
import { nearestStations } from "./lib/transit.mjs";

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
const evidence = JSON.parse(
  await readFile("scripts/data/mcd-coordinates.json", "utf8")
);
const stations = network.lines
  .filter((line) => line.id !== "11" && !line.name.startsWith("МЦД"))
  .flatMap((line) =>
    line.stations.map((s) => ({
      station: s.name.trim(),
      latitude: s.lat,
      longitude: s.lng,
      line_id: canonical[line.id] ?? line.id,
      line_name: line.name.trim(),
      line_color: "#" + line.hex_color,
      source_url: sourceUrl,
      system: line.id === "95" ? "mcc" : "metro"
    }))
  )
  .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
for (const s of evidence.stations) {
  if (
    !["D1", "D2", "D3", "D4"].includes(s.line) ||
    s.latitude < 54 ||
    s.latitude > 57 ||
    s.longitude < 35 ||
    s.longitude > 40
  )
    throw new Error("Invalid MCD station evidence");
  stations.push({
    station: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    line_id: s.line,
    line_name: "МЦД-" + s.line.slice(1),
    line_color: { D1: "#F6A800", D2: "#E74683", D3: "#EA5B04", D4: "#00CC66" }[
      s.line
    ],
    system: "mcd",
    source_url: s.sourceUrl
  });
}
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const temples = (
    await db.query(
      "select id,slug,name,latitude,longitude from public.temples where status='PUBLISHED' and latitude is not null and longitude is not null"
    )
  ).rows;
  const old = (await db.query("select * from public.temple_transit")).rows;
  const rows = [],
    changed = [],
    diffs = [];
  for (const temple of temples) {
    const nearest = nearestStations(temple, stations);
    const next = nearest.map(({ latitude: _lat, longitude: _lng, ...s }) => ({
      ...s,
      id: "transit-" + digest(temple.id + s.station + s.line_id).slice(0, 24),
      temple_id: temple.id,
      walk_minutes: Math.ceil((s.distance_meters * 1.3) / 80),
      route_verified: false
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
      comparable(next) !==
      comparable(old.filter((s) => s.temple_id === temple.id))
    ) {
      changed.push(temple.id);
      diffs.push({
        slug: temple.slug,
        name: temple.name,
        before: old
          .filter((s) => s.temple_id === temple.id)
          .map((s) => ({
            station: s.station,
            line: s.line_id,
            minutes: s.walk_minutes
          })),
        after: next.map((s) => ({
          station: s.station,
          line: s.line_id,
          minutes: s.walk_minutes
        }))
      });
      rows.push(...next);
    }
  }
  if (process.argv.includes("--apply") && changed.length) {
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
    checkedAt: new Date().toISOString(),
    metroSourceCheckedAt: source.last_checked_at,
    mcdSourceCheckedAt: evidence.checkedAt,
    sourceUrl,
    sourceHash: source.content_hash,
    stations: stations.length,
    mcdStations: evidence.stations.length,
    stationEvidence: "scripts/data/mcd-coordinates.json",
    selectionMethod:
      "three geographically closest distinct stations within 5 km; no artificial metro/MCD quotas",
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
  await writeFile(
    process.argv.includes("--apply")
      ? "data/transit-refresh-diff.json"
      : "tmp/transit-refresh-dry-run.json",
    JSON.stringify(diffs, null, 2) + "\n"
  );
  if (process.argv.includes("--apply"))
    await writeFile(
      "data/transit-refresh-report.json",
      JSON.stringify(report, null, 2) + "\n"
    );
  console.log(JSON.stringify(report));
} finally {
  await db.end();
}
