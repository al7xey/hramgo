import { readFile, writeFile, mkdir } from "node:fs/promises";
import pg from "pg";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { load } from "cheerio";
import {
  fetchCached,
  decodeBody,
  publicUrl,
  digest
} from "./lib/http-cache.mjs";
import { inspectPage, parseScheduleHtml } from "./lib/site-parser.mjs";
import { parseRegularReference } from "./lib/regular-schedules.mjs";
const apply =
    process.argv.includes("--apply") && !process.argv.includes("--dry-run"),
  resume = process.argv.includes("--resume");
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
pg.types.setTypeParser(1082, (v) => v);
await db.connect();
const temples = (
  await db.query(
    "select * from public.temples where status='PUBLISHED' order by slug"
  )
).rows;
const oldSources = (await db.query("select * from public.temple_sources")).rows;
const oldEntries = (
  await db.query("select * from public.temple_schedule_entries")
).rows;
await mkdir("tmp/backups", { recursive: true });
await mkdir(".cache/hramgo", { recursive: true });
await writeFile(
  "tmp/backups/before-regular-" + Date.now() + ".json",
  JSON.stringify({ temples, oldSources, oldEntries })
);
const file = ".cache/hramgo/regular-checkpoint.json";
let records = [];
try {
  if (resume || !process.argv.includes("--force")) {
    const saved = JSON.parse(await readFile(file, "utf8"));
    if (saved.mode === (apply ? "apply" : "dry-run"))
      records = saved.records.filter(
        (r) =>
          resume ||
          Date.now() - Date.parse(r.checkedAt ?? saved.updatedAt) <
            (r.sources.some((s) => s.http_status === 0 || s.http_status >= 400)
              ? 1
              : r.entries.length
                ? 30
                : 7) *
              86400000
      );
  }
} catch {
  /* first run */
}
const committed = new Set(records.map((r) => r.id));
const done = new Set(records.map((r) => r.id));
const owners = new Map();
for (const t of temples) {
  const u = publicUrl(t.website_url);
  if (u) {
    const h = new URL(u).hostname.replace(/^www\./, "");
    owners.set(h, (owners.get(h) ?? 0) + 1);
  }
}
const tidy = (s) => s.replace(/\s+/g, " ").trim();
function interesting(text) {
  const sentences = text.split(/(?<=[.!?])\s+(?=[А-ЯЁ«])/).map(tidy);
  return sentences
    .filter(
      (s) =>
        s.length > 50 &&
        s.length < 500 &&
        /святын|чудотвор|частиц.{0,20}мощ|сохрани|архитект|придел|приход|воскресн.{0,15}школ|социальн|молод[её]ж|благотвор|уникальн|иконостас|реликв|реликт/i.test(
          s
        ) &&
        !/©|cookie|персональн|пожертв|купить|20\d{2}\s*год[ау]/i.test(s)
    )
    .slice(0, 2)
    .join(" ")
    .slice(0, 650);
}
async function processTemple(t) {
  const result = {
    id: t.id,
    slug: t.slug,
    checkedAt: new Date().toISOString(),
    sources: [],
    entries: [],
    description: null,
    descriptionSource: null,
    errors: []
  };
  const site = publicUrl(t.website_url),
    shared =
      site &&
      (owners.get(new URL(site).hostname.replace(/^www\./, "")) ?? 0) > 1;
  let summary = t.details.scheduleSummary ?? "",
    primary = t.source_primary_url;
  if (primary) {
    const known = oldSources.find(
      (s) => s.temple_id === t.id && s.url === primary
    );
    // The directory extraction already retained its schedule. Read each full page only when needed.
    try {
      const source = await fetchCached(primary, { maxAgeDays: 180 });
      if (source.body) {
        const full = load(decodeBody(source));
        full("tr").each((_, tr) => {
          const cells = full(tr).find("td,th");
          if (/богослужения/i.test(cells.first().text()))
            summary = tidy(cells.last().text());
        });
        result.sources.push(sourceRow(t, source, "moseparh_card"));
      }
    } catch {
      result.errors.push("DIRECTORY_FAILED");
    }
    result.entries.push(
      ...parseRegularReference(summary, {
        templeId: t.id,
        sourceUrl: primary,
        checkedAt:
          result.sources[0]?.last_checked_at ??
          known?.last_checked_at ??
          t.last_verified_at ??
          new Date().toISOString(),
        confidence: 0.7
      })
    );
  }
  const descriptionParts = [];
  if (
    site &&
    !shared &&
    !/(?:vk\.com|t\.me|youtube\.com)$/i.test(new URL(site).hostname)
  ) {
    const visit = [
      site,
      ...oldSources
        .filter(
          (s) =>
            s.temple_id === t.id &&
            s.source_type === "official_schedule" &&
            s.extraction_method === "html"
        )
        .map((s) => s.url)
        .slice(0, 3)
    ];
    const seen = new Set();
    for (let index = 0; index < visit.length && index < 6; index++) {
      const url = visit[index];
      if (seen.has(url)) continue;
      seen.add(url);
      try {
        const source = await fetchCached(url, { maxAgeDays: 30 });
        result.sources.push(
          sourceRow(
            t,
            source,
            index === 0
              ? "official_site"
              : /истори|about|history|о-храм|o-hram/i.test(url)
                ? "official_about"
                : "official_schedule"
          )
        );
        if (
          !source.body ||
          !/html|text/i.test(source.content_type ?? "text/html")
        )
          continue;
        const page = inspectPage(decodeBody(source), source.final_url ?? url);
        const options = {
          templeId: t.id,
          sourceUrl: url,
          checkedAt: source.last_checked_at,
          official: true
        };
        result.entries.push(
          ...parseScheduleHtml(decodeBody(source), options)
            .filter((e) => e.weekdays)
            .map((e) => ({
              ...e,
              id:
                "regular-" +
                digest(
                  JSON.stringify([t.id, url, e.weekdays, e.starts_at, e.kind])
                ).slice(0, 28),
              status: "REVIEW",
              extraction_method: "regular-reference",
              confidence: 0.75
            }))
        );
        // Parse local prose blocks rather than an entire news page as a weekly rule.
        page.$("p,li,tr").each((_, el) => {
          const text = tidy(page.$(el).text());
          if (
            text.length < 900 &&
            /по воскрес|по будн|ежеднев|по суббот|кажд[а-я ]{0,15}(?:воскрес|суббот)/i.test(
              text
            ) &&
            !page.$(el).parents("nav,footer,header").length
          )
            result.entries.push(
              ...parseRegularReference(text, { ...options, confidence: 0.75 })
            );
        });
        if (index === 0 || /about|history|истори|о-храм|o-hram/i.test(url)) {
          const excerpt = interesting(
            page.$("main,article,.entry-content,.content").first().text() ||
              page.text
          );
          if (excerpt) descriptionParts.push({ text: excerpt, url });
        }
        if (index === 0) {
          const extra = [];
          page.$("a[href]").each((_, el) => {
            const a = page.$(el),
              u = publicUrl(a.attr("href"), source.final_url ?? url);
            if (
              u &&
              new URL(u).hostname ===
                new URL(source.final_url ?? site).hostname &&
              /о храме|о приходе|история храма|святыни|about|history/i.test(
                a.text() + " " + u
              )
            )
              extra.push(u);
          });
          visit.push(
            ...page.links
              .filter(
                (l) =>
                  !l.asset &&
                  /распис|богослуж|schedule|raspis/i.test(
                    l.title + " " + l.url
                  ) &&
                  new URL(l.url).hostname ===
                    new URL(source.final_url ?? site).hostname
              )
              .slice(0, 1)
              .map((l) => l.url),
            ...extra.slice(0, 1)
          );
        }
      } catch {
        result.errors.push("SOURCE_FAILED");
      }
    }
  }
  const best = descriptionParts.find((p) => p.text) || null;
  const fact = interesting(
    t.details.historySummary ?? t.details.description ?? ""
  );
  const services = (t.details.parishServices ?? []).map((s) => s.title);
  // Relations are not inside details in Supabase; obtain factual activities from the snapshot.
  const snapshot = snapshots.get(t.id);
  const activities = snapshot?.parishServices?.map((s) => s.title) ?? services;
  const parish = activities.length
    ? "Приходская жизнь: " +
      activities.slice(0, 4).join(", ").toLowerCase() +
      "."
    : "";
  const desc =
    [best?.text || fact, parish].filter(Boolean).join(" ") ||
    [
      t.name + ".",
      t.address ? "Адрес: " + t.address + "." : "",
      snapshot?.transit?.length
        ? "Ближайшие станции: " +
          snapshot.transit
            .slice(0, 3)
            .map((s) => s.station)
            .join(", ") +
          "."
        : ""
    ]
      .filter(Boolean)
      .join(" ");
  result.description = desc;
  result.descriptionSource = best?.url ?? primary ?? site;
  result.entries = [...new Map(result.entries.map((e) => [e.id, e])).values()];
  if (/монастыр|комплекс/i.test(t.name))
    for (const e of result.entries)
      e.scope_note =
        e.scope_note ??
        "Общее справочное расписание комплекса; конкретное здание уточните в источнике.";
  return result;
}
function sourceRow(t, s, type) {
  return {
    id: "source-" + digest(t.id + s.source_url).slice(0, 24),
    temple_id: t.id,
    url: s.source_url,
    source_type: type,
    priority: type === "moseparh_card" ? 2 : 1,
    is_official: true,
    etag: s.etag ?? null,
    last_modified: s.last_modified ?? null,
    content_hash: s.content_hash ?? null,
    last_checked_at: s.last_checked_at,
    last_changed_at: s.last_changed_at ?? null,
    last_verified_at: s.body ? s.last_checked_at : null,
    http_status: s.http_status,
    confidence: s.body?.length ? 1 : 0,
    extraction_method: "html",
    robots_allowed: s.robots_allowed ?? null
  };
}
const snapshots = new Map(
  JSON.parse(await readFile("data/temples.json", "utf8")).map((t) => [t.id, t])
);
async function persist(batch) {
  if (!apply) return;
  await db.query("begin");
  try {
    for (const [table, raw, key] of [
      ["temple_sources", batch.flatMap((r) => r.sources), "temple_id,url"],
      ["temple_schedule_entries", batch.flatMap((r) => r.entries), "id"]
    ]) {
      const rows = [
        ...new Map(
          raw.map((r) => [
            key
              .split(",")
              .map((k) => r[k])
              .join("|"),
            r
          ])
        ).values()
      ];
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]),
        changes = cols.filter((k) => !key.split(",").includes(k));
      await db.query(
        `insert into public.${table} as old(${cols.join(",")}) select ${cols.join(",")} from jsonb_populate_recordset(null::public.${table},$1::jsonb) on conflict(${key}) do update set ${changes.map((k) => k + "=excluded." + k).join(",")} where row(${changes.map((k) => "old." + k).join(",")}) is distinct from row(${changes.map((k) => "excluded." + k).join(",")})`,
        [JSON.stringify(rows)]
      );
    }
    await db.query(
      "delete from public.temple_schedule_entries where id like 'regular-%' and extraction_method='regular-reference' and status='REVIEW' and temple_id=any($1::text[]) and not(id=any($2::text[]))",
      [batch.map((r) => r.id), batch.flatMap((r) => r.entries.map((e) => e.id))]
    );
    const changes = batch
      .filter(
        (r) =>
          r.description &&
          r.description !==
            temples.find((t) => t.id === r.id).details.description
      )
      .map((r) => ({
        id: r.id,
        description: r.description,
        descriptionSource: r.descriptionSource
      }));
    if (changes.length)
      await db.query(
        "update public.temples t set details=t.details||jsonb_build_object('description',c.description,'descriptionSourceUrl',c.\"descriptionSource\"),updated_at=now() from jsonb_to_recordset($1::jsonb) c(id text,description text,\"descriptionSource\" text) where t.id=c.id",
        [JSON.stringify(changes)]
      );
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}
let pending = [],
  cursor = 0,
  flush = Promise.resolve();
