-- Eight Paths: hero trades between friends (trades, part 2).
--
-- A player offers 1–5 copies of their heroes for 1–5 copies of a friend's.
-- The friend accepts, declines or counters (a counter is a new offer that
-- replaces the old one). Accepting writes trade moves (see hero_ownership) for
-- both players in one step, so a copy is never in two collections at once.
--
-- Rules, all checked here:
--   - friends only, friends for at least a day, both accounts at least 7 days old
--   - the core eight companions can't be traded
--   - a copy received by trade can't be traded on for 7 days
--   - at most 5 open offers sent, and 5 accepted trades a day, per player
--   - offers expire after 3 days, and are voided when a copy in them changes hands
--
-- The phone adds what only it knows: copies still waiting to hatch, and the
-- last copy of the hero walking the Other World, stay off the table.

create table public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  -- One entry per copy: ['dessa', 'dessa'] is two copies of Dessa.
  give text[] not null check (cardinality(give) between 1 and 5),
  get text[] not null check (cardinality(get) between 1 and 5),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'declined', 'cancelled', 'countered', 'expired', 'void')),
  -- The offer this one counters.
  counter_of uuid references public.trade_offers on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (from_id <> to_id)
);

create index trade_offers_open on public.trade_offers (status, created_at) where status = 'open';
create index trade_offers_from on public.trade_offers (from_id, status);
create index trade_offers_to on public.trade_offers (to_id, status);
create index trade_offers_accepted on public.trade_offers (closed_at) where status = 'accepted';

alter table public.trade_offers enable row level security;

-- Each player sees the offers they sent or received; only functions write.
create policy "players see their own trade offers" on public.trade_offers
  for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());

alter table public.trade_moves
  add constraint trade_moves_trade_id_fkey foreign key (trade_id) references public.trade_offers on delete set null;

-- ---------------------------------------------------------------- helpers (not callable by players)

-- The starting eight: every player has them, so they're never traded.
-- Keep in step with DEFAULT_PARTY (a test checks).
create or replace function public.core_heroes() returns text[]
language sql immutable as $$
  select array['brannoc', 'quill', 'wren', 'pip', 'tamsin', 'ysolde', 'moss', 'oren'];
$$;

-- What a player holds: copies woken plus trade moves.
create or replace function public.held_copies(player uuid)
returns table (character_id text, copies int)
language sql stable security definer set search_path = public as $$
  with moves as (
    select m.character_id, sum(m.delta)::int as net from trade_moves m where m.user_id = player group by m.character_id
  )
  select coalesce(c.character_id, m.character_id), (coalesce(c.copies, 0) + coalesce(m.net, 0))::int
  from (select * from collections where user_id = player) c
  full join moves m on m.character_id = c.character_id
  where coalesce(c.copies, 0) + coalesce(m.net, 0) > 0;
$$;

-- What a player could trade now: held copies, less the core eight and copies
-- that arrived by trade in the last 7 days.
create or replace function public.tradeable_copies_of(player uuid)
returns table (character_id text, copies int)
language sql stable security definer set search_path = public as $$
  with recent as (
    select m.character_id, count(*)::int as n from trade_moves m
    where m.user_id = player and m.delta = 1 and m.created_at > now() - interval '7 days'
    group by m.character_id
  )
  select h.character_id, (h.copies - coalesce(r.n, 0))::int
  from public.held_copies(player) h
  left join recent r using (character_id)
  where h.copies - coalesce(r.n, 0) > 0 and h.character_id <> all (public.core_heroes());
$$;

-- Whether a player could trade every copy in `heroes` (repeats count).
create or replace function public.can_trade(player uuid, heroes text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1
    from (select h, count(*)::int as n from unnest(heroes) h group by h) want
    left join public.tradeable_copies_of(player) t on t.character_id = want.h
    where coalesce(t.copies, 0) < want.n
  );
$$;

-- Closes open offers older than 3 days. Every trade function calls it first.
create or replace function public.expire_trade_offers() returns void
language sql security definer set search_path = public as $$
  update trade_offers set status = 'expired', closed_at = now()
  where status = 'open' and created_at < now() - interval '3 days';
$$;

-- The account and friendship rules, raising a code the app turns into words.
create or replace function public.check_trade_partners(me uuid, them uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from friendships where user_id = me and friend_id = them) then
    raise exception 'not_friends';
  end if;
  if exists (select 1 from profiles where id = me and created_at > now() - interval '7 days') then
    raise exception 'you_too_new';
  end if;
  if exists (select 1 from profiles where id = them and created_at > now() - interval '7 days') then
    raise exception 'them_too_new';
  end if;
  if exists (select 1 from friendships where user_id = me and friend_id = them and created_at > now() - interval '1 day') then
    raise exception 'friends_too_new';
  end if;
