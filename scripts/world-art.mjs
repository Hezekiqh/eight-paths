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
import { graveyardArt } from './graveyard-art.mjs';
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
/** Darkens (or, toward a light colour, lights) what is already there by `a` (0–1), dithered, so it works over any floor. */
function tint(g, x, y, a, to = '#0A0608', dithered = true) {
  x = Math.round(x);
  y = Math.round(y);
  if (y < 0 || y >= g.h || x < 0 || x >= g.w || !g[y][x] || a <= 0) return;
  g[y][x] = mix(g[y][x], typeof to === 'string' ? hex(to) : to, dithered ? dither(a, x, y) : a);
}
/** A soft contact shadow on the ground: densest in the middle, fading out, so an object sits on the floor. */
function dropShadow(g, cx, cy, rx, ry, a = 0.5) {
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) {
      const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      if (d <= 1) tint(g, cx + i, cy + j, a * (1 - d * 0.6));
    }
}
/** A one-pixel dark outline round a rectangle (castle style: everything solid has an edge). */
const rim = (g, x, y, w, h, c) => {
  box(g, x - 1, y, 1, h, c);
  box(g, x + w, y, 1, h, c);
  box(g, x, y - 1, w, 1, c);
  box(g, x, y + h, w, 1, c);
};

/**
 * Light (or shade) laid over what's there in fine steps, eighths not quarters, so a pool of candlelight
 * fades out smoothly instead of breaking into a coarse speckle at its edge.
 */
function glow(g, x, y, a, to) {
  if (y < 0 || y >= g.h || x < 0 || x >= g.w || !g[y][x] || a <= 0) return;
  g[y][x] = mix(g[y][x], typeof to === 'string' ? hex(to) : to, dither(a, x, y, 8));
}

/**
 * A light source's pool: strongest at (lx, ly), falling off with the square of the distance, a little
 * flattened (the floor is seen from above at a slant). `skip(x, y)` keeps it off what it can't reach.
 */
function lightPool(g, lx, ly, R, a, col, skip = () => false, squash = 1.2) {
  const c = hex(col);
  for (let y = Math.floor(ly - R); y < ly + R; y++)
    for (let x = Math.floor(lx - R); x < lx + R; x++) {
      if (y < 0 || x < 0 || y >= g.h || x >= g.w || skip(x, y)) continue;
      const d = Math.hypot(x - lx, (y - ly) * squash) / R;
      if (d < 1) glow(g, x, y, a * (1 - d) ** 2, c);
    }
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

/** Wood for the Archive's furniture: an outline, then lit from the upper left, shaded to the lower right. */
const WD = {
  out: '#140C08',
  hi: '#8A6040',
  lit: '#6A4630',
  shade: '#2E1C12',
  recess: '#1A100A',
};

/** A row of scroll ends lying on a shelf whose board is at `y`: each a rolled end, lit on its upper left. */
function scrollRow(g, x0, x1, y, seed) {
  // the shelf above casts its shadow into the back of the bay
  box(g, x0, y - 4, x1 - x0, 1, WD.recess);
  for (let x = x0 + 1; x < x1 - 2; x += 3) {
    if (hash(x, y, seed) < 0.18) continue;
    const k = Math.floor(hash(x, y, seed + 1) * 3);
    const c = hex(P.scroll[k]);
    const top = y - 3;
    box(g, x, top, 3, 3, c);
    put(g, x, top, mix(c, [255, 250, 235], 0.3));
    box(g, x + 2, top + 1, 1, 2, mix(c, hex(WD.shade), 0.25));
    put(g, x + 1, y - 2, P.scrollEnd);
    if (hash(x, y, seed + 2) < 0.15) box(g, x, y - 1, 3, 1, P.ribbon);
  }
  // the board: its top face catches the light, its front edge is darker, its underside darker still
  box(g, x0, y, x1 - x0, 1, P.trim);
  box(g, x0, y + 1, x1 - x0, 1, P.wood);
  for (let x = x0; x < x1; x++) if (hash(x, y, seed + 4) < 0.12) put(g, x, y, '#8A5E3C');
}

/** The Archive's candelabra: an iron stand lit on its left, three candles, flames of `flame` (outer, mid, core). */
function candelabra(g, x, y, flame) {
  dropShadow(g, x + 8, y + 15, 6, 1, 0.6);
  // the foot and stem, outlined, lit down the left
  box(g, x + 4, y + 13, 8, 3, WD.out);
  box(g, x + 5, y + 14, 6, 1, P.iron);
  box(g, x + 5, y + 14, 3, 1, '#5A4E58');
  box(g, x + 6, y + 6, 4, 8, WD.out);
  box(g, x + 7, y + 6, 2, 8, P.iron);
  box(g, x + 7, y + 6, 1, 8, '#5A4E58');
  put(g, x + 7, y + 10, '#7A6E78');
  // the arms and their drip cups
  box(g, x + 3, y + 7, 10, 2, WD.out);
  box(g, x + 4, y + 7, 8, 1, P.iron);
  box(g, x + 4, y + 7, 3, 1, '#5A4E58');
  for (const cx of [4, 11]) {
    box(g, x + cx - 1, y + 6, 3, 1, P.iron);
    put(g, x + cx - 1, y + 6, '#6A5E68');
  }
  // the candles, lit on the left, a drip of wax down one side
  for (const cx of [4, 7, 11]) {
    const wide = cx === 7 ? 2 : 1;
    const top = cx === 7 ? 1 : 3;
    box(g, x + cx, y + top, wide, 6 - top, P.wax);
    put(g, x + cx + wide - 1, y + top + 1, '#C8BCA8');
    if (wide === 2) box(g, x + cx + 1, y + top + 1, 1, 6 - top - 1, '#D8CCB8');
    put(g, x + cx + wide, y + top + 2, '#E8E0CC');
    // the flame: a hot core, a bright body, a tip; a faint halo round it
    for (let j = -3; j <= 1; j++)
      for (let i = -2; i <= wide + 1; i++) glow(g, x + cx + i, y + top - 2 + j, 0.32 * (1 - (Math.abs(i - wide / 2 + 0.5) + Math.abs(j)) / 4), flame[1]);
    put(g, x + cx, y + top - 1, flame[0]);
    put(g, x + cx, y + top - 2, flame[2]);
    put(g, x + cx, y + top - 3, flame[1]);
    if (wide === 2) put(g, x + cx + 1, y + top - 1, flame[1]);
  }
}

/** A pot, outlined and lit from the left: terracotta, glass, or Tamsin's brass. Its rim at `top`, `w` wide, standing on `foot`. */
function pot(g, cx, top, w, kind = 'clay', foot = top + 5) {
  const [c, l, d, rimC] =
    kind === 'brass'
      ? ['#A88A3A', '#E0C060', '#6A5420', '#C8A848']
      : kind === 'glass'
        ? ['#8AA8B8', '#D8E8F0', '#5A7888', '#B8D0DC']
        : ['#A4542E', '#D07A4A', '#6E3218', '#B8643A'];
  const h = foot - top;
  for (let j = 0; j < h; j++) {
    const hw = Math.round(w / 2 - (j / h) * 1.5);
    box(g, cx - hw - 1, top + j, hw * 2 + 3, 1, WD.out);
    box(g, cx - hw, top + j, hw * 2 + 1, 1, c);
    put(g, cx - hw, top + j, l);
    if (kind !== 'glass') put(g, cx - hw + 1, top + j, mix(hex(c), hex(l), 0.5));
    box(g, cx + hw - 1, top + j, 2, 1, d);
  }
  box(g, cx - Math.round(w / 2) - 1, foot, Math.round(w / 2) * 2 + 3, 1, WD.out);
  // the rim, a band wider than the pot
  box(g, cx - Math.round(w / 2) - 2, top - 1, Math.round(w / 2) * 2 + 5, 3, WD.out);
  box(g, cx - Math.round(w / 2) - 1, top, Math.round(w / 2) * 2 + 3, 1, rimC);
  put(g, cx - Math.round(w / 2) - 1, top, l);
  box(g, cx + Math.round(w / 2), top, 2, 1, d);
}

/** A cluster of leaves: each a small lit-and-shaded blob. */
function leaf(g, x, y, rx, ry, [d, m, l]) {
  ellipse(g, x, y, rx + 1, ry + 1, '#0E1A0C');
  ellipse(g, x, y, rx, ry, d);
  ellipse(g, x - (rx > 1 ? 1 : 0), y - (ry > 1 ? 1 : 0), Math.max(0, rx - 1), Math.max(0, ry - 1), m);
  put(g, x - rx + 1, y - ry + 1, l);
}

const GREENS = {
  fern: ['#2E5A2A', '#4A8A3A', '#7AB858'],
  deep: ['#1E4226', '#2E6A3A', '#5A9A5A'],
  sage: ['#3A5A3A', '#5A7A52', '#8AA878'],
  pale: ['#3A6A2E', '#5A9A3E', '#9AD06A'],
};

/** The heroes' plants, each the one their room's examine line talks about. */
function plant(g, x, y, m) {
  const id = m.id ?? '';
  const kinds = ['leafy', 'fern', 'round', 'spiky', 'trail'];
  let kind = { 'room-brannoc': 'fern', 'room-ysolde': 'round', 'room-wren': 'jar', 'room-pip': 'hat', 'room-tamsin': 'brass' }[id];
  if (!kind) kind = kinds[Math.floor(hash(x, y, 51) * kinds.length)];
  dropShadow(g, x + 9, y + 15, 6, 1, 0.6);
  if (kind === 'jar') {
    // white flowers in a jar of water, the water catching the light
    pot(g, x + 8, y + 9, 6, 'glass', y + 14);
    box(g, x + 6, y + 11, 5, 3, '#6A90A8');
    put(g, x + 6, y + 11, '#C8E0F0');
    for (const [sx, top] of [[6, 3], [8, 1], [10, 4], [7, 5], [9, 3]]) box(g, x + sx, y + top + 2, 1, 9 - top, '#3A6A2E');
    for (const [fx, fy] of [[6, 4], [8, 2], [10, 5], [7, 6], [9, 4]]) {
      box(g, x + fx - 1, y + fy - 1, 3, 3, '#3A3430');
      put(g, x + fx - 1, y + fy, '#E8E4DC');
      put(g, x + fx + 1, y + fy, '#C8C4BC');
      put(g, x + fx, y + fy - 1, '#FFFFFF');
      put(g, x + fx, y + fy + 1, '#D8D4CC');
      put(g, x + fx, y + fy, '#E8C850');
    }
    return;
  }
  if (kind === 'brass') {
    // the pot Tamsin built, which waters the plant: a brass pot, a little tank and a pipe; the plant leans away
    pot(g, x + 7, y + 10, 8, 'brass', y + 14);
    box(g, x + 12, y + 4, 3, 5, WD.out);
    box(g, x + 13, y + 5, 1, 3, '#C8A848');
    box(g, x + 10, y + 4, 3, 1, '#8A6E2A');
    put(g, x + 10, y + 5, '#6AB0D8');
    for (const [i, j] of [[3, 12], [11, 12]]) put(g, x + i, y + j, '#E0C060');
    leaf(g, x + 5, y + 6, 2, 1, GREENS.sage);
    leaf(g, x + 3, y + 4, 2, 1, GREENS.sage);
    leaf(g, x + 7, y + 4, 1, 2, GREENS.sage);
    box(g, x + 6, y + 6, 1, 4, '#3A5A3A');
    return;
  }
  pot(g, x + 8, y + 10, 8, 'clay', y + 14);
  if (kind === 'fern' || kind === 'hat') {
    // fronds arching up and out from the middle, each lined with leaflets, darker at the heart
    const G = kind === 'fern' ? GREENS.fern : GREENS.pale;
    const fronds = [-2.5, -2.1, -1.75, -1.4, -1.05, -0.65];
    for (const ang of fronds) {
      const len = 7 - Math.abs(ang + 1.57) * 1.2;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      for (let s = 0; s <= len; s += 0.5) {
        const px = x + 8 + dx * s;
        const py = y + 10 + dy * s + (s * s * Math.abs(dx)) / 7;
        put(g, px, py, s < 2 ? G[0] : G[1]);
        if (s >= 1.5 && Math.round(s * 2) % 2 === 0) {
          // leaflets, perpendicular, lit on the upper side
          put(g, px - dy, py + dx * 0.5 - 1, s > len - 2 ? G[2] : G[1]);
          put(g, px + dy, py - dx * 0.5 + 1, G[0]);
        }
      }
    }
    put(g, x + 8, y + 9, G[0]);
    if (kind === 'hat') {
      // a tiny hat, with a feather in it
      box(g, x + 5, y + 2, 7, 1, WD.out);
      box(g, x + 6, y + 1, 5, 1, '#8A1A20');
      box(g, x + 7, y - 1, 3, 2, '#B3261E');
      box(g, x + 6, y - 2, 5, 1, WD.out);
      put(g, x + 7, y - 1, '#D85A50');
      box(g, x + 10, y - 3, 1, 3, '#E8D8B0');
      put(g, x + 11, y - 4, '#E8D8B0');
    }
    return;
  }
  if (kind === 'round') {
    // clipped into a neat ball, with a tag on a string: its watering, logged
    ellipse(g, x + 8, y + 5, 6, 5, '#0E1A0C');
    ellipse(g, x + 8, y + 5, 5, 4, GREENS.deep[0]);
    ellipse(g, x + 7, y + 4, 4, 3, GREENS.deep[1]);
    ellipse(g, x + 6, y + 3, 2, 1, GREENS.deep[2]);
    for (let k = 0; k < 6; k++) put(g, x + 4 + Math.floor(hash(x, y, k + 60) * 9), y + 2 + Math.floor(hash(y, x, k + 60) * 6), GREENS.deep[k % 2 ? 0 : 2]);
    if (id !== 'room-ysolde') return;
    box(g, x + 8, y + 9, 1, 1, '#4A3020');
    box(g, x + 11, y + 9, 3, 3, P.paper);
    put(g, x + 12, y + 10, '#8A7A60');
    put(g, x + 10, y + 9, '#C8B890');
    return;
  }
  if (kind === 'spiky') {
    for (const [lx, top] of [[5, 3], [7, 1], [9, 2], [11, 4], [6, 5], [10, 5]]) {
      box(g, x + lx, y + top, 1, 10 - top, GREENS.pale[1]);
      put(g, x + lx, y + top, GREENS.pale[2]);
      put(g, x + lx + 1, y + top + 3, GREENS.pale[0]);
    }
    return;
  }
  if (kind === 'trail') {
    leaf(g, x + 8, y + 7, 4, 2, GREENS.fern);
    for (const s of [-1, 1])
      for (let k = 0; k < 5; k++) put(g, x + 8 + s * (4 + Math.floor(k / 2)), y + 8 + k, GREENS.fern[k % 2 ? 1 : 2]);
    return;
  }
  // broad leaves, overlapping, the near ones brighter
  leaf(g, x + 5, y + 6, 2, 2, GREENS.deep);
  leaf(g, x + 11, y + 6, 2, 2, GREENS.deep);
  leaf(g, x + 8, y + 3, 2, 3, GREENS.fern);
  leaf(g, x + 6, y + 8, 2, 1, GREENS.fern);
  leaf(g, x + 10, y + 8, 2, 1, GREENS.fern);
}

/** A desk or table's top: a run of tiles (`l`/`r` its ends), outlined, lit along its back edge and left end. */
function tableTop(g, x, y, l, r, top, front, light = P.woodLight, dark = P.wood) {
  const t = y + top;
  const f = y + front;
  box(g, x, t - 1, TILE, 1, WD.out);
  box(g, x, t, TILE, f - t, light);
  box(g, x, t, TILE, 1, WD.hi);
  // planks along its length, a little grain
  box(g, x, t + 3, TILE, 1, mix(hex(light), hex(WD.shade), 0.35));
  for (let i = 0; i < TILE; i++)
    if (hash(x + i, y, 52) < 0.2) put(g, x + i, t + 1 + Math.floor(hash(x + i, y, 53) * (f - t - 1)), mix(hex(light), hex(WD.shade), 0.2));
  // the front edge, then the apron below it, in shade
  box(g, x, f, TILE, 1, P.trim);
  box(g, x, f + 1, TILE, 2, dark);
  box(g, x, f + 3, TILE, 1, WD.out);
  if (l) {
    box(g, x, t - 1, 1, f - t + 5, WD.out);
    box(g, x + 1, t, 1, f - t, WD.hi);
  }
  if (r) {
    box(g, x + 15, t - 1, 1, f - t + 5, WD.out);
    box(g, x + 14, t, 1, f - t, mix(hex(light), hex(WD.shade), 0.4));
  }
}

/** A gear, seen flat: brass, toothed, a hole in the middle. */
function gear(g, cx, cy, r) {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put(g, cx + Math.round(Math.cos(a) * (r + 1)), cy + Math.round(Math.sin(a) * (r + 1)), '#8A6E2A');
  }
  ellipse(g, cx, cy, r, r, '#A88A3A');
  put(g, cx - r + 1, cy - r + 1, '#E0C060');
  put(g, cx - 1, cy - 1, '#E0C060');
  put(g, cx, cy, '#2A1C10');
}

/** What lies on a desk, by whose room it is. `left`: the desk's left tile. */
function deskThings(g, x, y, left, id) {
  if (id === 'room-quill') {
    // drowned in notes, and a teacup grown a little forest
    if (left) {
      for (const [px, py, w, h] of [[2, 3, 6, 5], [6, 4, 6, 5], [9, 2, 5, 4]]) {
        box(g, x + px + 1, y + py + 1, w, h, WD.shade);
        box(g, x + px, y + py, w, h, P.paper);
        box(g, x + px, y + py, w, 1, '#FFF6DC');
        for (let r = 2; r < h; r += 2) box(g, x + px + 1, y + py + r, w - 2 - (r % 4 ? 1 : 0), 1, '#9A8A70');
      }
    } else {
      box(g, x + 1, y + 5, 5, 4, P.paper);
      box(g, x + 2, y + 6, 3, 1, '#9A8A70');
      ellipse(g, x + 10, y + 6, 3, 2, WD.out);
      ellipse(g, x + 10, y + 6, 2, 1, '#F0ECE4');
      box(g, x + 9, y + 6, 3, 1, '#3A2A1A');
      put(g, x + 13, y + 6, '#F0ECE4');
      for (const [i, j] of [[9, 4], [10, 3], [11, 4], [10, 5]]) put(g, x + i, y + j, j < 4 ? '#7AB858' : '#3A6A2E');
    }
    return;
  }
  if (id === 'room-tamsin') {
    // a workbench: gears, a spring, and a clock that runs backwards on purpose
    if (left) {
      gear(g, x + 5, y + 6, 2);
      gear(g, x + 10, y + 5, 1);
      for (let k = 0; k < 4; k++) put(g, x + 12 + (k % 2), y + 7 + k, '#B8B8C0');
      box(g, x + 2, y + 9, 4, 1, '#6A6A78');
      put(g, x + 2, y + 9, '#B8B8C0');
    } else {
      ellipse(g, x + 8, y + 5, 4, 3, WD.out);
      ellipse(g, x + 8, y + 5, 3, 2, '#F0E6CC');
      put(g, x + 8, y + 5, '#2A1C10');
      put(g, x + 7, y + 4, '#2A1C10');
      put(g, x + 9, y + 5, '#B3261E');
      put(g, x + 6, y + 4, '#FFFFFF');
      gear(g, x + 3, y + 8, 1);
    }
    return;
  }
  if (left) {
    // the open ledger, the gutter in shade
    box(g, x + 6, y + 5, 10, 6, WD.shade);
    box(g, x + 5, y + 4, 10, 6, P.paper);
    box(g, x + 5, y + 4, 10, 1, '#FFF6DC');
    box(g, x + 10, y + 4, 1, 6, '#B8A888');
    for (let r = 6; r < 10; r += 2) {
      box(g, x + 6, y + r, 3, 1, '#9A8A70');
      box(g, x + 11, y + r, 3, 1, '#9A8A70');
    }
    if (id === 'room-ysolde') for (const [cx, n] of [[2, 3], [3, 2]]) for (let k = 0; k < n; k++) box(g, x + cx - 1, y + 9 - k, 2, 1, k % 2 ? '#E8C860' : '#C8963A');
    return;
  }
  // a closed ledger, the ink pot and the quill
  box(g, x + 1, y + 5, 7, 5, WD.out);
  box(g, x + 1, y + 4, 7, 5, '#6A1A20');
  box(g, x + 1, y + 4, 7, 1, '#8A2A2E');
  box(g, x + 1, y + 8, 7, 1, P.paper);
  box(g, x + 10, y + 5, 3, 3, '#1A1426');
  put(g, x + 10, y + 5, '#4A4060');
  put(g, x + 11, y + 4, '#3A3050');
  box(g, x + 12, y + 1, 1, 4, P.wax);
  put(g, x + 13, y, P.wax);
  put(g, x + 13, y + 1, '#D8CCB8');
}

