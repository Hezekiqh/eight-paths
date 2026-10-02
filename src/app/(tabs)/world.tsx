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
import { VhsOverlay } from '@/components/world/vhs-overlay';
import { WorldView, npcFeet, useWorldSim, type WorldSim } from '@/components/world/world-view';
import { pickData, useGameStore } from '@/store';
import { selectKeeperFacts } from '@/store/selectors';
import { useSession } from '@/store/session';
import { useCollection, useObjectives, useToday } from '@/store/hooks';
import { CLASSES, levelFromXp, toDateKey, type Dimension } from '@/game';
import { fonts } from '@/theme';
import { advisedBy, brokenCocoons, cocoonAt } from '@/world/cocoons';
import { DOWN, LEFT, RIGHT, UP, tileAhead } from '@/world/engine';
import { turnToTalk, whoIsAt } from '@/world/wander';
import { meetingLines, metFlag, whereToMeet } from '@/world/meet';
import type { Owned } from '@/store/draws';
import { COMPANIONS, type CharacterId } from '@/story/companions';
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
import { loreId } from '@/world/lore';
import { banterFor } from '@/world/banter';
import { characterQuestions } from '@/world/talk';
import { keeperQuestions } from '@/world/keeper-advice';
import { jobAt, openPatches, openedByJobs } from '@/world/jobs';
import { useWorldHydrated, useWorldStore, type WorldPosition } from '@/world/store';
import { walkersFor, worldHero, type HeroId } from '@/world/hero';
import { exitNotice, fightHint, fightNotice, jobNotice, npcNotice, whoCan } from '@/world/notices';
import { ATTACKS, attackFor, damageFor, drowsyRate, levelHearts, type EnemyKind } from '@/world/combat';
import { CHARGE_LEVEL, SPECIALS } from '@/world/fight';
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
      <RoomGuard key={`${hero}-${trip}`} onFail={() => setPlaying(false)}>
        <World hero={hero} width={width} height={height} onTravel={travel} onMenu={() => setPlaying(false)} />
      </RoomGuard>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fade, darkStyle]} />
    </View>
  );
}

