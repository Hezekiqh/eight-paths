// Pixel art for the World: each map baked into one picture, and the overworld
// walkers (the party and NPCs) in four directions with a walk cycle.
//
//   node scripts/world-art.mjs
//
// writes assets/world/<map>.png (1 pixel per art pixel; the app scales it up
// with sharp pixels), assets/world/walkers.png and src/world/walkers.ts.
// Maps are laid out in src/world/maps/<map>.json, which the app also reads
// for walls, so the picture and the collisions always agree.

import { cityArt } from './city-art.mjs';
import { FLOORS, interiorArt } from './interior-art.mjs';
import { mineArt } from './mine-art.mjs';
import { ASH, castleArt } from './castle-art.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const TILE = 16;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));
/** Rounds an amount (0–1) to quarters, dithering between them so blends stay pixel art. */
const dither = (a, x, y, steps = 4) => {
  const q = Math.max(0, a) * steps;
  const base = Math.floor(q);
  return Math.min(1, (q - base > BAYER[y & 3][x & 3] ? base + 1 : base) / steps);
};
function rng(seed) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}
/** A steady pseudo-random number (0–1) for a grid cell, so textures don't shift between runs. */
const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function canvas(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  g.w = w;
  g.h = h;
  return g;
}
const put = (g, x, y, c) => {
  x = Math.round(x);
  y = Math.round(y);
  if (y >= 0 && y < g.h && x >= 0 && x < g.w) g[y][x] = typeof c === 'string' ? hex(c) : c;
};
const box = (g, x, y, w, h, c) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, c);
};
const ellipse = (g, cx, cy, rx, ry, c) => {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) put(g, cx + x, cy + y, c);
};
/**
 * The silk cocoon, the same egg as the hatch and the intro (drawCocoon in
 * realm-art.mjs): narrow at the top, widest low down, lit from the left with
 * the silk's bands. Bottom-centre at (cx, by), `w` by `h` art pixels. Returns
 * each row's half-width, so a husk can be split down the front.
 */
function egg(g, cx, by, w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1) - 0.55) * 2;
    const hw = Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - ny * ny * (ny < 0 ? 0.9 : 1.6))));
    rows.push(hw);
    for (let i = -hw; i <= hw; i++) {
      // as the hatch draws it: a bright edge on the left, shade on the right, pale wrap bands
      let c = P.silk;
      if (i > hw * 0.45) c = P.silkShade;
      if (i > hw * 0.8) c = P.silkDark;
      if (i < -hw * 0.6 && y > 1) c = P.silkBright;
      if ((y + Math.round(i * 0.5)) % 4 === 0) c = P.silkBand;
      put(g, cx + i, by - h + y, c);
    }
    put(g, cx - hw - 1, by - h + y, '#3A3044');
    put(g, cx + hw + 1, by - h + y, '#3A3044');
  }
  return rows;
}
function toPng(g) {
  const png = new PNG({ width: g.w, height: g.h });
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const i = (y * g.w + x) * 4;
      const c = g[y][x];
      if (!c) continue;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = c[3] ?? 255;
    }
  return PNG.sync.write(png);
}

// ---------------------------------------------------------------------------
// The Archive's tiles

const P = {
  void: '#0C0806',
  wood: '#3A2418',
  woodDark: '#24160E',
  woodLight: '#5A3A26',
  trim: '#7A5234',
  plank: ['#5A3A26', '#52341F', '#61402A'],
  seam: '#2E1C12',
  rug: '#6E1A20',
  rugDark: '#561218',
  rugGold: '#C8963A',
  scroll: ['#E8DCC0', '#C9B890', '#D8C8A0'],
  scrollEnd: '#6A5A48',
  ribbon: '#B3261E',
  stone: '#3A302C',
  stoneLight: '#56483F',
  sky: '#4A5A8A',
  skyLight: '#7A8AC0',
  iron: '#2A2228',
  flame: '#FFD060',
  flame2: '#FFB04A',
  wax: '#F3ECDD',
  cork: '#8A6038',
  paper: '#EFE4C8',
  // the hatch's own silk (realm-art.mjs drawCocoon), so a cocoon in the World is the one that hatches
  silk: '#EDE6D6',
  silkShade: '#C9BFAE',
  silkDark: '#A69C8C',
  silkBand: '#D8CFBD',
  silkBright: '#FFF7DC',
};

/** A row of scroll ends lying on a shelf whose board is at `y`. */
function scrollRow(g, x0, x1, y, seed) {
  box(g, x0, y, x1 - x0, 1, P.trim);
  box(g, x0, y + 1, x1 - x0, 1, P.woodDark);
  for (let x = x0 + 1; x < x1 - 2; x += 3) {
    if (hash(x, y, seed) < 0.18) continue;
    const c = P.scroll[Math.floor(hash(x, y, seed + 1) * 3)];
    box(g, x, y - 3, 3, 3, c);
    put(g, x + 1, y - 2, P.scrollEnd);
    if (hash(x, y, seed + 2) < 0.15) box(g, x, y - 1, 3, 1, P.ribbon);
  }
}

const TILE_ART = {
  '#'(g, x, y) {
    box(g, x, y, TILE, TILE, P.void);
  },
  '.'() {}, // the floor is laid everywhere first
  r() {}, // the rug too
  W(g, x, y, m) {
    const upper = m.at(0, -1) === '#';
    box(g, x, y, TILE, TILE, P.woodDark);
    if (upper) {
      box(g, x, y, TILE, 3, P.trim);
      box(g, x, y + 3, TILE, 1, P.wood);
      scrollRow(g, x, x + TILE, y + 9, 1);
      scrollRow(g, x, x + TILE, y + 15, 2);
    } else {
      scrollRow(g, x, x + TILE, y + 5, 3);
      box(g, x, y + 11, TILE, 5, P.wood);
      box(g, x, y + 11, TILE, 1, P.trim);
    }
    // uprights between bays
    if ((x / TILE) % 3 === 0) box(g, x, y + (upper ? 3 : 0), 2, upper ? 13 : 11, P.wood);
  },
  Q(g, x, y) {
    TILE_ART.W(g, x, y, { at: () => 'W' });
    box(g, x + 1, y - 6, 14, 15, P.woodLight);
    box(g, x + 2, y - 5, 12, 13, P.cork);
    for (const [px, py, w, h] of [
      [3, -4, 4, 5],
      [8, -3, 5, 4],
      [4, 2, 5, 5],
      [10, 2, 3, 4],
    ]) {
      box(g, x + px, y + py, w, h, P.paper);
      box(g, x + px + 1, y + py + 2, w - 2, 1, '#B8A888');
      put(g, x + px + Math.floor(w / 2), y + py, P.ribbon);
    }
  },
  M(g, x, y, m) {
    const upper = m.at(0, -1) === '#';
    const left = m.at(-1, 0) !== 'M';
    box(g, x, y, TILE, TILE, P.woodDark);
    if (upper) {
      box(g, x, y, TILE, 3, P.trim);
      box(g, x + (left ? 3 : 0), y + 4, left ? 13 : 13, 12, P.sky);
      for (let i = 0; i < 6; i++) put(g, x + 4 + hash(x, i) * 10, y + 5 + hash(i, x) * 9, P.skyLight);
    } else {
      box(g, x + (left ? 3 : 0), y, 13, 9, P.sky);
      box(g, x, y + 9, TILE, 2, P.trim);
      box(g, x, y + 11, TILE, 5, P.wood);
      box(g, x, y + 11, TILE, 1, P.trim);
    }
    // the mullion down the middle of the pair, and the crossbar
    if (!left) box(g, x - 1, y + (upper ? 4 : 0), 2, upper ? 12 : 9, P.woodDark);
    if (!upper) box(g, x + (left ? 3 : 0), y + 2, 13, 1, P.woodDark);
  },
  T(g, x, y, m) {
    bookcase(g, x, y, m, true);
  },
  B(g, x, y, m) {
    bookcase(g, x, y, m, false);
  },
  c(g, x, y) {
    ellipse(g, x + 8, y + 14, 4, 1, '#1A1210');
    box(g, x + 7, y + 6, 2, 8, P.iron);
    box(g, x + 4, y + 7, 8, 1, P.iron);
    box(g, x + 5, y + 13, 6, 1, P.iron);
    for (const cx of [4, 7, 11]) {
      const top = cx === 7 ? 1 : 3;
      box(g, x + cx, y + top, 1 + (cx === 7 ? 1 : 0), 7 - top, P.wax);
      put(g, x + cx, y + top - 1, P.flame2);
      put(g, x + cx, y + top - 2, P.flame);
    }
  },
  D(g, x, y, m) {
    const left = m.at(-1, 0) !== 'D';
    box(g, x, y + 3, TILE, 9, P.woodLight);
    box(g, x, y + 12, TILE, 4, P.wood);
    box(g, x, y + 3, TILE, 1, P.trim);
    if (left) {
      box(g, x, y + 3, 1, 13, P.woodDark);
      // the open ledger
      box(g, x + 6, y + 4, 10, 7, P.paper);
      box(g, x + 15, y + 4, 1, 7, '#B8A888');
      for (let r = 5; r < 10; r += 2) box(g, x + 7, y + r, 7, 1, '#9A8A70');
    } else {
      box(g, x + 15, y + 3, 1, 13, P.woodDark);
      box(g, x, y + 4, 7, 7, P.paper);
      for (let r = 5; r < 10; r += 2) box(g, x + 2, y + r, 4, 1, '#9A8A70');
      box(g, x + 10, y + 5, 3, 3, '#1A1426'); // ink pot
      put(g, x + 11, y + 4, '#3A3050');
      box(g, x + 13, y + 2, 1, 5, P.wax); // quill
      put(g, x + 12, y + 1, P.wax);
    }
  },
  p(g, x, y) {
    ellipse(g, x + 8, y + 13, 6, 2, '#2A1A12');
    for (const [px, py] of [
      [2, 9],
      [7, 9],
      [4, 5],
      [9, 6],
      [6, 2],
    ]) {
      box(g, x + px, y + py, 5, 4, P.scroll[(px + py) % 3]);
      box(g, x + px, y + py, 1, 4, P.scrollEnd);
      box(g, x + px + 4, y + py, 1, 4, P.scroll[1]);
    }
  },
  O(g, x, y, m) {
    // The cocoon covers a 2×2 block; draw it once, from its top-left tile.
    if (m.at(-1, 0) === 'O' || m.at(0, -1) === 'O') return;
    const cx = x + 16;
    ellipse(g, cx, y + 26, 13, 4, P.stoneLight);
    ellipse(g, cx, y + 27, 12, 3, P.stone);
    box(g, cx - 12, y + 26, 25, 2, P.stone);
    ellipse(g, cx, y + 28, 12, 2, '#2A221E');
    // the husk, split down the front: the same egg as every cocoon
    const rows = egg(g, cx, y + 27, 15, 25);
    rows.forEach((hw, j) => {
      const split = Math.max(0, Math.round(hw * 0.35 - Math.abs(j - 12) / 6 + hash(j, 1)));
      if (j > 2 && j < 22) box(g, cx - Math.floor(split / 2), y + 3 + j, split, 1, j > 8 ? P.silkDark : '#1A1410');
    });
    // loose strands on the dais
    for (const [sx, sy] of [
      [-9, 24],
      [8, 25],
      [11, 23],
    ])
      box(g, cx + sx, y + sy, 3, 1, P.silk);
  },
  _(g, x, y) {
    box(g, x, y, TILE, TILE, P.stone);
    box(g, x, y, TILE, 2, P.stoneLight);
    box(g, x, y + 2, TILE, 1, '#1A1210');
    for (let i = 0; i < TILE; i += 8) box(g, x + i + ((y / TILE) % 2) * 4, y + 3, 1, 13, '#2A221E');
  },
  m(g, x, y, m) {
    // The Mirror Room's great mirror, a 2×2 block of wall: drawn once, from its top-left tile.
    if (m.at(-1, 0) === 'm' || m.at(0, -1) === 'm') return;
    // the wall behind all four tiles first, so the tiles after this one don't paint over the glass
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const at = (a, b) => (m.at(a + dx, b + dy) === 'm' ? 'W' : m.at(a + dx, b + dy));
      TILE_ART.W(g, x + dx * TILE, y + dy * TILE, { at });
    }
    box(g, x + 3, y + 1, 26, 30, P.trim);
    box(g, x + 4, y + 2, 24, 28, '#B8C0D0');
    box(g, x + 5, y + 3, 22, 26, '#5A6A88');
    for (let j = 0; j < 26; j++)
      for (let i = 0; i < 22; i++) if (hash(i, j, 77) < 0.08) put(g, x + 5 + i, y + 3 + j, '#7A8AB0');
    // a pale sheen across the glass
    for (let i = 0; i < 12; i++) put(g, x + 8 + i, y + 22 - i, '#C8D4F0');
    for (let i = 0; i < 8; i++) put(g, x + 9 + i, y + 25 - i, '#A8B4D8');
    put(g, x + 15, y, P.rugGold);
    box(g, x + 14, y + 1, 3, 1, P.rugGold);
  },
  g(g, x, y) {
    // The green candle: the same candelabra, but its flames burn green.
    ellipse(g, x + 8, y + 14, 4, 1, '#1A1210');
    box(g, x + 7, y + 6, 2, 8, P.iron);
    box(g, x + 4, y + 7, 8, 1, P.iron);
    box(g, x + 5, y + 13, 6, 1, P.iron);
    for (const cx of [4, 7, 11]) {
      const top = cx === 7 ? 1 : 3;
      box(g, x + cx, y + top, 1 + (cx === 7 ? 1 : 0), 7 - top, P.wax);
      put(g, x + cx, y + top - 1, '#3AC85A');
      put(g, x + cx, y + top - 2, '#9AF0A0');
    }
  },
  '='(g, x, y, m) {
    const left = m.at(-1, 0) !== '=';
    box(g, x, y, TILE, TILE, P.woodDark);
    box(g, x, y, TILE, 2, P.stoneLight);
    box(g, x + (left ? 1 : 0), y + 2, 15, 14, P.wood);
    for (let i = 4; i < 16; i += 4) box(g, x + (left ? 1 : 0), y + i, 15, 1, P.woodDark);
    box(g, x + (left ? 1 : 0), y + 6, 15, 1, P.iron);
    box(g, x + (left ? 1 : 0), y + 12, 15, 1, P.iron);
    box(g, x + (left ? 14 : 1), y + 8, 1, 3, P.rugGold); // ring handles
  },
};

