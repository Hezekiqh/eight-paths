import {
  Atlas,
  BlendColor,
  Canvas,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Oval,
  Paint,
  Path,
  RadialGradient,
  Skia,
  vec,
  Circle,
  Rect,
  useImage,
  useRSXformBuffer,
  useRectBuffer,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  DOWN,
  PUSH_DELAY,
  EXPLORE_SPEED,
  SPEED,
  byFeet,
  extendTrail,
  facingFor,
  followerAt,
  leaningOn,
  move,
  platesCovered,
  pushBoulder,
  startTrail,
  walkFrame,
  type Grid,
} from '@/world/engine';
import { W_FACING, newWanderers, stepWanderers, strolling, wandererFeet, type Wanderer } from '@/world/wander';
import { sleepZs, snotBubble } from '@/world/sleep';
import {
  E_ALIVE,
  E_AWAKE,
  E_CLANG,
  E_DEBT,
  E_KIND,
  E_MODE,
  E_MT,
  E_STUN,
  E_X,
  E_Y,
  ENEMY_KINDS,
  EXPOSED,
  FEEL,
  HEARTS,
  PATTERNS,
  WINDUP,
  sizeOf,
  spawnEnemy,
  type Attack,
} from '@/world/combat';
import { CHARGE_TIME, startFight, stepFight, type Fight, type Special } from '@/world/fight';
import { autopilot as autoplay, newPilot, walkToward, type Pilot } from '@/world/autopilot';
import { AttackEffects } from '@/components/world/attack-effects';
import { MAX_GUTTERED, type Ambience } from '@/world/ambience';
import { playSound, type Effect } from '@/audio';
import { haptics } from '@/haptics';
import { FACINGS, TILE, type Facing, type NpcObject, type WorldMap } from '@/world/maps';
import { WALKER_FRAME, WALKER_ROWS, type WalkerId } from '@/world/walkers';
import { IDLE_SPLIT, idleDip } from '@/world/idle';
import { cameoAt } from '@/world/step-aside';
import { MARCH_ACTORS, MARCH_HEAD, marchPoses } from '@/world/march';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const WALKERS_IMAGE = require('@/assets/world/walkers.png');
const FW = WALKER_FRAME.width;
const FH = WALKER_FRAME.height;
const FEET = WALKER_FRAME.feet;
/** Numbers per sprite in a draw list (useSpriteBuffers). */
const STRIDE = 7;
/**
 * An error in the frame loop. Thrown on the UI thread it would take the whole
 * app down (Expo Go crashed this way, entering the World), so the loop catches
 * it, skips that frame, and reports it here, once per room.
 */
function reportFrameError(message: string, stack: string) {
  console.error('[world frame]', message, stack);
}

/** Most enemies flashing white at once. */
const FLASHES = 4;

type Feel = 'swing' | 'charged' | 'hit' | 'kill' | 'hurt' | 'clang' | 'roll' | 'mend' | 'slam' | 'gutter';
const SOUND: Record<Feel, Effect> = {
  swing: 'swing',
  charged: 'charged',
  hit: 'hit',
  kill: 'kill',
  hurt: 'hurt',
  clang: 'clang',
  roll: 'roll',
  mend: 'levelUp',
  slam: 'slam',
  gutter: 'gutter',
};
const BUZZ: Partial<Record<Feel, () => void>> = {
  charged: haptics.hit,
  hit: haptics.hit,
  kill: haptics.kill,
  hurt: haptics.hurt,
  clang: haptics.tap,
  slam: () => haptics.rumble('crash'),
  gutter: haptics.hit,
};
/** Combat's sound and buzz, on the React side. */
function feel(kind: Feel) {
  playSound(SOUND[kind]);
  BUZZ[kind]?.();
}

/** An NPC's feet: the middle of their tile, near its bottom edge. */
export const npcFeet = (n: { x: number; y: number }): [number, number] => [
  n.x * TILE + TILE / 2,
  n.y * TILE + TILE - 2,
];

/**
 * Everything that changes every frame, shared between the UI thread (walking,
 * drawing) and React (menus, talking, saving).
 */
export type WorldSim = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** Index into FACINGS. */
  facing: SharedValue<number>;
  /** Distance walked, for the walk cycle. */
  walked: SharedValue<number>;
  moving: SharedValue<boolean>;
  trail: SharedValue<number[]>;
  /** Each NPC where they stand or stroll, and which way they face (wander.ts), in arrival order. */
  npcWalk: SharedValue<Wanderer[]>;
  /** The NPCs' ids in that order: people can leave mid-visit, and the rows stay theirs. */
  npcIds: string[];
  /** The stick: -1 to 1 on each axis, written by the controls. */
  inputX: SharedValue<number>;
  inputY: SharedValue<number>;
  /** Paused or talking: nobody walks. */
  frozen: SharedValue<boolean>;
  /** Hearts left this visit. */
  hp: SharedValue<number>;
  /** The attack button was pressed (the frame loop takes it), and is held down (for a charged attack). */
  attackPressed: SharedValue<boolean>;
  attackHeld: SharedValue<boolean>;
  /** How long the attack's been charging, in seconds. */
  charge: SharedValue<number>;
  /** The dodge button was pressed; the frame loop takes it. */
  dodgePressed: SharedValue<boolean>;
  /** Drowsiness in Baron Plush's fight, 0 to 1. */
  sleepy: SharedValue<number>;
  /** A field move playing out (step-aside.ts): the walker steps aside and a party member walks out. Empty: none. */
  cameo: SharedValue<number[]>;
  /** A scripted walk playing out (march.ts): guards marching you to a cell, say. Empty: none. */
  march: SharedValue<number[]>;
  /** Test builds only: the tile [x, y] to walk to by itself (the guide's mark); empty: off. */
  walkTo: SharedValue<number[]>;
};

export function useWorldSim(start: { x: number; y: number; facing: Facing }, npcs: NpcObject[]): WorldSim {
  const facing = FACINGS.indexOf(start.facing);
  return {
    x: useSharedValue(start.x),
    y: useSharedValue(start.y),
    facing: useSharedValue(facing),
    walked: useSharedValue(0),
    moving: useSharedValue(false),
    trail: useSharedValue(startTrail(start.x, start.y)),
    npcWalk: useSharedValue(
      newWanderers(
        npcs.map((n) => ({
          x: n.x,
          y: n.y,
          facing: FACINGS.indexOf(n.facing),
          wander: n.wander,
          along: n.along,
          look: n.look,
        })),
      ),
    ),
    npcIds: useState(() => npcs.map((n) => n.id))[0],
    inputX: useSharedValue(0),
    inputY: useSharedValue(0),
    frozen: useSharedValue(false),
    hp: useSharedValue(HEARTS),
    attackPressed: useSharedValue(false),
    attackHeld: useSharedValue(false),
    charge: useSharedValue(0),
    dodgePressed: useSharedValue(false),
    sleepy: useSharedValue(0),
    cameo: useSharedValue<number[]>([]),
    march: useSharedValue<number[]>([]),
    walkTo: useSharedValue<number[]>([]),
  };
}

