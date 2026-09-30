import { router, useFocusEffect, useIsFocused } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { claimMusic } from '@/audio';
import { DialogueBox, type Dialogue } from '@/components/world/dialogue-box';
import { PauseMenu } from '@/components/world/pause-menu';
import { WorldMapView } from '@/components/world/world-map';
import { WorldControls } from '@/components/world/world-controls';
import { WorldHub } from '@/components/world/world-hub';
import { WorldView, npcFeet, useWorldSim, type WorldSim } from '@/components/world/world-view';
import { useGameStore } from '@/store';
import { useSession } from '@/store/session';
import { useCollection, useObjectives, useToday } from '@/store/hooks';
import { CLASSES, levelFromXp, type Dimension } from '@/game';
import { fonts } from '@/theme';
import { DOWN, LEFT, RIGHT, UP, tileAhead } from '@/world/engine';
import { COMPANIONS } from '@/story/companions';
import {
  FACINGS,
  MAPS,
  TILE,
  objectAt,
  tileAt,
  tilesOf,
  withOpenTiles,
  withoutCharacter,
  type MapId,
  type WorldMap,
} from '@/world/maps';
import {
  EXITS,
  FINAL_GOAL,
  describeRequirement,
  howToProgress,
  standing,
  type Arrival,
  type XpTotals,
} from '@/world/progress';
import { SEASON_END, winScene, type Outcome } from '@/world/scenes';
import { loreId } from '@/world/lore';
import { characterQuestions } from '@/world/talk';
import { jobAt, openPatches, openedByJobs } from '@/world/jobs';
import { useWorldHydrated, useWorldStore, type WorldPosition } from '@/world/store';
import { isWalker, worldHero, type HeroId } from '@/world/hero';
import { ATTACKS, HEARTS, damageFor, drowsyRate, type EnemyKind } from '@/world/combat';
import { useWorldProgress } from '@/world/use-progress';

/**
 * Set just before opening a screen over the World (the quest board), so the
 * phone stays sideways instead of flipping upright for a moment.
 */
let keepSideways = false;

/**
 * The tab opens upright on the World menu; the game turns the phone sideways
 * only once the player jumps in. Leaving the tab turns it upright again and
 * comes back to the menu next time (unless the quest board was opened over
 * the game, which keeps everything as it was).
 */
function usePlaying() {
  const playing = useSession((s) => s.worldPlaying);
  const setPlaying = useCallback((worldPlaying: boolean) => useSession.setState({ worldPlaying }), []);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    ScreenOrientation.lockAsync(
      playing ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  }, [focused, playing]);
  useFocusEffect(
    useCallback(() => {
      keepSideways = false;
      const releaseMusic = claimMusic('world');
      return () => {
        releaseMusic();
        if (keepSideways) return;
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setPlaying(false);
      };
    }, [setPlaying]),
  );
  return [playing, setPlaying] as const;
}

export default function WorldScreen() {
  const [playing, setPlaying] = usePlaying();
  const hydrated = useWorldHydrated();
  const [hero] = useParty();
  const { width, height } = useWindowDimensions();
  const savePosition = useWorldStore((s) => s.savePosition);
  /** Bumped on each trip through a door, so the World starts afresh in the new place. */
  const [trip, setTrip] = useState(0);
  const dark = useSharedValue(0);
  const darkStyle = useAnimatedStyle(() => ({ opacity: dark.value }));

  // Fade to black, step through, fade back in.
  const travel = useCallback(
    (to: Arrival) => {
      dark.set(withTiming(1, { duration: FADE_MS }));
      setTimeout(() => {
        const [x, y] = npcFeet(to);
        savePosition({ map: to.map, x, y, facing: to.facing });
        setTrip((t) => t + 1);
        dark.set(withDelay(80, withTiming(0, { duration: FADE_MS })));
      }, FADE_MS);
    },
    [dark, savePosition],
  );

  if (!hydrated) return <View style={styles.root} />;
  if (!playing) return <WorldHub onPlay={() => setPlaying(true)} />;
  // Wait for the phone to finish turning sideways.
  if (width < height) return <View style={styles.root} />;
  // A new World character means a fresh room: they step out of the crowd, the last one steps back in.
  return (
    <View style={styles.root}>
      <World
        key={`${hero}-${trip}`}
        hero={hero}
        width={width}
        height={height}
        onTravel={travel}
        onMenu={() => setPlaying(false)}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fade, darkStyle]} />
    </View>
  );
}

