# Eight Paths: Social (technical plan)

Sep 28, 2026 · status: built behind a switch, not shipped

## The rule

**Habits never leave the phone.** The server holds a public profile, which characters a player has woken, and who their friends are. Never quest names, completions, reminders or notes. The game keeps working fully without an account; social is optional.

## What's in the first social update

| Feature | What the player sees |
| --- | --- |
| Accounts | Sign in with Apple (identifier only: no name, no email), then choose a username |
| The Second 100 | The first 100 accounts get a permanent founder number: "SECOND 100 · #037" |
| Friends | Search by username, or share a friend code or link (`8P-XXXX-XXXX`); adding is instant and mutual. See each other's level, party leader, streak (if shared) and woken heroes |
| Rarity | On every character's sheet: "Woken by 3% of players · first: @username" |
| Safety | Unique usernames, a blocked-words list, remove, block and report; delete account in the app |

Not in this update: leaderboards (the server can't verify habits, so they'd reward cheating), chat, co-op events, custom avatars.

## Architecture

- **Supabase** (Postgres, Auth, Edge Functions). Project: `orhrdxlznreifplgkzpw`.
- **The phone is the source of truth.** A background hook (`useSocialSync`) uploads the profile snapshot and newly woken characters 1.5 s after anything changes. Offline failures are silent; the next change retries.
- **Switch:** social only exists in builds made with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`.env.local` for development, the EAS build environment for TestFlight). Without them the app is unchanged: no Friends row, no network calls.
- **Session storage:** `expo-sqlite`'s localStorage, as the Expo Supabase guide recommends.

## Database (`supabase/migrations/20260928000000_social.sql`)

| Table | Holds | Who can read / write |
| --- | --- | --- |
| `profiles` | id, username (3–16, letters/numbers/_), founder_number, friend_code, leader, party, level, days_shown_up, streak (null when not shared), app_version, created_at, last_seen_at | Readable by signed-in players; each player writes only their own row and only the snapshot columns (never founder number, code or dates) |
| `collections` | user_id, character_id, first_seen_at (server time) | The owner and their friends read; owner inserts |
| `friendships` | user_id, friend_id (stored both ways) | Own rows; changed only through functions |
| `blocks`, `reports` | who blocked or reported whom, and why | Own blocks; reports are write-only |
| `blocked_words` | words no username may contain | Server only; seeded with reserved names. **Add a standard offensive-words list in the Table Editor** |

