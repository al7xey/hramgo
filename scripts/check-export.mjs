import { readFile, access, readdir } from "node:fs/promises";
const temples = JSON.parse(await readFile("data/temples.json", "utf8"));
for (const name of [
  "index.html",
  "404.html",
  "temples/index.html",
  "map/index.html",
  "support/index.html",
  "sources/index.html",
  "legal/support-terms/index.html",
  "legal/payment-and-refund/index.html",
  "sitemap.xml",
  "robots.txt",
  "rss.xml",
  "CNAME",
  ".nojekyll"
])
  await access("out/" + name);
for (let start = 0; start < temples.length; start += 50)
  await Promise.all(
    temples
      .slice(start, start + 50)
      .map((t) => access("out/temples/" + t.slug + "/index.html"))
  );
for (const route of [
  "login",
  "register",
  "favorites",
  "profile",
  "admin",
  "representative"
]) {
  try {
    await access("out/" + route + "/index.html");
  } catch {
    continue;
  }
  throw new Error("Removed route was exported: " + route);
}
const files = await readdir("out", { recursive: true });
const pathChecks = [];
for (const file of files) {
  if (/(^|[\\/])reviews([\\/]|$)/.test(file))
    throw new Error("Review route remains in export");
  if (!/\.(html|js)$/.test(file)) continue;
  pathChecks.push(file);
}
for (let start = 0; start < pathChecks.length; start += 30) {
  const contents = await Promise.all(
    pathChecks
      .slice(start, start + 30)
      .map(async (file) => ({
        file,
        content: await readFile("out/" + file, "utf8")
      }))
  );
  for (const { file, content } of contents) {
    if (
      /href=["']\/(login|register|favorites|profile|admin|representative)(?:[/?"'])|AggregateRating|AuthProvider|Добавить в избранное|Написать отзыв/.test(
        content
      )
    )
      throw new Error("Removed feature remains in " + file);
    if (/^temples[\\/].+[\\/]index\.html$/.test(file)) {
      if ((content.match(/<h1(?:\s|>)/g) ?? []).length !== 1)
        throw new Error("Expected exactly one H1: " + file);
      if (
        !content.includes('rel="canonical"') ||
        !content.includes('name="description"')
      )
        throw new Error("Missing page metadata: " + file);
      if (!content.includes("Сообщить об ошибке"))
        throw new Error("Missing correction action: " + file);
    }
  }
}
const home = await readFile("out/index.html", "utf8");
if (/service_role|SUPABASE_SECRET_KEY|YOOKASSA_SECRET_KEY/.test(home))
  throw new Error("Private key name in exported HTML");
if (/Вечерняя в (17|18):00|Сегодня вечером/.test(home))
  throw new Error("Removed evening shortcut remains on homepage");
const sources = await readFile("out/sources/index.html", "utf8");
if (!sources.includes("Wikidata (CC0)"))
  throw new Error("Missing transit source attribution");
const liveCatalog = JSON.parse(await readFile("out/data/catalog.json", "utf8"));
const gorodnya = liveCatalog.find(
  (t) => t.slug === "sprav-1124-pokrova-presvyatoy-bogoroditsy-na-gorodne"
);
if (
  gorodnya?.transit[0]?.station !== "Покровское" ||
  !gorodnya.transit[0].walkEstimated
)
  throw new Error("Pokrovskoye correction missing from export");
console.log(
  `Static export verified: ${temples.length} temple routes; account, favorite and review features absent.`
);
