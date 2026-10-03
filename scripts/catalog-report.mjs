import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import pg from "pg";
pg.types.setTypeParser(1082, (value) => value);
import { isMoscowAddress } from "./official-parser.mjs";
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const tables = [
    "temples",
    "temple_sources",
    "temple_schedule_entries",
    "temple_photos",
    "temple_transit",
    "temple_social_links",
    "temple_clergy",
    "temple_services",
    "temple_field_evidence"
  ];
  const current = {};
  for (const table of tables)
    current[table] = (await db.query("select * from public." + table)).rows;
  const files = (await readdir("tmp/backups"))
    .filter((f) => f.startsWith("catalog-before-update-"))
    .sort();
  const original = JSON.parse(
    await readFile("tmp/backups/" + files[0], "utf8")
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const temples = current.temples.filter((t) => t.status === "PUBLISHED"),
    has = (table, id, test = () => true) =>
      current[table].some((r) => r.temple_id === id && test(r));
  const schedule = (e) =>
    e.status === "VERIFIED" &&
    e.confidence >= 0.8 &&
    Date.now() - Date.parse(e.verified_at) <= 30 * 86400000 &&
    (!e.valid_until || e.valid_until >= today);
  const material = (r) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(r)
          .filter(
            ([k]) =>
              ![
                "last_checked_at",
                "last_verified_at",
                "updated_at",
                "last_changed_at",
                "verified_at",
                "imported_at",
                "created_at",
                "location"
              ].includes(k)
          )
          .sort(([a], [b]) => a.localeCompare(b))
      )
    );
  const changed = new Set();
  for (const table of tables) {
    const old = new Map(original[table].map((r) => [r.id, r]));
    for (const row of current[table])
      if (!old.has(row.id) || material(old.get(row.id)) !== material(row))
        changed.add(row.temple_id ?? row.id);
  }
  const directory = JSON.parse(
    await readFile("tmp/source-cache/official-list.json", "utf8")
  );
  const missing = directory.items.filter(
    (t) =>
      isMoscowAddress(t.address) &&
      t.officialId !== "2" &&
      !current.temples.some((r) => r.source_primary_url === t.url)
  );
  const duplicateGroups = (
    await db.query(
      "select latitude,longitude,array_agg(id) as ids from public.temples where status='PUBLISHED' and latitude is not null group by latitude,longitude having count(*)>1"
    )
  ).rows;
  const issues = temples
    .map((t) => {
      const codes = [];
      if (!t.website_url) codes.push("NO_OFFICIAL_SITE");
      if (!has("temple_schedule_entries", t.id, (e) => e.status === "VERIFIED"))
        codes.push("NO_SCHEDULE");
      else if (!has("temple_schedule_entries", t.id, schedule))
        codes.push("SCHEDULE_STALE");
      if (!has("temple_photos", t.id, (e) => e.status === "APPROVED"))
        codes.push("NO_PHOTO");
      if (t.latitude == null) codes.push("NO_COORDINATES");
      if (
        has(
          "temple_sources",
          t.id,
          (e) => e.http_status >= 400 || e.http_status === 0
        )
      )
        codes.push("SOURCE_DEAD");
      if (
        has("temple_schedule_entries", t.id, (e) => e.status === "REVIEW") ||
        duplicateGroups.some((g) => g.ids.includes(t.id))
      )
        codes.push("NEEDS_MANUAL_REVIEW");
      return { id: t.id, slug: t.slug, name: t.name, codes };
    })
    .filter((t) => t.codes.length);
  const size = (
    await db.query("select pg_database_size(current_database())::text as bytes")
  ).rows[0].bytes;
  const storage = (
    await db.query(
      "select coalesce(sum((metadata->>'size')::bigint),0)::text as bytes from storage.objects where bucket_id='temple-photos'"
    )
  ).rows[0].bytes;
  const report = {
    checkedAt: new Date().toISOString(),
    temples: temples.length,
    totalDatabaseObjects: current.temples.length,
    added: temples.filter((t) => !original.temples.some((o) => o.id === t.id))
      .length,
    updated: temples.filter(
      (t) =>
        changed.has(t.id) && original.temples.some((old) => old.id === t.id)
    ).length,
    coverage: {
      officialWebsite: temples.filter((t) => t.website_url).length,
      address: temples.filter((t) => t.address).length,
      coordinates: temples.filter((t) => t.latitude != null).length,
      photos: temples.filter((t) =>
        has("temple_photos", t.id, (p) => p.status === "APPROVED")
      ).length,
      contacts: temples.filter((t) => t.phone || t.email).length,
      schedule: temples.filter((t) =>
        has("temple_schedule_entries", t.id, (e) => e.status === "VERIFIED")
      ).length
    },
    freshSchedules: temples.filter((t) =>
      has("temple_schedule_entries", t.id, schedule)
    ).length,
    freshServiceEntries:
      current.temple_schedule_entries.filter(schedule).length,
    withoutFoundSchedule: temples.filter(
      (t) =>
        !has("temple_schedule_entries", t.id, (e) => e.status === "VERIFIED")
    ).length,
    duplicateCandidates: duplicateGroups.length,
    confirmedDuplicates: JSON.parse(
      await readFile("data/reviewed-temple-merges.json", "utf8")
    ).length,
    correctedCoordinates: temples.filter((t) => {
      const old = original.temples.find((o) => o.id === t.id);
      return (
        old && (old.latitude !== t.latitude || old.longitude !== t.longitude)
      );
    }).length,
    storageBytes: Number(storage),
    databaseBytes: Number(size),
    needsManualReview: issues.filter((t) =>
      t.codes.includes("NEEDS_MANUAL_REVIEW")
    ).length,
    officialDirectory: {
      checkedAt: directory.checkedAt,
      missing: missing.length
    },
    problems: Object.fromEntries(
      [
        "NO_OFFICIAL_SITE",
        "NO_SCHEDULE",
        "SCHEDULE_STALE",
        "NO_PHOTO",
        "NO_COORDINATES",
        "SOURCE_DEAD",
        "NEEDS_MANUAL_REVIEW"
      ].map((code) => [
        code,
        issues.filter((t) => t.codes.includes(code)).length
      ])
    )
  };
  await mkdir("data", { recursive: true });
  await writeFile(
    "data/catalog-update-report.json",
    JSON.stringify(report, null, 2) + "\n"
  );
  await writeFile(
    "data/catalog-issues.json",
    JSON.stringify(issues, null, 2) + "\n"
  );
  await writeFile(
    ".cache/hramgo/deduplication.json",
    JSON.stringify({ duplicateGroups, missing }, null, 2)
  );
  console.log(JSON.stringify(report));
} finally {
  await db.end();
}
