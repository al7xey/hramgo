import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const templeSeed = [
  {
    slug: "hram-hrista-spasitelya",
    name: "Кафедральный соборный Храм Христа Спасителя",
    shortName: "Храм Христа Спасителя",
    address: "Москва, ул. Волхонка, 15",
    district: "Хамовники",
    metro: "Кропоткинская",
    latitude: 55.7446,
    longitude: 37.6055,
    websiteUrl: "https://xxc.ru",
    objectType: "Кафедральный собор",
    vicariate: "Центральное викариатство",
    deanery: "Центральное благочиние",
    scheduleSummary: "Расписание регулярно обновляется на официальном сайте.",
    sundaySchoolStatus: "YES" as const,
    sundaySchoolDescription: "Есть просветительские и образовательные программы. Перед посещением проверьте актуальную информацию на сайте.",
    dataConfidence: 0.9
  },
  {
    slug: "nikolaya-v-hamovnikah",
    name: "Храм святителя Николая Чудотворца в Хамовниках",
    shortName: "Никола в Хамовниках",
    address: "Москва, ул. Льва Толстого, 2",
    district: "Хамовники",
    metro: "Парк культуры",
    latitude: 55.7352,
    longitude: 37.5888,
    websiteUrl: "https://nikola-khamovniki.ru",
    objectType: "Приходской храм",
    vicariate: "Центральное викариатство",
    deanery: "Центральное благочиние",
    scheduleSummary: "Перед посещением проверьте актуальное расписание на официальном сайте.",
    sundaySchoolStatus: "UNKNOWN" as const,
    sundaySchoolDescription: "Информация о воскресной школе пока не подтверждена.",
    dataConfidence: 0.72
  },
  {
    slug: "troitsy-v-ostankine",
    name: "Храм Живоначальной Троицы в Останкине",
    shortName: "Троица в Останкине",
    address: "Москва, 1-я Останкинская ул., 7с2",
    district: "Останкинский",
    metro: "ВДНХ",
    latitude: 55.8241,
    longitude: 37.6132,
    websiteUrl: "https://ostankino.cerkov.ru",
    objectType: "Приходской храм",
    vicariate: "Северо-Восточное викариатство",
    deanery: "Троицкое благочиние",
    scheduleSummary: "Данные требуют проверки по официальному источнику.",
    sundaySchoolStatus: "YES" as const,
    sundaySchoolDescription: "Есть занятия для детей и взрослых по расписанию прихода.",
    dataConfidence: 0.7
  },
  {
    slug: "kazanskoy-ikony-v-kolomenskom",
    name: "Храм Казанской иконы Божией Матери в Коломенском",
    shortName: "Казанский храм в Коломенском",
    address: "Москва, пр-т Андропова, 39с9",
    district: "Нагатинский затон",
    metro: "Коломенская",
    latitude: 55.6677,
    longitude: 37.6711,
    websiteUrl: "https://kolomenskoe.prihod.ru",
    objectType: "Приходской храм",
    vicariate: "Южное викариатство",
    deanery: "Даниловское благочиние",
    scheduleSummary: "Проверьте расписание на официальном сайте перед поездкой.",
    sundaySchoolStatus: "UNKNOWN" as const,
    dataConfidence: 0.64
  },
  {
    slug: "klimenta-papy-rimskogo",
    name: "Храм священномученика Климента, папы Римского",
    shortName: "Храм Климента",
    address: "Москва, Пятницкая ул., 26с1",
    district: "Замоскворечье",
    metro: "Третьяковская",
    latitude: 55.7414,
    longitude: 37.6265,
    websiteUrl: "https://hramvklementa.ru",
    objectType: "Приходской храм",
    vicariate: "Центральное викариатство",
    deanery: "Москворецкое благочиние",
    scheduleSummary: "Официальное расписание смотрите на сайте храма.",
    sundaySchoolStatus: "YES" as const,
    sundaySchoolDescription: "Информация о занятиях нуждается в регулярной проверке.",
    dataConfidence: 0.82
  },
  {
    slug: "vseh-svyatyh-na-sokole",
    name: "Храм Всех Святых во Всехсвятском на Соколе",
    shortName: "Всех Святых на Соколе",
    address: "Москва, Ленинградский пр-т, 73А",
    district: "Сокол",
    metro: "Сокол",
    latitude: 55.8028,
    longitude: 37.5158,
    websiteUrl: "https://hram-vsehsvyatih.ru",
    objectType: "Приходской храм",
    vicariate: "Северное викариатство",
    deanery: "Всехсвятское благочиние",
    scheduleSummary: "Перед посещением проверьте актуальное расписание на официальном сайте.",
    sundaySchoolStatus: "UNKNOWN" as const,
    dataConfidence: 0.68
  }
];

