import {
  Atlas,
  Canvas,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Oval,
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
  boulderAt,
  byFeet,
  extendTrail,
  facingFor,
  followerAt,
  move,
  platesCovered,
  pushBoulder,
  startTrail,
  tileAhead,
  walkFrame,
  type Grid,
} from '@/world/engine';
import {
  E_ALIVE,
  E_AWAKE,
  E_KIND,
  E_X,
  E_Y,
  ENEMY_KINDS,
  HEARTS,
  MERCY,
  hitAround,
  spawnEnemy,
  stepEnemies,
  strikePoint,
  type Attack,
  type Enemy,
} from '@/world/combat';
import { FACINGS, TILE, type Facing, type NpcObject, type WorldMap } from '@/world/maps';
import { WALKER_FRAME, WALKER_ROWS, type WalkerId } from '@/world/walkers';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const WALKERS_IMAGE = require('@/assets/world/walkers.png');
const FW = WALKER_FRAME.width;
const FH = WALKER_FRAME.height;
const FEET = WALKER_FRAME.feet;

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
  /** The attack button was pressed; the frame loop takes it. */
  attackPressed: SharedValue<boolean>;
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

  // ---- combat
  const foes = useSharedValue<Enemy[]>(map.enemies.map((e) => spawnEnemy(e.kind, ...npcFeet(e))));
  const enemyRows = useMemo(() => ENEMY_KINDS.map((k) => WALKER_ROWS[k]), []);
  const mercy = useSharedValue(0);
  const dazed = useSharedValue(0);
  const cooldown = useSharedValue(0);
  const fallen = useSharedValue(false);
  /** Flying bolts: [x, y, dx, dy, travelled], per bolt. */
  const bolts = useSharedValue<number[][]>([]);
  /** The last swing or burst: [x, y, radius, time left]; and the last shout's ring: [x, y, time left]. */
  const flash = useSharedValue<number[]>([0, 0, 0, 0]);
  const shout = useSharedValue<number[]>([0, 0, 0]);
  const defeated = useMemo(() => (onDefeat ? onDefeat : () => {}), [onDefeat]);
  const won = useMemo(() => (onWin ? onWin : () => {}), [onWin]);
  const bossX = boss ? boss.x : -1;
  const bossY = boss ? boss.y : -1;
  const winning = useSharedValue(false);
  /** Pillows in flight: [x, y, dx, dy], and time until the next throw. */
  const pillows = useSharedValue<number[][]>([]);
  const throwIn = useSharedValue(1.5);
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

  const viewW = width / scale;
  const viewH = height / scale;
  const mapW = map.width * TILE;
  const mapH = map.height * TILE;

  const frame = useFrameCallback((info) => {
    'worklet';
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    let ix = sim.inputX.get();
    let iy = sim.inputY.get();
    const frozen = sim.frozen.get();
    // Dazed by a shout: you can't move for a moment.
    dazed.set(Math.max(0, dazed.get() - dt));
    if (frozen || dazed.get() > 0 || fallen.get()) {
      ix = 0;
      iy = 0;
    }
    const push = Math.hypot(ix, iy);
    let moving = false;
    if (push > 0.25) {
      sim.facing.set(facingFor(ix, iy, sim.facing.get()));
      const grid: Grid = { solid: solid.get(), width: mapWidth, height: mapHeight };
      const [nx, ny] = move(grid, sim.x.get(), sim.y.get(), (ix / push) * SPEED * dt, (iy / push) * SPEED * dt);
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
    let leaningOn = -1;
    if (push > 0.25 && !moving && rocks.get().length > 0) {
      const [ax, ay] = tileAhead(sim.x.get(), sim.y.get(), sim.facing.get());
      leaningOn = boulderAt(rocks.get(), ay * mapWidth + ax);
    }
    if (leaningOn === -1) leaning.set(0);
    else {
      leaning.set(leaning.get() + dt);
      if (leaning.get() >= PUSH_DELAY) {
        leaning.set(0);
        const f = sim.facing.get();
        const dx = f === 2 ? -1 : f === 3 ? 1 : 0;
        const dy = f === 1 ? -1 : f === 0 ? 1 : 0;
        const pushed = pushBoulder(solid.get(), mapWidth, mapHeight, rocks.get(), leaningOn, dx, dy);
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

    // ---- combat: your attack, bolts in flight, then the enemies' turn.
    if (!frozen && !fallen.get() && foes.get().length > 0) {
      const grid: Grid = { solid: solid.get(), width: mapWidth, height: mapHeight };
      const px = sim.x.get();
      const py = sim.y.get();
      const f = sim.facing.get();
      mercy.set(Math.max(0, mercy.get() - dt));
      cooldown.set(Math.max(0, cooldown.get() - dt));
      let enemies = foes.get();
      if (sim.attackPressed.get()) {
        sim.attackPressed.set(false);
        if (attack && cooldown.get() === 0) {
          cooldown.set(attack.cooldown);
          if (attack.kind === 'melee') {
            const [sx, sy] = strikePoint(px, py, f, attack.range);
            enemies = hitAround(grid, enemies, sx, sy, attack.range * 0.6 + 6, damage, attack.knock, attack.stun);
            flash.set([sx, sy - 4, attack.range * 0.6 + 4, 0.15]);
          } else if (attack.kind === 'burst') {
            enemies = hitAround(grid, enemies, px, py - 6, attack.range, damage, attack.knock, attack.stun);
            flash.set([px, py - 8, attack.range, 0.3]);
          } else {
            const dx = f === 2 ? -1 : f === 3 ? 1 : 0;
            const dy = f === 1 ? -1 : f === 0 ? 1 : 0;
            bolts.set([...bolts.get(), [px, py - 8, dx, dy, 0]]);
          }
        }
      }
      // Bolts fly straight until they hit a wall, an enemy, or run out of range.
      if (bolts.get().length > 0 && attack) {
        const next: number[][] = [];
        for (const b of bolts.get()) {
          const stepLen = 150 * dt;
          const bx = b[0] + b[2] * stepLen;
          const by = b[1] + b[3] * stepLen;
          const travelled = b[4] + stepLen;
          const tx = Math.floor(bx / TILE);
          const ty = Math.floor(by / TILE);
          const wall = tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight || solid.get()[ty * mapWidth + tx] === 1;
          let struck = false;
          for (const e of enemies) {
            if (e[E_ALIVE] === 1 && Math.hypot(e[E_X] - bx, e[E_Y] - 8 - by) < 9) struck = true;
          }
          if (struck) enemies = hitAround(grid, enemies, bx, by + 8, 10, damage, attack.knock, attack.stun);
          if (!struck && !wall && travelled < attack.range) next.push([bx, by, b[2], b[3], travelled]);
        }
        bolts.set(next);
      }
      const r = stepEnemies(grid, enemies, px, py, dt, mercy.get() === 0);
      foes.set(r.enemies);
      // The boss: pillows lobbed at you from the sofa, and a win once every bearer is down.
      if (bossX >= 0 && !winning.get()) {
        throwIn.set(throwIn.get() - dt);
        if (throws && throwIn.get() <= 0) {
          throwIn.set(2.2);
          const d = Math.hypot(px - bossX, py - bossY) || 1;
          pillows.set([...pillows.get(), [bossX, bossY - 10, (px - bossX) / d, (py - 8 - bossY + 10) / d]]);
        }
        const flying: number[][] = [];
        for (const p of pillows.get()) {
          const nx = p[0] + p[2] * 70 * dt;
          const ny = p[1] + p[3] * 70 * dt;
          if (mercy.get() === 0 && Math.hypot(nx - px, ny - (py - 8)) < 8) {
            r.hurt = Math.max(r.hurt, 1);
            continue;
          }
          if (nx > 0 && ny > 0 && nx < mapWidth * TILE && ny < mapHeight * TILE) flying.push([nx, ny, p[2], p[3]]);
        }
        pillows.set(flying);
        let standing = 0;
        for (const e of r.enemies) standing += e[E_ALIVE];
        if (standing === 0) {
          winning.set(true);
          pillows.set([]);
          scheduleOnRN(won);
        }
      }
      if (r.shoutX >= 0) shout.set([r.shoutX, r.shoutY - 8, 0.5]);
      if (r.stun > 0) dazed.set(Math.max(dazed.get(), r.stun));
      if (r.hurt > 0) {
        mercy.set(MERCY);
        sim.hp.set(sim.hp.get() - r.hurt);
        const [nx, ny] = move(grid, px, py, r.pushX, r.pushY);
        sim.x.set(nx);
        sim.y.set(ny);
        if (sim.hp.get() <= 0) {
          fallen.set(true);
          scheduleOnRN(defeated);
        }
      }
    }
    // Drowsiness: standing still fills it, moving drains it. Full, and you fall asleep.
    if (drowsy > 0 && !frozen && !fallen.get() && !winning.get()) {
      const next = Math.min(1, Math.max(0, sim.sleepy.get() + (moving ? -0.35 : drowsy) * dt));
      sim.sleepy.set(next);
      if (next >= 1) {
        fallen.set(true);
        scheduleOnRN(defeated);
      }
    }
    const fl = flash.get();
    if (fl[3] > 0) flash.set([fl[0], fl[1], fl[2], Math.max(0, fl[3] - dt)]);
    const sh = shout.get();
    if (sh[2] > 0) shout.set([sh[0], sh[1], Math.max(0, sh[2] - dt)]);

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
    const ents: number[][] = [];
    const npcFacing = sim.npcFacing.get();
    for (let i = 0; i < npcs.length; i++) ents.push([npcs[i][0], npcFacing[i] ?? 0, 0, npcs[i][1], npcs[i][2]]);
    for (const e of foes.get()) {
      if (e[E_ALIVE] === 0) continue;
      const toward = facingFor(sim.x.get() - e[E_X], sim.y.get() - e[E_Y], DOWN);
      ents.push([enemyRows[e[E_KIND]], toward, walkFrame(e[E_X] + e[E_Y], e[E_AWAKE] === 1), e[E_X], e[E_Y]]);
    }
    for (let k = partyRows.length - 1; k >= 1; k--) {
      const [fx, fy, ff] = followerAt(sim.trail.get(), k, sim.facing.get());
      ents.push([partyRows[k], ff, walkFrame(sim.walked.get() + k * 5, moving), fx, fy]);
    }
    // the lead goes last so they're drawn on top of a follower standing in the same spot
    ents.push([partyRows[0], sim.facing.get(), walkFrame(sim.walked.get(), moving), sim.x.get(), sim.y.get()]);
    ents.sort(byFeet);
    const list: number[] = [];
    for (const [row, facing, f, x, y] of ents) {
      list.push((facing * 3 + f) * FW, row * FH, round(x - FW / 2), round(y - FEET));
    }
    drawList.set(list);
  }, false);

  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  const sprites = useRectBuffer(count, (rect, i) => {
    'worklet';
    const l = drawList.get();
    if (l.length < (i + 1) * 4) rect.setXYWH(0, 0, 0, 0);
    else rect.setXYWH(l[i * 4], l[i * 4 + 1], FW, FH);
  });
  const transforms = useRSXformBuffer(count, (xf, i) => {
    'worklet';
    const l = drawList.get();
    if (l.length < (i + 1) * 4) xf.set(1, 0, -999, -999);
    else xf.set(1, 0, l[i * 4 + 2], l[i * 4 + 3]);
  });

  const camera = useDerivedValue(() => [
    { translateX: -camX.get() * scale },
    { translateY: -camY.get() * scale },
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
        {walkers && <Atlas image={walkers} sprites={sprites} transforms={transforms} sampling={NEAREST} />}
        {map.enemies.length > 0 && (
          <Effects flash={flash} shout={shout} bolts={bolts} color={attack?.color ?? '#FFFFFF'} />
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
    </Canvas>
  );
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

/** How many bolts can be drawn in flight at once. */
const MAX_BOLTS = 6;

/** Swings, bursts, bolts in flight, and the rings of sergeants' shouts. */
function Effects({
  flash,
  shout,
  bolts,
  color,
}: {
  flash: SharedValue<number[]>;
  shout: SharedValue<number[]>;
  bolts: SharedValue<number[][]>;
  color: string;
}) {
  const fx = useDerivedValue(() => flash.get()[0]);
  const fy = useDerivedValue(() => flash.get()[1]);
  const fr = useDerivedValue(() => flash.get()[2] * (1.2 - flash.get()[3]));
  const fo = useDerivedValue(() => Math.min(1, flash.get()[3] * 5));
  const sx = useDerivedValue(() => shout.get()[0]);
  const sy = useDerivedValue(() => shout.get()[1]);
  const sr = useDerivedValue(() => 46 * (1 - shout.get()[2] * 2) + 6);
  const so = useDerivedValue(() => Math.min(1, shout.get()[2] * 3));
  return (
    <Group>
      <Circle cx={fx} cy={fy} r={fr} color={color} opacity={fo} style="stroke" strokeWidth={3} />
      <Circle cx={sx} cy={sy} r={sr} color="#8A8AC0" opacity={so} style="stroke" strokeWidth={2} />
      {Array.from({ length: MAX_BOLTS }, (_, i) => (
        <Bolt key={i} index={i} bolts={bolts} color={color} />
      ))}
    </Group>
  );
}

function Bolt({ index, bolts, color }: { index: number; bolts: SharedValue<number[][]>; color: string }) {
  const cx = useDerivedValue(() => bolts.get()[index]?.[0] ?? -99);
  const cy = useDerivedValue(() => bolts.get()[index]?.[1] ?? -99);
  return <Circle cx={cx} cy={cy} r={3} color={color} />;
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