const FADE_MS = 350;

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
  return useMemo(() => [worldHero(picked, party, classDimension, owned)], [picked, party, classDimension, owned]);
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
  // A boss fight, the first time you come in: the boss has their say, then the fight is on.
  const [bossOn] = useState(() => !!start.map.boss && !(xpNow.flags ?? []).includes(start.map.boss.flag));
  // While it's on, the doorways stay shut (as in Zelda), so backing away never walks you out of it by accident.
  const [ways] = useState(() =>
    bossOn
      ? []
      : EXITS.filter((e) => e.from === start.map.id && e.walk && e.to !== null && standing(e.needs, xpNow).met),
  );
  const bossNpc = start.map.npcs.find((n) => n.after?.flag === start.map.boss?.flag);
  // The room is fixed for this visit (doing a job re-enters it), so these read the flags on arrival.
  const [arrivalFlags] = useState(() => xpNow.flags ?? []);
  const roomMap = useMemo(
    () => withOpenTiles(start.map, [...ways.map((e) => e.tile), ...openedByJobs(start.map.id as MapId, arrivalFlags)]),
    [start, ways, arrivalFlags],
  );
  // Someone who leaves for good (Nib, if you're mean to him) is gone as soon as the talk ends, not on the next visit.
  const flagsNow = useWorldStore((s) => s.flags);
  const map = useMemo(() => withoutGone(roomMap, flagsNow), [roomMap, flagsNow]);
  /** Narration to show once the conversation closes, from a question that has one (see Question.then). */
  const afterTalk = useRef<string[] | null>(null);
  /** Someone to see off once the conversation closes (Question.leaves), and who's leaving now. */
  const leaving = useRef<{ id: string; flag: string } | null>(null);
  const [exit, setExit] = useState<{ id: string; flag: string } | null>(null);
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
              // Felix, if you let him out, has told the king you're coming: two guards stand with him
              ...(advisedBy(map.id, arrivalFlags)?.guards ?? []),
            ],
          }
        : map,
    [map, bossOn, arrivalFlags],
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
  // Setting foot somewhere puts it on the World map.
  useEffect(() => {
    discover(map.id as MapId);
  }, [map, discover]);
  const [dialogue, setDialogue] = useState<Dialogue | null>(() =>
    !bossOn
      ? null
      : start.map.boss?.intro
        ? {
            speaker: start.map.boss.intro.speaker ?? undefined,
            lines: [...start.map.boss.intro.lines, ...(advisedBy(start.map.id, arrivalFlags)?.lines ?? [])],
          }
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
  const hearts = pieceHearts + levelHearts(heroLevel);
  // Their reach grows a little with every level, too.
  const heroAttack = useMemo(() => attackFor(heroPath, heroLevel), [heroPath, heroLevel]);
  const gameParty = useGameStore((s) => s.party);
  const owned = useGameStore((s) => s.owned);
  // Their own move, if they have one (signatures.ts); else their Path's special at Lv 20.
  const signature = signatureOf(hero);
  const habitToday = useGameStore((s) => s.completions.some((c) => c.date === today));
  const barrageDay = useWorldStore((s) => s.barrageDay);
  const [shouting, setShouting] = useState<{ name: string; line: string; at: number } | null>(null);
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
  const walkers = useMemo(() => walkersFor(gameParty, owned), [gameParty, owned]);
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
        attack={heroAttack}
        damage={damageFor(ATTACKS[heroPath], heroLevel)}
        level={heroLevel}
        special={signature?.kind ?? SPECIALS[heroPath].kind}
        specialLevel={signature ? SIGNATURE_LEVEL : undefined}
        barrageReady={habitToday && barrageDay !== today}
        onSignature={onSignature}
        hearts={hearts}
        chests={chests}
        husks={husks}
        exit={exit}
        onExited={() => {
          if (exit) useWorldStore.getState().setFlag(exit.flag);
          setExit(null);
        }}
        signs={signs}
        ambience={ambience}
        flames={flames}
        snuffable={map.id === 'war-hall'}
        sealed={sealed}
        autopilot={__DEV__ && autopilotOn}
        onDefeat={onDefeat}
        boss={bossOn && map.boss ? { x: map.boss.x * TILE + TILE / 2, y: map.boss.y * TILE + TILE } : null}
        throws={bossOn && !map.boss?.kind}
        drowsy={bossOn && !map.boss?.kind ? drowsyRate(levelFromXp(xpNow.byPath.emotional).level) : 0}
        onWin={onWin}
      />
      <VhsOverlay width={width} height={height} warm={map.id === 'archive'} />
      {!frozen && (
        <WorldControls
          scheme={controls}
          sim={sim}
          onAct={act}
          fight={
            fightMap.enemies.length > 0
              ? {
                  color: CLASSES[heroPath].color,
                  label: `Attack: ${ATTACK_NAMES[heroPath]}`,
                  charges: heroLevel >= CHARGE_LEVEL,
                }
              : null
          }
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
          onClose={() => {
            setDialogue(null);
            dialogue.then?.();
            const narration = afterTalk.current;
            afterTalk.current = null;
            if (narration) setDialogue({ lines: narration });
            if (leaving.current) {
              setExit(leaving.current);
              leaving.current = null;
            }
          }}
          onAsk={(q) => {
            if (q.sets) useWorldStore.getState().setFlag(q.sets);
            if (q.then) afterTalk.current = q.then;
            const who = q.leaves ? map.npcs.find((n) => n.questions?.includes(q)) : undefined;
            if (who && q.leaves) leaving.current = { id: who.id, flag: q.leaves };
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
          pieces={heartPieces(liveFlags) % PIECES_PER_HEART}
          hearts={maxHearts(liveFlags) + levelHearts(heroLevel)}
          items={satchel(liveFlags).map((id) => ({ id, name: ITEMS[id]?.name ?? id }))}
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
          swap={goal.path && goal.path !== heroPath ? swapHint(goal.path, gameParty, owned) : null}
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
  const act = useCallback(() => {
    if (busy.current) return;
    const facing = sim.facing.get();
    const [tx, ty] = tileAhead(sim.x.get(), sim.y.get(), facing);
    // People can be mid-stroll (wander.ts): look for them where they are now, then for anything else on the tile.
    const thing =
      whoIsAt(map.npcs, sim.npcIds, sim.npcWalk.get(), tx, ty) ??
      map.objects.find((o) => o.type !== 'npc' && o.x === tx && o.y === ty);
    // a party member may chime in (see banter.ts)
    const banter = thing ? banterFor(map.id, thing.id, Object.values(useGameStore.getState().party)) : [];
    if (thing?.type === 'npc' && thing.job && !useWorldStore.getState().flags.includes(thing.job.flag)) {
      const who = COMPANIONS[hero];
      const job = thing.job;
      if (job.path === 'any' || who.dimension === job.path) {
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
        setDialogue({
          speaker: thing.name,
          lines: job.done.map((l) => l.replace('{name}', who.name)),
          then: opens ? () => onTravel(here) : undefined,
        });
      } else {
        const hint = job.path in CLASSES ? [whoCan(job.path as Dimension, useGameStore.getState().party, useGameStore.getState().owned)] : [];
        useWorldStore.getState().notice(npcNotice(map.id as MapId, thing.id));
        setDialogue({ speaker: thing.name, lines: [...thing.lines, ...banter, ...job.cant, ...hint] });
      }
      return;
    }
    // One of the core eight, found along the road: they join you, then head home to the Archive.
    if (thing?.type === 'npc' && thing.meets && thing.character) {
      const id = thing.character;
      const flags = useWorldStore.getState().flags;
      if (!flags.includes(metFlag(id))) {
        sim.npcWalk.set(turnToTalk(sim.npcWalk.get(), sim.npcIds.indexOf(thing.id), OPPOSITE[facing]));
        useGameStore.getState().meetCharacters([id]);
        haptics.celebrate();
        playSound('levelUp');
        setDialogue({
          speaker: thing.name,
          lines: meetingLines(thing),
          then: () => useWorldStore.getState().setFlag(metFlag(id)),
        });
        return;
      }
    }
    if (thing?.type === 'npc') {
      // they turn to face you
      sim.npcWalk.set(turnToTalk(sim.npcWalk.get(), sim.npcIds.indexOf(thing.id), OPPOSITE[facing]));
      const after = thing.after && useWorldStore.getState().flags.includes(thing.after.flag);
      // The Keeper can also be asked how you're doing and who to bring (keeper-advice.ts).
      const keeper =
        thing.id === 'keeper' ? selectKeeperFacts(pickData(useGameStore.getState()), toDateKey(new Date())) : null;
      const own = thing.questions ?? (thing.character ? characterQuestions(COMPANIONS[thing.character]) : undefined);
      const questions = keeper ? [...keeperQuestions(keeper), ...(own ?? [])] : own;
      // The Keeper opens with whatever's new since you last talked (keeper-talk.ts), after his first hello.
      if (thing.id === 'keeper' && map.id === 'archive') {
        const w = useWorldStore.getState();
        if (w.flags.includes('keeper:hello')) {
          const talk = keeperTalk({
            flags: w.flags,
            discovered: w.discovered,
            candlesAway: w.candles.filter((c) => c.map !== 'archive').length,
            heartPieces: heartPieces(w.flags),
            memory: habitMemory(useGameStore.getState(), toDateKey(new Date())),
            day: Math.floor(Date.now() / 86400000),
          });
          if (talk.said) w.setFlag(talk.said);
          setDialogue({
            speaker: thing.name,
            lines: talk.lines.length ? talk.lines : thing.lines,
            questions,
          });
          return;
        }
        w.setFlag('keeper:hello');
      }
      setDialogue({
        speaker: thing.name,
        lines: after ? thing.after!.lines : [...thing.lines, ...banter],
        questions,
      });
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
              // The hatch plays over the World and comes back to it, still sideways.
              keepSideways = true;
              const game = useGameStore.getState();
              // Someone new joins your collection, and the reveal queue hatches them; someone you
              // already have hatches here anyway (a preview: nothing is counted twice).
              if ((game.owned?.[cocoon.character] ?? 0) > 0)
                router.push({ pathname: '/reveal/[id]', params: { id: cocoon.character, preview: '1' } });
              else game.giftCharacters([cocoon.character]);
              // Re-entered, so they're standing by the silk when the hatch ends.
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
        useWorldStore.getState().notice(jobNotice(map.id as MapId, tile));
        setDialogue({
          lines: [...(job.cant ?? map.examine[tile] ?? []), whoCan(job.path, useGameStore.getState().party, useGameStore.getState().owned)],
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
  }, [map, sim, setDialogue, save, xp, onTravel, hero]);
  // Whatever goes wrong pressing A (a person, a sign, a door), the game carries on: it's logged, never a crash.
  return useCallback(() => {
    try {
      act();
    } catch (e) {
      console.error('[world act]', e);
      setDialogue({ lines: ['Nothing happens.'] });
    }
  }, [act, setDialogue]);
}

/** True if a way out needs this story flag (on its own, or as one of several). */
function needsFlag(needs: Requirement, flag: string): boolean {
  if (needs.kind === 'flag') return needs.flag === flag;
  if (needs.kind === 'all') return needs.of.some((r) => needsFlag(r, flag));
  return false;
}

/** Who to walk as for a job only one Path can do. */
function swapHint(path: Dimension, party: Record<Dimension, CharacterId>, owned: Owned | null): string {
  const walker = walkersFor(party, owned).find((h) => COMPANIONS[h].dimension === path);
  if (!walker) return whereToMeet(path) ?? `Find a ${CLASSES[path].className}`;
  const name = COMPANIONS[walker].name;
  return `Walk as ${name} (${CLASSES[path].className}): pause, then Party`;
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
