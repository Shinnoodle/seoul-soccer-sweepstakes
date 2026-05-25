create or replace function public.picked_user_ids(_match_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.match_picks where match_id = _match_id
$$;

grant execute on function public.picked_user_ids(uuid) to authenticated;