/** A hero's table (`T` drawn as `j`): two tiles, legs showing, and what the examine line says is on it. */
function heroTable(g, x, y, m) {
  const l = m.at(-1, 0) !== 'j';
  const r = m.at(1, 0) !== 'j';
  // the shadow under it, and the legs
  for (let i = l ? 1 : 0; i < (r ? 15 : 16); i++) for (let j = 12; j < 16; j++) tint(g, x + i, y + j, 0.55 - (j - 12) * 0.1);
  if (l) {
    box(g, x + 1, y + 11, 3, 5, WD.out);
    box(g, x + 2, y + 11, 1, 4, P.wood);
  }
  if (r) {
    box(g, x + 12, y + 11, 3, 5, WD.out);
    box(g, x + 13, y + 11, 1, 4, WD.shade);
  }
  tableTop(g, x, y, l, r, 3, 8);
  const id = m.id ?? '';
  if (id === 'room-brannoc') {
    // a sword, polished to a mirror, laid along the table; beside it, the list
    if (l) {
      box(g, x + 3, y + 4, 1, 4, '#C8963A');
      put(g, x + 3, y + 4, '#E8C860');
      box(g, x + 4, y + 5, 3, 2, '#5A3A22');
      box(g, x + 1, y + 5, 2, 2, '#C8963A');
      box(g, x + 7, y + 5, 9, 2, '#9A9AAA');
      box(g, x + 7, y + 5, 9, 1, '#E8E8F4');
      box(g, x + 7, y + 7, 9, 1, WD.shade);
    } else {
      box(g, x, y + 5, 6, 2, '#9A9AAA');
      box(g, x, y + 5, 6, 1, '#E8E8F4');
      put(g, x + 6, y + 6, '#9A9AAA');
      put(g, x + 6, y + 5, '#FFFFFF');
      box(g, x, y + 7, 6, 1, WD.shade);
      box(g, x + 9, y + 3, 5, 6, WD.shade);
      box(g, x + 8, y + 2, 5, 6, P.paper);
      box(g, x + 8, y + 2, 5, 1, '#FFF6DC');
      box(g, x + 9, y + 3, 3, 1, '#2A1C10');
      put(g, x + 9, y + 6, '#8A7A60');
    }
    return;
  }
  if (id === 'room-pip') {
    // song sheets every which way, and a lute
    if (l) {
      for (const [px, py] of [[2, 3], [7, 4]]) {
        box(g, x + px + 1, y + py + 1, 5, 5, WD.shade);
        box(g, x + px, y + py, 5, 5, P.paper);
        for (let r = 1; r < 5; r += 2) box(g, x + px + 1, y + py + r, 3, 1, '#9A8A70');
        put(g, x + px + 2, y + py + 1, '#2A1C10');
        put(g, x + px + 3, y + py + 3, '#2A1C10');
      }
    } else {
      ellipse(g, x + 6, y + 5, 4, 3, WD.out);
      ellipse(g, x + 6, y + 5, 3, 2, '#C8843A');
      put(g, x + 5, y + 4, '#E8A860');
      put(g, x + 6, y + 5, '#2A1C10');
      box(g, x + 9, y + 4, 6, 2, WD.out);
      box(g, x + 9, y + 4, 5, 1, '#8A5A2A');
      for (let k = 0; k < 3; k++) put(g, x + 10 + k * 2, y + 5, '#E8E0CC');
    }
    return;
  }
  if (id === 'room-tamsin') {
    // half a crossbow, or half a teapot: a pot with a spout at one end and a bow's limb out of the other
    if (l) {
      box(g, x + 3, y + 5, 13, 1, '#5A3A22');
      box(g, x + 3, y + 4, 1, 3, '#B8B8C0');
      put(g, x + 2, y + 3, '#B8B8C0');
      put(g, x + 2, y + 7, '#B8B8C0');
      put(g, x + 1, y + 2, '#6A6A78');
      put(g, x + 1, y + 8, '#6A6A78');
      box(g, x + 1, y + 3, 1, 5, '#C8C0A8');
    } else {
      ellipse(g, x + 4, y + 5, 4, 3, WD.out);
      ellipse(g, x + 4, y + 5, 3, 2, '#E8E4DC');
      put(g, x + 2, y + 4, '#FFFFFF');
      box(g, x + 3, y + 2, 3, 1, '#C8C4BC');
      box(g, x + 8, y + 4, 3, 1, '#C8C4BC');
      put(g, x + 11, y + 3, '#C8C4BC');
      gear(g, x + 12, y + 7, 1);
    }
    return;
  }
  if (l) box(g, x + 4, y + 4, 6, 4, P.paper);
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
      // the cornice: an outline, a lit moulding, then the first board
      box(g, x, y, TILE, 1, WD.out);
      box(g, x, y + 1, TILE, 1, WD.hi);
      box(g, x, y + 2, TILE, 1, P.trim);
      box(g, x, y + 3, TILE, 1, P.wood);
      box(g, x, y + 4, TILE, 1, WD.recess);
      scrollRow(g, x, x + TILE, y + 9, 1);
      scrollRow(g, x, x + TILE, y + 15, 2);
    } else {
      scrollRow(g, x, x + TILE, y + 5, 3);
      // the cupboards below the shelves, panelled, and the skirting
      box(g, x, y + 7, TILE, 1, WD.recess);
      box(g, x, y + 8, TILE, 7, P.wood);
      box(g, x, y + 8, TILE, 1, P.trim);
      box(g, x + 2, y + 10, 5, 3, WD.shade);
      box(g, x + 9, y + 10, 5, 3, WD.shade);
      box(g, x + 2, y + 10, 5, 1, WD.lit);
      box(g, x + 9, y + 10, 5, 1, WD.lit);
      box(g, x, y + 15, TILE, 1, WD.out);
    }
    // uprights between bays, lit down their left edge
    if ((x / TILE) % 3 === 0) {
      const top = upper ? 3 : 0;
      const h = upper ? 13 : 8;
      box(g, x, y + top, 2, h, P.wood);
      box(g, x, y + top, 1, h, WD.lit);
      box(g, x + 2, y + top, 1, h, WD.recess);
    }
  },
  Q(g, x, y) {
    TILE_ART.W(g, x, y, { at: () => 'W' });
    box(g, x, y - 7, 16, 17, WD.out);
    box(g, x + 1, y - 6, 14, 15, P.woodLight);
    box(g, x + 1, y - 6, 14, 1, WD.hi);
    box(g, x + 1, y - 6, 1, 15, WD.hi);
    box(g, x + 2, y - 5, 12, 13, P.cork);
    box(g, x + 2, y - 5, 12, 1, '#5A3A20');
    for (let j = 0; j < 13; j++) for (let i = 0; i < 12; i++) if (hash(x + i, y + j, 54) < 0.12) put(g, x + 2 + i, y - 5 + j, '#9A7048');
    for (const [px, py, w, h] of [
      [3, -4, 4, 5],
      [8, -3, 5, 4],
      [4, 2, 5, 5],
      [10, 2, 3, 4],
    ]) {
      box(g, x + px + 1, y + py + 1, w, h, '#5A3A20');
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
      box(g, x, y, TILE, 1, WD.out);
      box(g, x, y + 1, TILE, 1, WD.hi);
      box(g, x, y + 2, TILE, 1, P.trim);
      box(g, x + (left ? 3 : 0), y + 4, 13, 12, P.sky);
      for (let i = 0; i < 6; i++) put(g, x + 4 + hash(x, i) * 10, y + 5 + hash(i, x) * 9, P.skyLight);
      if (left) box(g, x + 3, y + 4, 1, 12, '#3A4A78');
    } else {
      box(g, x + (left ? 3 : 0), y, 13, 9, P.sky);
      if (left) box(g, x + 3, y, 1, 9, '#3A4A78');
      // the sill, lit, and the panelling under it
      box(g, x, y + 9, TILE, 1, WD.hi);
      box(g, x, y + 10, TILE, 1, P.trim);
      box(g, x, y + 11, TILE, 4, P.wood);
      box(g, x, y + 11, TILE, 1, WD.shade);
      box(g, x, y + 15, TILE, 1, WD.out);
    }
    // the mullion down the middle of the pair, and the crossbar
    if (!left) {
      box(g, x - 1, y + (upper ? 4 : 0), 2, upper ? 12 : 9, P.woodDark);
      box(g, x - 1, y + (upper ? 4 : 0), 1, upper ? 12 : 9, WD.lit);
    }
    if (!upper) box(g, x + (left ? 3 : 0), y + 2, 13, 1, P.woodDark);
  },
  T(g, x, y, m) {
    bookcase(g, x, y, m, true);
  },
  B(g, x, y, m) {
    bookcase(g, x, y, m, false);
  },
  c(g, x, y) {
    candelabra(g, x, y, ['#FFB04A', '#FFD060', '#FFF4C8']);
  },
  D(g, x, y, m) {
    const left = m.at(-1, 0) !== 'D';
    const right = m.at(1, 0) !== 'D';
    tableTop(g, x, y, left, right, 3, 10);
    // the desk's front: a drawer each side, brass pulls, the kneehole between
    box(g, x, y + 11, TILE, 4, P.wood);
    box(g, x, y + 11, TILE, 1, WD.shade);
    box(g, x, y + 15, TILE, 1, WD.out);
    if (left) {
      box(g, x, y + 3, 1, 13, WD.out);
      box(g, x + 2, y + 12, 9, 2, WD.shade);
      box(g, x + 2, y + 12, 9, 1, WD.lit);
      put(g, x + 6, y + 13, '#C8963A');
      box(g, x + 12, y + 11, 4, 5, WD.recess);
    } else {
      box(g, x + 15, y + 3, 1, 13, WD.out);
      box(g, x, y + 11, 4, 5, WD.recess);
      box(g, x + 5, y + 12, 9, 2, WD.shade);
      box(g, x + 5, y + 12, 9, 1, WD.lit);
      put(g, x + 9, y + 13, '#C8963A');
    }
    deskThings(g, x, y, left, m.id);
  },
  p(g, x, y) {
    dropShadow(g, x + 9, y + 14, 7, 2, 0.6);
    for (const [px, py] of [
      [2, 9],
      [7, 9],
      [4, 5],
      [9, 6],
      [6, 2],
    ]) {
      const c = hex(P.scroll[(px + py) % 3]);
      box(g, x + px - 1, y + py - 1, 7, 6, WD.out);
      box(g, x + px, y + py, 5, 4, c);
      box(g, x + px, y + py, 5, 1, mix(c, [255, 250, 235], 0.4));
      box(g, x + px, y + py + 3, 5, 1, mix(c, hex(WD.shade), 0.3));
      // each end rolled: the dark spiral, and a lit lip
      box(g, x + px, y + py + 1, 1, 2, P.scrollEnd);
      put(g, x + px, y + py, mix(c, [255, 250, 235], 0.6));
      box(g, x + px + 4, y + py + 1, 1, 2, mix(c, hex(P.scrollEnd), 0.5));
      if ((px * 7 + py) % 4 === 0) box(g, x + px + 2, y + py, 1, 4, P.ribbon);
    }
  },
  f: plant,
  j: heroTable,
  O(g, x, y, m) {
    // The cocoon covers a 2×2 block; draw it once, from its top-left tile.
    if (m.at(-1, 0) === 'O' || m.at(0, -1) === 'O') return;
    const cx = x + 16;
    dropShadow(g, cx + 1, y + 29, 15, 3, 0.55);
    ellipse(g, cx, y + 26, 14, 5, '#1A1210');
    ellipse(g, cx, y + 26, 13, 4, P.stoneLight);
    ellipse(g, cx, y + 27, 12, 3, P.stone);
    box(g, cx - 12, y + 26, 25, 2, P.stone);
    ellipse(g, cx, y + 28, 12, 2, '#2A221E');
    for (let i = -9; i < -2; i++) put(g, cx + i, y + 23, '#6A5A50');
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
    // the south wall's top, dressed stone in two courses, each block lit along its top and left
    box(g, x, y, TILE, TILE, P.stone);
    box(g, x, y, TILE, 1, '#1A1210');
    box(g, x, y + 1, TILE, 1, P.stoneLight);
    box(g, x, y + 2, TILE, 1, '#7A6A5E');
    box(g, x, y + 3, TILE, 1, '#1A1210');
    for (let j = 4; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        const course = Math.floor((j - 4) / 6);
        const bx = x + i + (course % 2) * 5;
        const jj = (j - 4) % 6;
        const ii = bx % 10;
        const h = hash(Math.floor(bx / 10), course + y, 55);
        let c = h < 0.5 ? P.stone : '#40352F';
        if (jj === 5 || ii === 0) c = '#241C18';
        else if (jj === 0 || ii === 1) c = P.stoneLight;
        else if (ii === 9) c = '#2E2622';
        else if (hash(x + i, y + j, 56) < 0.05) c = '#2E2622';
        put(g, x + i, y + j, c);
      }
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
    candelabra(g, x, y, ['#3AC85A', '#9AF0A0', '#E8FFE8']);
  },
  '='(g, x, y, m) {
    // the great door, in the stone: an outline, planks lit on their left, iron straps, ring handles
    const left = m.at(-1, 0) !== '=';
    box(g, x, y, TILE, TILE, WD.out);
    box(g, x, y, TILE, 2, P.stoneLight);
    box(g, x, y + 2, TILE, 1, '#1A1210');
    const x0 = x + (left ? 1 : 0);
    box(g, x0, y + 3, 15, 13, P.wood);
    for (let i = 0; i < 15; i++) {
      const k = (i + (left ? 1 : 0)) % 4;
      if (k === 0) box(g, x0 + i, y + 3, 1, 13, P.woodDark);
      else if (k === 1) box(g, x0 + i, y + 3, 1, 13, WD.lit);
    }
    for (const sy of [6, 12]) {
      box(g, x0, y + sy, 15, 1, P.iron);
      box(g, x0, y + sy - 1, 15, 1, '#4A4048');
      for (let i = 2; i < 15; i += 5) put(g, x0 + i, y + sy, '#6A5E68');
    }
    box(g, x + (left ? 13 : 1), y + 8, 2, 3, WD.out);
    box(g, x + (left ? 14 : 1), y + 8, 1, 3, P.rugGold);
    put(g, x + (left ? 14 : 1), y + 8, '#F0C860');
  },
};

/** A free-standing bookcase: `T` is its top half, `B` its bottom. Runs of them share end panels. */
function bookcase(g, x, y, m, top) {
  const run = top ? 'T' : 'B';
  const left = m.at(-1, 0) !== run;
  const right = m.at(1, 0) !== run;
  box(g, x, y, TILE, TILE, P.woodDark);
  if (top) {
    // the top, seen a little from above: an outline, a lit cap, a moulding in shade
    box(g, x, y, TILE, 1, WD.out);
    box(g, x, y + 1, TILE, 1, WD.hi);
    box(g, x, y + 2, TILE, 1, P.woodLight);
    box(g, x, y + 3, TILE, 1, P.wood);
    box(g, x, y + 4, TILE, 1, WD.recess);
    scrollRow(g, x, x + TILE, y + 10, 4);
  } else {
    scrollRow(g, x, x + TILE, y + 3, 5);
    scrollRow(g, x, x + TILE, y + 10, 6);
    box(g, x, y + 12, TILE, 3, P.wood);
    box(g, x, y + 12, TILE, 1, P.trim);
    box(g, x, y + 15, TILE, 1, WD.out);
  }
  // end panels: the left lit, the right in shade, each outlined
  if (left) {
    box(g, x, y, 1, TILE, WD.out);
    box(g, x + 1, y + (top ? 1 : 0), 1, TILE - (top ? 1 : 1), WD.lit);
    box(g, x + 2, y + (top ? 2 : 0), 1, TILE - (top ? 3 : 1), P.wood);
  }
  if (right) {
    box(g, x + 15, y, 1, TILE, WD.out);
    box(g, x + 13, y + (top ? 2 : 0), 2, TILE - (top ? 3 : 1), WD.shade);
  }
}

/** The rugs: a runner's ground, its pattern, its gold border. Rooms can lay one in another colour. */
const RUGS = {
  crimson: ['#6E1A20', '#561218', '#C8963A'],
  blue: ['#2C3A62', '#1E2848', '#B8904A'],
  green: ['#34503A', '#243A2A', '#B8964A'],
  plum: ['#4A2A50', '#341C3A', '#B8904A'],
  ochre: ['#7A5228', '#5A3A1A', '#D8C08A'],
  dove: ['#5A5E68', '#44464E', '#D8D0C0'],
  sage: ['#4A5E44', '#384A34', '#C8B880'],
  teal: ['#24504E', '#183A3A', '#B8904A'],
};

/** The Archive's floorboards: four art pixels a board, lit along the top, a seam below, grain, knots and nails. */
function plankAt(x, y) {
  const row = Math.floor(y / 4);
  const jy = y % 4;
  const joint = (row * 7) % 24;
  const sx = x + joint;
  const seg = Math.floor(sx / 24);
  const ix = sx % 24;
  if (jy === 3 || ix === 0) return hex(P.seam);
  let c = hex(P.plank[Math.floor(hash(seg, row, 9) * 3)]);
  const dark = hex(P.seam);
  const light = hex('#8A6040');
  // grain: long streaks along the board, a few lighter
  const gr = hash(Math.floor((sx + hash(seg, row, 30) * 5) / 5), y, 31);
  if (gr < 0.22) c = mix(c, dark, 0.2);
  else if (gr > 0.9) c = mix(c, light, 0.14);
  // the board's upper edge catches the light; its lower edge is in shade; its left end lit, its right end dark
  if (jy === 0) c = mix(c, light, 0.22);
  else if (jy === 2) c = mix(c, dark, 0.14);
  if (ix === 1) c = mix(c, light, 0.18);
  else if (ix === 23) c = mix(c, dark, 0.3);
  // a nail at each end
  if (jy === 1 && (ix === 2 || ix === 21)) return mix(dark, hex('#1A100A'), 0.5);
  // a knot here and there
  if (hash(seg, row, 33) < 0.14) {
    const kx = 6 + Math.floor(hash(seg, row, 34) * 12);
    if (jy === 1 && (ix === kx || ix === kx + 1)) c = mix(c, dark, 0.65);
    else if ((jy === 1 && (ix === kx - 1 || ix === kx + 2)) || (jy === 2 && ix >= kx - 1 && ix <= kx + 2)) c = mix(c, dark, 0.3);
  }
  return c;
}

/** Things that stand clear of the floor round them and cast their own small shadow. */
const SMALL = 'cgpf';

