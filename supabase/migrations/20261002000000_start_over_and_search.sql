-- Eight Paths: Start over erases your game on the server too, and you can find
-- friends by username. Run once in the Supabase SQL editor (or `supabase db push`).

-- Start over: everything the game put on the server for you goes, so the
-- leaderboard, your friends' view of your heroes and any traded-in copies
-- start from nothing again. Your account stays: username, founder number,
-- friend code, friends, blocks, and who joined with your code (so the invite
-- reward cap can't be reset).
create or replace function public.reset_game_data() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  delete from collections where user_id = me;
  delete from trade_moves where user_id = me;
  update trade_offers set status = 'cancelled', closed_at = now()
    where status = 'open' and (from_id = me or to_id = me);
  update profiles set leader = null, party = '{}', level = 1, days_shown_up = null, streak = null
    where id = me;
end $$;

revoke all on function public.reset_game_data() from public, anon;
grant execute on function public.reset_game_data() to authenticated;

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
