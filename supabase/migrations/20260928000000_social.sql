-- Eight Paths: social (accounts, the Second 100, friends, rarity).
--
-- The rule this schema is built around: habits never leave the phone. The
-- server holds a public profile, which characters a player has woken, and who
-- their friends are. Nothing about quests, completions, reminders or notes.
--
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------- profiles

-- Friend codes look like "8P-7KQ2-XM4D": no 0/O/1/I/L to misread.
create or replace function public.new_friend_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text := '';
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return '8P-' || substr(code, 1, 4) || '-' || substr(code, 5, 4);
end $$;

-- Words a username may not contain. Fill it from a standard list in the
-- dashboard (Table editor → blocked_words); it starts with reserved names only.
create table public.blocked_words (word text primary key check (word = lower(word)));
insert into public.blocked_words (word) values
  ('admin'), ('moderator'), ('support'), ('eightpaths'), ('8paths'), ('official'),
  ('keeper'), ('entity'), ('chosenone');

-- The Second 100: numbers 1–100, handed out once, in sign-up order, forever.
create sequence public.founder_numbers minvalue 1 maxvalue 100 no cycle;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  founder_number int unique check (founder_number between 1 and 100),
  friend_code text not null unique default public.new_friend_code(),
  -- A snapshot the app uploads: who leads the party, who's in it, the overall level.
  leader text,
  party text[] not null default '{}',
  level int not null default 1 check (level >= 1),
  -- Consistency, numbers only. Null when the player turns sharing off.
  days_shown_up int check (days_shown_up >= 0),
  streak int check (streak >= 0),
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Usernames are unique ignoring case: "Moss" and "moss" are the same name.
create unique index profiles_username_key on public.profiles (lower(username));

-- Runs with the owner's rights: players can't read blocked_words themselves.
create or replace function public.check_username() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.blocked_words b where lower(new.username) like '%' || b.word || '%') then
    raise exception 'username_not_allowed' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger profiles_username before insert or update of username on public.profiles
  for each row execute function public.check_username();

create or replace function public.assign_founder_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    new.founder_number := nextval('public.founder_numbers');
  exception when others then
    new.founder_number := null; -- all 100 taken
  end;
  return new;
end $$;

-- Triggers run in name order: this one ("z") runs after the username check, so a
-- rejected username never uses up one of the hundred numbers.
create trigger profiles_z_founder before insert on public.profiles
  for each row execute function public.assign_founder_number();

-- ---------------------------------------------------------------- collection

-- One row per character a player has woken. `first_seen_at` is server time,
-- set when the row first arrives, so nobody can backdate a "first awakened".
create table public.collections (
  user_id uuid not null references public.profiles on delete cascade,
  character_id text not null check (character_id ~ '^[a-z0-9-]{1,32}$'),
  first_seen_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

-- ---------------------------------------------------------------- friends, blocks, reports

-- Friendship is mutual and instant: sharing your code is the invitation.
-- Stored both ways so "my friends" is one simple query.
create table public.friendships (
  user_id uuid not null references public.profiles on delete cascade,
  friend_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.blocks (
  user_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles on delete set null,
  reported_id uuid references public.profiles on delete cascade,
  reason text not null check (length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- row-level security

alter table public.blocked_words enable row level security;
alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Profiles are public to signed-in players (usernames appear on "first awakened").
create policy "profiles are visible to players" on public.profiles
  for select to authenticated using (true);
create policy "players create their own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "players update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Founder numbers, friend codes and sign-up dates can't be edited by players.
revoke update on public.profiles from authenticated;
grant update (username, leader, party, level, days_shown_up, streak, app_version, last_seen_at)
  on public.profiles to authenticated;

-- A collection is visible to its owner and their friends.
create policy "collections are visible to the owner and friends" on public.collections
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.friendships f where f.user_id = auth.uid() and f.friend_id = collections.user_id)
  );
create policy "players add to their own collection" on public.collections
  for insert to authenticated with check (user_id = auth.uid());

create policy "players see their own friendships" on public.friendships
  for select to authenticated using (user_id = auth.uid());

create policy "players manage their own blocks" on public.blocks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "players file reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------- functions the app calls

-- Add a friend by code. Refuses your own code, unknown codes and blocked players.
create or replace function public.add_friend(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  them uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select id into them from profiles where friend_code = upper(trim(code));
  if them is null then raise exception 'unknown_code'; end if;
  if them = me then raise exception 'own_code'; end if;
  if exists (select 1 from blocks where (user_id = me and blocked_id = them) or (user_id = them and blocked_id = me)) then
    raise exception 'unknown_code'; -- don't reveal a block
  end if;
  insert into friendships (user_id, friend_id) values (me, them), (them, me) on conflict do nothing;
  return them;
end $$;

create or replace function public.remove_friend(friend uuid) returns void
language sql security definer set search_path = public as $$
  delete from friendships
  where (user_id = auth.uid() and friend_id = friend) or (user_id = friend and friend_id = auth.uid());
$$;

-- Blocking also ends the friendship.
create or replace function public.block_player(player uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into blocks (user_id, blocked_id) values (auth.uid(), player) on conflict do nothing;
  perform public.remove_friend(player);
end $$;

-- Whether a username is free and allowed, checked before sign-up finishes.
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select name ~ '^[A-Za-z0-9_]{3,16}$'
    and not exists (select 1 from profiles where lower(username) = lower(name))
    and not exists (select 1 from blocked_words b where lower(name) like '%' || b.word || '%');
$$;

-- For every character: how many players have woken them, out of how many
-- players, and who woke them first. Aggregates only; no one's collection leaks.
create or replace function public.character_stats()
returns table (character_id text, woken_by int, players int, first_username text, first_at timestamptz)
language sql stable security definer set search_path = public as $$
  with totals as (select count(*)::int as n from profiles),
  firsts as (
    select distinct on (c.character_id) c.character_id, p.username, c.first_seen_at
    from collections c join profiles p on p.id = c.user_id
    order by c.character_id, c.first_seen_at, c.user_id
  )
  select c.character_id, count(*)::int, (select n from totals), f.username, f.first_seen_at
  from collections c join firsts f using (character_id)
  group by c.character_id, f.username, f.first_seen_at;
$$;

revoke all on function public.character_stats() from public, anon;
grant execute on function public.character_stats() to authenticated;
grant execute on function public.add_friend(text), public.remove_friend(uuid), public.block_player(uuid), public.username_available(text) to authenticated;
revoke execute on function public.add_friend(text), public.remove_friend(uuid), public.block_player(uuid), public.username_available(text) from public, anon;
