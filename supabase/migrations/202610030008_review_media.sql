begin;
create function public.moderate_report(target text,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() or new_status not in ('RESOLVED','REJECTED') then raise exception 'Not permitted';end if;
 update public.review_reports set status=new_status where id=target;
 if not found then raise exception 'Report not found';end if;
 insert into public.moderation_logs(moderator_id,entity_type,entity_id,action) values(auth.uid(),'report',target,new_status);
end $$;
create function public.moderate_review_photo(target text,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() or new_status not in ('APPROVED','REJECTED') then raise exception 'Not permitted';end if;
 update public.review_photos set status=new_status where id=target;
 if not found then raise exception 'Photo not found';end if;
 insert into public.moderation_logs(moderator_id,entity_type,entity_id,action) values(auth.uid(),'review_photo',target,new_status);
end $$;
revoke all on function public.moderate_report(text,text),public.moderate_review_photo(text,text) from public;
grant execute on function public.moderate_report(text,text),public.moderate_review_photo(text,text) to authenticated;
create function public.review_upload_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;uid uuid=auth.uid();review_id text;
begin
 if new.bucket_id<>'review-photos' or uid is null then return new;end if;
 review_id=(storage.foldername(new.name))[2];
 if not exists(select 1 from public.reviews r where r.id=review_id and r.user_id=uid and r.status in ('PENDING','APPROVED')) then raise exception 'Review required';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select count(*) into n from storage.objects where bucket_id='review-photos' and (storage.foldername(name))[1]=uid::text;
 if n>=40 then raise exception 'Storage quota reached';end if;
 select count(*) into n from storage.objects where bucket_id='review-photos' and (storage.foldername(name))[1]=uid::text and (storage.foldername(name))[2]=review_id;
 if n>=10 then raise exception 'Photo limit reached';end if;
 return new;
end $$;
create trigger review_storage_quota before insert on storage.objects for each row execute function public.review_upload_quota();
commit;
