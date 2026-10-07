import { router, useFocusEffect, useIsFocused } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

import { claimMusic, playSound } from '@/audio';
import { DialogueBox, type Dialogue } from '@/components/world/dialogue-box';
import { PauseMenu } from '@/components/world/pause-menu';
import { WorldMapView } from '@/components/world/world-map';
import { WorldControls } from '@/components/world/world-controls';
import { WorldHub } from '@/components/world/world-hub';
import { HeroSelect } from '@/components/world/hero-select';
import { VhsOverlay } from '@/components/world/vhs-overlay';
import { WorldView, npcFeet, useWorldSim, type WorldSim } from '@/components/world/world-view';
import { pickData, useGameStore } from '@/store';
import { selectKeeperFacts } from '@/store/selectors';
import { useSession } from '@/store/session';
import { useCollection, useObjectives, useToday } from '@/store/hooks';
import { CLASSES, levelFromXp, overallLevelFromXp, toDateKey, type Dimension } from '@/game';
import { fonts } from '@/theme';
import { advisedBy, brokenCocoons, cocoonAt } from '@/world/cocoons';
import { DOWN, LEFT, RIGHT, UP, tileAhead } from '@/world/engine';
import { turnToTalk, whoIsAt } from '@/world/wander';
import { NOT_YET, meetingLines, metFlag, recruitNeeds, whereToMeet } from '@/world/meet';
import type { Owned } from '@/store/draws';
import { COMPANIONS, DEFAULT_PARTY, type CharacterId } from '@/story/companions';
import {
  FACINGS,
  MAPS,
  TILE,
  tileAt,
  tilesOf,
  withLadder,
  withOpenTiles,
  withoutCharacter,
  withoutGone,
  type MapId,
  type NpcObject,
  type WorldMap,
} from '@/world/maps';
import {
  EXITS,
  FINAL_GOAL,
  describeRequirement,
  howToProgress,
  standing,
  type Arrival,
  type Requirement,
  type XpTotals,
} from '@/world/progress';
import { PORTAL_HOME, SEASON_END, seasonFinale, winScene, type Outcome } from '@/world/scenes';
import { SEASON_FLAG, nextGoal } from '@/world/guide';
import { keeperTalk } from '@/world/keeper-talk';
import { habitMemory } from '@/world/memory';
import { MEMORIES, SEEN_LINES, memoryAt, notYetLines } from '@/world/memories';
import { TALKED, loreId, talkedId } from '@/world/lore';
import { banterFor } from '@/world/banter';
import { characterQuestions } from '@/world/talk';
import { PhoneCall } from '@/components/world/phone-call';
import { callDue, callFlag, callLines, type KeeperCall } from '@/world/keeper-calls';
import { dayNumber, pendingNews, roomOwner, roomQuestions, saidFlag, withRoster } from '@/world/hero-rooms';
import { keeperQuestions } from '@/world/keeper-advice';
import { jobAt, openPatches, openedByJobs } from '@/world/jobs';
import {
  ANSWERS,
  ANSWER_LEVEL,
  CLEARED_BOULDERS,
  CLEARING_TILE,
  FELIX_FOILED,
  CUT_OFF,
  forHero,
  MISTER,
  FRAMED,
  GREEN_CANDLE,
  INTO_THE_ARCHIVE,
  PASSAGE_RETURN,
  PASSAGE_TAKEN,
  greenLit,
  KEEPER_WELCOME,
  KEEPER_CARDS,
  KEEPER_NO_CARDS,
  KEEPER_ASKS,
  KEEPER_CANDLE,
  KEEPER_CARDS_END,
  KEEPER_AFTERTHOUGHTS,
  GREEN_CANDLE_LINES,
  INTO_THE_CELL,
  KEEPER_PARTING,
  MAZE,
  MAZE_SOLVED,
  PASSAGE,
  PASSAGE_LINES,
  PASSAGE_TILE,
  JAILED,
  KNOCKED_IN,
  KNOCKED_OUT,
  KNOCKED_WAKE,
  JAIL_WOKE,
  PAST_THE_MAZE,
  SCENE_OPEN,
  mazeCleared,
  scenePending,
} from '@/world/felix-maze';
import { useWorldHydrated, useWorldStore, type WorldPosition } from '@/world/store';
import { partyWithYou, walkersFor, worldHero, type HeroId } from '@/world/hero';
import { STEP_ASIDE_SECONDS, newCameo } from '@/world/step-aside';
import { MARCH_PACE, newMarch, type Actor } from '@/world/march';
import { SPEED_RATE } from '@/world/speed';
import { BOSS_CUE, bossMoment } from '@/world/moments';
import { noneLeft, practiceWarning, specialsLeft } from '@/world/specials';
import { deedId } from '@/world/honor';
import keeperWelcome from '@/world/keeper-welcome.json';
import { TEST_TOOLS } from '@/world/test-tools';
import { usePremium } from '@/premium/store';
import {
  BRIDGE_LOWERS,
  GATE_ANSWERS,
  GATE_FLAG,
  GATE_GUARD,
  GATE_LEVEL,
  GATE_NOT_YET,
  GATE_OPEN,
  BRANNOC_REJOINED,
  BRANNOC_REJOINS,
  REJOIN_MAP,
  brannocAway,
  needsSomeone,
} from '@/world/castle';
import { LEAVE_IT_TO, MORE, NEVER_MIND, heroOrder, heroPage } from '@/world/hero-pick';
import {
  MAZE_HOLES,
  holeLines,
  ALONE_WARDEN,
  BRANNOC_DECLINED,
  BRANNOC_JOINED,
  BRANNOC_NO,
  BRANNOC_MEAN,
  BRANNOC_MEAN_ASK,
  BRANNOC_OFFER,
  BRANNOC_WOKE,
  BRANNOC_YES,
  CHAMPION_IN_CELL,
  PRISON_GUARDS_DOWN,
  PRISON_INTROS,
  SNOT_SWING,
  SNOT_SWING_HIT,
  WARDEN_SHRUGS,
  brannocShuffles,
  brannocSleepwalks,
  prisonRoute,
  BARS_BENT,
  BRANNOC_BOLTS,
  CELL_DOOR,
  ESCORT_LINES,
  GARY_STARTLED,
  ARENA_EXCUSES,
  ARENA_FIGHT,
  ARENA_FIGHT_ALONE,
  ARENA_VERDICT,
  ARENA_WELCOME,
  ARENA_WELCOME_ALONE,
  CELLS_FREED,
  SAND_MIDDLE,
  FELL_IN,
  POTHOLE,
  POTHOLE_LANDING,
  POTHOLE_UNSEEN,
  toTheCells,
  brannocBolts,
  escortIn,
  escortStand,
  guardsLeave,
  shovedIn,
} from '@/world/dungeon';
import { WALKER_ROWS } from '@/world/walkers';
import { exitNotice, fightHint, fightNotice, jobNotice, npcNotice, whoCan } from '@/world/notices';
import {
  ATTACKS,
  E_ALIVE,
  E_HP,
  E_KIND,
  ENEMIES,
  ENEMY_KINDS,
  attackFor,
  damageFor,
  drowsyRate,
  hpFor,
  levelHearts,
  type EnemyKind,
} from '@/world/combat';
import { CHARGE_LEVEL, SPECIALS, startFight, type Fight } from '@/world/fight';
import { SIGNATURE_LEVEL, signatureOf } from '@/world/signatures';
import { ambienceOf, flamesOn } from '@/world/ambience';
import {
  ITEMS,
  PIECES_PER_HEART,
  chestFlag,
  foundLines,
  heartPieces,
  isCandle,
  keepsakeFlag,
  maxHearts,
  satchel,
} from '@/world/items';
import { haptics } from '@/haptics';
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
  // The Keeper's first question is asked upright; the game turns sideways once it's answered.
  const sideways = useGameStore((s) => playing && heroAwake(s));
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    ScreenOrientation.lockAsync(
      sideways ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  }, [focused, sideways]);
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
  const awake = useGameStore(heroAwake);
  const origin = useGameStore((s) => s.player?.origin);
  // The hero you woke as is always met in the story, after a restart of the Other World too:
  // their room off the Archive is open, and they walk with you.
  const originMet = useWorldStore((s) => !origin || s.flags.includes(metFlag(origin)));
  useEffect(() => {
    if (hydrated && origin && !originMet) useWorldStore.getState().setFlag(metFlag(origin));
  }, [hydrated, origin, originMet]);
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  // "Yes": a white flash, and out of it the Archive, in the chosen hero's body.
  const chooseHero = useCallback(
    (id: CharacterId) => {
      playSound('levelUp');
      haptics.celebrate();
      flash.set(withTiming(1, { duration: FLASH_IN_MS }));
      setTimeout(() => {
        // Who you woke as: forever (Player.origin). They walk first, and their roadside meeting is skipped.
        // No hatch for them (store/draws): the flash is their moment.
        useGameStore.getState().chooseOrigin(id);
        useWorldStore.getState().setHero(id);
        useWorldStore.getState().setFlag(metFlag(id));
        useSession.setState({ heroIntro: id });
        // No habit done yet: they sleep until the first one, so it's back to the World menu.
        if (!heroAwake(useGameStore.getState())) setPlaying(false);
        flash.set(withDelay(FLASH_HOLD_MS, withTiming(0, { duration: FLASH_OUT_MS })));
      }, FLASH_IN_MS);
    },
    [flash, setPlaying],
  );

  // Fade to black, step through, fade back in. `flash`: a white flash instead (the green candle).
  const travel = useCallback(
    (to: Arrival, how?: 'flash') => {
      const cover = how === 'flash' ? flash : dark;
      cover.set(withTiming(1, { duration: FADE_MS }));
      setTimeout(() => {
        const [x, y] = npcFeet(to);
        savePosition({ map: to.map, x, y, facing: to.facing });
        setTrip((t) => t + 1);
        cover.set(withDelay(80, withTiming(0, { duration: FADE_MS })));
      }, FADE_MS);
    },
    [dark, flash, savePosition],
  );

  if (!hydrated) return <View style={styles.root} />;
  return (
    <View style={styles.root}>
      {/* Chosen, but still asleep until the first habit: the menu says so. */}
      {!playing || (origin && !awake) ? (
        <WorldHub onPlay={() => setPlaying(true)} />
      ) : !origin ? (
        <HeroSelect onChoose={chooseHero} />
      ) : width < height ? null : (
        // A new World character means a fresh room: they step out of the crowd, the last one steps back in.
        // (Until the phone finishes turning sideways, nothing is drawn.)
        <RoomGuard key={`${hero}-${trip}`} onFail={() => setPlaying(false)}>
          <World hero={hero} width={width} height={height} onTravel={travel} onMenu={() => setPlaying(false)} />
        </RoomGuard>
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fade, darkStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
}

const FADE_MS = 350;
/** The hero-select flash: quick to white, held while the phone turns sideways, then a slow fade into the Archive. */
const FLASH_IN_MS = 180;
const FLASH_HOLD_MS = 700;
const FLASH_OUT_MS = 700;

/**
 * If a room ever fails to draw, the player lands back on the World menu (their
 * place is saved) instead of the whole app going down. The error is logged.
 */
class RoomGuard extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[world room]', error);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * One character walks the World: the party member picked from their sheet on
 * the Today screen (worldHero falls back to your class's companion if met, else Brannoc).
 */
function useParty(): HeroId[] {
  const picked = useWorldStore((s) => s.hero);
  const party = useGameStore((s) => s.party);
  const classDimension = useGameStore((s) => s.player?.classDimension ?? 'physical');
  const owned = useGameStore((s) => s.owned);
  const origin = useGameStore((s) => s.player?.origin);
  const gone = useLeft();
  // the core eight walk with you once met in this run of the story (hero.ts)
  const metHere = useWorldStore((s) => s.flags.filter((f) => f.startsWith('met:')).join(','));
  return useMemo(
    () => [worldHero(picked, party, classDimension, owned, origin, gone, metHere.split(','))],
    [picked, party, classDimension, owned, origin, gone, metHere],
  );
}

/**
 * The `left:<id>` flags of anyone who went home when the party split, so they
 * no longer walk. Read as one string, so other flags don't re-pick who walks.
 */
function useLeft(): string[] {
  const left = useWorldStore((s) => s.flags.filter((f) => f.startsWith('left:')).join(','));
  return useMemo(() => (left ? left.split(',') : []), [left]);
}

/**
 * The hero the player woke as is up and about: chosen (the Keeper's question)
 * and woken by a first habit. An old save (owned null) has everyone already.
 */
function heroAwake(s: { player: { origin?: CharacterId } | null; owned: Owned | null }): boolean {
  // test builds: awake without a real habit (test-tools.ts)
  if (TEST_TOOLS && useSession.getState().testLevels) return true;
  const origin = s.player?.origin;
  return !!origin && (s.owned === null || (s.owned[origin] ?? 0) > 0);
}

/**
 * Out of the flash, the first room tells the player who they are now. Only
 * right after the Keeper's question (see HeroSelect); null any other time.
 */
function heroIntroFor(hero: HeroId): Dialogue | null {
  if (useSession.getState().heroIntro !== hero) return null;
  const { name, dimension } = COMPANIONS[hero];
  return {
    lines: [
      `You look down at your hands. You are ${name}, the ${CLASSES[dimension].className}.`,
      'Anyone in your party can walk the Other World: pause, then Party.',
    ],
  };
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
    // A ladder (the Maximus) puts up the next fight not yet won.
    const map = withLadder(withoutCharacter(MAPS[saved.map], hero), useWorldStore.getState().flags);
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
  onTravel: (to: Arrival, how?: 'flash') => void;
  /** Back to the upright World menu. */
  onMenu: () => void;
}) {
  const controls = useWorldStore((s) => s.controls);
  const setControls = useWorldStore((s) => s.setControls);
  const speed = useWorldStore((s) => s.speed);
  const setSpeed = useWorldStore((s) => s.setSpeed);
  const savePosition = useWorldStore((s) => s.savePosition);
  const [start] = useState(() => startFor(useWorldStore.getState().position, hero));
  const xpNow = useWorldProgress();
  // Doorways, holes and road ends you walk through, if they're open to you yet.
  // A boss fight, the first time you come in: the boss has their say, then the fight is on.
  // Up from the cells into the Kaldorium (dungeon.ts): Brannoc has fainted on the sand, and the warden can't be hurt.
  const [prison] = useState(() => prisonRoute(start.map.id, xpNow.flags ?? []));
  // Walking as Brannoc there, the warden is no fight: you faint at the sight of him (a scene, on arrival).
  const [faints] = useState(() => prison && hero === 'brannoc' && start.map.boss?.flag === 'pit-champion');
  const [bossOn] = useState(() => !!start.map.boss && !(xpNow.flags ?? []).includes(start.map.boss.flag) && !faints);
  // While it's on, the doorways stay shut (as in Zelda), so backing away never walks you out of it by accident.
  const [ways] = useState(() =>
    bossOn
      ? []
      : EXITS.filter(
          (e) =>
            e.from === start.map.id &&
            e.walk &&
            e.to !== null &&
            standing(e.needs, xpNow).met &&
            // the pothole only gives way once
            !(e.id === 'maze-pothole' && (xpNow.flags ?? []).includes(FELL_IN)),
        ),
  );
  const bossNpc = start.map.npcs.find((n) => n.after?.flag === start.map.boss?.flag);
  // The room is fixed for this visit (doing a job re-enters it), so these read the flags on arrival.
  const [arrivalFlags] = useState(() => xpNow.flags ?? []);
  // Felix is in this room (he's out of his cocoon and gone from the road): lines about him need him here.
  const felixHere = start.map.npcs.some(
    (n) =>
      n.id === 'felix' &&
      (!n.comesAfter || arrivalFlags.includes(n.comesAfter)) &&
      !(n.goneAfter && arrivalFlags.includes(n.goneAfter)),
  );
  const aboutFelix = useCallback((l: string) => felixHere || !/\bFelix\b|^FELIX:/.test(l), [felixHere]);
  // A fight carried over from the character you just switched from (session.ts): it goes on, not again.
  const [resume] = useState(() => {
    const c = useSession.getState().carry;
    return c && c.map === start.map.id ? c : null;
  });
  useEffect(() => {
    if (resume) useSession.setState({ carry: null });
  }, [resume]);
  const roomMap = useMemo(
    () =>
      withOpenTiles(
        // who's out exploring the hall today, and who's in their room (hero-rooms.ts)
        withRoster(start.map, dayNumber(), arrivalFlags),
        [...ways.map((e) => e.tile), ...openedByJobs(start.map.id as MapId, arrivalFlags)],
      ),
    [start, ways, arrivalFlags],
  );
  // Someone who leaves for good (Nib, if you're mean to him) is gone as soon as the talk ends, not on the next visit.
  const flagsNow = useWorldStore((s) => s.flags);
  const map = useMemo(() => withoutGone(roomMap, flagsNow), [roomMap, flagsNow]);
  /** Narration to show once the conversation closes, from a question that has one (see Question.then). */
  const afterTalk = useRef<string[] | null>(null);
  /** A flag to set once that narration's been read (Question.after). */
  const afterRead = useRef<string | null>(null);
  /** Someone to see off once the conversation closes (Question.leaves), and who's leaving now. */
  const leaving = useRef<{ id: string; flag: string } | null>(null);
  const [exit, setExit] = useState<{ id: string; flag: string } | null>(null);
  /** Doors standing open for a moment in a cutscene (the cell door, as you're shoved in). */
  const [ajar, setAjar] = useState<{ x: number; y: number }[]>([]);
  const patches = useMemo(() => [...openPatches(map, arrivalFlags), ...ajar], [map, arrivalFlags, ajar]);
  // The walking character's real level (from their habits): how hard they hit, and in the castle how hard the shadows are.
  const collection = useCollection();
  const heroLevel = collection.entries.find((e) => e.companion.id === hero)?.progress.level ?? 1;
  // The boss's bearers join the room's enemies while the fight is on.
  const fightMap = useMemo(() => {
    // every enemy takes a set number of hits, fewer the stronger you are (combat.ts hitsToBeat)
    const blow = damageFor(ATTACKS[COMPANIONS[hero].dimension], heroLevel);
    const foe = (kind: string, x: number, y: number) => ({
      kind: kind as EnemyKind,
      x,
      y,
      hp: hpFor(kind as EnemyKind, heroLevel, blow),
    });
    const enemies = map.enemies.map((e) => foe(e.kind, e.x, e.y));
    if (!bossOn || !map.boss) return enemies.length > 0 ? { ...map, enemies } : map;
    return {
      ...map,
      enemies: [
        ...enemies,
        ...map.boss.bearers.map(([x, y]) => foe(map.boss?.kind ?? 'sleeper', x, y)),
        ...(map.boss.with ?? []).map((e) => foe(e.kind, e.x, e.y)),
        // Felix, if you let him out, has told the king you're coming: more shadows stand with him
        ...(advisedBy(map.id, arrivalFlags)?.guards ?? []).map((e) => foe(e.kind, e.x, e.y)),
      ],
    };
  }, [map, bossOn, arrivalFlags, heroLevel, hero]);
  // A solved plate puzzle stays solved: its boulders start on the plates.
  const boulders = useMemo(() => {
    // Felix's maze, once you're past it: the boulders stay rolled aside, so the road is open both ways.
    if (map.id === MAZE && mazeCleared(arrivalFlags, useWorldStore.getState().discovered))
      return CLEARED_BOULDERS.map(([x, y]) => y * map.width + x);
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
    () => tilesOf(map, [...ways.map((e) => e.tile), ...(map.id === MAZE ? [CLEARING_TILE] : [])]),
    [map, ways],
  );
  const party = useMemo(() => [hero], [hero]);
  // What stands in the room and how it feels: chests (open once their flag is set), signs, the dark, the flames.
  const liveFlags = useWorldStore((s) => s.flags);
  const chests = useMemo(
    () =>
      map.objects.flatMap((o) =>
        o.type === 'chest' ? [{ x: o.x, y: o.y, open: liveFlags.includes(chestFlag(o.id)) }] : [],
      ),
    [map, liveFlags],
  );
  const signs = useMemo(() => map.objects.filter((o) => o.type === 'sign'), [map]);
  const husks = useMemo(() => brokenCocoons(map.id, liveFlags), [map, liveFlags]);
  const ambience = useMemo(() => ambienceOf(map), [map]);
  // The doorways shut for a boss fight, drawn barred.
  const sealed = useMemo(() => {
    if (!bossOn) return [];
    const letters = EXITS.filter((e) => e.from === map.id && e.walk).map((e) => e.tile);
    return tilesOf(map, letters).map((t) => ({ x: t % map.width, y: Math.floor(t / map.width) }));
  }, [bossOn, map]);
  const flames = useMemo(() => flamesOn(map), [map]);
  // Hearts for this visit: five, plus one for every four pieces found (the walker's level adds more below).
  const [pieceHearts] = useState(() => maxHearts(arrivalFlags));
  const autopilotOn = useSession((s) => s.autopilot);
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

  // The one next thing to do: shown on the World map only, never over the game itself.
  const goal = useMemo(() => nextGoal(map.id as MapId, discovered, xp), [map, discovered, xp]);
  // test builds: walk to it by yourself (test-tools.ts)
  const testLevels = useSession((s) => s.testLevels);
  const testWalk = useSession((s) => TEST_TOOLS && s.testWalk);
  useEffect(() => {
    const b = goal.mark?.box;
    sim.walkTo.set(testWalk && b ? [b.x + Math.floor((b.w - 1) / 2), b.y + Math.floor((b.h - 1) / 2)] : []);
  }, [testWalk, goal, sim]);
  // Setting foot somewhere puts it on the World map.
  useEffect(() => {
    discover(map.id as MapId);
    // Felix, hatched and never asked "What now?": once you've left the Courier Road, so has he
    // (else he'd be by his cocoon and in his maze at once, and missing from the throne room)
    const w = useWorldStore.getState();
    if (map.id !== 'courier-road' && w.flags.includes('felix-hatched') && !w.flags.includes('felix-left'))
      w.setFlag('felix-left');
  }, [map, discover]);
  const prisonIntro =
    bossOn && prison && start.map.boss
      ? PRISON_INTROS[
          start.map.boss.flag === 'pit-guards' ? (hero === 'brannoc' ? 'pit-guards-alone' : 'pit-guards') : 'pit-warden'
        ]
      : undefined;
  // The Kaldorium's welcome goes on past your excuse (dungeon.ts): the Warden's answer, once one's been picked.
  const [verdict, setVerdict] = useState<Dialogue | null>(null);
  const [said, setDialogue] = useState<Dialogue | null>(() =>
    resume
      ? null
      : !bossOn
        ? (heroIntroFor(hero) ??
          // the first time you walk in somewhere that has something to say about it (the castle's empty hall)
          (start.map.firstVisit && !arrivalFlags.includes(`seen:${start.map.id}`)
            ? {
                lines: start.map.firstVisit,
                then: () => useWorldStore.getState().setFlag(`seen:${start.map.id}`),
              }
            : null))
        : prisonIntro && start.map.boss?.flag === 'pit-guards' && hero !== 'brannoc'
          ? (() => {
              // the Warden's waiting (dungeon.ts): any excuse you like, and it's UNACCEPTABLE
              const freed = arrivalFlags.includes(CELLS_FREED);
              const fight = freed ? ARENA_FIGHT : ARENA_FIGHT_ALONE;
              return {
                lines: freed ? ARENA_WELCOME : ARENA_WELCOME_ALONE,
                choices: ARENA_EXCUSES.map((e) => ({
                  ...e,
                  then: () => setVerdict({ lines: [...ARENA_VERDICT, ...fight] }),
                })),
              };
            })()
          : prisonIntro
          ? { lines: prisonIntro.lines }
          : start.map.boss?.intro
            ? {
                speaker: start.map.boss.intro.speaker ?? undefined,
                lines: [
                  // a line of Felix's only if he's in the room to say it
                  ...start.map.boss.intro.lines.filter(aboutFelix),
                  ...(advisedBy(start.map.id, arrivalFlags)?.lines ?? []),
                  // a big moment (moments.ts): yours, walking as its hero yourself; theirs steps out after
                  // this, and ends in the fight's cue; already seen, the cue comes straight after
                  ...(() => {
                    const m = bossMoment(start.map.id, hero);
                    const cue = (BOSS_CUE[start.map.id as MapId] ?? []).filter(aboutFelix);
                    if (!m || arrivalFlags.includes(`moment:${start.map.id}`)) return cue;
                    return m.stepsOut ? [] : [...(m.moment.asThem ?? []), ...cue];
                  })(),
                ],
              }
            : bossNpc
              ? { speaker: bossNpc.name, lines: bossNpc.lines }
              : null,
  );
  // Any excuse you like: UNACCEPTABLE. The Warden's answer, once an excuse has been picked, until it's read.
  const dialogue = useMemo(
    () => said ?? (verdict ? { ...verdict, then: () => setVerdict(null) } : null),
    [said, verdict],
  );
  const dialogueRef = useRef(dialogue);
  useEffect(() => {
    dialogueRef.current = dialogue;
  }, [dialogue]);
  // Said once: a later room (or the same one, re-entered) doesn't repeat it.
  useEffect(() => {
    if (useSession.getState().heroIntro) useSession.setState({ heroIntro: null });
  }, []);

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

  // A march (march.ts) playing out: nobody moves but the people in it.
  const [cutscene, setCutscene] = useState(false);
  const marchDone = useRef<(() => void) | null>(null);
  const march = useCallback(
    (actors: Actor[], then: () => void, tilesPerSecond?: number, linger = false) => {
      setCutscene(true);
      marchDone.current = then;
      // the pause menu's speed hurries (or slows) the walk along with the dialogue
      const rate = SPEED_RATE[useWorldStore.getState().speed];
      sim.march.set(newMarch(actors, (tilesPerSecond ?? MARCH_PACE) * rate, linger));
    },
    [sim],
  );
  const onMarched = useCallback(() => {
    const then = marchDone.current;
    marchDone.current = null;
    setCutscene(false);
    then?.();
  }, []);
  // King Brannoc catches you up on the road to the end of the season (castle.ts): he runs in from
  // behind you, says his piece, and falls in.
  const rejoined = useRef(false);
  useEffect(() => {
    if (rejoined.current || map.id !== REJOIN_MAP || hero === 'brannoc' || !brannocAway(arrivalFlags)) return;
    const hx = Math.floor(sim.x.get() / TILE);
    const hy = Math.floor((sim.y.get() - 1) / TILE);
    const f = sim.facing.get();
    // He runs in from behind you, or, at the edge of the map (you arrive at the Broken Watch's top
    // edge), from whichever side has open ground for him to run along (play-test, Oct 4, 2026).
    const step = [
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
    ];
    const open = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < map.width && y < map.height && !map.solid[y * map.width + x];
    const from = [[1, 0, 3, 2][f], f, f < 2 ? 2 : 0, f < 2 ? 3 : 1].find((d) =>
      [1, 2, 3, 4].every((k) => open(hx + step[d][0] * k, hy + step[d][1] * k)),
    );
    const [dx, dy] = step[from ?? [1, 0, 3, 2][f]];
    const behind = (k: number): [number, number] => [hx + dx * k, hy + dy * k];
    // he arrives facing you; you turn to face him
    const turned = from ?? [1, 0, 3, 2][f];
    const f2 = [1, 0, 3, 2][turned];
    const row = WALKER_ROWS.brannoc;
    // (marked once it starts, not before: a cancelled timer, as in a re-run effect, mustn't use it up)
    const timer = setTimeout(() => {
      rejoined.current = true;
      march(
        [
          { row, path: [behind(5), behind(1)], face: f2 },
          { row: -1, path: [[hx, hy]], face: turned },
        ],
        () =>
          setDialogue({
            lines: BRANNOC_REJOINS,
            then: () => {
              useWorldStore.getState().setFlag(BRANNOC_REJOINED);
              march(
                [
                  { row, path: [behind(1), [hx, hy]] },
                  { row: -1, path: [[hx, hy]], face: f },
                ],
                () => {},
              );
            },
          }),
        4,
        true,
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [map, hero, arrivalFlags, sim, march]);
  // The Keeper's telephone (keeper-calls.ts): it rings once a call is due and you're free to answer.
  const [ringing, setRinging] = useState<KeeperCall | null>(null);
  const frozen = paused || dialogue !== null || cutscene || ringing !== null;
  useEffect(() => {
    sim.frozen.set(frozen);
  }, [frozen, sim]);

  const openBoard = useCallback(() => {
    save();
    keepSideways = true;
    router.push('/quest-board');
  }, [save]);

  const travel = useCallback(
    (to: Arrival, how?: 'flash') => {
      save();
      left.current = true;
      onTravel(to, how);
    },
    [save, onTravel],
  );
  // Someone with a scene of their own instead of a plain talk (the castle's gate captain); set below, once it can be.
  const specialTalk = useRef<(thing: NpcObject) => boolean>(() => false);
  const special = useCallback((thing: NpcObject) => specialTalk.current(thing), []);
  const { act, talk } = useAct(map, sim, setDialogue, save, xpRef, travel, hero, special);
  // Back from a cocoon's hatch: whoever came out of it talks to you straight away.
  useFocusEffect(
    useCallback(() => {
      const id = useSession.getState().talkAfterHatch;
      const npc = id ? map.npcs.find((n) => n.id === id) : undefined;
      if (!npc) return;
      useSession.setState({ talkAfterHatch: null });
      talk(npc, sim.facing.get());
    }, [map, sim, talk]),
  );
  const setFlag = useWorldStore((s) => s.setFlag);
  // How the walking character fights: their Path's attack, harder the more real habits they have.
  const heroPath = COMPANIONS[hero].dimension;
  // Hearts belong to the whole party, not whoever's walking (author, Oct 4, 2026): heart pieces, and
  // your overall level from every habit.
  const partyLevel = overallLevelFromXp(xp.total).level;
  const hearts = pieceHearts + levelHearts(partyLevel);
  // Picking the fight back up after a switch: your hearts as they were, each enemy with the same share
  // of it left, in the new character's hits.
  const resumeFight = useMemo(() => {
    if (!resume) return null;
    const enemies = resume.enemies.map((e, i) => {
      const n = e.slice();
      const full = fightMap.enemies[i]?.hp ?? ENEMIES[ENEMY_KINDS[e[E_KIND]]].hp;
      if (n[E_ALIVE] === 1) n[E_HP] = Math.max(1, Math.ceil(resume.left[i] * full));
      return n;
    });
    return {
      ...startFight(enemies, hearts),
      hp: Math.min(hearts, resume.hp),
      mended: resume.mended,
      rained: resume.rained,
    };
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume]);
  const fightRef = useRef<SharedValue<Fight> | null>(null);
  // Their reach grows a little with every level, too.
  const heroAttack = useMemo(() => attackFor(heroPath, heroLevel), [heroPath, heroLevel]);
  const gameParty = useGameStore((s) => s.party);
  const owned = useGameStore((s) => s.owned);
  // The moment before this boss fight (moments.ts), once the intro closes: once only, not on every retry.
  const introOver = bossOn && dialogue === null;
  useEffect(() => {
    if (!introOver) return;
    const m = bossMoment(map.id, hero);
    const flag = `moment:${map.id}`;
    const w = useWorldStore.getState();
    if (!m || w.flags.includes(flag)) return;
    // walking as them, their lines are part of the intro instead (above)
    if (!m.stepsOut || !partyWithYou(gameParty, owned, w.flags).includes(m.moment.who)) return;
    w.setFlag(flag);
    // (a line about Felix only if he's here: the room's arrival flags decide it, as for the intro)
    stepOut(sim, m.moment.who as HeroId, { lines: m.moment.lines.filter(aboutFelix) }, setDialogue);
  }, [introOver, map, hero, gameParty, owned, sim, aboutFelix]);
  // Their own move, if they have one (signatures.ts); else their Path's special at Lv 20.
  const signature = signatureOf(hero);
  const habitToday = useGameStore((s) => s.completions.some((c) => c.date === today));
  const [shouting, setShouting] = useState<{ name: string; line: string; at: number } | null>(null);
  // Special moves: one a day, three with Premium, shared by the party (specials.ts). Practising,
  // you're asked before one is spent on nothing.
  const premium = usePremium((s) => s.premium);
  const tier = premium ? 'premium' : 'free';
  const specialsUsed = useWorldStore((s) => s.specials);
  const specialsToday = specialsLeft(specialsUsed, today, tier);
  const [practiceArmed, setPracticeArmed] = useState(false);
  const onSpecial = useCallback(() => {
    useWorldStore.getState().useSpecial(today);
    setPracticeArmed(false);
  }, [today]);
  const onAskSpecial = useCallback(() => {
    const now = specialsLeft(useWorldStore.getState().specials, today, tier);
    if (now === 0) return setDialogue({ lines: noneLeft(tier) });
    setDialogue({
      lines: practiceWarning(now, tier),
      choices: [
        {
          label: 'Spend one.',
          then: () => {
            setPracticeArmed(true);
            setDialogue({ lines: ['(Charge it up, and let go.)'] });
          },
        },
        { label: 'Save it.', then: () => {} },
      ],
    });
  }, [today, tier]);
  const onSignature = useCallback(() => {
    if (!signature) return;
    if (signature.shout) setShouting({ name: COMPANIONS[hero].name, line: signature.shout, at: Date.now() });
    if (signature.kind === 'barrage') useWorldStore.getState().useBarrage(today);
  }, [signature, hero, today]);
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
  // Where you stand, to come back into the same room (a scene that changes it: travel here).
  const hereNow = useCallback(
    (): Arrival => ({
      map: map.id as MapId,
      x: Math.floor(sim.x.get() / TILE),
      y: Math.floor((sim.y.get() - 1) / TILE),
      facing: FACINGS[sim.facing.get()],
    }),
    [map, sim],
  );
  // The castle's drawbridge (castle.ts): down for good once the gate guards let you through.
  const bridgeDown = useSharedValue(arrivalFlags.includes(GATE_FLAG) ? 1 : 0);
  const drawbridge = useMemo(() => {
    const tiles = tilesOf(map, ['2']).map((t) => [t % map.width, Math.floor(t / map.width)]);
    if (map.id !== 'castle-grounds' || tiles.length === 0) return null;
    const xs = tiles.map(([x]) => x);
    const ys = tiles.map(([, y]) => y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1, down: bridgeDown };
  }, [map, bridgeDown]);
  /**
   * Who can say a Path's clever answer (author, Oct 4, 2026): it takes Lv `level` on that Path, and
   * someone of that Path to say it: you, walking as them, or a party member who steps out and does
   * the talking for you. `locked` says what's missing.
   */
  const canSay = useCallback(
    (path: Dimension, level: number): { locked?: string; who?: HeroId } => {
      const { className } = CLASSES[path];
      if (!standing({ kind: 'path', dimension: path, level }, xpRef.current).met)
        return { locked: `${className} Lv ${level}` };
      const who = COMPANIONS[hero].dimension === path ? hero : stepsIn(path, hero);
      return who ? { who } : { locked: needsSomeone(className) };
    },
    [hero],
  );
  /** Said by `who`: yourself (the plain lines), or a party member stepping out to say it their way. */
  const sayAs = useCallback(
    (who: HeroId, lines: string[], by: Partial<Record<string, string[]>> | undefined, then?: () => void) => {
      if (who === hero) return setDialogue({ lines, then });
      const said = by?.[who] ?? [`${COMPANIONS[who].name} steps up to do the talking.`, ...lines];
      stepOut(sim, who, { lines: said, then }, setDialogue);
    },
    [hero, sim],
  );
  // The gate captain: leave it to one of the core eight, ask nicely, or be rude about it.
  const gateScene = useCallback(() => {
    const lowerBridge = () => {
      // the bridge comes down, BOOM, and then it's a way in (this visit's doorways are fixed, so come back in)
      setFlag(GATE_FLAG);
      setCutscene(true);
      bridgeDown.set(withTiming(1, { duration: 2200 }));
      setTimeout(() => {
        playSound('slam');
        haptics.celebrate();
        setCutscene(false);
        setDialogue({ lines: BRIDGE_LOWERS, then: () => travel(hereNow()) });
      }, 2300);
    };
    // "Leave it to..." (author, Oct 4, 2026): one row opens the core eight, each with their own way past
    // (Lv 8 on their Path, and walking with you); the other two rows are the polite one and the mean one.
    const heroes = heroOrder(
      Object.values(DEFAULT_PARTY).flatMap((id) => {
        const a = GATE_ANSWERS.find((g) => g.path === COMPANIONS[id].dimension);
        if (!a?.path) return [];
        const locked = !standing({ kind: 'path', dimension: a.path, level: GATE_LEVEL }, xpRef.current).met
          ? `${CLASSES[a.path].className} Lv ${GATE_LEVEL}`
          : withYou(id, hero)
            ? undefined
            : `${COMPANIONS[id].name} with you`;
        return [{ id: id as HeroId, a, path: a.path, locked }];
      }),
    );
    const none = heroes.every((h) => h.locked);
    const page = (n: number) => {
      const { shown, last } = heroPage(heroes, n);
      setDialogue({
        lines: ['Who steps up?'],
        choices: [
          ...shown.map(({ id, a, path, locked }) => ({
            label: COMPANIONS[id].name,
            icon: CLASSES[path].symbol,
            locked,
            deed: a.deed,
            then: () => sayAs(id, a.lines, a.by, lowerBridge),
          })),
          last ? { label: NEVER_MIND, then: () => ask(['CAPTAIN ORSK: Well?']) } : { label: MORE, then: () => page(n + 1) },
        ],
      });
    };
    const ask = (lines: string[]) =>
      setDialogue({
        lines,
        choices: [
          { label: LEAVE_IT_TO, then: () => page(0) },
          ...GATE_ANSWERS.filter((a) => !a.path).map((a) => ({
            label: a.label,
            deed: a.deed,
            then: () => {
              // anyone's answer: mostly a no, now and then Orsk is in a good mood
              if (a.luck && Math.random() < a.luck.chance) return setDialogue({ lines: a.luck.lines, then: lowerBridge });
              setDialogue({ lines: none ? [...a.lines, GATE_NOT_YET] : a.lines });
            },
          })),
        ],
      });
    ask(GATE_OPEN);
  }, [setFlag, travel, hereNow, bridgeDown, sayAs, hero]);
  useEffect(() => {
    specialTalk.current = (thing) => {
      if (
        map.id === 'castle-grounds' &&
        thing.id === GATE_GUARD &&
        !useWorldStore.getState().flags.includes(GATE_FLAG)
      ) {
        gateScene();
        return true;
      }
      return false;
    };
  }, [map, gateScene]);
  const onWin = useCallback(() => {
    if (!map.boss) return;
    // The prison route (dungeon.ts): Brannoc is out cold on the sand while you fight.
    if (prison && hero !== 'brannoc' && map.boss.flag === 'pit-guards') {
      setDialogue({ lines: PRISON_GUARDS_DOWN, then: () => finish({ flags: ['pit-guards'] }) });
      return;
    }
    if (prison && hero !== 'brannoc' && map.boss.flag === 'pit-champion') {
      // twenty strikes, and the warden hasn't noticed; Brannoc gets up, asleep, and swings
      setDialogue({
        lines: SNOT_SWING,
        then: () => {
          setFlag('pit-champion');
          // the champion's name goes on Barnaby's bill too
          setFlag('on-the-bill');
          march(
            brannocSleepwalks(WALKER_ROWS.brannoc),
            () =>
              setDialogue({
                lines: SNOT_SWING_HIT,
                then: () => {
                  setFlag('brannoc-swung');
                  travel(hereNow());
                },
              }),
            4,
            true,
          );
        },
      });
      return;
    }
    const scene = winScene(
      map.id as MapId,
      map.boss.flag,
      partyWithYou(gameParty, owned, useWorldStore.getState().flags).includes('brannoc'),
      map.npcs.some((n) => n.id === 'felix'),
      hero === 'brannoc',
    );
    if (!scene) return;
    // whoever stepped out for it steps back in as the scene ends, however it ends
    const done = (o: Outcome) => {
      sim.cameo.set([]);
      finish(o);
    };
    const said: Dialogue = {
      lines: scene.lines,
      then: scene.outcome ? () => done(scene.outcome!) : undefined,
      choices: scene.choices?.map((c) => ({
        label: c.label,
        deed: c.deed,
        then: () => setDialogue({ lines: c.lines, then: () => done(c.outcome) }),
      })),
    };
    if (scene.stepOut && scene.stepOut !== hero) stepOut(sim, scene.stepOut as HeroId, said, setDialogue);
    else setDialogue(said);
  }, [map, gameParty, owned, finish, prison, hero, setFlag, march, travel, hereNow, sim]);
  // Brannoc wakes after his swing: will you pair up? (Asked again each time you come in, until you answer.)
  const brannocOffer = useCallback(() => {
    setDialogue({
      lines: BRANNOC_OFFER,
      choices: [
        {
          label: 'Yes.',
          deed: 'good',
          then: () => {
            // not until you've done a Physical habit: he'll wait in his cell
            if (!standing(recruitNeeds('brannoc'), xpRef.current).met) {
              setDialogue({
                speaker: 'Brannoc',
                sprite: 'brannoc',
                lines: NOT_YET.brannoc ?? [],
                then: () => {
                  setFlag(BRANNOC_WOKE);
                  setFlag(BRANNOC_DECLINED);
                  march(brannocShuffles(WALKER_ROWS.brannoc), () => {}, 1.2);
                },
              });
              return;
            }
            const { owned: have } = useGameStore.getState();
            setFlag(BRANNOC_WOKE);
            setFlag(BRANNOC_JOINED);
            setFlag(metFlag('brannoc'));
            // he hatches for you, the way new heroes do (unless he's already yours)
            if (!(have?.brannoc ?? 0)) useGameStore.getState().giftCopies(['brannoc']);
            haptics.celebrate();
            playSound('levelUp');
            setDialogue({ lines: BRANNOC_YES });
          },
        },
        {
          label: 'No.',
          then: () =>
            setDialogue({
              lines: BRANNOC_NO,
              then: () => {
                setFlag(BRANNOC_WOKE);
                setFlag(BRANNOC_DECLINED);
                march(brannocShuffles(WALKER_ROWS.brannoc), () => {}, 1.2);
              },
            }),
        },
        {
          // the mean one (honor.ts): it hurts him, and he waits in his cell all the same
          label: BRANNOC_MEAN_ASK,
          deed: 'bad',
          then: () =>
            setDialogue({
              lines: BRANNOC_MEAN,
              then: () => {
                setFlag(BRANNOC_WOKE);
                setFlag(BRANNOC_DECLINED);
                march(brannocShuffles(WALKER_ROWS.brannoc), () => {}, 1.2);
              },
            }),
        },
      ],
    });
  }, [setFlag, march, xpRef]);
  const onDefeat = useCallback(() => {
    if (map.boss) useWorldStore.getState().notice(fightNotice(map.id as MapId));
    useWorldStore.getState().setFlag('fallen');
    // You wake by the last candle you rested at, or on the Archive floor.
    const { candles, lastCandle } = useWorldStore.getState();
    const spot = candles.find((c) => c.map === lastCandle);
    const a = MAPS.archive.spawn;
    const wake: Arrival = spot ?? { map: 'archive', x: a.x, y: a.y, facing: a.facing };
    setDialogue({
      lines: [
        'Your knees give. The dark closes in.',
        spot && spot.map !== 'archive'
          ? `You wake by the candle in ${MAPS[spot.map].name}, still burning. Nothing lost. Try again when you're ready.`
          : "You wake on the Archive floor, the candles still burning. Nothing lost. Try again when you're ready.",
        fightHint(hero, heroLevel, map.id as MapId),
      ],
      then: () => travel(wake),
    });
  }, [travel, map, hero, heroLevel]);
  const setHero = useWorldStore((s) => s.setHero);
  const gone = useLeft();
  const walkers = useMemo(() => walkersFor(gameParty, owned, gone, flagsNow), [gameParty, owned, gone, flagsNow]);
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
  // Felix frames you to the king's guards (felix-maze.ts): you answer, and either walk free while he
  // laughs and dashes off, or (a wrong answer) wake in the dungeon next to Brannoc. First he gives his
  // name, you try "Mr. Himothy", and he cuts you off.
  const guardScene = useCallback(() => {
    const ask = (lines: string[]): void =>
      setDialogue({
        lines,
        choices: ANSWERS.map((a) => {
          // Too low a level, or nobody of that Path to say it: the answer shows, greyed out, so you can
          // see what your habits would unlock. A party member of that Path says it for you, their way.
          const can = a.path ? canSay(a.path, ANSWER_LEVEL) : { who: hero };
          return {
            label: a.label,
            icon: a.path ? CLASSES[a.path].symbol : undefined,
            locked: can.locked,
            deed: a.deed,
            then: () => {
              setFlag(MAZE_SOLVED);
              for (const f of a.sets ?? []) setFlag(f);
              if (a.knockout) {
                // "Timmy": no escort, he knocks you out cold, and it's black until the cell (author, Oct 4, 2026)
                setDialogue({
                  lines: a.lines,
                  then: () => {
                    setFlag(FRAMED);
                    playSound('laugh');
                    travel(KNOCKED_IN);
                  },
                });
                return;
              }
              if (a.jailed) {
                // "Seize him!" (or her): they only want you
                const seize = a.lines.map((l) => forHero(l, hero));
                setDialogue({
                  lines: seize,
                  then: () => {
                    // the guards close in on you from either side while Felix laughs (march.ts stands in
                    // for the three of them), and it goes black as they reach you (author, Oct 4, 2026: no sack)
                    setFlag(FRAMED);
                    const hx = Math.floor(sim.x.get() / TILE);
                    const hy = Math.floor((sim.y.get() - 1) / TILE);
                    playSound('laugh');
                    march(
                      [
                        { row: WALKER_ROWS.felix, path: [[24, 4]], face: 2 },
                        {
                          row: WALKER_ROWS.raider,
                          path: [
                            [25, 3],
                            [hx, hy - 1],
                          ],
                          face: 0,
                        },
                        {
                          row: WALKER_ROWS.raider,
                          path: [
                            [26, 4],
                            [26, hy + 1],
                            [hx, hy + 1],
                          ],
                          face: 1,
                        },
                        { row: -1, path: [[hx, hy]], face: 3 },
                      ],
                      () => travel(INTO_THE_CELL),
                      2.5,
                      true,
                    );
                  },
                });
                return;
              }
              // Let go: once the talk closes, Felix laughs and dashes off, and the guards go with him.
              if (can.who === hero) {
                leaving.current = { id: 'felix-maze', flag: FRAMED };
                setDialogue({ lines: [...a.lines, ...FELIX_FOILED] });
                return;
              }
              // a party member said it: they step back in, then Felix has his say and goes
              sayAs(can.who!, a.lines, a.by, () => {
                leaving.current = { id: 'felix-maze', flag: FRAMED };
                setDialogue({ lines: FELIX_FOILED });
              });
            },
          };
        }),
      });
    setDialogue({
      lines: SCENE_OPEN.map((l) => forHero(l, hero)),
      choices: [{ label: MISTER, then: () => ask(CUT_OFF) }],
    });
  }, [setFlag, travel, hero, sim, march, canSay, sayAs]);
  const onStep = useCallback(
    (tile: number) => {
      const letter = map.tiles[Math.floor(tile / map.width)][tile % map.width];
      // Past Felix's maze: it stays solved, and if Felix is waiting with the guards, here they are.
      if (map.id === MAZE && letter === CLEARING_TILE) {
        const { flags } = useWorldStore.getState();
        if (!flags.includes(MAZE_SOLVED)) setFlag(MAZE_SOLVED);
        if (scenePending(flags) && dialogueRef.current === null) guardScene();
        return;
      }
      const to = ways.find((e) => e.tile === letter)?.to;
      if (to) travel(to);
    },
    [map, ways, travel, setFlag, guardScene],
  );
  const board = map.objects.find((o) => o.type === 'board');
  // A Mage of Lv 6 sees the hidden passage by Felix's maze twinkle.
  const passageSeen = map.id === MAZE && standing(PASSAGE, xp).met;
  // The Maze Ward's holes (dungeon.ts): each twinkles once you're Mage enough to notice it.
  const holesSeen = useMemo(
    () => MAZE_HOLES.filter((h) => map.id === 'dungeon-mazes' && standing(h.needs, xp).met).map((h) => h.tile),
    [map, xp],
  );
  // A hero's room off the Archive: its door twinkles once it's open, until you've been in (hero-rooms.ts).
  // ...and again whenever they've something new to tell you, if they're in there today.
  const newsFor = useCallback(
    (id: CharacterId) => pendingNews(id, liveFlags, levelFromXp(xp.byPath[COMPANIONS[id].dimension]).level),
    [liveFlags, xp],
  );
  const newRooms = useMemo(
    () =>
      ways
        .filter((e) => {
          const owner = e.to && roomOwner(e.to.map);
          if (map.id !== 'archive' || !owner || !e.to) return false;
          if (!discovered.includes(e.to.map)) return true;
          const home = !map.npcs.some((n) => n.character === owner);
          return home && !!newsFor(owner);
        })
        .map((e) => e.tile),
    [map, ways, discovered, newsFor],
  );
  // out in the hall with news: a "!" over them, like the quest board
  const newsMarks = useMemo(
    () =>
      map.id === 'archive'
        ? map.npcs
            .filter((n) => n.id.startsWith('hall-') && n.character && newsFor(n.character))
            .map((n) => ({ x: n.x, y: n.y }))
        : [],
    [map, newsFor],
  );
  // A hidden memory you've earned and not yet seen shimmers where it waits (memories.ts).
  const remembered = useWorldStore((s) => s.memories);
  const memorySpots = useMemo(
    () =>
      MEMORIES.filter((m) => m.map === map.id && !remembered.includes(m.id) && standing(m.needs, xp).met).map(
        (m) => ({ x: m.x, y: m.y }),
      ),
    [map, remembered, xp],
  );
  const twinkles = useMemo(
    () =>
      [
        ...memorySpots,
        ...tilesOf(map, [
        ...(passageSeen ? [PASSAGE_TILE] : []),
        ...holesSeen,
        ...newRooms,
        ...(map.id === 'archive' && greenLit(liveFlags) ? [GREEN_CANDLE] : []),
        ]).map((t) => ({
          x: t % map.width,
          y: Math.floor(t / map.width),
        })),
      ],
    [map, passageSeen, holesSeen, newRooms, liveFlags, memorySpots],
  );
  // On arrival: past the maze with Felix waiting, the guard scene; at its road end, a Mage who's never
  // been through the passage wonders about the twinkle; thrown in the cell, you come to.
  const arrivedRef = useRef(false);
  useEffect(() => {
    // Once the fade in is done, so the room is seen before anyone speaks.
    const timer = setTimeout(() => {
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      const w = useWorldStore.getState();
      const tx = Math.floor(start.x / TILE);
      if (map.id === MAZE && tx >= 20 && scenePending(w.flags)) guardScene();
      else if (map.id === MAZE && tx < 5 && passageSeen && !w.flags.includes(PASSAGE_TAKEN) && !dialogueRef.current)
        setDialogue({ speaker: COMPANIONS[hero].name, sprite: hero, lines: PASSAGE_LINES.notice });
      else if (map.id === 'archive' && greenLit(w.flags) && !w.flags.includes('keeper:welcome-back')) {
        w.setFlag('keeper:welcome-back');
        // Cards or not, he tells you where you are and how you got here (you ask both), then
        // points you at the green candle (felix-maze.ts).
        const keeper = { speaker: 'The Keeper', sprite: 'keeper' as const };
        const ask = (asked: string[], cards: boolean): void => {
          const left = KEEPER_ASKS.filter((q) => !asked.includes(q.ask));
          if (left.length === 0) {
            // you're left wondering, then he points you at the candle
            setDialogue({
              speaker: COMPANIONS[hero].name,
              sprite: hero,
              lines: KEEPER_AFTERTHOUGHTS,
              then: () =>
                setDialogue({
                  ...keeper,
                  lines: KEEPER_CANDLE,
                  then: cards ? () => setDialogue({ lines: KEEPER_CARDS_END }) : undefined,
                }),
            });
            return;
          }
          // ...and, like every menu, something mean to say (honor.ts), until you've said it
          const mean = keeperWelcome.meanAsk;
          setDialogue({
            ...keeper,
            lines: asked.length > 0 ? ['Is there anything else?'] : cards ? ['Your move.'] : ['Ask whatever you like.'],
            choices: [
              ...left.map((q) => ({
                label: q.ask,
                then: () => setDialogue({ ...keeper, lines: q.answer, then: () => ask([...asked, q.ask], cards) }),
              })),
              ...(asked.includes(mean.ask)
                ? []
                : [
                    {
                      label: mean.ask,
                      deed: 'bad' as const,
                      then: () =>
                        setDialogue({ ...keeper, lines: mean.answer, then: () => ask([...asked, mean.ask], cards) }),
                    },
                  ]),
            ],
          });
        };
        setDialogue({
          ...keeper,
          lines: KEEPER_WELCOME,
          choices: [
            { label: 'Yes', then: () => setDialogue({ lines: KEEPER_CARDS, then: () => ask([], true) }) },
            { label: 'No', then: () => setDialogue({ lines: KEEPER_NO_CARDS, then: () => ask([], false) }) },
            {
              label: keeperWelcome.meanCards.ask,
              deed: 'bad',
              then: () => setDialogue({ ...keeper, lines: keeperWelcome.meanCards.answer, then: () => ask([], false) }),
            },
          ],
        });
      } else if (map.id === 'the-pit' && w.flags.includes('brannoc-swung') && !w.flags.includes(BRANNOC_WOKE))
        brannocOffer();
      else if (faints)
        setDialogue({
          lines: ALONE_WARDEN,
          then: () => {
            w.setFlag('pit-champion');
            w.setFlag('on-the-bill');
            // confused, you walk out into the town
            march(
              [
                {
                  row: -1,
                  path: [
                    [Math.floor(start.x / TILE), SAND_MIDDLE[1]],
                    SAND_MIDDLE,
                  ],
                  face: 0,
                },
              ],
              () => travel({ map: 'warrior-city', x: 31, y: 23, facing: 'down' }),
            );
          },
        });
      else if (
        map.id === 'kingdom-dungeon' &&
        tx === POTHOLE.landing.x &&
        Math.floor(start.y / TILE) === POTHOLE.landing.y &&
        !w.flags.includes(FELL_IN)
      ) {
        // Down through the Maze Ward's floor, outside Silas Seen's cell (dungeon.ts). If you've already let
        // everyone out, there's nobody left to see it.
        w.setFlag(FELL_IN);
        setDialogue({ lines: w.flags.includes(CELLS_FREED) ? POTHOLE_UNSEEN : POTHOLE_LANDING });
      } else if (map.id === 'kingdom-dungeon' && w.flags.includes(JAILED) && !w.flags.includes(JAIL_WOKE)) {
        w.setFlag(JAIL_WOKE);
        // Knocked out by Himothy: you come to already in the cell, no guards, no march.
        if (w.flags.includes(KNOCKED_OUT)) {
          setDialogue({
            lines: [...KNOCKED_WAKE, ...(hero === 'brannoc' ? [] : ESCORT_LINES.cell.slice(2))],
          });
          return;
        }
        // Marched down from the guards' stair, shoved in, and the door slams (dungeon.ts).
        // Walking as Brannoc, there's nobody in the corner but you.
        const guard = WALKER_ROWS.raider;
        const marchIn = () =>
          march(
            escortIn(guard),
            () =>
              setDialogue({
                lines: ESCORT_LINES.door,
                then: () => {
                  setAjar([CELL_DOOR]);
                  march(
                    shovedIn(guard),
                    () => {
                      setAjar([]);
                      march(guardsLeave(guard), () =>
                        setDialogue({ lines: hero === 'brannoc' ? ESCORT_LINES.alone : ESCORT_LINES.cell }),
                      );
                    },
                    5,
                    true,
                  );
                },
              }),
            3,
            true,
          );
        // the guards stand you up at the foot of the stair, then march you down (dungeon.ts)
        march(escortStand(guard), () => setDialogue({ lines: ESCORT_LINES.start, then: marchIn }), 3, true);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [map, start, guardScene, passageSeen, hero, march, brannocOffer, faints, travel]);

  const callFlags = useWorldStore((s) => s.flags);
  useEffect(() => {
    if (dialogue || cutscene || ringing || paused || bossOn) return;
    const call = callDue(callFlags);
    if (!call) return;
    // a moment's quiet after whatever just happened, then your pocket rings
    const timer = setTimeout(() => setRinging(call), 1200);
    return () => clearTimeout(timer);
  }, [callFlags, dialogue, cutscene, ringing, paused, bossOn]);

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
        pace={SPEED_RATE[speed]}
        marks={[...(unclaimed > 0 && board ? [board] : []), ...newsMarks]}
        twinkles={twinkles}
        stepTiles={stepTiles}
        onStep={onStep}
        patches={patches}
        boulders={boulders}
        plates={map.plates}
        onPlates={onPlates}
        attack={heroAttack}
        damage={damageFor(ATTACKS[heroPath], heroLevel)}
        level={heroLevel}
        special={signature?.kind ?? SPECIALS[heroPath].kind}
        specialLevel={signature ? SIGNATURE_LEVEL : undefined}
        barrageReady={habitToday && specialsToday > 0}
        specialReady={fightMap.enemies.length === 0 || specialsToday > 0}
        practiceArmed={practiceArmed}
        onSpecial={onSpecial}
        onAskSpecial={onAskSpecial}
        onSignature={onSignature}
        hearts={hearts}
        chests={chests}
        husks={husks}
        onMarched={onMarched}
        exit={exit}
        talkingTo={dialogue?.speaker ?? null}
        onExited={() => {
          if (exit) useWorldStore.getState().setFlag(exit.flag);
          setExit(null);
          // Felix gone from the maze: a blink, and the guards have marched off too.
          if (exit?.flag === FRAMED)
            travel({
              map: map.id as MapId,
              x: Math.floor(sim.x.get() / TILE),
              y: Math.floor((sim.y.get() - 1) / TILE),
              facing: FACINGS[sim.facing.get()],
            });
        }}
        signs={signs}
        ambience={ambience}
        flames={flames}
        drawbridge={drawbridge}
        resume={resumeFight}
        fightRef={fightRef}
        sealed={sealed}
        autopilot={__DEV__ && autopilotOn}
        onDefeat={onDefeat}
        boss={bossOn && map.boss ? { x: map.boss.x * TILE + TILE / 2, y: map.boss.y * TILE + TILE } : null}
        throws={bossOn && !map.boss?.kind}
        drowsy={bossOn && !map.boss?.kind ? drowsyRate(levelFromXp(xpNow.byPath.emotional).level) : 0}
        holdOut={prison && hero !== 'brannoc' && map.boss?.flag === 'pit-champion' ? WARDEN_SHRUGS : 0}
        onWin={onWin}
      />
      <VhsOverlay width={width} height={height} warm={map.id === 'archive'} />
      {!frozen && (
        <WorldControls
          scheme={controls}
          sim={sim}
          onAct={act}
          fight={{
            // always there: with nothing to fight, it's practice (author, Oct 4, 2026)
            color: CLASSES[heroPath].color,
            label: `${fightMap.enemies.length > 0 ? 'Attack' : 'Practise'}: ${ATTACK_NAMES[heroPath]}`,
            charges: heroLevel >= CHARGE_LEVEL,
          }}
          onPause={() => {
            save();
            setPaused(true);
          }}
        />
      )}
      {fightMap.enemies.length > 0 && <Hearts hp={sim.hp} max={hearts} />}
      {shouting && <SignatureShout key={shouting.at} name={shouting.name} line={shouting.line} />}
      {bossOn && !map.boss?.kind && <Drowsiness sleepy={sim.sleepy} />}
      {dialogue && (
        <DialogueBox
          key={dialogue.lines.join('|')}
          dialogue={dialogue}
          onChoice={(c) => {
            // kind and mean choices count once each (honor.ts)
            if (c.deed)
              useWorldStore
                .getState()
                .doDeed({ id: deedId(map.id, dialogue.speaker ?? 'scene', c.label), kind: c.deed });
          }}
          onClose={() => {
            setDialogue(null);
            dialogue.then?.();
            // "We need to break out": a squeak in the straw, and Brannoc goes straight through the bars.
            const w = useWorldStore.getState();
            // Already the Kaldorium's champion (you came down from the top, and maybe bent the bars yourself
            // to get in): no mouse, he just asks to come along.
            if (
              map.id === 'kingdom-dungeon' &&
              w.flags.includes(BRANNOC_BOLTS) &&
              w.flags.includes('pit-champion') &&
              !w.flags.includes(BRANNOC_JOINED)
            ) {
              setDialogue({
                lines: CHAMPION_IN_CELL,
                choices: [
                  {
                    label: 'Yes.',
                    deed: 'good',
                    then: () => {
                      if (!standing(recruitNeeds('brannoc'), xpRef.current).met) {
                        for (const f of [BARS_BENT, BRANNOC_WOKE, BRANNOC_DECLINED]) w.setFlag(f);
                        setDialogue({ speaker: 'Brannoc', sprite: 'brannocbare', lines: NOT_YET.brannoc ?? [] });
                        return;
                      }
                      for (const f of [BARS_BENT, BRANNOC_WOKE, BRANNOC_JOINED, metFlag('brannoc')]) w.setFlag(f);
                      if (!(useGameStore.getState().owned?.brannoc ?? 0))
                        useGameStore.getState().giftCopies(['brannoc']);
                      haptics.celebrate();
                      playSound('levelUp');
                      setDialogue({ lines: BRANNOC_YES, then: () => travel(hereNow()) });
                    },
                  },
                  {
                    label: 'No.',
                    then: () => {
                      for (const f of [BARS_BENT, BRANNOC_WOKE, BRANNOC_DECLINED]) w.setFlag(f);
                      setDialogue({
                        lines: ['BRANNOC: Oh.', 'BRANNOC: No, that is fair. I shall... hold the corner.'],
                      });
                    },
                  },
                  {
                    label: BRANNOC_MEAN_ASK,
                    deed: 'bad',
                    then: () => {
                      for (const f of [BARS_BENT, BRANNOC_WOKE, BRANNOC_DECLINED]) w.setFlag(f);
                      setDialogue({
                        lines: [
                          'BRANNOC: ...',
                          'BRANNOC: No. No, that is fair. I have heard worse. From myself, mostly.',
                          'BRANNOC: I shall... hold the corner.',
                        ],
                      });
                    },
                  },
                ],
              });
              return;
            }
            if (map.id === 'kingdom-dungeon' && w.flags.includes(BRANNOC_BOLTS) && !w.flags.includes(BARS_BENT)) {
              setDialogue({
                lines: ['*squeak*'],
                then: () =>
                  setDialogue({
                    speaker: 'Brannoc',
                    sprite: 'brannocbare',
                    lines: ['AAAAAAH!'],
                    then: () => {
                      // he's gone from his corner, and running
                      w.setFlag(BARS_BENT);
                      march(
                        brannocBolts(WALKER_ROWS.brannocbare),
                        () =>
                          setDialogue({
                            lines: GARY_STARTLED,
                            then: () =>
                              travel({
                                map: map.id as MapId,
                                x: Math.floor(sim.x.get() / TILE),
                                y: Math.floor((sim.y.get() - 1) / TILE),
                                facing: FACINGS[sim.facing.get()],
                              }),
                          }),
                        9,
                      );
                    },
                  }),
              });
              return;
            }
            const narration = afterTalk.current;
            const flag = afterRead.current;
            afterTalk.current = null;
            afterRead.current = null;
            const tell = () => {
              if (narration)
                setDialogue({ lines: narration, then: flag ? () => useWorldStore.getState().setFlag(flag) : undefined });
              else if (flag) useWorldStore.getState().setFlag(flag);
            };
            // "Sure. Why not." Keys in hand, you go straight along the cells unlocking them (dungeon.ts), then they empty.
            if (flag === CELLS_FREED)
              march(toTheCells(Math.floor(sim.x.get() / TILE), Math.floor(sim.y.get() / TILE)), tell);
            else tell();
            if (leaving.current) {
              // they laugh (out loud), then they're gone
              playSound('laugh');
              setExit(leaving.current);
              leaving.current = null;
            }
          }}
          onAsk={(q) => {
            if (q.sets) useWorldStore.getState().setFlag(q.sets);
            // Brannoc, asked again in his cell after you turned him down: he joins (and hatches, if he's new to you)
            if (q.sets === BRANNOC_JOINED) {
              useWorldStore.getState().setFlag(metFlag('brannoc'));
              if (!(useGameStore.getState().owned?.brannoc ?? 0)) useGameStore.getState().giftCopies(['brannoc']);
              haptics.celebrate();
            }
            if (q.then) afterTalk.current = q.then;
            if (q.after) afterRead.current = q.after;
            // a kind or mean thing to say counts once (honor.ts)
            if (q.deed)
              useWorldStore
                .getState()
                .doDeed({ id: deedId(map.id, dialogue.speaker ?? 'someone', q.ask), kind: q.deed });
            const who = q.leaves ? map.npcs.find((n) => n.questions?.includes(q)) : undefined;
            if (who && q.leaves) leaving.current = { id: who.id, flag: q.leaves };
            // Everything a character tells you goes in the World menu's lore journal.
            const speaker = dialogue.speaker;
            if (speaker) hear({ id: loreId(speaker, q.ask), speaker, ask: q.ask, answer: q.answer, at: Date.now() });
          }}
        />
      )}
      {ringing && !dialogue && (
        <PhoneCall
          caller="The Keeper"
          onAnswer={() => {
            const call = ringing;
            useWorldStore.getState().setFlag(callFlag(call));
            setRinging(null);
            // "six others like him": however many of the core eight you've still to meet (Brannoc aside)
            const met = useWorldStore.getState().flags;
            const stillOut = Object.values(DEFAULT_PARTY).filter(
              (id) => id !== 'brannoc' && !met.includes(metFlag(id)),
            ).length;
            setDialogue({
              speaker: 'The Keeper',
              sprite: 'keeper',
              lines: callLines(call, stillOut),
              then: () => setDialogue({ lines: call.end }),
            });
          }}
        />
      )}
      {paused && (
        <PauseMenu
          map={map.id as MapId}
          mapName={map.name}
          controls={controls}
          onControls={setControls}
          speed={speed}
          onSpeed={setSpeed}
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
          pieces={heartPieces(liveFlags) % PIECES_PER_HEART}
          hearts={maxHearts(liveFlags) + levelHearts(partyLevel)}
          items={satchel(liveFlags).map((id) => ({ id, name: ITEMS[id]?.name ?? id }))}
          testTools={
            TEST_TOOLS
              ? {
                  levels: testLevels,
                  walk: testWalk,
                  toggleLevels: () => useSession.setState((s) => ({ testLevels: !s.testLevels })),
                  toggleWalk: () => useSession.setState((s) => ({ testWalk: !s.testWalk })),
                }
              : undefined
          }
          autopilot={
            __DEV__
              ? { on: autopilotOn, toggle: () => useSession.setState((s) => ({ autopilot: !s.autopilot })) }
              : undefined
          }
          onRead={(id) => {
            setPaused(false);
            const item = ITEMS[id];
            setDialogue({
              lines: item?.text.length ? item.text : ['The seal is unbroken. Not yours to open, not yet.'],
            });
          }}
          onSwap={(id) => {
            // Save where you stand; the World restarts right here with them, and a fight goes on where
            // it was: same hearts, same enemies, nothing healed (session.ts carry).
            const f = fightRef.current?.get();
            if (f && f.enemies.length > 0 && !f.won && !f.fallen)
              useSession.setState({
                carry: {
                  map: map.id,
                  hp: f.hp,
                  enemies: f.enemies.map((e) => e.slice()),
                  left: f.enemies.map((e, i) => {
                    const full = fightMap.enemies[i]?.hp ?? ENEMIES[ENEMY_KINDS[e[E_KIND]]].hp;
                    return Math.max(0, Math.min(1, e[E_HP] / full));
                  }),
                  mended: f.mended,
                  rained: f.rained,
                },
              });
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
          swap={goal.path && goal.path !== heroPath ? swapHint(goal.path, gameParty, owned) : null}
          onClose={() => setMapOpen(false)}
        />
      )}
    </View>
  );
}

const OPPOSITE = [UP, DOWN, RIGHT, LEFT];

/**
 * What A (or a tap) does: talk to whoever's in front, open the quest board, or examine the tile.
 * Also hands back `talk`, to start a conversation with someone without pressing A (a fresh hatch).
 */
/**
 * A party member steps out beside you (step-aside.ts), like a helper for a field move or a hero in
 * one of their own big moments (moments.ts); `said` plays with them standing there, and they step
 * back in when it closes (or when the caller clears sim.cameo, for a scene that ends in a choice).
 */
function stepOut(sim: WorldSim, doer: HeroId, said: Dialogue, show: (d: Dialogue) => void) {
  sim.frozen.set(true);
  sim.cameo.set(newCameo(WALKER_ROWS[doer], sim.x.get(), sim.y.get(), sim.facing.get()));
  playSound('select');
  haptics.select();
  setTimeout(
    () => {
      const after = said.then;
      show({
        ...said,
        then: () => {
          sim.cameo.set([]);
          after?.();
        },
      });
    },
    STEP_ASIDE_SECONDS * 1000 + 200,
  );
}

function useAct(
  map: WorldMap,
  sim: WorldSim,
  setDialogue: (d: Dialogue) => void,
  save: () => void,
  xp: { current: XpTotals },
  onTravel: (to: Arrival, how?: 'flash') => void,
  hero: HeroId,
  /** Someone with a scene of their own: true if it took over the talk. */
  special: (thing: NpcObject) => boolean = () => false,
) {
  const busy = useRef(false);
  /** Talking to someone in the room: they turn to face you, say their piece, and the party chimes in. */
  const talk = useCallback(
    (thing: NpcObject, facing: number) => {
      const game = useGameStore.getState();
      const banter = banterFor(map.id, thing.id, partyWithYou(game.party, game.owned, useWorldStore.getState().flags));
      // they turn to face you
      sim.npcWalk.set(turnToTalk(sim.npcWalk.get(), sim.npcIds.indexOf(thing.id), OPPOSITE[facing]));
      // talking to anyone writes their part of the story on the Story scroll (tale.ts)
      useWorldStore
        .getState()
        .hear({ id: talkedId(thing.name), speaker: thing.name, ask: TALKED, answer: thing.lines, at: Date.now() });
      const after = thing.after && useWorldStore.getState().flags.includes(thing.after.flag);
      // The Keeper can also be asked how you're doing and who to bring (keeper-advice.ts).
      const keeper =
        thing.id === 'keeper' ? selectKeeperFacts(pickData(useGameStore.getState()), toDateKey(new Date())) : null;
      const general =
        thing.questions ?? (thing.character ? characterQuestions(COMPANIONS[thing.character]) : undefined);
      // In their own room off the Archive, a hero can tell you how it's going and what to do next (hero-rooms.ts).
      const owner = roomOwner(map.id);
      const w0 = useWorldStore.getState();
      const own =
        owner && thing.character === owner
          ? [
              ...roomQuestions(
                owner,
                {
                  places: w0.discovered.filter((d) => !roomOwner(d)).length,
                  met: Object.values(DEFAULT_PARTY).filter((id) => w0.flags.includes(metFlag(id))).length,
                  flags: w0.flags,
                },
                nextGoal(map.id as MapId, w0.discovered, xp.current).line,
              ),
              ...(general ?? []),
            ]
          : general;
      const questions = keeper ? [...keeperQuestions(keeper), ...(own ?? [])] : own;
      // The Keeper opens with whatever's new since you last talked (keeper-talk.ts), after his first hello.
      if (thing.id === 'keeper' && map.id === 'archive') {
        const w = useWorldStore.getState();
        if (w.flags.includes('keeper:hello')) {
          const news = keeperTalk({
            flags: w.flags,
            discovered: w.discovered,
            candlesAway: w.candles.filter((c) => c.map !== 'archive').length,
            heartPieces: heartPieces(w.flags),
            memory: habitMemory(useGameStore.getState(), toDateKey(new Date())),
            day: Math.floor(Date.now() / 86400000),
          });
          if (news.said) w.setFlag(news.said);
          setDialogue({
            speaker: thing.name,
            lines: news.lines.length ? news.lines : thing.lines,
            questions,
          });
          return;
        }
        w.setFlag('keeper:hello');
      }
      // one of the core eight with something new to tell you (hero-rooms.ts): they open with that
      const core = thing.character && Object.values(DEFAULT_PARTY).includes(thing.character) ? thing.character : null;
      const news = core
        ? pendingNews(core, w0.flags, levelFromXp(xp.current.byPath[COMPANIONS[core].dimension]).level)
        : null;
      if (news) w0.setFlag(saidFlag(news));
      setDialogue({
        speaker: thing.name,
        sprite: thing.sprite,
        lines: news ? news.lines : after ? thing.after!.lines : [...thing.lines, ...banter],
        questions,
        farewell: thing.farewell,
      });
    },
    [map, sim, setDialogue, xp],
  );
  const act = useCallback(() => {
    if (busy.current) return;
    // A job someone else does, like a field move: the walker steps aside and they walk out
    // (step-aside.ts), then the job's lines play. They step back in when the lines close.
    const fieldMove = (doer: HeroId, said: Dialogue) => {
      if (doer === hero) return setDialogue(said);
      busy.current = true;
      stepOut(sim, doer, said, (d) => {
        busy.current = false;
        setDialogue(d);
      });
    };
    const facing = sim.facing.get();
    const [tx, ty] = tileAhead(sim.x.get(), sim.y.get(), facing);
    // A hidden memory (memories.ts): once your habits have earned it, it plays, and goes in the scroll.
    const memory = memoryAt(map.id, tx, ty);
    if (memory) {
      const w = useWorldStore.getState();
      if (w.memories.includes(memory.id)) {
        setDialogue({ lines: SEEN_LINES });
      } else if (!standing(memory.needs, xp.current).met) {
        setDialogue({ lines: notYetLines(describeRequirement(memory.needs)) });
      } else {
        w.remember(memory.id);
        playSound('quest');
        haptics.celebrate();
        setDialogue({ lines: memory.lines });
      }
      return;
    }
    // People can be mid-stroll (wander.ts): look for them where they are now, then for anything else on the tile.
    // Through bars (map.talkThrough), whoever's just the other side.
    const [dx, dy] = [
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
    ][facing];
    const across = map.talkThrough?.includes(map.tiles[ty]?.[tx] ?? '')
      ? whoIsAt(map.npcs, sim.npcIds, sim.npcWalk.get(), tx + dx, ty + dy)
      : undefined;
    const thing =
      whoIsAt(map.npcs, sim.npcIds, sim.npcWalk.get(), tx, ty) ??
      across ??
      map.objects.find((o) => o.type !== 'npc' && o.x === tx && o.y === ty);
    if (thing?.type === 'npc' && special(thing)) return;
    // party members you have may chime in, after the person's own lines (see banter.ts)
    const game = useGameStore.getState();
    const banter = thing
      ? banterFor(map.id, thing.id, partyWithYou(game.party, game.owned, useWorldStore.getState().flags))
      : [];
    if (thing?.type === 'npc' && thing.job && !useWorldStore.getState().flags.includes(thing.job.flag)) {
      const job = thing.job;
      // Like a field move: if you can't, a party member of the right Path steps in.
      const doer =
        job.path === 'any' || COMPANIONS[hero].dimension === job.path ? hero : stepsIn(job.path as Dimension, hero);
      if (doer) {
        const who = COMPANIONS[doer];
        useWorldStore.getState().setFlag(job.flag);
        if (job.joins) useGameStore.getState().giftCharacters(job.joins);
        // A way out of here that this opens (the checkpoint, the Kaldorium) opens now, not next visit.
        const opens = EXITS.some((e) => e.from === map.id && e.walk && needsFlag(e.needs, job.flag));
        const here: Arrival = {
          map: map.id as MapId,
          x: Math.floor(sim.x.get() / TILE),
          y: Math.floor((sim.y.get() - 1) / TILE),
          facing: FACINGS[facing],
        };
        fieldMove(doer, {
          speaker: thing.name,
          lines: [...stepAside(hero, doer), ...job.done.map((l) => l.replace('{name}', who.name))],
          then: opens ? () => onTravel(here) : undefined,
        });
      } else {
        const hint =
          job.path in CLASSES
            ? [
                whoCan(
                  job.path as Dimension,
                  useGameStore.getState().party,
                  useGameStore.getState().owned,
                  useWorldStore.getState().flags,
                ),
              ]
            : [];
        useWorldStore.getState().notice(npcNotice(map.id as MapId, thing.id));
        setDialogue({ speaker: thing.name, lines: [...thing.lines, ...banter, ...job.cant, ...hint] });
      }
      return;
    }
    // One of the core eight, found along the road: they join you, then head home to the Archive.
    if (thing?.type === 'npc' && thing.meets && thing.character) {
      const id = thing.character;
      const flags = useWorldStore.getState().flags;
      const { owned, player } = useGameStore.getState();
      // Meeting them joins them to you in this run of the story. The collection only gains them the
      // first time ever (author, Oct 3, 2026): after a restart they're already yours, so it's unchanged.
      // not until you've done a habit of their kind (meet.ts RECRUIT_LEVEL): they send you off to do one
      if (!flags.includes(metFlag(id)) && !standing(recruitNeeds(id), xp.current).met) {
        sim.npcWalk.set(turnToTalk(sim.npcWalk.get(), sim.npcIds.indexOf(thing.id), OPPOSITE[facing]));
        setDialogue({
          speaker: thing.name,
          sprite: thing.sprite,
          lines: NOT_YET[id] ?? [
            `Come back once you've done a ${CLASSES[COMPANIONS[id].dimension].dimensionLabel} habit.`,
          ],
        });
        return;
      }
      if (!flags.includes(metFlag(id))) {
        sim.npcWalk.set(turnToTalk(sim.npcWalk.get(), sim.npcIds.indexOf(thing.id), OPPOSITE[facing]));
        if (owned !== null && !(owned[id] ?? 0)) useGameStore.getState().meetCharacters([id]);
        haptics.celebrate();
        playSound('levelUp');
        setDialogue({
          speaker: thing.name,
          lines: meetingLines(thing, player?.origin),
          then: () => useWorldStore.getState().setFlag(metFlag(id)),
        });
        return;
      }
    }
    // Brannoc, waiting in his cell after you said no: he won't come until you've done a Physical habit
    if (thing?.type === 'npc' && thing.id === 'brannoc-sulk' && !standing(recruitNeeds('brannoc'), xp.current).met) {
      setDialogue({ speaker: thing.name, sprite: thing.sprite, lines: [...thing.lines, ...(NOT_YET.brannoc ?? [])] });
      return;
    }
    if (thing?.type === 'npc') {
      talk(thing, facing);
      return;
    }
    if (thing?.type === 'sign') {
      setDialogue({ lines: [...thing.lines, ...banter] });
      return;
    }
    if (thing?.type === 'chest') {
      const { flags, setFlag } = useWorldStore.getState();
      const flag = chestFlag(thing.id);
      if (flags.includes(flag)) {
        setDialogue({ lines: ['An empty chest. You already took what was in it.'] });
        return;
      }
      setFlag(flag);
      playSound('quest');
      haptics.success();
      setDialogue({ lines: [...thing.lines, ...foundLines(thing.item, [...flags, flag])] });
      return;
    }
    // A candle: rest by it (you'll wake here if you fall), or travel to another you've rested at.
    if (isCandle(map, tx, ty)) {
      const { candles, rest } = useWorldStore.getState();
      const here = {
        map: map.id as MapId,
        x: Math.floor(sim.x.get() / TILE),
        y: Math.floor((sim.y.get() - 1) / TILE),
        facing: FACINGS[facing],
      };
      const elsewhere = [
        {
          map: 'archive' as MapId,
          x: MAPS.archive.spawn.x,
          y: MAPS.archive.spawn.y,
          facing: MAPS.archive.spawn.facing,
        },
        ...candles.filter((c) => c.map !== 'archive'),
      ].filter((c) => c.map !== map.id);
      setDialogue({
        lines: [...(map.examine[tileAt(map, tx, ty)] ?? []), 'The flame leans toward you, as if it knows you.'],
        choices: [
          {
            label: 'Rest here',
            then: () => {
              rest(here);
              haptics.success();
              setDialogue({ lines: ["You rest a while. The flame steadies. If you fall, you'll wake here."] });
            },
          },
          ...(elsewhere.length > 0
            ? [
                {
                  label: 'Travel to another candle',
                  then: () =>
                    setDialogue({
                      lines: ['Every candle you have rested by burns in your mind. Which one?'],
                      choices: [
                        ...elsewhere.map((c) => ({
                          label: MAPS[c.map].name,
                          then: () => {
                            rest(here);
                            rest(c);
                            onTravel(c);
                          },
                        })),
                        { label: 'Stay here', then: () => {} },
                      ],
                    }),
                },
              ]
            : []),
          { label: 'Leave it be', then: () => {} },
        ],
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
    // A cocoon (cocoons.ts): break it open, and whoever's inside hatches, then stands by the silk to talk.
    const cocoon = cocoonAt(map.id, tile);
    if (cocoon) {
      const { flags, setFlag } = useWorldStore.getState();
      if (flags.includes(cocoon.hatched)) {
        setDialogue({ lines: cocoon.empty });
        return;
      }
      const here: Arrival = {
        map: map.id as MapId,
        x: Math.floor(sim.x.get() / TILE),
        y: Math.floor((sim.y.get() - 1) / TILE),
        facing: FACINGS[facing],
      };
      setDialogue({
        lines: map.examine[tile] ?? [],
        choices: [
          {
            label: 'Break it open.',
            then: () => {
              setFlag(cocoon.hatched);
              save();
              // The hatch plays at once, sideways over the World, and comes back to it still sideways.
              keepSideways = true;
              const game = useGameStore.getState();
              // Someone new joins your collection right here (no wait in the reveal queue); someone you
              // already have hatches anyway (nothing is counted twice). Either way it's this hatch, now.
              if ((game.owned?.[cocoon.character] ?? 0) === 0) {
                game.meetCharacters([cocoon.character]);
                game.markRevealed([cocoon.character]);
              }
              // When the hatch closes, whoever came out talks to you.
              useSession.setState({ talkAfterHatch: cocoon.character });
              router.push({ pathname: '/reveal/[id]', params: { id: cocoon.character, preview: '1' } });
              // Re-entered behind the hatch, so they're standing by the silk when it ends.
              onTravel(here);
            },
          },
          { label: 'Leave it.', then: () => {} },
        ],
      });
      return;
    }
    if (map.id === 'field-of-banners' && tile === 'Q') {
      const s = standing(FINAL_GOAL, xp.current);
      if (s.met) {
        const { flags, setFlag } = useWorldStore.getState();
        const home = [
          { label: 'Go home.', then: () => onTravel(PORTAL_HOME.to) },
          { label: 'Not yet.', then: () => {} },
        ];
        if (flags.includes(SEASON_FLAG)) setDialogue({ lines: [...SEASON_END, ...PORTAL_HOME.lines], choices: home });
        else {
          // The last seal: your real record, the king you left, and the first memory, kept in your Satchel.
          const memory = habitMemory(useGameStore.getState(), toDateKey(new Date()));
          setFlag(SEASON_FLAG);
          setFlag(keepsakeFlag('first-memory'));
          haptics.celebrate();
          playSound('levelUp');
          // All eight stay with you through the first story; the party splits at the start of Season 2
          // (author, Oct 4, 2026: partySplit in scenes.ts, kept for then).
          setDialogue({
            lines: [
              ...seasonFinale(memory, flags),
              `${ITEMS['first-memory'].name} is in your Satchel (pause).`,
              ...PORTAL_HOME.lines,
            ],
            choices: home,
          });
        }
      } else
        setDialogue({
          lines: [...(map.examine.Q ?? []), `Season 1 ends at Overall Lv ${FINAL_GOAL.level}. ${howToProgress(s)}`],
        });
      return;
    }
    // The Maze Ward: a hole that skips a maze, if you're Mage enough to see it (dungeon.ts).
    const hole = map.id === 'dungeon-mazes' ? MAZE_HOLES.find((h) => h.tile === tile) : undefined;
    if (hole) {
      if (!standing(hole.needs, xp.current).met) {
        setDialogue({ lines: map.examine[tile] ?? [] });
        return;
      }
      setDialogue({
        speaker: COMPANIONS[hero].name,
        sprite: hero,
        lines: holeLines(hero === 'brannoc'),
        then: () =>
          setDialogue({
            lines: PASSAGE_LINES.ask,
            choices: [
              { label: 'Yes', then: () => onTravel(hole.to) },
              { label: 'No', then: () => {} },
            ],
          }),
      });
      return;
    }
    // Felix's maze: the tree that hides a passage, if you're Mage enough to see it (felix-maze.ts).
    if (map.id === MAZE && tile === PASSAGE_TILE) {
      if (!standing(PASSAGE, xp.current).met) {
        setDialogue({ lines: PASSAGE_LINES.plain });
        return;
      }
      setDialogue({
        speaker: COMPANIONS[hero].name,
        sprite: hero,
        lines: PASSAGE_LINES.found,
        // your hero thinks it; the question is put plainly, with no one's face on it
        then: () =>
          setDialogue({
            lines: PASSAGE_LINES.ask,
            choices: [
              {
                label: 'Yes',
                then: () => {
                  useWorldStore.getState().setFlag(PASSAGE_TAKEN);
                  onTravel(INTO_THE_ARCHIVE);
                },
              },
              { label: 'No', then: () => {} },
            ],
          }),
      });
      return;
    }
    // The Archive's green candle, lit once you've come through the passage: the Keeper's parting
    // words, then out past the maze, in front of Felix.
    if (map.id === 'archive' && tile === GREEN_CANDLE) {
      if (!greenLit(useWorldStore.getState().flags)) {
        setDialogue({ lines: GREEN_CANDLE_LINES.unlit });
        return;
      }
      setDialogue({
        lines: GREEN_CANDLE_LINES.lit,
        choices: [
          {
            label: 'Touch the green flame',
            then: () => {
              // Past the maze is past it: the boulders are rolled aside when you come back this way.
              useWorldStore.getState().setFlag(MAZE_SOLVED);
              setDialogue({ lines: KEEPER_PARTING, then: () => onTravel(PAST_THE_MAZE, 'flash') });
            },
          },
          // back through the passage, to the maze (the candle stays lit for when you're ready)
          { label: 'Go back the way I came', then: () => onTravel(PASSAGE_RETURN) },
        ],
      });
      return;
    }
    // A job: pull a lever, break a wall. Doing one changes the room, so it's re-entered afterwards.
    const job = jobAt(map.id as MapId, tile);
    const isExit = EXITS.some((e) => e.from === map.id && e.tile === tile);
    if (job) {
      const { flags, setFlag } = useWorldStore.getState();
      const doer = !job.path || COMPANIONS[hero].dimension === job.path ? hero : stepsIn(job.path, hero);
      if (flags.includes(job.flag)) {
        if (!isExit) {
          setDialogue({ lines: job.already });
          return;
        }
        // An opened doorway: carry on to it below.
      } else if (!doer) {
        useWorldStore.getState().notice(jobNotice(map.id as MapId, tile));
        setDialogue({
          lines: [
            ...(job.cant ?? map.examine[tile] ?? []),
            whoCan(
              job.path!,
              useGameStore.getState().party,
              useGameStore.getState().owned,
              useWorldStore.getState().flags,
            ),
          ],
        });
        return;
      } else {
        setFlag(job.flag);
        const here: Arrival = {
          map: map.id as MapId,
          x: Math.floor(sim.x.get() / TILE),
          y: Math.floor((sim.y.get() - 1) / TILE),
          facing: FACINGS[facing],
        };
        const who = COMPANIONS[doer];
        fieldMove(doer, {
          lines: [...stepAside(hero, doer), ...job.done.map((l) => l.replace('{name}', who.name))],
          then: () => onTravel(here),
        });
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
      useWorldStore.getState().notice(exitNotice(exit.id));
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
  }, [map, sim, setDialogue, save, xp, onTravel, hero, talk, special]);
  // Whatever goes wrong pressing A (a person, a sign, a door), the game carries on: it's logged, never a crash.
  const safeAct = useCallback(() => {
    try {
      act();
    } catch (e) {
      console.error('[world act]', e);
      setDialogue({ lines: ['Nothing happens.'] });
    }
  }, [act, setDialogue]);
  return { act: safeAct, talk };
}

/** True if a way out needs this story flag (on its own, or as one of several). */
function needsFlag(needs: Requirement, flag: string): boolean {
  if (needs.kind === 'flag') return needs.flag === flag;
  if (needs.kind === 'all') return needs.of.some((r) => needsFlag(r, flag));
  return false;
}

/**
 * Who steps in for a job only `path` can do, like a field move: a party
 * member of that Path you've met who can walk the World. Undefined if none.
 */
/** Whether one of the core eight is you, or walking with you right now. */
function withYou(id: CharacterId, hero: HeroId): boolean {
  if (id === hero) return true;
  const { party, owned } = useGameStore.getState();
  const flags = useWorldStore.getState().flags;
  return walkersFor(party, owned, flags, flags).includes(id as HeroId);
}

function stepsIn(path: Dimension, hero: HeroId): HeroId | undefined {
  const { party, owned } = useGameStore.getState();
  const flags = useWorldStore.getState().flags;
  return walkersFor(party, owned, flags, flags).find((h) => h !== hero && COMPANIONS[h].dimension === path);
}

/** "Ysolde steps aside. Brannoc steps up!": said first when someone else does the job. */
function stepAside(hero: HeroId, doer: HeroId): string[] {
  if (doer === hero) return [];
  return [`${COMPANIONS[hero].name} steps aside. ${COMPANIONS[doer].name} steps up!`];
}

/** Who does a job only one Path can do: whoever will step up for it, or where to meet them. */
function swapHint(path: Dimension, party: Record<Dimension, CharacterId>, owned: Owned | null): string {
  const walker = walkersFor(party, owned, [], useWorldStore.getState().flags).find(
    (h) => COMPANIONS[h].dimension === path,
  );
  if (!walker) return whereToMeet(path) ?? `Find a ${CLASSES[path].className}`;
  const name = COMPANIONS[walker].name;
  return `${name} (${CLASSES[path].className}) will step up for it`;
}

const styles = StyleSheet.create({
  drowsy: { position: 'absolute', width: 180, gap: 2 },
  shout: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#F8EACB',
    borderColor: '#2E1F14',
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  shoutName: { color: '#9A3412', fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  shoutLine: { color: '#2E1F14', fontFamily: fonts.dialogue, fontSize: 20 },
  drowsyLabel: { color: '#E8D8F0', fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  drowsyTrack: { height: 8, backgroundColor: 'rgba(20, 14, 28, 0.6)', borderWidth: 2, borderColor: '#E8D8F0' },
  drowsyFill: { height: '100%', backgroundColor: '#B89AE0' },
  hearts: { position: 'absolute', flexDirection: 'row', gap: 4 },
  fade: { backgroundColor: '#000000' },
  flash: { backgroundColor: '#FFFFFF' },
  root: { flex: 1, backgroundColor: '#0C0806' },
});

/** Hearts left, top left, while there's something to fight. */
function Hearts({ hp, max }: { hp: SharedValue<number>; max: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={[styles.hearts, { left: Math.max(insets.left, 16), top: Math.max(insets.top, 12) }]}
      accessibilityElementsHidden>
      {Array.from({ length: max }, (_, i) => (
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

/** A signature move's shout, over the hero's head for a moment, then gone. */
function SignatureShout({ name, line }: { name: string; line: string }) {
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(withTiming(1, { duration: 120 }));
    shown.set(withDelay(1500, withTiming(0, { duration: 300 })));
  }, [shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: 0.9 + 0.1 * shown.get() }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.shout, { top: Math.max(insets.top, 12) + 36 }, style]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${name}: ${line}`}>
      <Text style={styles.shoutName}>{name.toUpperCase()}</Text>
      <Text style={styles.shoutLine}>{line}</Text>
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
