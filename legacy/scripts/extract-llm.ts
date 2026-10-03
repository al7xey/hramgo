import { Prisma, PrismaClient } from "@prisma/client";

import { isLikelyTemplePhoto } from "../src/features/temples/photo-quality";

const prisma = new PrismaClient();

type SourceJson = {
  links?: string[];
  images?: string[];
  phones?: string[];
  emails?: string[];
};

type ExtractOptions = {
  limit?: number;
};

type ExtractedService = {
  kind: string;
  title: string;
  description: string;
};

const serviceKeywords: Record<string, { title: string; keywords: string[] }> = {
  sundaySchool: { title: "Воскресная школа", keywords: ["воскресная школа", "детская школа", "занятия для детей"] },
  youth: { title: "Молодежное движение", keywords: ["молодеж", "молодёж", "молодежное движение", "молодёжное движение"] },
  social: { title: "Социальное служение", keywords: ["социальное служение", "милосерд", "помощь нуждающимся"] },
  meetings: { title: "Приходские встречи", keywords: ["приходские встречи", "беседы", "встречи прихожан"] },
  choir: { title: "Хор", keywords: ["хор", "певч"] },
  pilgrimage: { title: "Паломничество", keywords: ["паломнич", "поездки"] },
  shop: { title: "Церковная лавка", keywords: ["лавка", "книжная лавка"] },
  refectory: { title: "Трапезная", keywords: ["трапезн"] }
};

function parseArgs(): ExtractOptions {
  const args = new Map<string, string | boolean>();

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split("=", 2);
      args.set(key, value);
    } else if (arg.startsWith("--")) {
      args.set(arg.slice(2), true);
    }
  }

  return { limit: args.has("limit") ? Number(args.get("limit")) : undefined };
}

function getJson(value: Prisma.JsonValue | null): SourceJson {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SourceJson) : {};
}

function compact(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function excerpt(text: string, keyword: string, max = 520) {
  const normalized = compact(text);
  const index = normalized.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) return normalized.slice(0, max);
  const start = Math.max(0, index - 120);
  return normalized.slice(start, start + max).trim();
}

function firstLongParagraph(text: string) {
  return text
    .split(/\n{2,}/u)
    .map(compact)
    .find((part) => part.length > 140 && !/распис|богослуж|тел\.?|email|@/iu.test(part))
    ?.slice(0, 900);
}

const timePattern = /\b([01]?\d|2[0-3])[.:](\d{2})\b/u;
const allTimesPattern = /\b([01]?\d|2[0-3])[.:](\d{2})\b/gu;
const scheduleKeywordPattern =
  /литург|богослуж|вечер|всенощ|утрен|исповед|молеб|панихид|акафист|часы|служб|бдение|канон|причащ|полиелей/iu;
const weekdayPattern = /будн|понедель|вторник|сред|четвер|пятниц/iu;
const weekendPattern = /выходн|суббот|воскрес|праздн|недел/iu;
const scheduleUrlPattern = /raspis|bogosl|schedule|sluzhb|calendar|kalendar|богослуж|распис/iu;
const dateNoisePattern =
  /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b|\([^)]+\.с\.\)|\b\d{1,2}\s*\/\s*\d{1,2}\b/giu;

