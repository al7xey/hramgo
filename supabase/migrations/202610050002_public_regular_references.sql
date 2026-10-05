begin;
drop policy if exists schedules_read on public.temple_schedule_entries;
create policy schedules_read on public.temple_schedule_entries for select to anon,authenticated using(
  public.is_published_temple(temple_id) and (
    status='VERIFIED'
    or (status='REVIEW' and extraction_method='regular-reference' and service_date is null)
  )
);
create index if not exists regular_schedule_search_idx on public.temple_schedule_entries(kind,starts_at)
where service_date is null and extraction_method='regular-reference';
commit;
