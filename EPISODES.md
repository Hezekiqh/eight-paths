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
- **In the repo (`scripts/episode-video.mjs`):** Episodes 2–8 and two BONUS episodes, in the older,
  longer style (title card off, 4.5 s end card). Episode 8 ends "NEXT TIME: GARY".
- **Lost with the old cloud sessions (never pushed):** Episode 9 (Gary), Episode 10's code, the new
  prisoner jokes and Silas Seen in `src/world/maps/kingdom-dungeon.json`, the faster typing, the
  quicker walk, the close camera, dropping the end card, and the outlines for Episodes 11–14.
  The video above is the record; rebuild from it.
- **To do:** rebuild the template into the episode script; Episode 11, then 12, to build a buffer;
  then rewrite the old 11–14 ideas to the template, funny first.

## So nothing gets lost again

Commit and push at the end of every session. Only what's on GitHub survives a cloud session.
