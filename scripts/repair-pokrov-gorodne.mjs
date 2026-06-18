import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = "hram-pokrova-presvyatoy-bogoroditsy-na-gorodne";
const now = new Date();

const templeData = {
  slug,
  name: "Храм Покрова Пресвятой Богородицы на Городне",
  shortName: "Покрова Пресвятой Богородицы на Городне",
  description:
    "Храм Покрова Пресвятой Богородицы на Городне — исторический православный храм в районе Чертаново Южное, восстановленный после закрытия и разрушения в советское время.",
  historySummary:
    "В начале XVIII века в селе Покровском была возведена деревянная церковь Покрова Пресвятой Богородицы. В 1722 году на ее месте построили каменный храм. В 1938 году храм был закрыт, а с 1990 года приход и жители района начали восстановление святыни.",
  address: "ул. 2-я Покровская, 24а",
  district: "Чертаново Южное",
  websiteUrl: "https://pokrovgorod.ru/",
  phone: "8 (977) 746-42-82",
  email: "pokrovgorod@mail.ru",
  vicariate: "Южное викариатство",
  deanery: "Донское благочиние",
  objectType: "Храм",
  affiliation: "Русская Православная Церковь",
  scheduleSummary:
    "Будни: 8:00 — Литургия; 17:00 — вечернее богослужение. Выходные: 7:00 — ранняя Литургия; 10:00 — поздняя Литургия; 17:00 — всенощное бдение накануне воскресных и праздничных дней. Актуальное расписание уточняйте на официальном сайте храма.",
  scheduleSourceUrl: "https://pokrovgorod.ru/raspisanie-bogosluzhenij2/",
  sundaySchoolStatus: "YES",
  sundaySchoolDescription:
    "Воскресная школа действует с 1993 года, имеет лицензию Московского Патриархата и ведет занятия для дошкольников, младших школьников и учащихся средней школы.",
  sundaySchoolSourceUrl: "https://pokrovgorod.ru/o-shkole/",
  sundaySchoolConfidence: 0.9,
  sourcePrimaryUrl: "https://pokrovgorod.ru/",
  dataConfidence: 0.92,
  moderationStatus: "PUBLISHED",
  latitude: 55.60195,
  longitude: 37.63535,
  lastVerifiedAt: now,
  lastCrawledAt: now
};

const sources = [
  {
    url: "https://pokrovgorod.ru/kontakty/",
    title: "Как к нам доехать",
    text: "Адрес: 113545, г. Москва, ул.2-я Покровская, 24. Ближайшие станции метро — Пражская и ул. Академика Янгеля. Кроме того, совсем рядом с храмом расположена станция МЦД Покровское (D2). От станции МЦД Покровское несколько минут пешком.",
    confidence: 0.94
  },
  {
    url: "https://pokrovgorod.ru/istoriya-xrama/",
    title: "История храма",
    text: "В начале XVIII века была возведена деревянная церковь Покрова Пресвятой Богородицы. Когда она обветшала, на ее месте был построен каменный храм. Это произошло в 1722 году. В 1938 году храм был закрыт. В сентябре 1990 года члены церковного прихода вместе с жителями района принялись за восстановление святыни.",
    confidence: 0.9
  },
  {
    url: "https://pokrovgorod.ru/o-shkole/",
    title: "О школе",
    text: "Наша Воскресная школа начала свою деятельность в 1993 году. Школа прошла аттестационную проверку и получила лицензию Московского Патриархата. Есть три возрастные группы: дошкольники, младшие школьники и учащиеся средней школы.",
    confidence: 0.9
  },
  {
    url: "https://pokrovgorod.ru/vstrechi-molodezhki/",
    title: "Встречи Молодежки",
    text: "Каждую субботу после вечернего богослужения проходят встречи Молодежки. Встречи проходят с 19:00 до 21:30 в трапезной Воскресной школы.",
    confidence: 0.9
  },
  {
    url: "https://pokrovgorod.ru/rekvizity-xrama/",
    title: "Реквизиты храма",
    text: "Адрес: 113545, г. Москва, ул.2-я Покровская, 24а. Телефон: 8 (977) 746-42-82. e-mail: pokrovgorod@mail.ru.",
    confidence: 0.94
  }
];

const services = [
  {
    kind: "sundaySchool",
    title: "Воскресная школа",
    description:
      "Воскресная школа действует с 1993 года, имеет лицензию Московского Патриархата. Есть группы для дошкольников, младших школьников и учащихся средней школы.",
    sourceUrl: "https://pokrovgorod.ru/o-shkole/"
  },
  {
    kind: "youth",
    title: "Встречи Молодежки",
    description:
      "Молодежные встречи проходят каждую субботу после вечернего богослужения, с 19:00 до 21:30 в трапезной Воскресной школы.",
    sourceUrl: "https://pokrovgorod.ru/vstrechi-molodezhki/"
  },
  {
    kind: "social",
    title: "Волонтерская деятельность",
    description:
      "На приходе действует волонтерская активность; на официальном сайте публикуются новости о помощи и приходских благотворительных инициативах.",
    sourceUrl: "https://pokrovgorod.ru/"
  },
  {
    kind: "meetings",
    title: "Приходские встречи и занятия",
    description:
      "На сайте храма указаны приходские занятия и встречи: молодежные встречи, лекции, творческие занятия, школа звонарей и другие направления приходской жизни.",
    sourceUrl: "https://pokrovgorod.ru/"
  },
  {
    kind: "choir",
    title: "Приходской хор",
    description: "Официальный сайт приглашает прихожан петь в приходском хоре.",
    sourceUrl: "https://pokrovgorod.ru/"
  },
  {
    kind: "shop",
    title: "Церковная лавка",
    description: "На странице проезд к храму указана церковная лавка рядом с дорожкой от станции МЦД Покровское.",
    sourceUrl: "https://pokrovgorod.ru/kontakty/"
  }
];

