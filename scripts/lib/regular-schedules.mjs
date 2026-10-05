import { digest } from "./http-cache.mjs";
const names = [
  /понедель/i,
  /вторник/i,
  /сред(?:а|у|ам|ы)/i,
  /четвер/i,
  /пятниц/i,
  /суббот/i,
  /воскрес(?:ен|н)/i
];
export function recurringDays(text) {
  if (/ежеднев|каждый день/i.test(text)) return [1, 2, 3, 4, 5, 6, 7];
  const result = names.flatMap((rx, i) => (rx.test(text) ? [i + 1] : []));
  if (/будн/i.test(text)) result.push(1, 2, 3, 4, 5);
  if (/выходн/i.test(text)) result.push(6, 7);
  const range = text.match(
    /(понедель\S*|вторник\S*|сред\S*|четвер\S*|пятниц\S*|суббот\S*|воскрес\S*)\s*[—–-]\s*(понедель\S*|вторник\S*|сред\S*|четвер\S*|пятниц\S*|суббот\S*|воскрес\S*)/i
  );
  if (range) {
    const a = names.findIndex((rx) => rx.test(range[1])),
      b = names.findIndex((rx) => rx.test(range[2]));
    if (a >= 0 && b >= a) for (let i = a; i <= b; i++) result.push(i + 1);
  }
  return [...new Set(result)].sort();
}
export function parseRegularReference(
  text,
  { templeId, sourceUrl, checkedAt, confidence = 0.7 }
) {
  const entries = [];
  const kinds = [
    ["liturgy", /литурги[^\s,;:)—]*/gi, "Божественная литургия"],
    [
      "evening",
      /всенощ[^\s,;:)—]*|вечерн[^\s,;:)—]*|вечерня/gi,
      "Вечернее богослужение"
    ],
    ["prayer", /молеб[её]н[^\s,;:)—]*/gi, "Молебен"]
  ];
  const blocks = [];
  let blockStart = 0,
    depth = 0;
  const normalized = text.replace(/\u00a0/g, " ");
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === "(") depth++;
    if (normalized[i] === ")") depth = Math.max(0, depth - 1);
    if (
      !depth &&
      (normalized[i] === ";" ||
        normalized[i] === "\n" ||
        (normalized[i] === "." && /^\s+[А-ЯЁ]/.test(normalized.slice(i + 1))))
    ) {
      blocks.push(normalized.slice(blockStart, i));
      blockStart = i + 1;
    }
  }
  blocks.push(normalized.slice(blockStart));
  for (const rawBlock of blocks) {
    // A following holiday-eve clause must not hide clearly stated morning rules.
    // Its relative time remains excluded from the ordinary weekly schedule.
    const block = rawBlock.split(/,\s*накануне(?=\s|$)/iu)[0];
    if (
      block.length > 1800 ||
      /\b20\d{2}\b|\d{1,2}[./]\d{1,2}[./]|\d{1,2}\s+(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/i.test(
        block
      )
    )
      continue;
    if (
      /великий пост|великого поста|открыт|открыва|трансляц|кроме|если|накануне|ориентировочн|по договор|по запрос|временн/i.test(
        block
      )
    )
      continue;
    if (/летом|зимой|только/i.test(block.replace(/\([^)]*\)/g, ""))) continue;
    const clocks = [
      ...block.matchAll(/(?<![\d.])\b([01]?\d|2[0-3])[:.]([0-5]\d)\b(?!\.\d)/g)
    ];
    const labels = kinds
      .flatMap(([kind, rx, title]) =>
        [...block.matchAll(rx)]
          .filter(
            (m) =>
              !/перед\s*$|после\s*$|окончании\s*$|во время\s*$/i.test(
                block.slice(Math.max(0, m.index - 25), m.index)
              )
          )
          .map((m) => ({
            index: m.index,
            end: m.index + m[0].length,
            kind,
            title: /всенощ/i.test(m[0]) ? "Всенощное бдение" : title
          }))
      )
      .sort((a, b) => a.index - b.index);
    if (!clocks.length || !labels.length) continue;
    const timeFirst = clocks[0].index < labels[0].index;
    let inheritedDays = recurringDays(block.slice(0, clocks[0].index));
    for (let i = 0; i < clocks.length; i++) {
      const clock = clocks[i],
        label = timeFirst
          ? labels.find((l) => l.index > clock.index)
          : labels.findLast((l) => l.index < clock.index);
      if (/\([^)]*$/.test(block.slice(0, clock.index))) continue;
      const dayPrefix =
        block
          .slice(
            i ? clocks[i - 1].index + clocks[i - 1][0].length : 0,
            clock.index
          )
          .replace(/\([^)]*\)/g, "")
          .split(/[,;—]/)
          .at(-1) ?? "";
      if (recurringDays(dayPrefix).length)
        inheritedDays = recurringDays(dayPrefix);
      if (!label) continue;
      // A type followed by several clocks must not borrow a different service's days.
      const next = clocks[i + 1]?.index ?? block.length;
      const right = block.slice(clock.index + clock[0].length, next);
      if (timeFirst && label.index >= next) {
        const bridge = right.replace(/\([^)]*\)/g, "");
        if (!/^[\s,и/—–-]*$/i.test(bridge)) continue;
      }
      if (
        !timeFirst &&
        /панихид|утрен[яи]|часы|полунощниц/i.test(
          block.slice(label.end, clock.index)
        )
      )
        continue;
      let parentheses = right.match(/^\s*(\([^)]*\))/)?.[1];
      // A shared weekday annotation applies to a contiguous cluster such as “7:00 и 9:00 (по воскресеньям)”.
      if (!parentheses && timeFirst && label.index >= next) {
        const following = block.slice(next, label.index);
        parentheses = following.match(/\([^)]*\)/)?.[0];
      }
      if (parentheses && /летом|зимой|только|если|кроме/i.test(parentheses))
        continue;
      const prefix =
        block
          .slice(
            i ? clocks[i - 1].index + clocks[i - 1][0].length : 0,
            clock.index
          )
          .split(/[,;—]/)
          .at(-1) ?? "";
      const suffix = next === block.length ? right : "";
      const days = recurringDays(parentheses ?? prefix);
      const explicit = days.length ? days : recurringDays(suffix);
      if (!explicit.length && !parentheses) explicit.push(...inheritedDays);
      // Relative times after liturgy/confession are not independent service starts.
      if (
        /после\s*$|до\s*$/i.test(
          block.slice(Math.max(0, clock.index - 35), clock.index)
        )
      )
        continue;
      const time = clock[1].padStart(2, "0") + ":" + clock[2];
      const comment = block.trim().slice(0, 900);
      entries.push({
        id:
          "regular-" +
          digest(
            JSON.stringify([templeId, sourceUrl, explicit, time, label.kind])
          ).slice(0, 28),
        temple_id: templeId,
        service_date: null,
        weekdays: explicit.length ? explicit : null,
        starts_at: time,
        kind: label.kind,
        title: label.title,
        comment,
        is_special: false,
        valid_from: null,
        valid_until: null,
        source_url: sourceUrl,
        verified_at: checkedAt,
        last_checked_at: checkedAt,
        confidence,
        status: "REVIEW",
        extraction_method: "regular-reference",
        scope_note: null
      });
    }
  }
  return [...new Map(entries.map((e) => [e.id, e])).values()];
}
