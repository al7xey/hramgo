import { test } from "node:test";
import assert from "node:assert/strict";
import { factualSentences } from "../scripts/lib/factual-sentences.mjs";
import { parseRegularReference } from "../scripts/lib/regular-schedules.mjs";
import { parseParishRegularHtml } from "../scripts/lib/parish-regular.mjs";
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
test("parish calendar rows do not become ordinary weekly rules", () => {
  const html =
    "<main><h1>Расписание на октябрь 2026</h1><p>Суббота по Воздвижении<br>9:00 — Литургия</p><div>Суббота. 18:00 — всенощное бдение, вынос Креста</div></main>";
  assert.equal(parseParishRegularHtml(html, opts).length, 0);
});
test("parish recurrence requires explicit days and rejects relative communion times", () => {
  const html =
    "<main><p>По воскресеньям в 9:00 — Литургия</p><p>Исповедь, Литургия, Причастие — 10:20, молебен</p></main>";
  assert.deepEqual(
    parseParishRegularHtml(html, opts).map((r) => [r.starts_at, r.weekdays]),
    [["09:00", [7]]]
  );
});
test("a dedicated ordinary parish block retains its separate weekday rules", () => {
  const html =
    "<main><p>Расписание богослужений (общее кратко):Литургия — суббота и воскресенье 9:00<br>Вечернее богослужение — пятница 17:00<br>Всенощное бдение — суббота 17:00</p></main>";
  assert.deepEqual(
    parseParishRegularHtml(html, opts).map((r) => [r.starts_at, r.weekdays]),
    [
      ["09:00", [6, 7]],
      ["17:00", [5]],
      ["17:00", [6]]
    ]
  );
});
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
test("holiday-eve clauses do not discard explicit morning rules", () => {
  const entries = parseRegularReference(
    "8:00 (по будням и в субботу), 9:00 (по воскресеньям и в праздники) — Литургия, накануне воскресных и праздничных дней в 17:00 — вечернее богослужение.",
    opts
  );
  assert.deepEqual(
    entries.map((r) => [r.starts_at, r.weekdays]),
    [
      ["08:00", [1, 2, 3, 4, 5, 6]],
      ["09:00", [7]]
    ]
  );
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
test("parish rules take priority without removing other directory weekdays", () => {
  const directory = { ...e, weekdays: [1, 2, 3, 4, 5, 6, 7] };
  const parish = { ...e, id: "parish", startsAt: "09:00", confidence: 0.75 };
  assert.deepEqual(
    regularServices([directory, parish], 7).map((r) => r.startsAt),
    ["09:00"]
  );
  assert.deepEqual(
    regularServices([directory, parish], 1).map((r) => r.startsAt),
    ["08:00"]
  );
  assert.deepEqual(
    regularServices([directory, parish]).find((r) => r.id === "regular")
      ?.weekdays,
    [1, 2, 3, 4, 5, 6]
  );
});
test("schedules of different buildings in a complex do not override each other", () => {
  const one = { ...e, scopeNote: "Троицкий собор" };
  const another = {
    ...e,
    id: "other-building",
    startsAt: "09:00",
    confidence: 0.75,
    scopeNote: "Покровский храм"
  };
  assert.equal(regularServices([one, another], 7).length, 2);
});
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
