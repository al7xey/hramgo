# HramGo

Православные храмы Москвы и Новой Москвы. Next.js 15, React 19, TypeScript, статический экспорт для GitHub Pages. Supabase: Auth, PostgreSQL/PostGIS, RLS, Storage и Edge Functions.

## Локальная работа

Node.js 24. Конфигурация публичного клиента — в `.env.local` по `.env.example`. Без Supabase доступны реальные статические карточки и поиск, а аккаунты/отзывы явно показывают недоступность сервиса.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run data:audit
npm run build
node scripts/check-export.mjs
npm run preview
```

Сборка создаёт `out/`, включая вложенные страницы храмов, sitemap, robots, RSS и CNAME. Preview доступен по http://127.0.0.1:4173.

## Данные и обновления

`data/temples.json` — проверяемый публичный снимок. `public/data/catalog.json` — компактный каталог для поиска и карты. Персональных данных и токенов в этих файлах нет. Избранное, отзывы, личный кабинет и модерация читаются непосредственно из Supabase с RLS. Изменения статических сведений требуют новой сборки.

`npm run catalog:refresh` читает официальный справочник с ограничением параллелизма, кешем и условными HTTP-запросами. Автоматические расписания остаются кандидатами REVIEW. Публикация VERIFIED требует отдельной проверки источника. `npm run catalog:sync` читает только опубликованные объекты публичным ключом через RLS.

Миграции, порядок переноса, резервные копии, ограничения и состояние внешних систем описаны в [docs/MIGRATION.md](docs/MIGRATION.md). Отчёт о недостающих полях — `data/quality-report.json`. Приватные архивы — только `tmp/backups/`; в Git они не включаются.

## Развёртывание

`.github/workflows/pages.yml` выполняет все проверки перед загрузкой статического артефакта. Автопубликация закрыта переменной `PRODUCTION_READY` до проверки Supabase, Auth, SMTP, Storage, платежей и DNS. Нужны только публичные переменные Supabase. Секретный ключ Supabase и YooKassa запрещено передавать в Pages.

Прежний backend на Prisma/NextAuth и его скрипты сохранены в `legacy/` для миграции и отката. Они не участвуют в новой сборке. Старый Docker/VPS нельзя отключать до окончательной сверки данных и проверки нового домена.