/** A free-standing bookcase: `T` is its top half, `B` its bottom. Runs of them share end panels. */
function bookcase(g, x, y, m, top) {
  const run = top ? 'T' : 'B';
  const left = m.at(-1, 0) !== run;
  const right = m.at(1, 0) !== run;
  box(g, x, y, TILE, TILE, P.woodDark);
  if (top) {
    box(g, x, y, TILE, 3, P.woodLight);
    box(g, x, y + 3, TILE, 1, P.wood);
    scrollRow(g, x, x + TILE, y + 10, 4);
  } else {
    scrollRow(g, x, x + TILE, y + 3, 5);
    scrollRow(g, x, x + TILE, y + 10, 6);
    box(g, x, y + 12, TILE, 3, P.wood);
    box(g, x, y + 15, TILE, 1, '#1A1210');
  }
  if (left) box(g, x, y, 2, TILE, P.wood);
  if (right) box(g, x + 14, y, 2, TILE, P.wood);
}

function drawMap(map) {
  const rows = map.tiles;
  const H = rows.length;
  const W = rows[0].length;
  const g = canvas(W * TILE, H * TILE);
  const at = (tx, ty) => rows[ty]?.[tx] ?? '#';
  const walkable = (c) => c === '.' || c === 'r';

  // Floorboards run under everything, continuous from tile to tile.
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const row = Math.floor(y / 4);
      const joint = (row * 7) % 24;
      const seg = Math.floor((x + joint) / 24);
      let c = hex(P.plank[Math.floor(hash(seg, row, 9) * 3)]);
      if (y % 4 === 3 || (x + joint) % 24 === 0) c = hex(P.seam);
      else if (hash(x, y, 3) < 0.04) c = mix(c, hex(P.seam), 0.5);
      // a room can lay another floor: stone flags, white tile, straw (interior-art.mjs)
      if (map.floor && FLOORS[map.floor]) c = hex(FLOORS[map.floor](x, y, hash));
      g[y][x] = c;
    }

  // The rug: a crimson runner with a gold border, wherever `r` or the cocoon's dais sits.
  const onRug = (tx, ty) => at(tx, ty) === 'r' || at(tx, ty) === 'O';
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      if (!onRug(tx, ty)) continue;
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const px = tx * TILE + i;
          const py = ty * TILE + j;
          const edge =
            (i < 3 && !onRug(tx - 1, ty)) ||
            (i > 12 && !onRug(tx + 1, ty)) ||
            (j < 3 && !onRug(tx, ty - 1)) ||
            (j > 12 && !onRug(tx, ty + 1));
          const rim =
            (i === 1 && !onRug(tx - 1, ty)) ||
            (i === 14 && !onRug(tx + 1, ty)) ||
            (j === 1 && !onRug(tx, ty - 1)) ||
            (j === 14 && !onRug(tx, ty + 1));
          let c = P.rug;
          if (edge) c = rim ? P.rugDark : P.rugGold;
          else if (Math.abs((px % 8) - 4) + Math.abs((py % 8) - 4) === 3) c = P.rugDark;
          g[py][px] = hex(c);
        }
    }

  // Soft shadows under walls and furniture, on the floor tile below them.
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      if (!walkable(at(tx, ty)) || walkable(at(tx, ty - 1))) continue;
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < TILE; i++) {
          const px = tx * TILE + i;
          const py = ty * TILE + j;
          g[py][px] = mix(g[py][px], hex('#100A08'), dither(0.55 - j * 0.14, px, py));
        }
    }

  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      // `art` draws a letter as another (a hidden door as the wall it hides in)
      const look = (c) => map.art?.[c] ?? c;
      const draw = TILE_ART[look(at(tx, ty))];
      if (!draw) throw new Error(`No art for tile "${at(tx, ty)}" in ${map.id}`);
      draw(g, tx * TILE, ty * TILE, { at: (dx, dy) => look(at(tx + dx, ty + dy)), wall: map.wall });
    }

  // Moonlight from the high window falls onto the cocoon.
  const win = [];
  rows.forEach((r, ty) => [...r].forEach((c, tx) => c === 'M' && win.push([tx, ty])));
  if (win.length) {
    const cx = ((Math.min(...win.map((w) => w[0])) + Math.max(...win.map((w) => w[0])) + 1) / 2) * TILE;
    const y0 = (Math.max(...win.map((w) => w[1])) + 1) * TILE;
    for (let y = y0; y < y0 + TILE * 6; y++)
      for (let x = 0; x < g.w; x++) {
        const half = 17 + (y - y0) * 0.1;
        const d = Math.abs(x - cx) / half;
        const fade = 1 - (y - y0) / (TILE * 6);
        if (d < 1) g[y][x] = mix(g[y][x], hex('#C8C8F0'), dither(0.24 * (1 - d) * fade, x, y));
      }
  }

  // Candlelight pools around every candelabra.
  rows.forEach((r, ty) =>
    [...r].forEach((c, tx) => {
      if (c !== 'c' && c !== 'g') return;
      const lx = tx * TILE + 8;
      const ly = ty * TILE + 3;
      const R = 44;
      for (let y = ly - R; y < ly + R; y++)
        for (let x = lx - R; x < lx + R; x++) {
          if (y < 0 || x < 0 || y >= g.h || x >= g.w) continue;
          if (at(Math.floor(x / TILE), Math.floor(y / TILE)) === '#') continue;
          const d = Math.hypot(x - lx, (y - ly) * 1.2) / R;
          if (d < 1) g[y][x] = mix(g[y][x], hex(c === 'g' ? '#4AE070' : '#FFB04A'), dither(0.3 * (1 - d) ** 2, x, y));
        }
    }),
  );
  return g;
}

// ---------------------------------------------------------------------------
// Outdoors: routes between the kingdoms (the Courier Road first).

const O = {
  grass: ['#4E7A3A', '#46703A', '#568240'],
  grassDark: '#3A5A2C',
  blade: '#6E9A4E',
  flower: ['#E8D26A', '#E8E0D0', '#C86A8A'],
  dirt: ['#8A6A44', '#7E6040', '#94744C'],
  dirtDark: '#6A5034',
  pebble: '#A89070',
  trunk: '#4A3020',
  trunkDark: '#2E1C12',
  leaf: '#2E5A2E',
  leafLight: '#3E7A3A',
  leafDark: '#1E3E22',
  rail: '#8A7A64',
  railDark: '#5A4C3C',
  stone: '#6A6260',
  stoneLight: '#8A8280',
  stoneDark: '#3A3432',
  thatch: '#B8913A',
  thatchDark: '#8A6A28',
  plaster: '#E0D4B8',
  beam: '#4A3020',
  window: '#6A8AB0',
  door: '#6A4428',
  soil: '#5A4028',
  soilDark: '#3E2C1C',
  turnip: '#C87AB0',
  slate: '#5A5A6A',
  slateDark: '#40404E',
  canvas: '#C8B890',
  canvasDark: '#A89868',
};

/** Kaldor's statues: stone lit from the upper left, an outline, the gold of his vanity, moss. */
const KS = {
  o: '#2A2422',
  d: '#4A4442',
  m: '#6A6260',
  l: '#8A8280',
  h: '#ACA5A0',
  g: '#C8963A',
  G: '#F0C860',
  b: '#8A6420',
  w: '#4E6E34',
};
// prettier-ignore
const KALDOR_STATUE = [
  '.......o........................',
  '......olo.o...........o.........',
  '...ooooloolo..ooooo..olo........',
  '..ohlldlo.oloohllmmoomo.........',
  '.ohllmdlo..olhlllmmdmo..........',
  '.ohlmmdlo...odddddddo...........',
  '.ohlmddlo....olohomo............',
  '..ohmddlo....ohllmmo............',
  '...ooooloohlmohllmmomddo........',
  '......oloohlmolhlmdolmddo.......',
  '......olohlmolmolmomdoldo.......',
  '.....ohllmoolmmohomddoldo.......',
  '.....ollmmo.olmmmmddoolmdo......',
  '......olo...oddgGgddoomddo......',
  '......olo...olmmlmddo.ooo.......',
  '......olo..olmomlodddo..........',
  '......olo..ohlmdoolmdo..........',
  '......olo..ohlmdo.olmdo.........',
  '......olo..ohlmdo..olmdo........',
  '......olo..ohlmdo..ommmdo.......',
  '......olo.ohllmdo..obgGgbo......',
  '......ooo.ooooooo..obgbgbbo.....',
];

// prettier-ignore
const HEADLESS_STATUE = [
  '......oo.o......',
  '.....ohhohho....',
  '...ooohmmmdooo..',
  '..ohlllmmmmddo..',
  '..ohlolmmmoddo..',
  '..ohlolmmmoddo..',
  '..ollolmmdoddo..',
  '...oooldmdooo...',
  '....olmdmmdo....',
  '...olmdmmmddo...',
];

/** Snow instead of grass (a map with ground: 'snow'). */
const SNOW = {
  grass: ['#D8E0EA', '#CED8E4', '#E2E8F0'],
  blade: '#B8C6D4',
  grassDark: '#A8B6C6',
  flower: ['#FFFFFF', '#F0F4FA', '#C8D6E6'],
};

function tree(g, x, y) {
  // A round canopy that spills a little past its tile, over a short trunk.
  box(g, x + 6, y + 10, 4, 6, O.trunk);
  box(g, x + 6, y + 10, 1, 6, O.trunkDark);
  ellipse(g, x + 8, y + 7, 8, 7, O.leafDark);
  ellipse(g, x + 8, y + 6, 7, 6, O.leaf);
  ellipse(g, x + 6, y + 4, 3, 2, O.leafLight);
  for (let i = 0; i < 6; i++)
    put(g, x + 3 + Math.floor(hash(x, y, i) * 10), y + 3 + Math.floor(hash(y, x, i) * 7), O.leafLight);
}