function drawMap(map) {
  const rows = map.tiles;
  const H = rows.length;
  const W = rows[0].length;
  const g = canvas(W * TILE, H * TILE);
  const at = (tx, ty) => rows[ty]?.[tx] ?? '#';
  const look = (c) => map.art?.[c] ?? c;
  const walkable = (c) => c === '.' || c === 'r';

  // Floorboards run under everything, continuous from tile to tile.
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      // a room can lay another floor: stone flags, white tile, straw (interior-art.mjs)
      g[y][x] = map.floor && FLOORS[map.floor] ? hex(FLOORS[map.floor](x, y, hash)) : plankAt(x, y);

  // The rug: a runner with a gold border and a fringe at its ends, wherever `r` or the cocoon's dais sits.
  const [rugC, rugD, rugG] = (RUGS[map.rug] ?? RUGS.crimson).map(hex);
  const fringe = mix(rugG, [255, 250, 235], 0.4);
  const onRug = (tx, ty) => at(tx, ty) === 'r' || at(tx, ty) === 'O';
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      if (!onRug(tx, ty)) continue;
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const px = tx * TILE + i;
          const py = ty * TILE + j;
          const L = !onRug(tx - 1, ty);
          const R = !onRug(tx + 1, ty);
          const T = !onRug(tx, ty - 1);
          const B = !onRug(tx, ty + 1);
          // the fringe, at the runner's two ends
          if ((T && j === 0) || (B && j === 15)) {
            if (i % 2 === 0 && !(L && i < 2) && !(R && i > 13)) g[py][px] = mix(g[py][px], fringe, 0.85);
            continue;
          }
          const edge = (i < 3 && L) || (i > 12 && R) || (j < 4 && T) || (j > 11 && B);
          const rimLine = (i === 1 && L) || (i === 14 && R) || (j === 2 && T) || (j === 13 && B);
          let c = rugC;
          if (edge) c = rimLine ? rugD : rugG;
          else if (Math.abs((px % 8) - 4) + Math.abs((py % 8) - 4) === 3) c = rugD;
          else if (px % 8 === 4 && py % 8 === 4) c = mix(rugC, rugG, 0.6);
          // the outer edge of the gold, worn darker toward the lower right
          if (edge && !rimLine && ((i === 0 && L) || (j === 1 && T))) c = mix(c, [255, 240, 200], 0.2);
          if (edge && !rimLine && ((i === 15 && R) || (j === 14 && B))) c = mix(c, [10, 6, 8], 0.35);
          // and the rug's weave, a whisper of texture
          if (!edge && hash(px, py, 35) < 0.06) c = mix(c, rugD, 0.5);
          g[py][px] = c;
        }
    }

  // Soft shadows under walls and furniture, on the floor tile below them (small things cast their own).
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      if (!walkable(at(tx, ty)) || walkable(at(tx, ty - 1)) || SMALL.includes(look(at(tx, ty - 1)))) continue;
      for (let j = 0; j < 6; j++)
        for (let i = 0; i < TILE; i++) glow(g, tx * TILE + i, ty * TILE + j, 0.6 - j * 0.1, '#100A08');
    }

  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      // `art` draws a letter as another (a hidden door as the wall it hides in, a hero's plant as a plant)
      const draw = TILE_ART[look(at(tx, ty))];
      if (!draw) throw new Error(`No art for tile "${at(tx, ty)}" in ${map.id}`);
      draw(g, tx * TILE, ty * TILE, { at: (dx, dy) => look(at(tx + dx, ty + dy)), wall: map.wall, id: map.id });
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
        if (d < 1) glow(g, x, y, 0.24 * (1 - d) * fade, '#C8C8F0');
      }
  }

  // Candlelight pools around every candelabra: a warm wash, and a brighter heart nearest the flames.
  rows.forEach((r, ty) =>
    [...r].forEach((c, tx) => {
      // (a hearth lights the floor in front of it, from the fire low in its lower tile)
      const hearth = c === 'F' && at(tx, ty + 1) !== 'F';
      if (c !== 'c' && c !== 'g' && !hearth) return;
      const lx = tx * TILE + 8;
      const ly = ty * TILE + (hearth ? 12 : 4);
      const skip = (x, y) => at(Math.floor(x / TILE), Math.floor(y / TILE)) === '#';
      const col = c === 'g' ? '#4AE070' : '#FFB04A';
      lightPool(g, lx, ly, 48, 0.3, col, skip);
      lightPool(g, lx, ly, 20, 0.22, c === 'g' ? '#B8FFC0' : '#FFE0A0', skip);
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
  // A round canopy that spills a little past its tile, over a short trunk, its shadow on the ground.
  dropShadow(g, x + 10, y + 15, 6, 2, 0.45);
  box(g, x + 6, y + 10, 4, 6, O.trunk);
  box(g, x + 6, y + 10, 1, 6, O.trunkDark);
  ellipse(g, x + 8, y + 7, 8, 7, O.leafDark);
  ellipse(g, x + 8, y + 6, 7, 6, O.leaf);
  ellipse(g, x + 6, y + 4, 3, 2, O.leafLight);
  for (let i = 0; i < 6; i++)
    put(g, x + 3 + Math.floor(hash(x, y, i) * 10), y + 3 + Math.floor(hash(y, x, i) * 7), O.leafLight);
}

/** Burnt ground, ash grey with charred specks, under the old museum's ruins. */
function scorched(g, x, y, m) {
  // ash grey with charred specks; toward unburnt ground the edge frays into the grass
  const burnt = (c) => '0234'.includes(c) && c !== '0';
  const open = m ? { l: !burnt(m.at(-1, 0)), r: !burnt(m.at(1, 0)), t: !burnt(m.at(0, -1)), b: !burnt(m.at(0, 1)) } : {};
  for (let j = 0; j < TILE; j++)
    for (let i = 0; i < TILE; i++) {
      const d = Math.min(open.l ? i : 9, open.r ? 15 - i : 9, open.t ? j : 9, open.b ? 15 - j : 9);
      const h = hash(x + i, y + j, 56);
      if (d < 4 && hash(x + i, y + j, 59) > d / 4) {
        if (d < 2) continue;
        tint(g, x + i, y + j, 0.35, '#2A2622');
        continue;
      }
      put(g, x + i, y + j, h < 0.12 ? '#2A2622' : h < 0.2 ? '#5A524C' : h < 0.24 ? '#4A3E36' : '#3E3834');
    }
}

/**
 * Rough grey stone in courses of uneven blocks, worked out from where each pixel sits so a run of it never seams:
 * each block its own shade, its top edge lit and its bottom in shade, the odd tuft of moss. `rng` seeds the courses.
 */
const ROCK_ROWS = new Map();
function rockAt(px, py, seed = 0) {
  const rowH = 5;
  const row = Math.floor(py / rowH);
  const jy = py % rowH;
  const key = row * 7 + seed;
  if (!ROCK_ROWS.has(key)) {
    const cuts = [];
    let at = -Math.floor(hash(row, seed, 101) * 10);
    while (at < 4096) {
      cuts.push(at);
      at += 6 + Math.floor(hash(row, cuts.length + seed * 999, 102) * 7);
    }
    ROCK_ROWS.set(key, cuts);
  }
  const cuts = ROCK_ROWS.get(key);
  let k = 0;
  while (cuts[k + 1] <= px) k++;
  const ix = px - cuts[k];
  const w = cuts[k + 1] - cuts[k];
  if (jy === rowH - 1 || ix === 0) return O.stoneDark;
  const h = hash(k, row, 103 + seed);
  if (jy === 0) return h < 0.5 ? O.stoneLight : '#7E7674';
  if (ix === w - 1 || jy === rowH - 2) return '#544C4A';
  if (hash(px, py, 104) < 0.04) return '#544C4A';
  if (h > 0.9 && jy === 1 && ix < 3) return '#5A7244'; // moss in the joints
  return h < 0.35 ? O.stone : h < 0.7 ? '#645C5A' : '#706866';
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
    // A little taller than its tile, so the silk's wrap shows; its shadow on the ground, a few blades in front.
    dropShadow(g, x + 10, y + 15, 7, 2, 0.55);
    egg(g, x + 8, y + 16, 11, 19);
    put(g, x + 8, y - 4, '#3A3044');
    for (const [i, tall] of [[2, 3], [4, 4], [11, 3], [13, 4], [7, 2]]) {
      box(g, x + i, y + 16 - tall, 1, tall, i % 2 ? O.leafLight : O.leaf);
      put(g, x + i + 1, y + 15, O.leafDark);
    }
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
    // A patched canvas tent, drawn once across its block: a ridge pole, the near slope lit and the far one in
    // shade, seams and patches, guy ropes pegged out, the flap tied back on a dark doorway, its shadow on the grass.
    if (m.at(-1, 0) === 'A' || m.at(0, -1) === 'A') return;
    let w = 1;
    while (m.at(w, 0) === 'A') w++;
    let h = 1;
    while (m.at(0, h) === 'A') h++;
    w *= TILE;
    h *= TILE;
    const ridge = Math.round(h * 0.3);
    const foot = h - 2;
    // the shadow, down and to the right
    for (let j = ridge; j < h + 3; j++)
      for (let i = 4; i < w + 4; i++) tint(g, x + i, y + j, j < foot ? 0.4 : 0.5 - (j - foot) * 0.1);
    for (let j = 0; j <= foot; j++) {
      // the roof pulls in toward the ridge at either end
      const inset = j < ridge ? Math.round((ridge - j) * 0.6) + 1 : Math.max(0, 1 - (j - ridge));
      for (let i = inset; i < w - inset; i++) {
        let c;
        if (j < ridge) {
          // the far slope, in shade, its seams running up to the ridge
          c = (i - 2) % 9 === 0 ? '#8A7A50' : '#A89868';
          if (j === 1 || i === inset) c = '#C0B080';
        } else {
          // the near slope, catching the light, darkening toward the hem
          c = (i - 2) % 9 === 0 ? '#A89868' : j > foot - 4 || i > w * 0.72 ? '#B8A878' : O.canvas;
          if (j === ridge + 1) c = '#E0D4A8';
          if (i === inset) c = '#D8CCA0';
          if (i === w - inset - 1) c = '#A89868';
        }
        put(g, x + i, y + j, c);
      }
      // the outline round it
      const edge = j < ridge ? Math.round((ridge - j) * 0.6) + 1 : Math.max(0, 1 - (j - ridge));
      put(g, x + edge - 1, y + j, '#3A2A18');
      put(g, x + w - edge, y + j, '#3A2A18');
    }
    box(g, x + Math.round(ridge * 0.6) + 1, y - 1, w - 2 * Math.round(ridge * 0.6) - 2, 1, '#3A2A18');
    // the ridge pole, its ends poking out
    box(g, x + 1, y + ridge, w - 2, 1, '#5A3A22');
    put(g, x, y + ridge - 1, '#5A3A22');
    put(g, x + w - 1, y + ridge - 1, '#5A3A22');
    box(g, x, y + foot, w, 2, '#3A2A18');
    // a patch or two, stitched on
    for (let k = 0; k < 2; k++) {
      const px = x + (k ? w - 10 : 3) + Math.floor(hash(x, y, 110 + k) * 4);
      const py = y + ridge + 3 + Math.floor(hash(y, x, 112 + k) * (foot - ridge - 10));
      box(g, px, py, 5, 4, k ? '#A8906A' : '#C8A878');
      for (let i = 0; i < 5; i += 2) put(g, px + i, py, '#6A5A3A');
    }
    // the doorway, flaps tied back
    const dx = x + Math.floor(w / 2) - 4;
    const dh = Math.min(12, foot - ridge - 2);
    for (let j = 0; j < dh; j++) {
      const half = Math.min(4, 1 + Math.floor(j / 2));
      box(g, dx + 4 - half, y + foot - dh + j, half * 2, 1, j < 2 ? '#3A2A18' : '#1A120C');
      put(g, dx + 4 - half - 1, y + foot - dh + j, '#E0D4A8');
      put(g, dx + 4 + half, y + foot - dh + j, '#A89868');
    }
    // guy ropes to pegs at either end
    for (const [sx, dir] of [
      [0, -1],
      [w - 1, 1],
    ]) {
      for (let k = 0; k < 5; k++) put(g, x + sx + dir * Math.round(k * 0.6), y + ridge + k, '#6A5A3A');
      put(g, x + sx + dir * 3, y + ridge + 5, '#3A2A18');
    }
  },
  x(g, x, y) {
    // A campfire in a ring of stones: its warm light on the grass, crossed logs, flames, a curl of smoke.
    for (let j = -10; j < 24; j++)
      for (let i = -14; i < 30; i++) {
        const d = Math.hypot(i - 8, (j - 11) * 1.4) / 20;
        if (d < 1) glow(g, x + i, y + j, 0.3 * (1 - d) ** 1.5, '#FFB04A');
      }
    ellipse(g, x + 8, y + 12, 7, 3, '#2A2220');
    ellipse(g, x + 8, y + 12, 5, 2, '#3A2A20');
    // the ring of stones, each lit on its upper left
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const sx = x + 8 + Math.round(Math.cos(a) * 6);
      const sy = y + 12 + Math.round(Math.sin(a) * 3);
      box(g, sx - 1, sy - 1, 3, 2, O.stoneDark);
      put(g, sx - 1, sy - 1, k > 4 ? '#C8A070' : O.stoneLight);
      put(g, sx, sy - 1, O.stone);
    }
    // crossed logs, charred at the ends
    for (let k = 0; k < 7; k++) {
      put(g, x + 5 + k, y + 9 + Math.floor(k / 2), O.trunk);
      put(g, x + 11 - k, y + 9 + Math.floor(k / 2), '#5A3A22');
    }
    put(g, x + 5, y + 9, '#1E1410');
    put(g, x + 11, y + 9, '#1E1410');
    // the flames: red at the edge, orange, a yellow heart, a white-hot core
    ellipse(g, x + 8, y + 7, 3, 5, '#C8501E');
    ellipse(g, x + 8, y + 8, 2, 4, P.flame2);
    ellipse(g, x + 8, y + 9, 1, 2, P.flame);
    put(g, x + 8, y + 10, '#FFF4C8');
    put(g, x + 6, y + 4, '#C8501E');
    put(g, x + 10, y + 3, P.flame2);
    put(g, x + 9, y + 1, '#8A8280');
    put(g, x + 10, y, '#6A6260');
  },
  M(g, x, y, m) {
    // The hill's rock face (and the towns' walls): rough stone courses, grass along the top, its foot in shadow.
    const rock = (c) => c === 'M' || c === 'E' || c === 'o';
    const openAbove = !rock(m.at(0, -1));
    const openBelow = !rock(m.at(0, 1));
    const openLeft = !rock(m.at(-1, 0));
    const openRight = !rock(m.at(1, 0));
    // A big block (a hill, not a wall) is grass on top: rock shows only on its faces, the lowest two rows
    // and a strip down any open side.
    const hilltop = (dx, dy) =>
      rock(m.at(dx, dy)) &&
      rock(m.at(dx, dy + 1)) &&
      rock(m.at(dx, dy + 2)) &&
      ((rock(m.at(dx - 1, dy)) && rock(m.at(dx + 1, dy))) ||
        (rock(m.at(dx - 1, dy)) && rock(m.at(dx - 2, dy))) ||
        (rock(m.at(dx + 1, dy)) && rock(m.at(dx + 2, dy))));
    if (m.at(0, 0) === 'M' && hilltop(0, 0)) {
      const ground = m.ground ?? O;
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const px = x + i;
          const py = y + j;
          let c = hex(ground.grass[Math.floor(hash(Math.floor(px / 6), Math.floor(py / 5), 4) * 3)]);
          c = mix(c, hex('#B8D070'), 0.12); // raised, it catches a little more light
          if (hash(px, py, 106) < 0.06) c = hex(ground.blade);
          else if (hash(px, py, 107) < 0.05) c = hex(ground.grassDark);
          put(g, px, py, c);
        }
      // the odd boulder breaking through the turf, with its shadow
      if (hash(x, y, 108) < 0.14) {
        const sx = x + 4 + Math.floor(hash(x, y, 109) * 7);
        const sy = y + 4 + Math.floor(hash(y, x, 109) * 7);
        for (let i = -1; i < 5; i++) tint(g, sx + i + 1, sy + 3, 0.4);
        box(g, sx + 1, sy - 1, 3, 1, O.stoneDark);
        box(g, sx, sy, 5, 3, O.stoneDark);
        box(g, sx + 1, sy, 3, 2, O.stone);
        box(g, sx + 1, sy, 2, 1, O.stoneLight);
      }
      // the back of the hill: the turf rolls away from you, darker toward the edge
      if (openAbove)
        for (let i = 0; i < TILE; i++) {
          for (let j = 0; j < 4; j++) tint(g, x + i, y + j, 0.3 - j * 0.07);
        }
      // the hill's open sides: a ragged strip of rock face, lit on the west and shaded on the east, turf hanging over
      for (const [open, lit] of [
        [openLeft, true],
        [openRight, false],
      ]) {
        if (!open) continue;
        for (let j = 0; j < TILE; j++) {
          const w = 4 + Math.floor(hash(x, y + j, lit ? 111 : 112) * 2 + hash(x, Math.floor((y + j) / 3), 113) * 2);
          for (let i = 0; i < w; i++) {
            const px = lit ? x + i : x + 15 - i;
            let c = hex(rockAt(px, y + j, 1));
            if (i === 0) c = hex(lit ? O.stoneDark : '#2A2422');
            if (lit && i === 1) c = hex(O.stoneLight);
            if (!lit) c = mix(c, [10, 6, 8], 0.25);
            put(g, px, y + j, c);
          }
          const lip = lit ? x + w : x + 15 - w;
          put(g, lip, y + j, O.leafDark);
          put(g, lit ? lip + 1 : lip - 1, y + j, lit ? O.leafLight : O.leaf);
        }
      }
      return;
    }
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        let c = rockAt(x + i, y + j);
        if (openLeft && i === 0) c = O.stoneLight;
        if (openRight && i === 15) c = O.stoneDark;
        put(g, x + i, y + j, c);
      }
    if (openAbove || (m.at(0, 0) === 'M' && hilltop(0, -1) && m.at(0, -1) === 'M')) {
      // a grassy lip, ragged where it hangs over the edge
      for (let i = 0; i < TILE; i++) {
        const hang = 2 + Math.floor(hash(x + i, y, 105) * 3);
        box(g, x + i, y, 1, hang, i % 5 === 2 ? O.leafLight : O.leaf);
        put(g, x + i, y + hang, O.leafDark);
        put(g, x + i, y, '#5E8A48');
      }
    }
    if (openBelow) {
      // the foot: darker stone, then the face's shadow on the ground below
      for (let i = 0; i < TILE; i++) {
        for (let j = 12; j < TILE; j++) tint(g, x + i, y + j, (j - 11) * 0.08);
        put(g, x + i, y + 15, '#2A2422');
        for (let j = 0; j < 4; j++) tint(g, x + i, y + 16 + j, 0.45 - j * 0.11);
      }
    }
  },
  E(g, x, y, m) {
    // The fort's arch, half buried: a dark way in, a lit stone surround, a keystone.
    OUTDOOR_ART.M(g, x, y, m);
    const arch = (c) => c === 'E' || c === 'o';
    const left = !arch(m.at(-1, 0));
    const right = !arch(m.at(1, 0));
    const top = !arch(m.at(0, -1));
    const x0 = x + (left ? 4 : 0);
    const x1 = x + TILE - (right ? 4 : 0);
    box(g, x0, y + (top ? 5 : 0), x1 - x0, TILE - (top ? 5 : 0), '#0C0806');
    // the dark deepens inward
    for (let j = top ? 5 : 0; j < 9; j++) for (let i = x0; i < x1; i++) put(g, i, y + j, '#060404');
    if (left) {
      box(g, x + 1, y + 2, 3, 14, O.stoneLight);
      box(g, x + 1, y + 2, 1, 14, '#ACA5A0');
      box(g, x + 4, y + 5, 1, 11, '#2A2422');
    }
    if (right) {
      box(g, x + 12, y + 2, 3, 14, O.stone);
      box(g, x + 14, y + 2, 1, 14, O.stoneDark);
      box(g, x + 11, y + 5, 1, 11, '#2A2422');
    }
    if (top) {
      box(g, x, y + 2, TILE, 3, O.stoneLight);
      box(g, x, y + 2, TILE, 1, '#ACA5A0');
      box(g, x, y + 5, TILE, 1, '#2A2422');
      if (!left) {
        // the keystone, over the middle
        box(g, x - 2, y + 1, 4, 5, O.stone);
        box(g, x - 2, y + 1, 4, 1, '#ACA5A0');
        box(g, x + 1, y + 1, 1, 5, O.stoneDark);
      }
    }
  },
  O(g, x, y) {
    // A boulder: an outline, lit from the upper left, a crack, moss on its shaded side, its shadow on the grass.
    dropShadow(g, x + 10, y + 14, 7, 2, 0.55);
    ellipse(g, x + 8, y + 9, 7, 6, '#2A2422');
    ellipse(g, x + 8, y + 9, 6, 5, O.stoneDark);
    ellipse(g, x + 7, y + 8, 5, 4, O.stone);
    ellipse(g, x + 6, y + 7, 3, 2, O.stoneLight);
    put(g, x + 5, y + 6, '#ACA5A0');
    put(g, x + 9, y + 9, '#3A3432');
    put(g, x + 10, y + 10, '#3A3432');
    put(g, x + 10, y + 11, '#3A3432');
    put(g, x + 12, y + 11, O.leaf);
    put(g, x + 11, y + 13, O.leaf);
    put(g, x + 13, y + 10, O.leafLight);
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
    // An iron cage: the ground inside in its shade, bars lit on their left, a heavy top and floor rail, a padlock.
    for (let j = 3; j < 15; j++) for (let i = 2; i < 15; i++) tint(g, x + i, y + j, 0.5);
    box(g, x + 1, y + 1, 14, 2, '#1A1618');
    box(g, x + 1, y + 1, 14, 1, '#6A6070');
    for (let i = 1; i < 16; i += 3) {
      box(g, x + i, y + 3, 1, 11, '#5A5060');
      put(g, x + i, y + 4, '#8A8094');
      put(g, x + i + 1, y + 3, '#1A1618');
    }
    box(g, x + 1, y + 14, 14, 1, '#2A2228');
    box(g, x + 1, y + 13, 14, 1, '#5A5060');
    box(g, x + 7, y + 7, 3, 3, '#8A6A30');
    put(g, x + 7, y + 7, '#C8963A');
    put(g, x + 8, y + 6, '#5A5060');
  },
  n(g, x, y) {
    // A banner on a pole: the horde's fist crushing a crown. Lit on the left, a fold in shade, swallow-tailed.
    for (let j = 2; j < 13; j++) tint(g, x + 14, y + j + 1, 0.35);
    box(g, x + 3, y, 2, TILE, O.trunk);
    box(g, x + 3, y, 1, TILE, '#6A4A2A');
    put(g, x + 4, y - 1, P.rugGold);
    box(g, x + 5, y + 1, 9, 1, O.trunkDark);
    box(g, x + 5, y + 2, 9, 9, '#6A1216');
    box(g, x + 5, y + 2, 1, 9, '#8A2A2E');
    box(g, x + 12, y + 2, 2, 9, '#4A0C10');
    box(g, x + 5, y + 11, 3, 2, '#6A1216');
    box(g, x + 11, y + 11, 3, 2, '#4A0C10');
    // the crown, then the fist coming down on it
    box(g, x + 7, y + 7, 5, 2, P.rugGold);
    put(g, x + 7, y + 6, P.rugGold);
    put(g, x + 9, y + 6, P.rugGold);
    put(g, x + 11, y + 6, P.rugGold);
    put(g, x + 7, y + 7, '#F0C860');
    box(g, x + 7, y + 3, 5, 3, '#E8B48C');
    box(g, x + 7, y + 3, 5, 1, '#F4CCA8');
    for (const i of [8, 10]) put(g, x + i, y + 4, '#B07A58');
  },
  j(g, x, y) {
    // A regimental cairn: stones stacked, each lit on its upper left, its shadow on the grass.
    dropShadow(g, x + 10, y + 14, 7, 2, 0.5);
    for (const [cx, cy, rx, ry] of [
      [8, 12, 6, 3],
      [8, 9, 5, 2],
      [8, 6, 4, 2],
      [8, 3, 2, 2],
    ]) {
      ellipse(g, x + cx, y + cy, rx + 1, ry + 1, '#2A2422');
      ellipse(g, x + cx, y + cy, rx, ry, O.stone);
      box(g, x + cx - rx + 1, y + cy - ry, rx, 1, O.stoneLight);
      box(g, x + cx + 1, y + cy + ry, rx - 1, 1, O.stoneDark);
    }
    put(g, x + 6, y + 2, '#ACA5A0');
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
  royalHedge(g, x, y, m) {
    // A clipped royal hedge (tile k in the Royal Forest): flat on top, a darker face where it meets the ground.
    box(g, x, y, TILE, TILE, O.leafDark);
    if (m.at(0, -1) !== 'k') box(g, x, y, TILE, 3, O.leafLight);
    for (let i = 0; i < 8; i++)
      put(g, x + Math.floor(hash(x, y, i + 60) * 16), y + 3 + Math.floor(hash(y, x, i + 61) * 10), O.leaf);
    if (m.at(0, 1) !== 'k') box(g, x, y + 13, TILE, 3, '#16301A');
  },
  roseBed(g, x, y) {
    // A white rose bush (tile r in the Royal Forest).
    ellipse(g, x + 8, y + 10, 7, 5, O.leafDark);
    ellipse(g, x + 8, y + 9, 6, 4, O.leaf);
    put(g, x + 5, y + 7, O.leafLight);
    for (let i = 0; i < 6; i++) {
      const rx = x + 3 + Math.floor(hash(x, y, i + 70) * 9);
      const ry = y + 6 + Math.floor(hash(y, x, i + 71) * 6);
      box(g, rx, ry, 2, 2, '#F4F0EA');
      put(g, rx + 1, ry + 1, '#D8C8C0');
    }
  },
  queensFountain(g, x, y, m) {
    // The queen's fountain (tile u in the Royal Forest), drawn once across its 3x3 tiles: a round marble basin of
    // clear water, and on the plinth in the middle the old king and his queen, hand in hand.
    if (m.at(-1, 0) === 'u' || m.at(0, -1) === 'u') return;
    const MB = { o: '#3A3836', d: '#9A968E', m: '#C8C4BA', l: '#E6E2D8', h: '#F6F4EE' };
    const WA = { d: '#2E5A86', m: '#4A80B4', l: '#8AB8E0', h: '#D0E8F8' };
    const GOLD = '#C8963A';
    // Its shadow, falling down and to the right.
    for (let j = 30; j < 48; j++)
      for (let i = 6; i < 50; i++) {
        const c = g[y + j]?.[x + i];
        if (c && ((i - 26) * (i - 26)) / 484 + ((j - 36) * (j - 36)) / 144 <= 1) g[y + j][x + i] = mix(c, [16, 12, 10], 0.35);
      }
    // The basin: an outline, the rim, the water.
    ellipse(g, x + 24, y + 34, 23, 12, MB.o);
    ellipse(g, x + 24, y + 33, 22, 11, MB.d);
    ellipse(g, x + 24, y + 32, 22, 10, MB.l);
    ellipse(g, x + 24, y + 33, 19, 8, WA.d);
    ellipse(g, x + 24, y + 32, 18, 7, WA.m);
    for (let i = 0; i < 18; i++)
      put(g, x + 8 + Math.floor(hash(x, y, i + 80) * 32), y + 28 + Math.floor(hash(y, x, i + 81) * 9), i % 3 ? WA.l : WA.h);
    // Coins at the bottom, glinting.
    for (const [i, j] of [[12, 34], [33, 31], [29, 36], [17, 30]]) put(g, x + i, y + j, GOLD);
    // The plinth.
    box(g, x + 17, y + 24, 14, 10, MB.o);
    box(g, x + 18, y + 24, 12, 9, MB.m);
    box(g, x + 18, y + 24, 12, 2, MB.h);
    box(g, x + 28, y + 26, 2, 7, MB.d);
    // The plaque on its front.
    box(g, x + 20, y + 28, 8, 3, GOLD);
    box(g, x + 21, y + 29, 6, 1, '#8A6A28');
    // The king, on the left: broad, a crown, a short cloak, his head thrown back laughing.
    box(g, x + 16, y + 11, 8, 13, MB.o);
    box(g, x + 17, y + 12, 6, 12, MB.l);
    box(g, x + 21, y + 13, 2, 11, MB.d);
    box(g, x + 17, y + 5, 6, 7, MB.o);
    box(g, x + 18, y + 6, 4, 5, MB.h);
    box(g, x + 18, y + 9, 4, 2, MB.m); // the beard
    box(g, x + 18, y + 3, 4, 2, GOLD);
    put(g, x + 18, y + 2, GOLD);
    put(g, x + 21, y + 2, GOLD);
    // The queen, on the right: slender, a long gown, a circlet, looking down the path.
    box(g, x + 25, y + 11, 7, 13, MB.o);
    box(g, x + 26, y + 12, 5, 12, MB.h);
    box(g, x + 29, y + 14, 2, 10, MB.l);
    box(g, x + 25, y + 20, 7, 4, MB.o);
    box(g, x + 26, y + 20, 5, 4, MB.l);
    box(g, x + 26, y + 5, 5, 7, MB.o);
    box(g, x + 27, y + 6, 3, 5, MB.h);
    box(g, x + 26, y + 6, 1, 7, MB.m); // her hair, down her back
    box(g, x + 27, y + 4, 3, 1, GOLD);
    // Their hands, joined between them.
    box(g, x + 23, y + 15, 3, 2, MB.h);
    put(g, x + 24, y + 17, MB.o);
    // Water spilling from the plinth's corners into the basin.
    for (const sx of [17, 30])
      for (let j = 0; j < 6; j++) put(g, x + sx + (sx < 24 ? -Math.floor(j / 2) : Math.floor(j / 2)), y + 25 + j, j % 2 ? WA.l : WA.h);
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
    // A barrel, iron-hooped, its staves lit on the left.
    ellipse(g, x + 8, y + 9, 6, 6, O.trunkDark);
    ellipse(g, x + 8, y + 9, 5, 6, O.trunk);
    box(g, x + 4, y + 5, 2, 9, '#6A4A2A');
    box(g, x + 11, y + 5, 2, 9, '#3A2418');
    box(g, x + 8, y + 4, 1, 10, '#3A2418');
    box(g, x + 3, y + 6, 11, 1, P.iron);
    box(g, x + 3, y + 12, 11, 1, P.iron);
    put(g, x + 4, y + 6, '#6A6070');
    put(g, x + 4, y + 12, '#6A6070');
    ellipse(g, x + 8, y + 4, 4, 2, O.trunkDark);
    ellipse(g, x + 8, y + 4, 3, 1, '#7A5A3A');
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
  6(g, x, y, m) {
    // A rose bed, weeded to the last leaf: red and white roses in dark soil, edged with a stone kerb.
    const l = m.at(-1, 0) !== '6';
    const r = m.at(1, 0) !== '6';
    for (let i = 0; i < TILE; i++) tint(g, x + i + 1, y + 15, 0.4);
    const x0 = x + (l ? 1 : 0);
    const x1 = x + TILE - (r ? 1 : 0);
    // the kerb: lit along the top, shaded along the front
    box(g, x0, y + 4, x1 - x0, 11, O.stoneDark);
    box(g, x0, y + 4, x1 - x0, 1, O.stoneLight);
    box(g, x0, y + 13, x1 - x0, 2, O.stone);
    box(g, x0, y + 13, x1 - x0, 1, O.stoneLight);
    for (let i = x0 + 3; i < x1; i += 6) put(g, i, y + 14, O.stoneDark);
    // the soil, turned and dark
    const s0 = x0 + (l ? 1 : 0);
    const s1 = x1 - (r ? 1 : 0);
    for (let j = 5; j < 13; j++)
      for (let i = s0; i < s1; i++) put(g, i, y + j, hash(i, y + j, 57) < 0.2 ? O.soil : O.soilDark);
    // the bushes: dark leaves, lit leaves on top, then the blooms, each with a highlight
    for (const [i, j, red] of [
      [4, 7, true],
      [11, 6, false],
      [8, 11, false],
      [13, 11, true],
      [3, 11, true],
    ]) {
      ellipse(g, x + i, y + j + 1, 3, 2, O.leafDark);
      box(g, x + i - 2, y + j, 4, 1, O.leaf);
      put(g, x + i - 2, y + j + 1, O.leafLight);
      box(g, x + i - 1, y + j - 2, 3, 3, red ? '#7A1A22' : '#B8B0A0');
      box(g, x + i - 1, y + j - 2, 2, 2, red ? '#B0303A' : '#F4F0EA');
      put(g, x + i - 1, y + j - 2, red ? '#E0606A' : '#FFFFFF');
      put(g, x + i, y + j - 1, red ? '#7A1A22' : '#C8C0B0');
    }
  },
  // Kaldorhold's old museum (author, Oct 7, 2026), burned to the ground: soot-black wall stubs, ash and fallen
  // beams, and the plinths where the old kingdom's things stood, every case empty.
  2(g, x, y, m) {
    // a stub of wall, black with soot, its top broken jagged, the bricks still showing through in places
    scorched(g, x, y, m);
    for (let i = 0; i < TILE; i++) tint(g, x + i + 1, y + 15, 0.5);
    for (let i = 1; i < 15; i++) {
      const top = 3 + Math.floor(hash(x + i, y, 51) * 4) + (i > 9 ? 2 : 0);
      for (let j = top; j < 15; j++) {
        const course = Math.floor(j / 3);
        const joint = j % 3 === 2 || (i + (course % 2) * 3) % 6 === 0;
        let c = joint ? '#14100E' : hash(Math.floor((i + (course % 2) * 3) / 6), course + y, 58) < 0.3 ? '#4A2E22' : '#2A2420';
        if (j === top) c = '#5A524C'; // the broken edge, catching the light
        else if (i === 1 && !joint) c = '#3E3632';
        put(g, x + i, y + j, c);
      }
      put(g, x + i, y + top - 1, '#14100E');
    }
    box(g, x + 1, y + 14, 14, 1, '#14100E');
    for (let k = 0; k < 4; k++) put(g, x + 2 + Math.floor(hash(x, y, k + 52) * 12), y + 9 + Math.floor(hash(y, x, k + 53) * 5), '#7A3A1A');
  },
  3(g, x, y, m) {
    // ash heaped over a fallen roof beam, charred, an ember or two still glowing under it
    scorched(g, x, y, m);
    ellipse(g, x + 8, y + 11, 7, 4, '#2A2622');
    ellipse(g, x + 8, y + 10, 6, 3, '#5A524C');
    ellipse(g, x + 7, y + 9, 4, 2, '#6E6660');
    for (let k = 0; k < 14; k++) {
      const bx = x + 1 + k;
      const by = y + 12 - Math.floor(k / 2);
      box(g, bx, by, 1, 3, '#1E140C');
      put(g, bx, by, '#4A2E1A');
      if (k % 3 === 1) put(g, bx, by + 1, '#2A1A10');
    }
    put(g, x, y + 13, '#1E140C');
    for (let k = 0; k < 4; k++) {
      const ex = x + 3 + Math.floor(hash(x, y, k + 54) * 10);
      const ey = y + 11 + Math.floor(hash(y, x, k + 55) * 3);
      put(g, ex, ey, '#E8742A');
      if (k === 0) put(g, ex + 1, ey, '#FFD060');
    }
  },
  4(g, x, y, m) {
    // a stone plinth, smoke-stained, and on it an empty glass case with a cracked pane
    scorched(g, x, y, m);
    dropShadow(g, x + 9, y + 15, 7, 2, 0.6);
    box(g, x + 2, y + 9, 12, 7, '#1E1A18');
    box(g, x + 3, y + 9, 10, 6, '#5A524C');
    box(g, x + 3, y + 9, 10, 1, '#8A8280');
    box(g, x + 3, y + 9, 1, 6, '#6E6660');
    box(g, x + 11, y + 10, 2, 5, '#3E3834');
    box(g, x + 5, y + 12, 6, 2, '#6A4A20'); // the brass label, half melted
    put(g, x + 5, y + 12, '#A8803A');
    put(g, x + 9, y + 14, '#6A4A20');
    // the case: an iron frame, smoked glass, a crack across it, nothing inside
    box(g, x + 3, y + 1, 10, 8, '#1E1A18');
    box(g, x + 4, y + 2, 8, 6, '#24282E');
    box(g, x + 4, y + 2, 2, 6, '#3A4048');
    put(g, x + 5, y + 3, '#A8B0BC');
    for (const [i, j] of [[7, 2], [8, 3], [8, 4], [9, 5], [10, 6]]) put(g, x + i, y + j, '#8A92A0');
    box(g, x + 6, y + 6, 4, 1, '#2E2A26'); // the cushion, where the crown sat
  },
  0(g, x, y) {
    // the king's notice, nailed to a post in front of the ruin
    dropShadow(g, x + 10, y + 15, 4, 1, 0.5);
    box(g, x + 7, y + 6, 2, 10, O.trunk);
    put(g, x + 7, y + 10, '#6A4A2A');
    box(g, x + 1, y + 1, 14, 9, '#3A2A1A');
    box(g, x + 2, y + 2, 12, 7, '#E8DCC0');
    box(g, x + 2, y + 2, 12, 1, '#FFF6DC');
    box(g, x + 13, y + 3, 1, 6, '#C8B898');
    box(g, x + 4, y + 4, 8, 1, '#5A4A3A');
    box(g, x + 4, y + 6, 6, 1, '#5A4A3A');
    box(g, x + 9, y + 7, 3, 1, '#8A1A1A'); // his seal
    put(g, x + 2, y + 2, '#8A8280');
    put(g, x + 13, y + 2, '#8A8280');
  },
  Q(g, x, y) {
    // A faceless statue, toppled face-down in the moss.
    box(g, x + 2, y + 7, 12, 6, O.stoneDark);
    box(g, x + 2, y + 6, 12, 5, O.stoneLight);
    ellipse(g, x + 12, y + 8, 3, 3, O.stoneLight);
    for (let i = 0; i < 5; i++) put(g, x + 3 + i * 2, y + 11, O.leaf);
  },
  // The Royal Forest (author, Oct 7, 2026), where Brannoc ran. Drawn by name (a map's `art` points a
  // letter at them), so they never take a letter another place uses.
  brush(g, x, y) {
    // A gap in the undergrowth: trodden earth between two walls of bracken. Every gap looks the same,
    // the ones that go somewhere and the ones the forest turns you round in.
    box(g, x + 3, y, 10, TILE, O.dirtDark);
    box(g, x + 4, y, 8, TILE, O.dirt[0]);
    for (const side of [0, 12])
      for (let j = 0; j < TILE; j += 3) ellipse(g, x + side + 2, y + j + 1, 2, 2, j % 2 ? O.leaf : O.leafDark);
    for (let i = 0; i < 4; i++) put(g, x + 5 + Math.floor(hash(x, y, i + 40) * 6), y + 2 + i * 4, O.leafLight);
  },
  carved(g, x, y) {
    // A tree with a picture scratched into its trunk: pale cuts in the bark.
    tree(g, x, y);
    box(g, x + 5, y + 9, 6, 7, O.trunk);
    box(g, x + 6, y + 10, 4, 4, '#C8A878');
    put(g, x + 7, y + 11, O.trunkDark);
    put(g, x + 8, y + 12, O.trunkDark);
    put(g, x + 9, y + 11, O.trunkDark);
  },
  carvedWild(g, x, y) {
    // The same, cut harder: gouges all down the trunk.
    tree(g, x, y);
    box(g, x + 5, y + 8, 6, 8, O.trunk);
    for (let j = 0; j < 4; j++) {
      box(g, x + 5 + (j % 2), y + 9 + j * 2, 4, 1, '#D8B888');
      put(g, x + 9 - (j % 2), y + 9 + j * 2, '#E8D0A0');
    }
  },
  deadGrass(g, x, y) {
    // Grass gone grey and flat, in a ring.
    box(g, x, y, TILE, TILE, '#7A7458');
    for (let i = 0; i < 14; i++) {
      const bx = x + Math.floor(hash(x, y, i + 50) * 15);
      const by = y + Math.floor(hash(y, x, i + 50) * 15);
      put(g, bx, by, i % 3 ? '#5E5844' : '#9A9278');
    }
  },
  husk(g, x, y) {
    // An old cocoon, split down the front and gone grey, sunk into the ground.
    box(g, x, y, TILE, TILE, '#7A7458');
    ellipse(g, x + 8, y + 12, 7, 3, '#4A4636');
    ellipse(g, x + 8, y + 9, 6, 6, '#9A968A');
    ellipse(g, x + 6, y + 8, 3, 4, '#B0AC9E');
    box(g, x + 8, y + 3, 2, 11, '#2A2620');
    put(g, x + 7, y + 6, '#2A2620');
    put(g, x + 10, y + 10, '#2A2620');
  },
  woodpile(g, x, y) {
    // Logs stacked neat, ends out.
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3 - (r === 2 ? 1 : 0); c++) {
        const cx = x + 3 + c * 5 + (r === 2 ? 2 : 0);
        const cy = y + 13 - r * 4;
        ellipse(g, cx, cy, 2, 2, O.trunk);
        put(g, cx, cy, '#C8A878');
      }
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
for (const [k, v] of Object.entries(interiorArt({ box, put, ellipse, hash, tint }))) if (!TILE_ART[k]) TILE_ART[k] = v;
// Free-standing furniture sits on the floor: a soft contact shadow under each piece, down and to the right.
for (const [k, rx] of Object.entries({ t: 7, x: 6, k: 6, h: 7, L: 5, A: 7, n: 7, b: 6 })) {
  const draw = TILE_ART[k];
  TILE_ART[k] = (g, x, y, m) => {
    dropShadow(g, x + 9, y + 15, rx, 2, 0.55);
    draw(g, x, y, m);
  };
}

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

// Free-standing things outdoors sit on the ground: a soft contact shadow under each, down and to the right.
for (const [k, rx] of Object.entries({ n: 4, q: 6, S: 5, c: 3, y: 5, m: 7, l: 6, b: 6, w: 7, X: 7, L: 5, Y: 5, Q: 7, R: 6 })) {
  const draw = OUTDOOR_ART[k];
  OUTDOOR_ART[k] = (g, x, y, m) => {
    dropShadow(g, x + 9, y + 15, rx, 2, 0.45);
    draw(g, x, y, m);
  };
}

// The Graveyard of Kings (graveyard-art.mjs): named keys, so they can't clash with anyone's letters.
for (const [k, v] of Object.entries(graveyardArt({ box, put, ellipse, hash }))) {
  if (OUTDOOR_ART[k]) throw new Error(`graveyard-art: "${k}" is already drawn`);
  OUTDOOR_ART[k] = v;
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
      // `at` is the letter on the map; `key` is the art it's drawn with (the map's `art` applied), for named keys
      draw(g, tx * TILE, ty * TILE, {
        at: (dx, dy) => at(tx + dx, ty + dy),
        key: (dx, dy) => map.art?.[at(tx + dx, ty + dy)] ?? at(tx + dx, ty + dy),
        ground,
      });
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
  v(g, x, y) {
    // A trap pit (author, Oct 4, 2026): floor like any other, bar a hairline crack, if you look.
    for (const [i, j] of [[4, 6], [5, 7], [6, 7], [7, 8], [8, 9], [9, 9], [10, 10], [11, 10]])
      put(g, x + i, y + j, DG.floorLine);
  },
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
      // the wall's top, seen from above: rough dark stone, a little grit
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const n = hash(x + i, y + j, 86);
          put(g, x + i, y + j, n < 0.04 ? '#322E2C' : n > 0.96 ? '#282422' : DG.wallDark);
        }
      box(g, x, y, TILE, 1, DG.mortar);
      // where the face below begins, the top's lip catches the light
      if (!'W#BCcf'.includes(m.at(0, 1)) || sideHole) box(g, x, y + 15, TILE, 1, '#3E3936');
      return;
    }
    // Ashlar in courses of four, each block its own shade, its top edge lit and its right end in shade.
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        const px = x + i;
        const course = Math.floor(j / 4);
        const jj = j % 4;
        const bx = px + (((y >> 4) * 4 + course) % 2 ? 4 : 0);
        const brick = Math.floor(bx / 8);
        const ii = bx % 8;
        let c;
        if (jj === 3 || ii === 7) c = DG.mortar;
        else {
          const h = hash(brick, (y >> 2) + course, 87);
          c = h < 0.33 ? DG.wall : h < 0.66 ? '#4E4844' : '#544E4A';
          if (jj === 0) c = h < 0.5 ? '#68605A' : '#625A55';
          else if (ii === 6) c = '#423C39';
          else if (hash(px, y + j, 88) < 0.06) c = '#3C3634';
        }
        put(g, px, y + j, c);
      }
    // grime gathers toward the floor
    for (let j = 9; j < 14; j++) for (let i = 0; i < TILE; i++) tint(g, x + i, y + j, (j - 9) * 0.06);
    box(g, x, y + 14, TILE, 2, DG.wallDark);
    box(g, x, y + 14, TILE, 1, '#3A3432');
  },
  B(g, x, y, m) {
    DUNGEON_ART.W(g, x, y, m);
    // a Hale banner on an iron rod: lit on the left, a fold in shade, swallow-tailed, its shadow on the stone
    for (let j = 2; j < 16; j++) tint(g, x + 13, y + j, 0.45);
    box(g, x + 2, y, 12, 1, DG.iron);
    put(g, x + 2, y, DG.ironLight);
    box(g, x + 3, y + 1, 10, 13, DG.banner);
    box(g, x + 3, y + 1, 1, 13, '#8A2A2E');
    box(g, x + 11, y + 1, 2, 13, DG.bannerDark);
    box(g, x + 3, y + 1, 10, 1, DG.gold);
    box(g, x + 3, y + 13, 3, 2, DG.banner);
    box(g, x + 10, y + 13, 3, 2, DG.bannerDark);
    put(g, x + 3, y + 14, '#8A2A2E');
    haleSigil(g, x, y + 3);
  },
  c(g, x, y, m) {
    // A wall torch: the dungeon's save point.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 6, y + 12, 4, 2, DG.iron);
    put(g, x + 6, y + 12, DG.ironLight);
    box(g, x + 7, y + 7, 2, 6, DG.timber);
    put(g, x + 7, y + 8, '#7A5A3C');
    box(g, x + 6, y + 7, 4, 1, DG.iron);
    ellipse(g, x + 8, y + 4, 2, 3, '#C8501E');
    ellipse(g, x + 8, y + 5, 2, 2, P.flame2);
    put(g, x + 8, y + 4, P.flame);
    put(g, x + 8, y + 5, '#FFF4C8');
    put(g, x + 9, y + 1, '#C8501E');
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
  N(g, x, y, m) {
    // A stone archway with its door shut: planks, two iron bands and a lock.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 1, y + 1, 14, 2, DG.wallLight);
    box(g, x + 2, y + 3, 12, 13, DG.timber);
    for (let i = 5; i < 14; i += 3) box(g, x + i, y + 3, 1, 13, DG.timberDark);
    box(g, x + 2, y + 5, 12, 2, DG.iron);
    box(g, x + 2, y + 12, 12, 2, DG.iron);
    box(g, x + 10, y + 8, 3, 3, DG.ironLight);
    put(g, x + 11, y + 9, DG.earth);
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
    // A bunk, straw mattress and a grey blanket, on a timber frame.
    dropShadow(g, x + 9, y + 15, 7, 2, 0.55);
    box(g, x + 1, y + 1, 14, 14, DG.timberDark);
    box(g, x + 2, y + 1, 12, 13, DG.timber);
    box(g, x + 2, y + 1, 12, 1, '#7A5A3C');
    box(g, x + 3, y + 3, 10, 10, DG.straw);
    for (let k = 0; k < 6; k++) put(g, x + 3 + Math.floor(hash(x, y, k + 90) * 10), y + 3 + Math.floor(hash(y, x, k + 90) * 3), '#C8B060');
    // a flat pillow, then the blanket with its folded-down edge
    box(g, x + 5, y + 3, 6, 2, '#C8C0A8');
    box(g, x + 3, y + 7, 10, 6, DG.blanket);
    box(g, x + 3, y + 7, 10, 1, '#6A7A8A');
    box(g, x + 11, y + 8, 2, 5, '#3A4A58');
    put(g, x + 6, y + 10, '#3A4A58');
    put(g, x + 7, y + 10, '#3A4A58');
    box(g, x + 1, y + 14, 14, 1, '#20160E');
  },
  t(g, x, y, m) {
    // A trestle table, its boards joined along its length.
    const l = m.at(-1, 0) !== 't';
    const r = m.at(1, 0) !== 't';
    for (let i = l ? 1 : 0; i < (r ? 15 : 16); i++) for (let j = 13; j < 16; j++) tint(g, x + i, y + j, 0.5 - (j - 13) * 0.12);
    if (l) box(g, x + 1, y + 10, 2, 5, DG.timberDark);
    if (r) box(g, x + 13, y + 10, 2, 5, DG.timberDark);
    if (!l && !r) box(g, x + 7, y + 10, 2, 5, DG.timberDark);
    const x0 = x + (l ? 0 : 0);
    box(g, x0, y + 3, TILE, 7, DG.timber);
    box(g, x0, y + 3, TILE, 1, '#7A5A3C');
    box(g, x0, y + 6, TILE, 1, '#4E3622');
    for (let i = 0; i < TILE; i++) if (hash(x + i, y, 91) < 0.15) put(g, x + i, y + 4 + Math.floor(hash(x + i, y, 92) * 4), '#4E3622');
    box(g, x0, y + 10, TILE, 1, DG.timberDark);
    box(g, x0, y + 2, TILE, 1, '#1E140C');
    if (l) {
      box(g, x, y + 2, 1, 9, '#1E140C');
      box(g, x + 1, y + 3, 1, 7, '#6A4C32');
    }
    if (r) box(g, x + 15, y + 2, 1, 9, '#1E140C');
  },
  r(g, x, y) {
    // A weapon rack of rusted spears.
    dropShadow(g, x + 8, y + 15, 7, 1, 0.5);
    for (let i = 3; i < 14; i += 4) {
      box(g, x + i, y + 2, 1, 11, DG.timberDark);
      put(g, x + i + 1, y + 3, '#2A1C10');
      box(g, x + i - 1, y, 3, 3, DG.rust);
      put(g, x + i, y - 1, '#A86A40');
      put(g, x + i - 1, y, '#A86A40');
    }
    box(g, x + 1, y + 12, 14, 2, DG.timber);
    box(g, x + 1, y + 12, 14, 1, '#7A5A3C');
    box(g, x + 1, y + 14, 2, 2, DG.timberDark);
    box(g, x + 13, y + 14, 2, 2, DG.timberDark);
  },
  d(g, x, y) {
    // A drill dummy: straw on a post.
    dropShadow(g, x + 9, y + 15, 5, 1, 0.55);
    box(g, x + 7, y + 8, 2, 8, DG.timber);
    put(g, x + 8, y + 12, DG.timberDark);
    box(g, x + 3, y + 5, 10, 2, DG.timber);
    box(g, x + 3, y + 5, 10, 1, '#7A5A3C');
    ellipse(g, x + 8, y + 6, 4, 5, '#8A7438');
    ellipse(g, x + 8, y + 6, 3, 4, DG.straw);
    ellipse(g, x + 7, y + 4, 1, 2, '#C8B060');
    box(g, x + 4, y + 7, 8, 1, '#5A3E28');
    put(g, x + 9, y + 9, '#6A5A2A');
  },
  P(g, x, y) {
    // A pressure plate set into the floor.
    box(g, x + 2, y + 2, 12, 12, DG.floorLine);
    box(g, x + 3, y + 3, 10, 10, DG.plate);
    box(g, x + 3, y + 3, 10, 1, DG.ironLight);
  },
  O(g, x, y) {
    // A boulder, lit from the upper left.
    dropShadow(g, x + 9, y + 14, 7, 2, 0.6);
    ellipse(g, x + 8, y + 9, 7, 6, '#1E1A18');
    ellipse(g, x + 8, y + 9, 6, 5, DG.wallDark);
    ellipse(g, x + 7, y + 8, 5, 4, DG.wall);
    ellipse(g, x + 6, y + 7, 3, 2, DG.wallLight);
    put(g, x + 5, y + 6, '#7A726A');
    put(g, x + 10, y + 10, '#262220');
    put(g, x + 9, y + 11, '#262220');
  },
  x(g, x, y) {
    // A heap of rubble.
    dropShadow(g, x + 8, y + 12, 7, 3, 0.5);
    for (let i = 0; i < 8; i++) {
      const rx = x + 3 + Math.floor(hash(x, y, i) * 10);
      const ry = y + 6 + Math.floor(hash(y, x, i) * 7);
      ellipse(g, rx, ry, 2, 2, '#262220');
      ellipse(g, rx, ry, 1, 1, i % 2 ? DG.rubble : DG.wall);
      put(g, rx - 1, ry - 1, i % 2 ? '#7A726A' : DG.wallLight);
    }
  },
  L(g, x, y) {
    // A crate with a note pinned to it.
    dropShadow(g, x + 9, y + 15, 7, 2, 0.55);
    box(g, x + 1, y + 4, 14, 12, '#20160E');
    box(g, x + 2, y + 5, 12, 10, DG.timber);
    box(g, x + 2, y + 5, 12, 1, '#7A5A3C');
    box(g, x + 2, y + 5, 1, 10, '#6A4C32');
    box(g, x + 2, y + 9, 12, 1, DG.timberDark);
    box(g, x + 2, y + 13, 12, 1, DG.timberDark);
    for (const [i, j] of [[3, 6], [12, 6], [3, 12], [12, 12]]) put(g, x + i, y + j, DG.ironLight);
    box(g, x + 6, y + 3, 5, 6, P.paper);
    box(g, x + 10, y + 4, 1, 5, '#B8A888');
    box(g, x + 7, y + 5, 3, 1, '#8A7A60');
    box(g, x + 7, y + 7, 2, 1, '#8A7A60');
    put(g, x + 8, y + 3, DG.rust);
  },
  R(g, x, y, m) {
    // A duty roster, nailed to the wall.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 3, y + 3, 12, 11, '#1E1A18');
    box(g, x + 2, y + 2, 12, 11, P.paper);
    box(g, x + 2, y + 2, 12, 1, '#FFF6DC');
    box(g, x + 13, y + 3, 1, 10, '#C8B890');
    for (let j = 5; j < 12; j += 2) box(g, x + 4, y + j, 4 + Math.floor(hash(x, y + j, 93) * 5), 1, '#8A7A60');
    put(g, x + 8, y + 2, DG.iron);
  },
  A(g, x, y) {
    // An empty suit of armour on a stand.
    dropShadow(g, x + 9, y + 15, 5, 1, 0.6);
    box(g, x + 5, y + 14, 6, 2, DG.timberDark);
    box(g, x + 7, y + 12, 2, 3, DG.timber);
    // legs, breastplate, pauldrons, helm: steel, lit on the left
    box(g, x + 6, y + 10, 1, 3, '#4A4A56');
    box(g, x + 9, y + 10, 1, 3, '#3A3A44');
    box(g, x + 4, y + 5, 8, 6, '#1E1C22');
    box(g, x + 5, y + 5, 6, 5, '#5A5A68');
    box(g, x + 5, y + 5, 2, 5, '#8A8A9A');
    box(g, x + 10, y + 5, 1, 5, '#3A3A44');
    put(g, x + 8, y + 7, '#B8B8C8');
    box(g, x + 3, y + 5, 2, 2, '#8A8A9A');
    box(g, x + 11, y + 5, 2, 2, '#4A4A56');
    ellipse(g, x + 8, y + 2, 3, 3, '#1E1C22');
    ellipse(g, x + 8, y + 2, 2, 2, '#5A5A68');
    box(g, x + 6, y + 1, 2, 2, '#9A9AAA');
    box(g, x + 7, y + 3, 3, 1, DG.earth);
    put(g, x + 8, y - 2, DG.banner);
    put(g, x + 8, y - 1, DG.banner);
  },
  S(g, x, y, m) {
    // Baron Plush's great sofa, velvet and tassels.
    const left = m.at(-1, 0) !== 'S';
    const right = m.at(1, 0) !== 'S';
    for (let i = 0; i < TILE; i++) for (let j = 15; j < 17; j++) tint(g, x + i, y + j, 0.45);
    box(g, x, y + 2, TILE, 13, '#3A1238');
    box(g, x, y + 3, TILE, 11, '#6A2A6A');
    box(g, x, y + 3, TILE, 4, '#8A3A8A');
    box(g, x, y + 3, TILE, 1, '#A85AA8');
    box(g, x, y + 7, TILE, 1, '#4A1A4A');
    // buttoned cushions
    for (let i = 4; i < TILE; i += 8) put(g, x + i, y + 5, '#4A1A4A');
    if (left) {
      box(g, x, y + 1, 4, 14, '#3A1238');
      box(g, x + 1, y + 2, 3, 12, '#5A205A');
      box(g, x + 1, y + 2, 1, 12, '#7A3A7A');
    }
    if (right) {
      box(g, x + 12, y + 1, 4, 14, '#3A1238');
      box(g, x + 12, y + 2, 3, 12, '#5A205A');
    }
    for (let i = 2; i < 14; i += 4) put(g, x + i, y + 14, DG.gold);
  },
  V(g, x, y) {
    // A winch lever and its chain.
    dropShadow(g, x + 8, y + 15, 5, 1, 0.55);
    box(g, x + 3, y + 10, 10, 6, '#1E1C22');
    box(g, x + 4, y + 11, 8, 4, DG.iron);
    box(g, x + 4, y + 11, 8, 1, DG.ironLight);
    box(g, x + 7, y + 3, 2, 9, DG.ironLight);
    put(g, x + 8, y + 4, DG.iron);
    ellipse(g, x + 8, y + 3, 2, 2, DG.rust);
    put(g, x + 7, y + 2, '#B87048');
    for (let j = 0; j < 3; j++) {
      box(g, x + 12, y + j * 2, 2, 1, DG.iron);
      put(g, x + 13, y + j * 2 + 1, DG.ironLight);
    }
  },
  Y(g, x, y, m) {
    // The Throne of a Hundred Challengers: a heap of tagged weapons, drawn once.
    if (m.at(-1, 0) === 'Y') return;
    for (let i = 0; i < 50; i++) for (let j = 14; j < 18; j++) tint(g, x + i, y + j, 0.5 - (j - 14) * 0.1);
    // the heap: a mound of dark iron, lit along its top
    for (let i = 0; i < 48; i++) {
      const top = 4 + Math.round(Math.abs(i - 24) / 6 + hash(x + i, y, 94) * 2);
      box(g, x + i, y + top, 1, 16 - top, '#1E1C22');
      box(g, x + i, y + top + 1, 1, 14 - top, DG.wallDark);
      put(g, x + i, y + top + 1, DG.iron);
    }
    for (let i = 0; i < 22; i++) {
      const bx = x + 2 + Math.floor(hash(x, i, 1) * 44);
      const by = y + Math.floor(hash(i, y, 2) * 10);
      const rust = i % 3 === 0;
      box(g, bx, by, 1, 7, rust ? DG.rust : DG.ironLight);
      put(g, bx + 1, by + 1, rust ? '#5A2E1A' : DG.iron);
      put(g, bx, by, rust ? '#B87048' : '#A8A8B8');
      if (i % 4 === 1) box(g, bx - 1, by + 5, 3, 1, DG.timber); // a crossguard
      if (i % 5 === 2) put(g, bx + 1, by + 3, P.paper); // a tag
    }
    // the seat, draped in a red banner
    box(g, x + 17, y + 5, 14, 11, '#1E1012');
    box(g, x + 18, y + 6, 12, 10, DG.banner);
    box(g, x + 18, y + 6, 12, 1, DG.gold);
    box(g, x + 28, y + 7, 2, 9, DG.bannerDark);
    box(g, x + 18, y + 6, 1, 10, '#8A2A2E');
  },
  m(g, x, y, m) {
    // Big Tova's bar: a long counter, sixty feet of it, and mugs that never spill.
    const l = m.at(-1, 0) !== 'm';
    const r = m.at(1, 0) !== 'm';
    for (let i = 0; i < TILE; i++) for (let j = 14; j < 16; j++) tint(g, x + i, y + j, 0.5 - (j - 14) * 0.2);
    box(g, x, y + 2, TILE, 12, '#20160E');
    box(g, x, y + 3, TILE, 4, '#7A5A3A');
    box(g, x, y + 3, TILE, 1, '#9A7A52');
    box(g, x, y + 7, TILE, 6, DG.timber);
    box(g, x, y + 7, TILE, 1, DG.timberDark);
    for (let i = 3; i < TILE; i += 8) box(g, x + i, y + 8, 1, 5, DG.timberDark);
    box(g, x, y + 12, TILE, 1, '#2E2014');
    if (l) box(g, x, y + 2, 1, 12, '#20160E');
    if (r) box(g, x + 15, y + 2, 1, 12, '#20160E');
    if (hash(x, y, 2) < 0.6) {
      box(g, x + 5, y, 4, 5, '#C8B070');
      box(g, x + 5, y, 1, 5, '#E8D090');
      box(g, x + 8, y, 1, 5, '#9A8448');
      box(g, x + 5, y, 4, 1, '#F4F0EA');
      box(g, x + 9, y + 1, 1, 3, '#C8B070');
    }
  },
  q(g, x, y) {
    // A barrel, iron-hooped, its staves lit on the left.
    dropShadow(g, x + 9, y + 15, 6, 1, 0.6);
    ellipse(g, x + 8, y + 9, 6, 6, '#1E140C');
    ellipse(g, x + 8, y + 9, 5, 6, DG.timber);
    box(g, x + 4, y + 5, 2, 9, '#7A5A3C');
    box(g, x + 11, y + 5, 2, 9, DG.timberDark);
    box(g, x + 8, y + 4, 1, 10, DG.timberDark);
    box(g, x + 3, y + 6, 11, 1, DG.iron);
    box(g, x + 3, y + 12, 11, 1, DG.iron);
    put(g, x + 4, y + 6, DG.ironLight);
    put(g, x + 4, y + 12, DG.ironLight);
    ellipse(g, x + 8, y + 4, 4, 2, '#1E140C');
    ellipse(g, x + 8, y + 4, 3, 1, DG.timberDark);
  },
  i(g, x, y, m) {
    // The last block of ice from the wastes, drawn once across its 2x2 tiles.
    if (m.at(-1, 0) === 'i' || m.at(0, -1) === 'i') return;
    dropShadow(g, x + 17, y + 27, 14, 3, 0.55);
    box(g, x + 4, y + 3, 24, 25, '#3A5A78');
    box(g, x + 5, y + 4, 22, 23, '#A8D0E8');
    box(g, x + 5, y + 4, 22, 3, '#E0F0FA');
    box(g, x + 5, y + 4, 2, 23, '#C8E4F4');
    box(g, x + 22, y + 7, 5, 20, '#7AA8C8');
    box(g, x + 8, y + 9, 2, 14, '#F4FAFF');
    put(g, x + 11, y + 10, '#F4FAFF');
    // cracks and trapped bubbles
    for (const [i, j] of [[14, 12], [15, 13], [15, 14], [16, 15], [18, 20], [12, 22]]) put(g, x + i, y + j, '#7AA8C8');
    for (const [i, j] of [[19, 10], [13, 18], [17, 23]]) put(g, x + i, y + j, '#E0F0FA');
    // meltwater round the foot
    for (let i = 3; i < 30; i++) if (hash(x + i, y, 95) < 0.5) put(g, x + i, y + 28, '#5A7A96');
  },
  u(g, x, y) {
    // A war drum: hide stretched over a barrel, painted in three stripes.
    dropShadow(g, x + 9, y + 15, 6, 1, 0.6);
    ellipse(g, x + 8, y + 10, 7, 5, '#2A0A0C');
    ellipse(g, x + 8, y + 10, 6, 5, '#6A1216');
    box(g, x + 3, y + 8, 2, 6, '#8A2A2A');
    box(g, x + 2, y + 8, 13, 1, '#E8E0D0');
    box(g, x + 2, y + 11, 13, 1, '#E8E0D0');
    for (let i = 3; i < 14; i += 3) put(g, x + i, y + 9, '#C8B890');
    ellipse(g, x + 8, y + 5, 6, 3, '#8A7A58');
    ellipse(g, x + 8, y + 5, 5, 2, '#D8C8A0');
    put(g, x + 6, y + 4, '#F0E4C0');
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
    dropShadow(g, x + 9, y + 15, 6, 1, 0.6);
    box(g, x + 3, y + 11, 10, 5, KS.o);
    box(g, x + 4, y + 12, 8, 3, KS.m);
    box(g, x + 4, y + 12, 8, 1, KS.l);
    box(g, x + 10, y + 13, 2, 2, KS.d);
    box(g, x + 7, y + 13, 2, 1, KS.b);
    // the little king: robe, arms folded, crown, lit from the left
    box(g, x + 5, y + 4, 6, 8, KS.o);
    box(g, x + 6, y + 5, 4, 6, KS.m);
    box(g, x + 6, y + 5, 1, 6, KS.l);
    box(g, x + 9, y + 5, 1, 6, KS.d);
    box(g, x + 6, y + 7, 4, 1, KS.d);
    ellipse(g, x + 8, y + 3, 2, 2, KS.o);
    box(g, x + 7, y + 2, 2, 2, KS.l);
    put(g, x + 7, y + 2, KS.h);
    box(g, x + 6, y, 5, 1, DG.gold);
    put(g, x + 6, y - 1, DG.gold);
    put(g, x + 8, y - 1, '#F0C860');
    put(g, x + 10, y - 1, DG.gold);
  },
  l(g, x, y, m) {
    // The training yard's wall, and a straw dummy leaning on it with Kaldor's face painted on, much hit.
    DUNGEON_ART.W(g, x, y, m);
    for (let j = 3; j < 16; j++) tint(g, x + 12, y + j, 0.4);
    box(g, x + 7, y + 6, 2, 10, DG.timber);
    put(g, x + 7, y + 7, '#7A5A3C');
    box(g, x + 4, y + 7, 9, 2, DG.timber);
    ellipse(g, x + 8, y + 9, 4, 4, '#6A5428');
    ellipse(g, x + 8, y + 9, 3, 3, DG.straw);
    put(g, x + 6, y + 8, '#C8B060');
    box(g, x + 5, y + 10, 6, 1, DG.timberDark);
    // the head, the face daubed on: the beard, two scowling eyes, a gold crown, a patch where it's been punched
    ellipse(g, x + 8, y + 3, 3, 3, '#6A5428');
    ellipse(g, x + 8, y + 3, 2, 2, '#D8B890');
    box(g, x + 7, y + 5, 3, 1, '#8A4A2A');
    put(g, x + 7, y + 3, '#2A1A10');
    put(g, x + 9, y + 3, '#2A1A10');
    box(g, x + 6, y, 5, 1, DG.gold);
    put(g, x + 6, y - 1, DG.gold);
    put(g, x + 10, y - 1, DG.gold);
    put(g, x + 10, y + 2, DG.straw);
    put(g, x + 11, y + 3, DG.straw);
  },
  k(g, x, y) {
    // A candle on an iron stand: rest here.
    dropShadow(g, x + 8, y + 15, 4, 1, 0.5);
    box(g, x + 7, y + 7, 2, 9, P.iron);
    put(g, x + 7, y + 8, '#4A4048');
    box(g, x + 5, y + 14, 6, 2, P.iron);
    box(g, x + 5, y + 14, 6, 1, '#4A4048');
    box(g, x + 5, y + 7, 6, 1, P.iron);
    box(g, x + 7, y + 3, 2, 4, P.wax);
    put(g, x + 8, y + 4, '#D8CCB8');
    put(g, x + 9, y + 6, P.wax);
    put(g, x + 7, y + 2, P.flame);
    put(g, x + 8, y + 1, P.flame2);
    put(g, x + 7, y + 1, '#FFF4C8');
  },
};