const tags = [
  ["Спокойно с детьми", "spokoyno-s-detmi"],
  ["Удобно добираться", "udobno-dobiratsya"],
  ["Полезно заранее уточнить расписание", "utochnit-raspisanie"],
  ["Есть воскресная школа", "est-voskresnaya-shkola"],
  ["Подходит для первого посещения", "pervoe-poseshchenie"]
];

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@hramgo.ru" },
    update: { role: Role.ADMIN },
    create: {
      email: "admin@hramgo.ru",
      name: "Администратор HramGo",
      role: Role.ADMIN
    }
  });

  const moderator = await prisma.user.upsert({
    where: { email: "moderator@hramgo.ru" },
    update: { role: Role.MODERATOR },
    create: {
      email: "moderator@hramgo.ru",
      name: "Модератор",
      role: Role.MODERATOR
    }
  });

  const representative = await prisma.user.upsert({
    where: { email: "representative@hramgo.ru" },
    update: { role: Role.TEMPLE_REPRESENTATIVE },
    create: {
      email: "representative@hramgo.ru",
      name: "Представитель храма",
      role: Role.TEMPLE_REPRESENTATIVE
    }
  });

  const visitor = await prisma.user.upsert({
    where: { email: "visitor@example.com" },
    update: {},
    create: {
      email: "visitor@example.com",
      name: "Посетитель"
    }
  });

  await Promise.all(
    tags.map(([name, slug]) =>
      prisma.reviewTag.upsert({
        where: { slug },
        update: { name },
        create: { name, slug }
      })
    )
  );

  for (const temple of templeSeed) {
    const record = await prisma.temple.upsert({
      where: { slug: temple.slug },
      update: {
        ...temple,
        moderationStatus: "PUBLISHED",
        sourcePrimaryUrl: temple.websiteUrl,
        lastVerifiedAt: new Date()
      },
      create: {
        ...temple,
        moderationStatus: "PUBLISHED",
        sourcePrimaryUrl: temple.websiteUrl,
        lastVerifiedAt: new Date(),
        description:
          "Демо-запись HramGo для разработки MVP. Перед публикацией данные должны быть сверены с официальными источниками прихода.",
        photos: {
          create: {
            imageUrl:
              "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=1200&q=80",
            alt: temple.shortName ?? temple.name,
            copyrightStatus: "MANUAL_REVIEW",
            moderationStatus: "NEEDS_REVIEW",
            isMain: true,
            isApproved: false
          }
        },
        sources: {
          create: {
            url: temple.websiteUrl ?? "https://hramgo.ru",
            sourceType: "official_site",
            rawTitle: temple.name,
            confidence: temple.dataConfidence
          }
        }
      }
    });

    await prisma.templeFieldEvidence.create({
      data: {
        templeId: record.id,
        fieldName: "websiteUrl",
        value: temple.websiteUrl,
        sourceUrl: temple.websiteUrl ?? "https://hramgo.ru",
        quote: "Официальный сайт указан в демо-наборе и требует ручной проверки перед публикацией.",
        confidence: temple.dataConfidence,
        lastCheckedAt: new Date()
      }
    });
  }

  const firstTemple = await prisma.temple.findUnique({
    where: { slug: "hram-hrista-spasitelya" }
  });

  if (firstTemple) {
    await prisma.favorite.upsert({
      where: { userId_templeId: { userId: visitor.id, templeId: firstTemple.id } },
      update: {},
      create: { userId: visitor.id, templeId: firstTemple.id }
    });

    const review = await prisma.review.create({
      data: {
        templeId: firstTemple.id,
        userId: visitor.id,
        rating: 5,
        text:
          "Полезно заранее посмотреть расписание на официальном сайте и заложить время на вход. Рядом удобно выйти к метро Кропоткинская.",
        visitType: "PERSONAL_VISIT",
        informationRating: 5,
        status: "APPROVED",
        helpfulCount: 4,
        publishedAt: new Date()
      }
    });

    await prisma.reviewPhoto.create({
      data: {
        reviewId: review.id,
        imageUrl:
          "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
        alt: "Демо-фото впечатления",
        status: "NEEDS_REVIEW"
      }
    });

    await prisma.templeRepresentative.upsert({
      where: { userId_templeId: { userId: representative.id, templeId: firstTemple.id } },
      update: {
        status: "APPROVED",
        verifiedById: admin.id,
        verifiedAt: new Date()
      },
      create: {
        userId: representative.id,
        templeId: firstTemple.id,
        status: "APPROVED",
        verifiedById: admin.id,
        verifiedAt: new Date()
      }
    });

    await prisma.moderationLog.create({
      data: {
        moderatorId: moderator.id,
        entityType: "Review",
        entityId: review.id,
        action: "APPROVED",
        reason: "Демо-запись для проверки очереди модерации."
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
