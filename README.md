# HramGo

Справочник православных храмов Москвы и Новой Москвы: поиск, карта, фотографии, контакты и проверенные расписания. Next.js 15, React 19, TypeScript, статический экспорт. Каталог хранится в Supabase PostgreSQL/PostGIS, лицензированные изображения — в Storage. Посетитель работает со статическим снимком каталога в браузере.

## Локальная работа

Node.js 24:

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run typecheck
node scripts/check-export.mjs
npm run preview
```

Сборка создаёт `out/` с вложенными карточками, sitemap, robots, RSS и CNAME. Preview: http://127.0.0.1:4173.

## Обновление каталога

Приватный `.env.local` создаётся по `.env.example` и исключён из Git. Ключ администратора используется только локальными скриптами. Сборка Pages читает опубликованные сведения публичным ключом через RLS.

```sh
node --env-file=.env.local scripts/apply-migrations.mjs
node --env-file=.env.local scripts/refresh-official.mjs --apply
node --env-file=.env.local scripts/apply-reviewed-assets.mjs --apply
node --env-file=.env.local scripts/sync-catalog.mjs
npm run data:audit
```

Обновление записей одного источника выполняется транзакцией. Неоднозначные расписания остаются кандидатами; показываются только свежие проверенные записи. Изменения каталога требуют новой статической сборки. Отчёт о пропусках — `data/quality-report.json`.

## Облегчённые фотографии

`npm run photos:prepare` проверяет изображения с локальным HTTP-кэшем. Для фотографий епархиального справочника интерфейс использует миниатюры самого источника. Для изображений с известной лицензией скрипт создаёт WebP-варианты в `public/photos/`; соответствие URL сохраняется в `src/features/temples/photo-variants.json`. Неизвестные права не дают разрешения копировать фото в собственное хранилище. Подробности: `data/photo-variants-report.json`.

Аудит исходной версии и план проверки интерфейса находятся в `audit/2026-10-05/`. Исправления после аудита перечислены отдельно в `IMPLEMENTATION-2026-10-06.md`.

## Публикация

GitHub Pages через `.github/workflows/pages.yml`; `PRODUCTION_READY=true` разрешает публикацию main. URL и publishable key Supabase нужны только для синхронизации каталога. Секретный ключ и пароль базы нельзя передавать в Pages. Состояние переноса и резервные копии описаны в `docs/MIGRATION.md`.
