import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { load } from "cheerio";
import { fetchCached, decodeBody } from "./lib/http-cache.mjs";
const temples = JSON.parse(await readFile("data/temples.json", "utf8"));
const affected = temples.filter((t) =>
  t.photos.some(
    (p) =>
      /sprav\.moseparh\.ru\/img\/temp\//.test(p.imageUrl) ||
      p.imageUrl.includes("media-img-e1613384176712.png")
  )
);
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const ids = affected.flatMap((t) => t.photos.map((p) => p.id));
  const old = (
    await db.query(
      "select * from public.temple_photos where id=any($1::text[])",
      [ids]
    )
  ).rows;
  await writeFile(
    `tmp/backups/before-placeholder-photos-${Date.now()}.json`,
    JSON.stringify(old)
  );
  const results = [];
  for (const t of affected) {
    const source = await fetchCached(t.sourcePrimaryUrl, { maxAgeDays: 180 });
    const $ = source.body ? load(decodeBody(source)) : null;
    const organisation = new URL(t.sourcePrimaryUrl).pathname.split("/").at(-1);
    const image = $?.(`img[src*="/uploads/organisations/${organisation}/"]`)
      .first()
      .attr("src");
    const replacement = image
      ? new URL(image, t.sourcePrimaryUrl).href.replace("/thumb_", "/")
      : null;
    for (const p of t.photos) {
      if (replacement)
        await db.query(
          "update public.temple_photos set image_url=$1,source_url=$2 where id=$3 and (image_url is distinct from $1 or source_url is distinct from $2)",
          [replacement, t.sourcePrimaryUrl, p.id]
        );
      else
        await db.query(
          "update public.temple_photos set status='REJECTED' where id=$1 and status is distinct from 'REJECTED'",
          [p.id]
        );
    }
    results.push({
      templeId: t.id,
      name: t.name,
      status: replacement
        ? "REPLACED_FROM_DIRECTORY"
        : "REMOVED_BROKEN_PLACEHOLDER",
      imageUrl: replacement
    });
  }
  await writeFile(
    "data/placeholder-photo-report.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), records: results },
      null,
      2
    ) + "\n"
  );
  console.log(
    JSON.stringify({
      processed: results.length,
      replaced: results.filter((r) => r.imageUrl).length,
      removed: results.filter((r) => !r.imageUrl).length
    })
  );
} finally {
  await db.end();
}
