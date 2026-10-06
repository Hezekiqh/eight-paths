# Eight Paths: Episodes

Oct 6, 2026 · the short-form template, and where the series stands

## The template (from Episode 10, "the worst prisoners ever")

Episode 10 is the one that worked: the three prisoners, one petty crime against the king each,
each one a life sentence. Longer episodes weren't hooking people and retention was poor. Every
episode for the next two weeks follows this. Numbers below are measured from the posted video.

| | Episode 10 | Rule |
| --- | --- | --- |
| Length | 16.6 s | **About 15 s.** Never past ~17 s |
| Opening | Frame one is already mid-sentence ("Th…" at 0.0 s) | **No title card, no fade.** Open on the line |
| Ending | Ends on "...Touchy." over the scene | **No end card.** End on the last laugh, held ~1.5 s |
| Shape | Three beats of ~5 s: Old Mott 0–5 s, Nails 5–10.5 s, Silas Seen 10.5–16.6 s | **Three beats, rule of three**, the third one topping the other two |
| Each beat | Setup (1–2 short lines) → punchline held ~1.5–2 s → menu flashes ~1 s, Goodbye picked → cut | Setup fast, **punchline holds**, menu shows the game's choices for a second |
| Text speed | ~20 ms a letter (the game's 28 ms, sped up); setups held only ~0.3 s once typed | **Type fast, don't linger on setups.** From Episode 11 a touch slower (author, Oct 6: "a little too fast"): 24 ms a letter, setups held ~0.5 s |
| Movement | Between cells, the wizard walks quick (~0.5 s) | **Speed the character up.** No slow walks |
| Camera | Beat one framed close on Old Mott, then the wider corridor | **Hook close**, then open up |
| Sound | Voice blips only | Voices only; add a sound when posting if wanted |
| The wizard | Never says a word | **The character never talks**, alone least of all. Everyone else does the talking; he reacts with what he does |
| The hook | Mid-sentence on frame one | **Open on something funny happening**, not on a setup. Episode 11 opens on a fall |

The joke engine: a tiny, petty offence against the king → an absurd, deadpan sentence. The numbers
don't follow the crime (twenty, then *one*, then fifty), and the last one gets a reaction tag.

### Episode 10, line for line

1. **Old Mott**: "The king sneezed." / "I didn't say bless you." / "Twenty life sentences."
   Menu: *Should've said bless you, then.* · **Goodbye.**
2. **Nails**: "The king asked for ice water." / "I gave him one ice cube." / "One life sentence."
   Menu: *Why only one ice cube?* · *One ice cube? You deserve it.* · **Goodbye.**
3. **Silas Seen**: "I left the king on read for twenty minutes." / "Fifty life sentences." / "." / "..." / "...Touchy."

## Where the series stands

- **Posted:** Episodes up to 10.
- **Episode 9 (Gary)** was made in a cloud session that was lost before it was pushed. Its code is gone;
  the posted video is the only record.
- **Episode 10** is rebuilt from the posted video (`node scripts/episode-video.mjs 10`). Its timing matches the
  post to within a few tenths of a second, and the game now matches it: the three prisoners' sprites, lines and
  order (Old Mott, Nails, Silas Seen) are in `src/world/maps/kingdom-dungeon.json`. The prisoners' menu answers
  weren't shown in the video, so they were rewritten.
- **Episode 11, "See You Next Fall"** (`node scripts/episode-video.mjs 11`, ~10.5 s): two steps into the Maze Ward the
  floor swallows you, and you drop out of the top of the screen onto your feet outside Silas Seen's cell. Cut to the
  other two. Old Mott: "Nice trip." Nails: "See you next fall." They laugh. Silas Seen: "Gary was supposed to fix that
  hole." Cut to Gary: "Zzzz" / "Zzzzz". End. In the game: the pothole (`POTHOLE` and `POTHOLE_LANDING` in
  `src/world/dungeon.ts`, tile `h` in the Maze Ward, once only); the episode reads its lines from there.
  Rejected (author): Silas's "One for each cheek", and landing upside down seeing stars (it looks mean).
