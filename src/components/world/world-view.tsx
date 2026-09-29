import {
  Atlas,
  Canvas,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Rect,
  useImage,
  useRSXformBuffer,
  useRectBuffer,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  SPEED,
  byFeet,
  extendTrail,
  facingFor,
  followerAt,
  move,
  startTrail,
  walkFrame,
  type Grid,
} from '@/world/engine';
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
};

/**
 * Draws a map and everyone on it with Skia, sharp-pixelled at `scale`, and
 * runs walking on the UI thread: stick in, collisions, party follow, camera.
 */
export function WorldView({ map, party, sim, width, height, scale, active, marks = [] }: Props) {
  const mapImage = useImage(map.image);
  const walkers = useImage(WALKERS_IMAGE);
  const grid = useMemo<Grid>(() => ({ solid: map.solid, width: map.width, height: map.height }), [map]);
  const partyRows = useMemo(() => party.map((id) => WALKER_ROWS[id]), [party]);
  const npcs = useMemo(
    () => map.npcs.map((n) => [WALKER_ROWS[n.sprite], ...npcFeet(n)] as [number, number, number]),
    [map],
  );
  const count = partyRows.length + npcs.length;

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
    if (sim.frozen.get()) {
      ix = 0;
      iy = 0;
    }
    const push = Math.hypot(ix, iy);
    let moving = false;
    if (push > 0.25) {
      sim.facing.set(facingFor(ix, iy, sim.facing.get()));
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
        {walkers && <Atlas image={walkers} sprites={sprites} transforms={transforms} sampling={NEAREST} />}
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