Functions: `username_available`, `add_friend(code)`, `search_players(query)` and `add_friend_by_id` (`20261003000000_friend_search.sql`; blocked players never show in a search), `remove_friend`, `block_player` (also unfriends), `character_stats()` (aggregate counts and the first waker only; no one's collection leaks).

Details that matter:
- Founder numbers come from a sequence capped at 100, handed out by a trigger that runs **after** the username check, so rejected names never burn a number. Deleted accounts don't return their number.
- "First awakened" uses the server's clock, so it can't be backdated. Players who join early get credit for characters they already had; that's a founder's perk.
- Blocks are hidden: adding a blocked player's code says "no one has that code".

## Account deletion (`supabase/functions/delete-account`)

Apple requires in-app deletion for apps with accounts, including revoking the Sign in with Apple token. The app asks the player to confirm with Apple (which gives a fresh authorization code), then calls the function, which revokes the token with Apple and deletes the auth user; everything else cascades. Needs Apple secrets (below); without them it still deletes, and only skips the revoke.

## Setup checklist

**You (the dashboard):**
1. Confirm this project is only for Eight Paths (it showed 10 existing users). If not, create a new one and send me its URL.
2. Send the **publishable key** (Project Settings → API Keys, `sb_publishable_…`). Never the secret or service_role key.
3. SQL Editor → New query → paste the migration → Run.
4. Authentication → Sign In / Providers → Apple → on; Client IDs `com.hezekiahhopkins.eightpaths,host.exp.Exponent`; no secret; Save.
5. Table Editor → `blocked_words` → import an offensive-words list.
6. Later, for deletion: Apple Developer → Keys → new key with **Sign in with Apple** → download the `.p8`; note the Key ID and Team ID. Then in Terminal: `npx supabase login`, `npx supabase link --project-ref orhrdxlznreifplgkzpw`, set the four `APPLE_*` secrets, `npx supabase functions deploy delete-account`.

**Me (the code), once the key arrives:**
1. Test sign-up, username, founder number, friends (two simulator accounts), rarity and deletion in Expo Go.
2. Add the two public values to the EAS build environment.
3. Make sure the App ID has the Sign in with Apple capability (EAS normally syncs it on the next build).

**Before it ships:**
- Update `docs/privacy.html` and the App Store privacy label: an identifier (user ID), username, and "other user content" (collection, party, level, optional streak), linked to the user, not used for tracking.
- App Review notes: how to sign in (Sign in with Apple, no demo account needed), where Delete Account is, how to report and block.
- Change "No account" in marketing to "No account needed".
- Ship after 1.0 is approved, as its own version.

---

# Hero trades (Sep 30, 2026 · T1–T3 built, not yet tested on a device)

## The rule

**Heroes can be traded between friends, one copy at a time. The server decides who holds what.** Level-up draws can repeat, so players often hold several copies of a hero; a trade moves copies. A copy you trade away is gone, and the one you receive hatches for you. A hero's strength still comes from its owner's real Path level, so trading never makes anyone stronger. It only changes who is in your collection.

## What the player sees

| Step | What happens |
| --- | --- |
| Offer | On a friend's profile, **Trade**: choose 1–5 copies of your heroes and 1–5 of theirs (one-for-one, many-for-one, or one-for-many), then send |
| Inbox | The friend sees it on the Social tab: **Accept**, **Decline** or **Counter** (a counter sends a new offer back and closes the old one) |
| Accept | Both players see a "departs / arrives" animation. If you gave your last copy, the hero leaves your world and your party; the copy you got hatches like a cocoon |
| Expiry | Offers expire after 3 days, or right away if any copy in them has changed hands |

**Can't be traded:** each Path's core companion (the starting eight), copies still waiting to hatch, and your last copy of the hero walking the Other World (pick someone else first).

## Stopping duplicates (built in T1)

The problem: trade Dessa away, restore an older backup, and have her back.

1. **The server keeps the ledger.** `collections` records how many copies of each hero a player has woken themselves (`copies`, which can only go up) and when they first woke one (`woken_at`). `trade_moves` records every copy that moved in (+1) or out (−1) by trade, and only server functions can write it. A player holds `copies + their trade moves`.
2. **The phone replays trades by id.** The save keeps the ids of the trade moves it has applied. When a signed-in player opens the app, or brings it back to the front, the phone fetches its moves and applies any it hasn't seen. A backup made before a trade doesn't include that trade's id, so the trade is replayed and the copy leaves again.
3. **The phone reports only copies it earned.** The phone tells the server how many copies it has woken itself (copies held, minus trades, minus copies still waiting to hatch). The server only raises those counts. So restoring a backup can't bring a traded copy back in either direction.
4. **Trades happen in one database function**, `accept_trade(offer)`. It locks both players' rows, checks that each player still holds every copy, writes the moves, and cancels other open offers that include those copies. It either completes fully or not at all.

**The limit, stated honestly:** the server still can't prove a hero was really woken, because it never sees habits. Trading stops the same account from duplicating a hero. It doesn't stop someone who edits their save and makes a second Apple ID. The limits below make that tedious rather than impossible:
- Both accounts must be at least 7 days old and friends for at least 24 hours.
- A copy received by trade can't be traded again for 7 days.
- At most 5 accepted trades per player per day.
- Every trade is kept: accepted offers in `trade_offers`, and each copy moved in `trade_moves`, so abuse can be reviewed and reversed.

## Knock-on effects

- **Rarity ("Woken by 3%")** and **"first awakened"** count only heroes a player woke themselves, by `woken_at`, so trading never changes who woke a hero first. *(Built.)*
- **The collection leaderboard** and **a friend's collection** show heroes currently held. *(Built.)*
- **Party and Other World:** when your last copy of a hero leaves, their Path's core companion steps back into the party. The Other World hero falls back with the party.
- **Drawing a hero again after trading it away** is allowed. It's a fresh copy you woke.
- **Invite rewards** already only give heroes you don't hold.
- **Privacy:** nothing new leaves the phone. Collections were already on the server; now they include copy counts, plus which copies changed hands.

## Database

| Table / function | Purpose | Milestone |
| --- | --- | --- |
| `collections` + `copies`, `woken_at` | Copies a player woke themselves, and when they first woke one | T1 |
| `trade_moves` | Every copy moved in or out by trade; players can read their own, only functions write | T1 |
| `report_collection(heroes)` | The phone reports copies it woke; counts only go up; returns how many heroes were newly woken | T1 |
| `hero_holdings(player)` | What a player holds now; visible to them and their friends | T1 |
| `character_stats`, `hero_points`, `leaderboard` | Updated for `woken_at` and holdings | T1 |
| `trade_offers` | Every offer, and the trade log: open, accepted, declined, cancelled (taken back), countered, expired, void | T2 |
| `offer_trade(friend, give, get, answering)` | Sends an offer; with `answering`, counters an offer the friend sent and closes it. Checks friendship, account and friendship age, open-offer limit, and both sides' tradeable copies | T2 |
| `accept_trade(offer)` | Checks again (plus 5 trades a day), writes all the moves in one step, voids other open offers that can no longer happen | T2 |
| `decline_trade(offer)` | Declines an offer received, or takes back one sent | T2 |
| `tradeable_copies(player)` | What a player or their friend could trade now (not the core eight, not copies received in the last 7 days) | T2 |

Builds from before T1 can still insert a plain "woke one copy" row, but can't set counts or write trade moves.

## Milestones

| | Scope |
| --- | --- |
| **T1 · Ownership** ✅ | Migration `20260930010000_hero_ownership.sql`; the save keeps `traded` and `tradeMoves` (save v11); `applyTradeMoves` / `earnedCopies` (`src/store/trades.ts`); sync reports copies and replays trade moves on launch and when the app returns to the front; friend collections use `hero_holdings`. **Run the migration in the SQL Editor before the next social build.** |
| **T2 · Offers** ✅ | Migration `20260930020000_trades.sql`; **Trade heroes** on a friend's profile opens the trade screen (`social/trade/[id]`: tap a hero to add copies, up to 5 a side); the Social tab's **Trades** inbox has Accept / Counter / Decline and Take back; offers and trades refresh when the tab opens and when the app returns to the front; errors come back as plain words (`src/social/trade.ts`). A test keeps the server's core-eight list in step with the app. **Run both trade migrations in the SQL Editor, in order, before the next social build.** |
| **T3 · Feel** ✅ | **Trade moment** (`trade-moment`): after a trade, both players see the heroes they gave walk off and cocoons for the ones they got drop in, then the arrivals hatch through the usual reveal (the hatch queue waits for it). It plays once per trade per phone, only for trades from the last 3 days; which trades were shown is kept apart from the game save (`src/social/notices.ts`), so a restored backup replays the trade but not the moment. **New offers** light a dot on the Social tab until the tab is opened (in-app only; no push notifications). **Recent trades** (last 20) on the Friends and account screen. |
