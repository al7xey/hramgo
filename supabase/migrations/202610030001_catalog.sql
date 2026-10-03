begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.temples (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null,
  short_name text,
  object_type text,
  address text,
  district text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point,4326) generated always as (
    case when latitude is not null and longitude is not null then
      extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography end
  ) stored,
  website_url text,
  phone text,
  email text,
  status text not null default 'DRAFT' check (status in ('DRAFT','REVIEW','PUBLISHED','REJECTED')),
  details jsonb not null default '{}'::jsonb,
  source_primary_url text,
  confidence real not null default 0 check (confidence between 0 and 1),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (latitude between -90 and 90 and longitude between -180 and 180)
);
create index temples_geo_idx on public.temples using gist(location) where status='PUBLISHED';
create index temples_name_idx on public.temples using gin(name extensions.gin_trgm_ops) where status='PUBLISHED';
create index temples_search_idx on public.temples using gin(to_tsvector('russian',coalesce(name,'') || ' ' || coalesce(address,'') || ' ' || coalesce(district,''))) where status='PUBLISHED';
create index temples_district_idx on public.temples(district) where status='PUBLISHED';

create table public.temple_photos (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  image_url text not null,
  storage_path text unique,
  source_url text,
  author text,
  license text,
  copyright_status text not null default 'MANUAL_REVIEW',
  content_hash text unique,
  width integer check(width>0), height integer check(height>0), bytes integer check(bytes>0),
  alt text,
  is_main boolean not null default false,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','HIDDEN','NEEDS_REVIEW')),
  imported_at timestamptz not null default now()
);
create index temple_photos_temple_idx on public.temple_photos(temple_id);
create unique index temple_photos_main_idx on public.temple_photos(temple_id) where is_main and status='APPROVED';

create table public.temple_sources (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  url text not null,
  source_type text not null,
  title text,
  etag text, last_modified text, content_hash text,
  last_checked_at timestamptz,
  last_verified_at timestamptz,
  http_status integer,
  confidence real not null default 0 check(confidence between 0 and 1),
  unique(temple_id,url)
);
create table public.temple_field_evidence (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  field_name text not null, value text, source_url text not null, quote text,
  confidence real not null default 0 check(confidence between 0 and 1),
  last_checked_at timestamptz
);
create index evidence_temple_field_idx on public.temple_field_evidence(temple_id,field_name);

create table public.temple_transit (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  station text not null, line_id text not null, line_name text not null, line_color text not null,
  system text not null check(system in ('metro','mcc','mcd')),
  distance_meters integer not null check(distance_meters>=0),
  walk_minutes integer check(walk_minutes>=0),
  route_verified boolean not null default false,
  source_url text,
  unique(temple_id,station,line_id)
);
create index transit_temple_idx on public.temple_transit(temple_id);
create index transit_station_idx on public.temple_transit(station,line_id);
create table public.temple_social_links (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  label text not null, url text not null, type text not null,
  unique(temple_id,url)
);
create table public.temple_clergy (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  name text not null, rank text, role text not null, details text, source_url text
);
create index clergy_temple_idx on public.temple_clergy(temple_id);
create table public.temple_services (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  kind text not null, title text not null, description text not null, source_url text,
  unique(temple_id,kind,title)
);
create table public.temple_schedule_entries (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  service_date date,
  weekdays smallint[],
  starts_at time not null,
  kind text not null check(kind in ('liturgy','evening','prayer','other')),
  title text not null, comment text,
  is_special boolean not null default false,
  valid_from date, valid_until date,
  source_url text not null,
  verified_at timestamptz not null,
  confidence real not null check(confidence between 0 and 1),
  status text not null default 'REVIEW' check(status in ('REVIEW','VERIFIED','REJECTED')),
  check(service_date is not null or coalesce(cardinality(weekdays)>0 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[],false)),
  check(valid_until is null or valid_from is null or valid_until>=valid_from)
);
create index schedule_search_idx on public.temple_schedule_entries(kind,starts_at,service_date) where status='VERIFIED';
create index schedule_temple_idx on public.temple_schedule_entries(temple_id);

create or replace function public.is_published_temple(temple_id text) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.temples where id=temple_id and status='PUBLISHED');
$$;

alter table public.temples enable row level security;
create policy temples_read on public.temples for select to anon,authenticated using(status='PUBLISHED');
grant select on public.temples to anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['temple_photos','temple_sources','temple_field_evidence','temple_transit','temple_social_links','temple_clergy','temple_services','temple_schedule_entries'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select on public.%I to anon, authenticated',t);
    execute format('create policy published_parent on public.%I for select to anon,authenticated using(public.is_published_temple(temple_id))',t);
  end loop;
end $$;
-- Replace broad child policies where unpublished material needs additional checks.
drop policy published_parent on public.temple_photos;
create policy photos_read on public.temple_photos for select to anon,authenticated using(status='APPROVED' and public.is_published_temple(temple_id));
drop policy published_parent on public.temple_schedule_entries;
create policy schedules_read on public.temple_schedule_entries for select to anon,authenticated using(status='VERIFIED' and public.is_published_temple(temple_id));

create or replace function public.nearby_temples(lat double precision,lon double precision,radius_m integer default 8000)
returns table(id text,slug text,name text,address text,distance_m double precision)
language sql stable security invoker set search_path='' as $$
  select t.id,t.slug,t.name,t.address,
    extensions.st_distance(t.location,extensions.st_setsrid(extensions.st_makepoint(lon,lat),4326)::extensions.geography)
  from public.temples t
  where lat between -90 and 90 and lon between -180 and 180
    and radius_m between 1 and 50000 and t.status='PUBLISHED'
    and extensions.st_dwithin(t.location,extensions.st_setsrid(extensions.st_makepoint(lon,lat),4326)::extensions.geography,radius_m)
  order by 5 limit 100;
$$;

create or replace function public.services_on_date(on_date date,service_kind text default null)
returns setof public.temple_schedule_entries language sql stable security invoker set search_path='' as $$
  select e.* from public.temple_schedule_entries e
  where e.status='VERIFIED' and public.is_published_temple(e.temple_id)
    and e.confidence>=0.8 and e.verified_at between now()-interval '45 days' and now()
    and (service_kind is null or e.kind=service_kind)
    and (e.service_date=on_date or (
      e.service_date is null and extract(isodow from on_date)::smallint=any(e.weekdays)
      and (e.valid_from is null or e.valid_from<=on_date) and (e.valid_until is null or e.valid_until>=on_date)
      and not exists(select 1 from public.temple_schedule_entries s where s.temple_id=e.temple_id and s.service_date=on_date and s.is_special and s.status='VERIFIED' and s.confidence>=0.8 and s.verified_at between now()-interval '45 days' and now())
    )) order by e.starts_at limit 500;
$$;
revoke all on function public.nearby_temples(double precision,double precision,integer), public.services_on_date(date,text) from public;
grant execute on function public.nearby_temples(double precision,double precision,integer), public.services_on_date(date,text) to anon,authenticated;
commit;