const OUTDOOR_ART = {
  '.'() {},
  ','() {},
  g(g, x, y) {
    // Tall grass tufts.
    for (let i = 0; i < 5; i++) {
      const bx = x + 2 + Math.floor(hash(x, y, i + 20) * 12);
      const by = y + 6 + Math.floor(hash(x, y, i + 30) * 8);
      box(g, bx, by - 3, 1, 3, O.blade);
      put(g, bx - 1, by - 2, O.blade);
      put(g, bx + 1, by - 1, O.grassDark);
    }
  },
  T(g, x, y) {
    tree(g, x, y);
  },
  F(g, x, y, m) {
    box(g, x, y + 6, TILE, 2, O.rail);
    box(g, x, y + 11, TILE, 2, O.rail);
    box(g, x, y + 8, TILE, 1, O.railDark);
    box(g, x, y + 13, TILE, 1, O.railDark);
    if (m.at(-1, 0) !== 'F') box(g, x + 1, y + 4, 3, 11, O.railDark);
    box(g, x + 12, y + 4, 3, 11, O.railDark);
    box(g, x + 12, y + 4, 1, 11, O.rail);
  },
  S(g, x, y) {
    box(g, x + 7, y + 4, 2, 12, O.trunk);
    box(g, x + 1, y + 3, 14, 4, O.rail);
    box(g, x + 1, y + 6, 14, 1, O.railDark);
    put(g, x + 15, y + 4, O.rail);
    put(g, x + 15, y + 5, O.rail);
    box(g, x + 3, y + 4, 8, 1, O.railDark);
  },
  c(g, x, y) {
    // A candle in an iron lantern on a post: the road's save point.
    box(g, x + 7, y + 7, 2, 9, P.iron);
    box(g, x + 5, y + 1, 6, 7, P.iron);
    box(g, x + 6, y + 2, 4, 5, '#3A2A1A');
    box(g, x + 7, y + 4, 2, 3, P.wax);
    put(g, x + 7, y + 3, P.flame);
    put(g, x + 8, y + 2, P.flame2);
  },
  J(g, x, y) {
    // Felix's cocoon, the same egg as every cocoon, half hidden in the long grass (see src/world/cocoons.ts).
    // A little taller than its tile, so the silk's wrap shows.
    egg(g, x + 8, y + 16, 11, 19);
  },
  '='(g, x, y, m) {
    // The Archive's great door, set into a hill of old stone.
    box(g, x, y, TILE, TILE, O.stone);
    for (let j = 0; j < TILE; j += 4) box(g, x, y + j, TILE, 1, O.stoneDark);
    const left = m.at(-1, 0) !== '=';
    box(g, x + (left ? 3 : 0), y + 3, left ? 13 : 13, 13, '#2A1A10');
    box(g, x + (left ? 4 : 0), y + 4, left ? 12 : 12, 12, P.woodDark);
    if (left) box(g, x + 14, y + 9, 2, 2, P.rugGold);
  },
  '>'() {},
  '<'() {},
  '^'() {}, // road ends: the way north and the way south
  _() {},
  H(g, x, y, m) {
    // A cottage: thatched roof over the top rows, timber and plaster on the bottom row.
    const wall = m.at(0, 1) !== 'H' && m.at(0, 1) !== 'D' && m.at(0, 1) !== 'd';
    if (!wall) {
      box(g, x, y, TILE, TILE, O.thatch);
      for (let j = 2; j < TILE; j += 4) box(g, x, y + j, TILE, 1, O.thatchDark);
      if (m.at(0, -1) !== 'H') box(g, x, y, TILE, 2, O.thatchDark);
      if (m.at(-1, 0) !== 'H') box(g, x, y, 2, TILE, O.thatchDark);
      if (m.at(1, 0) !== 'H') box(g, x + 14, y, 2, TILE, O.thatchDark);
      return;
    }
    cottageWall(g, x, y, m);
    box(g, x + 5, y + 4, 6, 5, O.window);
    box(g, x + 7, y + 4, 2, 5, O.beam);
    box(g, x + 5, y + 6, 6, 1, O.beam);
  },
  D(g, x, y, m) {
    cottageWall(g, x, y, m);
    box(g, x + 4, y + 3, 8, 13, O.door);
    box(g, x + 4, y + 3, 8, 1, O.beam);
    put(g, x + 10, y + 10, P.rugGold);
  },
  d(g, x, y, m) {
    OUTDOOR_ART.D(g, x, y, m);
  },
  h(g, x, y) {
    // A gap in the trees: drawn as trees, but a little thinner, for sharp eyes.
    tree(g, x, y);
    box(g, x + 7, y + 4, 2, 10, O.leafDark);
  },
  L(g, x, y) {
    // A satchel strap snagged on a low branch, with a folded page.
    box(g, x + 2, y + 5, 12, 2, O.trunk);
    box(g, x + 8, y + 7, 2, 5, '#6A4A2A');
    box(g, x + 7, y + 11, 4, 3, P.paper);
    put(g, x + 8, y + 12, O.railDark);
  },
  f(g, x, y) {
    box(g, x, y, TILE, TILE, O.soil);
    for (let j = 1; j < TILE; j += 5) {
      box(g, x, y + j + 2, TILE, 1, O.soilDark);
      for (let i = 2; i < TILE; i += 5) {
        box(g, x + i, y + j, 3, 2, O.leafLight);
        put(g, x + i + 1, y + j + 2, O.turnip);
      }
    }
  },
  w(g, x, y) {
    ellipse(g, x + 8, y + 10, 7, 5, O.stoneDark);
    ellipse(g, x + 8, y + 9, 6, 4, O.stone);
    ellipse(g, x + 8, y + 9, 4, 2, '#101418');
    put(g, x + 9, y + 9, '#E8E0A0');
    box(g, x + 2, y + 1, 2, 9, O.trunk);
    box(g, x + 12, y + 1, 2, 9, O.trunk);
    box(g, x + 1, y + 1, 14, 2, O.thatchDark);
  },
  A(g, x, y, m) {
    // A patched canvas tent: a peaked roof on the top row, the front and flap below.
    const left = m.at(-1, 0) !== 'A';
    const right = m.at(1, 0) !== 'A';
    if (m.at(0, -1) !== 'A') {
      for (let j = 0; j < TILE; j++) {
        const inset = left ? Math.max(0, 12 - j) : 0;
        const outset = right ? Math.max(0, 12 - j) : 0;
        box(g, x + inset, y + j, TILE - inset - outset, 1, j % 4 === 3 ? O.canvasDark : O.canvas);
      }
      return;
    }
    box(g, x, y, TILE, 14, O.canvasDark);
    box(g, x, y + 14, TILE, 2, '#3A2A18');
    if (!left && !right) box(g, x + 4, y + 3, 8, 11, '#2A2018');
  },
  x(g, x, y) {
    // A campfire in a ring of stones.
    ellipse(g, x + 8, y + 11, 6, 3, O.stoneDark);
    box(g, x + 4, y + 10, 8, 2, O.trunk);
    ellipse(g, x + 8, y + 7, 3, 5, P.flame2);
    ellipse(g, x + 8, y + 8, 2, 3, P.flame);
  },
  M(g, x, y, m) {
    // The hill's rock face, with the fort buried in it.
    box(g, x, y, TILE, TILE, O.stone);
    for (let j = 0; j < TILE; j += 5) box(g, x + ((j * 7) % 9), y + j, 7, 1, O.stoneDark);
    if (m.at(0, -1) !== 'M' && m.at(0, -1) !== 'E') box(g, x, y, TILE, 3, O.leaf);
    if (m.at(0, 1) !== 'M' && m.at(0, 1) !== 'E') box(g, x, y + 13, TILE, 3, O.stoneDark);
  },
  E(g, x, y, m) {
    // The fort's arch, half buried: a dark way in.
    OUTDOOR_ART.M(g, x, y, m);
    const left = m.at(-1, 0) !== 'E';
    const right = m.at(1, 0) !== 'E';
    box(g, x + (left ? 3 : 0), y + 3, TILE - (left ? 3 : 0) - (right ? 3 : 0), 13, '#0C0806');
    if (left) box(g, x + 1, y + 1, 3, 15, O.stoneLight);
    if (right) box(g, x + 12, y + 1, 3, 15, O.stoneLight);
    if (m.at(0, -1) !== 'E') box(g, x, y + 1, TILE, 3, O.stoneLight);
  },
  O(g, x, y) {
    ellipse(g, x + 8, y + 10, 7, 6, O.stoneDark);
    ellipse(g, x + 7, y + 8, 6, 5, O.stone);
    ellipse(g, x + 5, y + 6, 2, 1, O.stoneLight);
  },
  Y(g, x, y) {
    // A child's wooden sword, left in the rubble.
    box(g, x + 4, y + 9, 9, 2, '#A07A4A');
    box(g, x + 11, y + 7, 2, 6, '#6A4A2A');
    box(g, x + 13, y + 9, 2, 2, '#6A4A2A');
  },
  s() {}, // cobbles are laid with the roads
  I(g, x, y, m) {
    // A stone house: slate roof over the top rows, stone wall with a shuttered window below.
    const wall = !'IDd567384'.includes(m.at(0, 1) ?? '');
    if (!wall) {
      box(g, x, y, TILE, TILE, O.slate);
      for (let j = 3; j < TILE; j += 4) box(g, x, y + j, TILE, 1, O.slateDark);
      if (m.at(0, -1) !== 'I') box(g, x, y, TILE, 2, O.slateDark);
      return;
    }
    box(g, x, y, TILE, TILE, O.stoneLight);
    for (let j = 0; j < TILE; j += 5) box(g, x, y + j, TILE, 1, O.stone);
    box(g, x + 5, y + 4, 6, 6, '#2A2430');
    box(g, x + 5, y + 4, 6, 1, O.beam);
    box(g, x, y + 14, TILE, 2, O.stoneDark);
  },
  K(g, x, y, m) {
    // Kaldor's colossal statue, drawn once across its 2x2 tiles: horned helm,
    // beard, fur mantle, his axe planted beside him and one boot on a broken
    // crown, on a plinth with a gilded plaque. Kaldorhold's second statue faces
    // the first, admiringly.
    if (m.at(-1, 0) === 'K' || m.at(0, -1) === 'K') return;
    const mirror = [2, 3, 4, 5, 6, 7, 8, 9, 10].some((i) => m.at(-i, 0) === 'K');
    // Its shadow on the ground, falling down and to the right.
    for (let j = 21; j < 32; j++)
      for (let i = 5; i < 32; i++) {
        const c = g[y + j]?.[x + i];
        if (c) g[y + j][x + i] = mix(c, [16, 12, 10], 0.4);
      }
    // The plinth.
    box(g, x + 3, y + 19, 26, 1, KS.o);
    box(g, x + 3, y + 20, 26, 2, KS.l);
    box(g, x + 4, y + 20, 3, 2, KS.h);
    box(g, x + 3, y + 22, 26, 1, KS.h);
    put(g, x + 3, y + 20, KS.o);
    put(g, x + 3, y + 21, KS.o);
    put(g, x + 3, y + 22, KS.o);
    put(g, x + 28, y + 20, KS.o);
    put(g, x + 28, y + 21, KS.o);
    put(g, x + 28, y + 22, KS.o);
    box(g, x + 2, y + 23, 28, 1, KS.o);
    box(g, x + 2, y + 24, 28, 4, KS.m);
    box(g, x + 3, y + 24, 1, 4, KS.l);
    box(g, x + 26, y + 24, 3, 4, KS.d);
    box(g, x + 2, y + 24, 1, 4, KS.o);
    box(g, x + 29, y + 24, 1, 4, KS.o);
    box(g, x + 1, y + 28, 30, 1, KS.o);
    box(g, x + 1, y + 29, 30, 1, KS.l);
    put(g, x + 2, y + 29, KS.h);
    box(g, x + 27, y + 29, 3, 1, KS.d);
    put(g, x + 1, y + 29, KS.o);
    put(g, x + 30, y + 29, KS.o);
    box(g, x + 1, y + 30, 30, 1, KS.o);
    // The plaque, and a crack the masons hoped he wouldn't notice.
    box(g, x + 11, y + 24, 10, 3, KS.b);
    box(g, x + 12, y + 25, 8, 1, KS.g);
    put(g, x + 12, y + 25, KS.G);
    for (let i = 13; i < 19; i += 2) put(g, x + i, y + 25, KS.b);
    put(g, x + 7, y + 24, KS.d);
    put(g, x + 7, y + 25, KS.d);
    put(g, x + 8, y + 26, KS.d);
    put(g, x + 8, y + 27, KS.d);
    // Moss at the foot.
    for (const [i, j] of [
      [2, 29],
      [3, 29],
      [4, 29],
      [2, 27],
      [3, 27],
      [27, 29],
      [24, 29],
    ])
      put(g, x + i, y + j, KS.w);
    // Kaldor himself.
    KALDOR_STATUE.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== '.') put(g, x + (mirror ? 31 - i : i), y + j, KS[ch]);
      }),
    );
  },
  Z(g, x, y) {
    // The headless king: a robed statue snapped off at the neck, the break
    // still pale, on a plinth whose plaque has been pried off.
    for (let i = 2; i < 16; i++) {
      const c = g[y + 15]?.[x + i];
      if (c) g[y + 15][x + i] = mix(c, [16, 12, 10], 0.4);
    }
    for (let j = 10; j < 15; j++) {
      const c = g[y + j]?.[x + 15];
      if (c) g[y + j][x + 15] = mix(c, [16, 12, 10], 0.4);
    }
    box(g, x + 2, y + 9, 12, 1, KS.o);
    box(g, x + 2, y + 10, 12, 1, KS.l);
    box(g, x + 3, y + 10, 2, 1, KS.h);
    put(g, x + 2, y + 10, KS.o);
    put(g, x + 13, y + 10, KS.o);
    box(g, x + 1, y + 11, 14, 1, KS.o);
    box(g, x + 1, y + 12, 14, 2, KS.m);
    box(g, x + 2, y + 12, 1, 2, KS.l);
    box(g, x + 12, y + 12, 2, 2, KS.d);
    put(g, x + 1, y + 12, KS.o);
    put(g, x + 1, y + 13, KS.o);
    put(g, x + 14, y + 12, KS.o);
    put(g, x + 14, y + 13, KS.o);
    box(g, x + 1, y + 14, 14, 1, KS.o);
    // Where the plaque was: a pale patch, four nail holes, a pry mark.
    box(g, x + 5, y + 12, 6, 2, KS.l);
    for (const [i, j] of [
      [5, 12],
      [10, 12],
      [5, 13],
      [10, 13],
    ])
      put(g, x + i, y + j, KS.o);
    put(g, x + 8, y + 13, KS.d);
    put(g, x + 4, y + 13, KS.w);
    // Chips of the head, never swept up.
    put(g, x + 11, y + 10, KS.d);
    put(g, x + 12, y + 10, KS.m);
    HEADLESS_STATUE.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== '.') put(g, x + i, y + j, KS[ch]);
      }),
    );
  },
  X(g, x, y) {
    // An iron cage.
    box(g, x + 1, y + 2, 14, 13, '#1A1618');
    for (let i = 1; i < 16; i += 3) box(g, x + i, y + 2, 1, 13, P.iron);
    box(g, x + 1, y + 2, 14, 1, P.iron);
    box(g, x + 1, y + 14, 14, 1, P.iron);
  },
  n(g, x, y) {
    // A banner on a pole: the horde's fist crushing a crown.
    box(g, x + 3, y, 2, TILE, O.trunk);
    box(g, x + 5, y + 1, 9, 10, '#6A1216');
    box(g, x + 7, y + 3, 5, 3, P.rugGold);
    box(g, x + 7, y + 6, 5, 3, '#E8B48C');
  },
  j(g, x, y) {
    // A regimental cairn.
    ellipse(g, x + 8, y + 12, 6, 3, O.stoneDark);
    ellipse(g, x + 8, y + 9, 5, 3, O.stone);
    ellipse(g, x + 8, y + 6, 3, 2, O.stoneLight);
  },
  G(g, x, y) {
    // A barrier of sharpened spears.
    box(g, x, y + 8, TILE, 3, O.trunk);
    for (let i = 1; i < TILE; i += 3) {
      box(g, x + i, y + 2, 2, 13, O.beam);
      put(g, x + i, y + 1, O.stoneLight);
    }
  },
  b(g, x, y) {
    box(g, x + 1, y + 6, 14, 3, O.beam);
    box(g, x + 2, y + 9, 2, 5, O.beam);
    box(g, x + 12, y + 9, 2, 5, O.beam);
  },
  v(g, x, y) {
    // Overgrowth, grown right across the path.
    tree(g, x, y);
    for (let i = 0; i < 10; i++)
      put(g, x + 1 + Math.floor(hash(x, y, i + 40) * 14), y + 8 + Math.floor(hash(y, x, i + 41) * 7), O.leafDark);
  },
  l(g, x, y) {
    // The law stone.
    box(g, x + 3, y + 2, 10, 13, O.stone);
    box(g, x + 3, y + 2, 10, 1, O.stoneLight);
    for (let j = 5; j < 13; j += 2) box(g, x + 5, y + j, 6, 1, O.stoneDark);
  },
  R(g, x, y) {
    // A white rose, and beside it a stone head facing it.
    box(g, x + 4, y + 8, 1, 7, O.leaf);
    ellipse(g, x + 4, y + 7, 2, 2, '#F4F0EA');
    ellipse(g, x + 11, y + 11, 3, 3, O.stoneLight);
    put(g, x + 10, y + 10, O.stoneDark);
  },
  p(g, x, y, m) {
    // The sealed portal: an old stone ring, humming.
    const left = m.at(-1, 0) !== 'Q';
    box(g, x, y + 2, TILE, 14, O.stoneDark);
    box(g, x + (left ? 3 : 0), y + 5, 13, 11, '#1A1030');
    for (let i = 0; i < 6; i++)
      put(g, x + 4 + Math.floor(hash(x, y, i) * 9), y + 7 + Math.floor(hash(y, x, i) * 8), '#6A4AB0');
    box(g, x, y + 2, TILE, 2, O.stoneLight);
  },
  m(g, x, y) {
    // A market stall: a striped awning over a plank counter piled with wares.
    for (let i = 0; i < TILE; i += 4) box(g, x + i, y + 1, 2, 6, '#B3261E');
    for (let i = 2; i < TILE; i += 4) box(g, x + i, y + 1, 2, 6, O.plaster);
    box(g, x, y + 7, TILE, 1, O.beam);
    box(g, x + 1, y + 8, 1, 8, O.beam);
    box(g, x + 14, y + 8, 1, 8, O.beam);
    box(g, x + 1, y + 11, 14, 3, O.trunk);
    for (let i = 0; i < 4; i++)
      box(
        g,
        x + 2 + i * 3,
        y + 9,
        2,
        2,
        ['#E8D26A', '#C86A8A', '#E8E0D0', '#8A6A44'][(i + Math.floor(hash(x, y, 1) * 4)) % 4],
      );
  },
  y(g, x, y) {
    // A training dummy: straw on a post, with a crossbar for arms.
    box(g, x + 7, y + 6, 2, 10, O.trunk);
    box(g, x + 2, y + 7, 12, 2, O.trunk);
    ellipse(g, x + 8, y + 9, 3, 4, '#C8A860');
    ellipse(g, x + 8, y + 3, 3, 3, '#C8A860');
    put(g, x + 7, y + 3, O.trunkDark);
    put(g, x + 9, y + 3, O.trunkDark);
  },
  q(g, x, y) {
    // A barrel, iron-hooped.
    ellipse(g, x + 8, y + 9, 5, 6, O.trunk);
    box(g, x + 3, y + 6, 11, 1, P.iron);
    box(g, x + 3, y + 12, 11, 1, P.iron);
    ellipse(g, x + 8, y + 4, 4, 2, '#6A4A2A');
  },
  U(g, x, y, m) {
    // The Kaldorium Maximus: tall sandstone, arched windows up top, dark arches at the bottom.
    box(g, x, y, TILE, TILE, '#B89A6A');
    for (let j = 0; j < TILE; j += 5) box(g, x, y + j, TILE, 1, '#9A7E52');
    const bottom = m.at(0, 1) !== 'U' && m.at(0, 1) !== '8';
    if (m.at(0, -1) !== 'U') box(g, x, y, TILE, 3, '#D8BC8A');
    if (bottom) {
      box(g, x + 3, y + 5, 10, 11, '#2A1E14');
      ellipse(g, x + 8, y + 5, 5, 3, '#2A1E14');
      box(g, x, y + 14, TILE, 2, '#7A6040');
    } else if (m.at(0, -1) === 'U') {
      box(g, x + 5, y + 5, 6, 7, '#5A4630');
      ellipse(g, x + 8, y + 5, 3, 2, '#5A4630');
    }
  },
  8(g, x, y, m) {
    // The Maximus's great gate: a wide dark arch with a red banner above.
    OUTDOOR_ART.U(g, x, y, { at: (dx, dy) => (dy < 0 ? m.at(dx, dy) : 'U') });
    box(g, x, y + 4, TILE, 12, '#140C08');
    if (m.at(-1, 0) !== '8') box(g, x, y + 4, 2, 12, '#D8BC8A');
    if (m.at(1, 0) !== '8') box(g, x + 14, y + 4, 2, 12, '#D8BC8A');
    box(g, x + 3, y, 10, 4, '#6A1216');
  },
  Q(g, x, y) {
    // A faceless statue, toppled face-down in the moss.
    box(g, x + 2, y + 7, 12, 6, O.stoneDark);
    box(g, x + 2, y + 6, 12, 5, O.stoneLight);
    ellipse(g, x + 12, y + 8, 3, 3, O.stoneLight);
    for (let i = 0; i < 5; i++) put(g, x + 3 + i * 2, y + 11, O.leaf);
  },
};

