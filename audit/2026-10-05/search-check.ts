import { readFileSync, writeFileSync } from "node:fs";
import { searchTemples } from "../../src/features/temples/search";
import { templeSearchSchema } from "../../src/features/temples/validation";
import {
  regularServices,
  servicesForDate
} from "../../src/features/temples/schedules";
import { nextService } from "../../src/features/temples/worship";
import type { TempleView } from "../../src/features/temples/types";
const t: TempleView[] = JSON.parse(
  readFileSync("public/data/catalog.json", "utf8")
);
const now = new Date("2026-10-05T12:00:00+03:00");
const queries = [
  "Храм Христа Спасителя",
  "Христа Спасителя",
  "Данилов",
  "Даниловский монастырь",
  "Троицкий собор Данилова монастыря",
  "Большая Ордынка",
  "Волхонка, 15",
  "Таганский",
  "Митьково",
  "Красносельская",
  "Николая Чудотворца",
  "Никольский",
  "Хрста Спасителя",
  "Lfybkjd",
  "lfybkjd",
  "да",
  "Москва",
  "",
  "x".repeat(121),
  "неизвестныйхрам000"
];
const search = queries.map((query) => {
  const input = templeSearchSchema.parse({ query });
  const start = performance.now();
  const result = searchTemples(t, input, now);
  return {
    query,
    acceptedQuery: input.query ?? null,
    count: result.length,
    ms: +(performance.now() - start).toFixed(2),
    first: result.slice(0, 3).map((x) => x.name)
  };
});
const filters = [
  {
    label: "ordinary evening18",
    scheduleMode: "regular",
    worship: "evening",
    timeFrom: "18:00",
    timeTo: "18:00"
  },
  {
    label: "ordinary Sunday evening17",
    scheduleMode: "regular",
    weekday: 7,
    worship: "evening",
    timeFrom: "17:00",
    timeTo: "17:00"
  },
  {
    label: "today evening after18",
    date: "2026-10-05",
    worship: "evening",
    timeFrom: "18:00"
  },
  {
    label: "ordinary after18",
    scheduleMode: "regular",
    worship: "evening",
    timeFrom: "18:00"
  },
  {
    label: "ordinary liturgy8 and evening18",
    scheduleMode: "regular",
    liturgyTime: "8:00",
    eveningTime: "18:00"
  },
  { label: "station Krasnoselskaya", metro: ["Красносельская"] }
].map(({ label, ...raw }) => {
  const input = templeSearchSchema.parse(raw);
  const result = searchTemples(t, input, now);
  return {
    label,
    count: result.length,
    first: result.slice(0, 3).map((x) => x.name)
  };
});
const weekly = t.filter((x) => regularServices(x.scheduleEntries ?? []).length);
const factual = {
  weekly: weekly.length,
  weeklyWithReview: weekly.filter((x) =>
    regularServices(x.scheduleEntries ?? []).some((e) => e.status === "REVIEW")
  ).length,
  weeklyWithVerified: weekly.filter((x) =>
    regularServices(x.scheduleEntries ?? []).some(
      (e) => e.status === "VERIFIED"
    )
  ).length,
  withTodayDate: t.filter(
    (x) => servicesForDate(x.scheduleEntries ?? [], "2026-10-05", now).length
  ).length,
  withNext7: t.filter((x) => nextService(x.scheduleEntries ?? [], now)).length,
  recurrenceUnspecified: t.filter((x) =>
    regularServices(x.scheduleEntries ?? []).some(
      (e) => e.recurrenceUnspecified && !e.weekdays?.length
    )
  ).length,
  scheduleSourceNonParish: t.filter(
    (x) =>
      x.scheduleSourceUrl &&
      !x.scheduleSourceUrl.includes(
        new URL(x.websiteUrl || "https://invalid.local").hostname
      )
  ).length,
  walkCarEstimateTemples: t.filter((x) =>
    x.transit.some(
      (s) => s.walkMinutes > 40 && s.distanceMeters > 0 && !s.routeVerified
    )
  ).length
};
const result = { testedAt: now.toISOString(), search, filters, factual };
writeFileSync(
  "audit/2026-10-05/evidence/search.json",
  JSON.stringify(result, null, 2)
);
console.log(JSON.stringify(result, null, 2));
