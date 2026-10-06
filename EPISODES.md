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
| Text speed | ~20 ms a letter (the game's 28 ms, sped up); setups held only ~0.3 s once typed | **Type fast, don't linger on setups** |
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
- **Episode 11, "See You Next Fall"** (`node scripts/episode-video.mjs 11`, ~9.5 s): two steps into the Maze Ward the
  floor swallows you, and you drop out of the top of the screen onto your feet outside Silas Seen's cell. Cut to the
  other two. Old Mott: "Nice trip." Nails: "See you next fall." They laugh. Silas Seen: "Gary was supposed to fix that
  hole." Cut to Gary: "Zzzz" / "Zzzzz". End. In the game: the pothole (`POTHOLE` and `POTHOLE_LANDING` in
  `src/world/dungeon.ts`, tile `h` in the Maze Ward, once only); the episode reads its lines from there.
  Rejected (author): Silas's "One for each cheek", and landing upside down seeing stars (it looks mean).
- **Next:** Episode 12. Gary can be asked for the keys in the game ("The keys are upstairs. With everyone who gets
  paid."), if that's where it goes. Then rewrite the old 12–14 ideas to fit the
  template, with the jokes first.

## In the episode script

Every template episode spreads `SHORT` (20 ms a letter, half pauses, quick holds, a 190 px/s walk, no title or end
card). Per step: `punch` (seconds a beat's last line holds), `zoom` (cut closer or back out), `drop` (sink through
the floor), `fall` (drop in from above onto your feet; `scene.airborne` first), `look` (cut the camera to a tile, `null` back to you),
`scene.gap` (a quicker cut), `laugh … together`.

## So nothing gets lost again

Commit and push at the end of every session. Only what's on GitHub survives a cloud session.