const queue = temples.filter((t) => !done.has(t.id));
async function worker() {
  while (cursor < queue.length) {
    const t = queue[cursor++];
    const r = await processTemple(t);
    records.push(r);
    pending.push(r);
    if (pending.length >= 25) {
      const batch = pending;
      pending = [];
      flush = flush.then(async () => {
        await persist(batch);
        for (const record of batch) committed.add(record.id);
        await writeFile(
          file,
          JSON.stringify({
            mode: apply ? "apply" : "dry-run",
            updatedAt: new Date().toISOString(),
            records: records.filter((r) => committed.has(r.id))
          })
        );
        console.log(
          `[${committed.size}/${temples.length}] weekly: ${records.filter((r) => r.entries.length).length}; descriptions: ${records.filter((r) => r.description).length}`
        );
      });
      await flush;
    }
  }
}
try {
  await Promise.all(Array.from({ length: 6 }, worker));
  await flush;
  await persist(pending);
  await writeFile(
    file,
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      updatedAt: new Date().toISOString(),
      records
    })
  );
  const report = {
    checkedAt: new Date().toISOString(),
    temples: temples.length,
    processed: records.length,
    regularSchedules: records.filter((r) => r.entries.length).length,
    regularEntries: records.reduce((n, r) => n + r.entries.length, 0),
    descriptions: records.filter((r) => r.description).length,
    failedSources: records
      .flatMap((r) => r.sources)
      .filter((s) => s.http_status === 0 || s.http_status >= 400).length,
    errors: records.filter((r) => r.errors.length).length,
    mode: apply ? "apply" : "dry-run"
  };
  await writeFile(
    "data/regular-refresh-report.json",
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(JSON.stringify(report));
  if (apply) {
    const refined = await promisify(execFile)(
      process.execPath,
      ["scripts/refine-descriptions.mjs", "--apply"],
      { env: process.env }
    );
    console.log(refined.stdout.trim());
  }
} finally {
  await db.end();
}
