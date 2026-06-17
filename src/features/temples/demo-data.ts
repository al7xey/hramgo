import { getMetroLine } from "@/features/temples/metro";
import type { TempleParishServiceView, TempleView } from "@/features/temples/types";

const service = (
  id: string,
  kind: TempleParishServiceView["kind"],
  title: string,
  description: string,
  sourceUrl?: string
): TempleParishServiceView => ({
  id,
  kind,
  title,
  description,
  sourceUrl
});

export const demoTemples: TempleView[] = [
  {
    id: "demo-xxc",
    slug: "hram-hrista-spasitelya",
    name: "Кафедральный соборный Храм Христа Спасителя",
    shortName: "Храм Христа Спасителя",
    description:
      "Кафедральный собор Москвы у метро Кропоткинская. В карточке собраны расписание, приходская жизнь и ссылки на официальные источники.",
    historySummary:
      "Храм Христа Спасителя связан с благодарной памятью о событиях 1812 года, был восстановлен в конце XX века и сегодня является одним из главных храмовых комплексов Москвы.",
    shrines: "Святыни, хоры, музейные и просветительские пространства лучше уточнять на официальном сайте перед посещением.",
    address: "Москва, ул. Волхонка, 15",
    district: "Хамовники",
    metro: "Кропоткинская",
    transit: [
      { station: "Кропоткинская", line: getMetroLine("1"), distanceMeters: 350, walkMinutes: 5 },
      { station: "Боровицкая", line: getMetroLine("9"), distanceMeters: 950, walkMinutes: 13 }
    ],
    latitude: 55.7446,
    longitude: 37.6055,
    websiteUrl: "https://xxc.ru",
    phone: null,
    email: null,
    rectorName: "Святейший Патриарх Кирилл",
    vicariate: "Центральное викариатство",
    deanery: "Центральное благочиние",
    objectType: "Кафедральный собор",
    scheduleSummary: "Расписание богослужений регулярно публикуется на официальном сайте.",
    scheduleSourceUrl: "https://xxc.ru",
    sundaySchoolStatus: "YES",
    sundaySchoolDescription:
      "На сайте храма указаны воскресная школа для детей, воскресная школа для взрослых и клуб православной молодёжи.",
    sundaySchoolSourceUrl: "https://xxc.ru",
    sundaySchoolConfidence: 0.9,
    sourcePrimaryUrl: "https://xxc.ru",
    dataConfidence: 0.9,
    moderationStatus: "PUBLISHED",
    averageHelpfulnessRating: 4.8,
    reviewsCount: 8,
    approvedReviewsCount: 6,
    lastVerifiedAt: "2026-05-20T00:00:00.000Z",
    childFriendly: true,
    hasParking: false,
    socialLinks: [
      { label: "Официальный сайт", url: "https://xxc.ru", type: "website" },
      { label: "Видео и публикации", url: "https://xxc.ru", type: "youtube" }
    ],
    clergy: [
      {
        name: "Святейший Патриарх Кирилл",
        rank: "Патриарх Московский и всея Руси",
        role: "Настоятель кафедрального собора"
      }
    ],
    parishServices: [
      service(
        "xxc-kids-school",
        "sundaySchool",
        "Воскресная школа для детей",
        "Занятия и расписание нужно уточнять на странице жизни храма.",
        "https://xxc.ru"
      ),
      service(
        "xxc-adult-school",
        "adultSchool",
        "Воскресная школа для взрослых",
        "Просветительские занятия для взрослых посетителей.",
        "https://xxc.ru"
      ),
      service(
        "xxc-youth",
        "youth",
        "Клуб православной молодёжи",
        "Формат встреч и расписание публикуются в разделе жизни храма.",
        "https://xxc.ru"
      ),
      service(
        "xxc-social",
        "social",
        "Отдел социального служения",
        "Помощь нуждающимся и добровольческие направления.",
        "https://xxc.ru"
      ),
      service(
        "xxc-refectory",
        "refectory",
        "Трапезная",
        "При комплексе работает трапезная; режим и меню лучше уточнять перед посещением.",
        "https://fxxc.ru/services/trapeznaja/"
      ),
      service("xxc-choir", "choir", "Хоры храма", "Информация о хорах вынесена в отдельный раздел сайта.", "https://xxc.ru")
    ],
    photos: [
      {
        id: "photo-xxc-1",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Cathedral_of_Christ_the_Saviour_-_Moscow_2024-8.jpg/960px-Cathedral_of_Christ_the_Saviour_-_Moscow_2024-8.jpg",
        alt: "Храм Христа Спасителя",
        isMain: true
      },
      {
        id: "photo-xxc-2",
        imageUrl: "",
        alt: "Фото территории храма",
        isMain: false
      },
      {
        id: "photo-xxc-3",
        imageUrl: "",
        alt: "Фото интерьера или приходской жизни",
        isMain: false
      }
    ],
    reviews: [
      {
        id: "review-xxc-1",
        authorName: "Анна",
        text: "Полезно заранее посмотреть расписание на официальном сайте и заложить время на вход. От метро Кропоткинская идти совсем близко.",
        rating: 5,
        helpfulCount: 14,
        visitType: "Личное посещение",
        publishedAt: "2026-05-18T00:00:00.000Z",
        tags: ["Удобно добираться", "Полезно уточнить расписание"]
      },
      {
        id: "review-xxc-2",
        authorName: "Михаил",
        text: "Если идёте с детьми, лучше выбрать время без большого потока людей и заранее проверить, какие входы открыты.",
        rating: 4,
        helpfulCount: 7,
        visitType: "Семейное посещение",
        publishedAt: "2026-04-22T00:00:00.000Z",
        tags: ["Спокойно с детьми"]
      }
    ]
  },
  {
    id: "demo-nikola",
    slug: "nikolaya-v-hamovnikah",
    name: "Храм святителя Николая Чудотворца в Хамовниках",
    shortName: "Никола в Хамовниках",
    description:
      "Исторический храм в Хамовниках. Карточка показывает расписание, молодежные встречи, социальное служение и близость к метро.",
    historySummary:
      "Храм известен образом Божией Матери «Споручница грешных» и насыщенной приходской жизнью. Исторические сведения лучше читать на сайте прихода.",
    shrines: "Почитаемые иконы и святыни указаны в приходских материалах и требуют регулярной сверки.",
    address: "Москва, ул. Льва Толстого, 2",
    district: "Хамовники",
    metro: "Парк культуры",
    transit: [
      { station: "Парк культуры", line: getMetroLine("1"), distanceMeters: 700, walkMinutes: 9 },
      { station: "Парк культуры", line: getMetroLine("5"), distanceMeters: 760, walkMinutes: 10 },
      { station: "Фрунзенская", line: getMetroLine("1"), distanceMeters: 1100, walkMinutes: 15 }
    ],
    latitude: 55.7352,
    longitude: 37.5888,
    websiteUrl: "https://nikola-khamovniki.ru",
    vicariate: "Центральное викариатство",
    deanery: "Центральное благочиние",
    objectType: "Приходской храм",
    scheduleSummary: "Подробное расписание публикуется на сайте храма.",
    scheduleSourceUrl: "https://nikola-khamovniki.ru",
    sundaySchoolStatus: "YES",
    sundaySchoolDescription:
      "По данным епархиального справочника при храме действует воскресная школа, проходят беседы и молодежные встречи.",
    sundaySchoolSourceUrl: "https://sprav.moseparh.ru/org/343",
    sourcePrimaryUrl: "https://nikola-khamovniki.ru",
    dataConfidence: 0.84,
    moderationStatus: "PUBLISHED",
    averageHelpfulnessRating: 4.6,
    reviewsCount: 5,
    approvedReviewsCount: 4,
    lastVerifiedAt: "2026-04-28T00:00:00.000Z",
    childFriendly: true,
    hasParking: false,
    socialLinks: [
      { label: "Официальный сайт", url: "https://nikola-khamovniki.ru", type: "website" },
      { label: "Молодёжная работа", url: "https://vk.com", type: "vk" }
    ],
    clergy: [
      {
        name: "епископ Павлово-Посадский Фома",
        rank: "епископ",
        role: "Настоятель",
        details: "Данные о духовенстве требуют проверки по официальному сайту."
      }
    ],
    parishServices: [
      service("nikola-school", "sundaySchool", "Воскресная школа", "Занятия и дополнительные предметы уточняются у прихода."),
      service("nikola-youth", "youth", "Молодёжные встречи", "Встречи и участие в приходской жизни указаны в открытых источниках."),
      service(
        "nikola-social",
        "social",
        "Социальное служение",
        "Помощь районному обществу инвалидов, центру социального обслуживания и семьям в трудной ситуации.",
        "https://sprav.moseparh.ru/org/343"
      ),
      service("nikola-meetings", "meetings", "Беседы о Православной вере", "Просветительские встречи для взрослых.")
    ],
    photos: [
      {
        id: "photo-nikola-1",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Moscow_Khamovniki_StNicholas_asv2021-08_img1.jpg/960px-Moscow_Khamovniki_StNicholas_asv2021-08_img1.jpg",
        alt: "Никола в Хамовниках",
        isMain: true
      },
      {
        id: "photo-nikola-2",
        imageUrl: "",
        alt: "Фото приходской территории",
        isMain: false
      }
    ],
    reviews: [
      {
        id: "review-nikola-1",
        authorName: "Ирина",
        text: "Для первого посещения удобно ориентироваться от метро Парк культуры. Расписание лучше открыть заранее на сайте прихода.",
        rating: 5,
        helpfulCount: 9,
        visitType: "Личное посещение",
        publishedAt: "2026-04-16T00:00:00.000Z",
        tags: ["Подходит для первого посещения"]
      }
    ]
  },
  {
    id: "demo-ostankino",
    slug: "troitsy-v-ostankine",
    name: "Храм Живоначальной Троицы в Останкине",
    shortName: "Троица в Останкине",
    description:
      "Храм рядом с Останкинским парком и телецентром. В карточке собраны воскресная школа и спокойные подсказки перед посещением.",
    historySummary: "Исторический храмовый комплекс связан с усадебной Москвой и Останкинским районом.",
    shrines: "Сведения о святынях и расписании нужно сверять на официальном сайте прихода.",
    address: "Москва, 1-я Останкинская ул., 7с2",
    district: "Останкинский",
    metro: "ВДНХ",
    transit: [
      { station: "ВДНХ", line: getMetroLine("6"), distanceMeters: 1700, walkMinutes: 22 },
      { station: "Останкино", line: getMetroLine("D3"), distanceMeters: 900, walkMinutes: 12 }
    ],
    latitude: 55.8241,
    longitude: 37.6132,
    websiteUrl: "https://ostankino.cerkov.ru",
    vicariate: "Северо-Восточное викариатство",
    deanery: "Троицкое благочиние",
    objectType: "Приходской храм",
    scheduleSummary: "Данные требуют проверки по официальному источнику.",
    sundaySchoolStatus: "YES",
    sundaySchoolDescription: "Есть занятия для детей и взрослых по расписанию прихода.",
    sourcePrimaryUrl: "https://ostankino.cerkov.ru",
    dataConfidence: 0.7,
    moderationStatus: "PUBLISHED",
    averageHelpfulnessRating: 4.5,
    reviewsCount: 4,
    approvedReviewsCount: 3,
    lastVerifiedAt: "2026-03-25T00:00:00.000Z",
    childFriendly: true,
    hasParking: true,
    socialLinks: [{ label: "Официальный сайт", url: "https://ostankino.cerkov.ru", type: "website" }],
    clergy: [{ name: "Духовенство прихода", role: "Информация уточняется", details: "Смотрите официальный сайт храма." }],
    parishServices: [
      service("ostankino-school", "sundaySchool", "Воскресная школа", "Расписание занятий лучше проверить на сайте прихода."),
      service("ostankino-meetings", "meetings", "Приходские встречи", "Формат встреч зависит от актуального расписания."),
      service("ostankino-shop", "shop", "Церковная лавка", "Наличие и часы работы уточняются на месте.")
    ],
    photos: [
      {
        id: "photo-ostankino-1",
        imageUrl: "",
        alt: "Троица в Останкине",
        isMain: true
      },
      {
        id: "photo-ostankino-2",
        imageUrl: "",
        alt: "Парк рядом с храмом",
        isMain: false
      }
    ],
    reviews: [
      {
        id: "review-ostankino-1",
        authorName: "Елена",
        text: "Удобно совместить посещение с прогулкой. Для занятий воскресной школы лучше заранее уточнить время у прихода.",
        rating: 4,
        helpfulCount: 5,
        visitType: "С детьми",
        publishedAt: "2026-03-26T00:00:00.000Z",
        tags: ["Есть воскресная школа"]
      }
    ]
  },
  {
    id: "demo-kolomenskoe",
    slug: "kazanskoy-ikony-v-kolomenskom",
    name: "Храм Казанской иконы Божией Матери в Коломенском",
    shortName: "Казанский храм в Коломенском",
    description:
      "Храм на территории Коломенского. Подходит для спокойного посещения вместе с прогулкой по музею-заповеднику.",
    historySummary: "Храм связан с царской усадьбой Коломенское и историческим ландшафтом юга Москвы.",
    shrines: "Исторические сведения и святыни нужно уточнять в официальных источниках и на сайте прихода.",
    address: "Москва, пр-т Андропова, 39с9",
    district: "Нагатинский затон",
    metro: "Коломенская",
    transit: [
      { station: "Коломенская", line: getMetroLine("2"), distanceMeters: 1100, walkMinutes: 15 },
      { station: "Кленовый бульвар", line: getMetroLine("11"), distanceMeters: 1600, walkMinutes: 21 }
    ],
    latitude: 55.6677,
    longitude: 37.6711,
    websiteUrl: "https://kolomenskoe.prihod.ru",
    vicariate: "Южное викариатство",
    deanery: "Даниловское благочиние",
    objectType: "Приходской храм",
    scheduleSummary: "Проверьте расписание на официальном сайте перед поездкой.",
    sundaySchoolStatus: "UNKNOWN",
    sundaySchoolDescription: "Информация о воскресной школе пока не подтверждена.",
    sourcePrimaryUrl: "https://kolomenskoe.prihod.ru",
    dataConfidence: 0.64,
    moderationStatus: "PUBLISHED",
    averageHelpfulnessRating: 4.4,
    reviewsCount: 3,
    approvedReviewsCount: 2,
    lastVerifiedAt: "2026-03-11T00:00:00.000Z",
    childFriendly: true,
    hasParking: true,
    socialLinks: [{ label: "Официальный сайт", url: "https://kolomenskoe.prihod.ru", type: "website" }],
    clergy: [{ name: "Духовенство прихода", role: "Информация уточняется", details: "Проверьте официальный сайт." }],
    parishServices: [
      service("kolomenskoe-shop", "shop", "Церковная лавка", "Наличие и часы работы уточняются на месте."),
      service("kolomenskoe-pilgrimage", "pilgrimage", "Историческая прогулка", "Удобно совместить посещение с прогулкой по Коломенскому."),
      service("kolomenskoe-child", "other", "Подходит для посещения с детьми", "Рядом большая прогулочная территория.")
    ],
    photos: [
      {
        id: "photo-kolomenskoe-1",
        imageUrl: "",
        alt: "Казанский храм в Коломенском",
        isMain: true
      },
      {
        id: "photo-kolomenskoe-2",
        imageUrl: "",
        alt: "Коломенское",
        isMain: false
      }
    ],
    reviews: []
  },
  {
    id: "demo-klement",
    slug: "klimenta-papy-rimskogo",
    name: "Храм священномученика Климента, папы Римского",
    shortName: "Храм Климента",
    description:
      "Храм в Замоскворечье рядом с Третьяковской. В карточке собраны источники, галерея, приходская жизнь и отзывы посетителей.",
    historySummary: "Один из заметных храмов Замоскворечья с богатой историей и выразительной архитектурой.",
    shrines: "Святыни и актуальные богослужебные сведения лучше смотреть на официальном сайте.",
    address: "Москва, Пятницкая ул., 26с1",
    district: "Замоскворечье",
    metro: "Третьяковская",
    transit: [
      { station: "Третьяковская", line: getMetroLine("6"), distanceMeters: 300, walkMinutes: 4 },
      { station: "Третьяковская", line: getMetroLine("8"), distanceMeters: 300, walkMinutes: 4 },
      { station: "Новокузнецкая", line: getMetroLine("2"), distanceMeters: 500, walkMinutes: 7 }
    ],
    latitude: 55.7414,
    longitude: 37.6265,
    websiteUrl: "https://hramvklementa.ru",
    vicariate: "Центральное викариатство",
    deanery: "Москворецкое благочиние",
    objectType: "Приходской храм",
    scheduleSummary: "Официальное расписание смотрите на сайте храма.",
    sundaySchoolStatus: "YES",
    sundaySchoolDescription: "Информация о занятиях нуждается в регулярной проверке.",
    sourcePrimaryUrl: "https://hramvklementa.ru",
    dataConfidence: 0.82,
    moderationStatus: "PUBLISHED",
    averageHelpfulnessRating: 4.7,
    reviewsCount: 7,
    approvedReviewsCount: 5,
    lastVerifiedAt: "2026-05-02T00:00:00.000Z",
    childFriendly: false,
    hasParking: false,
    socialLinks: [
      { label: "Официальный сайт", url: "https://hramvklementa.ru", type: "website" },
      { label: "Новости прихода", url: "https://hramvklementa.ru", type: "telegram" }
    ],
    clergy: [{ name: "Духовенство храма", role: "Список уточняется", details: "Проверьте раздел духовенства на сайте храма." }],
    parishServices: [
      service("klement-school", "sundaySchool", "Воскресная школа", "Занятия и возрастные группы нужно уточнить на сайте."),
      service("klement-shop", "shop", "Церковная лавка", "Работает при храме, часы лучше уточнить перед поездкой."),
      service("klement-choir", "choir", "Хор", "Информация о приходском пении и богослужениях на сайте.")
    ],
    photos: [
      {
        id: "photo-klement-1",
        imageUrl: "",
        alt: "Храм Климента",
        isMain: true
      },
      {
        id: "photo-klement-2",
        imageUrl: "",
        alt: "Замоскворечье",
        isMain: false
      }
    ],
    reviews: [
      {
        id: "review-klement-1",
        authorName: "Павел",
        text: "В центре может быть сложно с парковкой, зато от метро идти удобно. Перед поездкой открыл сайт и сверил время богослужения.",
        rating: 4,
        helpfulCount: 11,
        visitType: "Личное посещение",
        publishedAt: "2026-05-05T00:00:00.000Z",
        tags: ["Удобно добираться"]
      }
    ]
  },
  {
    id: "demo-sokol",
    slug: "vseh-svyatyh-na-sokole",
    name: "Храм Всех Святых во Всехсвятском на Соколе",
    shortName: "Всех Святых на Соколе",
    description:
      "Храм у метро Сокол. В HramGo показывается как пример карточки с несколькими фото, транспортом и неполностью подтвержденными данными.",
    historySummary: "Храм связан с историческим районом Всехсвятское и севером Москвы.",
    shrines: "Актуальные сведения о святынях и приходской жизни нужно смотреть на сайте.",
    address: "Москва, Ленинградский пр-т, 73А",
    district: "Сокол",
    metro: "Сокол",
    transit: [
      { station: "Сокол", line: getMetroLine("2"), distanceMeters: 350, walkMinutes: 5 },
      { station: "Панфиловская", line: getMetroLine("14"), distanceMeters: 1000, walkMinutes: 13 },
      { station: "Красный Балтиец", line: getMetroLine("D2"), distanceMeters: 1400, walkMinutes: 18 }
    ],
    latitude: 55.8028,
    longitude: 37.5158,
    websiteUrl: "https://hram-vsehsvyatih.ru",
    vicariate: "Северное викариатство",
    deanery: "Всехсвятское благочиние",
    objectType: "Приходской храм",
    scheduleSummary: "Перед посещением проверьте актуальное расписание на официальном сайте.",
    sundaySchoolStatus: "YES",
    sundaySchoolDescription: "На сайте прихода есть раздел воскресной школы для детей.",
    sundaySchoolSourceUrl: "https://hramsokol.ru/voskresnaya-shkola/voskresnaya-shkola-deti/",
    sourcePrimaryUrl: "https://hram-vsehsvyatih.ru",
    dataConfidence: 0.76,
    moderationStatus: "PUBLISHED",
    averageHelpfulnessRating: 4.3,
    reviewsCount: 2,
    approvedReviewsCount: 1,
    lastVerifiedAt: "2026-02-19T00:00:00.000Z",
    childFriendly: true,
    hasParking: true,
    socialLinks: [{ label: "Официальный сайт", url: "https://hram-vsehsvyatih.ru", type: "website" }],
    clergy: [{ name: "Духовенство прихода", role: "Информация уточняется", details: "Смотрите сайт прихода." }],
    parishServices: [
      service("sokol-school", "sundaySchool", "Воскресная школа для детей", "Раздел школы есть на сайте храма."),
      service("sokol-social", "social", "Приходская помощь", "Социальные направления требуют ручного подтверждения."),
      service("sokol-shop", "shop", "Церковная лавка", "Часы работы лучше уточнять на месте.")
    ],
    photos: [
      {
        id: "photo-sokol-1",
        imageUrl: "",
        alt: "Всех Святых на Соколе",
        isMain: true
      },
      {
        id: "photo-sokol-2",
        imageUrl: "",
        alt: "Сокол",
        isMain: false
      }
    ],
    reviews: []
  }
];

export const reviewTags = [
  "Спокойно с детьми",
  "Удобно добираться",
  "Полезно заранее уточнить расписание",
  "Есть воскресная школа",
  "Молодёжное движение",
  "Социальное служение",
  "Трапезная или кафе",
  "Подходит для первого посещения"
];
