// Deepen only missing parish schedules; use cached official pages before new requests.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import {
  fetchCached,
  decodeBody,
  digest,
  publicUrl
} from "./lib/http-cache.mjs";
import { inspectPage } from "./lib/site-parser.mjs";
import { parseParishRegularHtml } from "./lib/parish-regular.mjs";

const apply =
  process.argv.includes("--apply") && !process.argv.includes("--dry-run");
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  connectionTimeoutMillis: 15000
});
await db.connect();
try {
  const temples = (
    await db.query(
      "select * from public.temples where status='PUBLISHED' order by slug"
    )
  ).rows;
  const old = (await db.query("select * from public.temple_schedule_entries"))
    .rows;
  const sources = (await db.query("select * from public.temple_sources")).rows;
  await mkdir("tmp/backups", { recursive: true });
  await writeFile(
    `tmp/backups/before-parish-schedules-${Date.now()}.json`,
    JSON.stringify({ temples, old, sources })
  );
  const discovered = JSON.parse(
    await readFile("data/discovered-official-sites.json", "utf8")
  );
  const overrides = new Map(discovered.map((r) => [r.sourcePrimaryUrl, r]));
  const host = (url) => new URL(url).hostname.replace(/^www\./, "");
  const owners = new Map();
  for (const t of temples) {
    const url = publicUrl(
      overrides.get(t.source_primary_url)?.website ?? t.website_url
    );
    if (url) owners.set(host(url), (owners.get(host(url)) ?? 0) + 1);
  }
  const checkpointPath = ".cache/hramgo/parish-schedules.json";
  let done = [];
  try {
    done = JSON.parse(await readFile(checkpointPath, "utf8")).records.filter(
      (r) =>
        r.applied === apply &&
        Date.now() - Date.parse(r.checkedAt) < 7 * 86400000
    );
  } catch {
    /* first pass */
  }
  done = done.filter((r) => {
    const temple = temples.find((t) => t.id === r.id);
    return (
      temple &&
      r.site ===
        publicUrl(
          overrides.get(temple.source_primary_url)?.website ??
            temple.website_url
        )
    );
  });
  const selectedSlug = process.argv
    .find((a) => a.startsWith("--temple="))
    ?.slice(9);
  const repairTargets = new Map(
    done
      .filter((r) =>
        selectedSlug
          ? r.slug === selectedSlug
          : process.argv.includes("--reparse-cached") || r.entries.length
      )
      .map((r) => [r.id, r])
  );
  const reparse =
    process.argv.includes("--reparse-found") ||
    process.argv.includes("--reparse-cached");
  if (reparse) done = done.filter((r) => !repairTargets.has(r.id));
  const completed = new Set(done.map((r) => r.id));
  const queue = temples.filter((t) => {
    if (reparse) return repairTargets.has(t.id);
    const site = publicUrl(
      overrides.get(t.source_primary_url)?.website ?? t.website_url
    );
    if (
      !site ||
      owners.get(host(site)) > 1 ||
      /^(vk\.com|t\.me|youtube\.com)$/i.test(host(site))
    )
      return false;
    return (
      !completed.has(t.id) &&
      !old.some(
        (e) =>
          e.temple_id === t.id &&
          !e.service_date &&
          e.weekdays?.length &&
          e.confidence >= 0.75 &&
          e.source_url &&
          host(e.source_url) === host(site) &&
          Date.now() - Date.parse(e.last_checked_at ?? e.verified_at) <
            30 * 86400000
      )
    );
  });
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      temples: temples.length,
      officialSiteQueue: queue.length,
      skippedFresh: temples.length - queue.length
    })
  );
  let cursor = 0,
    pending = [],
    flush = Promise.resolve();
  async function processTemple(t) {
    const discovery = overrides.get(t.source_primary_url);
    const site = publicUrl(discovery?.website ?? t.website_url);
    const visit = reparse
      ? repairTargets.get(t.id).sources.map((s) => s.url)
      : [
          site,
          ...sources
            .filter(
              (s) =>
                s.temple_id === t.id &&
                s.source_type === "official_schedule" &&
                s.extraction_method === "html" &&
                host(s.url) === host(site)
            )
            .map((s) => s.url)
            .slice(0, 2)
        ];
    const seen = new Set(),
      fetched = [],
      entries = [],
      assets = [];
    let requests = 0;
    for (let index = 0; index < visit.length && seen.size < 6; index++) {
      const url = visit[index];
      if (seen.has(url)) continue;
      seen.add(url);
      try {
        let source;
        if (reparse) {
          try {
            const meta = JSON.parse(
              await readFile(
                ".cache/hramgo/http/" + digest(url) + ".json",
                "utf8"
              )
            );
            source = {
              ...meta,
              body: meta.content_hash
                ? await readFile(".cache/hramgo/http/" + digest(url) + ".bin")
                : null,
              cached: true
            };
          } catch {
            continue;
          }
        } else source = await fetchCached(url, { maxAgeDays: 30 });
        if (!source.cached) requests++;
        fetched.push({
          id: "source-" + digest(t.id + url).slice(0, 24),
          temple_id: t.id,
          url,
          source_type: index ? "official_schedule" : "official_site",
          priority: 1,
          is_official: true,
          etag: source.etag ?? null,
          last_modified: source.last_modified ?? null,
          content_hash: source.content_hash ?? null,
          last_checked_at: source.last_checked_at,
          last_changed_at: source.last_changed_at ?? null,
          last_verified_at: source.body ? source.last_checked_at : null,
          http_status: source.http_status,
          confidence: source.body ? 1 : 0,
          extraction_method: "html",
          robots_allowed: source.robots_allowed ?? null
        });
        if (
          !source.body ||
          !/html|text/i.test(source.content_type ?? "text/html")
        )
          continue;
        const html = decodeBody(source),
          page = inspectPage(html, source.final_url ?? url);
        const options = {
          templeId: t.id,
          sourceUrl: url,
          checkedAt: source.last_checked_at,
          official: true,
          confidence: 0.75
        };
        entries.push(
          ...parseParishRegularHtml(html, options).map((e) => ({
            ...e,
            id:
              "regular-" +
              digest(
                JSON.stringify([t.id, url, e.weekdays, e.starts_at, e.kind])
              ).slice(0, 28)
          }))
        );
        const links = page.links.filter(
          (l) =>
            host(l.url) === host(source.final_url ?? site) &&
            l.score >= 80 &&
            !new URL(l.url).searchParams.has("share")
        );
        assets.push(...links.filter((l) => l.asset).map((l) => l.url));
        if (!reparse)
          visit.push(
            ...links
              .filter((l) => !l.asset && !seen.has(l.url))
              .slice(0, index ? 1 : 3)
              .map((l) => l.url)
          );
      } catch {
        /* persist errors from successful sources and continue other pages */
      }
    }
    const unique = [...new Map(entries.map((e) => [e.id, e])).values()];
    if (/монастыр|комплекс|подворье/i.test(t.name))
      for (const e of unique)
        e.scope_note ??=
          "Общее расписание комплекса; конкретный храм уточните в источнике.";
    return {
      id: t.id,
      slug: t.slug,
      checkedAt: new Date().toISOString(),
      applied: apply,
      site,
      siteEvidence: discovery?.evidence ?? null,
      sources: fetched,
      entries: unique,
      assets: [...new Set(assets)],
      requests: requests + (reparse ? repairTargets.get(t.id).requests : 0)
    };
  }
  async function persist(batch) {
    if (apply) {
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
            changes = cols.filter((c) => !key.split(",").includes(c));
          await db.query(
            `insert into public.${table} as old(${cols.join(",")}) select ${cols.join(",")} from jsonb_populate_recordset(null::public.${table},$1::jsonb) on conflict(${key}) do update set ${changes.map((c) => c + "=excluded." + c).join(",")} where row(${changes.map((c) => "old." + c).join(",")}) is distinct from row(${changes.map((c) => "excluded." + c).join(",")})`,
            [JSON.stringify(rows)]
          );
        }
        for (const r of batch.filter((r) => r.siteEvidence))
          await db.query(
            "update public.temples set website_url=$2,updated_at=now() where id=$1 and website_url is distinct from $2",
            [r.id, r.site]
          );
        if (reparse) {
          const replaced = batch.flatMap(
            (r) => repairTargets.get(r.id)?.entries.map((e) => e.id) ?? []
          );
          const kept = batch.flatMap((r) => r.entries.map((e) => e.id));
          await db.query(
            "delete from public.temple_schedule_entries where id=any($1::text[]) and not(id=any($2::text[])) and status='REVIEW' and extraction_method='regular-reference'",
            [replaced, kept]
          );
        }
        await db.query("commit");
      } catch (error) {
        await db.query("rollback");
        throw error;
      }
    }
    done.push(...batch);
    await writeFile(checkpointPath, JSON.stringify({ records: done }));
    console.log(
      `[${done.length}/${temples.length}] parish schedules: ${done.filter((r) => r.entries.length).length}; fetched: ${done.reduce((n, r) => n + r.requests, 0)}`
    );
  }
  async function worker() {
    while (cursor < queue.length) {
      const record = await processTemple(queue[cursor++]);
      pending.push(record);
      if (pending.length >= 25) {
        const batch = pending;
        pending = [];
        flush = flush.then(() => persist(batch));
        await flush;
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  await flush;
  if (pending.length) await persist(pending);
  const report = {
    checkedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    processed: done.length,
    withOfficialWeeklySchedule: done.filter((r) => r.entries.length).length,
    entries: done.reduce((n, r) => n + r.entries.length, 0),
    fetchedPages: done.reduce((n, r) => n + r.requests, 0),
    scheduleAssetsForReview: done
      .filter((r) => r.assets.length && !r.entries.length)
      .map((r) => ({ slug: r.slug, urls: r.assets }))
  };
  await writeFile(
    "data/parish-schedule-report.json",
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(
    JSON.stringify({
      ...report,
      scheduleAssetsForReview: report.scheduleAssetsForReview.length
    })
  );
} finally {
  await db.end();
}
