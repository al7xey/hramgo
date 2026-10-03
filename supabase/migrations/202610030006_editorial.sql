begin;
create function public.catalog_ratings() returns table(temple_id text,review_count bigint,average_rating numeric)
language sql stable security definer set search_path='' as $$
 select r.temple_id,count(*),round(avg(r.rating)::numeric,1) from public.reviews r
 join public.temples t on t.id=r.temple_id where t.status='PUBLISHED' and r.status='APPROVED' group by r.temple_id;
$$;
revoke all on function public.catalog_ratings() from public;
grant execute on function public.catalog_ratings() to anon,authenticated;
create or replace function public.moderate_suggestion(target text,new_status text) returns void
language plpgsql security definer set search_path='' as $$
declare item public.temple_edit_suggestions;
begin
 if not public.is_moderator() or new_status not in ('APPROVED','REJECTED') then raise exception 'Not permitted'; end if;
 select * into item from public.temple_edit_suggestions where id=target and status='PENDING' for update;
 if not found then raise exception 'Pending suggestion not found';end if;
 if new_status='APPROVED' then
  if item.field_name not in ('address','phone','email','website_url','scheduleSummary','sundaySchoolDescription','historySummary','shrines') or char_length(item.new_value)>10000 then raise exception 'Unsupported field';end if;
  if item.source_url is null or item.source_url !~ '^https?://' then raise exception 'Source required';end if;
  if item.field_name='website_url' and item.new_value !~ '^https?://' then raise exception 'Invalid URL';end if;
  if item.field_name in ('address','phone','email','website_url') then
   execute format('update public.temples set %I=$1,updated_at=now(),last_verified_at=now() where id=$2',item.field_name) using item.new_value,item.temple_id;
  else
   update public.temples set details=details||jsonb_build_object(item.field_name,item.new_value),updated_at=now(),last_verified_at=now() where id=item.temple_id;
  end if;
  insert into public.temple_field_evidence(temple_id,field_name,value,source_url,confidence,last_checked_at) values(item.temple_id,item.field_name,item.new_value,item.source_url,.9,now());
 end if;
 update public.temple_edit_suggestions set status=new_status where id=target;
 insert into public.moderation_logs(moderator_id,entity_type,entity_id,action) values(auth.uid(),'suggestion',target,new_status);
end $$;
create function public.moderate_representative(target text,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() or new_status not in ('APPROVED','REJECTED') then raise exception 'Not permitted';end if;
 update public.representatives set status=new_status,verified_by=auth.uid(),verified_at=now() where id=target;
 if not found then raise exception 'Application not found';end if;
 insert into public.moderation_logs(moderator_id,entity_type,entity_id,action) values(auth.uid(),'representative',target,new_status);
end $$;
revoke all on function public.moderate_representative(text,text) from public;
grant execute on function public.moderate_representative(text,text) to authenticated;
create function public.save_schedule(target text,entry jsonb) returns text language plpgsql security definer set search_path='' as $$
declare entry_id text;days smallint[];
begin
 if not public.is_active_user() or not(public.is_moderator() or exists(select 1 from public.representatives where user_id=auth.uid() and temple_id=target and status='APPROVED')) then raise exception 'Not permitted';end if;
 if entry->>'sourceUrl' !~ '^https?://' or coalesce(char_length(entry->>'comment'),0)<5 or coalesce(char_length(entry->>'comment'),0)>2000 then raise exception 'Source and quotation required';end if;
 select array_agg(value::smallint) into days from jsonb_array_elements_text(coalesce(entry->'weekdays','[]'::jsonb));
 if nullif(entry->>'serviceDate','') is null and (days is null or not days<@array[1,2,3,4,5,6,7]::smallint[]) then raise exception 'Calendar required';end if;
 entry_id=gen_random_uuid()::text;
 insert into public.temple_schedule_entries(id,temple_id,service_date,weekdays,starts_at,kind,title,comment,is_special,source_url,verified_at,confidence,status,valid_until)
 values(entry_id,target,nullif(entry->>'serviceDate','')::date,days,(entry->>'startsAt')::time,entry->>'kind',entry->>'title',entry->>'comment',coalesce((entry->>'isSpecial')::boolean,false),entry->>'sourceUrl',now(),.95,'VERIFIED',nullif(entry->>'validUntil','')::date);
 insert into public.moderation_logs(moderator_id,entity_type,entity_id,action,reason) values(auth.uid(),'schedule',entry_id,'VERIFIED',entry->>'sourceUrl');
 return entry_id;
end $$;
revoke all on function public.save_schedule(text,jsonb) from public;
grant execute on function public.save_schedule(text,jsonb) to authenticated;
create function public.limit_user_content() returns trigger language plpgsql security definer set search_path='' as $$
declare recent integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if tg_table_name='reviews' then
  select count(*) into recent from public.reviews where user_id=new.user_id and created_at>now()-interval '10 minutes';if recent>=3 then raise exception 'Please try later';end if;
 elsif tg_table_name='temple_edit_suggestions' then
  select count(*) into recent from public.temple_edit_suggestions where user_id=new.user_id and created_at>now()-interval '1 day';if recent>=20 then raise exception 'Please try later';end if;
 elsif tg_table_name='review_photos' then
  select count(*) into recent from public.review_photos where review_id=new.review_id;if recent>=10 then raise exception 'Photo limit reached';end if;
 elsif tg_table_name='support_payments' and new.user_id is not null then
  select count(*) into recent from public.support_payments where user_id=new.user_id and created_at>now()-interval '10 minutes';if recent>=3 then raise exception 'Please try later';end if;
 end if;
 return new;
end $$;
create trigger review_rate before insert on public.reviews for each row execute function public.limit_user_content();
create trigger suggestion_rate before insert on public.temple_edit_suggestions for each row execute function public.limit_user_content();
create trigger review_photo_limit before insert on public.review_photos for each row execute function public.limit_user_content();
create trigger payment_rate before insert on public.support_payments for each row execute function public.limit_user_content();
commit;
