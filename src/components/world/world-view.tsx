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
  Skia,
  Circle,
  Rect,
  useImage,
  useRSXformBuffer,
  useRectBuffer,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  DOWN,
  PUSH_DELAY,
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
import {
  E_ALIVE,
  E_AWAKE,
  E_CLANG,
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
import { AttackEffects } from '@/components/world/attack-effects';
import { playSound, type Effect } from '@/audio';
import { haptics } from '@/haptics';
import { FACINGS, TILE, type Facing, type NpcObject, type WorldMap } from '@/world/maps';
import { WALKER_FRAME, WALKER_ROWS, type WalkerId } from '@/world/walkers';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const WALKERS_IMAGE = require('@/assets/world/walkers.png');
const FW = WALKER_FRAME.width;
const FH = WALKER_FRAME.height;
const FEET = WALKER_FRAME.feet;
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
  slam: haptics.kill,
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
  /** Each NPC's facing, in map order. */
  npcFacing: SharedValue<number[]>;
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
    npcFacing: useSharedValue(npcs.map((n) => FACINGS.indexOf(n.facing))),
    inputX: useSharedValue(0),
    inputY: useSharedValue(0),
    frozen: useSharedValue(false),
    hp: useSharedValue(HEARTS),
    attackPressed: useSharedValue(false),
    attackHeld: useSharedValue(false),
    charge: useSharedValue(0),
    dodgePressed: useSharedValue(false),
    sleepy: useSharedValue(0),
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
  /** Their real level (Lv 10 charges; Lv 20 adds their Path's special), and that special. */
  level?: number;
  special?: Special;
  /** Out of hearts. */
  onDefeat?: () => void;
  /** A boss throwing pillows from here (art pixels), drowsiness filling at `drowsy` a second, and a win when every enemy is down. */
  boss?: { x: number; y: number } | null;
  /** The boss lobs pillows (Baron Plush). */
  throws?: boolean;
  drowsy?: number;
  onWin?: () => void;
};

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
  onDefeat,
  boss = null,
  throws = false,
  drowsy = 0,
  onWin,
}: Props) {
  const mapImage = useImage(map.image);
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
  const fight = useSharedValue<Fight>(startFight(map.enemies.map((e) => spawnEnemy(e.kind, ...npcFeet(e)))));
  const enemyRows = useMemo(() => ENEMY_KINDS.map((k) => WALKER_ROWS[k]), []);
  const defeated = useMemo(() => (onDefeat ? onDefeat : () => {}), [onDefeat]);
  const won = useMemo(() => (onWin ? onWin : () => {}), [onWin]);
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
  /** A torch guttering: the room dims for a moment (seconds left). */
  const gutter = useSharedValue(0);
  const partyRows = useMemo(() => party.map((id) => WALKER_ROWS[id]), [party]);
  const npcs = useMemo(
    () => map.npcs.map((n) => [WALKER_ROWS[n.sprite], ...npcFeet(n)] as [number, number, number]),
    [map],
  );
  const count = partyRows.length + npcs.length + map.enemies.length;

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
    const realDt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    // Hit-stop: for a beat after a hit lands, nothing moves (but flashes, puffs and the shake play on).
    const stopped = hitStop.get() > 0;
    hitStop.set(Math.max(0, hitStop.get() - realDt));
    const dt = stopped ? 0 : realDt;
    let ix = sim.inputX.get();
    let iy = sim.inputY.get();
    const frozen = sim.frozen.get();
    // Dazed by a shout, mid-roll, or down: the stick does nothing for a moment.
    const fighting = fight.get();
    if (frozen || fighting.dazed > 0 || fighting.roll > 0 || fighting.fallen) {
      ix = 0;
      iy = 0;
    }
    const push = Math.hypot(ix, iy);
    let moving = false;
    if (push > 0.25) {
      sim.facing.set(facingFor(ix, iy, sim.facing.get()));
      const grid: Grid = { solid: solid.get(), width: mapWidth, height: mapHeight };
      // Straight into a boulder: lean on it (below) instead of being eased round it.
      const against = leaningOn(grid, rocks.get(), sim.x.get(), sim.y.get(), sim.facing.get()) !== -1;
      const [nx, ny] = against
        ? [sim.x.get(), sim.y.get()]
        : move(grid, sim.x.get(), sim.y.get(), (ix / push) * SPEED * dt, (iy / push) * SPEED * dt);
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
    const held = sim.attackHeld.get();
    const pressed = sim.attackPressed.get();
    const dodge = sim.dodgePressed.get();
    sim.attackPressed.set(false);
    sim.dodgePressed.set(false);
    const release = wasHeld.get() && !held;
    wasHeld.set(held);
    if (!frozen && attack && fight.get().enemies.length > 0 && !fight.get().fallen && !fight.get().won) {
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
        { grid, attack, damage, level, special, boss: bossX >= 0, bossX, bossY, throws, drowsy },
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
      if (ev.slam) {
        shake.set([FEEL.shakeTime * 1.5, FEEL.hurtShake]);
        scheduleOnRN(feel, 'slam');
      }
      if (ev.guttered) {
        gutter.set(0.5);
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
      puffs.set(puffs.get().map((p) => [p[0], p[1], p[2] - realDt]).filter((p) => p[2] > 0));
    }

    // Boulders slide toward their tiles.
    const rp = rockPos.get();
    const rs = rocks.get();
    if (rs.length > 0) {
      const next = rp.slice();
      let changed = false;
      const slide = SPEED * 1.5 * dt;
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

    // The camera follows the lead and stops at the map's edges (or centres a small map).
    const round = (v: number) => Math.round(v * scale) / scale;
    const cx = mapW <= viewW ? (mapW - viewW) / 2 : Math.min(Math.max(sim.x.get() - viewW / 2, 0), mapW - viewW);
    const cy = mapH <= viewH ? (mapH - viewH) / 2 : Math.min(Math.max(sim.y.get() - 12 - viewH / 2, 0), mapH - viewH);
    camX.set(round(cx));
    camY.set(round(cy));
    bob.set(Math.floor(info.timestamp / 350) % 2);

    // Everyone this frame: [row, facing, frame, x, y], drawn back to front by their feet.
    // Each: [row, facing, frame, x, y, tint (0 none, 1 white: struck, 2 red: winding up), size].
    const ents: number[][] = [];
    const npcFacing = sim.npcFacing.get();
    for (let i = 0; i < npcs.length; i++) ents.push([npcs[i][0], npcFacing[i] ?? 0, 0, npcs[i][1], npcs[i][2], 0, 1]);
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
      ents.push([enemyRows[e[E_KIND]], toward, walkFrame(e[E_X] + e[E_Y], stepping), e[E_X], e[E_Y], tint, sizeOf(e)]);
      // Kaldor casts no shadow, until a torch gutters.
      if (e[E_MODE] === EXPOSED && ENEMY_KINDS[e[E_KIND]] === 'kaldor') shadows.push(e[E_X], e[E_Y]);
    }
    shadowAt.set(shadows);
    for (let k = partyRows.length - 1; k >= 1; k--) {
      const [fx, fy, ff] = followerAt(sim.trail.get(), k, sim.facing.get());
      ents.push([partyRows[k], ff, walkFrame(sim.walked.get() + k * 5, moving), fx, fy, 0, 1]);
    }
    // the lead goes last so they're drawn on top of a follower standing in the same spot;
    // just hurt, they blink until they can be hurt again; striking, they lean into the blow
    const blink = now.mercy > 0 && now.roll === 0 && Math.floor(now.mercy * 14) % 2 === 0;
    if (!blink) {
      const lean = now.flash[3] > 0 && attack?.kind === 'melee' ? 2 : 0;
      const f = sim.facing.get();
      const lx = f === 2 ? -lean : f === 3 ? lean : 0;
      const ly = f === 1 ? -lean : f === 0 ? lean : 0;
      ents.push([partyRows[0], f, walkFrame(sim.walked.get(), moving || now.roll > 0), sim.x.get() + lx, sim.y.get() + ly, 0, 1]);
    }
    ents.sort(byFeet);
    const list: number[] = [];
    const lit: number[] = [];
    const red: number[] = [];
    for (const [row, facing, f, x, y, tint, size] of ents) {
      const item = [(facing * 3 + f) * FW, row * FH, round(x - (FW * size) / 2), round(y - FEET * size), size];
      list.push(...item);
      if (tint === 1 && lit.length < FLASHES * 5) lit.push(...item);
      if (tint === 2 && red.length < FLASHES * 5) red.push(...item);
    }
    drawList.set(list);
    flashList.set(lit);
    redList.set(red);
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
        path.addRect(Skia.XYWHRect(Math.round(x + Math.cos(a) * r), Math.round(y - 8 + Math.sin(a) * r * 0.8), size, size));
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

  const camera = useDerivedValue(() => [
    { translateX: -(camX.get() + shakeOff.get()[0]) * scale },
    { translateY: -(camY.get() + shakeOff.get()[1]) * scale },
    { scale },
  ]);
  const markLift = useDerivedValue(() => [{ translateY: -bob.get() }]);

  return (
    <Canvas style={{ width, height, backgroundColor: '#0C0806' }}>
      <Group transform={camera}>
        {mapImage && <Image image={mapImage} x={0} y={0} width={mapW} height={mapH} sampling={NEAREST} />}
        {patches.map((p) => (
          <Group key={`${p.x},${p.y}`}>
            <Rect x={p.x * TILE + 1} y={p.y * TILE + 1} width={TILE - 2} height={TILE - 1} color="#0C0908" />
            <Rect x={p.x * TILE + 2} y={p.y * TILE + TILE - 2} width={3} height={2} color="#5A524C" />
            <Rect x={p.x * TILE + 10} y={p.y * TILE + TILE - 3} width={4} height={3} color="#5A524C" />
          </Group>
        ))}
        {boulders.map((_, i) => (
          <Boulder key={i} index={i} positions={rockPos} />
        ))}
        {map.enemies.length > 0 && <Path path={shadowPath} color="#0A0608" opacity={0.6} />}
        {map.enemies.length > 0 && <Path path={wavePath} color="#E8D8B8" style="stroke" strokeWidth={2} />}
        {map.enemies.length > 0 && attack && (
          <Circle cx={glowX} cy={glowY} r={glowR} color={attack.color} opacity={glowO} />
        )}
        {walkers && <Atlas image={walkers} sprites={sprites} transforms={transforms} sampling={NEAREST} />}
        {map.enemies.length > 0 && (
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
            {attack && <Circle cx={ringX} cy={ringY} r={ringR} color={attack.color} opacity={ringO} style="stroke" strokeWidth={2} />}
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
            <Shout shout={shout} />
          </>
        )}
        {boss && throws && <Pillows pillows={pillows} />}
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

/** Rects and placements for an Atlas, from a list of five numbers per sprite: sheet x, y, screen x, y, size. */
function useSpriteBuffers(list: SharedValue<number[]>, count: number) {
  const sprites = useRectBuffer(count, (rect, i) => {
    'worklet';
    const l = list.get();
    if (l.length < (i + 1) * 5) rect.setXYWH(0, 0, 0, 0);
    else rect.setXYWH(l[i * 5], l[i * 5 + 1], FW, FH);
  });
  const transforms = useRSXformBuffer(count, (xf, i) => {
    'worklet';
    const l = list.get();
    if (l.length < (i + 1) * 5) xf.set(1, 0, -999, -999);
    else xf.set(l[i * 5 + 4], 0, l[i * 5 + 2], l[i * 5 + 3]);
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