// The old mine's tiles (mine-art.mjs).
Object.assign(DUNGEON_ART, mineArt({ box, put, ellipse, hash, wall: (g, x, y, m) => DUNGEON_ART.W(g, x, y, m) }));

// Kaldor's castle (castle-art.mjs): the castle, moat, pikes and guard post outside; pillars, carpet,
// half-stairs, galleries, the winding stair and the king's floor's furniture inside. New letters only.
{
  const castle = castleArt({ box, put, ellipse, hash, tint, wall: (g, x, y, m) => DUNGEON_ART.W(g, x, y, m) });
  for (const [set, into] of [
    [castle.outdoor, OUTDOOR_ART],
    [castle.inside, DUNGEON_ART],
  ])
    for (const [k, v] of Object.entries(set)) {
      if (into[k]) throw new Error(`castle-art: "${k}" is already drawn`);
      into[k] = v;
    }
}

// A few things for the small rooms off the Kaldari drill yard and the Frost Ward, which stood nearly empty.
const SMALL_ROOMS = {
  a(g, x, y, m) {
    // The Fury Hall's war banner: red, two pale stripes like the drums', ragged at the foot, its shadow on the stone.
    DUNGEON_ART.W(g, x, y, m);
    for (let j = 2; j < 16; j++) tint(g, x + 14, y + j, 0.45);
    box(g, x + 1, y, 14, 1, '#1E1C22');
    box(g, x + 2, y, 12, 1, DG.iron);
    put(g, x + 2, y, DG.ironLight);
    const foot = (i) => 12 + Math.floor(hash(x + i, y, 120) * 3);
    for (let i = 2; i < 14; i++) {
      const f = foot(i);
      box(g, x + i, y + 1, 1, f, i === 2 || i === 13 ? '#2A0A0C' : '#8A1A1A');
      put(g, x + i, y + 1 + f, '#2A0A0C');
    }
    box(g, x + 3, y + 1, 1, 11, '#B03030');
    box(g, x + 11, y + 1, 2, 11, '#5A0E10');
    for (const sy of [4, 8]) {
      box(g, x + 3, y + sy, 10, 1, '#E8E0D0');
      box(g, x + 11, y + sy, 2, 1, '#B8B0A0');
    }
    // a red hand, pressed on in the middle of it all
    box(g, x + 6, y + 9, 3, 2, '#C8282A');
    for (const i of [6, 7, 8]) put(g, x + i, y + 6 + (i === 7 ? 0 : 1), '#C8282A');
    put(g, x + 9, y + 8, '#C8282A');
  },
  e(g, x, y) {
    // A wooden bucket of water, iron-hooped, staves lit on the left, a ladle in it.
    dropShadow(g, x + 9, y + 15, 6, 1, 0.6);
    for (let j = 0; j < 8; j++) {
      const hw = 5 - Math.floor(j / 3);
      const py = y + 7 + j;
      box(g, x + 8 - hw - 1, py, hw * 2 + 3, 1, '#1E140C');
      box(g, x + 8 - hw, py, hw * 2 + 1, 1, DG.timber);
      put(g, x + 8 - hw, py, '#8A6A48');
      put(g, x + 8 - hw + 1, py, '#7A5A3C');
      box(g, x + 8 + hw - 1, py, 2, 1, DG.timberDark);
      for (let i = -hw + 3; i < hw; i += 3) put(g, x + 8 + i, py, '#4E3622');
    }
    box(g, x + 2, y + 15, 13, 1, '#1E140C');
    for (const hy of [9, 13]) {
      box(g, x + 2, y + hy, 13, 1, DG.iron);
      put(g, x + 3, y + hy, DG.ironLight);
    }
    ellipse(g, x + 8, y + 7, 6, 2, '#1E140C');
    ellipse(g, x + 8, y + 7, 5, 1, '#5A3E28');
    box(g, x + 4, y + 7, 9, 1, '#2A5A7A');
    box(g, x + 5, y + 7, 3, 1, '#6AA0C0');
    // the ladle, leaning on the rim
    for (let k = 0; k < 6; k++) put(g, x + 10 + Math.floor(k * 0.7), y + 6 - k, k < 5 ? '#9A7A52' : '#C8A070');
    put(g, x + 11, y + 6, '#6A4C32');
  },
  s(g, x, y) {
    // Sacks of sawdust for packing round the ice, slumped together, a little of it spilt.
    dropShadow(g, x + 9, y + 15, 7, 2, 0.6);
    for (const [cx, cy, rx, ry] of [
      [5, 10, 4, 5],
      [11, 11, 4, 4],
    ]) {
      ellipse(g, x + cx, y + cy, rx + 1, ry + 1, '#2A2014');
      ellipse(g, x + cx, y + cy, rx, ry, '#8A7448');
      ellipse(g, x + cx - 1, y + cy - 1, rx - 1, ry - 2, '#A89060');
      put(g, x + cx - rx + 1, y + cy - 2, '#C8B078');
      box(g, x + cx + rx - 1, y + cy - 1, 1, 3, '#5A4A2A');
      // the tied neck
      box(g, x + cx - 1, y + cy - ry - 2, 3, 2, '#6A5A34');
      put(g, x + cx, y + cy - ry - 3, '#A89060');
      box(g, x + cx - 1, y + cy - ry, 3, 1, '#4A3A20');
    }
    for (let k = 0; k < 7; k++) put(g, x + 2 + Math.floor(hash(x, y, k + 121) * 13), y + 14 + Math.floor(hash(y, x, k + 121) * 2), '#C8A870');
  },
  X(g, x, y, m) {
    // Ice tongs and a saw on hooks, polished, never used.
    DUNGEON_ART.W(g, x, y, m);
    for (const hx of [4, 11]) {
      put(g, x + hx, y + 1, DG.ironLight);
      put(g, x + hx, y + 2, DG.iron);
    }
    // the tongs: two arms crossed at a rivet, their points curled in, outlined, a shadow to the right
    const arm = (k, dir) => [x + (dir > 0 ? 3 : 7) + dir * Math.floor(k / 2), y + 3 + k];
    for (let k = 0; k < 10; k++)
      for (const dir of [1, -1]) {
        const [ax, ay] = arm(k, dir);
        tint(g, ax + 2, ay + 1, 0.45);
        put(g, ax - 1, ay, '#1E1C22');
        put(g, ax + 1, ay, '#1E1C22');
      }
    for (let k = 0; k < 10; k++)
      for (const dir of [1, -1]) {
        const [ax, ay] = arm(k, dir);
        put(g, ax, ay, dir > 0 ? (k < 5 ? '#D8D8E4' : '#9A9AAA') : '#7A7A8A');
      }
    put(g, x + 5, y + 7, '#E8C860');
    put(g, x + 2, y + 13, '#1E1C22');
    put(g, x + 8, y + 13, '#1E1C22');
    // the saw: a long blade, teeth along its edge, a wooden grip at the top, outlined
    for (let j = 3; j < 15; j++) tint(g, x + 14, y + j, 0.45);
    box(g, x + 9, y + 1, 5, 14, '#1E1C22');
    box(g, x + 10, y + 2, 3, 3, DG.timber);
    box(g, x + 10, y + 2, 1, 3, '#9A7A52');
    box(g, x + 10, y + 5, 3, 9, '#9A9AAA');
    box(g, x + 10, y + 5, 1, 9, '#E8E8F4');
    for (let j = 6; j < 14; j += 2) put(g, x + 13, y + j, '#9A9AAA');
  },
  g(g, x, y, m) {
    // The Stitchery's chart: DAYS SINCE ANYONE FAINTED, the number rubbed out and written again, many times.
    DUNGEON_ART.W(g, x, y, m);
    box(g, x + 3, y + 2, 12, 12, '#1E1A18');
    box(g, x + 2, y + 1, 12, 12, P.paper);
    box(g, x + 2, y + 1, 12, 1, '#FFF6DC');
    box(g, x + 13, y + 2, 1, 11, '#C8B890');
    box(g, x + 3, y + 3, 10, 1, '#8A7A60');
    box(g, x + 4, y + 5, 8, 6, '#D8CCAE');
    for (let k = 0; k < 10; k++) put(g, x + 4 + Math.floor(hash(x, y, k + 122) * 8), y + 5 + Math.floor(hash(y, x, k + 122) * 6), '#B8AC90');
    // today's number: nought, in red
    box(g, x + 7, y + 6, 2, 1, '#B3261E');
    box(g, x + 7, y + 9, 2, 1, '#B3261E');
    box(g, x + 6, y + 7, 1, 2, '#B3261E');
    box(g, x + 9, y + 7, 1, 2, '#B3261E');
    put(g, x + 8, y + 1, DG.iron);
  },
};
for (const [k, v] of Object.entries(SMALL_ROOMS)) {
  if (DUNGEON_ART[k]) throw new Error(`small rooms: "${k}" is already drawn`);
  DUNGEON_ART[k] = v;
}

