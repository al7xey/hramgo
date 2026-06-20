# HramGo

HramGo — сервис для поиска православных храмов Москвы: каталог, карта, адреса, метро, МЦД, расписания, контакты, фото, избранное и отзывы.

Продакшен: [https://hramgo.ru](https://hramgo.ru)

## Возможности

- Главная страница с поиском храмов.
- Каталог `/temples` с фильтрами, карточками и поиском по названию, улице, району, метро и МЦД.
- Карта `/map` с маркерами храмов и маршрутами.
- Страница храма `/temples/[slug]` с фото, адресом, транспортом, расписанием, историей, контактами и отзывами.
- Авторизация, профиль, избранное и отзывы.
- Страница поддержки `/support` с оплатой через ЮKassa.
- SEO: metadata, Open Graph, Twitter Cards, `robots.txt`, `sitemap.xml`, JSON-LD.

## Стек

- Next.js 15, React 19, TypeScript, App Router
- Tailwind CSS
- Prisma
- PostgreSQL / PostGIS
- NextAuth
- Zod
- Docker / Docker Compose

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
- `APP_DOMAIN` — публичный домен, по умолчанию `https://hramgo.ru`.
- `USE_DEMO_DATA` — dev fallback для демо-данных; в production должен быть `false`.
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` — хранилище фото.
- `MAPS_API_KEY`, `GEOCODER_API_KEY` — карты и геокодирование.
- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` — платежи поддержки через ЮKassa.
- `YOOKASSA_RECEIPT_ITEM_NAME` — название платежа для ЮKassa.
- `YOOKASSA_LEGAL_ID`, `YOOKASSA_SBP_MERCHANT_ID`, `YOOKASSA_MCC` — публичные идентификаторы подключения ЮKassa и СБП.
- `ROBO_FISCALIZATION_ENABLED`, `ROBO_FISCALIZATION_MODE`, `ROBO_RECEIPT_ITEM_NAME` — служебные флаги проверки фискализации. Точное название позиции и признак предмета расчёта должны быть письменно подтверждены платежным провайдером и владельцем проекта.
- `SUPPORT_EMAIL_FROM`, `SUPPORT_EMAIL_REPLY_TO`, `SUPPORT_EMAIL_TRANSPORT` — настройки служебной почты, если включается отдельное письмо-подтверждение. Оно не заменяет кассовый чек.
- `MIN_SUPPORT_AMOUNT_RUB`, `MAX_SUPPORT_AMOUNT_RUB` — диапазон добровольной поддержки.
- `RETURN_REQUEST_REVIEW_DAYS`, `RETURN_PAYMENT_DAYS` — сроки рассмотрения обращения и возврата.
- `LEGAL_FULL_NAME`, `LEGAL_INN`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `LEGAL_ADDRESS` — реквизиты и контакты.

Секреты нельзя коммитить в репозиторий.

## ЮKassa

HramGo использует модель добровольной поддержки бесплатного информационного проекта. Поддержка не является покупкой товара, платного доступа, подписки или индивидуальной услуги.

Подключение:

- ShopID: `1388625`
- LegalID: `LB0003357423`
- MerchantID СБП: `MB0002928350`
- MCC: `9999`
- СБП и T-Pay выбираются пользователем на защищенной странице оплаты ЮKassa.

Для запуска production-платежей обязательно заполнить на сервере:

- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_RECEIPT_ITEM_NAME`
- при необходимости переопределить `MIN_SUPPORT_AMOUNT_RUB`, `MAX_SUPPORT_AMOUNT_RUB`, `RETURN_REQUEST_REVIEW_DAYS`, `RETURN_PAYMENT_DAYS`

Сайт не рисует собственную форму выбора СБП/T-Pay и не хранит данные банковских карт. Пользователь перенаправляется на платежную страницу ЮKassa.

Важно: сайт не генерирует самодельные чеки. Фискальный чек должен формироваться только через фактически подключенную фискализацию платежного провайдера или иной законный механизм. Перед боевым запуском нужно проверить настройки фискализации в кабинете и провести тестовый платеж с получением чека на e-mail.

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

- `src/app` — маршруты, layouts, API routes, metadata, sitemap и robots.
- `src/features` — доменная логика и типы.
- `src/components` — UI-компоненты и виджеты страниц.
- `src/lib` — инфраструктура: Prisma, auth, env, storage, API helpers.
- `src/types` — глобальные типы.
- `scripts` — импорт, геокодирование, crawl и служебные задачи.
- `prisma` — схема и seed.

## SEO

Публичные адреса:

- [https://hramgo.ru/sitemap.xml](https://hramgo.ru/sitemap.xml)
- [https://hramgo.ru/robots.txt](https://hramgo.ru/robots.txt)
- [https://hramgo.ru/rss.xml](https://hramgo.ru/rss.xml)

## Деплой

Текущий продакшен работает в Docker-контейнере приложения. Перед релизом:

```bash
npm run typecheck
npm run lint
npm run build
```

После деплоя проверить:

- [https://hramgo.ru](https://hramgo.ru)
- [https://hramgo.ru/temples](https://hramgo.ru/temples)
- [https://hramgo.ru/map](https://hramgo.ru/map)
- [https://hramgo.ru/support](https://hramgo.ru/support)
- [https://hramgo.ru/favicon.ico](https://hramgo.ru/favicon.ico)

## Статус

Проект находится в production-ready стадии. Основные следующие улучшения: расширение и ручная верификация базы храмов, улучшение качества фото, посадочные SEO-страницы по районам/метро/МЦД и автоматические регресс-проверки.
