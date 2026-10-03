begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('temple-photos','temple-photos',true,524288,array['image/webp','image/avif','image/jpeg']),
  ('review-photos','review-photos',false,1048576,array['image/webp','image/jpeg'])
on conflict(id) do nothing;
-- Temple photos are published only by a trusted importer after permission/licence review.
create policy temple_photo_read on storage.objects for select to anon,authenticated using(bucket_id='temple-photos');
create policy review_photo_read on storage.objects for select to authenticated using(bucket_id='review-photos' and (owner_id=auth.uid()::text or public.is_moderator()));
create policy review_photo_upload on storage.objects for insert to authenticated with check(bucket_id='review-photos' and public.is_active_user() and (storage.foldername(name))[1]=auth.uid()::text);
create policy review_photo_remove on storage.objects for delete to authenticated using(bucket_id='review-photos' and owner_id=auth.uid()::text);
grant insert(review_id,user_id,storage_path,alt) on public.review_photos to authenticated;
create policy review_photo_metadata_create on public.review_photos for insert to authenticated with check(user_id=auth.uid() and status='PENDING' and public.is_active_user() and exists(select 1 from public.reviews r where r.id=review_id and r.user_id=auth.uid()));
commit;
