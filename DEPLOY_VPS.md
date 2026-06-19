# HramGo VPS Deploy

This project can run next to the existing `massage-club` stack on the same VPS.

## Services

- `postgres`: dedicated Postgres/PostGIS for HramGo
- `setup`: one-shot Prisma `db push`
- `seed`: manual one-shot demo seed
- `app`: Next.js production server on port `3000`

The `app` container joins the external Docker network `massage-club_default`, so the existing Caddy instance can reverse proxy `hramgo.ru` to `hramgo-app:3000`.

## Required server files

- project directory, for example `/opt/hramgo`
- `.env.server`
- `docker-compose.server.yml`
- `Dockerfile`

## Caddy

Add this block to `/opt/massage-club/Caddyfile`:

```caddy
http://hramgo.ru, http://www.hramgo.ru {
  redir https://hramgo.ru{uri} 301
}

www.hramgo.ru {
  redir https://hramgo.ru{uri} 301
}

hramgo.ru {
  encode zstd gzip
  reverse_proxy hramgo-app:3000
}
```

Then reload Caddy from the existing stack.

## First start

```bash
docker compose -f docker-compose.server.yml up -d --build postgres setup app
docker compose -f docker-compose.server.yml run --rm --profile manual seed
```
