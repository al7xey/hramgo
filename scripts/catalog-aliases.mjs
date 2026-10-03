import { readFile } from "node:fs/promises";
import pg from "pg";
const db = new pg.Client({
  connectionString: process.env.SUPABASE_DATABASE_URL
});
await db.connect();
try {
  const rows = (
    await db.query(
      "select id,name,short_name,aliases,source_primary_url from public.temples"
    )
  ).rows;
  const directory = JSON.parse(
    await readFile("tmp/source-cache/official-list.json", "utf8")
  ).items;
  const legacy = JSON.parse(
    await readFile("tmp/backups/legacy-data.json", "utf8")
  ).Temple;
  const changes = rows
    .map((t) => {
      const source = directory.find((s) => s.url === t.source_primary_url),
        old = legacy.find((s) => s.id === t.id);
      const aliases = [
        ...new Set(
          [
            ...(t.aliases ?? []),
            t.short_name,
            source?.name,
            old?.name,
            old?.shortName
          ].filter((s) => s && s !== t.name)
        )
      ];
      return { id: t.id, aliases };
    })
    .filter(
      (t) =>
        JSON.stringify(t.aliases) !==
        JSON.stringify(rows.find((r) => r.id === t.id).aliases ?? [])
    );
  if (process.argv.includes("--apply") && changes.length)
    await db.query(
      "update public.temples t set aliases=s.aliases,updated_at=now() from jsonb_to_recordset($1::jsonb) as s(id text,aliases text[]) where t.id=s.id and t.aliases is distinct from s.aliases",
      [JSON.stringify(changes)]
    );
  console.log(
    JSON.stringify({
      aliasesUpdated: changes.length,
      mode: process.argv.includes("--apply") ? "apply" : "dry-run"
    })
  );
} finally {
  await db.end();
}
