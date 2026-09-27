# Eight Paths — POC Spec

Sep 26, 2026 · @Hezekiah Hopkins

## Overview

Eight Paths is an iOS habit tracker dressed as an RPG: every habit is a recurring quest in one of eight wellness dimensions, and a daily radar chart shows the player's growth. Goal: a working proof of concept on TestFlight by the end of this weekend.

| Decision | Locked choice |
| --- | --- |
| Class selection | Player picks one class at onboarding; no quiz |
| Quest dimensions | Each quest belongs to exactly one dimension |
| Quest type | Recurring habits, defined once with a repeat schedule |
| XP | Flat 10 XP per completion; +25% for quests in the player's class dimension |
| Levels | Per-dimension levels plus an overall level, escalating curve |
| Neglect | Gentle: idle dimensions dim on the radar; nothing is lost |
| Streaks | One completion in a dimension keeps that dimension's streak alive; per-habit streaks tracked too |
| Rest tokens | Protect a streak on an off day |
| Starting point | Every dimension starts at level 5 |
| Art | Clean dark neon; SF Symbols for icons; no image assets |
| Notifications | One local evening nudge |

## Classes

Each of the eight wellness dimensions maps to one class. The player's class sets their accent colour and gives +25% XP in that dimension; all eight dimensions are always tracked.

| Dimension | Class | SF Symbol (suggested) | Starter habits (4 presets) |
| --- | --- | --- | --- |
| Physical | Warrior | `figure.strengthtraining.traditional` | Move 30 min · 7+ hrs sleep · Drink water · Take the stairs |
| Financial | Noble | `crown.fill` | Log today's spending · No impulse buys · Check accounts · Pack lunch |
| Intellectual | Mage | `book.fill` | Read 20 min · Language practice · Learn something new · Listen to a lecture |
| Spiritual | Cleric | `sparkles` | Prayer or worship · Read scripture · Reflect on values · Quiet time |
| Emotional | Monk | `leaf.fill` | Journal feelings · Gratitude list · Be kind to yourself · Talk to someone you trust |
| Social | Bard | `music.note` | Message a friend · Call family · Join a group activity · Volunteer |
| Occupational | Artificer | `hammer.fill` | Deep work block · Learn a work skill · Reach out to a contact · Ship something |
| Environmental | Ranger | `tree.fill` | Time outdoors · Walk or bike instead of drive · Tidy your space · Recycle |

Monk vs Cleric: Cleric covers meaning and belief; Monk covers managing feelings. Starter habits draw on the UC Davis Eight Dimensions of Wellness framework.

## Data model

Four local entities, no backend. XP is stored per completion so the radar can be filtered by any time window.

```ts
type Dimension =
  | 'physical' | 'financial' | 'intellectual' | 'spiritual'
  | 'emotional' | 'social' | 'occupational' | 'environmental';

type Player = {
  name: string;
  classDimension: Dimension;      // chosen at onboarding
  restTokens: number;             // start 1, max 3
  onboardedAt: string;            // ISO date
  tutorialComplete: boolean;
  notificationTime: string;       // '20:00'
};

type Quest = {
  id: string;
  title: string;
  dimension: Dimension;           // exactly one
  repeatDays: number[];           // 0-6, Sun-Sat; all 7 = daily
  active: boolean;
  createdAt: string;
};

type Completion = {
  id: string;
  questId: string;
  dimension: Dimension;           // denormalised for fast radar queries
  date: string;                   // 'YYYY-MM-DD', local
  xp: number;                     // 10, or 13 with class bonus
};

type RestDay = { date: string; dimension: Dimension | 'all' };
```

Derived, never stored: dimension XP totals, levels, streaks, and radar values. Compute them from `Completion` with selectors.

## Progression

Every completion is worth 10 XP; quests in the player's class dimension are worth 13 (10 × 1.25, rounded up). Levels escalate, streaks forgive, and nothing is ever taken away.

**Dimension levels**

- Every dimension starts at level 5 with 0 XP.
- XP needed to go from level L to L+1 = 20 × L. Level 5 → 6 takes 100 XP (10 completions); level 10 → 11 takes 200 XP.
- The dimension XP bar fills toward the next level and resets on level-up.

```latex
\text{XP}_{L \to L+1} = 20 \times L
```

**Overall level**