const temple = await prisma.temple.upsert({
  where: { slug },
  create: templeData,
  update: templeData
});

for (const source of sources) {
  const existing = await prisma.templeSource.findFirst({ where: { templeId: temple.id, url: source.url } });
  const data = {
    sourceType: "official_site",
    rawTitle: source.title,
    rawText: source.text,
    confidence: source.confidence,
    crawledAt: now,
    extractedJson: { hash: "manual-verified-2026-06-18" }
  };

  if (existing) {
    await prisma.templeSource.update({ where: { id: existing.id }, data });
  } else {
    await prisma.templeSource.create({ data: { templeId: temple.id, url: source.url, ...data } });
  }
}

await prisma.templeTransit.deleteMany({ where: { templeId: temple.id } });
await prisma.templeTransit.create({
  data: {
    templeId: temple.id,
    station: "Покровское",
    lineId: "D2",
    lineName: "МЦД-2 Курско-Рижский",
    lineColor: "#E94282",
    system: "mcd",
    distanceMeters: 180,
    walkMinutes: 2
  }
});

await prisma.templeParishService.deleteMany({
  where: { templeId: temple.id, kind: { in: services.map((service) => service.kind) } }
});
await prisma.templeParishService.createMany({
  data: services.map((service) => ({ templeId: temple.id, ...service }))
});

await prisma.templeSocialLink.deleteMany({ where: { templeId: temple.id, type: { in: ["telegram", "youtube"] } } });
await prisma.templeSocialLink.createMany({
  data: [
    { templeId: temple.id, type: "telegram", label: "Telegram", url: "https://t.me/pokrovgorod" },
    { templeId: temple.id, type: "youtube", label: "YouTube", url: "https://www.youtube.com/" }
  ]
});

await prisma.templeFieldEvidence.deleteMany({ where: { templeId: temple.id } });
await prisma.templeFieldEvidence.createMany({
  data: [
    {
      templeId: temple.id,
      fieldName: "address",
      value: "ул. 2-я Покровская, 24а",
      sourceUrl: "https://pokrovgorod.ru/rekvizity-xrama/",
      quote: "Адрес: 113545, г. Москва, ул.2-я Покровская, 24а.",
      confidence: 0.94,
      lastCheckedAt: now
    },
    {
      templeId: temple.id,
      fieldName: "transit",
      value: "МЦД Покровское",
      sourceUrl: "https://pokrovgorod.ru/kontakty/",
      quote: "совсем рядом с храмом расположена станция МЦД Покровское (D2)",
      confidence: 0.94,
      lastCheckedAt: now
    },
    {
      templeId: temple.id,
      fieldName: "phone",
      value: "8 (977) 746-42-82",
      sourceUrl: "https://pokrovgorod.ru/rekvizity-xrama/",
      quote: "Телефон: 8 (977) 746-42-82",
      confidence: 0.94,
      lastCheckedAt: now
    },
    {
      templeId: temple.id,
      fieldName: "email",
      value: "pokrovgorod@mail.ru",
      sourceUrl: "https://pokrovgorod.ru/rekvizity-xrama/",
      quote: "e-mail: pokrovgorod@mail.ru",
      confidence: 0.94,
      lastCheckedAt: now
    },
    {
      templeId: temple.id,
      fieldName: "historySummary",
      value: "Храм построен в 1722 году и восстановлен после закрытия в XX веке.",
      sourceUrl: "https://pokrovgorod.ru/istoriya-xrama/",
      quote: "на ее месте был построен каменный храм. Это произошло в 1722 году",
      confidence: 0.9,
      lastCheckedAt: now
    },
    {
      templeId: temple.id,
      fieldName: "sundaySchool",
      value: "Воскресная школа действует с 1993 года",
      sourceUrl: "https://pokrovgorod.ru/o-shkole/",
      quote: "Наша Воскресная школа начала свою деятельность в 1993 году",
      confidence: 0.9,
      lastCheckedAt: now
    },
    {
      templeId: temple.id,
      fieldName: "youth",
      value: "Встречи Молодежки",
      sourceUrl: "https://pokrovgorod.ru/vstrechi-molodezhki/",
      quote: "Каждую субботу после вечернего богослужения у нас проходят встречи Молодежки",
      confidence: 0.9,
      lastCheckedAt: now
    }
  ]
});

console.log(JSON.stringify({ id: temple.id, slug: temple.slug, name: temple.name }, null, 2));
await prisma.$disconnect();