function normalizeTime(value: string) {
  const match = value.match(timePattern);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function scheduleBucketFromText(text: string): "weekday" | "weekend" | "common" {
  const hasWeekday = weekdayPattern.test(text);
  const hasWeekend = weekendPattern.test(text);
  if (hasWeekend && !hasWeekday) return "weekend";
  if (hasWeekday && !hasWeekend) return "weekday";
  if (hasWeekend) return "weekend";
  if (hasWeekday) return "weekday";
  return "common";
}

function cleanScheduleLabel(value: string) {
  return compact(value)
    .replace(/^[•\-\u2013\u2014\s]+/u, "")
    .replace(dateNoisePattern, "")
    .replace(/\b\d{1,2}\s+[а-яё]{3,12}\.?/giu, "")
    .replace(/\([^)]*(?:будн|выходн|суббот|воскрес|праздн)[^)]*\)/giu, "")
    .replace(/\b(?:по|в)\s+(?:будням|будни|выходным|выходные|субботам|воскресеньям|праздникам)\b/giu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

function scheduleServiceLabel(value: string) {
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

function normalizeScheduleItems(value: string) {
  const normalized = compact(value)
    .replace(/\b([01]?\d|2[0-3])\.(\d{2})\b/gu, "$1:$2")
    .replace(dateNoisePattern, "");
  const serviceLabel = scheduleServiceLabel(normalized);
  const matches = Array.from(normalized.matchAll(allTimesPattern));
  if (matches.length === 0) return [];

  return matches.map((match) => {
    const time = `${match[1].padStart(2, "0")}:${match[2]}`;
    const afterTime = cleanScheduleLabel(
      normalized
        .replace(match[0], "")
        .replace(allTimesPattern, "")
        .replace(/^[\s\u2013\u2014,/-]+/u, "")
        .trim()
    );
    const label = serviceLabel ?? (afterTime.length <= 70 ? afterTime : "Богослужение");
    return `${time} — ${label || "Богослужение"}`.slice(0, 140);
  });
}

function splitScheduleLine(value: string) {
  const line = compact(value);
  const suffix = line.match(/\s+[\u2014\u2013-]\s+(.+)$/u)?.[1]?.trim();
  const parts = line.split(/\s+\/\s+/u).map((item) => item.trim()).filter(Boolean);

  if (parts.length <= 1) {
    return [line];
  }

  return parts.map((part, index) => {
    if (index < parts.length - 1 && suffix && !scheduleKeywordPattern.test(part)) {
      return `${part} — ${suffix}`;
    }
    return part;
  });
}

function collectScheduleLines(text: string) {
  const rawLines = text
    .split(/\n|;/u)
    .map(compact)
    .filter(Boolean);
  const candidates: string[] = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index];
    if (!timePattern.test(line)) continue;

    const next = rawLines[index + 1] ?? "";
    const enriched = scheduleKeywordPattern.test(line) ? line : compact(`${line} ${next}`);
    if (!scheduleKeywordPattern.test(enriched)) continue;

    candidates.push(...splitScheduleLine(enriched));
  }

  return candidates;
}

