# Eight Paths: Social (technical plan)

Sep 28, 2026 · status: built behind a switch, not shipped

## The rule

**Habits never leave the phone.** The server holds a public profile, which characters a player has woken, and who their friends are. Never quest names, completions, reminders or notes. The game keeps working fully without an account; social is optional.

## What's in the first social update

| Feature | What the player sees |
| --- | --- |
| Accounts | Sign in with Apple (identifier only: no name, no email), then choose a username |
| The Second 100 | The first 100 accounts get a permanent founder number: "SECOND 100 · #037" |
| Friends | Share a friend code or link (`8P-XXXX-XXXX`); adding is instant and mutual. See each other's level, party leader, streak (if shared) and woken heroes |
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

Functions: `username_available`, `add_friend(code)`, `remove_friend`, `block_player` (also unfriends), `character_stats()` (aggregate counts and the first waker only; no one's collection leaks).

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
