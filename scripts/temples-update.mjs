import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pg from "pg";
pg.types.setTypeParser(1082, (value) => value);
import {
  fetchCached,
  decodeBody,
  publicUrl,
  digest
} from "./lib/http-cache.mjs";
import {
  inspectPage,
  parseScheduleHtml,
  parseScheduleText
} from "./lib/site-parser.mjs";
const argv = process.argv.slice(2),
  option = (name) =>
    argv
      .find((a) => a.startsWith("--" + name + "="))
      ?.split("=")
      .slice(1)
      .join("=");
const apply = argv.includes("--apply") && !argv.includes("--dry-run"),
  inventory = argv.includes("--inventory");
const root = ".cache/hramgo",
  runFile = root + "/checkpoint.json";
await mkdir(root, { recursive: true });
await mkdir("tmp/backups", { recursive: true });
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  connectionTimeoutMillis: 15000
});
await db.connect();
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
const dataset = {};
for (const table of tables)
  dataset[table] = (await db.query("select * from public." + table)).rows;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await writeFile(
  "tmp/backups/catalog-before-update-" + stamp + ".json",
  JSON.stringify(dataset)
);
const now = Date.now(),
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
const items = dataset.temples.filter((t) => t.status === "PUBLISHED");
const freshSchedules = (t) =>
  dataset.temple_schedule_entries.filter(
    (e) =>
      e.temple_id === t.id &&
      e.status === "VERIFIED" &&
      e.confidence >= 0.8 &&
      Date.parse(e.verified_at) <= now &&
      now - Date.parse(e.last_checked_at ?? e.verified_at) <= 30 * 86400000 &&
      (!e.valid_until || e.valid_until >= today)
  );
const oldSchedules = (t) =>
  dataset.temple_schedule_entries.filter(
    (e) => e.temple_id === t.id && e.status === "VERIFIED"
  );
const photos = (t) =>
  dataset.temple_photos.filter(
    (p) => p.temple_id === t.id && p.status === "APPROVED"
  );
const initial = items
  .map((t) => {
    const issues = [];
    if (!oldSchedules(t).length) issues.push("NO_SCHEDULE");
    else if (!freshSchedules(t).length) issues.push("SCHEDULE_STALE");
    if (!t.website_url) issues.push("NO_OFFICIAL_SITE");
    if (!photos(t).length) issues.push("NO_PHOTO");
    if (t.latitude == null || t.longitude == null)
      issues.push("NO_COORDINATES");
    if (!t.phone && !t.email) issues.push("NO_CONTACTS");
    if (!t.details.description) issues.push("NO_DESCRIPTION");
    const weights = {
      NO_SCHEDULE: 100,
      SCHEDULE_STALE: 90,
      NO_OFFICIAL_SITE: 80,
      NO_PHOTO: 70,
      NO_COORDINATES: 60,
      NO_CONTACTS: 50,
      NO_DESCRIPTION: 40
    };
    return {
      ...t,
      issues,
      priority: Math.max(0, ...issues.map((i) => weights[i]))
    };
  })
  .sort((a, b) => b.priority - a.priority || a.slug.localeCompare(b.slug));
