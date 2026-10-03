begin;
-- The owner requested a directory without accounts or visitor content.
-- The former database was backed up privately before applying this migration.
drop trigger if exists auth_user_created on auth.users;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=any(array[
 'create_profile','is_moderator','is_active_user','review_before_update','review_upload_quota',
 'limit_user_content','temple_reviews','temple_rating','catalog_ratings','report_review','vote_review',
 'moderate_review','moderate_review_photo','moderate_report','moderate_suggestion','moderate_representative','save_schedule'])
 loop execute format('drop function if exists %s cascade',f.signature);end loop;
end $$;
drop table if exists public.review_tag_links,public.review_tags,public.legacy_review_photos,
 public.review_photos,public.review_votes,public.review_reports,public.review_replies,
 public.representatives,public.temple_edit_suggestions,public.moderation_logs,
 public.favorites,public.reviews,public.profiles,public.user_roles,
 public.support_payments,public.legacy_user_map,public.import_logs,public.import_jobs cascade;
drop policy if exists review_photo_read on storage.objects;
drop policy if exists review_photo_upload on storage.objects;
drop policy if exists review_photo_remove on storage.objects;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('temple-photos','temple-photos',true,524288,array['image/webp','image/avif','image/jpeg']) on conflict(id) do nothing;
drop policy if exists temple_photo_read on storage.objects;
create policy temple_photo_read on storage.objects for select to anon using(bucket_id='temple-photos');
do $$ declare t text; begin
 foreach t in array array['temples','temple_photos','temple_sources','temple_field_evidence',
 'temple_transit','temple_social_links','temple_clergy','temple_services','temple_schedule_entries'] loop
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  if t<>'temple_field_evidence' then execute format('grant select on public.%I to anon',t);end if;
 end loop;
end $$;
grant select(id,temple_id,field_name,source_url,confidence,last_checked_at) on public.temple_field_evidence to anon;
commit;
