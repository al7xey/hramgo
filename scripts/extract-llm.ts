import { Prisma, PrismaClient } from "@prisma/client";

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

function extractSchedule(text: string) {
  const lines = text
    .split(/\n|;/u)
    .map(compact)
    .filter((line) => /\d{1,2}[:.]\d{2}/u.test(line))
    .filter((line) => /литург|богослуж|вечер|всенощ|исповед|молеб|панихид|акафист|служб/iu.test(line))
    .map((line) => line.slice(0, 220));

  return Array.from(new Set(lines)).slice(0, 10).join("; ") || null;
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
        return new URL(url).hostname.replace(/^www\./u, "") === new URL(sourceUrl).hostname.replace(/^www\./u, "");
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
    const bestJson = getJson(bestSource.extractedJson);
    const phone = bestJson.phones?.[0];
    const email = bestJson.emails?.[0];
    const schedule = extractSchedule(mergedText);
    const history = extractHistory(mergedText);
    const description = firstLongParagraph(mergedText);
    const data: Prisma.TempleUpdateInput = {
      dataConfidence: Math.max(temple.dataConfidence, 0.7),
      lastVerifiedAt: new Date()
    };

    if (!temple.phone && phone) data.phone = phone;
    if (!temple.email && email) data.email = email;
    if (!temple.scheduleSummary && schedule) data.scheduleSummary = schedule;
    if (!temple.scheduleSourceUrl && schedule) data.scheduleSourceUrl = bestSource.url;
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
        await replaceEvidence(temple.id, fieldName, value, bestSource.url, excerpt(mergedText, value.slice(0, 20), 700), bestSource.confidence);
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
