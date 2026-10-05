import { test } from "node:test";
import assert from "node:assert/strict";
import { factualSentences } from "../scripts/lib/factual-sentences.mjs";
import { parseRegularReference } from "../scripts/lib/regular-schedules.mjs";
import {
  regularServices,
  servicesForDate
} from "../src/features/temples/schedules";
import { searchTemples } from "../src/features/temples/search";
import type { ScheduleEntry, TempleView } from "../src/features/temples/types";
const opts = {
  templeId: "t",
  sourceUrl: "https://example.org",
  checkedAt: "2026-10-05T00:00:00Z"
};
test("descriptions retain saint names after abbreviated titles", () => {
  assert.deepEqual(
    factualSentences(
      "Храм освящён во имя св. мч. Андрея Стратилата. Сохранился древний иконостас."
    ),
    [
      "Храм освящён во имя св. мч. Андрея Стратилата.",
      "Сохранился древний иконостас."
    ]
  );
});
test("ordinary rules retain weekdays and do not convert hours into liturgy", () => {
  const entries = parseRegularReference(
    "Ежедневно в 7:30 — часы, 8:00 — Литургия, 17:00 — вечернее богослужение.",
    opts
  );
  assert.deepEqual(
    entries.map((e) => [e.starts_at, e.kind, e.weekdays]),
    [
      ["08:00", "liturgy", [1, 2, 3, 4, 5, 6, 7]],
      ["17:00", "evening", [1, 2, 3, 4, 5, 6, 7]]
    ]
  );
});
test("a dated or seasonal schedule is not a perpetual weekly rule", () => {
  for (const text of [
    "5 октября 2026 в 8:00 Литургия",
    "По воскресеньям летом в 8:00 Литургия",
    "Храм открыт ежедневно с 8:00"
  ])
    assert.equal(parseRegularReference(text, opts).length, 0);
});
test("several liturgy times preserve their own weekdays", () => {
  const entries = parseRegularReference(
    "7:00 (по будням), 9:00 (по воскресеньям) — Литургия",
    opts
  );
  assert.deepEqual(
    entries.map((e) => [e.starts_at, e.weekdays]),
    [
      ["07:00", [1, 2, 3, 4, 5]],
      ["09:00", [7]]
    ]
  );
});
test("shared weekdays cover both services but seasonal exceptions remain separate", () => {
  const entries = parseRegularReference(
    "7:00 и 9:00 (по воскресеньям) — Литургия",
    opts
  );
  assert.deepEqual(
    entries.map((e) => e.weekdays),
    [[7], [7]]
  );
  const seasonal = parseRegularReference(
    "7:00 (по будням), 8:30 (по субботам), 6:40 и 9:00 (по воскресеньям; летом только в 8:30) — Литургия",
    opts
  );
  assert.deepEqual(
    seasonal.map((e) => e.starts_at),
    ["07:00", "08:30"]
  );
});
const e: ScheduleEntry = {
  id: "regular",
  templeId: "t",
  weekdays: [7],
  startsAt: "08:00",
  kind: "liturgy",
  title: "Литургия",
  isSpecial: false,
  sourceUrl: opts.sourceUrl,
  verifiedAt: opts.checkedAt,
  confidence: 0.7,
  status: "REVIEW"
};
test("reference schedules work in weekly filters but cannot claim a confirmed date", () => {
  const now = new Date("2026-10-05T20:00:00Z");
  assert.equal(regularServices([e], 7).length, 1);
  assert.equal(regularServices([e], 1).length, 0);
  assert.equal(servicesForDate([e], "2026-10-11", now).length, 0);
  const t = {
    id: "t",
    name: "Храм",
    transit: [],
    photos: [],
    parishServices: [],
    scheduleEntries: [e]
  } as unknown as TempleView;
  assert.equal(
    searchTemples([t], { scheduleMode: "regular", liturgyTime: "8:00" }, now)
      .length,
    1
  );
  assert.equal(
    searchTemples(
      [t],
      { scheduleMode: "regular", liturgyTime: "8:00", weekday: 1 },
      now
    ).length,
    0
  );
  const unspecified = { ...e, weekdays: null, recurrenceUnspecified: true };
  assert.equal(regularServices([unspecified]).length, 1);
  assert.equal(regularServices([unspecified], 7).length, 0);
});
