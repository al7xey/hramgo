import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const timePattern = /([01]?\d|2[0-3])[.:](\d{2})/gu;
const weekdayPattern = /будн|понедель|вторник|сред|четвер|пятниц/iu;
const weekendPattern = /выходн|суббот|воскрес|праздн|недел/iu;
const dateNoisePattern =
  /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b|\([^)]+\.с\.\)|\b\d{1,2}\s*\/\s*\d{1,2}\b/giu;

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function bucketFromText(value: string): "weekday" | "weekend" | "common" {
  const hasWeekday = weekdayPattern.test(value);
  const hasWeekend = weekendPattern.test(value);
  if (hasWeekend && !hasWeekday) return "weekend";
  if (hasWeekday && !hasWeekend) return "weekday";
  if (hasWeekend) return "weekend";
  if (hasWeekday) return "weekday";
  return "common";
}

function serviceLabel(value: string) {
  const lower = value.toLowerCase();
  if (/ранн\w*\s+литург/iu.test(lower)) return "Ранняя Литургия";
  if (/поздн\w*\s+литург/iu.test(lower)) return "Поздняя Литургия";
  if (/литург/iu.test(lower)) return "Литургия";
  if (/всенощ|бдение/iu.test(lower)) return "Всенощное бдение";
  if (/вечерн/iu.test(lower)) return "Вечернее богослужение";
  if (/утрен/iu.test(lower)) return "Утреня";
  if (/исповед/iu.test(lower)) return "Исповедь";
  if (/молеб/iu.test(lower)) return "Молебен";
  if (/панихид/iu.test(lower)) return "Панихида";
  if (/акафист/iu.test(lower)) return "Акафист";
  if (/богослуж|служб/iu.test(lower)) return "Богослужение";
  return null;
}

function cleanValue(value: string) {
  return compact(value)
    .replace(/^(будни|выходные(?:\s+и\s+праздники)?):\s*/iu, "")
    .replace(dateNoisePattern, "")
    .replace(/\b\d{1,2}\s+[а-яё]{3,12}\.?/giu, "")
    .replace(/\([^)]*(?:будн|выходн|суббот|воскрес|праздн)[^)]*\)/giu, "")
    .replace(/\b(?:по|в)\s+(?:будням|будни|выходным|выходные|субботам|воскресеньям|праздникам)\b/giu, "")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/\s+[\u2014\u2013-]\s*$/u, "")
    .trim();
}

function normalizeItems(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = cleanValue(value.replace(/\b([01]?\d|2[0-3])\.(\d{2})\b/gu, "$1:$2"));
    const label = serviceLabel(clean);
    const matches = Array.from(clean.matchAll(timePattern));

    for (const match of matches) {
      const time = `${match[1].padStart(2, "0")}:${match[2]}`;
      if (seen.has(time)) continue;
      seen.add(time);
      const afterTime = clean
        .replace(match[0], "")
        .replace(timePattern, "")
        .replace(/^[\s\u2013\u2014,/-]+/u, "")
        .trim();
      const safeLabel = label ?? (afterTime.length > 0 && afterTime.length <= 70 ? afterTime : "Богослужение");
      result.push(`${time} — ${safeLabel}`);
    }
  }

  return result.slice(0, 5);
}

function sectionItems(text: string, section: "weekday" | "weekend") {
  const pattern = /(Будни|Выходные(?:\s+и\s+праздники)?)\s*:\s*([\s\S]*?)(?=(?:Будни|Выходные(?:\s+и\s+праздники)?|Примечание)\s*:|$)/giu;
  const items: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const bucket = match[1].toLowerCase().includes("выход") ? "weekend" : "weekday";
    if (bucket !== section) continue;
    items.push(...match[2].split(/\n|;\s*|•\s*/u).map((item) => item.trim()).filter(Boolean));
  }

  return items;
}

function normalizeSchedule(text: string) {
  const structuredWeekday = sectionItems(text, "weekday");
  const structuredWeekend = sectionItems(text, "weekend");
  const fallbackItems = text.split(/\n|;\s*|•\s*|(?<=\.)\s+/u).map((item) => item.trim()).filter(Boolean);

  const weekdaySource = structuredWeekday.length > 0 ? structuredWeekday : fallbackItems.filter((item) => bucketFromText(item) === "weekday");
  const weekendSource = structuredWeekend.length > 0 ? structuredWeekend : fallbackItems.filter((item) => bucketFromText(item) === "weekend");
  const commonSource = fallbackItems.filter((item) => bucketFromText(item) === "common");

  const weekday = normalizeItems(weekdaySource.length > 0 ? weekdaySource : commonSource);
  const weekend = normalizeItems(weekendSource);
  const parts: string[] = [];

  if (weekday.length > 0) parts.push(`Будни:\n${weekday.join(";\n")}`);
  if (weekend.length > 0) parts.push(`Выходные:\n${weekend.join(";\n")}`);

  return parts.join("\n\n") || null;
}

async function main() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED", scheduleSummary: { not: null } },
    select: { id: true, scheduleSummary: true }
  });

  let updated = 0;
  let emptied = 0;

  for (const temple of temples) {
    const normalized = normalizeSchedule(temple.scheduleSummary ?? "");
    if (!normalized) {
      emptied += 1;
      continue;
    }
    if (normalized !== temple.scheduleSummary) {
      await prisma.temple.update({ where: { id: temple.id }, data: { scheduleSummary: normalized } });
      updated += 1;
    }
  }

  const stats = { temples: temples.length, updated, emptied };
  await prisma.importJob.create({
    data: { type: "normalize:temple-schedules", status: "COMPLETED", startedAt: new Date(), finishedAt: new Date(), stats }
  });
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
