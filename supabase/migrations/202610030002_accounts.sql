begin;
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Посетитель' check(char_length(display_name) between 1 and 80),
  avatar_url text,
  theme text not null default 'light' check(theme in ('light','dark','system')),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check(role in ('ADMIN','MODERATOR','TEMPLE_REPRESENTATIVE','BLOCKED'))
);
create function public.is_moderator() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('ADMIN','MODERATOR'));
$$;
create function public.is_active_user() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and not exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='BLOCKED');
$$;
revoke all on function public.is_moderator(),public.is_active_user() from public;
grant execute on function public.is_moderator(),public.is_active_user() to authenticated;
create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'name'),80),''),'Посетитель'));
  return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.create_profile();
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
create policy profiles_own_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated using(id=(select auth.uid()) and public.is_active_user()) with check(id=(select auth.uid()));
create policy roles_own_read on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
grant select on public.profiles,public.user_roles to authenticated;
grant update(display_name,avatar_url,theme) on public.profiles to authenticated;

create table public.favorites (
  user_id uuid not null references auth.users on delete cascade,
  temple_id text not null references public.temples on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,temple_id)
);
create index favorites_temple_idx on public.favorites(temple_id);
alter table public.favorites enable row level security;
create policy favorites_read on public.favorites for select to authenticated using(user_id=(select auth.uid()));
create policy favorites_insert on public.favorites for insert to authenticated with check(user_id=(select auth.uid()) and public.is_active_user() and public.is_published_temple(temple_id));
create policy favorites_delete on public.favorites for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,delete on public.favorites to authenticated;

create table public.reviews (
  id text primary key default gen_random_uuid()::text,
  temple_id text not null references public.temples on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  text text not null check(char_length(trim(text)) between 1 and 50000),
  visit_type text not null default 'PERSONAL_VISIT' check(visit_type in ('SERVICE','EXCURSION','SUNDAY_SCHOOL','PERSONAL_VISIT','EVENT','OTHER')),
  visit_date date,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','HIDDEN','NEEDS_REVIEW')),
  moderation_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz,
  unique(user_id,temple_id)
);
create index reviews_temple_status_idx on public.reviews(temple_id,status,created_at desc);
alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select to authenticated using(user_id=(select auth.uid()) or public.is_moderator());
create policy reviews_create on public.reviews for insert to authenticated with check(user_id=(select auth.uid()) and status='PENDING' and public.is_active_user() and public.is_published_temple(temple_id));
create policy reviews_edit on public.reviews for update to authenticated using(user_id=(select auth.uid()) and status in ('PENDING','APPROVED','REJECTED') and public.is_active_user()) with check(user_id=(select auth.uid()) and status='PENDING');
create policy reviews_delete on public.reviews for delete to authenticated using(user_id=(select auth.uid()) or public.is_moderator());
create policy reviews_moderate on public.reviews for update to authenticated using(public.is_moderator()) with check(public.is_moderator());
grant select,delete on public.reviews to authenticated;
grant insert(temple_id,user_id,rating,text,visit_type,visit_date) on public.reviews to authenticated;
grant update(rating,text,visit_type,visit_date) on public.reviews to authenticated;
-- Moderation uses an audited RPC, not a client-writable status column.
create function public.review_before_update() returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  if (new.text,new.rating,new.visit_type,new.visit_date) is distinct from (old.text,old.rating,old.visit_type,old.visit_date) then
    new.status='PENDING'; new.published_at=null;
  end if;
  return new;
end $$;
create trigger review_edit before update on public.reviews for each row execute function public.review_before_update();

create table public.review_votes (
  user_id uuid not null references auth.users on delete cascade,
  review_id text not null references public.reviews on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,review_id)
);
create table public.review_reports (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  review_id text not null references public.reviews on delete cascade,
  reason text not null check(char_length(reason) between 3 and 500),
  status text not null default 'OPEN' check(status in ('OPEN','RESOLVED','REJECTED')),
  created_at timestamptz not null default now(), unique(user_id,review_id)
);
create index reports_review_idx on public.review_reports(review_id);
create table public.review_photos (
  id text primary key default gen_random_uuid()::text,
  review_id text not null references public.reviews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  storage_path text not null unique,
  alt text,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','HIDDEN','NEEDS_REVIEW')),
  created_at timestamptz not null default now(),
  check(storage_path like user_id::text || '/%')
);
create index review_photos_review_idx on public.review_photos(review_id);
create table public.review_replies (
  id text primary key default gen_random_uuid()::text,
  review_id text not null references public.reviews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  text text not null check(char_length(trim(text)) between 1 and 50000),
  status text not null default 'PENDING', created_at timestamptz not null default now()
);
create index replies_review_idx on public.review_replies(review_id);