type Props = {
  map: WorldMap;
  /** Lead first, then up to three followers. */
  party: WalkerId[];
  sim: WorldSim;
  width: number;
  height: number;
  /** Screen points per art pixel. */
  scale: number;
  /** Runs the frame loop; off while the tab is hidden. */
  active: boolean;
  /** Tiles to mark with a bobbing "!", like the quest board when something's ready to claim. */
  marks?: { x: number; y: number }[];
  /** Tiles that twinkle now and then: something hidden that you're strong enough to notice (Felix's maze). */
  twinkles?: { x: number; y: number }[];
  /** Tiles (as y * width + x) that take you somewhere the moment you step on them: doorways, holes, road ends. */
  stepTiles?: number[];
  onStep?: (tile: number) => void;
  /** Tiles drawn open over the baked picture: gates raised, walls broken through. */
  patches?: { x: number; y: number }[];
  /** Where pushable boulders start (y * width + x), and the plates they're meant for. */
  boulders?: number[];
  plates?: number[];
  /** Every plate has a boulder on it. */
  onPlates?: () => void;
  /** How the walking character fights, and how hard (their real level adds damage). */
  attack?: Attack;
  damage?: number;
  /** Dev only: the fight bot plays (autopilot.ts). */
  autopilot?: boolean;
  /** Hearts to start the fight with (five, plus one per four heart pieces). */
  hearts?: number;
  /** Their real level (Lv 10 charges; Lv 20 adds their Path's special), and that special. */
  level?: number;
  special?: Special;
  /** When the charged blow becomes `special`: Lv 20 for a Path's, Lv 10 for a character's own signature. */
  specialLevel?: number;
  /** Moss can loose his Arrow Barrage in this fight (a real habit today, and not yet used today). */
  barrageReady?: boolean;
  /** A signature went off: show the shout (and spend the barrage's day). */
  onSignature?: () => void;
  /** A special move left today (specials.ts); without one the charged blow is plain. */
  specialReady?: boolean;
  /** Practising (nothing to fight here): you've said yes to spending a special on it. */
  practiceArmed?: boolean;
  /** A special went off: spend one of today's. */
  onSpecial?: () => void;
  /** Practising, a special would have gone off: ask first. */
  onAskSpecial?: () => void;
  /** Out of hearts. */
  onDefeat?: () => void;
  /** Who's talking (the dialogue's speaker): they breathe a little quicker (idle.ts). */
  talker?: string;
  /** Doorways shut for a boss fight: drawn barred. */
  sealed?: { x: number; y: number }[];
  /** Chests (open or not) and signs standing on tiles, drawn live so they can change. */
  chests?: { x: number; y: number; open: boolean }[];
  signs?: { x: number; y: number }[];
  /** Cocoons broken open (see cocoons.ts): split silk drawn over the whole one in the map's art. */
  husks?: { x: number; y: number }[];
  /** How dark it is here and what drifts in the air; every flame [x, y, light reach] (see ambience.ts). */
  ambience?: Ambience;
  flames?: number[][];
  /** Kaldor's war hall: each torch that gutters in the fight goes out, and stays out. */
  snuffable?: boolean;
  /** A boss throwing pillows from here (art pixels), drowsiness filling at `drowsy` a second, and a win when every enemy is down. */
  boss?: { x: number; y: number } | null;
  /** The boss lobs pillows (Baron Plush). */
  throws?: boolean;
  drowsy?: number;
  /** The game speed (speed.ts): times EXPLORE_SPEED, outside a fight. */
  pace?: number;
  /** The boss can only be held out against: over once an enemy has taken this many hp (fight.ts). */
  holdOut?: number;
  onWin?: () => void;
  /**
   * Someone leaving with a flourish (Felix): they laugh, shoulders shaking, then dash
   * east off the map, lightning fast. `onExited` runs once they're gone.
   */
  exit?: { id: string } | null;
  /** Who you're talking to, by name: someone asleep at their post (Gary) is awake for it. */
  talkingTo?: string | null;
  onExited?: () => void;
  /** A march (sim.march) has finished. */
  onMarched?: () => void;
  /**
   * A drawbridge (the castle, castle.ts) over the moat tiles x, y, w wide and h long (tiles), and the
   * gate over it: `down` runs 0 (raised against the gate) to 1 (lowered across the moat, gate open).
   */
  drawbridge?: { x: number; y: number; w: number; h: number; down: SharedValue<number> } | null;
  /** A fight picked back up after a change of character, instead of a fresh one (session.ts carry). */
  resume?: Fight | null;
  /** Where the fight lives, so a change of character can carry it over. */
  fightRef?: { current: SharedValue<Fight> | null };
};

/** Asleep at their post (sleep.ts), and not the one you're talking to: a chill guy wakes up for a chat. */
const dozing = (n: { asleep?: boolean; name: string }, talkingTo: string | null) => !!n.asleep && n.name !== talkingTo;

/** A march actor's "facing" for someone out cold on the ground (march.ts), and for someone carried. */
const LYING = 4;
/** How high someone carried is held off the ground, in art pixels. */
const CARRIED = 8;

/**
 * Where to put a sleeper's Zs or snot bubble (sleep.ts takes the feet of someone standing): for someone lying flat,
 * a point that puts them at the head, on the right, with the bubble at the nose, facing up.
 */
function sleeperAt([x, y]: [number, number], lying: boolean, what: 'zs' | 'snot'): [number, number] {
  'worklet';
  if (!lying) return [x, y];
  return what === 'zs' ? [x - 2, y + 8] : [x - 1, y - 2];
}

/** A leaver's laugh (seconds), then their dash (art pixels a second). */
const EXIT_LAUGH = 1.4;
const EXIT_SPEED = 520;
/** "HA" in a 3×5 pixel font, as [x, y] cells. */
const HA = [
  ...['X.X', 'X.X', 'XXX', 'X.X', 'X.X'].flatMap((row, y) => [...row].flatMap((c, x) => (c === 'X' ? [[x, y]] : []))),
  ...['.X.', 'X.X', 'XXX', 'X.X', 'X.X'].flatMap((row, y) =>
    [...row].flatMap((c, x) => (c === 'X' ? [[x + 4, y]] : [])),
  ),
];
/** Dust kicked up where a dash starts. */
const PUFF = [
  [-4, -2],
  [3, -3],
  [-1, -6],
  [5, 0],
  [-6, 1],
];

/**
 * Draws a map and everyone on it with Skia, sharp-pixelled at `scale`, and
 * runs walking on the UI thread: stick in, collisions, party follow, camera.
 */
