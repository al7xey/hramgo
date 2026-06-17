import { createHash } from "node:crypto";

import { Prisma, PrismaClient, SundaySchoolStatus, TempleModerationStatus } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "https://sprav.moseparh.ru";
const LIST_URL = `${BASE_URL}/monasteries`;
const TEXT_LIMIT = 3500;

type ListItem = {
  officialId: string;
  url: string;
  objectType: string;
  name: string;
  address?: string;
  affiliation?: string;
  area: string;
};

type Detail = {
  officialId: string;
  url: string;
  name: string;
  shortName: string;
  objectType?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  affiliation?: string;
  vicariate?: string;
  deanery?: string;
  rectorName?: string;
  clergy: { name: string; role: string; rank?: string }[];
  scheduleSummary?: string;
  historySummary?: string;
  activitySummary?: string;
  shrines?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  socialLinks: { label: string; url: string; type: string }[];
  rawText: string;
};

function parseArgs() {
  const args = new Map<string, string | boolean>();

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split("=", 2);
      args.set(key, value);
    } else if (arg.startsWith("--")) {
      args.set(arg.slice(2), true);
    }
  }

  return {
    limit: args.has("limit") ? Number(args.get("limit")) : undefined,
    replace: args.has("replace"),
    includeAllMoscow: args.has("include-all-moscow")
  };
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    laquo: "«",
    raquo: "»",
    mdash: "—",
    ndash: "–"
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&([a-z]+);/gi, (_, code: string) => named[code] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string) {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function trimText(value?: string | null, limit = TEXT_LIMIT) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trim()}…` : normalized;
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya"
  };

  return value
    .toLocaleLowerCase("ru-RU")
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function isMoscowAddress(address?: string) {
  if (!address) {
    return false;
  }

  return /(^|\s)(г\.?\s*)?москва\b|зеленоград|троицк|щербинка|московский|сосенское|десеновское|внуково|кокошкино|вороново|кленовское|краснопахорское|марушкинское|мосрентген|роговское|рязановское|филимонковское|щаповское/i.test(
    address
  );
}

function splitAffiliation(value?: string) {
  const parts = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  const vicariate = parts.find((item) => /викариатство/i.test(item));
  const deanery = parts.find((item) => /благочиние/i.test(item));

  return { vicariate, deanery };
}

async function fetchSession() {
  const response = await fetch(LIST_URL);
  const html = await response.text();
  const token = html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1];
  const cookie = (response.headers.get("set-cookie") ?? "")
    .split(/,(?=\s*[^;]+=)/)
    .map((item) => item.split(";")[0])
    .join("; ");

  if (!token) {
    throw new Error("Cannot get sprav.moseparh.ru CSRF token");
  }

  return { token, cookie };
}

async function fetchList(area: string) {
  const session = await fetchSession();
  const response = await fetch(`${LIST_URL}?`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-csrf-token": session.token,
      "x-requested-with": "XMLHttpRequest",
      cookie: session.cookie
    },
    body: new URLSearchParams({ query: "", area, parent_id: "" })
  });
  const html = await response.text();
  const items: ListItem[] = [];

  for (const match of html.matchAll(/<tr>[\s\S]*?<\/tr>/g)) {
    const row = match[0];
    const urlMatch = row.match(/href="(https:\/\/sprav\.moseparh\.ru\/org\/(\d+))"/);

    if (!urlMatch) {
      continue;
    }

    const objectType = stripHtml(row.match(/<td class="first min">([\s\S]*?)<\/td>/)?.[1] ?? "");
    const linkText = stripHtml(row.match(/<a href="https:\/\/sprav\.moseparh\.ru\/org\/\d+">([\s\S]*?)<\/a>/)?.[1] ?? "");
    const address = stripHtml(row.match(/Адрес:\s*([^<]+)/)?.[1] ?? "");
    const smallBlocks = [...row.matchAll(/<div class="small grey">([\s\S]*?)<\/div>/g)].map((item) => stripHtml(item[1]));
    const affiliation = smallBlocks.find((item) => /викариатство|благочиние/i.test(item));

    items.push({
      officialId: urlMatch[2],
      url: urlMatch[1],
      objectType,
      name: linkText,
      address,
      affiliation,
      area
    });
  }

  return items;
}

function getRows(html: string) {
  const rows = new Map<string, string>();

  for (const match of html.matchAll(/<tr[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<td class="last"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g)) {
    rows.set(stripHtml(match[1]), match[2]);
  }

  return rows;
}

function parseContacts(html: string) {
  const contactHtml = html.match(/<div class="item-contacts">([\s\S]*?)<\/div>\s*<!-- end \.item-contacts-->/)?.[1] ?? "";
  const contactText = stripHtml(contactHtml);
  const addressHtml = contactHtml.match(/<div class="text">([\s\S]*?)(?:<br\s*\/?>|<a href="tel:|<a href="https?:|<a href="mailto:)/i)?.[1];
  const phone = decodeHtml(contactHtml.match(/href="tel:([^"]+)"/)?.[1] ?? "");
  const email = decodeHtml(contactHtml.match(/href="mailto:([^"]+)"/)?.[1] ?? "");
  const websiteUrl = [...contactHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)]
    .map((item) => item[1])
    .find((url) => !url.includes("vk.com") && !url.includes("t.me") && !url.includes("youtube.com") && !url.includes("sprav.moseparh.ru"));
  const address =
    stripHtml(addressHtml ?? "") ||
    contactText
      .split(/\n|(?=\+7)|(?=https?:\/\/)|(?=[\w.-]+@)/)
      .map((item) => item.trim())
      .find((item) => isMoscowAddress(item));
  const socialLinks = [...contactHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)]
    .map((item) => item[1])
    .filter((url) => /vk\.com|t\.me|telegram|youtube|rutube/i.test(url))
    .map((url) => ({
      url,
      label: url.includes("vk.com") ? "VK" : url.includes("youtube") ? "YouTube" : "Соцсеть",
      type: url.includes("vk.com") ? "vk" : url.includes("youtube") ? "youtube" : "other"
    }));

  return { address, phone, email, websiteUrl, socialLinks };
}

function parseClergy(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/(?=(?:Иерей|Протоиерей|Диакон|Протодиакон|Священник|Иеромонах|Архимандрит|Епископ)\s)/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const rank = item.match(/^(Иерей|Протоиерей|Диакон|Протодиакон|Священник|Иеромонах|Архимандрит|Епископ)\b/)?.[1];

      return {
        name: item,
        rank,
        role: "Духовенство"
      };
    });
}

function inferServices(activity?: string) {
  const services: { kind: string; title: string; description: string }[] = [];
  const text = activity ?? "";

  const add = (kind: string, title: string, pattern: RegExp) => {
    if (pattern.test(text)) {
      services.push({
        kind,
        title,
        description: trimText(text, 700) ?? title
      });
    }
  };

  add("sundaySchool", "Воскресная школа", /воскресн/i);
  add("youth", "Молодежное служение", /молод[её]ж/i);
  add("social", "Социальное служение", /социаль|помощ|милосерд/i);
  add("choir", "Хор", /хор|певч/i);
  add("meetings", "Приходские встречи", /встреч|лектори|бесед|катехиз/i);
  add("pilgrimage", "Паломничество", /паломнич/i);

  return services;
}

async function fetchDetail(item: ListItem): Promise<Detail> {
  const html = await (await fetch(item.url)).text();
  const rows = getRows(html);
  const contacts = parseContacts(html);
  const h1 = stripHtml(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? item.name);
  const affiliation = stripHtml(rows.get("Принадлежность") ?? "") || item.affiliation;
  const { vicariate, deanery } = splitAffiliation(affiliation);
  const rectorName = stripHtml(rows.get("Настоятель") ?? "") || undefined;
  const clergy = parseClergy(stripHtml(rows.get("Духовенство") ?? ""));
  const scheduleSummary = trimText(stripHtml(rows.get("Богослужения") ?? ""));
  const historySummary = trimText(stripHtml(rows.get("История") ?? ""));
  const activitySummary = trimText(stripHtml(rows.get("Деятельность") ?? ""));
  const shrines = trimText(stripHtml(rows.get("Святыни") ?? rows.get("Престольный праздник") ?? ""));
  const coords = stripHtml(rows.get("Координаты для навигации") ?? "").match(/(5[5-6]\.\d+)\s*,\s*(3[6-8]\.\d+)/);
  const photoSrc = html.match(/<img src="(\/uploads\/organisations\/[^"]+)"/)?.[1];
  const rawText = trimText(stripHtml(html), 9000) ?? "";

  return {
    officialId: item.officialId,
    url: item.url,
    name: h1,
    shortName: item.name || h1,
    objectType: item.objectType,
    address: contacts.address || item.address,
    phone: contacts.phone || undefined,
    email: contacts.email || undefined,
    websiteUrl: contacts.websiteUrl,
    affiliation,
    vicariate,
    deanery,
    rectorName,
    clergy,
    scheduleSummary,
    historySummary,
    activitySummary,
    shrines,
    latitude: coords ? Number(coords[1]) : undefined,
    longitude: coords ? Number(coords[2]) : undefined,
    photoUrl: photoSrc ? `${BASE_URL}${photoSrc}` : undefined,
    socialLinks: contacts.socialLinks,
    rawText
  };
}

async function upsertTemple(detail: Detail) {
  const slug = `sprav-${detail.officialId}-${slugify(detail.shortName || detail.name)}`;
  const description = trimText(detail.activitySummary ?? detail.historySummary ?? detail.scheduleSummary, 1000);
  const services = inferServices(detail.activitySummary);
  const sourceHash = createHash("sha256").update(detail.rawText).digest("hex");
  const existing = await prisma.temple.findFirst({
    where: {
      OR: [{ sourcePrimaryUrl: detail.url }, { slug }]
    },
    select: { id: true, slug: true }
  });
  const data: Prisma.TempleUncheckedCreateInput = {
    slug: existing?.slug ?? slug,
    name: detail.name,
    shortName: detail.shortName,
    description,
    address: detail.address,
    district: undefined,
    metro: undefined,
    latitude: detail.latitude,
    longitude: detail.longitude,
    websiteUrl: detail.websiteUrl,
    phone: detail.phone,
    email: detail.email,
    rectorName: detail.rectorName,
    vicariate: detail.vicariate,
    deanery: detail.deanery,
    objectType: detail.objectType,
    affiliation: detail.affiliation,
    historySummary: detail.historySummary,
    shrinesSummary: detail.shrines,
    scheduleSummary: detail.scheduleSummary,
    scheduleSourceUrl: detail.scheduleSummary ? detail.url : detail.websiteUrl ?? detail.url,
    sundaySchoolStatus: services.some((service) => service.kind === "sundaySchool") ? SundaySchoolStatus.YES : SundaySchoolStatus.UNKNOWN,
    sundaySchoolDescription: services.find((service) => service.kind === "sundaySchool")?.description,
    sundaySchoolSourceUrl: services.some((service) => service.kind === "sundaySchool") ? detail.url : undefined,
    sundaySchoolConfidence: services.some((service) => service.kind === "sundaySchool") ? 0.85 : undefined,
    sourcePrimaryUrl: detail.url,
    dataConfidence: 0.9,
    moderationStatus: TempleModerationStatus.PUBLISHED,
    lastCrawledAt: new Date(),
    lastVerifiedAt: new Date()
  };
  const temple = existing
    ? await prisma.temple.update({ where: { id: existing.id }, data })
    : await prisma.temple.create({ data });

  await prisma.$transaction([
    prisma.templeSource.deleteMany({ where: { templeId: temple.id, sourceType: "moseparh_card" } }),
    prisma.templeFieldEvidence.deleteMany({ where: { templeId: temple.id } }),
    prisma.templeSocialLink.deleteMany({ where: { templeId: temple.id } }),
    prisma.templeClergy.deleteMany({ where: { templeId: temple.id } }),
    prisma.templeParishService.deleteMany({ where: { templeId: temple.id } })
  ]);

  await prisma.templeSource.create({
    data: {
      templeId: temple.id,
      url: detail.url,
      sourceType: "moseparh_card",
      rawTitle: detail.name,
      rawText: detail.rawText,
      extractedJson: { officialId: detail.officialId, hash: sourceHash } as Prisma.InputJsonValue,
      confidence: 0.9
    }
  });

  const evidences = [
    ["name", detail.name],
    ["address", detail.address],
    ["phone", detail.phone],
    ["email", detail.email],
    ["websiteUrl", detail.websiteUrl],
    ["rectorName", detail.rectorName],
    ["scheduleSummary", detail.scheduleSummary],
    ["historySummary", detail.historySummary],
    ["clergy", detail.clergy.map((item) => item.name).join("; ")],
    ["coordinates", detail.latitude && detail.longitude ? `${detail.latitude}, ${detail.longitude}` : undefined]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([fieldName, value]) => ({
      templeId: temple.id,
      fieldName: fieldName!,
      value: String(value),
      sourceUrl: detail.url,
      quote: trimText(String(value), 900),
      confidence: 0.9,
      lastCheckedAt: new Date()
    }));

  if (evidences.length > 0) {
    await prisma.templeFieldEvidence.createMany({ data: evidences });
  }

  if (detail.socialLinks.length > 0) {
    await prisma.templeSocialLink.createMany({
      data: detail.socialLinks.map((link) => ({
        templeId: temple.id,
        label: link.label,
        url: link.url,
        type: link.type
      })),
      skipDuplicates: true
    });
  }

  const clergy = [...(detail.rectorName ? [{ name: detail.rectorName, role: "Настоятель", rank: undefined }] : []), ...detail.clergy];
  if (clergy.length > 0) {
    await prisma.templeClergy.createMany({
      data: clergy.map((person) => ({
        templeId: temple.id,
        name: person.name,
        role: person.role,
        rank: person.rank
      }))
    });
  }

  if (services.length > 0) {
    await prisma.templeParishService.createMany({
      data: services.map((service) => ({
        templeId: temple.id,
        kind: service.kind,
        title: service.title,
        description: service.description,
        sourceUrl: detail.url
      }))
    });
  }

  if (detail.photoUrl) {
    await prisma.templePhoto.upsert({
      where: {
        id: `moseparh-${detail.officialId}`
      },
      update: {
        imageUrl: detail.photoUrl,
        sourceUrl: detail.url,
        alt: detail.shortName,
        copyrightStatus: "OFFICIAL_SITE",
        moderationStatus: "APPROVED",
        isMain: true,
        isApproved: true
      },
      create: {
        id: `moseparh-${detail.officialId}`,
        templeId: temple.id,
        imageUrl: detail.photoUrl,
        sourceUrl: detail.url,
        alt: detail.shortName,
        copyrightStatus: "OFFICIAL_SITE",
        moderationStatus: "APPROVED",
        isMain: true,
        isApproved: true
      }
    });
  }

  return temple.id;
}

async function main() {
  const options = parseArgs();
  const areas = options.includeAllMoscow ? ["all"] : ["moscow", "stavrop"];
  const listById = new Map<string, ListItem>();

  for (const area of areas) {
    const items = await fetchList(area);

    for (const item of items) {
      if (area === "stavrop" || area === "all") {
        if (!isMoscowAddress(item.address)) {
          continue;
        }
      }

      listById.set(item.officialId, item);
    }
  }

  const list = [...listById.values()].slice(0, options.limit);
  const job = await prisma.importJob.create({
    data: {
      type: "import:official-list",
      status: "RUNNING",
      startedAt: new Date(),
      stats: { totalFound: listById.size, limit: options.limit ?? null } as Prisma.InputJsonValue
    }
  });

  if (options.replace) {
    await prisma.temple.updateMany({
      where: {
        sourcePrimaryUrl: {
          not: {
            startsWith: BASE_URL
          }
        }
      },
      data: {
        moderationStatus: TempleModerationStatus.DRAFT
      }
    });
  }

  let imported = 0;
  let failed = 0;
  let withSchedule = 0;
  let withPhoto = 0;

  for (const item of list) {
    try {
      const detail = await fetchDetail(item);

      if (item.area !== "moscow" && !isMoscowAddress(detail.address)) {
        continue;
      }

      await upsertTemple(detail);
      imported += 1;
      withSchedule += detail.scheduleSummary ? 1 : 0;
      withPhoto += detail.photoUrl ? 1 : 0;

      if (imported % 25 === 0 || options.limit) {
        console.log(`Imported ${imported}/${list.length}: ${detail.shortName}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed ${item.url}`, error);
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      finishedAt: new Date(),
      stats: {
        totalFound: listById.size,
        attempted: list.length,
        imported,
        failed,
        withSchedule,
        withPhoto,
        source: BASE_URL
      } as Prisma.InputJsonValue
    }
  });

  console.log(JSON.stringify({ totalFound: listById.size, attempted: list.length, imported, failed, withSchedule, withPhoto }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
