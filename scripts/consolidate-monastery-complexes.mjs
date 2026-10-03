import { readFile, writeFile, mkdir } from "node:fs/promises";
import pg from "pg";

// Reviewed buildings stand inside one monastery. External dependencies keep their own cards.
const objects = JSON.parse(
  await readFile("data/new-verified-temples.json", "utf8")
);
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  connectionTimeoutMillis: 15000,
  query_timeout: 30000
});
await db.connect();
try {
  const parent = (
    await db.query(
      "select * from public.temples where source_primary_url='https://sprav.moseparh.ru/org/571'"
    )
  ).rows[0];
  if (!parent) throw new Error("Verified parent monastery missing");
  const children = (
    await db.query("select * from public.temples where slug=any($1::text[])", [
      objects.map((o) => o.slug)
    ])
  ).rows;
  if (
    children.some(
      (t) =>
        t.details?.parentTempleId !== parent.id || t.address !== parent.address
    )
  )
    throw new Error("Reviewed complex identity changed");
  const tables = [
    "temple_photos",
    "temple_sources",
    "temple_schedule_entries",
    "temple_field_evidence",
    "temple_transit",
    "temple_social_links",
    "temple_clergy",
    "temple_services"
  ];
  const backup = { temples: [parent, ...children] };
  const ids = children.map((t) => t.id);
  for (const table of tables)
    backup[table] = (
      await db.query(
        "select * from public." + table + " where temple_id=any($1::text[])",
        [[parent.id, ...ids]]
      )
    ).rows;
  await mkdir("tmp/backups", { recursive: true });
  await writeFile(
    "tmp/backups/before-complex-consolidation-" + Date.now() + ".json",
    JSON.stringify(backup)
  );
  const included = objects.map((o) => ({
    name: o.name,
    description: o.description,
    formerSlug: o.slug,
    sourceUrl: "https://msdm.ru/hramy_monastyrya/" + o.path + "/"
  }));
  const details = {
    ...parent.details,
    includedTemples: included,
    mergedSlugs: [
      ...new Set([
        ...(parent.details?.mergedSlugs ?? []),
        ...objects.map((o) => o.slug)
      ])
    ]
  };
  const aliases = [
    ...new Set([...(parent.aliases ?? []), ...objects.map((o) => o.name)])
  ];
  await db.query("begin");
  try {
    for (const [table, keys] of [
      ["temple_sources", ["url"]],
      ["temple_social_links", ["url"]],
      ["temple_transit", ["station", "line_id"]],
      ["temple_services", ["kind", "title"]]
    ]) {
      await db.query(
        `delete from public.${table} a using public.${table} b where a.temple_id=any($1::text[]) and b.temple_id=$2 and ${keys.map((k) => "a." + k + "=b." + k).join(" and ")}`,
        [ids, parent.id]
      );
    }
    for (const child of children)
      await db.query(
        "update public.temple_schedule_entries set scope_note=$2 where temple_id=$1 and (scope_note is null or scope_note like 'Проверена принадлежность%')",
        [child.id, child.name]
      );
    await db.query(
      "update public.temple_photos set is_main=false where temple_id=any($1::text[])",
      [ids]
    );
    for (const table of tables)
      await db.query(
        "update public." +
          table +
          " set temple_id=$2 where temple_id=any($1::text[])",
        [ids, parent.id]
      );
    await db.query(
      "update public.temples set details=$2,aliases=$3,updated_at=now() where id=$1",
      [parent.id, JSON.stringify(details), aliases]
    );
    await db.query("delete from public.temples where id=any($1::text[])", [
      ids
    ]);
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
  await writeFile(
    "data/monastery-complexes.json",
    JSON.stringify(
      [{ parentId: parent.id, parentSlug: parent.slug, included }],
      null,
      2
    ) + "\n"
  );
  console.log(
    "Consolidated " +
      children.length +
      " monastery building cards; names, sources and schedules retained in the monastery."
  );
} finally {
  await db.end();
}