export function WorldView({
  map,
  party,
  sim,
  width,
  height,
  scale,
  active,
  marks = [],
  twinkles = [],
  stepTiles = [],
  onStep,
  patches = [],
  boulders = [],
  plates = [],
  onPlates,
  attack,
  damage = 1,
  level = 1,
  special = 'spin',
  specialLevel,
  barrageReady = false,
  onSignature,
  specialReady = true,
  practiceArmed = false,
  onSpecial,
  onAskSpecial,
  hearts = HEARTS,
  autopilot = false,
  onDefeat,
  boss = null,
  throws = false,
  drowsy = 0,
  pace = 1,
  holdOut = 0,
  onWin,
  exit = null,
  talkingTo = null,
  onExited,
  onMarched,
  chests = [],
  signs = [],
  husks = [],
  sealed = [],
  talker,
  ambience = { darkness: 0, motes: null },
  flames = [],
  snuffable = false,
  drawbridge = null,
  resume = null,
  fightRef,
}: Props) {
  const mapImage = useImage(map.image);
  // the crowd on its feet and back down again (the Kaloseum): the second picture shows on every other beat
  const cheerImage = useImage(map.cheer ?? null);
  const walkers = useImage(WALKERS_IMAGE);
  // Walls can change while you're here (a boulder moves), so the grid lives on the UI thread.
  const solid = useSharedValue<number[]>(map.solid);
  const mapWidth = map.width;
  const mapHeight = map.height;
  const rocks = useSharedValue<number[]>(boulders);
  /** Each boulder's drawn position in art pixels, sliding toward its tile: [x, y, x, y, …]. */
  const rockPos = useSharedValue<number[]>(
    boulders.flatMap((t) => [(t % map.width) * TILE, Math.floor(t / map.width) * TILE]),
  );
  const leaning = useSharedValue(0);
  const solved = useSharedValue(platesCovered(plates, boulders));
  const plated = useMemo(() => (onPlates ? onPlates : () => {}), [onPlates]);
  /** The tile under the feet last frame, so stepping onto a doorway fires once. */
  const lastTile = useSharedValue(-1);
  const step = useMemo(() => (onStep ? onStep : () => {}), [onStep]);

  // ---- combat: the whole fight in one value, stepped by stepFight (fight.ts) each frame.
  const fight = useSharedValue<Fight>(
    resume ??
      startFight(
        map.enemies.map((e) => spawnEnemy(e.kind, ...npcFeet(e), e.hp)),
        hearts,
      ),
  );
  useEffect(() => {
    if (fightRef) fightRef.current = fight;
  }, [fight, fightRef]);
  // The hearts on screen start full (or as carried over), not at the default five, before the first frame.
  useEffect(() => {
    sim.hp.set(fight.get().hp);
  }, [sim, fight]);
  const enemyRows = useMemo(() => ENEMY_KINDS.map((k) => WALKER_ROWS[k]), []);
  const defeated = useMemo(() => (onDefeat ? onDefeat : () => {}), [onDefeat]);
  const won = useMemo(() => (onWin ? onWin : () => {}), [onWin]);
  const signed = useMemo(() => (onSignature ? onSignature : () => {}), [onSignature]);
  const spentSpecial = useMemo(() => (onSpecial ? onSpecial : () => {}), [onSpecial]);
  const askSpecial = useMemo(() => (onAskSpecial ? onAskSpecial : () => {}), [onAskSpecial]);
  // Nothing to fight in here: your attack still works, for practice (author, Oct 4, 2026).
  const practice = map.enemies.length === 0;
  const exited = useMemo(() => (onExited ? onExited : () => {}), [onExited]);
  const marched = useMemo(() => (onMarched ? onMarched : () => {}), [onMarched]);
  const bossX = boss ? boss.x : -1;
  const bossY = boss ? boss.y : -1;
  const bolts = useDerivedValue(() => fight.get().bolts);
  const flash = useDerivedValue(() => fight.get().flash);
  const ring = useDerivedValue(() => fight.get().ring);
  const shout = useDerivedValue(() => fight.get().shout);
  const pillows = useDerivedValue(() => fight.get().pillows);
  const waves = useDerivedValue(() => fight.get().waves);
  /** The attack button last frame, to see it go down and come up. */
  const wasHeld = useSharedValue(false);
  const pilot = useSharedValue<Pilot>(newPilot());
  /** The frame loop has hit an error (reported once; see reportFrameError). */
  const frameFailed = useSharedValue(false);
  // ---- game feel: the world holds for a beat on a hit, the screen shakes, struck enemies flash, fallen ones puff.
  const hitStop = useSharedValue(0);
  /** [time left, strength in art pixels], and this frame's offset [x, y]. */
  const shake = useSharedValue<number[]>([0, 0]);
  const shakeOff = useSharedValue<number[]>([0, 0]);
  /** Seconds each enemy (by index) still shows white. */
  const whiteFor = useSharedValue<number[]>(map.enemies.map(() => 0));
  /** Puffs where enemies fell: [x, y, time left]. */
  const puffs = useSharedValue<number[][]>([]);
  /** A blow shrugged off (Kaldor, guarded): a spark [x, y, time left]. */
  const sparks = useSharedValue<number[]>([0, 0, 0]);
  /** A torch guttering: the room dims for a moment (seconds left); and how many have gone out for good (war hall). */
  const gutter = useSharedValue(0);
  const guttered = useSharedValue(0);
  /** Seconds since the room opened: flames flicker and motes drift by it. */
  const clock = useSharedValue(0);
  /** The talker's row in sim.npcWalk (-1: nobody), so they breathe quicker (idle.ts). */
  const talkerRow = useSharedValue(-1);
  useEffect(() => {
    const n = talker ? map.npcs.find((o) => o.name === talker) : undefined;
    talkerRow.set(n ? sim.npcIds.indexOf(n.id) : -1);
  }, [talker, map, sim.npcIds, talkerRow]);
  /** The leaver's row in sim.npcWalk, seconds into their exit (-1: nobody leaving), and where they are: [x, y, dashing]. */
  const exitRow = useSharedValue(-1);
  const exitT = useSharedValue(-1);
  const exitAt = useSharedValue<number[]>([0, 0, 0]);
  useEffect(() => {
    exitRow.set(exit ? sim.npcIds.indexOf(exit.id) : -1);
    exitT.set(exit ? 0 : -1);
  }, [exit, sim.npcIds, exitRow, exitT]);
  const partyRows = useMemo(() => party.map((id) => WALKER_ROWS[id]), [party]);
  // [sprite row, row in sim.npcWalk] for everyone still here.
  // someone asleep at their post is drawn eyes shut (their "asleep" walker), unless you're talking to them
  const npcs = useMemo(
    () =>
      map.npcs.map(
        (n) =>
          [
            dozing(n, talkingTo)
              ? (WALKER_ROWS[`${n.sprite}asleep` as WalkerId] ?? WALKER_ROWS[n.sprite])
              : WALKER_ROWS[n.sprite],
            sim.npcIds.indexOf(n.id),
            // flat on their back while out cold (size -1: see the sprite list below)
            n.lying && dozing(n, talkingTo) ? -1 : (n.size ?? 1),
          ] as [number, number, number],
      ),
    [map, sim.npcIds, talkingTo],
  );
  const wanders = useMemo(() => map.npcs.some((n) => (n.wander ?? 0) > 0 || n.look), [map]);
  // Whoever's asleep where they stand (sleep.ts): their feet, for the Zs.
  // (each as [row in sim.npcWalk, lying flat]: wherever they are now, carried off, say)
  const sleepers = useMemo(
    () => map.npcs.filter((n) => dozing(n, talkingTo)).map((n) => [sim.npcIds.indexOf(n.id), n.lying ? 1 : 0]),
    [map, talkingTo, sim.npcIds],
  );
  // ...and those with a snot bubble too
  const snorers = useMemo(
    () =>
      map.npcs
        .filter((n) => n.snot && dozing(n, talkingTo))
        .map((n) => [sim.npcIds.indexOf(n.id), n.lying ? 1 : 0]),
    [map, talkingTo, sim.npcIds],
  );
  // One more for a party member stepping in for a job (a cameo).
  // And room for a march's actors.
  // (each NPC can take two: legs, then head and shoulders a pixel lower as they breathe)
  const count = partyRows.length + npcs.length * 2 + map.enemies.length + 1 + MARCH_ACTORS;

  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const bob = useSharedValue(0);
  /** Four numbers per walker, back to front: sheet x, sheet y, screen x, screen y. */
  const drawList = useSharedValue<number[]>([]);
  /** The same, for the struck enemies drawn again in white on top, and the ones winding up in red. */
  const flashList = useSharedValue<number[]>([]);
  const redList = useSharedValue<number[]>([]);
  /** Where Kaldor's shadow has come back: [x, y, …]. */
  const shadowAt = useSharedValue<number[]>([]);

  const viewW = width / scale;
  const viewH = height / scale;
  const mapW = map.width * TILE;
  const mapH = map.height * TILE;

  const frame = useFrameCallback((info) => {
    'worklet';
    try {
      const realDt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.05);
      // Hit-stop: for a beat after a hit lands, nothing moves (but flashes, puffs and the shake play on).
      const stopped = hitStop.get() > 0;
      hitStop.set(Math.max(0, hitStop.get() - realDt));
      const dt = stopped ? 0 : realDt;
      // Dev autopilot: the fight bot drives the stick and the buttons while there's something to fight.
      const fightNow = fight.get();
      // Doorways count as walls to the autopilot (for its path and its steps), so it never walks out of a fight.
      const pilotSolid = autopilot ? solid.get().map((v, i) => (stepTiles.includes(i) ? 1 : v)) : null;
      const auto =
        autopilot && attack && !fightNow.fallen && !fightNow.won
          ? autoplay(
              pilot.get(),
              fightNow,
              sim.x.get(),
              sim.y.get(),
              attack,
              level,
              { solid: pilotSolid ?? solid.get(), width: mapWidth, height: mapHeight },
              realDt,
            )
          : null;
      if (auto) pilot.set(auto.pilot);
      let ix = auto ? auto.stickX : sim.inputX.get();
      let iy = auto ? auto.stickY : sim.inputY.get();
      // test builds: with nobody on the stick, walk to the guide's mark (test-tools.ts)
      const goTo = sim.walkTo.get();
      if (!auto && goTo.length === 2 && ix === 0 && iy === 0) {
        const w = walkToward(
          { solid: solid.get(), width: mapWidth, height: mapHeight },
          sim.x.get(),
          sim.y.get(),
          goTo[0],
          goTo[1],
        );
        ix = w[0];
        iy = w[1];
      }
      const frozen = sim.frozen.get();
      // Dazed by a shout, mid-roll, or down: the stick does nothing for a moment.
      const fighting = fight.get();
      if (frozen || fighting.dazed > 0 || fighting.roll > 0 || fighting.fallen) {
        ix = 0;
        iy = 0;
      }
      const push = Math.hypot(ix, iy);
      // In a fight you walk at the pace the fights are tuned to; otherwise at the game speed.
      const battling = !fighting.won && fighting.enemies.some((e) => e[E_ALIVE] === 1);
      const walk = battling ? SPEED : EXPLORE_SPEED * pace;
      let moving = false;
      if (push > 0.25) {
        sim.facing.set(facingFor(ix, iy, sim.facing.get()));
        const grid: Grid = { solid: auto && pilotSolid ? pilotSolid : solid.get(), width: mapWidth, height: mapHeight };
        // Straight into a boulder: lean on it (below) instead of being eased round it.
        const against = leaningOn(grid, rocks.get(), sim.x.get(), sim.y.get(), sim.facing.get()) !== -1;
        const [nx, ny] = against
          ? [sim.x.get(), sim.y.get()]
          : move(grid, sim.x.get(), sim.y.get(), (ix / push) * walk * dt, (iy / push) * walk * dt);
        const d = Math.abs(nx - sim.x.get()) + Math.abs(ny - sim.y.get());
        if (d > 0.001) {
          moving = true;
          sim.x.set(nx);
          sim.y.set(ny);
          sim.walked.set(sim.walked.get() + d);
          sim.trail.set(extendTrail(sim.trail.get(), nx, ny));
        }
      }
      sim.moving.set(moving);
      // The autopilot faces its target, whichever way it's stepping.
      if (auto) sim.facing.set(auto.facing);

      // Stepping onto a doorway, hole or road end takes you through it.
      const tile = Math.floor((sim.y.get() - 1) / TILE) * mapWidth + Math.floor(sim.x.get() / TILE);
      if (tile !== lastTile.get()) {
        const first = lastTile.get() === -1;
        lastTile.set(tile);
        if (!first && moving && stepTiles.includes(tile)) scheduleOnRN(step, tile);
      }

      // Leaning on a boulder, straight on, for a moment pushes it a tile.
      let leanedOn = -1;
      if (push > 0.25 && !moving && rocks.get().length > 0) {
        const grid: Grid = { solid: solid.get(), width: mapWidth, height: mapHeight };
        leanedOn = leaningOn(grid, rocks.get(), sim.x.get(), sim.y.get(), sim.facing.get());
      }
      if (leanedOn === -1) leaning.set(0);
      else {
        leaning.set(leaning.get() + dt);
        if (leaning.get() >= PUSH_DELAY) {
          leaning.set(0);
          const f = sim.facing.get();
          const dx = f === 2 ? -1 : f === 3 ? 1 : 0;
          const dy = f === 1 ? -1 : f === 0 ? 1 : 0;
          const pushed = pushBoulder(solid.get(), mapWidth, mapHeight, rocks.get(), leanedOn, dx, dy);
          if (pushed) {
            solid.set(pushed.solid);
            rocks.set(pushed.boulders);
            if (!solved.get() && platesCovered(plates, pushed.boulders)) {
              solved.set(true);
              scheduleOnRN(plated);
            }
          }
        }
      }

      // ---- combat: your attack, bolts, the enemies' turn, all in stepFight; then its sounds, flashes and shakes.
      const held = auto ? auto.held : sim.attackHeld.get();
      const pressed = auto ? auto.press : sim.attackPressed.get();
      const dodge = auto ? auto.dodge : sim.dodgePressed.get();
      sim.attackPressed.set(false);
      sim.dodgePressed.set(false);
      const release = auto ? auto.release : wasHeld.get() && !held;
      wasHeld.set(held);
      if (
        !frozen &&
        attack &&
        (practice || fight.get().enemies.length > 0) &&
        !fight.get().fallen &&
        !fight.get().won
      ) {
        const grid: Grid = { solid: solid.get(), width: mapWidth, height: mapHeight };
        const r = stepFight(
          fight.get(),
          {
            x: sim.x.get(),
            y: sim.y.get(),
            facing: sim.facing.get(),
            stickX: ix,
            stickY: iy,
            moved: moving,
            press: pressed,
            held,
            release,
            dodge,
          },
          {
            grid,
            attack,
            damage,
            level,
            special,
            specialLevel,
            barrageReady,
            specialReady,
            practice,
            practiceArmed,
            boss: bossX >= 0,
            bossX,
            bossY,
            throws,
            drowsy,
            holdOut,
            maxHp: hearts,
          },
          dt,
        );
        const f = r.fight;
        const ev = r.events;
        fight.set(f);
        if (ev.moveX !== 0 || ev.moveY !== 0) {
          const [nx, ny] = move(grid, sim.x.get(), sim.y.get(), ev.moveX, ev.moveY);
          sim.x.set(nx);
          sim.y.set(ny);
          sim.trail.set(extendTrail(sim.trail.get(), nx, ny));
          if (ev.moveX !== 0 || ev.moveY !== 0) sim.walked.set(sim.walked.get() + Math.hypot(ev.moveX, ev.moveY));
        }
        if (sim.hp.get() !== f.hp) sim.hp.set(f.hp);
        if (sim.sleepy.get() !== f.sleepy) sim.sleepy.set(f.sleepy);
        sim.charge.set(f.charge);
        if (ev.swing) scheduleOnRN(feel, ev.charged ? 'charged' : 'swing');
        if (ev.rolled) scheduleOnRN(feel, 'roll');
        if (ev.mended) scheduleOnRN(feel, 'mend');
        if (ev.signature) scheduleOnRN(signed);
        if (ev.special) scheduleOnRN(spentSpecial);
        if (ev.askSpecial) scheduleOnRN(askSpecial);
        // Debt paid: the debtor flashes, a light tap, and a puff if that was the last of them.
        if (ev.ticked.length > 0 && ev.hits === 0) {
          const white = whiteFor.get().slice();
          for (const i of ev.ticked) white[i] = FEEL.flash;
          whiteFor.set(white);
          if (ev.kills > 0) {
            const next = puffs.get().slice(-3);
            for (let k = 0; k < ev.fell.length; k += 2) next.push([ev.fell[k], ev.fell[k + 1], FEEL.puff]);
            puffs.set(next);
          }
          scheduleOnRN(feel, ev.kills > 0 ? 'kill' : 'hit');
        }
        if (ev.hits > 0) {
          const kill = ev.kills > 0;
          hitStop.set(ev.big ? FEEL.bigStop : kill ? FEEL.killStop : FEEL.hitStop);
          const strength = ev.big || kill ? FEEL.killShake : FEEL.hitShake;
          if (strength >= shake.get()[1] || shake.get()[0] <= 0) shake.set([FEEL.shakeTime, strength]);
          const white = whiteFor.get().slice();
          for (const i of ev.struck) white[i] = FEEL.flash;
          whiteFor.set(white);
          if (kill) {
            const next = puffs.get().slice(-3);
            for (let k = 0; k < ev.fell.length; k += 2) next.push([ev.fell[k], ev.fell[k + 1], FEEL.puff]);
            puffs.set(next);
          }
          scheduleOnRN(feel, kill ? 'kill' : 'hit');
        } else if (ev.clangs > 0) {
          scheduleOnRN(feel, 'clang');
          const e = f.enemies.find((x) => x[E_CLANG] === 1);
          if (e) sparks.set([e[E_X], e[E_Y] - 10, 0.15]);
        }
        // A drill sergeant's echo bellows: felt as a scream, even if it misses you.
        if (ev.shout) scheduleOnRN(haptics.rumble, 'scream');
        if (ev.slam) {
          shake.set([FEEL.shakeTime * 1.5, FEEL.hurtShake]);
          scheduleOnRN(feel, 'slam');
        }
        if (ev.guttered) {
          gutter.set(0.5);
          if (snuffable) guttered.set(Math.min(MAX_GUTTERED, guttered.get() + 1));
          scheduleOnRN(feel, 'gutter');
        }
        if (ev.hurt) {
          shake.set([FEEL.shakeTime * 1.5, FEEL.hurtShake]);
          hitStop.set(FEEL.hitStop);
          scheduleOnRN(feel, 'hurt');
        }
        if (ev.fallen) scheduleOnRN(defeated);
        if (ev.won) scheduleOnRN(won);
      }
      // Feel timers run on real time, so they play through the hit-stop.
      const quake = shake.get();
      if (quake[0] > 0) {
        shake.set([Math.max(0, quake[0] - realDt), quake[1]]);
        shakeOff.set([Math.round((Math.random() * 2 - 1) * quake[1]), Math.round((Math.random() * 2 - 1) * quake[1])]);
      } else if (shakeOff.get()[0] !== 0 || shakeOff.get()[1] !== 0) shakeOff.set([0, 0]);
      if (sparks.get()[2] > 0) sparks.set([sparks.get()[0], sparks.get()[1], Math.max(0, sparks.get()[2] - realDt)]);
      if (gutter.get() > 0) gutter.set(Math.max(0, gutter.get() - realDt));
      const white = whiteFor.get();
      if (white.some((w) => w > 0)) whiteFor.set(white.map((w) => Math.max(0, w - realDt)));
      if (puffs.get().length > 0) {
        puffs.set(
          puffs
            .get()
            .map((p) => [p[0], p[1], p[2] - realDt])
            .filter((p) => p[2] > 0),
        );
      }

      // Boulders slide toward their tiles.
      const rp = rockPos.get();
      const rs = rocks.get();
      if (rs.length > 0) {
        const next = rp.slice();
        let changed = false;
        const slide = 96 * dt;
        for (let i = 0; i < rs.length; i++) {
          const targets = [(rs[i] % mapWidth) * TILE, Math.floor(rs[i] / mapWidth) * TILE];
          for (let k = 0; k < 2; k++) {
            const d = targets[k] - next[i * 2 + k];
            if (d !== 0) {
              next[i * 2 + k] += Math.abs(d) <= slide ? d : Math.sign(d) * slide;
              changed = true;
            }
          }
        }
        if (changed) rockPos.set(next);
      }

      // Townsfolk stroll and look about (wander.ts), but not while you're talking or paused.
      if (wanders && !frozen) {
        const walked = stepWanderers(
          sim.npcWalk.get(),
          solid.get(),
          mapWidth,
          mapHeight,
          sim.x.get(),
          sim.y.get(),
          dt,
          stepTiles,
        );
        sim.npcWalk.set(walked.rows);
        if (walked.solid !== solid.get()) solid.set(walked.solid);
      }

      // The camera follows the lead and stops at the map's edges (or centres a small map).
      const round = (v: number) => Math.round(v * scale) / scale;
      const cx = mapW <= viewW ? (mapW - viewW) / 2 : Math.min(Math.max(sim.x.get() - viewW / 2, 0), mapW - viewW);
      const cy = mapH <= viewH ? (mapH - viewH) / 2 : Math.min(Math.max(sim.y.get() - 12 - viewH / 2, 0), mapH - viewH);
      camX.set(round(cx));
      camY.set(round(cy));
      bob.set(Math.floor(info.timestamp / 350) % 2);
      clock.set(clock.get() + realDt);
      if (exitT.get() >= 0) exitT.set(exitT.get() + realDt);

      // Everyone this frame: [row, facing, frame, x, y], drawn back to front by their feet.
      // Each: [row, facing, frame, x, y, tint (0 none, 1 white: struck, 2 red: winding up), size].
      const ents: number[][] = [];
      const walkers = sim.npcWalk.get();
      for (let i = 0; i < npcs.length; i++) {
        const w = walkers[npcs[i][1]];
        if (!w) continue;
        const [fx, fy] = wandererFeet(w);
        // the one leaving: a laugh (a shake and a hop, facing you), then a dash east
        const et = npcs[i][1] === exitRow.get() ? exitT.get() : -1;
        if (et >= 0 && et < EXIT_LAUGH) {
          const beat = Math.floor(et * 12);
          const lx = fx + (beat % 2 === 1 ? 1 : -1);
          const ly = fy - (beat % 3 === 0 ? 2 : 0);
          exitAt.set([lx, ly, 0]);
          ents.push([npcs[i][0], 0, 0, lx, ly, 0, 1]);
          continue;
        }
        if (et >= EXIT_LAUGH) {
          const d = (et - EXIT_LAUGH) * EXIT_SPEED;
          exitAt.set([fx + d, fy, d]);
          if (fx + d > mapW + 24) {
            exitT.set(-1);
            scheduleOnRN(exited);
          }
          ents.push([npcs[i][0], 3, walkFrame(d, true), fx + d, fy, 0, 1]);
          continue;
        }
        // standing about, they breathe (never while strolling, nor lying down)
        const dip = strolling(w) || npcs[i][2] < 0 ? 0 : idleDip(clock.get(), i, npcs[i][1] === talkerRow.get());
        ents.push([npcs[i][0], w[W_FACING], walkFrame(fx + fy, strolling(w)), fx, fy, 0, npcs[i][2], dip]);
      }
      const whites = whiteFor.get();
      const now = fight.get();
      const all = now.enemies;
      const shadows: number[] = [];
      for (let i = 0; i < all.length; i++) {
        const e = all[i];
        if (e[E_ALIVE] === 0) continue;
        const toward = facingFor(sim.x.get() - e[E_X], sim.y.get() - e[E_Y], DOWN);
        // The tell: a winding-up enemy blinks red and stands still.
        const tell = e[E_MODE] === WINDUP && Math.floor(e[E_MT] * 12) % 2 === 0;
        const tint = (whites[i] ?? 0) > 0 ? 1 : tell ? 2 : 0;
        const stepping = e[E_AWAKE] === 1 && e[E_MODE] !== WINDUP && e[E_MODE] !== EXPOSED && e[E_STUN] === 0;
        ents.push([
          enemyRows[e[E_KIND]],
          toward,
          walkFrame(e[E_X] + e[E_Y], stepping),
          e[E_X],
          e[E_Y],
          tint,
          sizeOf(e),
        ]);
        // Kaldor casts no shadow, until a torch gutters.
        if (e[E_MODE] === EXPOSED && ENEMY_KINDS[e[E_KIND]] === 'kaldor') shadows.push(e[E_X], e[E_Y]);
      }
      shadowAt.set(shadows);
      for (let k = partyRows.length - 1; k >= 1; k--) {
        const [fx, fy, ff] = followerAt(sim.trail.get(), k, sim.facing.get());
        ents.push([partyRows[k], ff, walkFrame(sim.walked.get() + k * 5, moving), fx, fy, 0, 1]);
      }
      // A march: everyone in it walks their path; you too, if you're in it.
      const march = sim.march.get();
      let leadWalking = false;
      if (march.length > MARCH_HEAD) {
        const t = march[0] + realDt;
        const { poses, done } = marchPoses(march, t);
        for (const [row, facing, frame, x, y, walking] of poses) {
          // out cold on the sand (4), or carried off, held up off it (5): drawn in front of whoever carries them
          if (row >= 0 && facing >= LYING) {
            ents.push([row, 0, 0, x, y + 0.5, 0, facing === LYING ? -1 : -2]);
            continue;
          }
          if (row >= 0) {
            ents.push([row, facing, frame, x, y, 0, 1]);
            continue;
          }
          if (walking === 1) sim.walked.set(sim.walked.get() + Math.hypot(x - sim.x.get(), y - sim.y.get()));
          sim.x.set(x);
          sim.y.set(y);
          sim.facing.set(facing);
          leadWalking = walking === 1;
        }
        if (done && march[3] === 0) {
          sim.march.set([]);
          sim.trail.set(startTrail(sim.x.get(), sim.y.get()));
          scheduleOnRN(marched);
        } else {
          // still walking; or there, and lingering until the next march (reported once)
          const next = march.slice();
          next[0] = t;
          if (done && march[4] === 0) {
            next[4] = 1;
            sim.trail.set(startTrail(sim.x.get(), sim.y.get()));
            scheduleOnRN(marched);
          }
          sim.march.set(next);
        }
      }
      // A field move: the lead sidesteps while the party member the job needs walks into their place.
      const cameo = sim.cameo.get();
      let asideX = 0;
      let asideY = 0;
      if (cameo.length === 9) {
        const pose = cameoAt(cameo, realDt);
        if (pose[0] !== cameo[8]) {
          sim.cameo.set([cameo[0], cameo[1], cameo[2], cameo[3], cameo[4], cameo[5], cameo[6], cameo[7], pose[0]]);
        }
        asideX = pose[1];
        asideY = pose[2];
        if (pose[6] === 1) ents.push([cameo[0], cameo[7], pose[5], pose[3], pose[4], 0, 1]);
      }
      // the lead goes last so they're drawn on top of a follower standing in the same spot;
      // just hurt, they blink until they can be hurt again; striking, they lean into the blow
      const blink = now.mercy > 0 && now.roll === 0 && Math.floor(now.mercy * 14) % 2 === 0;
      if (!blink) {
        const lean = now.flash[3] > 0 && attack?.kind === 'melee' ? 2 : 0;
        const f = sim.facing.get();
        const lx = f === 2 ? -lean : f === 3 ? lean : 0;
        const ly = f === 1 ? -lean : f === 0 ? lean : 0;
        ents.push([
          partyRows[0],
          f,
          walkFrame(sim.walked.get(), moving || leadWalking || now.roll > 0),
          sim.x.get() + lx + asideX,
          sim.y.get() + ly + asideY,
          0,
          1,
        ]);
      }
      ents.sort(byFeet);
      const list: number[] = [];
      const lit: number[] = [];
      const red: number[] = [];
      for (const [row, facing, f, x, y, tint, size, dip] of ents) {
        // size -1: flat on their back, head to the right, along the ground; -2: the same, held up off it
        const item =
          size < 0
            ? [(facing * 3 + f) * FW, row * FH, round(x + FH / 2), round(y - FW + 2 - (size < -1 ? CARRIED : 0)), -1, 0, FH]
            : [(facing * 3 + f) * FW, row * FH, round(x - (FW * size) / 2), round(y - FEET * size), size, 0, FH];
        if (dip) {
          // breathing: the legs where they are, the head and shoulders a pixel lower over them
          list.push(item[0], item[1], item[2], item[3] + IDLE_SPLIT * size, size, IDLE_SPLIT, FH - IDLE_SPLIT);
          list.push(item[0], item[1], item[2], item[3] + dip * size, size, 0, IDLE_SPLIT);
        } else list.push(...item);
        if (tint === 1 && lit.length < FLASHES * STRIDE) lit.push(...item);
        if (tint === 2 && red.length < FLASHES * STRIDE) red.push(...item);
      }
      drawList.set(list);
      flashList.set(lit);
      redList.set(red);
    } catch (e) {
      if (!frameFailed.get()) {
        frameFailed.set(true);
        scheduleOnRN(reportFrameError, String((e as Error)?.message ?? e), String((e as Error)?.stack ?? ''));
      }
    }
  }, false);

  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  const [sprites, transforms] = useSpriteBuffers(drawList, count);
  const [flashSprites, flashTransforms] = useSpriteBuffers(flashList, FLASHES);
  const [redSprites, redTransforms] = useSpriteBuffers(redList, FLASHES);
  const puffPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (const [x, y, t] of puffs.get()) {
      const p = 1 - t / FEEL.puff;
      const size = Math.max(1, Math.round(3 * (1 - p)) + 1);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const r = 3 + 11 * p;
        path.addRect(
          Skia.XYWHRect(Math.round(x + Math.cos(a) * r), Math.round(y - 8 + Math.sin(a) * r * 0.8), size, size),
        );
      }
    }
    return path;
  });

  // Kaldor's shadow, back while a torch is out; Aurek's slams spreading; a charged blow's ring; a clang's spark.
  const shadowPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const at = shadowAt.get();
    for (let k = 0; k < at.length; k += 2) path.addOval(Skia.XYWHRect(at[k] - 8, at[k + 1] - 3, 16, 5));
    return path;
  });
  const wavePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (const w of waves.get()) {
      const r = PATTERNS.wave.radius * Math.min(1, w[2] / PATTERNS.wave.grow);
      path.addOval(Skia.XYWHRect(w[0] - r, w[1] - r * 0.6, r * 2, r * 1.2));
    }
    return path;
  });
  const ringX = useDerivedValue(() => ring.get()[0]);
  const ringY = useDerivedValue(() => ring.get()[1]);
  const ringR = useDerivedValue(() => {
    const g = ring.get();
    return g[4] > 0 ? g[2] * (1.1 - (0.6 * g[3]) / g[4]) : 0;
  });
  const ringO = useDerivedValue(() => (ring.get()[4] > 0 ? ring.get()[3] / ring.get()[4] : 0));
  const glowX = useDerivedValue(() => sim.x.get());
  const glowY = useDerivedValue(() => sim.y.get() - 9);
  const glowR = useDerivedValue(() => 4 + Math.min(1, sim.charge.get() / CHARGE_TIME) * 8);
  const glowO = useDerivedValue(() => {
    const c = sim.charge.get();
    if (c < 0.12) return 0;
    if (c >= CHARGE_TIME) return 0.45 + 0.35 * (Math.floor(c * 10) % 2);
    return 0.35 * (c / CHARGE_TIME);
  });
  const sparkPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const [x, y, t] = sparks.get();
    if (t > 0) {
      const r = 3 + (0.15 - t) * 30;
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        path.addRect(Skia.XYWHRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2));
      }
    }
    return path;
  });
  const dim = useDerivedValue(() => gutter.get() * 1.2);
  // Ysolde's debt: a gold coin bobbing over everyone who still owes.
  const debtPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const lift = Math.floor(clock.get() * 4) % 2;
    for (const e of fight.get().enemies) {
      if (e[E_ALIVE] === 0 || !(e[E_DEBT] > 0)) continue;
      const top = e[E_Y] - FEET * sizeOf(e) - 5 - lift;
      path.addOval(Skia.XYWHRect(Math.round(e[E_X]) - 2, Math.round(top), 5, 5));
    }
    return path;
  });
  // Moss's barrage: each arrow dropping out of the sky toward where it lands, over a shadow that grows as it falls.
  const rainArrows = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (const [x, y, left] of fight.get().rain) {
      const ax = Math.round(x + left * 30);
      const ay = Math.round(y - 10 - left * 180);
      path.addRect(Skia.XYWHRect(ax, ay - 8, 1, 8));
      path.addRect(Skia.XYWHRect(ax - 1, ay, 3, 2));
    }
    return path;
  });
  const rainHeads = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (const [x, y, left] of fight.get().rain) {
      const ax = Math.round(x + left * 30);
      const ay = Math.round(y - 10 - left * 180);
      path.addRect(Skia.XYWHRect(ax - 1, ay - 9, 1, 2));
      path.addRect(Skia.XYWHRect(ax + 1, ay - 9, 1, 2));
    }
    return path;
  });
  const rainMarks = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (const [x, y, left] of fight.get().rain) {
      const r = Math.max(1, 5 - left * 8);
      path.addOval(Skia.XYWHRect(x - r, y - r * 0.4, r * 2, r * 0.8));
    }
    return path;
  });

  // ---- the living room: flames that flicker (or, in the war hall, gutter out), motes in the air, and the dark.
  const flameLit = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = clock.get();
    const out = snuffable ? guttered.get() : 0;
    flames.forEach(([x, y], i) => {
      if (i < out) return;
      const k = Math.floor(t * 9 + i * 3.7);
      const lean = k % 3 === 0 ? -1 : k % 5 === 0 ? 1 : 0;
      path.addRect(Skia.XYWHRect(x + lean, y - (k % 2), 2, 2 + (k % 2)));
    });
    return path;
  });
  const flameCore = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = clock.get();
    const out = snuffable ? guttered.get() : 0;
    flames.forEach(([x, y], i) => {
      if (i < out) return;
      if (Math.floor(t * 7 + i) % 4 !== 0) path.addRect(Skia.XYWHRect(x, y + 1, 1, 1));
    });
    return path;
  });
  const snuffed = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const out = snuffable ? guttered.get() : 0;
    for (let i = 0; i < out && i < flames.length; i++) {
      const [x, y] = flames[i];
      path.addRect(Skia.XYWHRect(x - 1, y - 2, 4, 5));
    }
    return path;
  });
  // A laugh's HA popping out over the head, then the dash's dust and speed streaks.
  const exitPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = exitT.get();
    if (t < 0) return path;
    const [x, y, d] = exitAt.get();
    if (t < EXIT_LAUGH) {
      for (let k = 0; k < 3; k++) {
        const age = t - k * 0.35;
        if (age < 0 || age > 0.9) continue;
        const ox = Math.round(x + (k % 2 === 1 ? 6 : -10));
        const oy = Math.round(y - 30 - age * 10);
        for (let r = 0; r < HA.length; r++) path.addRect(Skia.XYWHRect(ox + HA[r][0], oy + HA[r][1], 1, 1));
      }
      return path;
    }
    // dust where they set off, for a moment
    if (d < EXIT_SPEED * 0.3) {
      const s = 1 + d / 60;
      for (let k = 0; k < PUFF.length; k++)
        path.addRect(Skia.XYWHRect(Math.round(x - d + PUFF[k][0] * s), Math.round(y - 2 + PUFF[k][1] * s), 2, 2));
    }
    path.addRect(Skia.XYWHRect(Math.round(x) - 24, Math.round(y) - 14, 18, 1));
    path.addRect(Skia.XYWHRect(Math.round(x) - 32, Math.round(y) - 9, 26, 1));
    path.addRect(Skia.XYWHRect(Math.round(x) - 20, Math.round(y) - 4, 14, 1));
    return path;
  });
  const zPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = clock.get();
    const walkers = sim.npcWalk.get();
    for (let i = 0; i < sleepers.length; i++) {
      const w = walkers[sleepers[i][0]];
      if (!w) continue;
      const [x, y] = sleeperAt(wandererFeet(w), sleepers[i][1] === 1, 'zs');
      const zs = sleepZs(t + i * 0.37, x, y);
      for (let k = 0; k < zs.length; k++) path.addRect(Skia.XYWHRect(zs[k][0], zs[k][1], 1, 1));
    }
    return path;
  });
  const bubblePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = clock.get();
    const walkers = sim.npcWalk.get();
    for (let i = 0; i < snorers.length; i++) {
      const w = walkers[snorers[i][0]];
      if (!w) continue;
      const [x, y] = sleeperAt(wandererFeet(w), snorers[i][1] === 1, 'snot');
      const b = snotBubble(t + i * 0.5, x, y);
      for (let k = 0; k < b.cells.length; k++) path.addRect(Skia.XYWHRect(b.cells[k][0], b.cells[k][1], 1, 1));
    }
    return path;
  });
  const shinePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const t = clock.get();
    const walkers = sim.npcWalk.get();
    for (let i = 0; i < snorers.length; i++) {
      const w = walkers[snorers[i][0]];
      if (!w) continue;
      const [x, y] = sleeperAt(wandererFeet(w), snorers[i][1] === 1, 'snot');
      const s = snotBubble(t + i * 0.5, x, y).shine;
      if (s) path.addRect(Skia.XYWHRect(s[0], s[1], 1, 1));
    }
    return path;
  });
  const cheering = useDerivedValue(() => (Math.floor(clock.get() * 2.5) % 2 === 0 ? 0 : 1));
  const motePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!ambience.motes) return path;
    const t = clock.get();
    const pollen = ambience.motes === 'pollen';
    for (let i = 0; i < 26; i++) {
      const sx = (i * 0.618) % 1;
      const sy = (i * 0.414 + 0.3) % 1;
      const vx = pollen ? 4 + (i % 3) * 2 : i % 2 ? 1.5 : -1.5;
      const vy = pollen ? Math.sin(t * 0.8 + i) * 3 : 2 + (i % 4);
      const x = (((sx * mapW + vx * t) % mapW) + mapW) % mapW;
      const y = (((sy * mapH + (pollen ? vy : vy * t)) % mapH) + mapH) % mapH;
      path.addRect(Skia.XYWHRect(Math.round(x), Math.round(y), 1, 1));
    }
    return path;
  });
  const darkness = useDerivedValue(() => ambience.darkness + (snuffable ? guttered.get() * 0.06 : 0));
  const youX = useDerivedValue(() => sim.x.get());
  const youY = useDerivedValue(() => sim.y.get() - 10);
  const youCenter = useDerivedValue(() => vec(sim.x.get(), sim.y.get() - 10));

  const camera = useDerivedValue(() => [
    { translateX: -(camX.get() + shakeOff.get()[0]) * scale },
    { translateY: -(camY.get() + shakeOff.get()[1]) * scale },
    { scale },
  ]);
  const markLift = useDerivedValue(() => [{ translateY: -bob.get() }]);
  // A four-point star that swells and fades on each twinkling tile, a beat apart.
  const twinklePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    twinkles.forEach((t, i) => {
      const phase = (clock.get() * 0.8 + i * 0.37) % 1;
      const r = Math.round(Math.sin(Math.min(phase / 0.35, 1) * Math.PI) * 4);
      if (r <= 0) return;
      const cx = t.x * TILE + 9;
      const cy = t.y * TILE + 6;
      path.addRect(Skia.XYWHRect(cx - r, cy, r * 2 + 1, 1));
      path.addRect(Skia.XYWHRect(cx, cy - r, 1, r * 2 + 1));
      if (r > 2) path.addRect(Skia.XYWHRect(cx - 1, cy - 1, 3, 3));
    });
    return path;
  });

  return (
    <Canvas style={{ width, height, backgroundColor: '#0C0806' }}>
      <Group transform={camera}>
        {mapImage && <Image image={mapImage} x={0} y={0} width={mapW} height={mapH} sampling={NEAREST} />}
        {cheerImage && (
          <Image image={cheerImage} x={0} y={0} width={mapW} height={mapH} sampling={NEAREST} opacity={cheering} />
        )}
        {patches.map((p) => (
          <Group key={`${p.x},${p.y}`}>
            <Rect x={p.x * TILE + 1} y={p.y * TILE + 1} width={TILE - 2} height={TILE - 1} color="#0C0908" />
            <Rect x={p.x * TILE + 2} y={p.y * TILE + TILE - 2} width={3} height={2} color="#5A524C" />
            <Rect x={p.x * TILE + 10} y={p.y * TILE + TILE - 3} width={4} height={3} color="#5A524C" />
          </Group>
        ))}
        {drawbridge && <Drawbridge {...drawbridge} />}
        {boulders.map((_, i) => (
          <Boulder key={i} index={i} positions={rockPos} />
        ))}
        {sealed.map((p) => (
          <Bars key={`b${p.x},${p.y}`} x={p.x * TILE} y={p.y * TILE} />
        ))}
        {signs.map((p) => (
          <Sign key={`s${p.x},${p.y}`} x={p.x * TILE} y={p.y * TILE} />
        ))}
        {chests.map((p) => (
          <Chest key={`c${p.x},${p.y}`} x={p.x * TILE} y={p.y * TILE} open={p.open} />
        ))}
        {husks.map((p) => (
          <Husk key={`h${p.x},${p.y}`} x={p.x * TILE} y={p.y * TILE} />
        ))}
        {flames.length > 0 && (
          <>
            <Path path={snuffed} color="#1A1410" />
            <Path path={flameLit} color="#FFB04A" />
            <Path path={flameCore} color="#FFF4C0" />
          </>
        )}
        {map.enemies.length > 0 && <Path path={shadowPath} color="#0A0608" opacity={0.6} />}
        {map.enemies.length > 0 && <Path path={wavePath} color="#E8D8B8" style="stroke" strokeWidth={2} />}
        {attack && <Circle cx={glowX} cy={glowY} r={glowR} color={attack.color} opacity={glowO} />}
        {walkers && <Atlas image={walkers} sprites={sprites} transforms={transforms} sampling={NEAREST} />}
        {/* the fight's effects, and your practice swings when there's nothing to fight */}
        {(map.enemies.length > 0 || attack) && (
          <>
            {walkers && (
              <Group
                opacity={0.65}
                layer={
                  <Paint>
                    <BlendColor color="#FF2A2A" mode="srcIn" />
                  </Paint>
                }>
                <Atlas image={walkers} sprites={redSprites} transforms={redTransforms} sampling={NEAREST} />
              </Group>
            )}
            {attack && (
              <Circle
                cx={ringX}
                cy={ringY}
                r={ringR}
                color={attack.color}
                opacity={ringO}
                style="stroke"
                strokeWidth={2}
              />
            )}
            <Path path={sparkPath} color="#FFF4C0" />
            {walkers && (
              <Group
                layer={
                  <Paint>
                    <BlendColor color="white" mode="srcIn" />
                  </Paint>
                }>
                <Atlas image={walkers} sprites={flashSprites} transforms={flashTransforms} sampling={NEAREST} />
              </Group>
            )}
            <Path path={puffPath} color="#E8E0D0" />
            {attack && <AttackEffects attack={attack} flash={flash} bolts={bolts} />}
            <Path path={debtPath} color="#FFC940" />
            <Path path={rainMarks} color="#000000" opacity={0.35} />
            <Path path={rainArrows} color="#C8A870" />
            <Path path={rainHeads} color="#A0D060" />
            <Shout shout={shout} />
          </>
        )}
        {boss && throws && <Pillows pillows={pillows} />}
        {ambience.motes && (
          <Path path={motePath} color={ambience.motes === 'pollen' ? '#F4EFA0' : '#D8D0C0'} opacity={0.55} />
        )}
        <Path path={exitPath} color="#FFF4C0" opacity={0.9} />
        <Path path={zPath} color="#DCE8FF" opacity={0.85} />
        <Path path={bubblePath} color="#B8E0C8" opacity={0.8} />
        <Path path={shinePath} color="#FFFFFF" />
        {ambience.darkness > 0 && (
          <Group layer>
            <Rect x={0} y={0} width={mapW} height={mapH} color="#05030A" opacity={darkness} />
            {flames
              .filter((f) => f[2] > 0)
              .map((f, i) => (
                <FlameLight
                  key={i}
                  index={i}
                  x={f[0] + 1}
                  y={f[1] + 2}
                  reach={f[2]}
                  clock={clock}
                  guttered={snuffable ? guttered : null}
                />
              ))}
            <Circle cx={youX} cy={youY} r={34} blendMode="dstOut">
              <RadialGradient c={youCenter} r={34} colors={['#000000', '#00000000']} />
            </Circle>
          </Group>
        )}
        {twinkles.length > 0 && <Path path={twinklePath} color="#FFF7DC" />}
        <Group transform={markLift}>
          {marks.map((m) => (
            <Group key={`${m.x},${m.y}`}>
              <Rect x={m.x * TILE + 6} y={m.y * TILE - 14} width={4} height={9} color="#140E1C" />
              <Rect x={m.x * TILE + 6} y={m.y * TILE - 4} width={4} height={4} color="#140E1C" />
              <Rect x={m.x * TILE + 7} y={m.y * TILE - 13} width={2} height={7} color="#FFC940" />
              <Rect x={m.x * TILE + 7} y={m.y * TILE - 3} width={2} height={2} color="#FFC940" />
            </Group>
          ))}
        </Group>
      </Group>
      <Rect x={0} y={0} width={width} height={height} color="#000000" opacity={dim} />
    </Canvas>
  );
}

