import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { digest } from "./lib/http-cache.mjs";
const reviewed = JSON.parse(
  await readFile("data/reviewed-schedule-entries.json", "utf8")
);
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const temples = (
    await db.query("select id,source_primary_url,details from public.temples")
  ).rows;
  const rows = [],
    sources = [];
  for (const r of reviewed) {
    const temple = temples.find(
      (t) =>
        t.source_primary_url === r.primary ||
        t.details?.includedTemples?.some((b) => b.sourceUrl === r.primary)
    );
    if (!temple) throw new Error("Reviewed temple is missing");
    const metadata = JSON.parse(
      await readFile(".cache/hramgo/http/" + digest(r.source) + ".json", "utf8")
    );
    if (!metadata.content_hash || ![200, 304].includes(metadata.http_status))
      throw new Error("Reviewed source is unavailable");
    if (r.contentHash && r.contentHash !== metadata.content_hash)
      throw new Error("Reviewed source has changed");
    r.contentHash = metadata.content_hash;
    sources.push({
      id: "source-" + digest(temple.id + r.source).slice(0, 24),
      temple_id: temple.id,
      url: r.source,
      source_type: "official_schedule",
      etag: metadata.etag ?? null,
      last_modified: metadata.last_modified ?? null,
      content_hash: metadata.content_hash,
      last_checked_at: metadata.last_checked_at,
      last_verified_at: metadata.last_checked_at,
      last_changed_at: metadata.last_changed_at,
      http_status: metadata.http_status,
      confidence: 1,
      is_official: true,
      priority: 1,
      extraction_method: r.method,
      robots_allowed: true
    });
    rows.push({
      id: "reviewed-" + digest(JSON.stringify(r)).slice(0, 26),
      temple_id: temple.id,
      service_date: r.date ?? null,
      weekdays: r.weekdays ?? null,
      starts_at: r.time,
      kind: r.kind,
      title: r.title,
      comment: r.quote,
      is_special: Boolean(r.date),
      valid_from: r.date ?? null,
      valid_until: r.date ?? null,
      source_url: r.source,
      verified_at: metadata.last_checked_at,
      last_checked_at: metadata.last_checked_at,
      confidence: r.method === "html-manual" ? 0.9 : 0.9,
      status: "VERIFIED",
      extraction_method: r.method,
      scope_note:
        temple.details?.includedTemples?.find((b) => b.sourceUrl === r.primary)
          ?.name ??
        (r.primary.endsWith("/1110")
          ? "Котляковское кладбище, правая колонка общего расписания прихода"
          : "Проверена принадлежность записи этому объекту")
    });
  }
  await writeFile(
    "data/reviewed-schedule-entries.json",
    JSON.stringify(reviewed, null, 2) + "\n"
  );
  if (process.argv.includes("--apply")) {
    await db.query("begin");
    try {
      const unique = [
          ...new Map(sources.map((s) => [s.temple_id + s.url, s])).values()
        ],
        columns = Object.keys(unique[0]);
      await db.query(
        `insert into public.temple_sources(${columns.join(",")}) select ${columns.join(",")} from jsonb_populate_recordset(null::public.temple_sources,$1::jsonb) on conflict(temple_id,url) do nothing`,
        [JSON.stringify(unique)]
      );
      await db.query(
        `insert into public.temple_schedule_entries select * from jsonb_populate_recordset(null::public.temple_schedule_entries,$1::jsonb) on conflict(id) do nothing`,
        [JSON.stringify(rows)]
      );
      await db.query(
        "update public.temples set email=null,updated_at=now() where email='sales@ostankino.ru' and website_url='https://ostankino.ru/telecenter/hram'"
      );
      await db.query("commit");
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
  }
  console.log(
    JSON.stringify({
      reviewedEntries: rows.length,
      temples: new Set(rows.map((r) => r.temple_id)).size,
      mode: process.argv.includes("--apply") ? "apply" : "dry-run"
    })
  );
} finally {
  await db.end();
}
