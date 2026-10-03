begin;
-- Staff hide content through audited RPCs. Only the author can permanently delete it.
drop policy reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated using(user_id=(select auth.uid()));
commit;
