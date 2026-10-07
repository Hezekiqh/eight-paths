import {
  DOWN,
  FOLLOW_GAP,
  LEFT,
  RIGHT,
  UP,
  blocked,
  extendTrail,
  facingFor,
  followerAt,
  move,
  startTrail,
  tileAhead,
  walkFrame,
  type Grid,
} from '../engine';
import { MAPS, objectAt, tileAt } from '../maps';

// A 5×5 room: walls all round, one pillar in the middle.
//   #####
//   #...#
//   #.#.#
//   #...#
//   #####
const room: Grid = {
  width: 5,
  height: 5,
  solid: [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
};

describe('collisions', () => {
  it('lets feet stand on floor and not in walls', () => {
    expect(blocked(room, 24, 30)).toBe(false);
    expect(blocked(room, 24, 18)).toBe(true); // footprint pokes into the top wall
    expect(blocked(room, 40, 46)).toBe(true); // on the pillar
  });

  it('slides along a wall instead of sticking to it', () => {
    // pushing up-right against the top wall: x still moves
    const [x, y] = move(room, 24, 21, 3, -3);
    expect(x).toBe(27);
    expect(y).toBe(21);
  });

  it('eases the player into a gap they are nearly lined up with', () => {
    // walking up the left column, clipping the pillar's corner by 3px
    expect(blocked(room, 30, 51)).toBe(true);
    const [x, y] = move(room, 30, 53, 0, -2);
    expect(x).toBe(28);
    expect(y).toBe(53);
  });

  it('never walks through a wall', () => {
    let x = 24;
    let y = 30;
    for (let i = 0; i < 100; i++) [x, y] = move(room, x, y, -2, 0);
    expect(blocked(room, x, y)).toBe(false);
    expect(x).toBeGreaterThanOrEqual(16 + 5);
  });
});

describe('facing', () => {
  it('faces the way the stick mostly points', () => {
    expect(facingFor(0, 1, UP)).toBe(DOWN);
    expect(facingFor(-1, 0.2, DOWN)).toBe(LEFT);
  });

  it('holds the current facing on a diagonal, so the sprite does not flicker', () => {
    expect(facingFor(0.7, 0.72, RIGHT)).toBe(RIGHT);
    expect(facingFor(0.72, 0.7, DOWN)).toBe(DOWN);
  });

  it('finds the tile in front of the feet', () => {
    // feet at the bottom of tile (1, 1), right against the pillar's row below
    expect(tileAhead(24, 31, DOWN)).toEqual([1, 2]);
    expect(tileAhead(24, 22, UP)).toEqual([1, 0]);
    expect(tileAhead(22, 28, LEFT)).toEqual([0, 1]);
    expect(tileAhead(42, 28, RIGHT)).toEqual([3, 1]);
  });
});

describe('party follow', () => {
  it('starts everyone on the lead', () => {
    const trail = startTrail(40, 40);
    expect(followerAt(trail, 1, DOWN)).toEqual([40, 40, DOWN]);
  });

  it('puts followers behind the lead along the path walked', () => {
    let trail = startTrail(0, 0);
    for (let x = 1; x <= 60; x++) trail = extendTrail(trail, x, 0);
    const [x1, , f1] = followerAt(trail, 1, RIGHT);
    const [x2] = followerAt(trail, 2, RIGHT);
    expect(x1).toBe(60 - FOLLOW_GAP);
    expect(x2).toBe(60 - FOLLOW_GAP * 2);
    expect(f1).toBe(RIGHT);
  });

  it('ignores tiny movements', () => {
    const trail = startTrail(10, 10);
    expect(extendTrail(trail, 10.3, 10.3)).toBe(trail);
  });

  it('keeps the party the same distance back however fast the lead walks', () => {
    // a pixel a frame up to four and a half (2× game speed): followers stand FOLLOW_GAP pixels back
    for (const step of [1, 2.3, 4.5]) {
      let trail = startTrail(0, 0);
      for (let x = step; x <= 90; x += step) trail = extendTrail(trail, x, 0);
      const last = trail[trail.length - 2];
      expect(last - followerAt(trail, 1, RIGHT)[0]).toBeCloseTo(FOLLOW_GAP);
      expect(last - followerAt(trail, 2, RIGHT)[0]).toBeCloseTo(FOLLOW_GAP * 2);
    }
  });

  it('steps through the walk cycle only while moving', () => {
    expect(walkFrame(7, false)).toBe(0);
    expect([0, 7, 14, 21].map((d) => walkFrame(d, true))).toEqual([0, 1, 0, 2]);
  });
});

describe('the Archive', () => {
  const map = MAPS.archive;

  it('has a rectangular layout', () => {
    expect(new Set(map.tiles.map((r) => r.length)).size).toBe(1);
    expect(map.solid).toHaveLength(map.width * map.height);
  });

  it('starts the player on open floor', () => {
    const { x, y } = map.spawn;
    expect(map.solid[y * map.width + x]).toBe(0);
  });

  it('keeps NPCs solid and findable', () => {
    for (const n of map.npcs) {
      expect(map.solid[n.y * map.width + n.x]).toBe(1);
      expect(objectAt(map, n.x, n.y)).toBe(n);
    }
  });

  it('has something to read for every solid tile the player can face', () => {
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const c = tileAt(map, x, y);
        if (c === '#' || c === '.' || c === 'r' || objectAt(map, x, y)) continue;
        expect(map.examine[c]).toBeDefined();
      }
  });
});