function extractSchedule(text: string) {
  const groups: Record<"weekday" | "weekend" | "common", string[]> = {
    weekday: [],
    weekend: [],
    common: []
  };
  const seen = new Set<string>();

  for (const candidate of collectScheduleLines(text)) {
    const items = normalizeScheduleItems(candidate);

    for (const item of items) {
      const key = `${scheduleBucketFromText(candidate)}:${normalizeTime(item) ?? item}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      groups[scheduleBucketFromText(candidate)].push(item);
    }
  }

  if (groups.weekday.length === 0 && groups.common.length > 0) {
    groups.weekday.push(...groups.common.slice(0, 4));
  }

  if (groups.weekend.length === 0) {
    groups.weekend.push(...groups.common.slice(0, 4));
  }

  const weekday = groups.weekday.slice(0, 5);
  const weekend = groups.weekend.slice(0, 5);
  const parts: string[] = [];

  if (weekday.length > 0) {
    parts.push(`Будни:\n${weekday.join(";\n")}`);
  }
  if (weekend.length > 0) {
    parts.push(`Выходные:\n${weekend.join(";\n")}`);
  }

  return parts.join("\n\n") || null;
}

function scheduleQuality(value?: string | null) {
  if (!value) return 0;
  const datePenalty = (value.match(dateNoisePattern)?.length ?? 0) * 2;
  return (
    (value.match(allTimesPattern)?.length ?? 0) +
    (/Будни\s*:/iu.test(value) ? 3 : 0) +
    (/Выходные\s*:/iu.test(value) ? 3 : 0) -
    datePenalty
  );
}

function shouldUpdateSchedule(existing: string | null, next: string | null) {
  if (!next) return false;
  if (!existing) return true;
  return scheduleQuality(next) > scheduleQuality(existing);
}

function pickScheduleSource(sources: Array<{ url: string; rawTitle: string | null; rawText: string | null; confidence: number }>) {
  const scheduleSources = sources.filter((source) => {
    const text = source.rawText ?? "";
    return scheduleUrlPattern.test(`${source.url} ${source.rawTitle ?? ""}`) || /расписание|богослужения/iu.test(text.slice(0, 2000));
  });

  return scheduleSources.find((source) => extractSchedule(source.rawText ?? "")) ?? sources[0];
}

function extractHistory(text: string) {
  const paragraphs = text.split(/\n{2,}/u).map(compact);
  const byHeader = paragraphs.find((part) => /истор|основан|построен|освящен|век|год/iu.test(part) && part.length > 180);
  return (byHeader ?? firstLongParagraph(text))?.slice(0, 1400) ?? null;
}

function extractClergy(text: string) {
  const clergy = new Map<string, { name: string; role: string; rank?: string }>();
  const pattern = /(настоятель|протоиерей|иерей|священник|диакон|епископ|митрополит)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){1,3})/giu;

  for (const match of text.matchAll(pattern)) {
    const rank = match[1];
    const name = match[2].trim();
    if (name.length < 5 || name.length > 80) continue;
    clergy.set(name.toLowerCase(), { name, rank, role: /настоятель/iu.test(rank) ? "Настоятель" : "Клирик" });
  }

  return Array.from(clergy.values()).slice(0, 8);
}

function extractServices(text: string) {
  const lower = text.toLowerCase();
  const services: ExtractedService[] = [];

  for (const [kind, config] of Object.entries(serviceKeywords)) {
    const keyword = config.keywords.find((item) => lower.includes(item));
    if (!keyword) continue;
    services.push({
      kind,
      title: config.title,
      description: excerpt(text, keyword, 420) || "Информация уточняется."
    });
  }

  return services;
}

function detectSocialType(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes("vk.com")) return "vk";
  if (lower.includes("t.me") || lower.includes("telegram")) return "telegram";
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("instagram")) return "instagram";
  return "other";
}

function socialLabel(type: string) {
  switch (type) {
    case "vk":
      return "ВКонтакте";
    case "telegram":
      return "Telegram";
    case "youtube":
      return "YouTube";
    case "instagram":
      return "Instagram";
    default:
      return "Социальная сеть";
  }
}

function getOfficialImages(sourceUrl: string, json: SourceJson) {
  return (json.images ?? [])
    .filter((url) => {
      try {
        return (
          new URL(url).hostname.replace(/^www\./u, "") === new URL(sourceUrl).hostname.replace(/^www\./u, "") &&
          isLikelyTemplePhoto({ imageUrl: url, sourceUrl })
        );
      } catch {
        return false;
      }
    })
    .slice(0, 4);
}

async function replaceEvidence(templeId: string, fieldName: string, value: string, sourceUrl: string, quote: string, confidence: number) {
  await prisma.templeFieldEvidence.deleteMany({ where: { templeId, fieldName, sourceUrl } });
  await prisma.templeFieldEvidence.create({
    data: {
      templeId,
      fieldName,
      value,
      sourceUrl,
      quote: quote.slice(0, 900),
      confidence,
      lastCheckedAt: new Date()
    }
  });
}

async function main() {
  const options = parseArgs();
  const job = await prisma.importJob.create({
    data: { type: "extract:llm", status: "RUNNING", startedAt: new Date(), stats: { options, mode: "deterministic" } as Prisma.InputJsonValue }
  });
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED", sources: { some: { rawText: { not: null } } } },
    include: { sources: { orderBy: { confidence: "desc" } }, socialLinks: true, clergy: true, parishServices: true, photos: true },
    orderBy: [{ dataConfidence: "asc" }, { name: "asc" }],
    take: options.limit
  });

  let updated = 0;
  let evidence = 0;
  let photos = 0;
  let services = 0;
  let clergyCount = 0;

  for (const temple of temples) {
    const sources = temple.sources.filter((source) => source.rawText);
    if (sources.length === 0) continue;

    const mergedText = sources.map((source) => source.rawText ?? "").join("\n\n");
    const bestSource = sources[0];
    const scheduleSource = pickScheduleSource(sources);
    const bestJson = getJson(bestSource.extractedJson);
    const phone = bestJson.phones?.[0];
    const email = bestJson.emails?.[0];
    const schedule = extractSchedule(scheduleSource.rawText ?? mergedText);
    const history = extractHistory(mergedText);
    const description = firstLongParagraph(mergedText);
    const data: Prisma.TempleUpdateInput = {
      dataConfidence: Math.max(temple.dataConfidence, 0.7),
      lastVerifiedAt: new Date()
    };

    if (!temple.phone && phone) data.phone = phone;
    if (!temple.email && email) data.email = email;
    if (shouldUpdateSchedule(temple.scheduleSummary, schedule)) {
      data.scheduleSummary = schedule;
      data.scheduleSourceUrl = scheduleSource.url;
    }
    if (!temple.historySummary && history) data.historySummary = history;
    if (!temple.description && description) data.description = description;

    await prisma.temple.update({ where: { id: temple.id }, data });
    updated += 1;

    for (const [fieldName, value] of [
      ["phone", phone],
      ["email", email],
      ["scheduleSummary", schedule],
      ["historySummary", history],
      ["description", description]
    ] as const) {
      if (value) {
        const source = fieldName === "scheduleSummary" ? scheduleSource : bestSource;
        const evidenceText = source.rawText ?? mergedText;
        await replaceEvidence(temple.id, fieldName, value, source.url, excerpt(evidenceText, value.slice(0, 20), 700), source.confidence);
        evidence += 1;
      }
    }

    const socialUrls = new Set(temple.socialLinks.map((link) => link.url));
    for (const source of sources) {
      const json = getJson(source.extractedJson);
      for (const url of json.links ?? []) {
        const type = detectSocialType(url);
        if (type === "other" || socialUrls.has(url)) continue;
        await prisma.templeSocialLink.create({
          data: { templeId: temple.id, url, type, label: socialLabel(type) }
        });
        socialUrls.add(url);
      }
    }

    const existingServiceKinds = new Set(temple.parishServices.map((service) => service.kind));
    for (const service of extractServices(mergedText)) {
      if (existingServiceKinds.has(service.kind)) continue;
      await prisma.templeParishService.create({
        data: {
          templeId: temple.id,
          kind: service.kind,
          title: service.title,
          description: service.description,
          sourceUrl: bestSource.url
        }
      });
      services += 1;
    }

    const existingClergy = new Set(temple.clergy.map((person) => person.name.toLowerCase()));
    for (const person of extractClergy(mergedText)) {
      if (existingClergy.has(person.name.toLowerCase())) continue;
      await prisma.templeClergy.create({ data: { templeId: temple.id, ...person } });
      clergyCount += 1;
    }

    const existingPhotos = new Set(temple.photos.map((photo) => photo.imageUrl));
    let hasMainPhoto = temple.photos.some((photo) => photo.isMain) || temple.photos.length > 0;
    for (const source of sources) {
      const json = getJson(source.extractedJson);
      for (const imageUrl of getOfficialImages(source.url, json)) {
        if (existingPhotos.has(imageUrl)) continue;
        await prisma.templePhoto.create({
          data: {
            templeId: temple.id,
            imageUrl,
            sourceUrl: source.url,
            alt: temple.name,
            copyrightStatus: "OFFICIAL_SITE",
            moderationStatus: "APPROVED",
            isApproved: true,
            isMain: !hasMainPhoto
          }
        });
        hasMainPhoto = true;
        existingPhotos.add(imageUrl);
        photos += 1;
      }
    }

    console.log(`Extracted: ${temple.name}`);
  }

  const stats = { temples: temples.length, updated, evidence, photos, services, clergy: clergyCount };
  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: "COMPLETED", finishedAt: new Date(), stats: stats as Prisma.InputJsonValue }
  });
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.importJob.create({
      data: {
        type: "extract:llm",
        status: "FAILED",
        error: error instanceof Error ? error.stack ?? error.message : String(error),
        finishedAt: new Date()
      }
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