create table public.representatives (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  temple_id text not null references public.temples on delete cascade,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
  verified_by uuid references auth.users, verified_at timestamptz,
  created_at timestamptz not null default now(), unique(user_id,temple_id)
);
create index representatives_temple_idx on public.representatives(temple_id);
create table public.temple_edit_suggestions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  temple_id text not null references public.temples on delete cascade,
  field_name text not null, old_value text, new_value text not null, source_url text,
  status text not null default 'PENDING', created_at timestamptz not null default now()
);
create index suggestions_temple_idx on public.temple_edit_suggestions(temple_id);
create table public.moderation_logs (
  id text primary key default gen_random_uuid()::text,
  moderator_id uuid references auth.users,
  entity_type text not null, entity_id text not null, action text not null,
  reason text, created_at timestamptz not null default now()
);
create table public.import_jobs (
  id text primary key default gen_random_uuid()::text,
  kind text not null, status text not null, counters jsonb not null default '{}',
  started_at timestamptz not null default now(), finished_at timestamptz
);
create table public.import_logs (
  id text primary key default gen_random_uuid()::text,
  job_id text references public.import_jobs on delete cascade,
  level text not null, message text not null, created_at timestamptz not null default now()
);
create index import_logs_job_idx on public.import_logs(job_id);
create table public.support_payments (
  id uuid primary key default gen_random_uuid(), legacy_id text unique,
  user_id uuid references auth.users,
  email text not null, amount_kopecks integer not null check(amount_kopecks between 10000 and 10000000),
  currency text not null default 'RUB' check(currency='RUB'),
  idempotency_key uuid not null unique,
  provider_id text unique, confirmation_url text,
  status text not null default 'CREATED' check(status in ('CREATED','PENDING','PAID','CANCELLED','ERROR','REFUND_REQUESTED','REFUNDED')),
  receipt_status text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index payments_user_idx on public.support_payments(user_id);
create table public.legacy_user_map (
  legacy_id text primary key,
  user_id uuid not null unique references auth.users,
  migrated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['review_votes','review_reports','review_photos','review_replies','representatives','temple_edit_suggestions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy own_read on public.%I for select to authenticated using(user_id=(select auth.uid()) or public.is_moderator())',t);
  end loop;
  foreach t in array array['moderation_logs','import_jobs','import_logs','support_payments','legacy_user_map'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;
grant insert(user_id,review_id,reason) on public.review_reports to authenticated;
create policy reports_create on public.review_reports for insert to authenticated with check(user_id=(select auth.uid()) and public.is_active_user() and exists(select 1 from public.reviews r where r.id=review_id and r.status='APPROVED'));
-- The public reviews RPC verifies targets for reports/votes without granting base-table access.
create function public.report_review(target text,reason_text text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_user() or not exists(select 1 from public.reviews r where r.id=target and r.status='APPROVED' and public.is_published_temple(r.temple_id)) then raise exception 'Not permitted'; end if;
  insert into public.review_reports(user_id,review_id,reason) values(auth.uid(),target,reason_text) on conflict(user_id,review_id) do update set reason=excluded.reason,status='OPEN';
end $$;
create function public.vote_review(target text,helpful boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_user() or not exists(select 1 from public.reviews r where r.id=target and r.status='APPROVED' and r.user_id<>auth.uid() and public.is_published_temple(r.temple_id)) then raise exception 'Not permitted'; end if;
  if helpful then insert into public.review_votes(user_id,review_id) values(auth.uid(),target) on conflict do nothing;
  else delete from public.review_votes where user_id=auth.uid() and review_id=target; end if;
end $$;
grant insert(user_id,temple_id,field_name,new_value,source_url) on public.temple_edit_suggestions to authenticated;
create policy suggestions_create on public.temple_edit_suggestions for insert to authenticated with check(user_id=(select auth.uid()) and status='PENDING' and public.is_active_user() and public.is_published_temple(temple_id));
grant insert(user_id,temple_id) on public.representatives to authenticated;
create policy representative_apply on public.representatives for insert to authenticated with check(user_id=(select auth.uid()) and status='PENDING' and public.is_active_user() and public.is_published_temple(temple_id));
create policy payments_own_read on public.support_payments for select to authenticated using(user_id=(select auth.uid()));
grant select(id,amount_kopecks,currency,status,receipt_status,created_at) on public.support_payments to authenticated;

create function public.temple_reviews(target text, page_offset integer default 0)
returns table(id text,user_id uuid,author_name text,rating smallint,text text,visit_type text,published_at timestamptz,status text,helpful_count bigint)
language sql stable security definer set search_path='' as $$
  select r.id,r.user_id,p.display_name,r.rating,r.text,r.visit_type,coalesce(r.published_at,r.created_at),r.status,
    (select count(*) from public.review_votes v where v.review_id=r.id)
  from public.reviews r join public.profiles p on p.id=r.user_id
  where r.temple_id=target and public.is_published_temple(target)
    and (r.status='APPROVED' or r.user_id=auth.uid())
  order by r.created_at desc limit 20 offset greatest(0,least(page_offset,10000));
$$;
create function public.temple_rating(target text) returns table(review_count bigint,average_rating numeric)
language sql stable security definer set search_path='' as $$
  select count(*),round(avg(rating)::numeric,1) from public.reviews where temple_id=target and status='APPROVED' and public.is_published_temple(target);
$$;
create function public.moderate_review(target text,new_status text,reason_text text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_moderator() or new_status not in ('APPROVED','REJECTED','HIDDEN') then raise exception 'Not permitted'; end if;
  update public.reviews set status=new_status,moderation_reason=reason_text,published_at=case when new_status='APPROVED' then now() else null end where id=target;
  if not found then raise exception 'Review not found'; end if;
  insert into public.moderation_logs(moderator_id,entity_type,entity_id,action,reason) values(auth.uid(),'review',target,new_status,reason_text);
end $$;
revoke all on function public.temple_reviews(text,integer),public.temple_rating(text),public.report_review(text,text),public.vote_review(text,boolean),public.moderate_review(text,text,text) from public;
grant execute on function public.temple_reviews(text,integer),public.temple_rating(text) to anon,authenticated;
grant execute on function public.report_review(text,text),public.vote_review(text,boolean),public.moderate_review(text,text,text) to authenticated;
commit;
