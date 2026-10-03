begin;
-- Supabase default grants may be broader than the grants in individual migrations.
-- Revoke first, then explicitly grant only the operations and columns we use.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant select on public.temples,public.temple_photos,public.temple_sources,public.temple_field_evidence,public.temple_transit,public.temple_social_links,public.temple_clergy,public.temple_services,public.temple_schedule_entries to anon,authenticated;
grant select on public.profiles,public.user_roles,public.favorites,public.reviews,public.review_votes,public.review_reports,public.review_photos,public.review_replies,public.representatives,public.temple_edit_suggestions to authenticated;
grant update(display_name,avatar_url,theme) on public.profiles to authenticated;
grant insert,delete on public.favorites to authenticated;
grant insert(temple_id,user_id,rating,text,visit_type,visit_date) on public.reviews to authenticated;
grant update(rating,text,visit_type,visit_date) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant insert(user_id,temple_id,field_name,new_value,source_url) on public.temple_edit_suggestions to authenticated;
grant insert(user_id,temple_id) on public.representatives to authenticated;
grant insert(review_id,user_id,storage_path,alt) on public.review_photos to authenticated;
grant select(id,amount_kopecks,currency,status,receipt_status,created_at) on public.support_payments to authenticated;
grant select on public.moderation_logs,public.import_jobs,public.import_logs to authenticated;
create policy moderation_log_read on public.moderation_logs for select to authenticated using(public.is_moderator());
create policy import_job_read on public.import_jobs for select to authenticated using(public.is_moderator());
create policy import_log_read on public.import_logs for select to authenticated using(public.is_moderator());

-- Moderator read access never implies a client-writable role or publication flag.
do $$ declare t text; begin
  foreach t in array array['temples','temple_photos','temple_sources','temple_field_evidence','temple_transit','temple_social_links','temple_clergy','temple_services','temple_schedule_entries'] loop
    execute format('create policy moderator_read on public.%I for select to authenticated using(public.is_moderator())',t);
  end loop;
end $$;
create function public.moderate_suggestion(target text,new_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_moderator() or new_status not in ('APPROVED','REJECTED') then raise exception 'Not permitted'; end if;
  update public.temple_edit_suggestions set status=new_status where id=target;
  if not found then raise exception 'Suggestion not found'; end if;
  insert into public.moderation_logs(moderator_id,entity_type,entity_id,action) values(auth.uid(),'suggestion',target,new_status);
end $$;
revoke all on function public.moderate_suggestion(text,text) from public;
grant execute on function public.moderate_suggestion(text,text) to authenticated;
-- Private child objects must not be readable through a public parent with a private payload.
revoke select on public.temple_field_evidence from anon,authenticated;
grant select(id,temple_id,field_name,source_url,confidence,last_checked_at) on public.temple_field_evidence to anon,authenticated;
commit;
