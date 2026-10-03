import { writeFile } from "node:fs/promises";
import pg from "pg";
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
const pairs = {
  danilov: ["cmqmxwxkr002zmr6qvrii42zk", "cmrmecnyx02pfmr3uykksmhwa"],
  pokrov: ["cmqmxx6fb0041mr6qxmang4th", "cmrmecy1k0624mr3uljgmg5oe"],
  petrov: ["cmqmxx2oc003hmr6qhrjdk4b9", "cmrmecn3n02g2mr3umvm95x22"]
};
const [keep, remove] =
  pairs[
    process.argv.find((a) => a.startsWith("--pair="))?.slice(7) ?? "danilov"
  ] ?? [];
if (!keep) throw new Error("Unknown reviewed pair");
try {
  const rows = (
    await db.query("select * from public.temples where id=any($1::text[])", [
      [keep, remove]
    ])
  ).rows;
  if (rows.length !== 2) {
    console.log("Reviewed merge already applied");
    process.exitCode = 0;
  } else {
    if (
      !rows.every((t) => /монастыр/i.test(t.name)) ||
      new Set(
        rows.map((t) => new URL(t.website_url).hostname.replace(/^www\./, ""))
      ).size !== 1
    )
      throw new Error("Reviewed identity changed");
    const tables = [
      "temples",
      "temple_photos",
      "temple_sources",
      "temple_schedule_entries",
      "temple_field_evidence",
      "temple_transit",
      "temple_social_links",
      "temple_clergy",
      "temple_services"
    ];
    const backup = {};
    for (const table of tables)
      backup[table] = (
        await db.query(
          "select * from public." +
            table +
            (table === "temples"
              ? " where id=any($1::text[])"
              : " where temple_id=any($1::text[])"),
          [[keep, remove]]
        )
      ).rows;
    await writeFile(
      "tmp/backups/before-reviewed-" + remove + "-merge.json",
      JSON.stringify(backup)
    );
    const canonical = rows.find((t) => t.id === remove),
      previous = rows.find((t) => t.id === keep);
    await db.query("begin");
    try {
      for (const [table, keys] of [
        ["temple_sources", ["url"]],
        ["temple_social_links", ["url"]],
        ["temple_transit", ["station", "line_id"]],
        ["temple_services", ["kind", "title"]]
      ]) {
        await db.query(
          `delete from public.${table} a using public.${table} b where a.temple_id=$1 and b.temple_id=$2 and ${keys.map((k) => "a." + k + "=b." + k).join(" and ")}`,
          [remove, keep]
        );
        await db.query(
          "update public." + table + " set temple_id=$2 where temple_id=$1",
          [remove, keep]
        );
      }
      await db.query(
        "update public.temple_photos set is_main=false where temple_id=$1",
        [remove]
      );
      for (const table of [
        "temple_photos",
        "temple_schedule_entries",
        "temple_field_evidence",
        "temple_clergy"
      ])
        await db.query(
          "update public." + table + " set temple_id=$2 where temple_id=$1",
          [remove, keep]
        );
      await db.query(
        "update public.temples set name=$2,short_name=$3,address=$4,source_primary_url=$5,latitude=$6,longitude=$7,details=$8,aliases=$9,updated_at=now() where id=$1",
        [
          keep,
          canonical.name,
          canonical.short_name,
          canonical.address,
          canonical.source_primary_url,
          canonical.latitude ?? previous.latitude,
          canonical.longitude ?? previous.longitude,
          JSON.stringify({ ...previous.details, ...canonical.details }),
          [
            ...new Set([
              previous.name,
              ...(previous.aliases ?? []),
              ...(canonical.aliases ?? [])
            ])
          ]
        ]
      );
      await db.query("delete from public.temples where id=$1", [remove]);
      await db.query("commit");
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
    const fs = await import("node:fs/promises");
    let history = [];
    try {
      history = JSON.parse(
        await fs.readFile("data/reviewed-temple-merges.json", "utf8")
      );
    } catch {
      /* first merge */
    }
    history.push({
      keptId: keep,
      removedId: remove,
      keptSlug: previous.slug,
      removedSlug: canonical.slug,
      evidence: [canonical.source_primary_url, previous.website_url],
      reason: "Один монастырь с совпадающими официальным сайтом и адресом.",
      coordinateSource: canonical.source_primary_url
    });
    await writeFile(
      "data/reviewed-temple-merges.json",
      JSON.stringify(history, null, 2) + "\n"
    );
    console.log(
      "Merged one confirmed duplicate; preserved the original route."
    );
  }
} finally {
  await db.end();
}