/**
 * Rects and placements for an Atlas, from a list of seven numbers per sprite: sheet x, y, screen x, y, size,
 * and the rows of the frame to draw (from, how many: a breathing NPC is drawn in two pieces, idle.ts).
 */
function useSpriteBuffers(list: SharedValue<number[]>, count: number) {
  const sprites = useRectBuffer(count, (rect, i) => {
    'worklet';
    const l = list.get();
    if (l.length < (i + 1) * STRIDE) rect.setXYWH(0, 0, 0, 0);
    else rect.setXYWH(l[i * STRIDE], l[i * STRIDE + 1] + l[i * STRIDE + 5], FW, l[i * STRIDE + 6]);
  });
  const transforms = useRSXformBuffer(count, (xf, i) => {
    'worklet';
    const l = list.get();
    if (l.length < (i + 1) * STRIDE) xf.set(1, 0, -999, -999);
    // lying flat: turned a quarter clockwise, so the head points right and the feet left
    else if (l[i * STRIDE + 4] < 0) xf.set(0, 1, l[i * STRIDE + 2], l[i * STRIDE + 3]);
    else xf.set(l[i * STRIDE + 4], 0, l[i * STRIDE + 2], l[i * STRIDE + 3]);
  });
  return [sprites, transforms] as const;
}

