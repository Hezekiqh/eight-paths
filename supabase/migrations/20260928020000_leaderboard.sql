-- Eight Paths: collection leaderboard.
--
-- A collection is worth the sum of its heroes, and a hero is worth more the
-- fewer players have woken them: 100 points if you're the only one, down to 5
-- when everyone has them. Values shift as the community grows.

-- Points for every character anyone has woken.
create or replace function public.hero_points()
returns table (character_id text, points int)
language sql stable security definer set search_path = public as $$
  with players as (select greatest(count(*), 1)::float as n from profiles),
  woken as (select c.character_id, count(*)::float as k from collections c group by c.character_id)
  select w.character_id, greatest(5, round(100 * (1 - (w.k - 1) / (select n from players))))::int
  from woken w;
$$;

-- The leaderboard: 'friends' is the player and their friends, 'all' is the
-- top 100 of everyone. Profiles only; no one's habits exist on the server.
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
  )
  select w.id, w.username, w.founder_number, w.leader, w.level,
         count(c.character_id)::int,
         coalesce(sum(pts.points), 0)::int
  from who w
  left join collections c on c.user_id = w.id
  left join pts on pts.character_id = c.character_id
  group by w.id, w.username, w.founder_number, w.leader, w.level
  order by 7 desc, 6 desc, w.founder_number nulls last
  limit 100;
$$;

revoke all on function public.hero_points(), public.leaderboard(text) from public, anon;
grant execute on function public.hero_points(), public.leaderboard(text) to authenticated;