- Driven by total XP across all eight dimensions, on the same curve scaled ×8 (level 5 → 6 takes 800 XP). Starts at level 5.
- The overall bar updates silently; players see it on the Character Sheet, never animated on completion.

**Streaks**

- Dimension streak: consecutive days with at least one completion in that dimension.
- Habit streak: consecutive scheduled days on which that quest was completed (unscheduled days don't break it).
- Streaks are shown on the Character Sheet and on each quest card.

**Rest tokens**

- Start with 1, hold at most 3.
- Earn 1 for every 7-day run with at least one completion anywhere.
- On a day with zero completions, a token is spent automatically at midnight and every streak survives. No token = streaks reset to 0.

**Dimming (neglect)**

- No completion in a dimension for 3 days → its radar label and axis dim to 50% opacity.
- 7 days → 25% opacity. One completion restores full brightness. Levels and XP are never reduced.

## Onboarding

Three screens and one tutorial quest; a player who accepts every default reaches the game in four taps. Every dimension starts at level 5 so the radar is never empty.

1. **Welcome.** App name, one-line pitch, name field, Continue.
2. **Choose your class.** A 2 × 4 grid of the eight class cards (symbol, class name, dimension). One tap selects; Continue.
3. **Choose your starting quests.** One scrolling screen with eight collapsed rows, one per dimension. Each row shows its first preset habit, pre-checked. Tapping a row expands it to all four presets. Untick anything unwanted, then Start.
4. **Tutorial quest.** The Quest Board opens with a single pinned quest, "Begin your journey", in the player's class dimension. Completing it plays the full XP bar animation and marks the tutorial done.
5. **Wrap-up card.** "These quests are just a start: edit, add, or remove them anytime." Then the system notification permission prompt, never before this point.

No skip button: step 3 already has sensible defaults.

## Screens

Three tabs plus one modal. The radar is the first thing the player sees every day.

**Tab 1: Today (home)**

- Top half: the octagonal radar, eight axes labelled with class name and symbol, filled in the player's class colour.
- Filter: segmented control, Week (default) · Month · All-time.
- Week and Month plot XP earned in the window per dimension, with the previous window drawn behind as a faint ghost layer. The outer ring = the larger of 70 XP (Week) / 300 XP (Month) or the top dimension, so one completion never fills the chart.
- All-time plots each dimension's share of total XP, scaled so the largest share touches the outer ring: it shows how the player leans, not how much. No ghost layer. With no XP yet, draw an even octagon.
- Bottom half: today's quests (those scheduled for today), grouped by dimension.

**Quest completion beat**

- Tap a quest: haptic, checkmark, and a banner slides up showing that dimension's XP bar filling by 10 (or 13) XP.
- If it crosses a level, the bar maxes out, flashes, shows "Mage — Level 7", and restarts from the carry-over XP.
- The radar redraws with the new value. The overall bar is not shown.
- Tapping a completed quest again undoes it (same day only).

**Tab 2: Character**

- Class, overall level, overall XP bar, rest tokens (0–3).
- Eight rows: symbol, class name, level, XP bar, dimension streak. Dimmed dimensions show dimmed here too.
- Settings row: evening reminder time, change class.

**Tab 3: Quests**

- All quests grouped by dimension, each with its habit streak and schedule. Swipe to archive; + to add.

**Modal: Quest editor**

- Title, dimension (one of eight), repeat days (Daily / Weekdays / pick days). Save.

## Tech stack and style

Expo + TypeScript, fully local, no entitlements: nothing here should slow App Store review.

| Need | Choice |
| --- | --- |
| Framework | Current Expo SDK, TypeScript, Expo Router (tabs) |
| State + storage | Zustand with `persist` middleware over AsyncStorage |
| Radar chart | Hand-rolled with `react-native-svg` (no chart library) |
| Animation | `react-native-reanimated` for XP bars and radar redraw |
| Icons | `expo-symbols` (SF Symbols) |
| Feedback | `expo-haptics` |
| Notifications | `expo-notifications`, one local daily trigger at the player's chosen time (default 20:00); no push, no server |
| Build | EAS Build → TestFlight |

**Notifications.** Ask permission only on the onboarding wrap-up card. Copy is supportive, not guilt-driven, e.g. "Your quests are waiting — one small step counts." Skip the nudge on days the player already completed a quest.

**Visual style.** Dark background (#0F1117), teal radar grid lines (#1FA88A), rounded cards, system font. One colour per class:

| Class | Colour |
| --- | --- |
| Warrior | #FF4D5E |
| Noble | #FFC940 |
| Mage | #8B5CF6 |
| Cleric | #F0E6C8 |
| Monk | #2DD4BF |
| Bard | #FF4FD8 |
| Artificer | #FF8A3D |
| Ranger | #4ADE80 |

**Support link.** Character → Settings includes a "Get support" row linking to the 988 Suicide & Crisis Lifeline (call or text 988, US). The app makes no medical or clinical claims.

## Progress 1.1

The app should mirror consistent effort honestly and make progress visible early. These rules replace the matching 1.0 rules above.

| Area | 1.0 | 1.1 |
| --- | --- | --- |
| Level curve | 20 × L per level (L5→6 = 100 XP) | 30 at L5, +10 per level, capped at 150 (L5→6 = 30 XP, three completions). Never steeper than 1.0, so recomputed saves only gain levels |
| Overall level | Same curve × 8 (800 XP to L6) | Same curve × 4 (120 XP to L6) |
| XP padding | Every completion full XP | First 3 completions per Path per day earn full XP; later ones earn half |
| Headline number | XP on the radar | **Consistency**: due quest-days done ÷ due, over 7 and 30 days, compared with the window before. Rest days excused; today counts only once done |
| Dimming | Days since last completion | **Missed scheduled days** since last completion (3 → 50%, 7 → 25%). Paths with no quests never dim |
| Path streaks | Any day without a completion breaks it | Only a day with a quest due, nothing done in the Path and no rest token breaks it. Best streak is kept |
| Showing up | Not tracked | Lifetime **days shown up**, a showing-up streak (current and best), milestones at 1, 3, 7, 14, 21, 30, 50, 75, 100… days, and a banner for a new record streak |
| History | Radar only | **Journey** tab: stat tiles, a 17-week heatmap, last 30 days vs the 30 before, milestones |
| Late logging | Same-day undo only | Yesterday can be logged or undone until noon; the rest-token ledger is rebuilt so a spent token is refunded |
| Archiving | `active: false` | Also stamps `archivedAt`, so past due days still count toward consistency |
| Backup | None | Character → Back up progress (share sheet, JSON). Restore by pasting, from Character or onboarding ("New phone?") |

## Later (not in the POC)

Parked so they aren't lost; none of these block this weekend's build.

- **Multiclassing:** a second dimension past a level threshold unlocks a hybrid title (Noble + Cleric = Templar, Warrior + Mage = Spellblade).
- **Weekly boss battles:** beat a boss by hitting a target spread across dimensions.
- **Social layer:** friends, party quests, and radar comparisons like the two-game overlay.
- **Cosmetic gear and titles:** unlocked by levels and streaks.
- **Cloud sync and accounts:** Supabase backend so progress survives a new phone.
- **Per-quest reminders:** beyond the single evening nudge.
- **Widgets:** the radar on the home screen.

## Claude Code kickoff prompt

Export this doc as Markdown, save it as `SPEC.md` in an empty folder, then paste the prompt below into Claude Code.

```text
Read SPEC.md. It is the full spec for Eight Paths, an Expo + TypeScript iOS
habit tracker styled as an RPG. Build it as a working POC I can put on
TestFlight this weekend.

Rules:
- Follow SPEC.md exactly. If something is ambiguous, pick the simplest option
  and list your assumption at the end; don't ask mid-build.
- Fully local: Zustand + AsyncStorage. No backend, no auth, no entitlements.
- Keep all game rules (XP, levels, streaks, rest tokens, dimming) as pure
  functions in /src/game with unit tests. UI reads from selectors only.
- Radar chart is hand-rolled with react-native-svg.

Build in this order, and stop after each milestone so I can run it:
1. Scaffold: Expo Router tabs (Today, Character, Quests), theme, class data.
2. Store + game logic + tests (XP 10/13, level curve 20 x L, start at level 5,
   streaks, rest tokens, dimming).
3. Onboarding: welcome, class grid, starter-quest picker, tutorial quest,
   wrap-up card with notification permission.
4. Today tab: radar with Week/Month/All-time filter and ghost layer, today's
   quests, completion banner with animated dimension XP bar and level-up.
5. Character and Quests tabs, quest editor modal, settings, Get support row.
6. Local evening notification, app icon placeholder, EAS config for TestFlight.
```
