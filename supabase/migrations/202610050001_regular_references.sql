begin;
-- An unspecified weekday is a reference time, never a confirmed dated service.
alter table public.temple_schedule_entries drop constraint if exists temple_schedule_entries_check;
alter table public.temple_schedule_entries add constraint temple_schedule_entries_check check (
  service_date is not null
  or coalesce(cardinality(weekdays)>0 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[],false)
  or (service_date is null and weekdays is null and status='REVIEW' and extraction_method='regular-reference')
);
commit;
