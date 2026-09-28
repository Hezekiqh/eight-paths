-- Eight Paths: invite rewards.
--
-- When a brand-new player joins with a friend's code (typed at sign-up, or from
-- their invite link), the friend wakes a random hero for free the next time
-- they open the app. Only new accounts count (within a day of joining), each
-- player can be invited once, and a player earns at most 10 of these heroes.

create table public.referrals (
  -- Each player can only ever be invited once.
  referred_id uuid primary key references public.profiles on delete cascade,
  referrer_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  -- Set when the inviter's app has handed out the hero.
  rewarded_at timestamptz,
  check (referred_id <> referrer_id)
);

create index referrals_unrewarded on public.referrals (referrer_id) where rewarded_at is null;

alter table public.referrals enable row level security;

create policy "players see invites they sent or accepted" on public.referrals
  for select to authenticated using (referrer_id = auth.uid() or referred_id = auth.uid());

-- The new player accepts an invite right after choosing a username. Also makes
-- them friends. Refuses accounts older than a day, so existing players can't
-- trade codes for heroes.
create or replace function public.redeem_invite(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  joined timestamptz;
  them uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select created_at into joined from profiles where id = me;
  if joined is null then raise exception 'no_profile'; end if;
  if joined < now() - interval '1 day' then raise exception 'too_late'; end if;
  them := public.add_friend(code);
  insert into referrals (referred_id, referrer_id) values (me, them) on conflict do nothing;
  return them;
end $$;

-- The inviter's app calls this on launch: it returns the usernames of new
-- friends whose heroes are ready (at most 10 ever) and marks them handed out.
create or replace function public.collect_invite_rewards() returns table (friend_name text)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  room int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select greatest(0, 10 - count(*)) into room from referrals where referrer_id = me and rewarded_at is not null;
  return query
  with ready as (
    select r.referred_id from referrals r
    where r.referrer_id = me and r.rewarded_at is null
    order by r.created_at
    limit room
    for update
  ),
  marked as (
    update referrals r set rewarded_at = now() from ready
    where r.referred_id = ready.referred_id
    returning r.referred_id
  )
  select p.username as friend_name from marked m join profiles p on p.id = m.referred_id;
end $$;

grant execute on function public.redeem_invite(text), public.collect_invite_rewards() to authenticated;
revoke execute on function public.redeem_invite(text), public.collect_invite_rewards() from public, anon;