const FADE_MS = 350;

/**
 * One character walks the World: the party member picked from their sheet on
 * the Today screen (worldHero falls back to your class's companion).
 */
function useParty(): HeroId[] {
  const picked = useWorldStore((s) => s.hero);
  const party = useGameStore((s) => s.party);
  const classDimension = useGameStore((s) => s.player?.classDimension ?? 'physical');
  return useMemo(() => [worldHero(picked, party, classDimension)], [picked, party, classDimension]);
}

/** Where to start: the saved spot, unless someone now stands there (then the map's spawn). */
function startFor(
  saved: WorldPosition | null,
  hero: HeroId,
): {
  map: WorldMap;
  x: number;
  y: number;
  facing: WorldPosition['facing'];
} {
  if (saved) {
    const map = withoutCharacter(MAPS[saved.map], hero);
    const tile = Math.floor((saved.y - 1) / TILE) * map.width + Math.floor(saved.x / TILE);
    if (!map.solid[tile]) return { ...saved, map };
  }
  const map = withoutCharacter(MAPS.archive, hero);
  const [x, y] = npcFeet(map.spawn);
  return { map, x, y, facing: map.spawn.facing };
}

function World({
  hero,
  width,
  height,
  onTravel,
  onMenu,
}: {
  hero: HeroId;
  width: number;
  height: number;
  onTravel: (to: Arrival) => void;
  /** Back to the upright World menu. */
  onMenu: () => void;
}) {
  const controls = useWorldStore((s) => s.controls);
  const setControls = useWorldStore((s) => s.setControls);
  const savePosition = useWorldStore((s) => s.savePosition);
  const [start] = useState(() => startFor(useWorldStore.getState().position, hero));
  const xpNow = useWorldProgress();
  // Doorways, holes and road ends you walk through, if they're open to you yet.
  const [ways] = useState(() =>
    EXITS.filter((e) => e.from === start.map.id && e.walk && e.to !== null && standing(e.needs, xpNow).met),
  );
  // A boss fight, the first time you come in: the boss has their say, then the fight is on.
  const [bossOn] = useState(() => !!start.map.boss && !(xpNow.flags ?? []).includes(start.map.boss.flag));
  const bossNpc = start.map.npcs.find((n) => n.after?.flag === start.map.boss?.flag);
  // The room is fixed for this visit (doing a job re-enters it), so these read the flags on arrival.
  const [arrivalFlags] = useState(() => xpNow.flags ?? []);
  const map = useMemo(
    () => withOpenTiles(start.map, [...ways.map((e) => e.tile), ...openedByJobs(start.map.id as MapId, arrivalFlags)]),
    [start, ways, arrivalFlags],
  );
  const patches = useMemo(() => openPatches(map, arrivalFlags), [map, arrivalFlags]);
  // The boss's bearers join the room's enemies while the fight is on.
  const fightMap = useMemo(
    () =>
      bossOn && map.boss
        ? {
            ...map,
            enemies: [
              ...map.enemies,
              ...map.boss.bearers.map(([x, y]) => ({ kind: (map.boss?.kind ?? 'sleeper') as EnemyKind, x, y })),
            ],
          }
        : map,
    [map, bossOn],
  );
  // A solved plate puzzle stays solved: its boulders start on the plates.
  const boulders = useMemo(() => {
    if (!map.platesFlag || !arrivalFlags.includes(map.platesFlag)) return map.boulders;
    return map.boulders.map((b, i) => map.plates[i] ?? b);
  }, [map, arrivalFlags]);
  const boulderMap = useMemo(() => {
    if (boulders === map.boulders) return fightMap;
    const solid = map.solid.slice();
    for (const b of map.boulders) solid[b] = 0;
    for (const b of boulders) solid[b] = 1;
    return { ...fightMap, solid };
  }, [map, fightMap, boulders]);
  const stepTiles = useMemo(
    () =>
      tilesOf(
        map,
        ways.map((e) => e.tile),
      ),
    [map, ways],
  );
  const party = useMemo(() => [hero], [hero]);
  const sim = useWorldSim(start, map.npcs);
  const today = useToday();
  const { unclaimed } = useObjectives(today);

  const [focused, setFocused] = useState(true);
  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [you, setYou] = useState({ x: 0, y: 0 });
  const discovered = useWorldStore((s) => s.discovered);
  const discover = useWorldStore((s) => s.discover);
  const hear = useWorldStore((s) => s.hear);
  const xp = useWorldProgress();
  const xpRef = useRef(xp);
  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);

  // Setting foot somewhere puts it on the World map.
  useEffect(() => {
    discover(map.id as MapId);
  }, [map, discover]);
  const [dialogue, setDialogue] = useState<Dialogue | null>(() =>
    !bossOn
      ? null
      : start.map.boss?.intro
        ? { speaker: start.map.boss.intro.speaker ?? undefined, lines: start.map.boss.intro.lines }
        : bossNpc
          ? { speaker: bossNpc.name, lines: bossNpc.lines }
          : null,
  );

  // Points per art pixel: about eight and a half tiles top to bottom, in whole steps so pixels stay sharp.
  const scale = Math.min(4, Math.max(2, Math.round(height / (TILE * 8.5))));

  /** Set once the player steps through a door, so this room never saves over where they arrived. */
  const left = useRef(false);
  const save = useCallback(() => {
    if (left.current) return;
    savePosition({
      map: map.id as WorldPosition['map'],
      x: sim.x.get(),
      y: sim.y.get(),
      facing: FACINGS[sim.facing.get()],
    });
  }, [map, sim, savePosition]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        save();
      };
    }, [save]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && save());
    return () => sub.remove();
  }, [save]);

  const frozen = paused || dialogue !== null;
  useEffect(() => {
    sim.frozen.set(frozen);
  }, [frozen, sim]);

  const openBoard = useCallback(() => {
    save();
    keepSideways = true;
    router.push('/quest-board');
  }, [save]);

  const travel = useCallback(
    (to: Arrival) => {
      save();
      left.current = true;
      onTravel(to);
    },
    [save, onTravel],
  );
  const act = useAct(map, sim, setDialogue, save, xpRef, travel, hero);
  const setFlag = useWorldStore((s) => s.setFlag);
  // How the walking character fights: their Path's attack, harder the more real habits they have.
  const heroPath = COMPANIONS[hero].dimension;
  const collection = useCollection();
  const heroLevel = collection.entries.find((e) => e.companion.id === hero)?.progress.level ?? 1;
  const gameParty = useGameStore((s) => s.party);
  const giftCharacters = useGameStore((s) => s.giftCharacters);
  // Winning a fight: its scene plays, then its flags are set, anyone who joins you joins, and on you go.
  const finish = useCallback(
    (o: Outcome) => {
      for (const f of o.flags) setFlag(f);
      if (o.joins) giftCharacters(o.joins);
      travel(
        o.next ?? {
          map: map.id as MapId,
          x: Math.floor(sim.x.get() / TILE),
          y: Math.floor((sim.y.get() - 1) / TILE),
          facing: FACINGS[sim.facing.get()],
        },
      );
    },
    [map, sim, setFlag, giftCharacters, travel],
  );
  const onWin = useCallback(() => {
    if (!map.boss) return;
    const scene = winScene(map.id as MapId, map.boss.flag, Object.values(gameParty).includes('brannoc'));
    if (!scene) return;
    setDialogue({
      lines: scene.lines,
      then: scene.outcome ? () => finish(scene.outcome!) : undefined,
      choices: scene.choices?.map((c) => ({
        label: c.label,
        then: () => setDialogue({ lines: c.lines, then: () => finish(c.outcome) }),
      })),
    });
  }, [map, gameParty, finish]);
  const onDefeat = useCallback(() => {
    setDialogue({
      lines: [
        'Your knees give. The dark closes in.',
        "You wake on the Archive floor, the candles still burning. Nothing lost. Try again when you're ready.",
      ],
      then: () => {
        const a = MAPS.archive.spawn;
        travel({ map: 'archive', x: a.x, y: a.y, facing: a.facing });
      },
    });
  }, [travel]);
  const setHero = useWorldStore((s) => s.setHero);
  const walkers = useMemo(() => Object.values(gameParty).filter(isWalker) as HeroId[], [gameParty]);
  const onPlates = useCallback(() => {
    if (!map.platesFlag) return;
    setFlag(map.platesFlag);
    const here: Arrival = {
      map: map.id as MapId,
      x: Math.floor(sim.x.get() / TILE),
      y: Math.floor((sim.y.get() - 1) / TILE),
      facing: FACINGS[sim.facing.get()],
    };
    setDialogue({
      lines: [
        'With a clank, all three plates sink at once.',
        'Chains draw taut. Across the yard, the gate grinds up into the dark.',
      ],
      then: () => travel(here),
    });
  }, [map, setFlag, sim, travel]);
  const onStep = useCallback(
    (tile: number) => {
      const letter = map.tiles[Math.floor(tile / map.width)][tile % map.width];
      const to = ways.find((e) => e.tile === letter)?.to;
      if (to) travel(to);
    },
    [map, ways, travel],
  );
  const board = map.objects.find((o) => o.type === 'board');

  return (
    <View style={styles.root}>
      <WorldView
        map={boulderMap}
        party={party}
        sim={sim}
        width={width}
        height={height}
        scale={scale}
        active={focused}
        marks={unclaimed > 0 && board ? [board] : []}
        stepTiles={stepTiles}
        onStep={onStep}
        patches={patches}
        boulders={boulders}
        plates={map.plates}
        onPlates={onPlates}
        attack={ATTACKS[heroPath]}
        damage={damageFor(ATTACKS[heroPath], heroLevel)}
        onDefeat={onDefeat}
        boss={bossOn && map.boss ? { x: map.boss.x * TILE + TILE / 2, y: map.boss.y * TILE + TILE } : null}
        throws={bossOn && !map.boss?.kind}
        drowsy={bossOn && !map.boss?.kind ? drowsyRate(levelFromXp(xpNow.byPath.emotional).level) : 0}
        onWin={onWin}
      />
      {!frozen && (
        <WorldControls
          scheme={controls}
          sim={sim}
          onAct={act}
          fight={
            fightMap.enemies.length > 0
              ? { color: CLASSES[heroPath].color, label: `Attack: ${ATTACK_NAMES[heroPath]}` }
              : null
          }
          onPause={() => {
            save();
            setPaused(true);
          }}
        />
      )}
      {fightMap.enemies.length > 0 && <Hearts hp={sim.hp} />}
      {bossOn && !map.boss?.kind && <Drowsiness sleepy={sim.sleepy} />}
      {dialogue && (
        <DialogueBox
          key={dialogue.lines.join('|')}
          dialogue={dialogue}
          onClose={() => {
            setDialogue(null);
            dialogue.then?.();
          }}
          onAsk={(q) => {
            // Everything a character tells you goes in the World menu's lore journal.
            const speaker = dialogue.speaker;
            if (speaker) hear({ id: loreId(speaker, q.ask), speaker, ask: q.ask, answer: q.answer, at: Date.now() });
          }}
        />
      )}
      {paused && (
        <PauseMenu
          map={map.id as MapId}
          mapName={map.name}
          controls={controls}
          onControls={setControls}
          onResume={() => setPaused(false)}
          onOpenMap={() => {
            setYou({ x: sim.x.get(), y: sim.y.get() });
            setMapOpen(true);
          }}
          onOpenBoard={openBoard}
          onMenu={() => {
            save();
            setPaused(false);
            onMenu();
          }}
          onLeave={() => {
            setPaused(false);
            router.navigate('/');
          }}
          party={walkers}
          hero={hero}
          onSwap={(id) => {
            // Save where you stand; the World restarts right here with them.
            save();
            setPaused(false);
            setHero(id);
          }}
        />
      )}
      {mapOpen && (
        <WorldMapView
          map={map}
          you={you}
          discovered={discovered}
          width={width}
          height={height}
          onClose={() => setMapOpen(false)}
        />
      )}
    </View>
  );
}

