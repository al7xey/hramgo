import { readFile, writeFile } from "node:fs/promises";
import { regularServices } from "../src/features/temples/schedules.ts";
const temples = JSON.parse(await readFile("data/temples.json", "utf8"));
const rules = (temple) => regularServices(temple.scheduleEntries ?? []);
const report = {
  checkedAt: new Date().toISOString(),
  temples: temples.length,
  processed: temples.length,
  regularSchedules: temples.filter((t) => rules(t).length).length,
  withoutNormalizedRegularSchedule: temples.filter((t) => !rules(t).length)
    .length,
  referenceSchedules: temples.filter((t) =>
    rules(t).some((e) => e.status === "REVIEW")
  ).length,
  descriptions: temples.filter((t) => t.description).length,
  descriptionSources: temples.filter((t) => t.descriptionSourceUrl).length,
  officialWebsites: temples.filter((t) => t.websiteUrl).length,
  eveningAt18: temples.filter((t) =>
    rules(t).some(
      (e) => e.kind === "evening" && e.startsAt.slice(0, 5) === "18:00"
    )
  ).length,
  sundayEveningAt17: temples.filter((t) =>
    regularServices(t.scheduleEntries ?? [], 7).some(
      (e) => e.kind === "evening" && e.startsAt.slice(0, 5) === "17:00"
    )
  ).length,
  remainingProblems: [
    "Some objects have no distinct parish website",
    "Ordinary service weekdays are unspecified in some sources",
    "Dated/image schedules are not converted into perpetual weekly rules",
    "Holiday exceptions require checking the parish source",
    "Some sources are inaccessible or have no published schedule"
  ]
};
await writeFile(
  "data/regular-catalog-report.json",
  JSON.stringify(report, null, 2) + "\n"
);
console.log(JSON.stringify(report));