// The Cull Road (author, Oct 7, 2026): a fast brown river, the ferry-bridge sunk in it on its chains,
// two plates in the bank, the deserters' palisade with its gate smashed in, reeds, milestones and a
// child's shoe. Named keys (the map's `art` points its letters at them), so no letter is taken.
{
  const RIVER = ['#5A4E3A', '#544834', '#605440'];
  const isWater = (c) => c === '~' || c === '=';
  const river = (g, x, y, m) => {
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        let c = RIVER[Math.floor(hash(Math.floor((x + i) / 4), Math.floor((y + j) / 6), 91) * 3)];
        // streaks running downstream (south), fast
        if ((x + i * 3 + (y + j)) % 19 === 0 || hash(x + i, Math.floor((y + j) / 4), 92) < 0.03) c = '#8A7C60';
        put(g, x + i, y + j, c);
      }
    // muddy banks
    if (!isWater(m.at(-1, 0))) {
      box(g, x, y, 3, TILE, O.soilDark);
      box(g, x + 3, y, 1, TILE, '#3A3024');
    }
    if (!isWater(m.at(1, 0))) {
      box(g, x + 13, y, 3, TILE, O.soilDark);
      box(g, x + 12, y, 1, TILE, '#3A3024');
    }
  };
  Object.assign(OUTDOOR_ART, {
    'cull-river': river,
    'cull-ferry'(g, x, y, m) {
      // The ferry-bridge, sunk just under the water: dim planks, and the broken pilings sticking up.
      river(g, x, y, m);
      for (let i = 1; i < TILE; i += 4) box(g, x + i, y + 1, 2, 14, '#4A3E2C');
      if (m.at(0, -1) !== '=') {
        box(g, x + 6, y, 3, 4, O.trunkDark);
        box(g, x + 6, y, 3, 1, O.trunk);
      }
      if (m.at(0, 1) !== '=') {
        box(g, x + 6, y + 12, 3, 4, O.trunkDark);
        box(g, x + 6, y + 12, 3, 1, O.trunk);
      }
      // a chain, slack, running back to the bank
      if (m.at(-1, 0) !== '=') for (let i = 0; i < 6; i += 2) put(g, x + i, y + 7 + (i % 4 ? 1 : 0), '#7A7A80');
    },
    'cull-plate'(g, x, y) {
      // An iron plate set in the mud, a chain running off it to the river.
      box(g, x + 1, y + 2, 14, 12, O.soilDark);
      box(g, x + 3, y + 4, 10, 8, '#4A4A50');
      box(g, x + 3, y + 4, 10, 1, '#6A6A72');
      box(g, x + 7, y + 7, 2, 2, '#2A2A30');
      for (let i = 13; i < TILE; i += 2) put(g, x + i, y + 8, '#7A7A80');
    },
    'cull-palisade'(g, x, y) {
      // Sharpened stakes, side by side, lashed to a crossbeam.
      for (let i = 1; i < TILE; i += 5) {
        box(g, x + i, y + 3, 4, 13, O.trunk);
        box(g, x + i + 3, y + 3, 1, 13, O.trunkDark);
        box(g, x + i + 1, y + 1, 2, 2, O.trunk);
        put(g, x + i + 1, y, O.rail);
      }
      box(g, x, y + 8, TILE, 2, O.trunkDark);
    },
    'cull-gatepost'(g, x, y, m) {
      // A thick gatepost, and the gate hanging off it by one hinge, its planks splintered.
      box(g, x + 5, y, 6, TILE, O.trunk);
      box(g, x + 10, y, 1, TILE, O.trunkDark);
      box(g, x + 6, y, 4, 1, O.rail);
      const down = m.at(0, 1) === ',';
      for (let k = 0; k < 4; k++) box(g, x + 1 + k * 3, down ? y + 10 + k : y + 2 + k, 2, 5, '#6A5034');
    },
    'cull-reeds'(g, x, y) {
      for (let i = 0; i < 9; i++) {
        const bx = x + 1 + Math.floor(hash(x, y, i + 60) * 14);
        const h = 8 + Math.floor(hash(x, y, i + 61) * 6);
        box(g, bx, y + 15 - h, 1, h, i % 3 ? O.blade : '#A8904A');
        if (i % 3 === 0) box(g, bx, y + 15 - h, 1, 3, '#6A4A2A');
      }
    },
    'cull-milestone'(g, x, y) {
      // A squat milestone, rounded on top, with a line of small carving.
      ellipse(g, x + 8, y + 14, 6, 2, O.grassDark);
      box(g, x + 4, y + 5, 8, 10, O.stone);
      ellipse(g, x + 8, y + 5, 4, 3, O.stone);
      box(g, x + 4, y + 5, 2, 10, O.stoneLight);
      box(g, x + 6, y + 7, 4, 1, O.stoneDark);
      box(g, x + 6, y + 10, 3, 1, O.stoneDark);
      box(g, x + 6, y + 12, 4, 1, O.stoneDark);
    },
    'cull-shoe'(g, x, y) {
      // One small shoe, laces still tied.
      box(g, x + 4, y + 10, 8, 3, '#6A4428');
      box(g, x + 4, y + 8, 4, 2, '#6A4428');
      box(g, x + 4, y + 13, 9, 1, O.trunkDark);
      put(g, x + 6, y + 8, '#E8E0D0');
      put(g, x + 7, y + 9, '#E8E0D0');
    },
  });
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