/** A pushable boulder, drawn where it's sliding to. */
function Boulder({ index, positions }: { index: number; positions: SharedValue<number[]> }) {
  const transform = useDerivedValue(() => {
    const p = positions.get();
    return [{ translateX: p[index * 2] ?? 0 }, { translateY: p[index * 2 + 1] ?? 0 }];
  });
  return (
    <Group transform={transform}>
      <Oval x={1} y={4} width={14} height={12} color="#2E2A28" />
      <Oval x={1} y={2} width={13} height={11} color="#4A4440" />
      <Oval x={3} y={4} width={5} height={3} color="#625A54" />
    </Group>
  );
}

/**
 * The castle's drawbridge: raised, it stands up against the gate, planks and iron bands; lowering,
 * it tips forward over the moat until it lies across it, and the dark of the open gate shows above.
 */
function Drawbridge({ x, y, w, h, down }: { x: number; y: number; w: number; h: number; down: SharedValue<number> }) {
  const px = x * TILE;
  const base = y * TILE;
  const width = w * TILE;
  const length = h * TILE;
  // how far it reaches out over the moat, and how much of it still stands against the gate
  const reach = useDerivedValue(() => length * down.get());
  const stand = useDerivedValue(() => length * (1 - down.get()));
  const standY = useDerivedValue(() => base - length * (1 - down.get()));
  // the cross-planks showing so far, one every 5 pixels
  const planks = useDerivedValue(() => Math.floor((length * down.get()) / 5));
  // the chains, from the gatehouse to the bridge's far end
  const chain = useDerivedValue(() => length + length * down.get());
  return (
    <Group>
      {/* the gate's dark, uncovered as the bridge comes down */}
      <Rect x={px} y={base - length} width={width} height={length} color="#0C0A0E" />
      {/* lowered: planks across the moat */}
      <Rect x={px} y={base} width={width} height={reach} color="#5A3E28" />
      <Rect x={px} y={base} width={2} height={reach} color="#3A2818" />
      <Rect x={px + width - 2} y={base} width={2} height={reach} color="#3A2818" />
      {Array.from({ length: Math.ceil(length / 5) }, (_, i) => (
        <Plank key={i} index={i} px={px} base={base} width={width} count={planks} />
      ))}
      {/* raised: it stands against the gate, iron-banded */}
      <Rect x={px} y={standY} width={width} height={stand} color="#4A3020" />
      <Rect x={px} y={standY} width={width} height={2} color="#2A1C12" />
      <Rect x={px + 3} y={standY} width={2} height={stand} color="#4A4A54" />
      <Rect x={px + width - 5} y={standY} width={2} height={stand} color="#4A4A54" />
      <Rect x={px + width / 2 - 1} y={standY} width={2} height={stand} color="#2A1C12" />
      <Rect x={px + 1} y={base - length} width={1} height={chain} color="#6A6A76" />
      <Rect x={px + width - 2} y={base - length} width={1} height={chain} color="#6A6A76" />
    </Group>
  );
}

