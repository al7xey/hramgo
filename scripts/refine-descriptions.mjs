import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { digest, decodeBody } from "./lib/http-cache.mjs";
import { inspectPage } from "./lib/site-parser.mjs";
import { factualSentences } from "./lib/factual-sentences.mjs";
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const temples = (
    await db.query(
      "select id,name,address,source_primary_url,details from public.temples where status='PUBLISHED'"
    )
  ).rows;
  const snapshot = new Map(
    JSON.parse(await readFile("data/temples.json", "utf8")).map((t) => [
      t.id,
      t
    ])
  );
  const checkpoint = new Map(
    JSON.parse(
      await readFile(".cache/hramgo/regular-checkpoint.json", "utf8")
    ).records.map((r) => [r.id, r])
  );
  await writeFile(
    "tmp/backups/before-description-refinement-" + Date.now() + ".json",
    JSON.stringify(temples)
  );
  const rows = [];
  const features =
    /святын|чудотвор|частиц.{0,20}мощ|сохрани|архитект|придел|иконостас|барокко|шатров|мозаик|роспис|реликв|памятник|колокол|благотвор|надврат|зодч/i;
  for (const t of temples) {
    const current = t.details.description ?? "";
    let own = false,
      source = t.source_primary_url;
    const parts = [];
    for (const page of checkpoint.get(t.id)?.sources ?? []) {
      if (
        page.http_status >= 400 ||
        !page.content_hash ||
        !/about|history|istori|o-hram|svyaty|shrine|zhizn/i.test(page.url)
      )
        continue;
      try {
        const meta = JSON.parse(
          await readFile(
            ".cache/hramgo/http/" + digest(page.url) + ".json",
            "utf8"
          )
        );
        const body = await readFile(
          ".cache/hramgo/http/" + digest(page.url) + ".bin"
        );
        const parsed = inspectPage(decodeBody({ ...meta, body }), page.url);
        parsed
          .$("main p,article p,.entry-content p,.content p")
          .each((_, el) => {
            const text = parsed.$(el).text().replace(/\s+/g, " ").trim();
            if (
              text.length > 60 &&
              text.length < 550 &&
              features.test(text) &&
              !/^Точных сведений|^Косвенно это|^Это |^\d{4}\s|cookie|Сен \d|Окт \d|сегодня|вчера|прошедш/i.test(
                text
              )
            )
              parts.push(text);
          });
        if (parts.length) {
          own = true;
          source = page.url;
          break;
        }
      } catch {
        /* use preserved history */
      }
    }
    const history = factualSentences(t.details.historySummary ?? "").filter(
      (s) =>
        s.length > 55 &&
        s.length < 550 &&
        !/^Точных сведений|^Косвенно это|^Это /i.test(s)
    );
    const interesting = history.filter((s) => features.test(s));
    const fallback = history.filter(
      (s) => !/основан|открытие|освящ[её]н|восстановительных работ/i.test(s)
    );
    const facts = (
      own ? parts : interesting.length ? interesting : fallback
    ).slice(0, 2);
    const activities =
      snapshot.get(t.id)?.parishServices?.map((s) => s.title) ?? [];
    const parish = activities.length
      ? "Приходская жизнь: " +
        activities.slice(0, 4).join(", ").toLowerCase() +
        "."
      : "";
    const description =
      [...new Set([...facts, parish].filter(Boolean))].join(" ") ||
      [t.name + ".", t.address ? "Адрес: " + t.address + "." : ""]
        .filter(Boolean)
        .join(" ");
    if (description !== current) rows.push({ id: t.id, description, source });
  }
  if (process.argv.includes("--apply") && rows.length)
    await db.query(
      "update public.temples t set details=t.details||jsonb_build_object('description',c.description,'descriptionSourceUrl',c.source),updated_at=now() from jsonb_to_recordset($1::jsonb) c(id text,description text,source text) where t.id=c.id and t.details->>'description' is distinct from c.description",
      [JSON.stringify(rows)]
    );
  console.log(
    JSON.stringify({
      temples: temples.length,
      refined: rows.length,
      httpRequests: 0
    })
  );
} finally {
  await db.end();
}