/** The bottom row of a cottage: plaster between timber beams, sitting on a stone footing. */
function cottageWall(g, x, y, m) {
  box(g, x, y, TILE, TILE, O.plaster);
  box(g, x, y, TILE, 1, O.beam);
  if (m.at(-1, 0) !== 'H' && m.at(-1, 0) !== 'D' && m.at(-1, 0) !== 'd') box(g, x, y, 2, TILE, O.beam);
  if (m.at(1, 0) !== 'H' && m.at(1, 0) !== 'D' && m.at(1, 0) !== 'd') box(g, x + 14, y, 2, TILE, O.beam);
  box(g, x, y + 14, TILE, 2, O.stoneDark);
}

// Warrior City's interiors: walls, furniture (interior-art.mjs). Only letters the Archive doesn't use.
for (const [k, v] of Object.entries(interiorArt({ box, put, ellipse, hash }))) if (!TILE_ART[k]) TILE_ART[k] = v;

// Warrior City's buildings, each its own look, and every older town's cottages and stone houses
// redrawn the same way (city-art.mjs). A building draws its own door, so a door tile set into one
// (D, d, or a letter drawn as them) is left alone.
Object.assign(OUTDOOR_ART, cityArt({ box, put, ellipse, hash }));
for (const k of ['D', 'd']) {
  const plain = OUTDOOR_ART[k];
  OUTDOOR_ART[k] = (g, x, y, m) => {
    if ('HIu'.includes(m.at(0, -1))) return;
    plain(g, x, y, m);
  };
}

function drawOutdoor(map) {
  const rows = map.tiles;
  const H = rows.length;
  const W = rows[0].length;
  const g = canvas(W * TILE, H * TILE);
  const at = (tx, ty) => rows[ty]?.[tx] ?? 'T';
  const isPath = (tx, ty) => ',><^_s'.includes(at(tx, ty));
  // The Frost Ward keeps its snow: the horde brought winter with them, a little of it.
  const ground = map.ground === 'snow' ? SNOW : map.ground === 'ash' ? ASH : O;

  // Grass everywhere, in soft patches.
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      let c = hex(ground.grass[Math.floor(hash(Math.floor(x / 6), Math.floor(y / 5), 4) * 3)]);
      if (hash(x, y, 5) < 0.05) c = hex(ground.blade);
      else if (hash(x, y, 6) < 0.04) c = hex(ground.grassDark);
      g[y][x] = c;
    }
  // Wildflowers dotted about.
  for (let i = 0; i < W * H * 0.6; i++) {
    const x = Math.floor(hash(i, 1, 7) * g.w);
    const y = Math.floor(hash(i, 2, 7) * g.h);
    put(g, x, y, ground.flower[i % 3]);
  }

  // The road: packed dirt with soft, grassy edges.
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      if (!isPath(tx, ty)) continue;
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const px = tx * TILE + i;
          const py = ty * TILE + j;
          const nearEdge =
            (i < 2 && !isPath(tx - 1, ty)) ||
            (i > 13 && !isPath(tx + 1, ty)) ||
            (j < 2 && !isPath(tx, ty - 1)) ||
            (j > 13 && !isPath(tx, ty + 1));
          if (nearEdge && hash(px, py, 8) < 0.5) continue;
          const cobble = at(tx, ty) === 's';
          let c = cobble
            ? hex(px % 6 === 0 || py % 5 === 0 ? O.stoneDark : O.stone)
            : hex(O.dirt[Math.floor(hash(Math.floor(px / 3), Math.floor(py / 2), 9) * 3)]);
          if (hash(px, py, 10) < 0.03) c = hex(O.pebble);
          else if (hash(px, py, 11) < 0.04) c = hex(O.dirtDark);
          g[py][px] = c;
        }
    }

  // Trees last, row by row, so lower canopies overlap the ones behind them.
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const draw = OUTDOOR_ART[map.art?.[at(tx, ty)] ?? at(tx, ty)];
      if (!draw) throw new Error(`No outdoor art for tile "${at(tx, ty)}" in ${map.id}`);
      draw(g, tx * TILE, ty * TILE, { at: (dx, dy) => at(tx + dx, ty + dy) });
    }
  return g;
}

// ---------------------------------------------------------------------------
// Dungeons: the Buried Barracks first. Cold stone, old timber, the Hales' banners.

const DG = {
  earth: '#0C0908',
  wall: '#4A4440',
  wallLight: '#625A54',
  wallDark: '#2E2A28',
  mortar: '#3A3432',
  floor: ['#3A3634', '#36322F', '#403B37'],
  floorLine: '#2A2624',
  rubble: '#5A524C',
  timber: '#5A3E28',
  timberDark: '#3A2818',
  iron: '#3A3A42',
  ironLight: '#6A6A78',
  rust: '#8A4A2A',
  banner: '#6A1E22',
  bannerDark: '#4A1216',
  gold: '#C8963A',
  straw: '#A8904A',
  blanket: '#4A5A6A',
  plate: '#6A6A5A',
};

/** The Hales' sigil: an open hand holding a sword by the blade. */
function haleSigil(g, x, y) {
  box(g, x + 7, y, 2, 9, DG.ironLight);
  box(g, x + 5, y + 9, 6, 1, DG.gold);
  box(g, x + 4, y + 3, 8, 4, '#E8C8A0');
  box(g, x + 4, y + 2, 1, 2, '#E8C8A0');
}