- **Episode 12, "I Regret Nothing"** (`node scripts/episode-video.mjs 12`, ~15 s): frame one, Gary (a chill guy, not an
  idiot): "Sure. Why not." *You received Gary's Cell Keys!* You go straight along the cells unlocking each door, and
  the three confess on their way up the ladder: Nails "I STOLE THE OTHER ICE CUBES!", Old Mott "I PUT PEPPER IN THE
  KING'S SANDWICH!", Silas Seen, strolling, "I REGRET NOTHING!!!!". You start for the way out, double back to Gary,
  and he's gone. In the game: *Could I please have the keys?* (he thinks, shrugs, says it), the keys as a keepsake
  (`gary-keys` in `items.ts`), the walk along the cells (`toTheCells` in `dungeon.ts`), the same lines
  (`kingdom-dungeon.json`), and `cells-freed` (`CELLS_FREED`), which empties the cells and takes Gary once those
  lines have been read (`Question.after`).
- **Voices:** every speaker blips per letter, Undertale-style, in the game and the episodes alike, from the same
  table (`VOICES` in `src/world/portraits.ts`, mirrored in the episode script). The Deep Cells: Old Mott 1 (low),
  Gary 2, Silas Seen 3, Nails 4.
- **Gary sleeps** at his post, in the game and the episodes: eyes shut (`garyasleep`), Zs floating off his head
  (`asleep` on a person, `src/world/sleep.ts`). Talk to him and he's awake (`gary`) until you're done.
- **The prisoners stand behind their bars**, a tile back in their cells, never on them (author: they looked fused
  with the cell doors). You talk to them across the bars (`talkThrough` on the map).
- **Episode 13, "Unacceptable"** (`node scripts/episode-video.mjs 13`, ~16.8 s): up into the Kaldorium. The three you
  let out got there first and lost; the Warden (drawn twice as big) has been expecting you. Frame one, in close:
  "Well, well, well. If it isn't our final contestants." / "Escape is punishable by death, you know." The menu:
  *I was just going for a walk.* "UNACCEPTABLE." (the screen jolts) / "After we were so lenient with your sentences." /
  "You will pay with your lives!" Brannoc faints flat beside you. Barnaby: "...Did he just faint?" / "...pathetic."
  The three shuffle to the side; Silas Seen: "You got this, whatever your name is." Barnaby: "FIGHT!" Cut. In the
  game: the same arrival (`ARENA_WELCOME`, `ARENA_EXCUSES`, `ARENA_VERDICT` in `dungeon.ts`; any excuse gets the same
  answer, and there's a mean one), then the five guards and the Warden as before. The Warden watches from the head of
  the sand until his guards are down, and the three stand at the side of the sand until he's beaten
  (`the-pit.json`; `passable`, so they never get in the way of a fight; `size` for the Warden). If you never let
  the three out, he welcomes "our runaways" and they aren't there.
- **The Colosseum** (author, Oct 6, 2026: "look at the arena outside looking in"): the arena (`the-pit`) is drawn as the
  inside of the oval Warrior City shows from without, wider (32×17), open to the sky: sand, a low stone wall, tiers
  packed with the crowd, the Crown's red banners with the gold fist, the great gate at the bottom and a trapdoor down
  to the cells (`drawArena` in `scripts/world-art.mjs`, `floor: "sand"`). Everyone moved with it (`dungeon.ts`
  `BRANNOC_FAINTED`, `SAND_MIDDLE`; the exits in `progress.ts`). Spectators on the sand (the crowd, the Warden, the
  three) are `passable`, so every fight still balances (fights.test).
- **No overlap** (author): nobody stands or falls into anyone. Brannoc is three tiles from where you come up, and
  faints away from you.
- **Next:** Episode 14.

## In the episode script

Every template episode spreads `SHORT` (24 ms a letter, 0.7× the pauses, short holds, a 160 px/s walk, no title or end
card). Episode 10 keeps its posted pace (`SHORT_10`: 20 ms, half pauses, a 190 px/s walk). Per step: `punch` (seconds a beat's last line holds), `zoom` (cut closer or back out), `drop` (sink through
the floor), `fall` (drop in from above onto your feet; `scene.airborne` first), `look` (cut the camera to a tile, `null` back to you), `vanish` (someone's gone), `shrug`, `jolt` (the screen jolts: a door unlocked, UNACCEPTABLE), `faint`, `as` (a line from someone not on the map: Barnaby), `npc size`, `ep.awake` (a sleeper awake
for the episode),
`scene.gap` (a quicker cut), `laugh … together`.

## So nothing gets lost again

Commit and push at the end of every session. Only what's on GitHub survives a cloud session.