const OPPOSITE = [UP, DOWN, RIGHT, LEFT];

/** What A (or a tap) does: talk to whoever's in front, open the quest board, or examine the tile. */
function useAct(
  map: WorldMap,
  sim: WorldSim,
  setDialogue: (d: Dialogue) => void,
  save: () => void,
  xp: { current: XpTotals },
  onTravel: (to: Arrival) => void,
  hero: HeroId,
) {
  const busy = useRef(false);
  return useCallback(() => {
    if (busy.current) return;
    const facing = sim.facing.get();
    const [tx, ty] = tileAhead(sim.x.get(), sim.y.get(), facing);
    const thing = objectAt(map, tx, ty);
    if (thing?.type === 'npc' && thing.job && !useWorldStore.getState().flags.includes(thing.job.flag)) {
      const who = COMPANIONS[hero];
      const job = thing.job;
      if (job.path === 'any' || who.dimension === job.path) {
        useWorldStore.getState().setFlag(job.flag);
        if (job.joins) useGameStore.getState().giftCharacters(job.joins);
        setDialogue({ speaker: thing.name, lines: job.done.map((l) => l.replace('{name}', who.name)) });
      } else setDialogue({ speaker: thing.name, lines: [...thing.lines, ...job.cant] });
      return;
    }
    if (thing?.type === 'npc') {
      // they turn to face you
      const i = map.npcs.indexOf(thing);
      const turned = [...sim.npcFacing.get()];
      turned[i] = OPPOSITE[facing];
      sim.npcFacing.set(turned);
      setDialogue({
        speaker: thing.name,
        lines:
          thing.after && useWorldStore.getState().flags.includes(thing.after.flag) ? thing.after.lines : thing.lines,
        questions: thing.questions ?? (thing.character ? characterQuestions(COMPANIONS[thing.character]) : undefined),
      });
      return;
    }
    if (thing?.type === 'board') {
      save();
      keepSideways = true;
      busy.current = true;
      router.push('/quest-board');
      setTimeout(() => (busy.current = false), 600);
      return;
    }
    const tile = tileAt(map, tx, ty);
    if (map.id === 'field-of-banners' && tile === 'Q') {
      const s = standing(FINAL_GOAL, xp.current);
      if (s.met) {
        useWorldStore.getState().setFlag('season-1');
        setDialogue({ lines: SEASON_END });
      } else
        setDialogue({
          lines: [...(map.examine.Q ?? []), `Season 1 ends at Overall Lv ${FINAL_GOAL.level}. ${howToProgress(s)}`],
        });
      return;
    }
    // A job: pull a lever, break a wall. Doing one changes the room, so it's re-entered afterwards.
    const job = jobAt(map.id as MapId, tile);
    const isExit = EXITS.some((e) => e.from === map.id && e.tile === tile);
    if (job) {
      const { flags, setFlag } = useWorldStore.getState();
      const who = COMPANIONS[hero];
      if (flags.includes(job.flag)) {
        if (!isExit) {
          setDialogue({ lines: job.already });
          return;
        }
        // An opened doorway: carry on to it below.
      } else if (job.path && who.dimension !== job.path) {
        setDialogue({ lines: job.cant ?? map.examine[tile] ?? [] });
        return;
      } else {
        setFlag(job.flag);
        const here: Arrival = {
          map: map.id as MapId,
          x: Math.floor(sim.x.get() / TILE),
          y: Math.floor((sim.y.get() - 1) / TILE),
          facing: FACINGS[facing],
        };
        setDialogue({ lines: job.done.map((l) => l.replace('{name}', who.name)), then: () => onTravel(here) });
        return;
      }
    }
    // A way out says what it needs, in real habits.
    const exit = EXITS.find((e) => e.from === map.id && e.tile === tile);
    if (exit) {
      const s = standing(exit.needs, xp.current);
      const to = exit.to;
      if (s.met && to) {
        // The first time through the great door is a moment; after that, just go.
        if (exit.id === 'archive-door' && !useWorldStore.getState().discovered.includes(to.map)) {
          setDialogue({
            lines: [
              'The great door groans, and swings open.',
              'Daylight. Real daylight, for the first time in five hundred years.',
            ],
            then: () => onTravel(to),
          });
        } else onTravel(to);
        return;
      }
      setDialogue({
        lines: s.met
          ? [`${exit.label} gives a little under your hand.`, "Whatever lies beyond isn't ready for you yet."]
          : s.hint
            ? [`${exit.label}. It won't budge.`, s.hint]
            : [
                `${exit.label}. It won't budge. Not yet.`,
                `It needs ${describeRequirement(exit.needs)}. You're Lv ${s.have}.`,
                howToProgress(s),
              ],
      });
      return;
    }
    const lines = map.examine[tile];
    if (lines) setDialogue({ lines });
  }, [map, sim, setDialogue, save, xp, onTravel, hero]);
}