const DUNGEON_ART = {
  '#'(g, x, y) {
    box(g, x, y, TILE, TILE, DG.earth);
  },
  '.'() {},
  ','(g, x, y) {
    for (let i = 0; i < 6; i++)
      put(g, x + 2 + Math.floor(hash(x, y, i) * 12), y + 2 + Math.floor(hash(y, x, i) * 12), DG.rubble);
  },
  W(g, x, y, m) {
    // Stone wall: a face where the floor meets it, a top view elsewhere.
    // A hole broken sideways through the wall below is still the same wall, seen from above.
    const sideHole = m.at(0, 1) === 'o' && 'WBCcRGE#'.includes(m.at(0, 2));
    const face = !sideHole && !'W#BCcf'.includes(m.at(0, 1));
    if (!face) {
      box(g, x, y, TILE, TILE, DG.wallDark);
      box(g, x, y, TILE, 1, DG.mortar);
      return;
    }
    box(g, x, y, TILE, TILE, DG.wall);
    for (let j = 0; j < TILE; j += 4) {
      box(g, x, y + j, TILE, 1, DG.mortar);
      const off = (j / 4) % 2 ? 4 : 12;
      box(g, x + off, y + j, 1, 4, DG.mortar);
    }
    box(g, x, y + 14, TILE, 2, DG.wallDark);
  },
  B(g, x, y, m) {
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 3, y + 1, 10, 13, DG.banner);
    box(g, x + 3, y + 1, 10, 1, DG.gold);
    box(g, x + 3, y + 13, 3, 2, DG.banner);
    box(g, x + 10, y + 13, 3, 2, DG.banner);
    haleSigil(g, x, y + 3);
  },
  c(g, x, y, m) {
    // A wall torch: the dungeon's save point.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 7, y + 7, 2, 6, DG.timber);
    ellipse(g, x + 8, y + 5, 2, 3, P.flame2);
    put(g, x + 8, y + 4, P.flame);
  },
  C(g, x, y, m) {
    // A cracked wall: something strong could break through.
    DUNGEON_ART.W(g, x, y, m);
    const crack = [
      [8, 1],
      [7, 3],
      [9, 5],
      [8, 7],
      [6, 9],
      [9, 11],
      [8, 13],
    ];
    for (const [cx, cy] of crack) box(g, x + cx, y + cy, 2, 2, DG.earth);
    box(g, x + 4, y + 8, 3, 1, DG.earth);
    box(g, x + 10, y + 4, 3, 1, DG.earth);
  },
  o(g, x, y, m) {
    // A ragged hole broken through the wall.
    const solid = (c) => 'WBCcRGE#'.includes(c);
    if (solid(m.at(0, -1)) && solid(m.at(0, 1))) {
      // In a wall that runs up and down you go through it sideways, so show the gap from above:
      // the floor carries on through, with broken stone either side and the dark beyond at the map's edge.
      for (let i = 0; i < TILE; i++) {
        const top = 2 + Math.floor(hash(x + i, y, 12) * 2);
        const bottom = 14 - Math.floor(hash(x + i, y, 13) * 2);
        box(g, x + i, y, 1, top, DG.wallDark);
        box(g, x + i, y + bottom, 1, TILE - bottom, DG.wallDark);
        put(g, x + i, y + top - 1, DG.mortar);
        for (let j = 0; j < 3; j++)
          g[y + top + j][x + i] = mix(
            g[y + top + j][x + i],
            hex('#000000'),
            dither(0.5 - j * 0.15, x + i, y + top + j),
          );
      }
      for (const [dx, dy] of [
        [1, 12],
        [3, 11],
        [12, 12],
        [14, 11],
        [2, 4],
        [13, 4],
      ])
        put(g, x + dx, y + dy, DG.rubble);
      for (const [dx, from] of [
        [-1, 0],
        [1, 8],
      ])
        if (m.at(dx, 0) === '#') box(g, x + from, y + 5, 8, 6, DG.earth);
      return;
    }
    DUNGEON_ART.W(g, x, y, m);
    ellipse(g, x + 8, y + 9, 6, 7, DG.earth);
    for (let i = 0; i < 5; i++) put(g, x + 3 + i * 3, y + 15, DG.rubble);
  },
  E(g, x, y, m) {
    // A stone archway.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 2, y + 2, 12, 14, DG.earth);
    box(g, x + 1, y + 1, 14, 2, DG.wallLight);
  },
  G(g, x, y, m) {
    // A portcullis, down.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 1, y + 1, 14, 15, DG.earth);
    for (let i = 2; i < 15; i += 3) box(g, x + i, y + 1, 1, 15, DG.iron);
    for (let j = 4; j < 16; j += 4) box(g, x + 1, y + j, 14, 1, DG.iron);
  },
  H(g, x, y) {
    // A ladder.
    box(g, x + 3, y, 2, TILE, DG.timber);
    box(g, x + 11, y, 2, TILE, DG.timber);
    for (let j = 2; j < TILE; j += 4) box(g, x + 3, y + j, 10, 2, DG.timberDark);
  },
  b(g, x, y) {
    // A bunk, straw mattress and a grey blanket.
    box(g, x + 1, y + 2, 14, 13, DG.timber);
    box(g, x + 2, y + 3, 12, 10, DG.straw);
    box(g, x + 2, y + 7, 12, 6, DG.blanket);
  },
  t(g, x, y) {
    box(g, x, y + 4, TILE, 8, DG.timber);
    box(g, x, y + 11, TILE, 1, DG.timberDark);
    box(g, x + 1, y + 12, 2, 4, DG.timberDark);
    box(g, x + 13, y + 12, 2, 4, DG.timberDark);
  },
  r(g, x, y) {
    // A weapon rack of rusted spears.
    box(g, x + 1, y + 12, 14, 2, DG.timber);
    for (let i = 3; i < 14; i += 4) {
      box(g, x + i, y + 1, 1, 12, DG.timberDark);
      box(g, x + i - 1, y, 3, 3, DG.rust);
    }
  },
  d(g, x, y) {
    // A drill dummy: straw on a post.
    box(g, x + 7, y + 8, 2, 8, DG.timber);
    ellipse(g, x + 8, y + 6, 4, 5, DG.straw);
    box(g, x + 3, y + 5, 10, 2, DG.timber);
  },
  P(g, x, y) {
    // A pressure plate set into the floor.
    box(g, x + 2, y + 2, 12, 12, DG.floorLine);
    box(g, x + 3, y + 3, 10, 10, DG.plate);
    box(g, x + 3, y + 3, 10, 1, DG.ironLight);
  },
  O(g, x, y) {
    ellipse(g, x + 8, y + 10, 7, 6, DG.wallDark);
    ellipse(g, x + 7, y + 8, 6, 5, DG.wall);
    ellipse(g, x + 5, y + 6, 2, 1, DG.wallLight);
  },
  x(g, x, y) {
    ellipse(g, x + 8, y + 10, 7, 5, DG.wallDark);
    for (let i = 0; i < 8; i++)
      ellipse(
        g,
        x + 3 + Math.floor(hash(x, y, i) * 10),
        y + 6 + Math.floor(hash(y, x, i) * 7),
        2,
        2,
        i % 2 ? DG.rubble : DG.wall,
      );
  },
  L(g, x, y) {
    // A crate with a note pinned to it.
    box(g, x + 2, y + 5, 12, 10, DG.timber);
    box(g, x + 2, y + 9, 12, 1, DG.timberDark);
    box(g, x + 6, y + 3, 5, 6, P.paper);
    put(g, x + 8, y + 4, DG.rust);
  },
  R(g, x, y, m) {
    // A duty roster, nailed to the wall.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 2, y + 2, 12, 11, P.paper);
    for (let j = 4; j < 12; j += 2) box(g, x + 4, y + j, 8, 1, '#8A7A60');
  },
  A(g, x, y) {
    // An empty suit of armour on a stand.
    box(g, x + 7, y + 13, 2, 3, DG.timber);
    ellipse(g, x + 8, y + 3, 3, 3, DG.ironLight);
    box(g, x + 5, y + 6, 6, 7, DG.iron);
    box(g, x + 5, y + 6, 6, 1, DG.ironLight);
    box(g, x + 7, y + 3, 2, 1, DG.earth);
  },
  S(g, x, y, m) {
    // Baron Plush's great sofa, velvet and tassels.
    const left = m.at(-1, 0) !== 'S';
    const right = m.at(1, 0) !== 'S';
    box(g, x, y + 3, TILE, 12, '#6A2A6A');
    box(g, x, y + 3, TILE, 4, '#8A3A8A');
    if (left) box(g, x, y + 1, 4, 14, '#5A205A');
    if (right) box(g, x + 12, y + 1, 4, 14, '#5A205A');
    for (let i = 2; i < 14; i += 4) put(g, x + i, y + 14, DG.gold);
  },
  V(g, x, y) {
    // A winch lever and its chain.
    box(g, x + 4, y + 11, 8, 4, DG.iron);
    box(g, x + 7, y + 3, 2, 9, DG.ironLight);
    ellipse(g, x + 8, y + 3, 2, 2, DG.rust);
    for (let j = 0; j < 3; j++) box(g, x + 12, y + j * 2, 2, 1, DG.iron);
  },
  Y(g, x, y, m) {
    // The Throne of a Hundred Challengers: a heap of tagged weapons, drawn once.
    if (m.at(-1, 0) === 'Y') return;
    box(g, x, y + 2, 48, 14, DG.wallDark);
    for (let i = 0; i < 16; i++) {
      const bx = x + 2 + Math.floor(hash(x, i, 1) * 44);
      const by = y + 1 + Math.floor(hash(i, y, 2) * 10);
      box(g, bx, by, 1, 6, i % 3 ? DG.ironLight : DG.rust);
    }
    box(g, x + 18, y + 6, 12, 10, DG.banner);
    box(g, x + 18, y + 6, 12, 1, DG.gold);
  },
  m(g, x, y, m) {
    // Big Tova's bar: a long counter, sixty feet of it, and mugs that never spill.
    box(g, x, y + 3, TILE, 10, DG.timber);
    box(g, x, y + 3, TILE, 2, '#7A5A3A');
    box(g, x, y + 12, TILE, 1, DG.timberDark);
    if (hash(x, y, 2) < 0.6) {
      box(g, x + 5, y, 4, 5, '#C8B070');
      box(g, x + 5, y, 4, 1, '#F4F0EA');
      box(g, x + 9, y + 1, 1, 3, '#C8B070');
    }
  },
  q(g, x, y) {
    ellipse(g, x + 8, y + 9, 5, 6, DG.timber);
    box(g, x + 3, y + 6, 11, 1, DG.iron);
    box(g, x + 3, y + 12, 11, 1, DG.iron);
    ellipse(g, x + 8, y + 4, 4, 2, DG.timberDark);
  },
  i(g, x, y, m) {
    // The last block of ice from the wastes, drawn once across its 2x2 tiles.
    if (m.at(-1, 0) === 'i' || m.at(0, -1) === 'i') return;
    box(g, x + 3, y + 26, 26, 4, DG.wallDark);
    box(g, x + 5, y + 4, 22, 23, '#A8D0E8');
    box(g, x + 5, y + 4, 22, 3, '#E0F0FA');
    box(g, x + 7, y + 9, 3, 14, '#E0F0FA');
    box(g, x + 22, y + 8, 2, 16, '#7AA8C8');
  },
  u(g, x, y) {
    // A war drum: hide stretched over a barrel, painted in three stripes.
    ellipse(g, x + 8, y + 10, 6, 5, '#6A1216');
    box(g, x + 2, y + 8, 13, 1, '#E8E0D0');
    box(g, x + 2, y + 11, 13, 1, '#E8E0D0');
    ellipse(g, x + 8, y + 5, 6, 3, '#D8C8A0');
  },
  f(g, x, y, m) {
    // A portrait of Kaldor, each more flattering than the last.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 2, y + 1, 12, 12, DG.gold);
    box(g, x + 3, y + 2, 10, 10, '#4A3A5A');
    // The fortieth, last on the wall, is just the sun ('Kaldor, Roughly').
    const sun = m.at(1, 0) !== 'f' && m.at(2, 0) === '#';
    if (sun) {
      ellipse(g, x + 8, y + 7, 3, 3, '#FFD27A');
    } else {
      ellipse(g, x + 8, y + 6, 2, 2, '#D8A880');
      box(g, x + 6, y + 8, 5, 4, '#6A1216');
      box(g, x + 6, y + 3, 5, 1, '#FFC940');
    }
  },
  Z(g, x, y) {
    // A small statue of Kaldor on a plinth (one of many).
    box(g, x + 3, y + 12, 10, 4, DG.wallDark);
    box(g, x + 5, y + 5, 6, 7, DG.wallLight);
    ellipse(g, x + 8, y + 3, 2, 2, DG.wallLight);
    box(g, x + 6, y + 1, 5, 1, DG.gold);
  },
  k(g, x, y) {
    // A candle on an iron stand: rest here.
    box(g, x + 7, y + 7, 2, 9, P.iron);
    box(g, x + 5, y + 14, 6, 2, P.iron);
    box(g, x + 7, y + 3, 2, 4, P.wax);
    put(g, x + 7, y + 2, P.flame);
    put(g, x + 8, y + 1, P.flame2);
  },
};

// The old mine's tiles (mine-art.mjs).
Object.assign(DUNGEON_ART, mineArt({ box, put, ellipse, hash, wall: (g, x, y, m) => DUNGEON_ART.W(g, x, y, m) }));

// Kaldor's castle (castle-art.mjs): the castle, moat, pikes and guard post outside; pillars, carpet,
// half-stairs, galleries, the winding stair and the king's floor's furniture inside. New letters only.
{
  const castle = castleArt({ box, put, ellipse, hash, wall: (g, x, y, m) => DUNGEON_ART.W(g, x, y, m) });
  for (const [set, into] of [
    [castle.outdoor, OUTDOOR_ART],
    [castle.inside, DUNGEON_ART],
  ])
    for (const [k, v] of Object.entries(set)) {
      if (into[k]) throw new Error(`castle-art: "${k}" is already drawn`);
      into[k] = v;
    }
}

/** Kaldor's floors: big squares of black and dark grey marble, veined, with a soft sheen. */
function marbleAt(x, y) {
  const sq = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
  if (x % 16 === 0 || y % 16 === 0) return '#120E16';
  let c = sq ? '#24202A' : '#36323E';
  // veins: thin wandering lines, a different path in every square
  const vx = Math.floor(x / 16);
  const vy = Math.floor(y / 16);
  const along = (x % 16) + Math.round(Math.sin((y % 16) * 0.5 + hash(vx, vy, 5) * 6) * 2 + hash(vx, vy, 6) * 8);
  if (along % 16 === 0 && hash(vx, vy, 7) < 0.7) c = sq ? '#3A3644' : '#4A4654';
  // the sheen of torchlight, top-left of each square
  if ((x % 16) + (y % 16) < 6 && x % 16 > 0 && y % 16 > 0) c = sq ? '#2C2834' : '#423E4A';
  return c;
}

function drawDungeon(map) {
  const rows = map.tiles;
  const H = rows.length;
  const W = rows[0].length;
  const g = canvas(W * TILE, H * TILE);
  const at = (tx, ty) => rows[ty]?.[tx] ?? '#';
  // Worn flagstones everywhere first (or, in Kaldor's castle, polished black marble).
  const marble = map.floor === 'marble';
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (marble) {
        g[y][x] = hex(marbleAt(x, y));
        continue;
      }
      const stone = Math.floor(x / 8) + Math.floor(y / 8) * 7;
      let c = hex(DG.floor[Math.floor(hash(stone, 1, 3) * 3)]);
      if (x % 8 === 0 || y % 8 === 0) c = hex(DG.floorLine);
      else if (hash(x, y, 4) < 0.04) c = mix(c, hex(DG.floorLine), 0.6);
      g[y][x] = c;
    }
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      // Pushable boulders are drawn by the game, so they can move; bake plain floor under them.
      const letter = map.pushable === at(tx, ty) ? '.' : at(tx, ty);
      const draw = DUNGEON_ART[map.art?.[letter] ?? letter];
      if (!draw) throw new Error(`No dungeon art for tile "${at(tx, ty)}" in ${map.id}`);
      draw(g, tx * TILE, ty * TILE, { at: (dx, dy) => map.art?.[at(tx + dx, ty + dy)] ?? at(tx + dx, ty + dy) });
    }
  // Shadow under the walls, and torchlight around each torch and candle.
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const c = map.art?.[at(tx, ty)] ?? at(tx, ty);
      if ((c === '.' || c === ',' || c === 'P') && 'WBCcRGoE#f'.includes(map.art?.[at(tx, ty - 1)] ?? at(tx, ty - 1)))
        for (let j = 0; j < 5; j++)
          for (let i = 0; i < TILE; i++) {
            const px = tx * TILE + i;
            const py = ty * TILE + j;
            g[py][px] = mix(g[py][px], hex('#000000'), dither(0.5 - j * 0.1, px, py));
          }
    }
  rows.forEach((r, ty) =>
    [...r].forEach((c, tx) => {
      if (c !== 'c' && c !== 'k') return;
      const lx = tx * TILE + 8;
      const ly = ty * TILE + 6;
      const R = 52;
      for (let y = ly - R; y < ly + R; y++)
        for (let x = lx - R; x < lx + R; x++) {
          if (y < 0 || x < 0 || y >= g.h || x >= g.w || at(Math.floor(x / TILE), Math.floor(y / TILE)) === '#')
            continue;
          const d = Math.hypot(x - lx, (y - ly) * 1.1) / R;
          if (d < 1) g[y][x] = mix(g[y][x], hex('#FFA040'), dither(0.28 * (1 - d) ** 2, x, y));
        }
    }),
  );
  return g;
}

// ---------------------------------------------------------------------------
// Walkers: 16×24 frames. Columns are down, up, left, right × stand, step A, step B.

const FW = 16;
const FH = 24;
const DIRS = ['down', 'up', 'left', 'right'];
const OUT = hex('#140E1C');
const EYE = '#140E1C';
const SKIN = '#E8B48C';

/**
 * How each walker looks. `top` is the tunic or robe, `shade` its sleeves.
 * `hair` picks a style; `extra` draws anything particular to them.
 */
