-- Eight Paths: find friends by username. Run once in the Supabase SQL editor
-- (or `supabase db push`).

-- Find players by the start of their username (at least 2 letters), never
-- yourself or anyone either of you has blocked. Friend codes aren't shown.
create or replace function public.search_players(query text)
returns table (id uuid, username text, founder_number int, is_friend boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.founder_number,
         exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = p.id)
  from profiles p
  where auth.uid() is not null
    and length(trim(query)) >= 2
    and lower(p.username) like lower(replace(replace(trim(query), '%', ''), '_', '\_')) || '%' escape '\'
    and p.id <> auth.uid()
    and not exists (
      select 1 from blocks b
      where (b.user_id = auth.uid() and b.blocked_id = p.id) or (b.user_id = p.id and b.blocked_id = auth.uid())
    )
  order by lower(p.username) = lower(trim(query)) desc, lower(p.username)
  limit 10;
$$;

revoke all on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;

-- Add a friend you found by username: the same as adding by code.
create or replace function public.add_friend_by_id(friend uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  code text;
begin
  select friend_code into code from profiles where id = friend;
  if code is null then raise exception 'unknown_code'; end if;
  return public.add_friend(code);
end $$;

revoke all on function public.add_friend_by_id(uuid) from public, anon;
grant execute on function public.add_friend_by_id(uuid) to authenticated;