function Plank({
  index,
  px,
  base,
  width,
  count,
}: {
  index: number;
  px: number;
  base: number;
  width: number;
  count: SharedValue<number>;
}) {
  const opacity = useDerivedValue(() => (index < count.get() ? 1 : 0));
  return <Rect x={px} y={base + 4 + index * 5} width={width} height={1} color="#3A2818" opacity={opacity} />;
}

/** The ring of a drill sergeant's shout. */
function Shout({ shout }: { shout: SharedValue<number[]> }) {
  const sx = useDerivedValue(() => shout.get()[0]);
  const sy = useDerivedValue(() => shout.get()[1]);
  const sr = useDerivedValue(() => 46 * (1 - shout.get()[2] * 2) + 6);
  const so = useDerivedValue(() => Math.min(1, shout.get()[2] * 3));
  return <Circle cx={sx} cy={sy} r={sr} color="#8A8AC0" opacity={so} style="stroke" strokeWidth={2} />;
}

/** Baron Plush's pillows, in flight. */
function Pillows({ pillows }: { pillows: SharedValue<number[][]> }) {
  return (
    <Group>
      {Array.from({ length: 4 }, (_, i) => (
        <Pillow key={i} index={i} pillows={pillows} />
      ))}
    </Group>
  );
}

function Pillow({ index, pillows }: { index: number; pillows: SharedValue<number[][]> }) {
  const x = useDerivedValue(() => (pillows.get()[index]?.[0] ?? -99) - 5);
  const y = useDerivedValue(() => (pillows.get()[index]?.[1] ?? -99) - 3);
  return <Rect x={x} y={y} width={10} height={7} color="#E8D8F0" />;
}

