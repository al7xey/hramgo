import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { digest, decodeBody } from "./lib/http-cache.mjs";
import { parseScheduleHtml } from "./lib/site-parser.mjs";
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
pg.types.setTypeParser(1082, (value) => value);
await db.connect();
try {
  const temples = (
    await db.query(
      "select id,website_url from public.temples where status='PUBLISHED'"
    )
  ).rows;
  const old = (
    await db.query(
      "select * from public.temple_schedule_entries where id like 'parsed-%' and extraction_method='html'"
    )
  ).rows;
  const owners = new Map();
  for (const t of temples)
    if (t.website_url) {
      const h = new URL(t.website_url).hostname.replace(/^www\./, "");
      owners.set(h, (owners.get(h) ?? 0) + 1);
    }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const changes = [];
  for (const group of Map.groupBy(
    old,
    (e) => e.temple_id + "|" + e.source_url
  ).values()) {
    const first = group[0],
      key = digest(first.source_url);
    let metadata, body;
    try {
      metadata = JSON.parse(
        await readFile(".cache/hramgo/http/" + key + ".json", "utf8")
      );
      body = await readFile(".cache/hramgo/http/" + key + ".bin");
    } catch {
      continue;
    }
    const parsed = new Map(
      parseScheduleHtml(decodeBody({ ...metadata, body }), {
        templeId: first.temple_id,
        sourceUrl: first.source_url,
        checkedAt: metadata.last_checked_at,
        method: "html",
        official: true
      }).map((e) => [e.id, e])
    );
    const site = temples.find((t) => t.id === first.temple_id)?.website_url;
    const shared =
      site && owners.get(new URL(site).hostname.replace(/^www\./, "")) > 1;
    for (const row of group) {
      const candidate = parsed.get(row.id);
      const valid =
        candidate &&
        !candidate.weekdays &&
        candidate.status === "VERIFIED" &&
        !shared &&
        candidate.service_date >= today &&
        Date.parse(candidate.service_date) <= Date.now() + 120 * 86400000;
      const status = valid && row.status === "VERIFIED" ? "VERIFIED" : "REVIEW",
        scope = candidate?.scope_note ?? row.scope_note;
      if (row.status !== status || row.scope_note !== scope)
        changes.push({ id: row.id, status, scope_note: scope });
    }
  }
  if (process.argv.includes("--apply") && changes.length) {
    await writeFile(
      "tmp/backups/schedules-before-revalidation-" + Date.now() + ".json",
      JSON.stringify(old)
    );
    await db.query(
      "update public.temple_schedule_entries e set status=c.status,scope_note=c.scope_note from jsonb_to_recordset($1::jsonb) c(id text,status text,scope_note text) where e.id=c.id and row(e.status,e.scope_note) is distinct from row(c.status,c.scope_note)",
      [JSON.stringify(changes)]
    );
  }
  console.log(
    JSON.stringify({
      cachedSources: new Set(old.map((e) => e.source_url)).size,
      httpRequests: 0,
      changed: changes.length,
      demoted: changes.filter((e) => e.status === "REVIEW").length,
      mode: process.argv.includes("--apply") ? "apply" : "dry-run"
    })
  );
} finally {
  await db.end();
}