/**
 * The Kaloseum from the inside (author, Oct 6, 2026: "look at the arena outside looking in"): the same great oval
 * as Warrior City shows from without. Sand in the middle, a low stone wall round it, grey tiers climbing away
 * packed with the crowd, the Crown's red banners with the gold fist along the top, the great gate at the bottom,
 * open to the sky. The sand's oval sits just inside the walkable tiles (`.` and `,`); everything else is the stands.
 */
function drawArena(map, cheer = false) {
  const rows = map.tiles;
  const H = rows.length;
  const W = rows[0].length;
  const g = canvas(W * TILE, H * TILE);
  const at = (tx, ty) => rows[ty]?.[tx] ?? 'T';
  // the oval of sand, in art pixels: as wide and tall as the walkable tiles reach along its middle
  // (measured from the sand's edge, `,`: a spot of floor inside the commentator's box doesn't count)
  const mid = rows[Math.floor(H / 2)];
  const left = [...mid].findIndex((c) => c === ',');
  const right = mid.length - [...mid].reverse().findIndex((c) => c === ',');
  // (top and bottom across the middle dozen columns: the commentator's desk sits right on the middle one)
  const band = (r) => r.slice(Math.floor(W / 2) - 6, Math.floor(W / 2) + 6).includes(',');
  const top = rows.findIndex(band);
  const bottom = rows.length - [...rows].reverse().findIndex(band);
  const cx = ((left + right) / 2) * TILE;
  const cy = ((top + bottom) / 2) * TILE;
  const rx = ((right - left) / 2) * TILE - 2;
  const ry = ((bottom - top) / 2) * TILE - 2;
  const SAND = hex('#C8A870');
  const TIER = 11;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const e = Math.sqrt(dx * dx + dy * dy);
      if (e <= 1) {
        // sand, raked, with darker and lighter grains
        let c = SAND;
        const h = hash(x, y, 51);
        if (h < 0.08) c = hex('#B8985E');
        else if (h > 0.94) c = hex('#D8B880');
        // the wall's shadow falls on the sand along the far (top) side
        if (dy < -0.2 && e > 0.93) c = mix(c, hex('#5A4A30'), dither(0.4 * Math.min(1, (-dy - 0.2) / 0.5), x, y));
        g[y][x] = c;
        continue;
      }
      // out from the sand: the arena wall, then the tiers (a pixel's way out, measured up and down)
      const out = (e - 1) * ry;
      if (out < 2) {
        g[y][x] = hex('#9A928E');
        continue;
      }
      // the far side shows the wall's face, the near side only its top
      if (dy < 0 && out < 9) {
        const course = Math.floor(out) % 3 === 0;
        g[y][x] = course ? hex('#5A5250') : (Math.floor(x / 7) + Math.floor(out / 3)) % 2 ? hex('#7A7270') : hex('#726A66');
        continue;
      }
      if (out < 4) {
        g[y][x] = hex('#5A5250');
        continue;
      }
      // the tiers: stone benches, a lit edge on each (the people go on afterwards)
      const step = (out - 4) % TIER;
      const tier = Math.floor((out - 4) / TIER);
      g[y][x] = step < 1 ? hex('#8A8280') : step > TIER - 3 ? hex('#4E4846') : tier % 2 ? hex('#726A66') : hex('#625A56');
    }
  // The Crown's banners along the top of the stands (not over the commentator's box), worked out first so nobody
  // in the crowd sits behind one
  const HALF = 0.2; // the commentator's box: a wedge of the ring either side of the top of the oval (radians)
  const inWedge = (x, y, margin = 0) => {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    return dy < 0 && Math.abs(Math.atan2(dy, dx) + Math.PI / 2) <= HALF + margin;
  };
  const hasBooth = rows.some((r) => r.includes('$'));
  const banners = [];
  for (let k = 0; k < 7; k++) {
    const bx = Math.round(cx - rx + ((k + 0.5) / 7) * rx * 2);
    const ey = Math.sqrt(Math.max(0, 1 - ((bx - cx) / (rx + 60)) ** 2));
    const by = Math.max(2, Math.round(cy - (ry + 60) * ey));
    if (hasBooth && (inWedge(bx, by + 6, 0.04) || inWedge(bx + 9, by + 6, 0.04))) continue;
    banners.push([bx, by]);
  }
  const gateTiles = [];
  rows.forEach((r, ty) => [...r].forEach((c, tx) => c === '1' && gateTiles.push([tx, ty])));
  const gateBox = gateTiles.length
    ? [
        Math.min(...gateTiles.map(([tx]) => tx)) * TILE - 6,
        gateTiles[0][1] * TILE - 10,
        gateTiles.length * TILE + 12,
        TILE + 16,
      ]
    : null;
  const inside = (x, y, [bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh;

  // The crowd (author, Oct 6, 2026): small pixel people, scenery in the stands, far off behind the action on the
  // sand; outlined like the walkers, hair, a face with two eyes, shoulders in a shirt (all hair from behind), arms up
  // when they cheer. Nobody touches anybody else, or the arena wall, a banner, the commentator's box, the gate or the
  // edge of the picture: each seat is checked clear at full cheering height, and anyone who wouldn't fit isn't there.
  const PEOPLE = ['#B04030', '#C8963A', '#4A6AA0', '#E0D4B8', '#3A5A2C', '#7A4A8A'].map(hex);
  const SKINS = ['#E8B48C', '#C8956C', '#8A5A3A', '#F0C8A0'].map(hex);
  const HAIR = ['#2A1A12', '#6A4028', '#C8A040', '#1A1416', '#8A8A7A', '#A0482A'].map(hex);
  const PW = 7; // a spectator's width
  const SEATED = 8; // and height, sitting
  const HOP = 1; // how far up they come when they cheer
  const taken = new Uint8Array(g.w * g.h);
  const clear = (x, y, side) => {
    if (x < 0 || y < 0 || x >= g.w || y >= g.h || taken[y * g.w + x]) return false;
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    const out = (Math.sqrt(dx * dx + dy * dy) - 1) * ry;
    // in the stands, past the arena wall (its face is taller on the far side)
    if (out < (side < 0 ? 10 : 5)) return false;
    if (hasBooth && inWedge(x, y, 0.03)) return false;
    if (banners.some(([bx, by]) => inside(x, y, [bx - 1, by - 1, 11, 21]))) return false;
    if (gateBox && inside(x, y, gateBox)) return false;
    return true;
  };
  const spectator = (px, py, seed, back) => {
    const top = py - SEATED - HOP;
    // (outline to outline is fine; over each other isn't)
    for (let j = top; j <= py; j++) for (let i = px; i < px + PW; i++) if (!clear(i, j, back ? 1 : -1)) return;
    for (let j = top; j <= py; j++) for (let i = px; i < px + PW; i++) taken[j * g.w + i] = 1;
    const shirt = PEOPLE[Math.floor(hash(seed, 1, 71) * PEOPLE.length)];
    const shade = mix(shirt, hex('#000000'), 0.3);
    const skin = SKINS[Math.floor(hash(seed, 2, 71) * SKINS.length)];
    const hair = HAIR[Math.floor(hash(seed, 3, 71) * HAIR.length)];
    const up = cheer && hash(seed, 4, 71) < 0.7;
    const y = py - SEATED - (up && hash(seed, 5, 71) < 0.5 ? HOP : 0);
    const rows = up
      ? ['O.OOO.O', 'KOHHHOK', 'BOSSSOB', 'BOESEOB', '.OSSSO.', 'OBBBBBO', 'ODBBBDO', '.ODBDO.']
      : ['..OOO..', '.OHHHO.', '.OSSSO.', '.OESEO.', '.OSSSO.', 'OBBBBBO', 'ODBBBDO', '.ODBDO.'];
    const colour = { O: OUT, H: hair, S: back ? hair : skin, E: back ? hair : OUT, B: shirt, D: shade, K: skin };
    rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== '.') put(g, px + i, y + j, colour[ch]);
      }),
    );
  };
  // along the benches, front rows first, so the people nearest the sand are the ones always there
  for (const side of [-1, 1])
    for (let tier = 0; tier < 40; tier++)
      for (let x0 = -PW; x0 < g.w; x0 += PW) {
        const out = 4 + tier * TIER + TIER - 2 + (side > 0 ? SEATED - 2 : 0);
        const e = 1 + out / ry;
        const px = x0 + (tier % 2) * 3;
        const dx = (px + PW / 2 - cx) / rx;
        if (Math.abs(dx) >= e) continue;
        const py = Math.round(cy + side * Math.sqrt(e * e - dx * dx) * ry);
        const seed = x0 * 131 + tier * 7 + (side > 0 ? 3 : 0);
        if (hash(seed, 0, 73) < 0.1) continue; // an empty seat
        spectator(px, py, seed, side > 0);
      }
  // then anywhere else there's room (the ends of the oval, where the benches run up and down)
  for (let py = SEATED + HOP; py < g.h; py += SEATED + HOP + 2)
    for (let px = 0; px + PW <= g.w; px += PW) {
      const seed = py * 137 + px * 11;
      if (hash(seed, 0, 85) < 0.1) continue;
      spectator(px, py, seed, py > cy);
    }
  for (const [bx, by] of banners) {
    box(g, bx, by, 1, 18, '#3A2618');
    box(g, bx + 1, by, 8, 11, '#9A2A22');
    box(g, bx + 1, by + 11, 3, 2, '#9A2A22');
    box(g, bx + 6, by + 11, 3, 2, '#9A2A22');
    box(g, bx + 4, by + 3, 2, 3, '#C8963A');
    box(g, bx + 3, by + 4, 4, 2, '#C8963A');
  }
  // the great gate at the bottom, over its tiles: a dark arch, shut, the portcullis down across it (author, Oct 6, 2026:
  // "make the exit blocked by bars and a gate")
  if (gateTiles.length) {
    const gx = Math.min(...gateTiles.map(([tx]) => tx)) * TILE - 2;
    const gw = gateTiles.length * TILE + 4;
    const gy = gateTiles[0][1] * TILE - 6;
    box(g, gx - 3, gy - 3, gw + 6, TILE + 9, '#8A8280');
    box(g, gx, gy, gw, TILE + 6, '#1E1816');
    ellipse(g, gx + gw / 2, gy, gw / 2, 4, '#1E1816');
    // timber doors behind, then the iron grid in front, spikes at its foot
    for (let x = gx + 1; x < gx + gw - 1; x++) box(g, x, gy + 2, 1, TILE + 3, x % 4 === 0 ? '#3A2618' : '#5C3A28');
    for (let x = gx + 2; x < gx + gw - 1; x += 4) {
      box(g, x, gy - 3, 2, TILE + 9, '#4A4442');
      put(g, x, gy - 3, '#7A7470');
      put(g, x, gy + TILE + 6, '#2A2422');
    }
    for (let y = gy + 1; y < gy + TILE + 5; y += 5) box(g, gx, y, gw, 1, '#4A4442');
  }
  // the commentator's box, part of the Kaloseum's own ring and down at the level of the sand (author, Oct 6, 2026:
  // the crowd is scenery, far off, and a character among them looks like a giant; Barnaby stands where everyone else
  // stands). A wedge of the ring at the head of the sand, following the same oval as the tiers: the box opens in the
  // arena wall at ground level, dark under a red curtain and an arch, solid stone above it to the top of the stands
  // so no spectator sits beside him; his desk is a low stone wall on the edge of the sand in front of it.
  if (hasBooth) {
    const OPEN = 0.13; // the box's opening, within the wedge
    const STONE = (px, py) => {
      const course = py % 5 === 0 || (px + (Math.floor(py / 5) % 2) * 4) % 9 === 0;
      return course ? hex('#5A5250') : (Math.floor(px / 9) + Math.floor(py / 5)) % 2 ? hex('#7A7270') : hex('#726A66');
    };
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const e = Math.sqrt(dx * dx + dy * dy);
        if (e <= 1 || dy >= 0) continue;
        const off = Math.abs(Math.atan2(dy, dx) + Math.PI / 2);
        if (off > HALF) continue;
        const out = (e - 1) * ry;
        if (out < 2 && off >= OPEN) continue;
        let c = STONE(x, y);
        // the wedge's edges, where the tiers meet it: radial pilasters, lit on the left, shaded on the right
        if (off > HALF - 0.025) c = dx < 0 ? mix(c, hex('#FFFFFF'), 0.15) : hex('#4E4846');
        else if (off < OPEN && out < 32) {
          // the box, opening right onto the sand: dark, darker at the back, the red curtain swagged across its top
          // and hanging down its sides
          c = out > 20 ? hex('#2A2422') : hex('#3A3432');
          const swag = 27 - Math.round(3 * Math.sin((off / OPEN) * Math.PI * 1.5) ** 2);
          if (out >= swag) c = hex('#7A1E18');
          if (Math.round(out) === swag) c = hex('#C8963A');
          if (off > OPEN - 0.02) c = hex('#7A1E18');
        } else if (off < OPEN + 0.02 && out < 36) {
          // the arch's stones, lit
          c = hex('#9A928E');
        }
        g[y][x] = c;
      }
    // two of the Crown's banners on top of the wedge
    for (const side of [-1, 1]) {
      const bx = Math.round(cx + side * Math.sin(HALF - 0.05) * (rx + 60));
      box(g, bx, 0, 1, 5, '#3A2618');
      box(g, bx + 1, 0, 7, 4, '#9A2A22');
    }
    // the desk: a low stone wall on the sand's edge, a lit coping, the Crown's cloth over it with the gold fist, his
    // speaking trumpet on top
    const desk = [];
    rows.forEach((r, ty) => [...r].forEach((c, tx) => c === '+' && desk.push([tx, ty])));
    const dx0 = Math.min(...desk.map(([tx]) => tx)) * TILE - 6;
    const dx1 = (Math.max(...desk.map(([tx]) => tx)) + 1) * TILE + 6;
    const dy0 = desk[0][1] * TILE + 1;
    for (let y = dy0; y < dy0 + 12; y++) for (let x = dx0; x < dx1; x++) put(g, x, y, STONE(x, y));
    box(g, dx0, dy0, dx1 - dx0, 2, '#9A928E');
    box(g, dx0, dy0 + 12, dx1 - dx0, 1, '#4E4846');
    const mid = Math.round((dx0 + dx1) / 2);
    box(g, mid - 7, dy0 + 2, 14, 9, '#9A2A22');
    box(g, mid - 7, dy0 + 10, 14, 1, '#C8963A');
    box(g, mid - 1, dy0 + 4, 2, 3, '#C8963A');
    box(g, mid - 2, dy0 + 5, 4, 2, '#C8963A');
    box(g, dx1 - 14, dy0 - 1, 6, 1, '#C8963A');
    box(g, dx1 - 9, dy0 - 2, 2, 3, '#E0B040');
  }
  // what stands on the sand: the trapdoor down to the cells, the rack of clubs, the brazier
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const letter = map.art?.[at(tx, ty)] ?? at(tx, ty);
      if ('.,T1$+'.includes(at(tx, ty))) continue;
      const draw = DUNGEON_ART[letter];
      if (!draw) throw new Error(`No arena art for tile "${at(tx, ty)}" in ${map.id}`);
      // the ladder down goes through a trapdoor: a timber frame, open, dark below
      if (letter === 'H') {
        box(g, tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2, '#5C3A28');
        box(g, tx * TILE + 3, ty * TILE + 3, TILE - 6, TILE - 6, '#120C0A');
      }
      draw(g, tx * TILE, ty * TILE, { at: (dx, dy) => map.art?.[at(tx + dx, ty + dy)] ?? at(tx + dx, ty + dy) });
    }
  return g;
}

