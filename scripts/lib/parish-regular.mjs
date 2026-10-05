import { inspectPage, parseScheduleHtml } from "./site-parser.mjs";
import { parseRegularReference } from "./regular-schedules.mjs";
const recurring =
  /ежеднев|каждый день|кажд(?:ую|ый|ое|ые)\s+(?:недел|понедель|вторник|сред|четверг|пятниц|суббот|воскрес)|по\s+(?:будн|воскресеньям|субботам|понедельникам|вторникам|средам|четвергам|пятницам)|еженедель/i;
const calendar =
  /\b20\d{2}\b|\d{1,2}[./]\d{1,2}[./]|\d{1,2}\s+(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/i;
const ordinaryHeading = /^\s*Расписание богослужений\s*\(общее кратко\)/i;
export function parseParishRegularHtml(html, options) {
  const page = inspectPage(html, options.sourceUrl);
  const allowBareWeekdays =
    !calendar.test(page.text) &&
    /обычн.{0,20}распис|постоянн.{0,20}распис|еженедель|ежеднев/i.test(
      page.text
    );
  const entries = parseScheduleHtml(html, options)
    .filter(
      (e) =>
        !e.service_date &&
        e.weekdays?.length &&
        (recurring.test(e.comment ?? "") ||
          ordinaryHeading.test(e.comment ?? "") ||
          allowBareWeekdays)
    )
    .map((e) => ({
      ...e,
      status: "REVIEW",
      confidence: 0.75,
      extraction_method: "regular-reference"
    }));
  page.$("p,li,tr,div").each((_, el) => {
    const node = page.$(el);
    const text = node
      .text()
      .replace(/[ \t]+/g, " ")
      .trim();
    if (
      node.is("div") &&
      node.find("div,p,li,table").length &&
      !ordinaryHeading.test(text)
    )
      return;
    if (
      text.length > 1800 ||
      (!recurring.test(text) && !ordinaryHeading.test(text)) ||
      calendar.test(text)
    )
      return;
    if (
      /причастие\s*[—–-]|по Воздвижении|по Рождестве|по Богоявлении/i.test(text)
    )
      return;
    entries.push(
      ...parseRegularReference(text, { ...options, confidence: 0.75 }).filter(
        (e) => e.weekdays?.length
      )
    );
  });
  return [
    ...new Map(
      entries.map((entry) => [
        JSON.stringify([entry.weekdays, entry.starts_at, entry.kind]),
        entry
      ])
    ).values()
  ];
}
