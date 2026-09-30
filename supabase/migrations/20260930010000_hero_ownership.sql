-- Eight Paths: hero ownership (trades, part 1).
--
-- Players can hold several copies of a hero (level-up draws repeat), and
-- trades will move single copies between friends. So the server now knows:
--
--   copies    how many copies of a hero the player has woken themselves (as
--             reported by their phone; it only ever goes up, so restoring an
--             older backup can't lower it)
--   woken_at  when they first woke one (null for a hero that only ever
--             arrived by trade; rarity and "first awakened" ignore those)
--   trade_moves  every copy that has moved in (+1) or out (-1) by trade,
--             written only by the server
--
-- A player holds copies + sum(trade moves). The phone applies each trade move
-- once, by id, so restoring a backup made before a trade replays it.

-- ---------------------------------------------------------------- collections

alter table public.collections
  add column copies int not null default 1 check (copies between 0 and 999),
  add column woken_at timestamptz;

update public.collections set woken_at = first_seen_at where woken_at is null;

alter table public.collections
  alter column woken_at set default now(),
  add constraint collections_woken_copies check (copies = 0 or woken_at is not null);

-- Builds from before this migration still insert one row per woken hero; keep
-- that working, but only as a plain "woke one copy" row. Everything else goes
-- through report_collection or the trade functions.
drop policy "players add to their own collection" on public.collections;
create policy "players add to their own collection" on public.collections
  for insert to authenticated with check (user_id = auth.uid() and copies = 1 and woken_at is not null);

-- ---------------------------------------------------------------- trade moves

create table public.trade_moves (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  character_id text not null check (character_id ~ '^[a-z0-9-]{1,32}$'),
  delta int not null check (delta in (-1, 1)),
  -- The trade this move belongs to (part 2 adds the trades table).
  trade_id uuid,
  created_at timestamptz not null default now()
);

create index trade_moves_user on public.trade_moves (user_id, id);

alter table public.trade_moves enable row level security;

-- Read-only to players; only server functions write moves.
create policy "players see their own trade moves" on public.trade_moves
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- functions

-- The phone reports how many copies of each hero it has woken itself, as
-- {"brannoc": 2, ...}. Counts only go up. Returns how many heroes this player
-- woke for the first time, so the app knows to refresh rarity.
create or replace function public.report_collection(heroes jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  fresh int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if jsonb_typeof(heroes) is distinct from 'object' then raise exception 'bad_input'; end if;

  insert into collections as c (user_id, character_id, copies, woken_at)
  select me, h.key, least(h.value::int, 999), now()
  from jsonb_each_text(heroes) h
  where h.key ~ '^[a-z0-9-]{1,32}$' and h.value ~ '^[0-9]{1,6}$' and h.value::int > 0
  on conflict (user_id, character_id) do update
    set copies = greatest(c.copies, excluded.copies),
        woken_at = coalesce(c.woken_at, excluded.woken_at)
    where excluded.copies > c.copies;

  -- now() is the transaction's start, so it matches exactly the rows woken above.
  select count(*)::int into fresh from collections where user_id = me and woken_at = now();
  return fresh;
end $$;

-- The heroes a player holds right now (woken plus traded in, minus traded
-- out). Visible to the player and their friends, like their collection.
create or replace function public.hero_holdings(player uuid)
returns table (character_id text, copies int)
language sql stable security definer set search_path = public as $$
  with moves as (
    select m.character_id, sum(m.delta)::int as net from trade_moves m where m.user_id = player group by m.character_id
  ),
  held as (
    select coalesce(c.character_id, m.character_id) as character_id,
           coalesce(c.copies, 0) + coalesce(m.net, 0) as copies
    from (select * from collections where user_id = player) c
    full join moves m on m.character_id = c.character_id
  )
  select h.character_id, h.copies from held h
  where h.copies > 0
    and (player = auth.uid()
         or exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = player));
$$;

-- Rarity and "first awakened" count only heroes a player woke themselves, by
-- when they woke them: trading never changes who was first.
create or replace function public.character_stats()
returns table (character_id text, woken_by int, players int, first_username text, first_at timestamptz)
language sql stable security definer set search_path = public as $$
  with totals as (select count(*)::int as n from profiles),
  woken as (select * from collections where woken_at is not null),
  firsts as (
    select distinct on (c.character_id) c.character_id, p.username, c.woken_at
    from woken c join profiles p on p.id = c.user_id
    order by c.character_id, c.woken_at, c.user_id
  )
  select c.character_id, count(*)::int, (select n from totals), f.username, f.woken_at
  from woken c join firsts f using (character_id)
  group by c.character_id, f.username, f.woken_at;
$$;

create or replace function public.hero_points()
returns table (character_id text, points int)
language sql stable security definer set search_path = public as $$
  with players as (select greatest(count(*), 1)::float as n from profiles),
  woken as (
    select c.character_id, count(*)::float as k from collections c where c.woken_at is not null group by c.character_id
  )
  select w.character_id, greatest(5, round(100 * (1 - (w.k - 1) / (select n from players))))::int
  from woken w;
$$;

-- The leaderboard counts the heroes each player holds right now.
create or replace function public.leaderboard(scope text default 'friends')
returns table (
  user_id uuid,
  username text,
  founder_number int,
  leader text,
  level int,
  heroes int,
  value int
)
language sql stable security definer set search_path = public as $$
  with pts as (select * from public.hero_points()),
  who as (
    select p.* from profiles p
    where scope = 'all'
       or p.id = auth.uid()
       or exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = p.id)
  ),
  moves as (
    select m.user_id, m.character_id, sum(m.delta)::int as net from trade_moves m group by m.user_id, m.character_id
  ),
  held as (
    select coalesce(c.user_id, m.user_id) as user_id, coalesce(c.character_id, m.character_id) as character_id
    from collections c
    full join moves m on m.user_id = c.user_id and m.character_id = c.character_id
    where coalesce(c.copies, 0) + coalesce(m.net, 0) > 0
  )
  select w.id, w.username, w.founder_number, w.leader, w.level,
         count(h.character_id)::int,
         coalesce(sum(pts.points), 0)::int
  from who w
  left join held h on h.user_id = w.id
  left join pts on pts.character_id = h.character_id
  group by w.id, w.username, w.founder_number, w.leader, w.level
  order by 7 desc, 6 desc, w.founder_number nulls last
  limit 100;
$$;

revoke all on function public.report_collection(jsonb), public.hero_holdings(uuid) from public, anon;
grant execute on function public.report_collection(jsonb), public.hero_holdings(uuid) to authenticated;
revoke all on function public.character_stats(), public.hero_points(), public.leaderboard(text) from public, anon;
grant execute on function public.character_stats(), public.hero_points(), public.leaderboard(text) to authenticated;
