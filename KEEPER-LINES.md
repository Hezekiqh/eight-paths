# The Keeper's lines (notifications)

Sep 28, 2026 · status: **approved Sep 28** (all lines kept; the light is a lantern).

Every notification's title is **The Keeper**. Lines go into `src/notifications/keeper.ts` exactly as approved, each with its id so opens can be counted per line (NOTIFICATIONS.md, N5).

**Voice:** the ancient skeleton caretaker from the intro. Patient, warm, a little wry. He knows who the player was and won't say it, so there are occasional hints, never reveals. He never shames, never invents stakes, and never mentions Premium.

**Fill-ins:** `{name}` player name · `{streak}` showing-up streak · `{path}` class name (Warrior, Mage…) · `{level}` the next level · `{quest}` a quest title · `{n}` a count · `{quests}` up to 2 quest titles · `{milestone}` the next days-shown-up milestone · `{hero}` / `{hero2}` owned heroes · `{sleeping}` how many of the 200 still sleep · `{left}` quests left today ("2 quests").
A line whose fill-ins aren't available (no heroes yet, no quests due) is skipped.

## A · Usual time (plain)

| id | line |
|---|---|
| a1 | It's about your usual hour, {name}. The Archive is quiet. Shall we? |
| a2 | One small step today. That's all I've ever asked of you. |
| a3 | Your quests are laid out on the table. I didn't touch them. Much. |
| a4 | I've put the kettle on. Come walk a Path while it boils. |
| a5 | The lantern is burning low and your quests are still waiting, {name}. |
| a6 | Five hundred years of sleep. You can spare five minutes for a quest. |
| a7 | You used to be very good at this. The habits, I mean. Obviously. |
| a8 | I've kept records for a very long time. Today's page is still blank. |
| a9 | The party is restless. They won't say it, but they're waiting on you. |
| a10 | No grand quest today. Just a small one. I'll be here. |

## B · Usual time (personal, only when true)

Picked in this order: streak, close level-up, close cocoon, quests left, milestone. Falls back to A.

| id | when | line |
|---|---|---|
| b1 | streak ≥ 3 | {streak} days. I've been counting. One quest keeps the count going. |
| b2 | streak ≥ 7 | {streak} days in a row. Few of the 200 could say that. Keep it? |
| b3 | streak ≥ 3 | Your {streak}-day streak is safe until midnight. Only until midnight. |
| b4 | 1 quest to a level | One quest from {path} level {level}. I'd like to see that before bed. |
| b5 | 1 quest to a level | {quest} would lift your {path} to level {level}. Just saying. |
| b6 | 1–2 quests to a level | The {path} Path is one step from level {level}. So close I can hear it. |
| b7 | next draw ≤ 1 level away | Something is stirring in the {path} silk. One more level and it wakes. |
| b8 | next draw ≤ 1 level away | A cocoon on the {path} Path is warm tonight. It won't hatch by itself. |
| b9 | next draw ≤ 1 level away | I've heard tapping from the {path} cocoon. It's waiting for you. |
| b10 | 1 quest left | {quest} is still waiting for you today. It's a patient quest, but still. |
| b11 | 2+ quests left | {n} quests left today: {quests}. Start with the easy one. |
| b12 | 1 quest left | Just {quest} today. I'll mark it in the records myself. |
| b13 | milestone ≤ 3 days away | {n} more days to {milestone} days shown up. I've set aside a page for it. |
| b14 | milestone is tomorrow | Tomorrow would make {milestone} days. Today has to happen first. |

## C · Last call, 10:30 PM

Only when the streak is ≥ 3, today isn't played, and a quest is due (rest tokens save habits, never the day). c5 only when no tokens are left. Time-sensitive.

| id | line |
|---|---|
| c1 | {streak} days. Don't let the lantern go out tonight. |
| c2 | It's late, {name}, and your {streak}-day streak ends at midnight. One quest. |
| c3 | I don't usually knock this late. {streak} days is worth knocking for. |
| c4 | An hour and a half until midnight. Your {streak} days are still yours to keep. |
| c5 | No rest tokens left, {name}. One quest before midnight keeps all {streak} days. |
| c6 | The lantern is nearly out. So is today. {streak} days, one quest. |

## L · Quests left, during the day

Only when at least one quest is still left that day, and only for today and tomorrow (re-planned every time the app opens or a quest is done). Set in Settings under "Quests left": off, noon and 9 PM, or check-ins every 4, 2 or 1 hours from noon until 9 PM. Skipped within 30 minutes of the usual call. `{left}` is "1 quest" or "3 quests".

**l · Half time, noon**