await writeFile(
  root + "/queue.json",
  JSON.stringify(
    initial.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      website: t.website_url,
      priority: t.priority,
      issues: t.issues
    })),
    null,
    2
  )
);
const coverage = {
  temples: items.length,
  officialWebsite: items.filter((t) => t.website_url).length,
  address: items.filter((t) => t.address).length,
  coordinates: items.filter((t) => t.latitude != null && t.longitude != null)
    .length,
  photos: items.filter((t) => photos(t).length).length,
  contacts: items.filter((t) => t.phone || t.email).length,
  freshSchedules: items.filter((t) => freshSchedules(t).length).length
};
console.log(
  JSON.stringify({ inventory: coverage, mode: apply ? "apply" : "dry-run" })
);
if (inventory) {
  await db.end();
  process.exit(0);
}
const completed = new Map();
let previousCheckpoint;
try {
  previousCheckpoint = JSON.parse(await readFile(runFile, "utf8"));
} catch {
  /* first run */
}
if (argv.includes("--resume")) {
  try {
    const checkpoint = JSON.parse(await readFile(runFile, "utf8"));
    if (
      checkpoint.mode === (apply ? "apply" : "dry-run") &&
      now - Date.parse(checkpoint.updatedAt) < 86400000
    )
      for (const entry of checkpoint.records) completed.set(entry.id, entry);
  } catch {
    /* first checkpoint */
  }
}
const discoveries = JSON.parse(
  await readFile("data/discovered-official-sites.json", "utf8")
);
const siteOwners = new Map();
for (const t of items) {
  const u = publicUrl(t.website_url);
  if (u) {
    const k = new URL(u).hostname.replace(/^www\./, "");
    siteOwners.set(k, [...(siteOwners.get(k) ?? []), t.id]);
  }
}
const filter = (t) =>
  (option("temple") ||
    option("from-checkpoint") ||
    argv.includes("--force") ||
    (() => {
      const checked = dataset.temple_sources.filter(
        (s) =>
          s.temple_id === t.id &&
          ["official_site", "official_schedule"].includes(s.source_type)
      );
      const failure = checked.some(
        (s) => s.http_status >= 400 || s.http_status === 0
      );
      const last = Math.max(
        0,
        ...checked.map((s) => Date.parse(s.last_checked_at) || 0),
        Date.parse(
          previousCheckpoint?.records.find((r) => r.id === t.id)?.checkedAt
        ) || 0
      );
      return (
        now - last >
        (failure ? 1 : freshSchedules(t).length ? 30 : 7) * 86400000
      );
    })()) &&
  (t.issues.length ||
    dataset.temple_sources.some(
      (s) =>
        s.temple_id === t.id &&
        (!s.last_checked_at ||
          now - Date.parse(s.last_checked_at) > 30 * 86400000 ||
          s.http_status >= 400)
    )) &&
  (!option("temple") || [t.id, t.slug].includes(option("temple"))) &&
  (!argv.includes("--only-missing-schedules") ||
    t.issues.includes("NO_SCHEDULE")) &&
  (!argv.includes("--only-stale") ||
    t.issues.includes("SCHEDULE_STALE") ||
    dataset.temple_sources.some(
      (s) =>
        s.temple_id === t.id &&
        (!s.last_checked_at ||
          now - Date.parse(s.last_checked_at) > 30 * 86400000 ||
          s.http_status >= 400)
    )) &&
  (!completed.has(t.id) || !argv.includes("--resume"));
const queue = initial.filter(filter).slice(0, Number(option("limit") ?? 10000)),
  pending = [];
let checkpointInput;
if (option("from-checkpoint"))
  checkpointInput = new Map(
    JSON.parse(await readFile(option("from-checkpoint"), "utf8")).records.map(
      (r) => [r.id, r]
    )
  );
let cursor = 0,
  done = 0,
  flushing = Promise.resolve();