/**
 * Worn flagstones, laid in courses of uneven lengths: each stone its own shade, its upper-left edges catching
 * the light and its lower-right edges in shadow (lit from the upper left, like the castle), with the odd crack,
 * chip and stain. Worked out per pixel from where the stone falls, so it never seams between tiles.
 */
const FLAG_ROWS = new Map();
function flagstone(x, y) {
  const rowH = 8;
  const row = Math.floor(y / rowH);
  const jy = y % rowH;
  // where this course's joints fall: stones 7–13 pixels long, the course shifted so joints never line up
  if (!FLAG_ROWS.has(row)) {
    const cuts = [];
    let at = -Math.floor(hash(row, 0, 81) * 12);
    while (at < 4096) {
      cuts.push(at);
      at += 7 + Math.floor(hash(row, cuts.length, 82) * 7);
    }
    FLAG_ROWS.set(row, cuts);
  }
  const cuts = FLAG_ROWS.get(row);
  let k = 0;
  while (cuts[k + 1] <= x) k++;
  const ix = x - cuts[k];
  const w = cuts[k + 1] - cuts[k];
  if (ix === 0 || jy === 0) return hex(DG.floorLine);
  const h = hash(k, row, 83);
  let c = hex(DG.floor[Math.floor(h * 3)]);
  // a few stones a shade lighter or darker than the rest
  if (h > 0.86) c = mix(c, hex('#4A4440'), 0.35);
  else if (h < 0.1) c = mix(c, hex('#262220'), 0.35);
  // the bevel: lit top and left, shaded bottom and right
  if (jy === 1 || ix === 1) c = mix(c, hex('#4A4440'), 0.3);
  else if (jy === rowH - 1 || ix === w - 1) c = mix(c, hex('#1E1A18'), 0.3);
  else {
    const n = hash(x, y, 84);
    if (n < 0.05) c = mix(c, hex(DG.floorLine), 0.6);
    else if (n > 0.97) c = mix(c, hex('#5A524C'), 0.5);
    // a crack across one stone in a dozen
    if (hash(k, row, 85) < 0.06 && jy - 2 === Math.round((ix * 4) / w) && ix > 1 && ix < w - 2)
      c = hex(DG.floorLine);
  }
  return c;
}