const WALKERS = {
  brannoc: {
    top: '#9AA0B4',
    shade: '#6A7088',
    legs: '#6A7088',
    boots: '#5C3A28',
    belt: '#5C3A28',
    hair: ['short', '#C4442A'],
    sword: true,
    beard: '#C4442A',
  },
  ysolde: {
    robe: true,
    top: '#9A6A9E',
    shade: '#76507C',
    boots: '#2A2030',
    belt: '#FFC940',
    hair: ['bun', '#3A2A2E'],
    monocle: true,
  },
  quill: {
    robe: true,
    top: '#3A3470',
    shade: '#2A2458',
    boots: '#2A2030',
    belt: '#6A4028',
    hair: ['short', '#6A4028'],
    hat: 'wizard',
    glasses: true,
  },
  wren: {
    robe: true,
    top: '#8A8898',
    shade: '#6A687A',
    boots: '#2A2030',
    hair: ['veil', '#5A586A'],
    collar: '#F0E6C8',
    lantern: true,
  },
  oren: {
    robe: true,
    top: '#2DD4BF',
    shade: '#1E9C8C',
    boots: SKIN,
    belt: '#1E9C8C',
    hair: ['bald', '#F4CCA8'],
    beads: '#8A5A34',
  },
  pip: {
    top: '#FF4FD8',
    shade: '#8B5CF6',
    legs: '#3E7A4A',
    boots: '#6A4028',
    hair: ['spiky', '#D86A2A'],
    back: 'lute',
    patchwork: ['#FF4FD8', '#2DD4BF', '#FFC940', '#8B5CF6'],
  },
  tamsin: {
    top: '#FF8A3D',
    shade: '#FF8A3D',
    legs: '#3A3848',
    boots: '#1E1A24',
    hair: ['short', '#2A2030'],
    apron: '#7A4A2A',
    goggles: '#FF8A3D',
  },
  moss: {
    top: '#3E6A3A',
    shade: '#4E3622',
    legs: '#4A3A2A',
    boots: '#2A2020',
    hair: ['short', '#4E3A22'],
    cloak: '#6A4A30',
    leaves: '#4ADE80',
  },
  pell: {
    top: '#C8A040',
    shade: '#8A6A28',
    legs: '#5A4A3A',
    boots: '#6A4028',
    belt: '#6A4028',
    hair: ['spiky', '#8A4A2A'],
  },
  hesper: {
    top: '#8A5A7A',
    shade: '#6A4460',
    legs: '#4A3A40',
    boots: '#3A2A20',
    hair: ['bun', '#B8B0A8'],
    apron: '#E8E0D0',
  },
  jory: {
    top: '#6A8A4A',
    shade: '#4E6A36',
    legs: '#6A5A40',
    boots: '#4A3020',
    belt: '#4A3020',
    hair: ['short', '#C8A060'],
    apron: '#8A6A40',
  },
  wenna: {
    robe: true,
    top: '#7A6A9A',
    shade: '#5A4A7A',
    boots: '#3A2A30',
    hair: ['bun', '#E8E4E0'],
    collar: '#E8E0D0',
  },
  oriel: {
    robe: true,
    top: '#3A2A6A',
    shade: '#2A1E50',
    boots: '#2A2030',
    belt: '#FFC940',
    hair: ['veil', '#8A3A8A'],
    beads: '#FFC940',
  },
  hoot: {
    robe: true,
    top: '#8A6A44',
    shade: '#6A4E30',
    boots: '#C8A040',
    belt: '#B3261E',
    hair: ['bald', '#9A7A54'],
    glasses: true,
  },
  holt: {
    top: '#7A6A4A',
    shade: '#5A4E36',
    legs: '#4A4038',
    boots: '#3A2A20',
    belt: '#3A2A20',
    hair: ['short', '#6A6A6A'],
    beard: '#8A8A8A',
  },
  mira: {
    top: '#4E6A3A',
    shade: '#3A5A2A',
    legs: '#4A3A2A',
    boots: '#3A2A20',
    belt: '#6A4028',
    hair: ['short', '#2A1A12'],
    sword: true,
    cloak: '#3A4A2A',
  },
  fen: { robe: true, top: '#6A5A4A', shade: '#4E4236', boots: '#3A2A20', hair: ['bald', '#C8B8A0'], beard: '#D8D0C0' },
  dunn: {
    top: '#3A3A4E',
    shade: '#2A2A3A',
    legs: '#2A2A3A',
    boots: '#1A1A24',
    belt: '#1A1A24',
    skin: '#8A8AA0',
    hair: ['short', '#2A2A3A'],
  },
  bellwether: {
    top: '#6A6A78',
    shade: '#4A4A58',
    legs: '#4A4A58',
    boots: '#3A3A42',
    belt: '#8A4A2A',
    skin: '#6A6A78',
    hair: ['hood', '#6A6A78'],
  },
  quartermaster: {
    robe: true,
    top: '#B8C0C8',
    shade: '#8A94A0',
    boots: '#8A94A0',
    skin: '#D8E0E8',
    hair: ['bald', '#C8D0D8'],
    glasses: true,
  },
  // matches his collectible: striped sky-blue pajamas, medals, a crown, a white mustache, half-shut eyes
  plush: {
    top: '#7AB0E0',
    shade: '#7AB0E0',
    legs: '#7AB0E0',
    boots: '#F0E6C8',
    skin: '#F2CDA8',
    hair: ['short', '#E8E4DC'],
    stripes: '#F0E6C8',
    medals: true,
    mustache: '#E8E4DC',
    sleepy: true,
    crown: '#F2C14E',
  },
  sleeper: {
    top: '#C8B8E0',
    shade: '#A898C0',
    legs: '#A898C0',
    boots: '#E8C0D0',
    belt: '#8A5AA0',
    hair: ['short', '#6A4A30'],
    collar: '#E8E0F0',
  },
  bo: {
    top: '#E84A4A',
    shade: '#FFC940',
    legs: '#3A3A8A',
    boots: '#2A2020',
    hair: ['spiky', '#FFC940'],
    patchwork: ['#E84A4A', '#FFC940', '#3A3A8A', '#E84A4A'],
  },
  raider: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['short', '#3A2418'],
    beard: '#3A2418',
    sword: true,
  },
  gert: { robe: true, top: '#6A6A5A', shade: '#4E4E42', boots: '#3A3A30', hair: ['short', '#8A8A7A'], lantern: true },
  tessa: {
    top: '#E8E0D0',
    shade: '#C8B8A0',
    legs: '#6A5A4A',
    boots: '#4A3A2A',
    hair: ['bun', '#8A4A2A'],
    apron: '#F4F0EA',
  },
  barnaby: {
    top: '#8A2A2A',
    shade: '#6A1E1E',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#FFC940',
    hair: ['short', '#4A3A2A'],
    hat: 'wizard',
  },
  pim: { top: '#8A7A5A', shade: '#6A5A40', legs: '#4A3A2A', boots: '#3A2A1A', hair: ['spiky', '#2A1A12'] },
  varga: {
    top: '#5A3A3A',
    shade: '#3E2828',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['short', '#1A1210'],
    sword: true,
    cloak: '#6A1216',
  },
  brunna: { top: '#8A6A4A', shade: '#6A4E36', legs: '#6A4E36', boots: '#4A3A2A', hair: ['short', '#C8A060'] },
  nana: { robe: true, top: '#6A8AA0', shade: '#4E6A80', boots: '#3A2A20', hair: ['bun', '#E8E4E0'], apron: '#F4F0EA' },
  harrow: {
    top: '#5A4A3A',
    shade: '#3E3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    hair: ['bald', '#E8B48C'],
    beard: '#B8B0A8',
    apron: '#3A2A1A',
  },
  hugo: {
    top: '#4E6A3A',
    shade: '#3A5A2A',
    legs: '#5A4A3A',
    boots: '#3A2A20',
    hair: ['short', '#8A7A6A'],
    beard: '#8A7A6A',
    leaves: '#4ADE80',
  },
  // Aurek is drawn twice as big in the World: a stitched giant, raised and bound.
  aurek: {
    top: '#7A8A7A',
    shade: '#5A6A5A',
    legs: '#5A6A5A',
    boots: '#3A4A3A',
    skin: '#A8B8A8',
    hair: ['short', '#5A6A5A'],
    sword: true,
    stitches: '#2A1A1A',
  },
  // Kaldor casts no shadow (his torches and mirrors see to it): the game draws one only when a torch gutters.
  kaldor: {
    top: '#3A2A2A',
    shade: '#6A1216',
    legs: '#2A1A1A',
    boots: '#1A1010',
    belt: '#FFC940',
    skin: '#D8A880',
    hair: ['hood', '#8A8A9A'],
    beard: '#C4442A',
    sword: true,
    cloak: '#6A1216',
    crown: '#FFC940',
    noShadow: true,
  },
  shadow: {
    top: '#1E1A2E',
    shade: '#141024',
    legs: '#141024',
    boots: '#0A0812',
    belt: '#2E2A40',
    skin: '#3A3450',
    hair: ['short', '#141024'],
    sword: true,
  },
  rusted: {
    top: '#8A5A3A',
    shade: '#6A4028',
    legs: '#6A4028',
    boots: '#4A2A18',
    belt: '#3A2A20',
    skin: '#8A5A3A',
    hair: ['hood', '#8A5A3A'],
  },
  echo: {
    top: '#5A5A8A',
    shade: '#3A3A6A',
    legs: '#3A3A6A',
    boots: '#2A2A4A',
    belt: '#8A8AC0',
    skin: '#8A8AB8',
    hair: ['short', '#3A3A6A'],
    beard: '#6A6A9A',
  },
  // Season 1's quieter rooms: the chapel's sexton, a shadow officer, the crypt's chaplain, the Broken Guard, a lamplighter.
  sexton: {
    robe: true,
    top: '#5A5A62',
    shade: '#42424A',
    boots: '#2A2030',
    belt: '#8A6A3A',
    hair: ['bun', '#9A9490'],
    collar: '#E8E0D0',
    apron: '#8A8478',
  },
  officer: {
    top: '#3A3A4E',
    shade: '#2A2A3A',
    legs: '#2A2A3A',
    boots: '#1A1A24',
    belt: '#C8B070',
    skin: '#8A8AA0',
    hair: ['short', '#2A2A3A'],
    cloak: '#4A2A3A',
    collar: '#C8B070',
    back: 'sword',
  },
  chaplain: {
    robe: true,
    top: '#8A94B8',
    shade: '#6A7498',
    boots: '#6A7498',
    skin: '#C8D0E8',
    hair: ['bald', '#B8C0D8'],
    collar: '#E8ECF8',
    lantern: true,
  },
  maelis: {
    top: '#7A7A8A',
    shade: '#5A5A6A',
    legs: '#4A4A58',
    boots: '#3A2A20',
    belt: '#8A6A3A',
    hair: ['bun', '#4A3A2A'],
    cloak: '#4A4A5A',
  },
  lamplighter: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['hood', '#4A3228'],
    lantern: true,
  },
  // Old Town street life (KINGDOM-EXPANSION.md): the brawlers, their bookie and medic, a patrol, a grandmother, a boulder.
  durn: {
    top: '#7A3A2A',
    shade: '#5A2A1E',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['spiky', '#C4442A'],
    beard: '#C4442A',
  },
  haskel: {
    top: '#4A5A3A',
    shade: '#36442A',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#2A1A12',
    skin: '#C89870',
    hair: ['short', '#2A1A12'],
    beard: '#2A1A12',
  },
  bett: {
    top: '#8A6A9A',
    shade: '#6A4E7A',
    legs: '#4A3A40',
    boots: '#3A2A20',
    belt: '#FFC940',
    hair: ['bun', '#3A2418'],
    apron: '#C8B890',
  },
  hild: {
    robe: true,
    top: '#E8E0D0',
    shade: '#C8B8A0',
    boots: '#4A3A2A',
    belt: '#B3261E',
    hair: ['veil', '#6A5A4A'],
    collar: '#B3261E',
  },
  drummer: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#C8B070',
    skin: '#D8A880',
    hair: ['hood', '#6A1216'],
    beads: '#E8E0D0',
  },
  gudrun: {
    robe: true,
    top: '#5A4A3A',
    shade: '#42362A',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#E0B898',
    hair: ['bun', '#E8E4E0'],
    beads: '#E8E0D0',
  },
  hamm: {
    top: '#8A7A5A',
    shade: '#6A5A40',
    legs: '#4A3A2A',
    boots: '#3A2A1A',
    belt: '#4A3020',
    skin: '#D8A880',
    hair: ['bald', '#D8A880'],
    boulder: true,
  },
  // The south road: a knitting mother, a farmer with a spoon, a whispering sergeant, the watchman, a road-block raider.
  marta: { robe: true, top: '#8A5A3A', shade: '#6A4428', boots: '#3A2A20', hair: ['bun', '#6A4028'], apron: '#C8B890' },
  dobb: {
    top: '#7A8A5A',
    shade: '#5A6A40',
    legs: '#5A4A3A',
    boots: '#3A2A1A',
    belt: '#4A3020',
    hair: ['short', '#B8B0A8'],
    beard: '#B8B0A8',
    apron: '#8A6A40',
  },
  bellow: {
    top: '#4A3A3A',
    shade: '#36282A',
    legs: '#2A2020',
    boots: '#1A1212',
    belt: '#C8B070',
    skin: '#D8A880',
    hair: ['short', '#1A1210'],
    cloak: '#4A1E20',
    sword: true,
  },
  orrin: {
    top: '#5A6A8A',
    shade: '#42506A',
    legs: '#3A4050',
    boots: '#2A2A30',
    belt: '#C8B070',
    hair: ['short', '#9A9490'],
    beard: '#9A9490',
    cloak: '#2A3450',
    back: 'sword',
  },
  grub: {
    top: '#5A3A2A',
    shade: '#42281E',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#C89870',
    hair: ['short', '#1A1210'],
    sword: true,
  },
  // Kaldorhold (KINGDOM-EXPANSION.md): the Market Ward, the Ring Ward, Big Tova's bar and the Hall of Kaldor.
  tova: {
    top: '#8A3A2A',
    shade: '#6A2A1E',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#C8B070',
    skin: '#E0B898',
    hair: ['bun', '#E8D26A'],
    apron: '#E8E0D0',
    beads: '#C8B070',
  },
  ulfa: {
    robe: true,
    top: '#5A6A8A',
    shade: '#42506A',
    boots: '#2A2030',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['spiky', '#E8E4E0'],
    beads: '#E8E0D0',
  },
  hekla: {
    robe: true,
    top: '#6A4A5A',
    shade: '#4E3642',
    boots: '#2A1A12',
    skin: '#E0B898',
    hair: ['bun', '#F4F0EA'],
    collar: '#E8E0D0',
  },
  snorri: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['short', '#8A6A4A'],
    beard: '#8A6A4A',
    sleepy: true,
    sword: true,
  },
  fawnley: {
    top: '#3A4A6A',
    shade: '#2A3650',
    legs: '#2A2A3A',
    boots: '#1A1A24',
    belt: '#C8B070',
    hair: ['short', '#C8A060'],
    glasses: true,
    collar: '#E8E0D0',
  },
  fliss: {
    top: '#3E8A7A',
    shade: '#2E6A5E',
    legs: '#4A3A2A',
    boots: '#3A2A1A',
    hair: ['bun', '#C4442A'],
    apron: '#C8B890',
  },
  brakka: {
    top: '#6A5A4A',
    shade: '#4E4236',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#C89870',
    hair: ['short', '#1A1210'],
    beard: '#1A1210',
    cloak: '#8A7A64',
  },
  snik: {
    top: '#5A5A6A',
    shade: '#42424E',
    legs: '#3A3A42',
    boots: '#2A2A30',
    belt: '#8A6A3A',
    hair: ['spiky', '#9A9490'],
    apron: '#3A2A1A',
    goggles: '#8A8A9A',
  },
  chisk: {
    top: '#C8C0B0',
    shade: '#A8A090',
    legs: '#6A6A6A',
    boots: '#4A4A4A',
    hair: ['spiky', '#E8E4E0'],
    apron: '#E8E0D0',
  },
  mott: {
    robe: true,
    top: '#3A3A2A',
    shade: '#2A2A1E',
    boots: '#1A1A12',
    belt: '#C8B070',
    hair: ['short', '#4A3A2A'],
    glasses: true,
  },
  tib: { top: '#B8913A', shade: '#8A6A28', legs: '#4A3A2A', boots: '#3A2A1A', hair: ['spiky', '#2A1A12'] },
  holler: {
    top: '#8A2A6A',
    shade: '#6A1E50',
    legs: '#3A2A30',
    boots: '#2A1A20',
    belt: '#FFC940',
    hair: ['bun', '#1A1210'],
    cloak: '#6A1216',
    hat: 'wizard',
  },
  ogg: {
    top: '#6A7A3A',
    shade: '#4E5A2A',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#2A1A12',
    skin: '#C89870',
    hair: ['bald', '#C89870'],
    beard: '#4A3A2A',
  },
  hroth: {
    top: '#4A3A2A',
    shade: '#36281E',
    legs: '#2A2020',
    boots: '#1A1212',
    belt: '#FFC940',
    skin: '#C89870',
    hair: ['short', '#B8B0A8'],
    beard: '#B8B0A8',
    cloak: '#6A1216',
    sleepy: true,
  },
  evenbett: {
    top: '#6A9A8A',
    shade: '#4E7A6A',
    legs: '#4A3A40',
    boots: '#3A2A20',
    belt: '#FFC940',
    hair: ['bun', '#3A2418'],
    apron: '#C8B890',
  },
  joss: {
    top: '#C8B8E0',
    shade: '#A898C0',
    legs: '#5A4A3A',
    boots: '#3A2A1A',
    hair: ['short', '#6A4028'],
    collar: '#E8E0D0',
  },
  kids: { top: '#C86A8A', shade: '#A84A6A', legs: '#4A3A2A', boots: '#3A2A1A', hair: ['short', '#E8D26A'] },
  // Kaldorhold's Barracks and Frost Wards.
  ox: {
    top: '#6A3A2A',
    shade: '#4A2A1E',
    legs: '#2A2020',
    boots: '#1A1212',
    belt: '#C8B070',
    skin: '#C89870',
    hair: ['bald', '#C89870'],
    beard: '#2A1A12',
    cloak: '#6A1216',
  },
  tolly: {
    top: '#7A8A9A',
    shade: '#5A6A7A',
    legs: '#3A3A42',
    boots: '#2A2A30',
    belt: '#8A6A3A',
    skin: '#E0B898',
    hair: ['short', '#C8A060'],
  },
  hagga: {
    top: '#6A1216',
    shade: '#4A0E10',
    legs: '#2A1A1A',
    boots: '#1A1010',
    belt: '#E8E0D0',
    skin: '#D8A880',
    hair: ['spiky', '#C4442A'],
    beads: '#E8E0D0',
  },
  mog: {
    robe: true,
    top: '#E8E4D8',
    shade: '#C8C4B8',
    boots: '#4A3A2A',
    belt: '#8A3A2A',
    skin: '#C89870',
    hair: ['bald', '#C89870'],
    beard: '#8A8A7A',
    apron: '#B3261E',
  },
  abbot: {
    robe: true,
    top: '#4A4A3A',
    shade: '#36362A',
    boots: '#1A1A12',
    belt: '#C8B070',
    hair: ['short', '#6A6A5A'],
    glasses: true,
    collar: '#E8E0D0',
  },
  leif: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#E0B898',
    hair: ['short', '#E8D26A'],
  },
  gorm: {
    top: '#5A4A3A',
    shade: '#42362A',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['spiky', '#3A2418'],
    beard: '#3A2418',
    sword: true,
  },
  kaya: {
    top: '#4A3A3A',
    shade: '#36282A',
    legs: '#2A2020',
    boots: '#1A1212',
    belt: '#C8B070',
    skin: '#C89870',
    hair: ['bun', '#1A1210'],
    cloak: '#4A1E20',
    sword: true,
  },
  skadi: {
    robe: true,
    top: '#E8ECF0',
    shade: '#C8D0D8',
    boots: '#6A6A78',
    belt: '#6A1216',
    skin: '#E0B898',
    hair: ['veil', '#F4F0EA'],
    beads: '#6A8AB0',
  },
  brug: {
    top: '#8A7A64',
    shade: '#6A5A48',
    legs: '#4A3A2A',
    boots: '#3A2A1A',
    belt: '#4A3020',
    skin: '#D8A880',
    hair: ['short', '#6A4028'],
    beard: '#6A4028',
    cloak: '#C8B8A0',
  },
  ylva: {
    robe: true,
    top: '#C8D6E6',
    shade: '#A8B6C6',
    boots: '#4A4A58',
    belt: '#6A1216',
    skin: '#E0B898',
    hair: ['bun', '#E8D26A'],
    collar: '#F4F0EA',
  },
  keeper: {
    robe: true,
    top: '#4A3A5A',
    shade: '#342842',
    boots: '#342842',
    skin: '#E8E0CC',
    hair: ['hood', '#3A2C48'],
    skull: true,
    lantern: true,
  },
  // Felix Rook, the Academy's grand strategist: a checkered waistcoat under a dark plum coat
  felix: {
    top: '#3A2A40',
    shade: '#2A1E30',
    legs: '#2A2030',
    boots: '#5C3A28',
    hair: ['slick', '#1A1416'],
    villain: '#1A1416',
    checks: ['#F0E6D0', '#4A3A30'],
  },
  // The Kaldorium's warden: the biggest guard in the kingdom, drawn twice as big. Same colours as his guards, more of him.
  warden: {
    top: '#5A3A2E',
    shade: '#3E2820',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#FFC940',
    skin: '#C8956C',
    hair: ['bald', '#C8956C'],
    beard: '#2A1810',
    sword: true,
  },
  // Brannoc with no sword: the cell (author, Oct 3, 2026: they took it; he picks one up in the Kaldorium).
  brannocbare: {
    top: '#9AA0B4',
    shade: '#6A7088',
    legs: '#6A7088',
    boots: '#5C3A28',
    belt: '#5C3A28',
    hair: ['short', '#C4442A'],
    beard: '#C4442A',
  },
  // The three in the Deep Cells (author, Episode 10, Oct 5, 2026), each in for something petty against the king.
  // Old Mott: bald, a white tuft and a white beard, an old brown tunic. Didn't say bless you.
  oldmott: {
    top: '#7A6A48',
    shade: '#5C4E34',
    legs: '#3E3428',
    boots: '#2A2018',
    belt: '#3E3020',
    skin: '#E0B498',
    hair: ['bald', '#ECE8DC'],
    beard: '#ECE8DC',
  },
  // Nails: spiky orange hair, a white shirt under a black jacket. One ice cube.
  nails: {
    top: '#E4DCC8',
    shade: '#2E2430',
    legs: '#2E2430',
    boots: '#1A1418',
    skin: '#E8B48C',
    hair: ['spiky', '#C4642A'],
  },
  // Gary of the cells (author, Oct 6, 2026): the guards' kit. A chill guy, not an idiot: awake when you talk to him.
  gary: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['short', '#3A2418'],
    beard: '#3A2418',
    sword: true,
  },
  // ...and the rest of the time, asleep at his post, eyes shut (the game floats Zs over him, sleep.ts).
  garyasleep: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['short', '#3A2418'],
    beard: '#3A2418',
    sword: true,
    sleepy: true,
  },
  // Silas Seen: a navy hood and robe, a pale face. Left the king on read.
  silasseen: {
    robe: true,
    top: '#2E3C50',
    shade: '#243040',
    boots: '#1A2230',
    skin: '#E8D8C8',
    hair: ['hood', '#2E3C50'],
  },
};

