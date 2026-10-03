begin;
create table public.review_tags(id text primary key,name text not null,slug text not null unique);
create table public.review_tag_links(review_id text references public.reviews on delete cascade,tag_id text references public.review_tags on delete cascade,primary key(review_id,tag_id));
create table public.legacy_review_photos(
  id text primary key,review_id text references public.reviews on delete cascade,
  image_url text not null,storage_key text,alt text,status text not null,created_at timestamptz not null
);
alter table public.review_tags enable row level security;
alter table public.review_tag_links enable row level security;
alter table public.legacy_review_photos enable row level security;
revoke all on public.review_tags,public.review_tag_links,public.legacy_review_photos from anon,authenticated;
grant all on public.review_tags,public.review_tag_links,public.legacy_review_photos to service_role;
grant select on public.review_tags to anon,authenticated;
create policy tags_read on public.review_tags for select to anon,authenticated using(true);
commit;
