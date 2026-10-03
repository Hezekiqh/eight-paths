-- Eight Paths: find friends by username.
--
-- Typing part of a username lists matching players (names starting with it
-- first, then names containing it); tapping one adds them, instantly and
-- mutually, like a friend code. Blocks stay hidden both ways: someone who
-- blocked you, or whom you blocked, never turns up in a search.

create or replace function public.search_players(query text)
returns table (id uuid, username text, founder_number int, leader text, level int, is_friend boolean)
language sql stable security definer set search_path = public as $$
  with q as (select lower(trim(query)) as t)
  select p.id, p.username, p.founder_number, p.leader, p.level,
    exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = p.id) as is_friend
  from profiles p, q
  where auth.uid() is not null
    and length(q.t) >= 2
    -- strpos, not like: underscores in usernames aren't wildcards here
    and strpos(lower(p.username), q.t) > 0
    and p.id <> auth.uid()
    and not exists (
      select 1 from blocks b
      where (b.user_id = auth.uid() and b.blocked_id = p.id) or (b.user_id = p.id and b.blocked_id = auth.uid())
    )
  order by lower(p.username) = q.t desc, starts_with(lower(p.username), q.t) desc, length(p.username), lower(p.username)
  limit 20;
$$;

-- Adds a player found by search: the same as add_friend(code), by id.
create or replace function public.add_friend_by_id(friend uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if friend = me then raise exception 'own_code'; end if;
  if not exists (select 1 from profiles where id = friend)
    or exists (select 1 from blocks where (user_id = me and blocked_id = friend) or (user_id = friend and blocked_id = me)) then
    raise exception 'unknown_player'; -- don't reveal a block
  end if;
  insert into friendships (user_id, friend_id) values (me, friend), (friend, me) on conflict do nothing;
  return friend;
end $$;

grant execute on function public.search_players(text), public.add_friend_by_id(uuid) to authenticated;
revoke execute on function public.search_players(text), public.add_friend_by_id(uuid) from public, anon;