/** The light around one flame, cut out of the dark: it breathes with the flicker, and goes out if guttered. */
function FlameLight({
  index,
  x,
  y,
  reach,
  clock,
  guttered,
}: {
  index: number;
  x: number;
  y: number;
  reach: number;
  clock: SharedValue<number>;
  guttered: SharedValue<number> | null;
}) {
  const r = useDerivedValue(() => {
    if (guttered && index < guttered.get()) return 0.01;
    return reach * (0.94 + 0.06 * Math.sin(clock.get() * 11 + index * 2.3));
  });
  return (
    <Circle cx={x} cy={y} r={r} blendMode="dstOut">
      <RadialGradient c={vec(x, y)} r={r} colors={['#000000', '#000000CC', '#00000000']} />
    </Circle>
  );
}

/** A chest on its tile: shut (gold-banded wood), or open and empty. */
/**
 * A cocoon after its hatch, over the whole one baked into the map (world-art.mjs
 * egg()): grass laid over the egg, then the bottom of the shell, hollow, with its
 * torn rim and two flaps of silk fallen either side.
 */
function Husk({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      <Rect x={x + 1} y={y - 3} width={15} height={19} color="#4E7A3A" />
      <Rect x={x + 4} y={y + 3} width={2} height={1} color="#46703A" />
      <Rect x={x + 11} y={y + 5} width={2} height={1} color="#568240" />
      <Rect x={x + 3} y={y + 9} width={11} height={7} color="#3A3044" />
      <Rect x={x + 4} y={y + 9} width={9} height={6} color="#EDE6D6" />
      <Rect x={x + 10} y={y + 9} width={3} height={6} color="#C9BFAE" />
      <Rect x={x + 5} y={y + 9} width={7} height={3} color="#2A2430" />
      <Rect x={x + 4} y={y + 8} width={1} height={1} color="#EDE6D6" />
      <Rect x={x + 7} y={y + 8} width={1} height={1} color="#EDE6D6" />
      <Rect x={x + 11} y={y + 8} width={1} height={1} color="#C9BFAE" />
      <Rect x={x + 0} y={y + 13} width={4} height={2} color="#EDE6D6" />
      <Rect x={x + 0} y={y + 15} width={4} height={1} color="#A69C8C" />
      <Rect x={x + 13} y={y + 12} width={3} height={3} color="#C9BFAE" />
    </Group>
  );
}

