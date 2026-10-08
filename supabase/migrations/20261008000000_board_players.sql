-- Eight Paths: niche rankings.
--
-- The Social tab ranks collections in many ways (the most of the First 8, the
-- most Warriors, the most 5-star heroes, ...). What counts as a Warrior or a
-- 5-star lives in the app, so the server hands over what each player holds and
-- the phone does the ranking.
--
-- Only heroes and counts, the same things the leaderboard already shows in
-- total: never habits. The 100 biggest collections are enough to rank.

create or replace function public.board_players()
returns table (
  user_id uuid,
  username text,
  founder_number int,
  leader text,
  level int,
  holdings jsonb
)
language sql stable security definer set search_path = public as $$
  with moves as (
    select m.user_id, m.character_id, sum(m.delta)::int as net from trade_moves m group by m.user_id, m.character_id
  ),
  held as (
    select coalesce(c.user_id, m.user_id) as user_id,
           coalesce(c.character_id, m.character_id) as character_id,
           coalesce(c.copies, 0) + coalesce(m.net, 0) as copies
    from collections c
    full join moves m on m.user_id = c.user_id and m.character_id = c.character_id
  ),
  per_player as (
    select h.user_id, jsonb_object_agg(h.character_id, h.copies) as holdings, count(*) as heroes
    from held h
    where h.copies > 0
    group by h.user_id
  )
  select p.id, p.username, p.founder_number, p.leader, p.level, pp.holdings
  from per_player pp
  join profiles p on p.id = pp.user_id
  order by pp.heroes desc, p.founder_number nulls last
  limit 100;
$$;

revoke all on function public.board_players() from public, anon;
grant execute on function public.board_players() to authenticated;
