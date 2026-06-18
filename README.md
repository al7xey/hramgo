# HramGo

HramGo — сервис для поиска православных храмов Москвы: каталог, карта, расписания богослужений, адреса, метро, МЦД, контакты, фото, избранное и отзывы.

Продакшен: [https://hramgo.ru](https://hramgo.ru)

## Что внутри

- Главная страница с поиском храмов.
- Каталог `/temples` с фильтрами, пагинацией и карточками храмов.
- Страница храма `/temples/[slug]` с фото, расписанием, контактами, духовенством, приходскими направлениями и отзывами.
- Карта `/map` с маркерами храмов и маршрутами.
- Авторизация, профиль, избранное и отзывы.
- Админ-раздел и раздел представителя храма.
- SEO: metadata, Open Graph, Twitter Cards, `robots.txt`, `sitemap.xml`, JSON-LD.
- Импорт и обновление данных из официальных источников.

## Стек

- Next.js 15, React 19, TypeScript, App Router
- Tailwind CSS
- Prisma
- PostgreSQL / PostGIS
- NextAuth
- Zod
- Docker / Docker Compose
- S3-compatible storage для фотографий

## Быстрый старт

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Локально сайт откроется на [http://localhost:3000](http://localhost:3000).

## Переменные окружения

Создайте `.env` на основе `.env.example`.

Основные переменные:

- `DATABASE_URL` — подключение к PostgreSQL.
- `NEXTAUTH_SECRET` — секрет NextAuth.
- `NEXTAUTH_URL` — URL приложения.
- `USE_DEMO_DATA` — dev fallback для демо-данных.
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` — хранилище фото.
- `ROBOKASSA_MERCHANT_LOGIN`, `ROBOKASSA_PASSWORD_1`, `ROBOKASSA_PASSWORD_2` — платежи поддержки через Robokassa.
- `ROBOKASSA_HASH_ALGORITHM`, `ROBOKASSA_IS_TEST` — алгоритм подписи и режим Robokassa.
- `MIN_SUPPORT_AMOUNT_RUB`, `MAX_SUPPORT_AMOUNT_RUB` — допустимый диапазон добровольной поддержки.
- `RETURN_REQUEST_REVIEW_DAYS`, `RETURN_PAYMENT_DAYS` — сроки рассмотрения обращения и возврата.
- `ROBO_RECEIPT_ITEM_NAME` — точное название позиции для чека после согласования с Robokassa.
- `LEGAL_FULL_NAME`, `LEGAL_INN`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `LEGAL_ADDRESS` — публичные реквизиты и контакты.
- `MAPS_API_KEY`, `GEOCODER_API_KEY` — карты и геокодирование.

Секреты нельзя коммитить в репозиторий.

### Robokassa

HramGo использует модель добровольной поддержки бесплатного информационного проекта. Поддержка не является покупкой
товара, платного доступа, подписки или индивидуальной услуги и не дает дополнительных преимуществ.

До включения production-платежей владелец должен заполнить обязательные переменные окружения: `MIN_SUPPORT_AMOUNT_RUB`,
`MAX_SUPPORT_AMOUNT_RUB`, `RETURN_REQUEST_REVIEW_DAYS`, `RETURN_PAYMENT_DAYS`, `LEGAL_FULL_NAME`, `LEGAL_INN`,
`SUPPORT_EMAIL`, `ROBOKASSA_MERCHANT_LOGIN`, `ROBOKASSA_PASSWORD_1`, `ROBOKASSA_PASSWORD_2`.

TODO согласовать с менеджером Robokassa:

- точное наименование позиции в чеке (`ROBO_RECEIPT_ITEM_NAME`);
- признак предмета расчета;
- минимальную сумму поддержки;
- допустимость модели «добровольная поддержка бесплатного информационного проекта» для текущей анкеты самозанятого.

Точное название позиции и признак предмета расчета должны быть подтверждены Robokassa и владельцем проекта до запуска.
Не подменять добровольную поддержку словом «услуга», товаром или другой фиктивной позицией.

## Команды

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

База данных:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Импорт и обновление храмов:

```bash
npm run import:official-list
npm run geocode:temples
npm run crawl:temple
npm run recalculate:ratings
```

## Архитектура

Проект использует FSD-подобную структуру для Next.js App Router:

- `src/app` — маршруты, layouts, API routes, metadata, sitemap и robots.
- `src/features` — доменная логика и типы.
- `src/components` — UI-компоненты, виджеты и композиции страниц.
- `src/lib` — инфраструктура: Prisma, auth, env, storage, API helpers.
- `src/types` — глобальные типы.
- `scripts` — импорт, геокодирование, crawl и служебные задачи.
- `prisma` — схема и seed.

Подробный аудит архитектуры: [docs/fsd-audit.md](docs/fsd-audit.md).

## SEO

В проекте настроены:

- уникальные `title` и `description` для основных страниц;
- Open Graph и Twitter Cards;
- `sitemap.xml`;
- `robots.txt`;
- JSON-LD для сайта, организации и страниц храмов;
- Google Search Console verification;
- Yandex verification file.

Публичные SEO-адреса:

- [https://hramgo.ru/sitemap.xml](https://hramgo.ru/sitemap.xml)
- [https://hramgo.ru/robots.txt](https://hramgo.ru/robots.txt)

## Основные маршруты

Публичные:

- `/`
- `/temples`
- `/temples/[slug]`
- `/temples/[slug]/reviews`
- `/map`
- `/favorites`
- `/support`
- `/login`
- `/profile`

Админ:

- `/admin`
- `/admin/temples`
- `/admin/reviews`
- `/admin/imports`
- `/admin/photos`
- `/admin/users`

Представитель храма:

- `/representative`
- `/representative/temples`
- `/representative/reviews`
- `/representative/suggestions`

## Деплой

Текущий продакшен работает на Docker-контейнере приложения. Основная схема:

```bash
npm run build
```

Далее runtime-артефакты копируются на сервер и контейнер перезапускается. Подробности лежат в [DEPLOY_VPS.md](DEPLOY_VPS.md).

## Проверка перед релизом

```bash
npm run typecheck
npm run lint
npm run build
```

После деплоя проверить:

- [https://hramgo.ru](https://hramgo.ru)
- [https://hramgo.ru/temples](https://hramgo.ru/temples)
- [https://hramgo.ru/map](https://hramgo.ru/map)
- [https://hramgo.ru/sitemap.xml](https://hramgo.ru/sitemap.xml)
- [https://hramgo.ru/robots.txt](https://hramgo.ru/robots.txt)

## Статус

Проект находится в production-ready стадии: основной пользовательский сценарий, каталог, карта, страницы храмов, избранное, отзывы, SEO и деплой уже собраны. Дальнейшие улучшения стоит делать отдельными итерациями: расширение базы храмов, улучшение качества фото, посадочные SEO-страницы по метро/районам и автоматические тесты.