function Chest({ x, y, open }: { x: number; y: number; open: boolean }) {
  return (
    <Group>
      <Rect x={x + 1} y={y + 13} width={14} height={2} color="#10080A" opacity={0.5} />
      <Rect x={x + 1} y={y + 6} width={14} height={8} color="#140E1C" />
      <Rect x={x + 2} y={y + 7} width={12} height={6} color="#8A5A30" />
      <Rect x={x + 2} y={y + 9} width={12} height={1} color="#5A3A20" />
      {open ? (
        <>
          <Rect x={x + 1} y={y + 1} width={14} height={6} color="#140E1C" />
          <Rect x={x + 2} y={y + 2} width={12} height={4} color="#6A4424" />
          <Rect x={x + 3} y={y + 6} width={10} height={2} color="#1A1008" />
        </>
      ) : (
        <>
          <Rect x={x + 1} y={y + 3} width={14} height={4} color="#140E1C" />
          <Rect x={x + 2} y={y + 4} width={12} height={2} color="#A0703C" />
          <Rect x={x + 7} y={y + 5} width={2} height={4} color="#FFC940" />
          <Rect x={x + 2} y={y + 6} width={12} height={1} color="#FFC940" />
        </>
      )}
    </Group>
  );
}

/** Iron bars across a doorway, shut for a boss fight. */
function Bars({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      <Rect x={x} y={y + 1} width={TILE} height={2} color="#3A3A42" />
      {[1, 5, 9, 13].map((bx) => (
        <Rect key={bx} x={x + bx} y={y} width={2} height={TILE} color="#5A5A66" />
      ))}
      <Rect x={x} y={y + TILE - 4} width={TILE} height={2} color="#3A3A42" />
    </Group>
  );
}

/** A sign on a post: A reads it. */
function Sign({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      <Rect x={x + 7} y={y + 8} width={2} height={7} color="#4A3020" />
      <Rect x={x + 2} y={y + 2} width={12} height={8} color="#140E1C" />
      <Rect x={x + 3} y={y + 3} width={10} height={6} color="#B08A58" />
      <Rect x={x + 4} y={y + 5} width={8} height={1} color="#6A4A2A" />
      <Rect x={x + 4} y={y + 7} width={6} height={1} color="#6A4A2A" />
    </Group>
  );
}
