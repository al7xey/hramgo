# HramGo migration — 2026-10-03

## Inventory

Source: `al7xey/hramgo`, main at `2df67a2`. Next.js 15 App Router, React 19,
Prisma 6, PostgreSQL/PostGIS, credentials NextAuth with scrypt passwords.
Temple data is in the production database, not the Git repository.
The existing API handles search, account settings, favorites, reviews, moderation,
representative claims, image uploads and YooKassa. Import scripts use Prisma.
Current canonical domain is https://hramgo.ru; apex A resolves to 195.208.118.38.
Production uses Docker/Caddy. The VPS disk is completely full; Docker exec fails.
An unrelated application also runs on that VPS and is outside this migration.

## Target

GitHub Pages serves a Next.js static export. Published temple HTML and lightweight
catalog JSON are generated once per build from Supabase. Browsers read personal
data through Supabase Auth and RLS; payments use Edge Functions. No realtime or
background polling. Leaflet/OpenStreetMap loads only when a map is needed.
Stable temple IDs and slugs preserve legacy URLs and foreign-key relationships.
Legacy sources and deployment configuration stay available until cutover passes.

Supabase Free limits checked at https://supabase.com/pricing on 2026-10-03:
500 MB database, 1 GB Storage, 5 GB egress plus 5 GB cached egress,
50,000 monthly active users, two active projects. Automatic backups and image
transformations are not included. Projects may pause after a week of inactivity.
Keep raw crawling responses and private database backups outside the repository
and Supabase public tables. Optimize licensed photos before upload, with hashes.

## Release gate

Do not switch DNS until database migration, counts, RLS, Auth, images, payment
functions and Pages build are verified. Back up before every production data
mutation. Do not treat successful build as successful production deployment.
Legacy scrypt passwords cannot be imported as Supabase password hashes. Preserve
user IDs through an explicit mapping and use verified account recovery; never
silently join old personal data to an unverified newly registered email.