/** Draws one frame of a walker into `g` at (ox, oy). */
function drawWalker(g, ox, oy, w, dir, frame) {
  const f = canvas(FW, FH);
  const b = (x, y, ww, hh, c) => box(f, x, y, ww, hh, c);
  const p = (x, y, c) => put(f, x, y, c);
  const skin = w.skin ?? SKIN;
  const side = dir === 'left' || dir === 'right';
  const back = dir === 'up';
  const step = frame === 0 ? 0 : frame === 1 ? 1 : -1; // which leg is forward
  const [style, hair] = w.hair;

  // things carried on the back, seen behind the body from the front and side
  const backItem = (behind) => {
    if (w.back === 'lute') {
      if (back && !behind) {
        ellipse(f, 8, 15, 3, 3, '#B87838');
        p(8, 15, '#3A2418');
        b(8, 7, 1, 5, '#8A5A34');
      } else if (behind) b(side ? 10 : 12, 7, 1, 5, '#8A5A34');
    }
    if (w.cloak && (back || side) && !behind) {
      if (back) b(4, 11, 8, 9, w.cloak);
      else b(9, 11, 3, 8, w.cloak);
    }
  };
  backItem(true);

  // legs and feet (hidden under a robe apart from the toes)
  if (w.robe) {
    for (let y = 11; y <= 21; y++) {
      const spread = Math.min(1, Math.floor((y - 11) / 4));
      const x0 = side ? 5 - spread : 4 - spread;
      const x1 = side ? 10 + spread : 11 + spread;
      b(x0, y, x1 - x0 + 1, 1, w.top);
    }
    const hem = side ? [4, 11] : [3, 12];
    b(hem[0], 21, hem[1] - hem[0] + 1, 1, w.shade);
    if (side) {
      if (step === 0) b(6, 22, 3, 1, w.boots);
      else {
        b(4, 22, 2, 1, w.boots);
        b(9, 22, 2, 1, w.boots);
      }
    } else {
      b(5, 22, 2, 1, w.boots);
      b(9, 22, 2, 1, w.boots);
      if (step === 1) b(5, 22, 2, 1, null);
      if (step === -1) b(9, 22, 2, 1, null);
    }
  } else if (side) {
    if (step === 0) {
      b(6, 17, 4, 4, w.legs);
      b(6, 21, 4, 2, w.boots);
    } else {
      const fwd = step === 1 ? 4 : 5;
      b(fwd, 17, 2, 4, w.legs);
      b(fwd - 1, 21, 3, 2, w.boots);
      b(9, 17, 2, 4, w.legs);
      b(9, 21, 3, 2, w.boots);
    }
  } else {
    const lift = (leg) => (step === leg ? 1 : 0);
    b(5, 17, 2, 4 - lift(1), w.legs);
    b(5, 21 - lift(1), 2, 2, w.boots);
    b(9, 17, 2, 4 - lift(-1), w.legs);
    b(9, 21 - lift(-1), 2, 2, w.boots);
  }

  // body
  if (!w.robe) b(side ? 5 : 4, 11, side ? 6 : 8, 6, w.top);
  if (w.patchwork && !side) {
    const c = w.patchwork;
    b(4, 11, 4, 3, c[back ? 1 : 3]);
    b(8, 11, 4, 3, c[back ? 3 : 1]);
    b(4, 14, 4, 3, c[2]);
    b(8, 14, 4, 3, c[0]);
  } else if (w.patchwork) {
    b(5, 11, 6, 3, w.patchwork[1]);
    b(5, 14, 6, 3, w.patchwork[2]);
  }
  // a fine check, pixel by pixel (Felix's waistcoat): front only, with the coat showing at the sides
  if (w.checks && !back)
    for (let y = 11; y < 17; y++) for (let x = side ? 6 : 5; x < (side ? 10 : 11); x++) p(x, y, w.checks[(x + y) % 2]);
  if (w.stripes) for (const y of [12, 14, 16]) b(side ? 5 : 4, y, side ? 6 : 8, 1, w.stripes);
  if (w.medals && !back) {
    const medal = ['#F2C14E', '#C4442A', '#C8CCD8'];
    if (side) p(dir === 'left' ? 6 : 9, 11, medal[0]);
    else for (let x = 5; x <= 10; x += 2) p(x, 11, medal[(x - 5) / 2]);
  }
  if (w.apron) {
    if (dir === 'down') b(5, 12, 6, 6, w.apron);
    else if (back) {
      p(5, 11, w.apron);
      p(10, 11, w.apron);
      b(6, 12, 4, 1, w.apron);
    } else b(dir === 'left' ? 5 : 8, 12, 3, 6, w.apron);
  }
  if (w.belt && !back) b(side ? 5 : 4, 15, side ? 6 : 8, 1, w.belt);
  if (w.collar && !back) b(side ? 5 : 6, 11, side ? 3 : 4, 1, w.collar);
  backItem(false);

  // arms, swinging with the step
  if (side) {
    const ax = step === 0 ? 7 : step === 1 ? 6 : 8;
    b(ax, 11, 2, 5, w.shade);
    b(ax, 16, 2, 1, skin);
    if (w.lantern) {
      p(ax, 17, '#3A3440');
      b(ax - 1, 18, 3, 3, '#FFD86A');
      p(ax, 19, '#FFF4C0');
    }
  } else {
    const swing = (arm) => (step === arm ? 1 : 0);
    b(3, 11 + swing(1), 1, 5, w.shade);
    p(3, 16 + swing(1), skin);
    b(12, 11 + swing(-1), 1, 5, w.shade);
    p(12, 16 + swing(-1), skin);
    if (w.lantern && !back) {
      p(12, 17 + swing(-1), '#3A3440');
      b(12, 18 + swing(-1), 2, 3, '#FFD86A');
      p(12, 19 + swing(-1), '#FFF4C0');
    }
  }

  // a sword held in the hand: upright at the side from the front and back,
  // angled forward, ready, from the side
  if (w.sword) {
    const BLADE = '#D8DCE8';
    const TIP = '#FFFFFF';
    const GUARD = '#8A6A3A';
    const GRIP = '#5C3A28';
    if (side) {
      const ax = step === 0 ? 7 : step === 1 ? 6 : 8;
      p(ax + 1, 17, GRIP); // pommel below the fist
      p(ax - 2, 16, GUARD);
      p(ax, 14, GUARD);
      p(ax - 1, 15, GUARD);
      for (let i = 2; i <= 6; i++) p(ax - i, 16 - i, i === 6 ? TIP : BLADE);
      b(ax, 16, 2, 1, skin); // the fist over the grip
    } else {
      // the sword hand: the right hand, which is on the viewer's left from behind
      const x = back ? 2 : 13;
      const s = step === (back ? 1 : -1) ? 1 : 0;
      p(x, 3 + s, TIP);
      b(x, 4 + s, 1, 10, BLADE);
      b(x - 1, 14 + s, 3, 1, GUARD);
      b(x, 15 + s, 1, 2, GRIP);
      p(x, 16 + s, skin); // the fist over the grip
    }
  }

  if (w.beads && dir === 'down') {
    for (const [x, y] of [
      [5, 11],
      [6, 12],
      [7, 12],
      [9, 12],
      [10, 11],
    ])
      p(x, y, w.beads);
  }

  // head
  const face = dir === 'left' ? 4 : 7; // where the eye sits on a side view (left-facing; right is mirrored)
  b(4, 3, 8, 8, skin);
  if (!back) {
    // sleepy eyes are half shut: one pixel, not two
    if (side) {
      p(5, 8, EYE);
      if (!w.sleepy) p(5, 7, EYE);
    } else if (w.sleepy) {
      b(5, 8, 2, 1, EYE);
      b(9, 8, 2, 1, EYE);
    } else {
      b(6, 7, 1, 2, EYE);
      b(9, 7, 1, 2, EYE);
    }
  }
  if (w.mustache && !back) {
    if (side) b(4, 9, 2, 1, w.mustache);
    else b(6, 9, 4, 1, w.mustache);
  }
  // an obvious villain: a handlebar mustache with its ends curled up and a pointed goatee
  if (w.villain && !back) {
    const v = w.villain;
    if (side) {
      // facing left the face is on the left of the frame, facing right on the right
      const left = dir === 'left';
      b(left ? 4 : 9, 9, 3, 1, v);
      p(left ? 3 : 12, 8, v);
      p(left ? 5 : 10, 6, v);
      p(left ? 4 : 11, 10, v);
    } else {
      b(5, 9, 6, 1, v);
      p(4, 8, v);
      p(11, 8, v);
      p(7, 10, v);
      p(8, 10, v);
    }
  }
  void face;
  if (w.skull && !back) {
    // hollow sockets with a pinprick of candlelight
    if (side) {
      b(4, 6, 2, 2, '#140E1C');
      p(4, 7, '#FFB04A');
      b(5, 9, 2, 1, '#8A8070');
    } else {
      b(5, 6, 2, 2, '#140E1C');
      b(9, 6, 2, 2, '#140E1C');
      p(6, 7, '#FFB04A');
      p(9, 7, '#FFB04A');
      b(6, 9, 4, 1, '#8A8070');
    }
  }

  // hair and headwear
  if (style === 'short' || style === 'spiky' || style === 'slick') {
    if (back) b(4, 3, 8, 7, hair);
    else if (side) {
      b(4, 3, 8, 2, hair);
      if (w.hat) b(10, 5, 2, 3, hair);
      else b(8, 5, 4, 4, hair);
    } else {
      b(4, 3, 8, 2, hair);
      p(4, 5, hair);
      p(11, 5, hair);
    }
    if (style === 'spiky') {
      for (const [x, y] of side
        ? [
            [5, 2],
            [8, 2],
            [10, 3],
          ]
        : [
            [4, 2],
            [7, 1],
            [8, 2],
            [11, 2],
          ])
        p(x, y, hair);
    }
  }
  if (style === 'bun') {
    if (back) b(3, 3, 10, 9, hair);
    else if (side) {
      b(4, 3, 8, 2, hair);
      b(7, 5, 5, 7, hair);
    } else {
      b(3, 3, 10, 2, hair);
      b(3, 5, 1, 7, hair);
      b(12, 5, 1, 7, hair);
    }
    b(6, 1, 4, 2, hair);
  }
  if (style === 'bald') {
    if (!side) b(6, 3, 3, 1, hair);
    else b(7, 3, 3, 1, hair);
  }
  if (style === 'veil' || style === 'hood') {
    if (back) b(3, 2, 10, 11, hair);
    else if (side) {
      b(4, 2, 8, 10, hair);
      b(4, 5, 3, 6, skin);
      p(5, 7, EYE);
      if (w.skull) {
        b(4, 6, 2, 2, '#140E1C');
        p(4, 7, '#FFB04A');
      }
    } else {
      b(3, 2, 10, 11, hair);
      b(5, 5, 6, 6, skin);
      if (w.skull) {
        b(5, 6, 2, 2, '#140E1C');
        b(9, 6, 2, 2, '#140E1C');
        p(6, 7, '#FFB04A');
        p(9, 7, '#FFB04A');
        b(6, 9, 4, 1, '#8A8070');
      } else {
        b(6, 7, 1, 2, EYE);
        b(9, 7, 1, 2, EYE);
      }
    }
    if (style === 'hood') b(back ? 3 : 4, 2, back ? 10 : 8, 1, w.shade);
  }
  // the slick cut's widow's peak
  if (style === 'slick' && !back && !side) {
    p(7, 5, hair);
    p(8, 5, hair);
  }
  if (w.beard && !back) {
    if (side) b(4, 9, 4, 2, w.beard);
    else {
      b(4, 9, 8, 2, w.beard);
      b(5, 11, 6, 1, w.beard);
      b(6, 10, 4, 1, skin); // mouth gap
    }
  }
  if (w.glasses && !back) {
    if (side) {
      b(4, 6, 2, 3, '#CFE0F0');
      p(5, 7, EYE);
    } else {
      b(5, 6, 3, 3, '#CFE0F0');
      b(8, 6, 3, 3, '#CFE0F0');
      b(6, 7, 1, 2, EYE);
      b(9, 7, 1, 2, EYE);
    }
  }
  if (w.monocle && !back && !side) {
    p(10, 6, '#FFC940');
    p(10, 9, '#FFC940');
    p(11, 10, '#FFC940');
  }
  if (w.goggles) {
    b(4, 5, 8, 1, '#2A2030');
    if (!back) {
      if (side) b(4, 5, 2, 1, w.goggles);
      else {
        b(5, 5, 2, 1, w.goggles);
        b(9, 5, 2, 1, w.goggles);
      }
    }
  }
  if (w.leaves) {
    for (const [x, y] of side
      ? [
          [6, 3],
          [10, 4],
        ]
      : [
          [5, 3],
          [10, 4],
          [8, 3],
        ])
      p(x, y, w.leaves);
  }
  if (w.hat === 'wizard') {
    const hat = '#8B5CF6';
    b(2, 4, 12, 1, hat);
    b(4, 3, 8, 1, hat);
    b(5, 2, 6, 1, hat);
    b(6, 1, 4, 1, hat);
    b(7, 0, 2, 1, hat);
    p(back ? 6 : 9, 2, '#FFC940');
    b(4, 5, 8, 1, null);
    b(4, 5, 8, 1, back ? '#6A4028' : skin);
    if (!back && !side) {
      p(4, 5, '#6A4028');
      p(11, 5, '#6A4028');
    }
  }

  if (w.stitches && !back) {
    // a seam down the chest and across the brow
    for (let y = 11; y <= 16; y++) p(side ? 7 : 8, y, w.stitches);
    for (const y of [12, 14, 16]) {
      p(side ? 6 : 7, y, w.stitches);
      p(side ? 8 : 9, y, w.stitches);
    }
    if (!side) b(5, 5, 6, 1, w.stitches);
    else b(4, 5, 4, 1, w.stitches);
  }
  if (w.crown) {
    // a thin gold circlet, points up: over a hood, or sitting right on the hair
    const cy = style === 'hood' ? 1 : 2;
    b(back && style === 'hood' ? 3 : 4, cy, back && style === 'hood' ? 10 : 8, 1, w.crown);
    for (const x of side ? [5, 8, 11] : [4, 7, 8, 11]) p(x, cy - 1, w.crown);
  }

  if (w.boulder && !back) {
    // a boulder carried on the shoulder, for training (six years, same boulder)
    const bx = side ? 8 : 12;
    ellipse(f, bx, 7, 4, 4, '#6A6260');
    ellipse(f, bx - 1, 6, 2, 2, '#8A8280');
  }

  // a dark outline around the whole silhouette, then a soft shadow at the feet
  const solid = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && f[y][x] && f[y][x] !== OUT;
  const outline = [];
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++)
      if (!f[y][x] && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) outline.push([x, y]);
  for (const [x, y] of outline) f[y][x] = OUT;
  for (let y = 21; y < (w.noShadow ? 21 : 24); y++)
    for (let x = 2; x < 14; x++) {
      const d = ((x - 7.5) / 6) ** 2 + ((y - 22.5) / 1.6) ** 2;
      if (d <= 1 && !f[y][x]) f[y][x] = [16, 10, 8, 90];
    }

  const mirror = dir === 'right';
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      const c = f[y][mirror ? FW - 1 - x : x];
      if (c) g[oy + y][ox + x] = c;
    }
}