const styles = StyleSheet.create({
  drowsy: { position: 'absolute', width: 180, gap: 2 },
  drowsyLabel: { color: '#E8D8F0', fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  drowsyTrack: { height: 8, backgroundColor: 'rgba(20, 14, 28, 0.6)', borderWidth: 2, borderColor: '#E8D8F0' },
  drowsyFill: { height: '100%', backgroundColor: '#B89AE0' },
  hearts: { position: 'absolute', flexDirection: 'row', gap: 4 },
  fade: { backgroundColor: '#000000' },
  root: { flex: 1, backgroundColor: '#0C0806' },
});

/** Hearts left, top left, while there's something to fight. */
function Hearts({ hp }: { hp: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={[styles.hearts, { left: Math.max(insets.left, 16), top: Math.max(insets.top, 12) }]}
      accessibilityElementsHidden>
      {Array.from({ length: HEARTS }, (_, i) => (
        <Heart key={i} index={i} hp={hp} />
      ))}
    </View>
  );
}

function Heart({ index, hp }: { index: number; hp: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: hp.get() > index ? 1 : 0.25 }));
  return (
    <Animated.View style={style}>
      <SymbolView name="heart.fill" tintColor="#E0454F" size={20} />
    </Animated.View>
  );
}

/** What each Path's attack is called, for VoiceOver. */
const ATTACK_NAMES: Record<Dimension, string> = {
  physical: 'sword swing',
  intellectual: 'fire bolt',
  spiritual: 'light burst',
  financial: 'coin toss',
  emotional: 'palm strike',
  social: 'lute shockwave',
  occupational: 'thrown wrench',
  environmental: 'arrow',
};

/** Baron Plush's fight: how close you are to nodding off. */
function Drowsiness({ sleepy }: { sleepy: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(sleepy.get() * 100)}%` }));
  return (
    <View
      pointerEvents="none"
      style={[styles.drowsy, { left: Math.max(insets.left, 16), top: Math.max(insets.top, 12) + 28 }]}>
      <Text style={styles.drowsyLabel}>DROWSY · KEEP MOVING</Text>
      <View style={styles.drowsyTrack}>
        <Animated.View style={[styles.drowsyFill, fill]} />
      </View>
    </View>
  );
}
