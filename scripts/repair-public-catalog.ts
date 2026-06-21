import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TransitInput = {
  station: string;
  lineId: string;
  lineName: string;
  lineColor: string;
  system: "metro" | "mcc" | "mcd";
  distanceMeters: number;
  walkMinutes: number;
};

type PublicObjectInput = {
  slug: string;
  aliases?: string[];
  name: string;
  shortName: string;
  objectType: "church" | "monastery";
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  websiteUrl?: string;
  phone?: string;
  email?: string;
  sourcePrimaryUrl?: string;
  description?: string;
  historySummary?: string;
  scheduleSummary?: string;
  scheduleSourceUrl?: string;
  transit: TransitInput[];
  commonsCategories?: string[];
  commonsQueries?: string[];
  forceCommonsMain?: boolean;
};

const now = new Date();

const objects: PublicObjectInput[] = [
  {
    slug: "hram-antipy-pergamskogo-na-kolymazhnom-dvore",
    aliases: ["sprav-7-antipy-pergamskogo-svyaschennomuchenika-na-kolymazhnom-dvore"],
    name: "Храм священномученика Антипы, епископа Пергамского, на Колымажном дворе",
    shortName: "Храм Антипы Пергамского на Колымажном дворе",
    objectType: "church",
    address: "Колымажный пер., д. 8/4, стр. 1",
    district: "Хамовники",
    latitude: 55.74795,
    longitude: 37.60612,
    websiteUrl: "https://hramantipa.ru/",
    phone: "+7 (495) 691-61-90",
    sourcePrimaryUrl: "https://sprav.moseparh.ru/org/7",
    description: "Православный храм в районе Хамовники, один из старейших храмовых комплексов Москвы рядом с Колымажным двором.",
    historySummary:
      "Храм священномученика Антипы на Колымажном дворе известен как древний храмовый комплекс Занеглименья, сформированный в XVI-XVIII веках.",
    scheduleSummary: "Будни: 8:00 — Литургия. 17:00 — Вечернее богослужение. Выходные: 8:00 — Литургия. 17:00 — Всенощное бдение.",
    scheduleSourceUrl: "https://hramantipa.ru/",
    transit: [
      { station: "Кропоткинская", lineId: "1", lineName: "Сокольническая", lineColor: "#E42313", system: "metro", distanceMeters: 310, walkMinutes: 4 },
      { station: "Боровицкая", lineId: "9", lineName: "Серпуховско-Тимирязевская", lineColor: "#ADACAC", system: "metro", distanceMeters: 420, walkMinutes: 5 }
    ],
    commonsCategories: ["Category:Church of Saint Antipas of Pergamum in Kolymazhny Dvor"],
    commonsQueries: ["Church of Saint Antipas of Pergamum in Kolymazhny Dvor", "Храм Антипы Пергамского на Колымажном дворе"],
    forceCommonsMain: true
  },
  {
    slug: "sretenskiy-stavropigialnyy-muzhskoy-monastyr",
    name: "Сретенский ставропигиальный мужской монастырь",
    shortName: "Сретенский монастырь",
    objectType: "monastery",
    address: "ул. Большая Лубянка, д. 19, стр. 1",
    district: "Мещанский",
    latitude: 55.76526,
    longitude: 37.63059,
    websiteUrl: "https://monastery.ru/",
    sourcePrimaryUrl: "https://monastery.ru/",
    description: "Действующий ставропигиальный мужской монастырь в центре Москвы на Большой Лубянке.",
    scheduleSummary: "Будни: 8:00 — Литургия. 18:00 — Вечернее богослужение. Выходные: 7:00 — ранняя Литургия. 10:00 — поздняя Литургия. 18:00 — Всенощное бдение.",
    scheduleSourceUrl: "https://monastery.ru/bogosluzheniya/",
    transit: [
      { station: "Сретенский бульвар", lineId: "10", lineName: "Люблинско-Дмитровская", lineColor: "#BED12C", system: "metro", distanceMeters: 390, walkMinutes: 5 }
    ],
    commonsCategories: ["Category:Sretensky Monastery"],
    commonsQueries: ["Сретенский монастырь Москва", "Sretensky Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "novospasskiy-stavropigialnyy-muzhskoy-monastyr",
    name: "Новоспасский ставропигиальный мужской монастырь",
    shortName: "Новоспасский монастырь",
    objectType: "monastery",
    address: "Крестьянская пл., д. 10",
    district: "Таганский",
    latitude: 55.73167,
    longitude: 37.65681,
    websiteUrl: "https://новоспасский-монастырь.рф/",
    sourcePrimaryUrl: "https://новоспасский-монастырь.рф/",
    description: "Действующий ставропигиальный мужской монастырь на Крестьянской площади.",
    scheduleSummary: "Будни: 8:00 — Литургия. 17:00 — Вечернее богослужение. Выходные: 7:00 — ранняя Литургия. 9:00 — поздняя Литургия. 17:00 — Всенощное бдение.",
    transit: [
      { station: "Крестьянская Застава", lineId: "10", lineName: "Люблинско-Дмитровская", lineColor: "#BED12C", system: "metro", distanceMeters: 520, walkMinutes: 7 }
    ],
    commonsCategories: ["Category:Novospassky Monastery"],
    commonsQueries: ["Новоспасский монастырь Москва", "Novospassky Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "spaso-andronikov-monastyr",
    aliases: ["sprav-338-andronikova-monastyrya-hramy"],
    name: "Спасо-Андроников монастырь",
    shortName: "Спасо-Андроников монастырь",
    objectType: "monastery",
    address: "Андроньевская пл., д. 10",
    district: "Таганский",
    latitude: 55.74845,
    longitude: 37.66991,
    sourcePrimaryUrl: "https://sprav.moseparh.ru/org/338",
    description: "Монастырский комплекс на Андроньевской площади в Таганском районе Москвы.",
    transit: [
      { station: "Площадь Ильича", lineId: "8", lineName: "Калининская", lineColor: "#FFCD1C", system: "metro", distanceMeters: 650, walkMinutes: 8 }
    ],
    commonsCategories: ["Category:Andronikov Monastery"],
    commonsQueries: ["Спасо-Андроников монастырь Москва", "Andronikov Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "nikolo-perervinskiy-monastyr",
    aliases: ["sprav-1209-nikolo-perervinskogo-monastyrya-hramy"],
    name: "Николо-Перервинский монастырь",
    shortName: "Николо-Перервинский монастырь",
    objectType: "monastery",
    address: "ул. Шоссейная, д. 82",
    district: "Печатники",
    latitude: 55.67411,
    longitude: 37.71843,
    sourcePrimaryUrl: "https://sprav.moseparh.ru/org/1209",
    description: "Монастырский комплекс в районе Печатники на Шоссейной улице.",
    transit: [
      { station: "Братиславская", lineId: "10", lineName: "Люблинско-Дмитровская", lineColor: "#BED12C", system: "metro", distanceMeters: 2200, walkMinutes: 27 }
    ],
    commonsCategories: ["Category:Nikolo-Perervinsky Monastery"],
    commonsQueries: ["Николо-Перервинский монастырь Москва", "Nikolo-Perervinsky Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "donskoy-stavropigialnyy-muzhskoy-monastyr",
    name: "Донской ставропигиальный мужской монастырь",
    shortName: "Донской монастырь",
    objectType: "monastery",
    address: "Донская пл., д. 1-3",
    district: "Донской",
    latitude: 55.71477,
    longitude: 37.60123,
    websiteUrl: "https://donskoi.org/",
    sourcePrimaryUrl: "https://donskoi.org/",
    description: "Действующий ставропигиальный мужской монастырь на Донской площади.",
    transit: [
      { station: "Шаболовская", lineId: "6", lineName: "Калужско-Рижская", lineColor: "#F07E24", system: "metro", distanceMeters: 820, walkMinutes: 10 }
    ],
    commonsCategories: ["Category:Donskoy Monastery"],
    commonsQueries: ["Донской монастырь Москва", "Donskoy Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "svyato-danilov-muzhskoy-monastyr",
    name: "Свято-Данилов мужской монастырь",
    shortName: "Данилов монастырь",
    objectType: "monastery",
    address: "ул. Даниловский Вал, д. 22",
    district: "Даниловский",
    latitude: 55.71095,
    longitude: 37.63056,
    websiteUrl: "https://msdm.ru/",
    sourcePrimaryUrl: "https://msdm.ru/",
    description: "Действующий мужской монастырь на Даниловском Валу.",
    transit: [
      { station: "Тульская", lineId: "9", lineName: "Серпуховско-Тимирязевская", lineColor: "#ADACAC", system: "metro", distanceMeters: 840, walkMinutes: 11 }
    ],
    commonsCategories: ["Category:Danilov Monastery"],
    commonsQueries: ["Данилов монастырь Москва", "Danilov Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "vysoko-petrovskiy-muzhskoy-monastyr",
    name: "Высоко-Петровский мужской монастырь",
    shortName: "Высоко-Петровский монастырь",
    objectType: "monastery",
    address: "ул. Петровка, д. 28",
    district: "Тверской",
    latitude: 55.76804,
    longitude: 37.61442,
    websiteUrl: "https://vpmon.ru/",
    sourcePrimaryUrl: "https://vpmon.ru/",
    description: "Действующий мужской монастырь на улице Петровка.",
    transit: [
      { station: "Трубная", lineId: "10", lineName: "Люблинско-Дмитровская", lineColor: "#BED12C", system: "metro", distanceMeters: 420, walkMinutes: 5 }
    ],
    commonsCategories: ["Category:Vysokopetrovsky Monastery"],
    commonsQueries: ["Высоко-Петровский монастырь Москва", "Vysokopetrovsky Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "novodevichiy-stavropigialnyy-zhenskiy-monastyr",
    name: "Новодевичий ставропигиальный женский монастырь",
    shortName: "Новодевичий монастырь",
    objectType: "monastery",
    address: "Новодевичий пр., д. 1",
    district: "Хамовники",
    latitude: 55.72628,
    longitude: 37.55691,
    websiteUrl: "https://novodev.msk.ru/",
    sourcePrimaryUrl: "https://novodev.msk.ru/",
    description: "Действующий женский монастырь и исторический ансамбль в Хамовниках.",
    transit: [
      { station: "Спортивная", lineId: "1", lineName: "Сокольническая", lineColor: "#E42313", system: "metro", distanceMeters: 760, walkMinutes: 10 }
    ],
    commonsCategories: ["Category:Novodevichy Convent"],
    commonsQueries: ["Новодевичий монастырь Москва", "Novodevichy Convent Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "pokrovskiy-stavropigialnyy-zhenskiy-monastyr",
    name: "Покровский ставропигиальный женский монастырь",
    shortName: "Покровский монастырь",
    objectType: "monastery",
    address: "ул. Таганская, д. 58",
    district: "Таганский",
    latitude: 55.73896,
    longitude: 37.66924,
    websiteUrl: "https://pokrov-monastir.ru/",
    sourcePrimaryUrl: "https://pokrov-monastir.ru/",
    description: "Действующий женский монастырь на Таганской улице.",
    transit: [
      { station: "Марксистская", lineId: "8", lineName: "Калининская", lineColor: "#FFCD1C", system: "metro", distanceMeters: 890, walkMinutes: 12 }
    ],
    commonsCategories: ["Category:Pokrovsky Monastery, Moscow"],
    commonsQueries: ["Покровский монастырь Москва Таганская", "Pokrovsky Monastery Moscow Taganskaya"],
    forceCommonsMain: true
  },
  {
    slug: "zachatevskiy-stavropigialnyy-zhenskiy-monastyr",
    name: "Зачатьевский ставропигиальный женский монастырь",
    shortName: "Зачатьевский монастырь",
    objectType: "monastery",
    address: "2-й Зачатьевский пер., д. 2",
    district: "Хамовники",
    latitude: 55.74066,
    longitude: 37.59925,
    websiteUrl: "https://zachatevmon.ru/",
    sourcePrimaryUrl: "https://zachatevmon.ru/",
    description: "Действующий женский монастырь в Хамовниках.",
    transit: [
      { station: "Парк культуры", lineId: "5", lineName: "Кольцевая", lineColor: "#915133", system: "metro", distanceMeters: 740, walkMinutes: 10 }
    ],
    commonsCategories: ["Category:Zachatievsky Monastery"],
    commonsQueries: ["Зачатьевский монастырь Москва", "Zachatievsky Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "andreevskiy-stavropigialnyy-muzhskoy-monastyr",
    name: "Андреевский ставропигиальный мужской монастырь",
    shortName: "Андреевский монастырь",
    objectType: "monastery",
    address: "Андреевская наб., д. 2",
    district: "Гагаринский",
    latitude: 55.71083,
    longitude: 37.57412,
    websiteUrl: "https://andreevskymon.ru/",
    sourcePrimaryUrl: "https://andreevskymon.ru/",
    description: "Действующий мужской монастырь на Андреевской набережной.",
    transit: [
      { station: "Площадь Гагарина", lineId: "14", lineName: "МЦК", lineColor: "#CC4C6E", system: "mcc", distanceMeters: 980, walkMinutes: 13 }
    ],
    commonsCategories: ["Category:St. Andrew's Monastery (Moscow)"],
    commonsQueries: ["Андреевский монастырь Москва", "St Andrew Monastery Moscow"],
    forceCommonsMain: true
  },
  {
    slug: "hram-pokrova-presvyatoy-bogoroditsy-na-gorodne",
    aliases: ["sprav-1124-pokrova-presvyatoy-bogoroditsy-na-gorodne"],
    name: "Храм Покрова Пресвятой Богородицы на Городне",
    shortName: "Храм Покрова на Городне",
    objectType: "church",
    address: "ул. 2-я Покровская, д. 24",
    district: "Чертаново Южное",
    latitude: 55.6076,
    longitude: 37.62067,
    websiteUrl: "https://pokrovgorod.ru/",
    sourcePrimaryUrl: "https://pokrovgorod.ru/",
    description: "Православный храм в районе Чертаново Южное, рядом с МЦД Покровское.",
    scheduleSourceUrl: "https://pokrovgorod.ru/raspisanie-bogosluzhenij2/",
    transit: [
      { station: "Покровское", lineId: "D2", lineName: "МЦД-2 Курско-Рижский", lineColor: "#E94282", system: "mcd", distanceMeters: 180, walkMinutes: 2 }
    ],
    commonsQueries: ["Храм Покрова на Городне", "Protection of the Holy Virgin Temple Gorodne Moscow"],
    forceCommonsMain: true
  }
];

async function main() {
  const stats = { upserted: 0, photosAdded: 0, namesFixed: 0, hiddenOutsideMoscow: 0, duplicatesHidden: 0 };

  await prisma.temple.updateMany({
    where: {
      moderationStatus: "PUBLISHED",
      address: { contains: "Московская обл", mode: "insensitive" }
    },
    data: { moderationStatus: "REVIEW" }
  }).then((result) => {
    stats.hiddenOutsideMoscow += result.count;
  });

  for (const item of objects) {
    const temple = await upsertPublicObject(item);
    stats.upserted += 1;
    stats.photosAdded += await ensureCommonsPhotos(temple.id, item);
  }

  stats.namesFixed += await fixMonasteryNames();
  stats.duplicatesHidden += await hideKnownDuplicates();

  console.log(JSON.stringify(stats, null, 2));
}

async function hideKnownDuplicates() {
  const result = await prisma.temple.updateMany({
    where: {
      slug: { in: ["hram-pokrova-presvyatoy-bogoroditsy-na-gorodne"] },
      moderationStatus: "PUBLISHED"
    },
    data: {
      moderationStatus: "REVIEW",
      lastVerifiedAt: now
    }
  });

  return result.count;
}

async function upsertPublicObject(input: PublicObjectInput) {
  const alias = input.aliases?.[0];
  const existing = alias
    ? await prisma.temple.findFirst({ where: { OR: [{ slug: input.slug }, { slug: { in: input.aliases } }] } })
    : await prisma.temple.findUnique({ where: { slug: input.slug } });
  const slug = existing?.slug ?? input.slug;
  const data = {
    slug,
    name: input.name,
    shortName: input.shortName,
    objectType: input.objectType,
    address: input.address,
    district: input.district,
    latitude: input.latitude,
    longitude: input.longitude,
    websiteUrl: input.websiteUrl,
    phone: input.phone,
    email: input.email,
    sourcePrimaryUrl: input.sourcePrimaryUrl,
    description: input.description,
    historySummary: input.historySummary,
    scheduleSummary: input.scheduleSummary,
    scheduleSourceUrl: input.scheduleSourceUrl,
    moderationStatus: "PUBLISHED" as const,
    sundaySchoolStatus: "UNKNOWN" as const,
    dataConfidence: 0.9,
    lastVerifiedAt: now
  };

  const temple = existing
    ? await prisma.temple.update({ where: { id: existing.id }, data })
    : await prisma.temple.create({ data });

  await prisma.templeTransit.deleteMany({ where: { templeId: temple.id } });
  await prisma.templeTransit.createMany({
    data: input.transit.map((item) => ({ ...item, templeId: temple.id }))
  });

  return temple;
}

async function fixMonasteryNames() {
  const fixes = [
    { contains: "Андроникова монастыря", name: "Спасо-Андроников монастырь", shortName: "Спасо-Андроников монастырь" },
    { contains: "Николо-Перервинского монастыря", name: "Николо-Перервинский монастырь", shortName: "Николо-Перервинский монастырь" }
  ];
  let count = 0;

  for (const fix of fixes) {
    const result = await prisma.temple.updateMany({
      where: { name: { contains: fix.contains, mode: "insensitive" } },
      data: { name: fix.name, shortName: fix.shortName, objectType: "monastery", lastVerifiedAt: now }
    });
    count += result.count;
  }

  return count;
}

async function ensureCommonsPhotos(templeId: string, input: PublicObjectInput) {
  const existing = await prisma.templePhoto.findMany({
    where: { templeId },
    select: { imageUrl: true, sourceUrl: true }
  });
  const seen = new Set(existing.flatMap((item) => [item.imageUrl, item.sourceUrl].filter(Boolean)));
  const images = await findCommonsImages(input);
  let added = 0;

  if (input.forceCommonsMain && images.length > 0) {
    await prisma.templePhoto.updateMany({ where: { templeId }, data: { isMain: false } });
  }

  for (const image of images.slice(0, 8)) {
    if (seen.has(image.imageUrl) || seen.has(image.sourceUrl)) continue;

    await prisma.templePhoto.create({
      data: {
        templeId,
        imageUrl: image.imageUrl,
        sourceUrl: image.sourceUrl,
        alt: `${input.shortName}: фото здания`,
        copyrightStatus: "OPEN_LICENSE",
        moderationStatus: "APPROVED",
        isApproved: true,
        isMain: input.forceCommonsMain && added === 0
      }
    });
    added += 1;
  }

  return added;
}

async function findCommonsImages(input: PublicObjectInput) {
  const bySource = new Map<string, { imageUrl: string; sourceUrl: string }>();

  for (const category of input.commonsCategories ?? []) {
    for (const title of await getCommonsCategoryFiles(category)) {
      const image = await getCommonsImage(title);
      if (image) bySource.set(image.sourceUrl, image);
    }
  }

  for (const query of input.commonsQueries ?? []) {
    for (const title of await searchCommonsFiles(query)) {
      const image = await getCommonsImage(title);
      if (image) bySource.set(image.sourceUrl, image);
    }
  }

  return [...bySource.values()];
}

async function getCommonsCategoryFiles(category: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    list: "categorymembers",
    cmtitle: category,
    cmtype: "file",
    cmnamespace: "6",
    cmlimit: "12",
    origin: "*"
  }).toString();

  const data = await fetchJson(url);
  return (data?.query?.categorymembers ?? []).map((item: { title: string }) => item.title).filter(Boolean);
}

async function searchCommonsFiles(query: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    list: "search",
    srnamespace: "6",
    srlimit: "8",
    srsearch: query,
    origin: "*"
  }).toString();

  const data = await fetchJson(url);
  return (data?.query?.search ?? []).map((item: { title: string }) => item.title).filter(Boolean);
}

async function getCommonsImage(title: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    titles: title,
    iiprop: "url|mime|size",
    origin: "*"
  }).toString();

  const data = await fetchJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0] as { title?: string; imageinfo?: Array<{ url: string; mime: string; width: number; height: number }> } | undefined;
  const image = page?.imageinfo?.[0];

  if (!page?.title || !image?.url || !image.mime?.startsWith("image/")) return null;
  if (!/\.(jpe?g|png|webp)$/iu.test(image.url)) return null;
  if (image.width < 420 || image.height < 320) return null;
  if (image.width / image.height > 3 || image.height / image.width > 3) return null;
  const mediaText = safeDecode(`${page.title} ${image.url}`);
  if (/(icon|logo|qr|map|plan|schema|svg|coat|emblem|poster|banner|afisha|people|portrait|priest)/iu.test(mediaText)) return null;
  if (/(достопамят|губарев|издание|plate|engraving|drawing|scan|191[0-9]|190[0-9]|18[0-9]{2})/iu.test(mediaText)) return null;

  return {
    imageUrl: image.url,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`
  };
}

async function fetchJson(url: URL) {
  const response = await fetch(url, { headers: { "user-agent": "HramGo data repair bot/1.0 (https://hramgo.ru)" } });
  if (!response.ok) return null;
  return response.json();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