/** A training yard's floor: packed sand, raked in long rows, scuffed where the fighting is. */
function yardSand(x, y) {
  let c = hex('#8A6E4C');
  const h = hash(x, y, 120);
  if (h < 0.1) c = hex('#765C3E');
  else if (h > 0.94) c = hex('#A4865C');
  // the rake's lines, a little wobbly, and the scuffs across them
  if ((y + Math.round(Math.sin(x * 0.15 + Math.floor(y / 5)) * 0.8)) % 5 === 0) c = mix(c, hex('#5A4430'), 0.35);
  if (hash(Math.floor(x / 9), Math.floor(y / 7), 121) < 0.12) c = mix(c, hex('#6A5236'), 0.3);
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
      if (map.floor === 'yard') {
        g[y][x] = yardSand(x, y);
        continue;
      }
      g[y][x] = flagstone(x, y);
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
      if ((c === '.' || c === ',' || c === 'P' || c === 'v') && 'WBCcRGoEN#flaXg'.includes(map.art?.[at(tx, ty - 1)] ?? at(tx, ty - 1)))
        for (let j = 0; j < 5; j++)
          for (let i = 0; i < TILE; i++) {
            const px = tx * TILE + i;
            const py = ty * TILE + j;
            glow(g, px, py, 0.5 - j * 0.1, '#000000');
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
          if (d < 1) glow(g, x, y, 0.28 * (1 - d) ** 2, '#FFA040');
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
  // the statue at the Two Tunnels (author, Oct 4, 2026): grey stone, robed and bearded, and it talks
  statue: {
    robe: true,
    top: '#8A8A92',
    shade: '#6E6E78',
    boots: '#5E5E66',
    skin: '#A2A2AA',
    hair: ['bald', '#A2A2AA'],
    beard: '#7E7E88',
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
  // Barnaby Loudmouth, the Kaloseum's announcer (author, Oct 6, 2026: "a crowd announcer type"): a ringmaster's
  // red tailcoat with gold, a white collar, a big moustache, and a tall black top hat with a red band.
  barnaby: {
    top: '#B02A22',
    shade: '#8A1E18',
    legs: '#1E1A22',
    boots: '#140E14',
    belt: '#FFC940',
    collar: '#F4F0EA',
    hair: ['short', '#4A3A2A'],
    mustache: '#3A2418',
    hat: 'top',
    short: true,
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
  // Brannoc out cold on the Kaldorium's sand (author, Episode 13): eyes shut, a snot bubble (sleep.ts).
  brannocasleep: {
    top: '#9AA0B4',
    shade: '#6A7088',
    legs: '#6A7088',
    boots: '#5C3A28',
    belt: '#5C3A28',
    hair: ['short', '#C4442A'],
    sword: true,
    beard: '#C4442A',
    sleepy: true,
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
  // Old Mags, who tends the Mad King's roses at the deserters' camp: a grey veil, a moss-dark robe.
  mags: {
    robe: true,
    top: '#3E4A3A',
    shade: '#2E382C',
    boots: '#2A2420',
    skin: '#E0D0C0',
    hair: ['veil', '#B8B4AC'],
  },
  // Kingdom Town's keepers of the Lost Prince (author, Oct 7, 2026): Fitch, who loves the story;
  // Old Aske, who believes it; Old Orm, who watches the king take the young ones.
  fitch: { top: '#4E7A9A', shade: '#3A5E7A', legs: '#5A4A3A', boots: '#3A2A1A', hair: ['spiky', '#C87A3A'] },
  aske: { robe: true, top: '#7A5A6A', shade: '#5E4452', boots: '#3A2A20', hair: ['bun', '#F0ECE6'] },
  orm: {
    robe: true,
    top: '#5A6A5A',
    shade: '#445044',
    boots: '#3A2A20',
    hair: ['bald', '#D8B090'],
    beard: '#F0ECE6',
  },
  // The Long Mess's ghosts (author, Oct 7, 2026): pale and blue like the Chaplain's Echo. Two cooks in aprons, and
  // Corporal Hobb, who is at both ends of the table.
  // Each is see-through and trails off in a wisp where the feet should be (`ghost`); the cooks wear their toques.
  ghostcook: { ghost: true, hat: 'chef', hatColour: '#E8E8F8', top: '#9A9AC8', shade: '#7A7AA8', legs: '#6A6A98', boots: '#4A4A7A', skin: '#B8B8E0', hair: ['bald', '#B8B8E0'], apron: '#E0E0F4' },
  ghostcook2: { ghost: true, hat: 'chef', hatColour: '#E0E0F4', top: '#8A8ABA', shade: '#6A6A9A', legs: '#5A5A8A', boots: '#3A3A6A', skin: '#B0B0DC', hair: ['bun', '#9A9AC8'], apron: '#E0E0F4' },
  ghosthobb: { ghost: true, top: '#7A7AAA', shade: '#5A5A8A', legs: '#4A4A7A', boots: '#3A3A6A', belt: '#A8A8D8', skin: '#A8A8D4', hair: ['short', '#5A5A8A'] },
  // Out of the new cocoons (cocoons.ts, author, Oct 7, 2026). Their own walker ids, so the heroes themselves
  // don't become walkers in your party.
  irisnpc: { top: '#6A7A5A', shade: '#4E5A42', legs: '#4A4038', boots: '#2A2420', hair: ['short', '#3A2A20'], belt: '#B84A3A' },
  mothnpc: { robe: true, top: '#7A7A84', shade: '#5A5A64', boots: '#3A3A42', hair: ['hood', '#7A7A84'] },
  lyranpc: { top: '#3A5A7A', shade: '#2A445E', legs: '#5A4A3A', boots: '#3A2A1A', hair: ['bun', '#8A4A2A'], belt: '#C8963A' },
  wynnnpc: { top: '#C8A040', shade: '#A07E2A', legs: '#3A4A5A', boots: '#2A2A30', hair: ['spiky', '#6A6A78'] },
  oonanpc: { robe: true, top: '#2A2A48', shade: '#1E1E36', boots: '#1A1A2A', skin: '#E8D8C8', hair: ['veil', '#D8DCE8'] },
  // Silas Seen: a navy hood and robe, a pale face. Left the king on read.
  silasseen: {
    robe: true,
    top: '#2E3C50',
    shade: '#243040',
    boots: '#1A2230',
    skin: '#E8D8C8',
    hair: ['hood', '#2E3C50'],
  },
  // The Traveler (author, Oct 7, 2026): a tourist, everywhere you go. A loud yellow holiday shirt, khaki shorts, a
  // straw sun hat with a red band, round glasses.
  traveler: {
    top: '#F2C14E',
    shade: '#D8963A',
    legs: '#C8B07A',
    boots: '#6A4028',
    belt: '#6A4028',
    hair: ['short', '#7A4A2A'],
    hat: 'sun',
    glasses: true,
  },
  // Mattock, the gravedigger behind the chapel (author, Oct 7, 2026): earth-brown, a flat cap's worth of grey
  // hair, a spade in his hand. He fills the graves in every evening.
  mattock: {
    top: '#6A5A44',
    shade: '#4E4232',
    legs: '#3E3428',
    boots: '#2A1E14',
    belt: '#2A1E14',
    skin: '#D0A07C',
    hair: ['short', '#8A847C'],
    beard: '#8A847C',
    spade: true,
  },
  // A guard knocked out cold (author, Oct 8, 2026, Episode 14): a raider with little Xs for eyes.
  raiderko: {
    top: '#6A4A3A',
    shade: '#4A3228',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    skin: '#D8A880',
    hair: ['short', '#3A2418'],
    beard: '#3A2418',
    sword: true,
    ko: true,
  },
  // The Kaloseum's medics (author, Oct 8, 2026, Episode 14): tiny stretcher-bearers in white, a red cross on the chest
  // and on the cap, who run on and carry the knocked-out off on cots.
  medic: {
    top: '#F0ECE4',
    shade: '#C8C0B4',
    legs: '#E0D8CC',
    boots: '#4A3A2A',
    hair: ['short', '#6A4A2A'],
    cross: '#D0302A',
  },
};

// The walkers' light, as the castle's: from the upper left. Lit edges warm toward candlelight, shade cools toward
// dusk violet, so every palette gets the same three-step ramp without a hand-picked colour per character.
const WALKER_LIGHT = hex('#FFF2D0');
const WALKER_DUSK = hex('#1C1030');
const HAT_COLOURS = { wizard: '#8B5CF6', sun: '#E8D08A', top: '#1A161E' };
const lum = (c) => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
/** One step up the ramp: a modest sheen on dark colours (black hair stays black), more on mid and pale ones. */
const walkerLit = (c) => mix(c, WALKER_LIGHT, 0.2 + 0.12 * lum(c));
/** One step down (half a step for `k` = 0.5): darker and a touch violet, never melting into the outline. */
const walkerShade = (c, k = 1) => mix(c, WALKER_DUSK, (0.42 - 0.14 * (1 - lum(c))) * k);

/**
 * The shading pass over a flat walker frame. Only the spec's own colours (cloth, skin, hair, beard, apron...)
 * are shaded; eyes, blades, lanterns and other small details are left exactly as drawn, and a run of cloth
 * is measured straight across them (an eye doesn't split a face in two). In each run of one colour, the
 * leftmost pixel catches the light and the rightmost falls into shade; a one-pixel run (an arm seen from
 * the front, a hand) is lit or shaded by which side of the body it is on. Top edges on the lit half catch
 * the light too, so hair and shoulders get their highlight in the upper left.
 */
function shadeWalker(f, w) {
  const key = (c) => (c ? `${c[0]},${c[1]},${c[2]}` : '');
  const mats = new Set();
  const add = (c) => c && mats.add(key(hex(c)));
  for (const k of ['top', 'shade', 'legs', 'boots', 'belt', 'beard', 'apron', 'cloak', 'collar', 'mustache', 'villain'])
    add(w[k]);
  add(w.skin ?? SKIN);
  add(w.hair[1]);
  for (const c of w.patchwork ?? []) add(c);
  if (HAT_COLOURS[w.hat]) add(HAT_COLOURS[w.hat]);
  const at = (x, y) => (x >= 0 && y >= 0 && x < FW && y < FH ? f[y][x] : null);
  const mat = (c) => c && mats.has(key(c));
  // the first pixel that isn't a detail, stepping from (x, y) by dx
  const edge = (x, y, dx) => {
    let i = x + dx;
    while (at(i, y) && !mat(at(i, y))) i += dx;
    return at(i, y);
  };
  const out = f.map((r) => r.slice());
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      const c = f[y][x];
      if (!mat(c)) continue;
      const k = key(c);
      const lc = edge(x, y, -1);
      const rc = edge(x, y, 1);
      const leftEdge = key(lc) !== k;
      const rightEdge = key(rc) !== k;
      // the whole run this pixel belongs to, details included, to tell a sleeve from a chest
      let a = x;
      let b = x;
      if (!leftEdge) while (at(a - 1, y) && (key(at(a - 1, y)) === k || !mat(at(a - 1, y)))) a--;
      if (!rightEdge) while (at(b + 1, y) && (key(at(b + 1, y)) === k || !mat(at(b + 1, y)))) b++;
      const width = b - a + 1;
      // the middle of the figure on this row, so an edge in the shaded half is never lit (and vice versa)
      let sa = 0;
      let sb = FW - 1;
      while (sa < FW && !f[y][sa]) sa++;
      while (sb >= 0 && !f[y][sb]) sb--;
      const mid = (sa + sb) / 2;
      const darker = (n) => !n || !mat(n) || lum(n) < lum(c) - 0.04;
      const above = at(x, y - 1);
      const topEdge = key(above) !== k && (!above || mat(above) || above === OUT);
      let lit = false;
      let dark = false;
      if (width === 1) {
        if (x < mid) lit = true;
        else dark = true;
      } else {
        if (leftEdge && x < mid && darker(lc)) lit = true;
        else if (rightEdge && (width >= 3 || x > mid)) dark = true;
        else if (topEdge && !above && x < mid) lit = true;
      }
      // broad cloth turns away from the light over two pixels, not one
      const nearRight =
        !lit && !dark && width >= 6 && x > mid && key(at(x + 1, y)) === k && key(edge(x + 1, y, 1)) !== k;
      // tucked under something else (the forehead under a fringe, the neck under the chin, legs under the
      // tunic): a half step of shade along the top
      const below = at(x, y + 1);
      const tucked = !lit && above && mat(above) && key(above) !== k && lum(above) < lum(c) + 0.1 && key(below) === k;
      if (lit) out[y][x] = walkerLit(c);
      else if (dark) out[y][x] = walkerShade(c);
      else if (nearRight || tucked) out[y][x] = walkerShade(c, 0.5);
    }
  for (let y = 0; y < FH; y++) f[y] = out[y];
}

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
  if (w.cross && !back) {
    // a red cross on the chest (front, or the near side)
    const cx = side ? (dir === 'left' ? 6 : 9) : 8;
    b(cx - 1, 13, 3, 1, w.cross);
    b(cx, 12, 1, 3, w.cross);
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

  // a spade held upright at the side, blade down (Mattock)
  if (w.spade) {
    const HAFT = '#6A4A2A';
    const BLADE = '#8A8A96';
    const x = side ? (step === 0 ? 7 : step === 1 ? 6 : 8) - 2 : back ? 2 : 13;
    b(x, 6, 1, 11, HAFT);
    b(x - 1, 6, 3, 1, HAFT);
    b(x - 1, 17, 3, 3, BLADE);
    p(x, 20, BLADE);
    if (!side) p(x, 16, skin);
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
    } else if (w.ko) {
      // knocked out: a little X for each eye
      for (const ex of [5, 9]) {
        p(ex, 7, EYE);
        p(ex + 2, 7, EYE);
        p(ex + 1, 8, EYE);
        p(ex, 9, EYE);
        p(ex + 2, 9, EYE);
      }
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

  if (w.hat === 'sun') {
    // a tourist's straw sun hat: a wide flat brim, a low crown, a red band
    const straw = '#E8D08A';
    b(2, 4, 12, 1, straw);
    b(5, 2, 6, 2, straw);
    b(5, 3, 6, 1, '#C4442A');
    if (!back) p(6, 2, '#F6E6B0');
  }

  if (w.hat === 'top') {
    // a ringmaster's top hat: a wide brim, a tall black crown, a red band
    const hat = '#1A161E';
    b(3, 4, 10, 1, hat);
    b(5, -1, 6, 5, hat);
    b(5, 2, 6, 1, '#B02A22');
    if (!back) p(6, 0, '#4A4452');
  }

  if (w.hat === 'chef') {
    // a cook's tall white toque, puffed at the top, lit on the left
    const hat = w.hatColour ?? '#F4F0EA';
    b(3, 0, 10, 3, hat);
    b(4, 3, 8, 1, '#7A7AA8');
    p(4, 0, '#FFFFFF');
    p(5, 0, '#FFFFFF');
    b(11, 0, 2, 3, '#B8B8D8');
    p(6, 2, '#C8C8E0');
    p(9, 1, '#C8C8E0');
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

  // a short one (Barnaby, author, Oct 6, 2026: "a small guy"): the same head and body on stubby legs, four rows
  // shorter, feet where everyone's feet are
  if (w.short) {
    const rows = f.map((r) => r.slice());
    for (let y = 0; y < FH; y++) {
      const from = y >= 20 ? y : y - 4;
      f[y] = from >= 0 ? rows[from].slice() : Array(FW).fill(null);
    }
    // the four rows of leg that went: the belt sits right on top of the boots
    for (let y = 16; y < 20; y++) f[y] = rows[y - 4].slice();
  }

  // a ghost has no feet: below the hem the body thins to a wisp that sways as it drifts
  if (w.ghost) {
    const sway = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    for (let y = 17; y < FH; y++) {
      const half = [5, 4, 3, 2, 1, 0.5, 0, 0][y - 17] ?? 0;
      const row = f[y].slice();
      const shift = y > 18 ? sway : 0;
      for (let x = 0; x < FW; x++) {
        const src = row[x - shift] ?? null;
        f[y][x] = Math.abs(x - 7.5 - shift) <= half ? (src ?? w.top) : null;
      }
    }
  }

  // right-facing frames are drawn left-facing, then mirrored, before the light goes on, so the light always
  // comes from the upper left of the finished picture
  if (dir === 'right') for (let y = 0; y < FH; y++) f[y].reverse();
  shadeWalker(f, w);

  // a dark outline around the whole silhouette, then a soft shadow at the feet
  const solid = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && f[y][x] && f[y][x] !== OUT;
  const outline = [];
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++)
      if (!f[y][x] && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) outline.push([x, y]);
  for (const [x, y] of outline) f[y][x] = OUT;
  if (w.ghost)
    // see-through, a little more so toward the tail
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const c = f[y][x];
        if (!c) continue;
        const rgb = typeof c === 'string' ? hex(c) : c;
        f[y][x] = [rgb[0], rgb[1], rgb[2], y < 17 ? 215 : Math.max(70, 215 - (y - 16) * 30)];
      }
  for (let y = 21; y < (w.noShadow || w.ghost ? 21 : 24); y++)
    for (let x = 2; x < 14; x++) {
      const d = ((x - 7.5) / 6) ** 2 + ((y - 22.5) / 1.6) ** 2;
      if (d <= 1 && !f[y][x]) f[y][x] = [16, 10, 8, 90];
    }

  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      const c = f[y][x];
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
  'cull-road',
  'barracks-hall',
  'barracks-armoury',
  'officers-mess',
  'long-mess',
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
  'graveyard',
  'queens-clearing',
  'osrics-rest',
  'root-cellar',
  'hedge-maze',
  'the-pit',
  'castle-grounds',
  'castle-hall',
  'castle-upper',
  'war-room',
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
  'dungeon-fork',
  'dungeon-mind',
  'dungeon-might',
  'dungeon-lore',
  'warrior-city',
  'south-road',
  'old-mine',
  'royal-forest',
  'painters-school',
  'wc-chapel',
  'wc-library',
  'wc-guild',
  'wc-hospital',
  'wc-tavern',
  'wc-store',
  'wc-barn',
  'wc-bank',
  'wc-vault',
  'room-brannoc',
  'room-ysolde',
  'room-quill',
  'room-wren',
  'room-oren',
  'room-pip',
  'room-tamsin',
  'room-moss',
  'queens-room',
  'kings-bedchamber',
  'mess-hall',
  'royal-dungeon',
];
mkdirSync('assets/world', { recursive: true });
for (const id of MAPS) {
  const map = JSON.parse(readFileSync(`src/world/maps/${id}.json`, 'utf8'));
  const widths = new Set(map.tiles.map((r) => r.length));
  if (widths.size !== 1) throw new Error(`${id}: rows have different lengths (${[...widths].join(', ')})`);
  writeFileSync(
    `assets/world/${id}.png`,
    toPng(
      map.style === 'outdoor'
        ? drawOutdoor(map)
        : map.floor === 'sand'
          ? drawArena(map)
          : map.style === 'dungeon'
            ? drawDungeon(map)
            : drawMap(map),
    ),
  );
  // the Kaloseum's crowd, on its feet: a second picture the game and the episodes switch to and back
  if (map.floor === 'sand') writeFileSync(`assets/world/${id}-cheer.png`, toPng(drawArena(map, true)));
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