function drawWalkers() {
  const ids = Object.keys(WALKERS);
  const g = canvas(FW * DIRS.length * 3, FH * ids.length);
  ids.forEach((id, row) =>
    DIRS.forEach((dir, d) => {
      for (let frame = 0; frame < 3; frame++) {
        // right-facing frames are drawn left-facing, then mirrored
        drawWalker(g, (d * 3 + frame) * FW, row * FH, WALKERS[id], dir, frame);
      }
    }),
  );
  return { g, ids };
}

// ---------------------------------------------------------------------------

const MAPS = [
  'archive',
  'courier-road',
  'millbrook',
  'waystation',
  'deserters-camp',
  'barracks-hall',
  'barracks-armoury',
  'officers-mess',
  'barracks-yard',
  'pit-below',
  'lower-barracks',
  'sleeping-keep',
  'march-road',
  'kingdom-town',
  'candle-inn',
  'forge',
  'chapel',
  'old-kings-crypt',
  'hedge-maze',
  'the-pit',
  'castle-grounds',
  'castle-hall',
  'castle-upper',
  'war-hall',
  'field-of-banners',
  'tithe-road',
  'broken-watch',
  'kaldorhold',
  'gut-and-gauntlet',
  'hall-of-kaldor',
  'ring-ward',
  'kaldorium-maximus',
  'fighters-cells',
  'barracks-ward',
  'fury-hall',
  'stitchery',
  'ironhouse',
  'frost-ward',
  'ice-house',
  'felix-maze',
  'kingdom-dungeon',
  'dungeon-mazes',
  'warrior-city',
  'south-road',
  'old-mine',
  'wc-chapel',
  'wc-library',
  'wc-guild',
  'wc-hospital',
  'wc-tavern',
  'wc-store',
  'wc-barn',
  'room-brannoc',
  'room-ysolde',
  'room-quill',
  'room-wren',
  'room-oren',
  'room-pip',
  'room-tamsin',
  'room-moss',
];
mkdirSync('assets/world', { recursive: true });
for (const id of MAPS) {
  const map = JSON.parse(readFileSync(`src/world/maps/${id}.json`, 'utf8'));
  const widths = new Set(map.tiles.map((r) => r.length));
  if (widths.size !== 1) throw new Error(`${id}: rows have different lengths (${[...widths].join(', ')})`);
  writeFileSync(
    `assets/world/${id}.png`,
    toPng(map.style === 'outdoor' ? drawOutdoor(map) : map.style === 'dungeon' ? drawDungeon(map) : drawMap(map)),
  );
}
const { g, ids } = drawWalkers();
writeFileSync('assets/world/walkers.png', toPng(g));
writeFileSync(
  'src/world/walkers.ts',
  `// Generated by scripts/world-art.mjs. Do not edit by hand.

/** One walker frame, in art pixels. Feet stand 2 pixels above the bottom edge. */
export const WALKER_FRAME = { width: ${FW}, height: ${FH}, feet: ${FH - 2} };

/** Column blocks in the sheet, three frames each: stand, step A, step B. */
export const WALKER_DIRS = ${JSON.stringify(DIRS).replace(/"/g, "'")} as const;

/** Each walker's row in assets/world/walkers.png. */
export const WALKER_ROWS = {
${ids.map((id, i) => `  ${id}: ${i},`).join('\n')}
} as const;

export type WalkerId = keyof typeof WALKER_ROWS;
`,
);
console.log(`Wrote ${MAPS.length} map(s), ${ids.length} walkers and src/world/walkers.ts.`);
