import { load } from "cheerio";
import { publicUrl, digest } from "./http-cache.mjs";
const monthNames = [
  "январ",
  "феврал",
  "март",
  "апрел",
  "ма[йя]",
  "июн",
  "июл",
  "август",
  "сентябр",
  "октябр",
  "ноябр",
  "декабр"
];
const monthRx = new RegExp("(" + monthNames.join("|") + ")[а-я]*", "i");
const weekdays = [
  /понедель/i,
  /вторник/i,
  /сред(?:а|у|ам|ы)/i,
  /четвер/i,
  /пятниц/i,
  /суббот/i,
  /воскресен/i
];
const kinds = [
  ["liturgy", /литурги/i, "Божественная литургия"],
  ["evening", /всенощ|вечерн|вечерня/i, "Вечернее богослужение"],
  ["other", /исповед/i, "Исповедь"],
  ["prayer", /молебен|молебн/i, "Молебен"]
];
const tidy = (s) =>
  s
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
export function cleanDocument(html) {
  const $ = load(html);
  $(
    "script,style,noscript,nav,footer,header,aside,.cookie,.menu,.navigation"
  ).remove();
  $("br").replaceWith("\n");
  $("p,div,li,tr,h1,h2,h3,h4").append("\n");
  return $;
}
export function inspectPage(html, url) {
  const full = load(html),
    links = [];
  full("a[href]").each((_, el) => {
    const a = full(el),
      href = publicUrl(a.attr("href"), url);
    if (!href) return;
    const text = tidy(a.text()),
      key = text + " " + href;
    const schedule =
      /распис|богослуж|schedule|raspis|calendar|service|календар|объявлен|новост|афиша|приходск.*жизн/i.test(
        key
      );
    const score = /распис|schedule|raspis/i.test(key)
      ? 100
      : /богослуж|service/i.test(key)
        ? 80
        : /calendar|календар/i.test(key)
          ? 70
          : 40;
    const asset = /\.(pdf|docx?|jpe?g|png)(?:[?#]|$)/i.test(href);
    if (schedule || (asset && /распис|служ|schedule|raspis/i.test(key)))
      links.push({ url: href, title: text, score, asset });
  });
  const schedulePage = /распис|schedule|raspis/i.test(
    full("title,h1").text() + " " + decodeURI(url)
  );
  full("img[src]").each((_, el) => {
    const img = full(el),
      href = publicUrl(img.attr("src"), url);
    if (
      href &&
      ((schedulePage && full("img[src]").length <= 4) ||
        /распис|schedule|raspis/i.test(img.attr("alt") + " " + href)) &&
      !/logo|icon|banner|avatar|otec|otets|portrait|priest/i.test(href)
    )
      links.push({
        url: href,
        title: img.attr("alt") ?? "Изображение расписания",
        score: 85,
        asset: true
      });
  });
  const $ = cleanDocument(html),
    text = tidy($("body").text()).slice(0, 150000);
  const phones = [
    ...new Set(
      [
        ...text.matchAll(
          /(?:\+7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g
        )
      ].map(
        (m) =>
          "+7 " +
          m[0].replace(/\D/g, "").slice(1, 4) +
          " " +
          m[0].replace(/\D/g, "").slice(4, 7) +
          "-" +
          m[0].replace(/\D/g, "").slice(7, 9) +
          "-" +
          m[0].replace(/\D/g, "").slice(9, 11)
      )
    )
  ];
  const emails = [
    ...new Set(
      [...text.matchAll(/[\w.+-]+@[\w.-]+\.[a-zа-я]{2,}/gi)].map((m) =>
        m[0].toLowerCase()
      )
    )
  ];
  const socials = [];
  full("a[href]").each((_, el) => {
    const href = publicUrl(full(el).attr("href"), url);
    if (
      href &&
      /^https?:\/\/(?:www\.)?(vk\.com|t\.me|telegram\.me)\//i.test(href) &&
      !/(share|away|joinchat|login)/i.test(href)
    )
      socials.push({
        url: href,
        type: href.includes("vk.com") ? "vk" : "telegram"
      });
  });
  const canonical = publicUrl(full("link[rel=canonical]").attr("href"), url);
  const points = [];
  const addPoint = (latitude, longitude) => {
    const lat = Number(latitude),
      lon = Number(longitude);
    if (lat >= 54.9 && lat <= 56.4 && lon >= 36 && lon <= 38.6)
      points.push({ latitude: lat, longitude: lon });
  };
  const visitJson = (node) => {
    if (!node || typeof node !== "object") return;
    if (node["@type"] === "GeoCoordinates")
      addPoint(node.latitude, node.longitude);
    for (const child of Object.values(node))
      if (typeof child === "object") visitJson(child);
  };
  full('script[type="application/ld+json"]').each((_, el) => {
    try {
      visitJson(JSON.parse(full(el).text()));
    } catch {
      /* invalid publisher JSON */
    }
  });
  full("a[href],iframe[src]").each((_, el) => {
    const href = publicUrl(full(el).attr("href") ?? full(el).attr("src"), url);
    if (!href) return;
    const u = new URL(href);
    if (/(^|\.)yandex\.(ru|com)$/.test(u.hostname)) {
      const point = u.searchParams
        .get("pt")
        ?.match(/^([\d.]+),([\d.]+)(?:,|$)/);
      if (point) addPoint(point[2], point[1]);
    }
  });
  const published = full(
    'meta[property="article:published_time"],meta[name="date"],meta[itemprop="datePublished"]'
  )
    .first()
    .attr("content");
  return {
    links: [
      ...new Map(
        links.sort((a, b) => b.score - a.score).map((l) => [l.url, l])
      ).values()
    ],
    phones,
    emails,
    socials: [...new Map(socials.map((s) => [s.url, s])).values()],
    coordinates: [
      ...new Map(points.map((p) => [JSON.stringify(p), p])).values()
    ],
    description: full('meta[name="description"]').attr("content") ?? null,
    title: tidy(full("title").text()),
    text,
    canonical,
    published:
      published && !Number.isNaN(Date.parse(published))
        ? new Date(published).toISOString()
        : null,
    $
  };
}
function monthNumber(word) {
  return monthNames.findIndex((m) => new RegExp("^" + m, "i").test(word)) + 1;
}
function dateIn(value, context) {
  let m = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m) return m[0];
  m = value.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const scope = context.match(
    new RegExp(monthRx.source + "\\s*(?:[—-]\\s*)?(20\\d{2})", "i")
  );
  m = value.match(
    new RegExp(
      "(?:^|\\s)(\\d{1,2})\\s*" + monthRx.source + "(?:\\s*(20\\d{2}))?",
      "i"
    )
  );
  if (m) {
    const year = m[3] ?? scope?.[2];
    if (year)
      return `${year}-${String(monthNumber(m[2])).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = value.match(/^(\d{1,2})[./](\d{1,2})(?:\s|$)/);
  if (m && scope)
    return `${scope[2]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (
    /^\d{1,2}(?:\s+(?:понедель|вторник|сред|четвер|пятниц|суббот|воскрес))?\s*$/i.test(
      value
    ) &&
    scope
  )
    return `${scope[2]}-${String(monthNumber(scope[1])).padStart(2, "0")}-${value.match(/^\d+/)[0].padStart(2, "0")}`;
}
function validDate(date) {
  return (
    date &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}
function weekdayMatches(date, label) {
  const named = daysIn(label);
  const abbreviations = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const short = label.match(/(?:^|\s)(пн|вт|ср|чт|пт|сб|вс)\.?(?:\s|$)/i);
  if (short) named.push(abbreviations.indexOf(short[1].toLowerCase()) + 1);
  return (
    !named.length ||
    named.includes(((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7) + 1)
  );
}
function daysIn(value) {
  const extra = weekdays.flatMap((rx, i) => (rx.test(value) ? [i + 1] : []));
  if (/ежедневн|каждый день/i.test(value)) return [1, 2, 3, 4, 5, 6, 7];
  if (/будн/i.test(value)) return [...new Set([1, 2, 3, 4, 5, ...extra])];
  if (/выходн/i.test(value)) return [...new Set([6, 7, ...extra])];
  return extra;
}
function regularDays(value) {
  // A weekday mentioned in a dated calendar or a saint's feast is not a weekly rule.
  if (
    value.length > 160 ||
    /^\s*\d/.test(value) ||
    /\b20\d{2}\b|\d[./]\d|(?:праздник|память|свят|неделя)/i.test(value)
  )
    return [];
  const label = value.replace(/[\s:—-]/g, "");
  return /ежедневн|кажд(?:ый день|ую суббот|ое воскрес|ый понедель|ый вторник|ую сред|ый четвер|ую пятниц)|еженедел|(?:по|в|во)\s+(?:воскрес|суббот|понедель|вторник|сред|четвер|пятниц)|будн|выходн/i.test(
    value
  ) || weekdays.some((rx) => rx.test(label) && label.length < 20)
    ? daysIn(value)
    : [];
}
function entriesForBlock(
  block,
  {
    templeId,
    sourceUrl,
    checkedAt,
    context,
    date,
    days,
    method = "html",
    official = true
  }
) {
  if (!validDate(date) && !days?.length) return [];
  if (
    block.length > 700 ||
    /(?:Рим|Ин|Мф|Мк|Лк|Кор|Еф|Пс|Деян)\.\s*\d+[:.,]\d+/i.test(block)
  )
    return [];
  if (
    /кроме|накануне|праздник|по запросу|по договор|после.{0,35}литурги|уточня|трансляц|вещани|открыт|открыва|ориентировочн|причащение|окончания|учебный период/i.test(
      block
    )
  )
    return [];
  const clocks = [
    ...block.matchAll(/(?<![\d.])\b([01]?\d|2[0-3])[:.]([0-5]\d)\b(?!\.\d)/g)
  ];
  if (!clocks.length) return [];
  if (clocks.length > 1) {
    const pieces = clocks.map((clock, i) =>
      block.slice(
        clock.index,
        i + 1 < clocks.length ? clocks[i + 1].index : block.length
      )
    );
    if (pieces.every((p) => kinds.filter(([, rx]) => rx.test(p)).length === 1))
      return pieces.flatMap((p) =>
        entriesForBlock(p, {
          templeId,
          sourceUrl,
          checkedAt,
          context,
          date,
          days,
          method,
          official
        })
      );
    return []; // Multiple unlabeled times require source review.
  }
  const found = kinds.filter(([, rx]) => rx.test(block));
  if (found.length !== 1) return [];
  const [kind, , fallback] = found[0];
  const title =
    kind === "evening" && /всенощ/i.test(block)
      ? "Всенощное бдение"
      : kind === "liturgy" && /утреня|часы/i.test(block)
        ? "Утреннее богослужение: " +
          tidy(block.slice(clocks[0].index + clocks[0][0].length))
            .replace(/^[\s—|.-]+/, "")
            .slice(0, 110)
        : fallback;
  const output = [];
  for (const clock of clocks) {
    const time = clock[1].padStart(2, "0") + ":" + clock[2];
    const confidence = official
      ? date
        ? method === "pdf-text"
          ? 0.95
          : 1
        : 0.85
      : 0.6;
    output.push({
      id:
        "parsed-" +
        digest(
          JSON.stringify([templeId, sourceUrl, date ?? days, time, kind, title])
        ).slice(0, 28),
      temple_id: templeId,
      service_date: validDate(date) ? date : null,
      weekdays: validDate(date) ? null : days,
      starts_at: time,
      kind,
      title,
      comment: tidy(block).slice(0, 600),
      is_special: Boolean(date),
      valid_from: validDate(date) ? date : null,
      valid_until: validDate(date) ? date : null,
      source_url: sourceUrl,
      verified_at: checkedAt,
      last_checked_at: checkedAt,
      confidence,
      status: confidence >= 0.8 ? "VERIFIED" : "REVIEW",
      extraction_method: method,
      scope_note: /комплекс|монастыр|подвор/i.test(context)
        ? "Расписание прихода; принадлежность конкретному зданию требует проверки"
        : null
    });
  }
  return output;
}
export function parseScheduleText(text, options) {
  const output = [];
  let date, days, scope;
  const context = options.context ?? text.slice(0, 1000);
  const calendar =
    monthRx.test(context) ||
    new RegExp("(?:^|\\n)[ \\t]*\\d{1,2}\\s+" + monthRx.source, "im").test(
      text
    ) ||
    /^\s*\d{1,2}\s+(?:понедель|вторник|сред|четвер|пятниц|суббот|воскрес)/im.test(
      text
    );
  for (const raw of text.split(/\n|;/)) {
    const line = tidy(raw);
    if (!line) continue;
    const candidate = dateIn(line, context);
    if (candidate) {
      date = weekdayMatches(candidate, line) ? candidate : undefined;
      days = undefined;
    } else if (!calendar && regularDays(line).length) {
      days = regularDays(line);
      date = undefined;
    } else if (daysIn(line).length && !candidate) {
      date = undefined;
      days = undefined;
    } else if (/^\d{1,2}\s+(?:[а-я]+|\d{1,2}[./])/i.test(line)) {
      date = undefined;
      days = undefined;
    }
    const location = line.match(/^(?:УТРО|ВЕЧЕР|ДЕНЬ)\s*\/\s*(.+)$/i);
    if (location) scope = location[1];
    const entries = entriesForBlock(line, { ...options, context, date, days });
    if (scope) for (const entry of entries) entry.scope_note = scope;
    output.push(...entries);
    if (
      !candidate &&
      !regularDays(line).length &&
      !/литурги|вечерн|всенощ|исповед|молеб/i.test(line)
    ) {
      days = undefined;
    }
  }
  return [...new Map(output.map((e) => [e.id, e])).values()];
}
export function parseScheduleHtml(html, options) {
  if (/online|transl/i.test(options.sourceUrl)) return [];
  const page = inspectPage(html, options.sourceUrl),
    output = [];
  page.$("table").each((_, table) => {
    const el = page.$(table),
      heading = el.prevAll("h1,h2,h3,h4,p").slice(0, 3).text();
    const context = [heading, page.title, el.find("caption,thead").text()]
      .join(" ")
      .slice(0, 1200);
    const calendar =
      monthRx.test(context) ||
      /старый\s+стиль|новый\s+стиль/i.test(el.text()) ||
      el
        .find("td,th")
        .toArray()
        .some(
          (c) =>
            /^\s*\d{1,2}(?:\s|$|[./])/.test(page.$(c).text()) &&
            !/^\s*\d{1,2}[:.][0-5]\d\s*$/.test(page.$(c).text())
        );
    let date, days;
    el.find("tr").each((_, tr) => {
      const cells = page
        .$(tr)
        .find("td,th")
        .toArray()
        .map((c) => tidy(page.$(c).text()));
      const dateCell = cells.find((c) => validDate(dateIn(c, context)));
      if (dateCell) {
        date = weekdayMatches(dateIn(dateCell, context), cells.join(" "))
          ? dateIn(dateCell, context)
          : undefined;
        days = undefined;
      } else {
        const datedRow = cells.some(
          (c) => /^\s*\d{1,2}(?:\s|$|[./])/.test(c) && !/^\s*\d{1,2}:/.test(c)
        );
        if (datedRow) {
          date = undefined;
          days = undefined;
        } else {
          const dayCell = !calendar && cells.find((c) => regularDays(c).length);
          if (dayCell) {
            days = regularDays(dayCell);
            date = undefined;
          }
        }
      }
      const block = cells.filter((c) => c !== dateCell).join(" ");
      output.push(
        ...entriesForBlock(block, { ...options, context, date, days })
      );
    });
  });
  // Parse ordinary paragraphs only; table rows already have explicit cell context.
  page.$("table").remove();
  output.push(
    ...parseScheduleText(page.$("body").text(), {
      ...options,
      context: page.title + " " + page.$("h1,h2,h3").slice(0, 4).text()
    })
  );
  if (
    /приписн.{0,35}храм/i.test(page.$("h1,h2,h3").text()) ||
    /raspisanie[^/]*pripisn/i.test(options.sourceUrl)
  ) {
    for (const entry of output) {
      entry.status = "REVIEW";
      entry.scope_note =
        "Расписание приписного храма; требуется отдельное сопоставление объекта";
    }
  }
  return [...new Map(output.map((e) => [e.id, e])).values()];
}
