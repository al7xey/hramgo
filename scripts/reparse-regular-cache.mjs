// Reprocess only the affected regular schedule class. No HTTP requests or description changes.
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { digest, decodeBody } from "./lib/http-cache.mjs";
import { inspectPage, parseScheduleHtml } from "./lib/site-parser.mjs";
import { parseRegularReference } from "./lib/regular-schedules.mjs";
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
const apply = process.argv.includes("--apply");
try {
  const temples = (
    await db.query("select * from public.temples where status='PUBLISHED'")
  ).rows;
  const checkpoint = JSON.parse(
    await readFile(".cache/hramgo/regular-checkpoint.json", "utf8")
  );
  const old = (
    await db.query(
      "select * from public.temple_schedule_entries where extraction_method='regular-reference'"
    )
  ).rows;
  await writeFile(
    "tmp/backups/before-regular-reparse-" + Date.now() + ".json",
    JSON.stringify(old)
  );
  const owners = new Map();
  for (const t of temples)
    if (t.website_url) {
      try {
        const h = new URL(t.website_url).hostname.replace(/^www\./, "");
        owners.set(h, (owners.get(h) ?? 0) + 1);
      } catch {
        /* invalid */
      }
    }
  const cache = new Map();
  const records = [];
  for (const r of checkpoint.records) {
    const t = temples.find((t) => t.id === r.id);
    if (!t) continue;
    let entries = parseRegularReference(t.details.scheduleSummary ?? "", {
      templeId: t.id,
      sourceUrl: t.source_primary_url ?? t.website_url,
      checkedAt:
        r.sources.find((s) => s.url === t.source_primary_url)
          ?.last_checked_at ?? t.last_verified_at,
      confidence: 0.7
    });
    const shared =
      t.website_url &&
      (owners.get(new URL(t.website_url).hostname.replace(/^www\./, "")) ?? 0) >
        1;
    for (const source of r.sources.filter(
      (s) =>
        s.content_hash &&
        s.http_status < 400 &&
        !s.url.includes("sprav.moseparh.ru") &&
        !shared
    )) {
      let page = cache.get(source.url);
      if (!page) {
        try {
          const meta = JSON.parse(
            await readFile(
              ".cache/hramgo/http/" + digest(source.url) + ".json",
              "utf8"
            )
          );
          const body = await readFile(
            ".cache/hramgo/http/" + digest(source.url) + ".bin"
          );
          if (!/html|text/i.test(meta.content_type ?? "text/html")) continue;
          page = {
            html: decodeBody({ ...meta, body }),
            checkedAt: meta.last_checked_at
          };
          cache.set(source.url, page);
        } catch {
          continue;
        }
      }
      const options = {
        templeId: t.id,
        sourceUrl: source.url,
        checkedAt: page.checkedAt,
        official: true
      };
      entries.push(
        ...parseScheduleHtml(page.html, options)
          .filter((e) => e.weekdays)
          .map((e) => ({
            ...e,
            id:
              "regular-" +
              digest(
                JSON.stringify([
                  t.id,
                  source.url,
                  e.weekdays,
                  e.starts_at,
                  e.kind
                ])
              ).slice(0, 28),
            status: "REVIEW",
            confidence: 0.75,
            extraction_method: "regular-reference"
          }))
      );
      const parsed = inspectPage(page.html, source.url);
      parsed.$("p,li,tr").each((_, el) => {
        const text = parsed.$(el).text().replace(/\s+/g, " ").trim();
        if (
          text.length < 900 &&
          /по воскрес|по будн|ежеднев|по суббот|кажд[а-я ]{0,15}(?:воскрес|суббот)/i.test(
            text
          )
        )
          entries.push(
            ...parseRegularReference(text, { ...options, confidence: 0.75 })
          );
      });
    }
    entries = [...new Map(entries.map((e) => [e.id, e])).values()];
    if (/монастыр|комплекс/i.test(t.name))
      for (const e of entries)
        e.scope_note =
          e.scope_note ??
          "Общее справочное расписание комплекса; конкретное здание уточните в источнике.";
    records.push({ id: t.id, slug: t.slug, entries });
  }
  if (apply)
    for (let offset = 0; offset < records.length; offset += 50) {
      const batch = records.slice(offset, offset + 50),
        entries = batch.flatMap((r) => r.entries);
      await db.query("begin");
      try {
        await db.query(
          "delete from public.temple_schedule_entries where extraction_method='regular-reference' and id like 'regular-%' and temple_id=any($1::text[])",
          [batch.map((r) => r.id)]
        );
        if (entries.length) {
          const cols = Object.keys(entries[0]);
          await db.query(
            `insert into public.temple_schedule_entries(${cols.join(",")}) select ${cols.join(",")} from jsonb_populate_recordset(null::public.temple_schedule_entries,$1::jsonb)`,
            [JSON.stringify(entries)]
          );
        }
        await db.query("commit");
      } catch (e) {
        await db.query("rollback");
        throw e;
      }
    }
  const report = {
    temples: temples.length,
    processed: records.length,
    regularSchedules: records.filter((r) => r.entries.length).length,
    regularEntries: records.reduce((n, r) => n + r.entries.length, 0),
    httpRequests: 0
  };
  await writeFile(
    "data/regular-reparse-report.json",
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(JSON.stringify(report));
} finally {
  await db.end();
}