const sourceRecord = (t, s, kind, method) => ({
  id: "source-" + digest(t.id + s.source_url).slice(0, 24),
  temple_id: t.id,
  url: s.source_url,
  source_type: kind,
  etag: s.etag ?? null,
  last_modified: s.last_modified ?? null,
  content_hash: s.content_hash ?? null,
  last_checked_at: s.last_checked_at,
  last_changed_at: s.last_changed_at ?? null,
  last_verified_at: s.body ? s.last_checked_at : null,
  http_status: s.http_status,
  confidence: s.body ? 1 : 0,
  priority: kind === "official_schedule" ? 1 : 2,
  is_official: true,
  source_published_at: null,
  extraction_method: method,
  robots_allowed: s.robots_allowed ?? null
});
async function investigate(t) {
  const result = {
    id: t.id,
    slug: t.slug,
    name: t.name,
    issues: [...t.issues],
    sources: [],
    schedules: [],
    changes: [],
    socials: [],
    checkedAt: new Date().toISOString()
  };
  const discovery = !t.website_url
    ? discoveries.find((s) => s.sourcePrimaryUrl === t.source_primary_url)
    : null;
  const site = publicUrl(t.website_url ?? discovery?.website);
  if (discovery)
    result.changes.push({
      field: "website_url",
      old: null,
      new: site,
      source: discovery.evidence
    });
  if (!site) {
    result.issues.push("NEEDS_SITE_DISCOVERY");
    return result;
  }
  if (
    /(?:vk\.com|t\.me|youtube\.com|facebook\.com|instagram\.com)$/i.test(
      new URL(site).hostname
    )
  ) {
    result.issues.push("OFFICIAL_SOCIAL_REQUIRES_REVIEW");
    return result;
  }
  const home = await fetchCached(site, {
    maxAgeDays: freshSchedules(t).length ? 30 : 7
  });
  result.sources.push(sourceRecord(t, home, "official_site", "html"));
  if (!home.body) {
    result.issues.push(
      home.error === "ROBOTS_DISALLOWED" ? "ROBOTS_DISALLOWED" : "SOURCE_DEAD"
    );
    return result;
  }
  const html = decodeBody(home),
    page = inspectPage(html, home.final_url ?? site);
  result.sources[0].source_published_at=page.published;
  const shared =
    (siteOwners.get(new URL(site).hostname.replace(/^www\./, "")) ?? [])
      .length > 1;
  const consent =
    /автоматизированн.*(?:запрещ|недопуст)|запрещ.*(?:парсинг|сбор данных)/i.test(
      page.text.slice(-10000)
    );
  if (consent) {
    result.issues.push("AUTOMATED_ACCESS_RESTRICTED");
    return result;
  }
  const origin = new URL(home.final_url ?? site).origin;
  const sourceOptions = (url, checkedAt) => ({
    templeId: t.id,
    sourceUrl: url,
    checkedAt,
    official: true
  });
  if (!shared) {
    if (!t.phone && page.phones.length === 1)
      result.changes.push({
        field: "phone",
        old: t.phone,
        new: page.phones[0],
        source: site
      });
    if (!t.email && page.emails.length === 1)
      result.changes.push({
        field: "email",
        old: t.email,
        new: page.emails[0],
        source: site
      });
    if (t.latitude == null && page.coordinates.length === 1)
      result.changes.push({
        field: "coordinates",
        old: null,
        new: page.coordinates[0],
        source: site
      });
  }
  result.schedules.push(
    ...parseScheduleHtml(html, sourceOptions(site, home.last_checked_at)).map(
      (e) => ({
        ...e,
        status:
          e.service_date && !/распис|schedule/i.test(page.title)
            ? "REVIEW"
            : e.status,
        source_published_at: page.published
      })
    )
  );
  const links = page.links
    .filter((l) => new URL(l.url).origin === origin || l.asset)
    .slice(0, Number(option("pages") ?? 4));
  const contactLinks = [];
  const $ = page.$;
  $("a[href]").each((_, el) => {
    const a = $(el),
      u = publicUrl(a.attr("href"), home.final_url ?? site);
    if (
      u &&
      new URL(u).origin === origin &&
      /контакт|contact/i.test(a.text() + " " + u)
    )
      contactLinks.push(u);
  });
  const visit = [
    ...new Set([
      ...links.map((l) => l.url),
      ...(!t.phone || !t.email ? contactLinks.slice(0, 1) : [])
    ])
  ];
  const visited = new Set([site]);
  for (const url of visit) {
    if (visited.has(url) || visited.size >= 9) continue;
    visited.add(url);
    if (url === site) continue;
    const source = await fetchCached(url, { maxAgeDays: 7 });
    const isPdf =
      /pdf/i.test(source.content_type ?? "") || /\.pdf(?:[?#]|$)/i.test(url);
    const image =
      /image\//i.test(source.content_type ?? "") ||
      /\.(jpe?g|png)(?:[?#]|$)/i.test(url);
    const doc = /\.(docx?)(?:[?#]|$)/i.test(url);
    result.sources.push(
      sourceRecord(
        t,
        source,
        "official_schedule",
        isPdf ? "pdf-text" : image ? "image" : doc ? "word" : "html"
      )
    );
    if (!source.body) {
      if (source.http_status >= 400) result.issues.push("SCHEDULE_SOURCE_DEAD");
      continue;
    }
    if (image) {
      const file = root + "/http/" + digest(url) + ".bin",
        textFile = root + "/http/" + source.content_hash + ".ocr.txt";
      let text;
      try {
        text = await readFile(textFile, "utf8");
      } catch {
        if (process.platform !== "win32") {
          result.issues.push("IMAGE_SCHEDULE_NEEDS_OCR");
          continue;
        }
        try {
          const script = await readFile(
            "scripts/extract-schedule-image.ps1",
            "utf8"
          );
          const r = await promisify(execFile)(
            "powershell.exe",
            [
              "-NoProfile",
              "-Command",
              "& {\n" + script + "\n} -Path $env:HRAMGO_OCR_FILE"
            ],
            {
              env: { ...process.env, HRAMGO_OCR_FILE: file },
              maxBuffer: 2 * 1024 * 1024,
              timeout: 30000
            }
          );
          text = r.stdout;
          await writeFile(textFile, text);
        } catch {
          result.issues.push("IMAGE_SCHEDULE_NEEDS_OCR");
          continue;
        }
      }
      const entries = parseScheduleText(text, {
        ...sourceOptions(url, source.last_checked_at),
        method: "windows-ocr"
      }).map((e) => ({ ...e, status: "REVIEW", confidence: 0.7 }));
      result.schedules.push(...entries);
      result.issues.push("IMAGE_SCHEDULE_NEEDS_VISUAL_REVIEW");
      continue;
    }
    if (
      doc &&
      !/docx/i.test(source.content_type ?? "") &&
      !/\.docx(?:[?#]|$)/i.test(url)
    ) {
      result.issues.push("WORD_SCHEDULE_NEEDS_EXTRACTION");
      continue;
    }
    if (isPdf || doc) {
      const file = root + "/http/" + digest(url) + ".bin",
        textFile = root + "/http/" + source.content_hash + ".txt";
      let text;
      try {
        text = await readFile(textFile, "utf8");
      } catch {
        try {
          const python = process.env.HRAMGO_PYTHON ?? "python";
          const r = await promisify(execFile)(
            python,
            ["scripts/extract-schedule-pdf.py", file],
            { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }
          );
          text = r.stdout;
          await writeFile(textFile, text);
        } catch {
          result.issues.push("PDF_EXTRACTION_FAILED");
          continue;
        }
      }
      if (text.trim().length < 50) {
        result.issues.push("SCANNED_PDF_NEEDS_OCR");
        continue;
      }
      result.schedules.push(
        ...parseScheduleText(text, {
          ...sourceOptions(url, source.last_checked_at),
          method: doc ? "docx-text" : "pdf-text"
        })
      );
    } else {
      const body = decodeBody(source),
        sub = inspectPage(body, source.final_url ?? url);
      result.sources[result.sources.length-1].source_published_at=sub.published;
      result.schedules.push(
        ...parseScheduleHtml(
          body,
          sourceOptions(url, source.last_checked_at)
        ).map((e) => ({
          ...e,
          status:
            e.service_date && !/распис|schedule/i.test(sub.title)
              ? "REVIEW"
              : e.status,
          source_published_at: sub.published
        }))
      );
      for (const child of sub.links
        .filter((l) => l.asset && l.score >= 80)
        .slice(0, 2))
        if (!visited.has(child.url) && !visit.includes(child.url))
          visit.push(child.url);
      if (contactLinks.includes(url)) {
        if (!t.phone && sub.phones.length === 1)
          result.changes.push({
            field: "phone",
            old: t.phone,
            new: sub.phones[0],
            source: url
          });
        if (!t.email && sub.emails.length === 1)
          result.changes.push({
            field: "email",
            old: t.email,
            new: sub.emails[0],
            source: url
          });
      }
      if (
        !shared &&
        t.latitude == null &&
        sub.coordinates.length === 1 &&
        contactLinks.includes(url)
      )
        result.changes.push({
          field: "coordinates",
          old: null,
          new: sub.coordinates[0],
          source: url
        });
    }
  }
  result.schedules = [
    ...new Map(result.schedules.map((e) => [e.id, e])).values()
  ].map((e) => ({ ...e, source_published_at: e.source_published_at ?? null }));
  for (const entry of result.schedules) {
    // Generic weekly prose and file layouts need a source review before publication.
    if (entry.weekdays || entry.extraction_method !== "html")
      entry.status = "REVIEW";
    if (shared) {
      entry.status = "REVIEW";
      entry.confidence = Math.min(0.6, entry.confidence);
      entry.scope_note =
        "Один официальный URL связан с несколькими храмами; требуется подтверждение принадлежности.";
    }
    if (
      entry.service_date &&
      (entry.service_date < today ||
        Date.parse(entry.service_date) > now + 120 * 86400000)
    ) {
      entry.status = "REVIEW";
      result.issues.push("SCHEDULE_OUTSIDE_CURRENT_PERIOD");
    }
  }
  result.socials = shared ? [] : page.socials;
  result.changes = [
    ...new Map(result.changes.map((c) => [c.field, c])).values()
  ];
  result.changes = result.changes.filter(
    (c) =>
      c.field !== "email" ||
      !/^(?:sales|support|webmaster|noreply|no-reply|admin|info@ostankino)/i.test(
        c.new
      )
  );
  if (result.schedules.some((e) => e.status === "VERIFIED"))
    result.issues = result.issues.filter(
      (i) => !["NO_SCHEDULE", "SCHEDULE_STALE"].includes(i)
    );
  if (result.schedules.some((e) => e.status === "REVIEW"))
    result.issues.push("NEEDS_MANUAL_REVIEW");
  result.issues = [...new Set(result.issues)];
  return result;
}
async function reparseSaved(t, previous) {
  if (!previous) return investigate(t);
  const result = { ...previous, schedules: [] };
  result.changes = result.changes.filter(
    (c) =>
      c.field !== "email" ||
      !/^(?:sales|support|webmaster|noreply|no-reply|admin)/i.test(c.new)
  );
  for (const source of result.sources) {
    if (!source.content_hash) continue;
    const options = {
      templeId: t.id,
      sourceUrl: source.url,
      checkedAt: source.last_checked_at,
      official: true
    };
    if (source.extraction_method === "html") {
      const body = await readFile(
          root + "/http/" + digest(source.url) + ".bin"
        ),
        meta = JSON.parse(
          await readFile(root + "/http/" + digest(source.url) + ".json", "utf8")
        );
      const html = decodeBody({ ...meta, body });
      const page = inspectPage(html, source.url);
      result.schedules.push(
        ...parseScheduleHtml(html, options).map((e) => ({
          ...e,
          source_published_at: page.published,
          status:
            e.service_date && !/распис|schedule/i.test(page.title)
              ? "REVIEW"
              : e.status
        }))
      );
    } else {
      const suffix = source.extraction_method === "image" ? ".ocr.txt" : ".txt";
      try {
        const text = await readFile(
          root + "/http/" + source.content_hash + suffix,
          "utf8"
        );
        result.schedules.push(
          ...parseScheduleText(text, {
            ...options,
            method:
              source.extraction_method === "image"
                ? "windows-ocr"
                : source.extraction_method === "word"
                  ? "docx-text"
                  : "pdf-text"
          }).map((e) => ({ ...e, status: "REVIEW", confidence: 0.75 }))
        );
      } catch {
        /* extraction issue already recorded */
      }
    }
  }
  const site = publicUrl(
    t.website_url ?? result.changes.find((c) => c.field === "website_url")?.new
  );
  const shared =
    site &&
    (siteOwners.get(new URL(site).hostname.replace(/^www\./, "")) ?? [])
      .length > 1;
  for (const e of result.schedules) {
    e.source_published_at ??= null;
    if (
      e.weekdays ||
      e.extraction_method !== "html" ||
      shared ||
      e.service_date < today ||
      Date.parse(e.service_date) > now + 120 * 86400000
    )
      e.status = "REVIEW";
    if (shared) {
      e.confidence = Math.min(e.confidence, 0.6);
      e.scope_note =
        "Общий сайт нескольких объектов; принадлежность требует проверки.";
    }
  }
  result.schedules = [
    ...new Map(
      result.schedules.map((e) => [
        JSON.stringify([
          e.service_date,
          e.weekdays,
          e.starts_at,
          e.kind,
          e.title
        ]),
        e
      ])
    ).values()
  ];
  result.issues = result.issues.filter(
    (i) => !["NO_SCHEDULE", "SCHEDULE_STALE", "NEEDS_MANUAL_REVIEW"].includes(i)
  );
  if (!result.schedules.some((e) => e.status === "VERIFIED"))
    result.issues.push("NO_SCHEDULE");
  if (result.schedules.some((e) => e.status === "REVIEW"))
    result.issues.push("NEEDS_MANUAL_REVIEW");
  return result;
}
async function persist(batch) {
  if (!apply)
    for (const record of batch)
      for (const change of record.changes)
        console.log(JSON.stringify({ temple: record.slug, ...change }));
  if (apply) {
    await db.query("begin");
    try {
      const sources = batch.flatMap((r) => r.sources),
        schedules = batch.flatMap((r) => r.schedules);
      // Supersede only this parser's records for changed, successfully downloaded sources.
      const reparsed = sources.filter(
        (s) =>
          s.content_hash &&
          s.content_hash !==
            dataset.temple_sources.find(
              (old) => old.temple_id === s.temple_id && old.url === s.url
            )?.content_hash
      );
      if (reparsed.length)
        await db.query(
          `update public.temple_schedule_entries e set status='REVIEW' where (e.id like 'parsed-%' or e.id like 'reviewed-%') and exists(select 1 from jsonb_to_recordset($1::jsonb) as s(temple_id text,url text) where s.temple_id=e.temple_id and s.url=e.source_url) and not(e.id=any($2::text[]))`,
          [JSON.stringify(reparsed), schedules.map((e) => e.id)]
        );
      for (const [table, rows, conflict] of [
        ["temple_sources", sources, "temple_id,url"],
        ["temple_schedule_entries", schedules, "id"]
      ]) {
        if (!rows.length) continue;
        const unique = [
          ...new Map(
            rows.map((r) => [
              conflict
                .split(",")
                .map((k) => r[k])
                .join("|"),
              r
            ])
          ).values()
        ];
        const columns = Object.keys(unique[0]),
          changed = columns.filter((k) => !conflict.split(",").includes(k));
        const updates = changed.map((k) => `${k}=excluded.${k}`).join(",");
        await db.query(
          `insert into public.${table} as target(${columns.join(",")}) select ${columns.join(",")} from jsonb_populate_recordset(null::public.${table},$1::jsonb) on conflict(${conflict}) do update set ${updates} where row(${changed.map((k) => "target." + k).join(",")}) is distinct from row(${changed.map((k) => "excluded." + k).join(",")})`,
          [JSON.stringify(unique)]
        );
      }
      const socials = batch.flatMap((r) =>
        r.socials.map((s) => ({
          id: "social-" + digest(r.id + s.url).slice(0, 24),
          temple_id: r.id,
          url: s.url,
          label: s.type === "vk" ? "VK" : "Telegram",
          type: s.type,
          source_url: r.sources[0]?.url ?? null
        }))
      );
      if (socials.length)
        await db.query(
          `insert into public.temple_social_links(id,temple_id,url,label,type,source_url) select id,temple_id,url,label,type,source_url from jsonb_to_recordset($1::jsonb) as s(id text,temple_id text,url text,label text,type text,source_url text) on conflict(temple_id,url) do nothing`,
          [JSON.stringify(socials)]
        );
      for (const r of batch)
        for (const change of r.changes) {
          if (change.field === "coordinates")
            await db.query(
              "update public.temples set latitude=$2,longitude=$3,updated_at=now() where id=$1 and latitude is null and longitude is null",
              [r.id, change.new.latitude, change.new.longitude]
            );
          else {
            if (!["phone", "email", "website_url"].includes(change.field))
              throw new Error("Unsupported field");
            await db.query(
              `update public.temples set ${change.field}=$2,updated_at=now() where id=$1 and ${change.field} is not distinct from $3 and ${change.field} is distinct from $2`,
              [r.id, change.new, change.old]
            );
          }
          await db.query(
            "insert into public.temple_field_evidence(id,temple_id,field_name,value,source_url,confidence,last_checked_at) values($1,$2,$3,$4,$5,1,$6) on conflict(id) do nothing",
            [
              "evidence-" +
                digest(
                  r.id +
                    change.field +
                    JSON.stringify(change.new) +
                    change.source
                ).slice(0, 28),
              r.id,
              change.field,
              typeof change.new === "object"
                ? JSON.stringify(change.new)
                : change.new,
              change.source,
              r.checkedAt
            ]
          );
        }
      await db.query("commit");
    } catch (error) {
      await db.query("rollback");
      throw error;
    }
  }
  for (const r of batch) completed.set(r.id, r);
  await writeFile(
    runFile,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      mode: apply ? "apply" : "dry-run",
      records: [...completed.values()]
    })
  );
  await writeFile(
    root + "/issues.json",
    JSON.stringify(
      [...completed.values()]
        .filter((r) => r.issues.length)
        .map((r) => ({ id: r.id, slug: r.slug, issues: r.issues })),
      null,
      2
    )
  );
}
async function worker() {
  while (cursor < queue.length) {
    const t = queue[cursor++];
    let result;
    try {
      result = checkpointInput
        ? await reparseSaved(t, checkpointInput.get(t.id))
        : await investigate(t);
    } catch (error) {
      result = {
        id: t.id,
        slug: t.slug,
        issues: [...t.issues, "SOURCE_FAILED"],
        error: error.message.slice(0, 150),
        sources: [],
        schedules: [],
        changes: [],
        socials: []
      };
    }
    pending.push(result);
    done++;
    if (done % 25 === 0 || done === queue.length) {
      const batch = pending.splice(0);
      flushing = flushing.then(() => persist(batch));
      await flushing;
      console.log(
        `[${done}/${queue.length}] checkpoint; schedules ${[...completed.values()].reduce((n, r) => n + r.schedules.filter((e) => e.status === "VERIFIED").length, 0)}`
      );
    }
  }
}
try {
  await Promise.all(
    Array.from(
      { length: Math.min(8, Number(option("concurrency") ?? 6)) },
      () => worker()
    )
  );
  await flushing;
  if (pending.length) await persist(pending.splice(0));
  console.log(
    JSON.stringify({
      processed: completed.size,
      schedules: [...completed.values()]
        .flatMap((r) => r.schedules)
        .filter((e) => e.status === "VERIFIED").length,
      updatedFields: [...completed.values()].reduce(
        (n, r) => n + r.changes.length,
        0
      ),
      issues: [...completed.values()].filter((r) => r.issues.length).length
    })
  );
} finally {
  await db.end();
}
