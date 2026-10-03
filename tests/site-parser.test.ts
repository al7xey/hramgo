import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseScheduleHtml,
  parseScheduleText,
  inspectPage
} from "../scripts/lib/site-parser.mjs";
const options = {
  templeId: "temple",
  sourceUrl: "https://temple.example/schedule",
  checkedAt: "2026-10-03T20:00:00Z"
};
test("monthly table binds services to explicit month and year", () => {
  const html =
    "<title>Расписание на октябрь 2026</title><table><tr><td>4 октября</td><td>08:30</td><td>Божественная литургия</td></tr><tr><td>5 октября</td><td>17:00</td><td>Всенощное бдение</td></tr></table>";
  const entries = parseScheduleHtml(html, options);
  assert.deepEqual(
    entries.map((e) => [e.service_date, e.starts_at]),
    [
      ["2026-10-04", "08:30"],
      ["2026-10-05", "17:00"]
    ]
  );
  assert.equal(entries[1].title, "Всенощное бдение");
  assert.equal(entries[0].valid_until, "2026-10-04");
});
test("unclear dates and ambiguous times never produce verified schedules", () => {
  assert.equal(
    parseScheduleText("4 октября\n08:30 Литургия", options).length,
    0
  );
  assert.equal(
    parseScheduleText("По воскресеньям: 08:00, 17:00 Литургия", options).length,
    0
  );
  assert.equal(
    parseScheduleText(
      "По воскресеньям: 08:00 Исповедь, затем Литургия",
      options
    ).length,
    0
  );
  assert.equal(
    parseScheduleHtml(
      "<h2>Октябрь</h2><table><tr><td>31 сб</td><td>08:00 Литургия</td></tr><tr><td>29 чт</td><td>18:00 Молебен</td></tr></table>",
      options
    ).length,
    0
  );
  assert.equal(
    parseScheduleText(
      "По воскресеньям\nОсвящаясь Христом (Рим. 8:21), мы участвуем в Литургии.",
      options
    ).length,
    0
  );
});
test("regular weekday header and explicitly labeled services are separate records", () => {
  const entries = parseScheduleText(
    "По воскресеньям\n07:00 Исповедь, 08:00 Литургия, 17:00 Всенощное бдение",
    options
  );
  assert.deepEqual(
    entries.map((e: { kind: string }) => e.kind),
    ["other", "liturgy", "evening"]
  );
  for (const e of entries) {
    assert.equal(e.service_date, null);
    assert.deepEqual(e.weekdays, [7]);
    assert.equal(e.valid_until, null);
  }
});
test("schedule discovery includes file links and removes unrelated page chrome", () => {
  const page = inspectPage(
    '<nav>8 495 111-11-11</nav><h1>Храм</h1><a href="/uploads/raspisanie.pdf">Расписание</a><a href="https://t.me/parish">Telegram</a><p>+7 (495) 222-33-44</p>',
    options.sourceUrl
  );
  assert.equal(
    page.links[0].url,
    "https://temple.example/uploads/raspisanie.pdf"
  );
  assert.deepEqual(page.phones, ["+7 495 222-33-44"]);
  assert.equal(page.socials.length, 1);
});
test("calendar weekday conflicts and opening hours are never services", () => {
  assert.equal(
    parseScheduleHtml(
      "<h2>Сентябрь 2026</h2><table><tr><td>1 четверг</td><td>08:00 Литургия</td></tr></table>",
      options
    ).length,
    0
  );
  assert.equal(
    parseScheduleText(
      "Ежедневно\nХрам открывается в 07:00, затем Литургия",
      options
    ).length,
    0
  );
  assert.equal(
    parseScheduleText(
      "По воскресеньям\n11:45 Причащение на Поздней Литургии (время ориентировочное)",
      options
    ).length,
    0
  );
});
test("complex service names are preserved and affiliate schedules require review", () => {
  const entries = parseScheduleText(
    "4 октября 2026\nУТРО / Верхний храм\n10:00 Литургия\nВЕЧЕР / Нижний храм\n17:00 Вечерня",
    options
  );
  assert.deepEqual(
    entries.map((e) => e.scope_note),
    ["Верхний храм", "Нижний храм"]
  );
  assert.equal(
    parseScheduleHtml(
      "<h1>Расписание приписного храма</h1><p>4 октября 2026</p><p>08:00 Литургия</p>",
      options
    )[0].status,
    "REVIEW"
  );
});
