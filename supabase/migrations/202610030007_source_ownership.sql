begin;
alter table public.temple_clergy add column if not exists source_url text;
alter table public.temple_social_links add column source_url text;
commit;