| id | line |
|---|---|
| l1 | Half time, {name}. {left} left today. |
| l2 | The day's half gone. {left} still on the table. |
| l3 | The noon bell just rang. {left} to go before midnight. |

**m · Check-ins, every 1, 2 or 4 hours after noon**

| id | line |
|---|---|
| m1 | {left} left today. One at a time. |
| m2 | Just checking in. {left} still waiting on you. |
| m3 | {left} to go, {name}. The day isn't over yet. |
| m4 | Still {left} on the board. Start with the smallest. |

**n · Last call, 9 PM**

| id | line |
|---|---|
| n1 | Last call, {name}. {left} left before midnight. |
| n2 | Nine o'clock. {left} still open, and three hours on the clock. |
| n3 | The lantern's burning down. {left} left today. |

## D · The day after a miss (+1)

A rest token saved a missed habit's streak:

| id | line |
|---|---|
| d1 | You rested yesterday. A rest token kept your streak. The party saved you a seat. |
| d2 | Yesterday slipped by. I spent a rest token for you. You're welcome. |
| d3 | Your streak survived the night on a rest token. Let's not make a habit of it. |
| d4 | Everyone needs rest. Even you. Especially you. Your streak is safe. Come back? |

No token, so the streak reset (the truth, then what's kept):

| id | line |
|---|---|
| d5 | Your streak reset last night. Nothing else did. Your levels and heroes are all still here. |
| d6 | A streak is just a number, {name}. I've watched numbers rise and fall for centuries. Start again with me? |
| d7 | Day one again. I've always liked day one. It has the most in front of it. |

## E · Days away, naming a hero (+2 to +4)

A different owned hero each day.

| id | line |
|---|---|
| e1 | {hero} asked about you today. I told them you'd be back. |
| e2 | {hero} has been pacing the Archive. I think they miss the road. |
| e3 | {hero} sat by your quest board all afternoon. Won't say why. |
| e4 | Three days. {hero} thinks it's their fault. I told them it isn't. Come tell them yourself? |
| e5 | {hero} and {hero2} are arguing over which Path you'll walk next. Settle it? |
| e6 | The Archive is too quiet without you. Even {hero} has stopped talking. |

## F · The cocoon hook (+5)

| id | line |
|---|---|
| f1 | Something is stirring in the silk. It won't wake without you. |
| f2 | One of the cocoons moved today. I haven't seen that in a hundred years. |
| f3 | I heard a heartbeat in the {path} silk. Someone is close to waking. |

## G · The vigil (+7)

| id | line |
|---|---|
| g1 | A week. I haven't stopped waiting. The lantern stays lit. |
| g2 | Seven days. I waited five hundred years for you to wake. I can wait a little longer. |
| g3 | I'll keep your quests dusted, {name}. However long it takes. |

## H · Story drops (+10, +14, +21, +28, in this order)

Spoiler-safe teases that fit LORE.md (the Keeper's secret, the old friend, the drink) without revealing anything.

| id | line |
|---|---|
| h1 | {sleeping} still sleep. Every one of them is waiting for someone. So am I. |
| h2 | Found an old page in the Archive today. Your handwriting, I think. Strange. |
| h3 | Eight kings saved the world, they say. I was there. Come back and I'll tell you what they don't say. |
| h4 | I dreamed of an old friend last night. We were sharing a drink. Come back and I'll tell you the rest. |
| h5 | A name came back to me today. Not mine. Yours. I'll keep it until you're ready. |
| h6 | Someone in the silk said your name in their sleep. I'd like to know how they knew it. |

## I · Weekly, forever

Rotates, and no line repeats until all have been used.

| id | line |
|---|---|
| i1 | Still here. Still waiting. The kettle's still warm. |
| i2 | Another week in the Archive. I've read every scroll twice. Come give me something new to write. |
| i3 | Your quests are right where you left them. I haven't moved a thing. |
| i4 | No lecture, no guilt. Just one quest, whenever you're ready. |
| i5 | I kept watch for five hundred years. Weeks are nothing. But I do miss you. |
| i6 | {hero} still sleeps by your pack. They're sure you'll come back. So am I. |
| i7 | The world outside keeps turning. The Archive doesn't. It waits for you. |
| i8 | Some things take a long time to wake. I would know. Come back when you're ready. |

## J · In-app permission card (not notifications)

| id | when | title | body | buttons |
|---|---|---|---|---|
| j1 | after the first completed quest | May I come find you? | Tomorrow, around this time, I'll knock. Once. Unless your streak is on the line. | Yes, find me · Not now |
| j2 | re-ask after a hatch | Someone new has woken. | Want me to tell you when the next one stirs? | Yes · Not now |
| j3 | re-ask after a 7-day streak | Seven days. | Let me help you keep it. May I knock in the evenings? | Yes · Not now |

## K · In the Archive (in-world talk, not notifications)

Oct 1, 2026 · status: **draft**. Lives in `src/world/keeper-talk.ts`. When you talk to the Keeper, he adds **one remark** after his greeting, picked from the groups below (same pick all day, a new one tomorrow). He also gets two questions at the top of his menu: **"How am I doing?"** (k-habit line, then k-strong and k-weak if they apply) and **"Who should I bring along?"** (k-party).

Extra fill-ins: `{best}` best-ever streak · `{now}` the hero on that Path right now · `{nowLevel}` their level. `{level}` here is a hero's own level.

**k-habit** · checked in this order, first match wins

| id | when | line |
|---|---|---|
| k1 | streak ≥ 14 | {streak} days in a row, {name}. I've stopped pretending I'm not impressed. |
| k2 | streak ≥ 14 | {streak} days. I had to start a second page just for your streak. I'm not complaining. |
| k3 | streak ≥ 7 | {streak} days running. That's not luck any more, {name}. That's a habit. |
| k4 | streak ≥ 7 | {streak} days. The party has started setting their clocks by you. |
| k5 | streak ≥ 3 | {streak} days in a row. I've started leaving the lantern on for you. |
| k6 | streak ≥ 3 | {streak} days. Small, steady, real. That's how all the good things start. |
| k7 | streak < 3, best ≥ 7 | Your best run was {best} days. You've done it before. That was the hard part. |
| k8 | this week ≥ 80% kept | You've kept nearly everything you set yourself this week. The records are getting heavy. I don't mind. |
| k9 | better than last week | Better than last week. Not by a lot. By enough. |
| k10 | worse than last week | A quieter week than the last. Weeks are like that. The next one hasn't been written yet. |
| k11 | otherwise | Today's page is still open, {name}. One small thing, and I'll write it down. |

**k-strong** · the party's highest level, only when one hero is clearly ahead (level 2+, no tie)

| id | line |
|---|---|
| k12 | {hero} is carrying the {path} Path. Level {level}. Don't tell them I said so, it'll go straight to their head. |
| k13 | {hero}'s at level {level} now. They walked past me this morning like they owned the Archive. |
| k14 | Level {level}, {hero}. Your {path} habits are showing, {name}. In the good way. |

**k-weak** · a dusty Path first (3+ quests due in 30 days, under half done); otherwise the lowest level, when it's 2+ behind the highest

| id | when | line |
|---|---|---|
| k15 | dusty Path | The {path} Path has gone a bit dusty. {hero} hasn't complained. Much. |
| k16 | dusty Path | {hero} keeps asking when the {path} Path is getting walked again. I said I'd pass it on. Consider it passed. |
| k17 | lowest level | {hero} is still level {level}. A {path} quest or two would do them good. They're keener than they look. |
| k18 | lowest level | {hero}'s the quiet one at level {level}. Give the {path} Path some time and watch them surprise you. |

**k-party** · "Who should I bring along?"

| id | when | lines |
|---|---|---|
| k19 | a bench hero outlevels their Path's walker | {hero} has more miles in them than {now} right now. Level {level} to {nowLevel}. / Might be worth a swap on the {path} Path. {now} won't sulk. Probably. |
| k20 | any bench hero (one picked per day) | Have you tried bringing {hero}? They've been sitting by the door with their boots on for days. |
| k21 | any bench hero | {hero} asked me to mention them. Twice. This is me mentioning them. |
| k22 | any bench hero | Bring {hero} along on the {path} Path sometime. The road is livelier with them. Louder, too. |
| k23 | any bench hero | {hero} and {now} both want the {path} Path. I'm staying out of it. But {hero} did bring me tea. |
| k24 | after k20–k23 | Swap them in from your collection, whenever you like. No one stays offended for long. |
| k25 | no bench heroes yet | You've only the eight so far. Good company, mind you. / Keep walking your Paths. Every few levels, someone new wakes up and wants to come along. |

**Count:** 77 notification lines + 3 cards + 25 Archive lines.

## Questions

1. **Lantern** it is (decided Sep 28).
2. **h3, h4, h5 hint at the Keeper's secret** (he was there; the old friend; he knows your name). Too much for a notification, or just right?
3. **a7 and d2 are the most Duo-like** (wry, a bit passive-aggressive). More lines like that, or fewer?
4. **K (Archive talk):** k19 tells you plainly to swap heroes. Too pushy for the Keeper, or useful? And should he ever be blunter about a dusty Path than k15–k16?
