# HramGo

HramGo is a mobile-first православный помощник для поиска храмов РПЦ Москвы. MVP includes a catalog, temple pages, map view, favorites, visitor impressions, moderation/admin surfaces, representative surfaces, Prisma/PostGIS schema, seed data, Docker Compose infrastructure, and an evidence-first ingestion pipeline scaffold.

## Stack

- Next.js 15, React 19, TypeScript, App Router
- Tailwind CSS with CSS variables, shadcn/ui-style local components, Framer Motion-ready setup
- Prisma, PostgreSQL, PostGIS
- NextAuth/Auth.js-style email demo auth
- Zod validation
- S3-compatible storage contract for photos
- Docker Compose with PostgreSQL/PostGIS, MinIO, Redis

## Quick Start

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For an immediate UI preview without a database, keep `USE_DEMO_DATA=true` in `.env`. Set `USE_DEMO_DATA=false` to force Prisma-backed reads.

## Environment

Copy `.env.example` to `.env` and fill production values:

- `DATABASE_URL` for PostgreSQL/PostGIS
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `EMAIL_SERVER`, `EMAIL_FROM` if enabling magic links
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL`
- `MAPS_API_KEY`, `GEOCODER_API_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`
- `REVIEW_MODERATION_REQUIRED`, `AUTO_APPROVE_SAFE_REVIEWS`

API keys must stay server-side.

## Database

The Prisma schema defines users, roles, temples, sources, evidence, photos, favorites, visitor impressions, reports, replies, representatives, edit suggestions, import jobs, import logs, and moderation logs.

```bash
npm run db:migrate
npm run db:seed
```

The schema includes a PostGIS `geometry(Point, 4326)` field as an unsupported Prisma type. Add a production migration for `CREATE EXTENSION IF NOT EXISTS postgis;` and a GiST index on `Temple.location`.

## Docker Compose

```bash
docker compose up -d
```

Services:

- PostgreSQL with PostGIS on `localhost:5432`
- MinIO on `localhost:9000`, console on `localhost:9001`
- Redis on `localhost:6379`

## Auth And Roles

Roles are defined as:

- `USER`
- `MODERATOR`
- `ADMIN`
- `TEMPLE_REPRESENTATIVE`

The MVP ships with demo email credentials for development. In production, replace demo credential auth with email magic links or an approved identity provider and enforce role checks on every admin and representative mutation.

## Themes

The app supports light, dark, and system themes through CSS variables and Tailwind dark mode. Light mode is the default and uses a white background. The theme selector is in `/profile` and `/profile/settings`; it persists to `localStorage` in the MVP and has a `/api/me/theme` endpoint for database persistence.

## Favorites

The UI stores favorites locally for instant MVP use and exposes:

- `POST /api/favorites`
- `DELETE /api/favorites/[templeId]`
- `GET /api/me/favorites`

Connect these handlers to the Prisma `Favorite` model when user sessions are enforced.

## Visitor Impressions

The interface uses soft wording: “Впечатления посетителей”, “Поделиться впечатлением”, “Полезные заметки”. Internally the model is `Review`. Submissions are validated with Zod and routed through a moderation policy before publication.

Core endpoints:

- `GET /api/temples/[slug]/reviews`
- `POST /api/temples/[slug]/reviews`
- `POST /api/reviews/[reviewId]/helpful`
- `POST /api/reviews/[reviewId]/report`

## Moderation

Admin pages live under `/admin`. The schema supports review approval/rejection/hiding, reports, photo moderation, representative approval, and a moderation log. The MVP routes return consistent JSON stubs ready to connect to Prisma transactions.

## Maps

The MVP uses a responsive local map visualization and route links to Yandex Maps. To connect 2GIS MapGL or Yandex Maps, keep API keys in server env, expose only safe public config, and replace `src/components/map/temple-map.tsx` with the provider adapter.

## S3 Photos

Photo upload limits are configured by:

- `MAX_REVIEW_PHOTOS`
- `MAX_UPLOAD_SIZE_MB`

Only `image/jpeg`, `image/png`, and `image/webp` are accepted by the storage contract. Strip EXIF data in the upload worker before approval.

## LLM Ingestion Pipeline

Scripts are scaffolded in `scripts/`:

```bash
npm run import:official-list
npm run discover:websites
npm run crawl:temple
npm run extract:llm
npm run geocode:temples
npm run moderation:queue
npm run recalculate:ratings
npm run sync:temple-sources
npm run check:stale-data
```

The LLM prompt is in `src/lib/llm/temple-extraction-prompt.ts`. It requires JSON-only output, no invented data, field-level evidence, confidence values, and manual review for uncertain photos.

## Routes

Public:

- `/`
- `/temples`
- `/temples/[slug]`
- `/temples/[slug]/reviews`
- `/map`
- `/favorites`
- `/login`
- `/profile`
- `/profile/reviews`
- `/profile/favorites`
- `/profile/settings`

Admin:

- `/admin`
- `/admin/temples`
- `/admin/reviews`
- `/admin/review-reports`
- `/admin/users`
- `/admin/imports`
- `/admin/moderation`
- `/admin/photos`
- `/admin/representatives`

Representative:

- `/representative`
- `/representative/temples`
- `/representative/reviews`
- `/representative/suggestions`

## Production Checklist

- Replace demo auth with verified email/OAuth auth.
- Enforce role checks in all admin and representative route handlers.
- Add real map provider integration.
- Move favorites and review actions from demo/local mode to Prisma transactions.
- Add S3 presigned upload implementation and EXIF stripping worker.
- Add PostGIS migration for location index.
- Add automated tests for validation, moderation policy, and API permissions.
- Review all seed data against official sources before public deployment.