end $$;

revoke all on function public.held_copies(uuid), public.tradeable_copies_of(uuid), public.can_trade(uuid, text[]),
  public.expire_trade_offers(), public.check_trade_partners(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- functions the app calls

-- What a player (or a friend of theirs) could trade now, as copies per hero.
create or replace function public.tradeable_copies(player uuid)
returns table (character_id text, copies int)
language sql stable security definer set search_path = public as $$
  select t.character_id, t.copies from public.tradeable_copies_of(player) t
  where player = auth.uid()
     or exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = player);
$$;

-- Sends an offer: `give` from this player for `get` from `friend`. With
-- `answering`, it counters an open offer that friend sent, which closes it.
create or replace function public.offer_trade(friend uuid, give text[], get text[], answering uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  answered trade_offers;
  new_id uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  perform public.expire_trade_offers();
  if coalesce(cardinality(give), 0) not between 1 and 5 or coalesce(cardinality(get), 0) not between 1 and 5 then
    raise exception 'bad_offer';
  end if;
  perform public.check_trade_partners(me, friend);

  if answering is not null then
    select * into answered from trade_offers o where o.id = answering for update;
    if answered.id is null or answered.status <> 'open' or answered.to_id <> me or answered.from_id <> friend then
      raise exception 'offer_gone';
    end if;
  end if;

  if (select count(*) from trade_offers where from_id = me and status = 'open') >= 5 then
    raise exception 'too_many_open';
  end if;
  if not public.can_trade(me, give) then raise exception 'you_lack'; end if;
  if not public.can_trade(friend, get) then raise exception 'they_lack'; end if;

  insert into trade_offers (from_id, to_id, give, get, counter_of)
  values (me, friend, give, get, answering)
  returning id into new_id;

  if answering is not null then
    update trade_offers set status = 'countered', closed_at = now() where id = answering;
  end if;
  return new_id;
end $$;

-- Accepts an offer sent to this player: checks everything again, moves every
-- copy both ways, and voids other open offers that can no longer happen.
create or replace function public.accept_trade(offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  o trade_offers;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  perform public.expire_trade_offers();

  select * into o from trade_offers t where t.id = offer and t.to_id = me;
  if o.id is null then raise exception 'offer_gone'; end if;
  -- One trade at a time for these two players: lock both in a fixed order.
  perform 1 from profiles where id in (o.from_id, o.to_id) order by id for update;
  select * into o from trade_offers t where t.id = offer for update;
  if o.status <> 'open' then raise exception 'offer_gone'; end if;

  perform public.check_trade_partners(me, o.from_id);
  if (select count(*) from trade_offers
      where status = 'accepted' and closed_at > now() - interval '1 day' and (from_id = me or to_id = me)) >= 5 then
    raise exception 'you_daily_limit';
  end if;
  if (select count(*) from trade_offers
      where status = 'accepted' and closed_at > now() - interval '1 day'
        and (from_id = o.from_id or to_id = o.from_id)) >= 5 then
    raise exception 'them_daily_limit';
  end if;
  if not public.can_trade(o.from_id, o.give) then raise exception 'they_lack'; end if;
  if not public.can_trade(me, o.get) then raise exception 'you_lack'; end if;

  insert into trade_moves (user_id, character_id, delta, trade_id)
  select o.from_id, h, -1, o.id from unnest(o.give) h
  union all select me, h, 1, o.id from unnest(o.give) h
  union all select me, h, -1, o.id from unnest(o.get) h
  union all select o.from_id, h, 1, o.id from unnest(o.get) h;

  update trade_offers set status = 'accepted', closed_at = now() where id = o.id;

  update trade_offers t set status = 'void', closed_at = now()
  where t.status = 'open'
    and (t.from_id in (o.from_id, me) or t.to_id in (o.from_id, me))
    and not (public.can_trade(t.from_id, t.give) and public.can_trade(t.to_id, t.get));
end $$;

-- Declines an offer sent to this player, or takes back one they sent.
create or replace function public.decline_trade(offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  update trade_offers
  set status = case when to_id = me then 'declined' else 'cancelled' end, closed_at = now()
  where id = offer and status = 'open' and (to_id = me or from_id = me);
end $$;

revoke all on function public.tradeable_copies(uuid), public.offer_trade(uuid, text[], text[], uuid),
  public.accept_trade(uuid), public.decline_trade(uuid) from public, anon;
grant execute on function public.tradeable_copies(uuid), public.offer_trade(uuid, text[], text[], uuid),
  public.accept_trade(uuid), public.decline_trade(uuid) to authenticated;
