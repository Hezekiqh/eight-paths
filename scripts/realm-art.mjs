// Pixel-art scenes for the eight ancient realms and the silk cocoon, drawn on a
// 270×480 grid. The app's character reveal and the hatch videos both use them,
// so the two always match.
//
//   node scripts/realm-art.mjs
//
// writes assets/realms/<path>.png, assets/cocoon/crack-0..4.png and
// src/art/realm-scene.ts (the ground line, the cocoon's eye and each realm's
// twinkling lights, for the app to animate over the pictures).
//
// Each scene is built in depth layers: a dithered sky, hazier far layers,
// silhouettes rim-lit from the realm's light source, glowing lights, a
// textured ground and a vignette that pulls the eye to the centre.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const GW = 270;
export const GH = 480;
/** The row where the ground starts; the cocoon and the characters stand on it. */
export const GROUND = 350;

export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) =>
  '#' +
  c
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
export const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
export const blank = (w = GW, h = GH) => Array.from({ length: h }, () => Array(w).fill(null));

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));
/** Rounds an amount (0–1) to quarters, dithering between them so blends stay pixel art. */
export const dither = (a, x, y, steps = 4) => {
  const q = Math.max(0, a) * steps;
  const base = Math.floor(q);
  return Math.min(1, (q - base > BAYER[y & 3][x & 3] ? base + 1 : base) / steps);
};

/** Sets one pixel. On a scene canvas it also records the depth layer and applies that layer's haze. */
export const put = (g, x, y, c) => {
  x = Math.round(x);
  y = Math.round(y);
  if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return;
  if (g.st) {
    if (g.st.fog) c = mix(c, g.st.fogc, g.st.fog);
    g.D[y][x] = g.st.layer;
  }
  g[y][x] = c;
};
export const box = (g, x, y, w, h, c) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, c);
};

function rng(seed) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}

// ---- scene canvas and its passes

function canvas() {
  const g = blank();
  g.D = Array.from({ length: GH }, () => new Uint8Array(GW));
  g.st = { layer: 0, fog: 0, fogc: [0, 0, 0] };
  g.glows = [];
  g.lights = [];
  return g;
}
/** Everything drawn next belongs to depth `n` (0 = sky, 9 = ground, 10 = foreground), hazed toward `fogc`. */
const layer = (g, n, fog = 0, fogc = '#000000') => (g.st = { layer: n, fog, fogc: hex(fogc) });

/** A vertical dithered gradient through `stops`, top to bottom. */
function gradient(g, y0, y1, stops, x0 = 0, x1 = GW) {
  const cols = stops.map(hex);
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (cols.length - 1);
    const k = Math.min(cols.length - 2, Math.floor(t));
    for (let x = x0; x < x1; x++) put(g, x, y, mix(cols[k], cols[k + 1], dither(t - k, x, y)));
  }
}
const stars = (g, rnd, n, maxY, colors = ['#FFF4C0', '#8C86C8', '#C8C4F0']) => {
  for (let i = 0; i < n; i++) put(g, rnd() * GW, rnd() * maxY, hex(colors[Math.floor(rnd() * colors.length)]));
};
const disc = (g, cx, cy, r, c, edge) => {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) put(g, cx + x, cy + y, edge && x * x + y * y > r * r * 0.7 ? hex(edge) : hex(c));
};
/** A soft light: pixels nearby shift toward `color`, in dithered steps. */
const glow = (g, x, y, r, color, strength = 0.6) => g.glows.push({ x, y, r, c: hex(color), s: strength });
/** A light that twinkles in the app and the videos. */
const light = (g, x, y, color, r = 10, strength = 0.5) => {
  g.lights.push([Math.round(x), Math.round(y), color]);
  glow(g, x, y, r, color, strength);
};
/** A mountain or hill line: `top(x)` gives the ridge height, filled down to `bottom`. */
const ridge = (g, top, color, bottom = GROUND) => {
  for (let x = 0; x < GW; x++) for (let y = Math.round(top(x)); y < bottom; y++) put(g, x, y, hex(color));
};
const pine = (g, cx, by, h, w, color, trunk) => {
  box(g, cx - 1, by - h * 0.25, 3, h * 0.25, hex(trunk ?? color));
  for (let y = 0; y < h * 0.85; y++) {
    const t = y / (h * 0.85);
    const hw = Math.round((w / 2) * t * (0.75 + 0.25 * ((y % 7) / 7)));
    box(g, cx - hw, by - h + y, hw * 2 + 1, 1, hex(color));
  }
};
const win = (g, x, y, w, h, color, r = 8, strength = 0.35) => {
  box(g, x, y, w, h, hex(color));
  glow(g, x + w / 2, y + h / 2, r, color, strength);
};
/** Ground: a dithered gradient with rows of stones or earth that widen toward the viewer. */
function ground(g, rnd, stops, { joints = true, specks = 0.04, speckColor } = {}) {
  layer(g, 9);
  gradient(g, GROUND, GH, stops);
  const rows = 11;
  let prev = GROUND;
  for (let k = 1; k <= rows; k++) {
    const y = GROUND + Math.round((GH - GROUND) * Math.pow(k / rows, 1.6));
    if (y - 1 < GH) for (let x = 0; x < GW; x++) g[y - 1][x] = mix(g[y - 1][x], [0, 0, 0], 0.22);
    if (joints) {
      const w = 8 + (y - GROUND) * 0.3;
      for (let x = (k % 2) * (w / 2); x < GW; x += w)
        for (let j = prev; j < Math.min(GH, y - 1); j++)
          g[j][Math.round(x)] && (g[j][Math.round(x)] = mix(g[j][Math.round(x)], [0, 0, 0], 0.18));
    }
    prev = y;
  }
  for (let i = 0; i < GW * (GH - GROUND) * specks; i++) {
    const x = Math.floor(rnd() * GW);
    const y = GROUND + 2 + Math.floor(rnd() * (GH - GROUND - 2));
    g[y][x] = speckColor ? hex(speckColor) : mix(g[y][x], [255, 255, 255], 0.12);
  }
  // the horizon catches the light
  for (let x = 0; x < GW; x++) g[GROUND][x] = mix(g[GROUND][x], [255, 255, 255], 0.15);
}
/** A light's reflection on wet ground or water: a dithered streak below it. */
function reflect(g, x, color, length = 40, width = 3) {
  const c = hex(color);
  for (let j = 0; j < length; j++) {
    const a = 0.5 * (1 - j / length);
    for (let i = -width; i <= width; i++) {
      const px = Math.round(x + i + Math.sin(j * 0.9) * 1.5);
      const py = GROUND + 1 + j;
      if (py < GH && px >= 0 && px < GW && (j + i) % 2 === 0)
        g[py][px] = mix(g[py][px], c, dither(a * (1 - Math.abs(i) / (width + 1)), px, py));
    }
  }
}

/** The finishing passes: rim light on silhouette edges, glows, then the vignette. */
function finish(g, { lightDir = 0, rimColor = '#FFFFFF', rim = 0.4, vignette = 0.55 } = {}) {
  const rc = hex(rimColor);
  const lit = g.map((row) => row.slice());
  for (let y = 1; y < GH; y++)
    for (let x = 1; x < GW - 1; x++) {
      const d = g.D[y][x];
      if (d === 0 || d >= 9) continue;
      const side = lightDir !== 0 && g.D[y][x + lightDir] < d;
      const top = g.D[y - 1][x] < d;
      if (side || top) lit[y][x] = mix(g[y][x], rc, rim);
    }
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) g[y][x] = lit[y][x];
  for (const { x, y, r, c, s } of g.glows)
    for (let j = Math.floor(y - r); j <= y + r; j++)
      for (let i = Math.floor(x - r); i <= x + r; i++) {
        if (j < 0 || j >= GH || i < 0 || i >= GW) continue;
        const d = Math.hypot(i - x, j - y) / r;
        if (d < 1) g[j][i] = mix(g[j][i], c, dither(s * (1 - d) * (1 - d), i, j));
      }
  const edge = hex('#05040A');
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const d = Math.hypot((x - GW / 2) / (GW / 2), (y - GH * 0.52) / (GH / 2)) / Math.SQRT2;
      const a = Math.max(0, (d - 0.45) / 0.55) * vignette;
      if (a > 0) g[y][x] = mix(g[y][x], edge, dither(a, x, y));
    }
  return { base: g.map((row) => row.slice()), lights: g.lights };
}

// ---- the eight realms

const REALMS = {
  // The Warrior Kingdom: a castle keep at dusk, the sun sinking behind the hills, torches lit on the training yard.
  physical(rnd) {
    const g = canvas();
    const HAZE = '#E07A48';
    gradient(g, 0, GROUND, ['#1A0E2A', '#3E1636', '#7A2238', '#C4442A', '#F29A4A']);
    stars(g, rnd, 25, 110);
    disc(g, 240, 150, 14, '#FFD27A', '#FFB04A');
    glow(g, 240, 150, 60, '#FFB060', 0.55);
    layer(g, 1, 0.55, HAZE);
    ridge(g, (x) => 236 - 34 * Math.abs(Math.sin(x / 37 + 1)) - 10 * Math.sin(x / 9), '#3A1A34');
    layer(g, 2, 0.3, HAZE);
    ridge(g, (x) => 292 - 16 * Math.sin(x / 28) - 6 * Math.sin(x / 7), '#2E1428');
    layer(g, 3);
    const stone = hex('#4A3A4E');
    const dark = hex('#33283A');
    box(g, 76, 176, 118, 174, stone);
    for (let x = 76; x < 194; x += 10) box(g, x, 169, 6, 7, stone);
    for (let y = 186; y < 340; y += 9) for (let x = 80 + ((y / 9) % 2) * 6; x < 190; x += 14) box(g, x, y, 8, 1, dark);
    for (const tx of [52, 184]) {
      box(g, tx, 128, 34, 222, dark);
      for (let x = tx; x < tx + 34; x += 8) box(g, x, 120, 5, 8, dark);
      box(g, tx + 16, 88, 2, 32, hex('#1E1622'));
      box(g, tx + 18, 88, 14, 9, hex('#B3261E'));
      box(g, tx + 18, 97, 10, 3, hex('#8A1A16'));
      win(g, tx + 14, 160, 6, 10, '#FFB04A', 10);
      win(g, tx + 14, 220, 6, 10, '#FFB04A', 10);
    }
    box(g, 118, 272, 34, 78, hex('#140E18'));
    for (let y = 276; y < 350; y += 7) box(g, 118, y, 34, 1, hex('#4A2E22'));
    for (const bx of [92, 166]) {
      box(g, bx, 190, 12, 34, hex('#B3261E'));
      box(g, bx + 2, 224, 3, 4, hex('#B3261E'));
      box(g, bx + 7, 224, 3, 4, hex('#B3261E'));
      box(g, bx + 4, 202, 4, 4, hex('#FFC940'));
    }
    win(g, 128, 200, 14, 18, '#FFB04A', 16, 0.4);
    ground(g, rnd, ['#6A4A30', '#4A3020', '#2A1A12'], { joints: false, specks: 0.06 });
    // training yard: a dummy, a weapon rack, torches
    layer(g, 10);
    box(g, 30, 318, 3, 32, hex('#3A2418'));
    box(g, 22, 324, 19, 3, hex('#3A2418'));
    disc(g, 31, 314, 5, '#8A6A40');
    box(g, 26, 326, 11, 16, hex('#7A5A34'));
    box(g, 222, 322, 26, 3, hex('#3A2418'));
    for (const sx of [226, 234, 242]) box(g, sx, 304, 2, 46, hex('#B8B0C0'));
    for (const tx of [10, 256]) {
      box(g, tx, 300, 3, 50, hex('#2A1A12'));
      box(g, tx - 1, 294, 5, 6, hex('#FFB04A'));
      light(g, tx + 1, 293, '#FFB04A', 22, 0.6);
      reflect(g, tx + 1, '#FFB04A', 26, 2);
    }
    return finish(g, { lightDir: 1, rimColor: '#FFB060', rim: 0.45 });
  },

  // The Merchant City: a marble bank at golden hour, domes and a skyline behind, lamps on a gleaming plaza.
  financial(rnd) {
    const g = canvas();
    const HAZE = '#E8A060';
    gradient(g, 0, GROUND, ['#221A44', '#4A3060', '#9A5A6A', '#E08A50', '#FFD27A']);
    disc(g, 214, 206, 20, '#FFF0B0', '#FFD27A');
    glow(g, 214, 206, 80, '#FFD27A', 0.5);
    layer(g, 1, 0.55, HAZE);
    let x = -4;
    while (x < GW) {
      const w = 18 + Math.floor(rnd() * 20);
      const top = 200 + Math.floor(rnd() * 60);
      box(g, x, top, w, GROUND - top, hex('#4A3A5A'));
      if (rnd() > 0.5) box(g, x + w / 2 - 1, top - 10, 2, 10, hex('#4A3A5A'));
      x += w + 1;
    }
    layer(g, 2, 0.25, HAZE);
    for (const [dx, r] of [
      [34, 24],
      [236, 20],
    ]) {
      disc(g, dx, 252, r, '#B8902E', '#8A6A20');
      box(g, dx - 1, 252 - r - 10, 2, 10, hex('#8A6A20'));
      box(g, dx - r, 252, r * 2, 98, hex('#6A5A6A'));
      for (let wy = 266; wy < 340; wy += 16) win(g, dx - 4, wy, 8, 8, '#FFE0A0', 7, 0.3);
    }
    layer(g, 3);
    const marble = hex('#E8DCC0');
    const shadow = hex('#A89878');
    box(g, 66, 226, 138, 124, hex('#7A6A58'));
    for (let y = 0; y < 26; y++) box(g, 135 - y * 3, 196 + y, y * 6 + 1, 1, marble);
    for (let y = 8; y < 24; y++) box(g, 135 - (y - 8) * 2, 196 + y, (y - 8) * 4 + 1, 1, shadow);
    box(g, 60, 222, 150, 6, marble);
    for (let cx = 72; cx < 200; cx += 18) {
      box(g, cx, 228, 10, 112, marble);
      box(g, cx + 7, 228, 3, 112, shadow);
      box(g, cx - 1, 228, 12, 3, marble);
    }
    box(g, 60, 340, 150, 10, marble);
    disc(g, 135, 212, 5, '#FFC940', '#C8A040');
    ground(g, rnd, ['#B8A080', '#7A6448', '#3A2C20'], { specks: 0.02 });
    reflect(g, 214, '#FFD27A', 60, 5);
    layer(g, 10);
    for (const lx of [14, 254]) {
      box(g, lx, 280, 3, 70, hex('#2A2020'));
      box(g, lx - 3, 272, 9, 9, hex('#2A2020'));
      box(g, lx - 2, 273, 7, 7, hex('#FFE9A0'));
      light(g, lx + 1, 276, '#FFE9A0', 22, 0.55);
      reflect(g, lx + 1, '#FFE9A0', 30, 2);
    }
    for (let n = 0; n < 6; n++) light(g, 40 + rnd() * 190, 150 + rnd() * 60, '#FFE9A0', 4, 0.3);
    return finish(g, { lightDir: 1, rimColor: '#FFE0A0', rim: 0.45 });
  },

  // The Academy: spired towers of lit windows under a deep night, an observatory, runes drifting in the air.
  intellectual(rnd) {
    const g = canvas();
    const HAZE = '#2A3070';
    gradient(g, 0, GROUND, ['#03041A', '#08102E', '#101A48', '#1C2462', '#2E3480']);
    stars(g, rnd, 130, 260);
    disc(g, 58, 64, 13, '#EEEAFF', '#C0B8F4');
    glow(g, 58, 64, 50, '#9AA4FF', 0.35);
    layer(g, 1, 0.55, HAZE);
    for (let i = 0; i < 9; i++) {
      const tx = i * 32 - 6 + rnd() * 10;
      const top = 210 + rnd() * 50;
      box(g, tx, top, 16, GROUND - top, hex('#141238'));
      for (let y = 0; y < 16; y++) box(g, tx + y / 2, top - 16 + y, 16 - y, 1, hex('#141238'));
    }
    layer(g, 3);
    const tower = hex('#221C48');
    for (const [x0, w, top] of [
      [18, 44, 150],
      [78, 50, 106],
      [152, 42, 170],
      [206, 52, 128],
    ]) {
      box(g, x0, top, w, GROUND - top, tower);
      for (let y = 0; y < 44; y++) {
        const hw = Math.round((w / 2 + 3) * (y / 44));
        box(g, x0 + w / 2 - hw, top - 44 + y, hw * 2, 1, hex('#2E2660'));
      }
      box(g, x0 - 3, top, w + 6, 3, hex('#2E2660'));
      for (let wy = top + 14; wy < GROUND - 22; wy += 22)
        for (let wx = x0 + 7; wx < x0 + w - 10; wx += 13)
          if (rnd() > 0.3) {
            win(g, wx, wy, 5, 9, '#FFD27A', 8, 0.3);
            box(g, wx + 1, wy - 1, 3, 1, hex('#FFD27A'));
          }
    }
    disc(g, 103, 100, 16, '#5B3FB5', '#3A2A80');
    box(g, 106, 78, 22, 4, hex('#C8A040'));
    box(g, 126, 76, 4, 4, hex('#E8D080'));
    ground(g, rnd, ['#2A2650', '#1A1838', '#0C0A1E'], { specks: 0.03, speckColor: '#3A3470' });
    reflect(g, 58, '#9AA4FF', 50, 4);
    layer(g, 10);
    for (let n = 0; n < 9; n++)
      light(g, 20 + rnd() * 230, 190 + rnd() * 140, ['#9B74F8', '#6FD3FF', '#FFD27A'][n % 3], 7, 0.5);
    return finish(g, { lightDir: -1, rimColor: '#8A90FF', rim: 0.35, vignette: 0.6 });
  },

  // The Temple of the Three: a pillared temple at dawn, the sun rising behind it, its three flames burning.
  spiritual(rnd) {
    const g = canvas();
    const HAZE = '#F0B0A8';
    gradient(g, 0, GROUND, ['#2E2450', '#6A4A80', '#C07A98', '#F4A8A0', '#FFE0BE']);
    stars(g, rnd, 14, 90);
    disc(g, 135, 196, 40, '#FFF4DE', '#FFE4C0');
    glow(g, 135, 196, 110, '#FFE8C8', 0.5);
    layer(g, 1, 0.6, HAZE);
    ridge(g, (x) => 250 - 40 * Math.abs(Math.sin(x / 48 + 0.4)) - 8 * Math.sin(x / 11), '#5A4070');
    layer(g, 2, 0.35, HAZE);
    ridge(g, (x) => 300 - 12 * Math.sin(x / 30 + 2), '#4A3460');
    layer(g, 3);
    const stone = hex('#E0D6E8');
    const shade = hex('#9A8CB0');
    box(g, 54, 226, 162, 96, hex('#6A5A80'));
    for (let y = 0; y < 30; y++) box(g, 135 - y * 3.4, 194 + y, y * 6.8 + 1, 1, stone);
    for (let y = 12; y < 28; y++) box(g, 135 - (y - 12) * 2.4, 194 + y, (y - 12) * 4.8 + 1, 1, shade);
    box(g, 46, 222, 178, 6, stone);
    for (let cx = 62; cx < 212; cx += 24) {
      box(g, cx, 228, 10, 94, stone);
      box(g, cx + 7, 228, 3, 94, shade);
    }
    for (let s = 0; s < 5; s++) box(g, 46 - s * 8, 322 + s * 6, 178 + s * 16, 6, s % 2 ? stone : shade);
    // the three flames: the Free, the Guarded, the Reconciled
    for (const [fx, c] of [
      [88, '#FF8A3D'],
      [135, '#9B74F8'],
      [182, '#2DD4BF'],
    ]) {
      box(g, fx - 5, 176, 10, 4, hex('#6A5A80'));
      box(g, fx - 3, 180, 6, 14, hex('#6A5A80'));
      box(g, fx - 3, 164, 6, 12, hex(c));
      box(g, fx - 1, 160, 2, 4, hex(c));
      box(g, fx - 1, 168, 2, 6, hex('#FFF4C0'));
      light(g, fx, 168, c, 24, 0.6);
    }
    ground(g, rnd, ['#C8BCD8', '#8A7AA0', '#3A2E4A'], { specks: 0.02 });
    layer(g, 10);
    for (let n = 0; n < 12; n++) light(g, rnd() * GW, 60 + rnd() * 280, '#FFB8D0', 3, 0.4);
    return finish(g, { lightDir: 0, rimColor: '#FFF0D8', rim: 0.45, vignette: 0.45 });
  },

  // The Still Valley: mist between mountains, a monastery on a still lake, lanterns floating on the water.
  emotional(rnd) {
    const g = canvas();
    const HAZE = '#9ABCB8';
    gradient(g, 0, GROUND, ['#0C1E26', '#18323C', '#2E5258', '#6A9494', '#B0CCC4']);
    stars(g, rnd, 30, 120);
    disc(g, 204, 84, 18, '#F2F6EA', '#D6E4D0');
    glow(g, 204, 84, 60, '#D8ECE0', 0.35);
    for (const [base, amp, col, fog, n] of [
      [196, 64, '#2A5058', 0.55, 1],
      [236, 44, '#1E3E46', 0.4, 2],
      [268, 30, '#162E36', 0.25, 3],
    ]) {
      layer(g, n, fog, HAZE);
      ridge(g, (x) => base - amp * Math.abs(Math.sin(x / (34 + n * 6) + base)), col, 312);
      // mist settles between the ranges
      for (let y = base - 6; y < base + 14; y++)
        for (let x = 0; x < GW; x++)
          if (dither(0.3 * (1 - Math.abs(y - base - 4) / 10), x, y) > 0) g[y][x] = mix(g[y][x], hex(HAZE), 0.3);
    }
    layer(g, 4);
    box(g, 100, 270, 70, 42, hex('#4A2224'));
    for (let y = 0; y < 16; y++) box(g, 86 + y, 254 + y, 98 - y * 2, 1, hex('#121C22'));
    for (let y = 0; y < 12; y++) box(g, 108 + y, 236 + y, 54 - y * 2, 1, hex('#121C22'));
    box(g, 84, 252, 4, 3, hex('#121C22'));
    box(g, 182, 252, 4, 3, hex('#121C22'));
    for (const lx of [112, 152]) win(g, lx, 282, 6, 9, '#FFB04A', 12, 0.4);
    // the lake mirrors the mountains
    layer(g, 8);
    for (let y = 312; y < GROUND; y++)
      for (let x = 0; x < GW; x++) {
        const src = g[312 - (y - 312) - 1][x];
        put(g, x, y, mix(src, hex('#18323C'), 0.45 + (y % 3 === 0 ? 0.15 : 0)));
      }
    ground(g, rnd, ['#2E4034', '#1E2C24', '#0E1612'], { joints: false, specks: 0.07, speckColor: '#3A5A40' });
    layer(g, 10);
    for (const [lx, ly] of [
      [40, 326],
      [78, 318],
      [196, 322],
      [236, 330],
      [150, 340],
    ]) {
      box(g, lx - 2, ly - 3, 5, 4, hex('#FFB04A'));
      box(g, lx - 3, ly + 1, 7, 1, hex('#5A2A20'));
      light(g, lx, ly - 1, '#FFB04A', 12, 0.5);
    }
    for (const rx of [6, 12, 18, 252, 258, 264]) box(g, rx, 390 - (rx % 5) * 8, 2, 90, hex('#0A140E'));
    return finish(g, { lightDir: 1, rimColor: '#D8ECE0', rim: 0.3 });
  },

  // The Festival City: rooftops, a striped theatre tent, strings of lanterns and cobbles wet with their light.
  social(rnd) {
    const g = canvas();
    const HAZE = '#4A2A70';
    gradient(g, 0, GROUND, ['#0C0824', '#160E3A', '#241650', '#3A2066', '#5A2A70']);
    stars(g, rnd, 70, 170);
    disc(g, 222, 46, 10, '#F8EFD8', '#E8DCC0');
    glow(g, 222, 46, 36, '#E8DCF8', 0.3);
    layer(g, 1, 0.5, HAZE);
    let x = -4;
    while (x < GW) {
      const w = 16 + Math.floor(rnd() * 20);
      const top = 190 + Math.floor(rnd() * 60);
      box(g, x, top, w, GROUND - top, hex('#2A1740'));
      for (let y = 0; y < 8; y++) box(g, x + y, top - 8 + y, w - y * 2, 1, hex('#2A1740'));
      x += w + 2;
    }
    layer(g, 2);
    x = -8;
    while (x < GW) {
      const w = 26 + Math.floor(rnd() * 24);
      const top = 250 + Math.floor(rnd() * 50);
      box(g, x, top, w, GROUND - top, hex('#180C28'));
      for (let wy = top + 8; wy < GROUND - 10; wy += 12)
        for (let wx = x + 5; wx < x + w - 6; wx += 10) if (rnd() > 0.45) win(g, wx, wy, 4, 6, '#FFC66B', 7, 0.3);
      x += w + 3;
    }
    layer(g, 3);
    const tcx = 135;
    for (let y = 0; y < 44; y++) {
      const hw = Math.round(8 + y * 1.15);
      for (let i = -hw; i <= hw; i++)
        put(g, tcx + i, 256 + y, Math.floor((i + 70) / 7) % 2 ? hex('#B3261E') : hex('#F3ECDD'));
    }
    for (let i = -58; i <= 58; i += 6)
      box(g, tcx + i, 300, 4, 4, Math.floor((i + 70) / 7) % 2 ? hex('#B3261E') : hex('#F3ECDD'));
    box(g, tcx - 54, 304, 108, 46, hex('#3A1A2A'));
    box(g, tcx - 14, 314, 28, 36, hex('#240A16'));
    for (const lx of [tcx - 44, tcx + 44]) {
      box(g, lx - 2, 312, 5, 7, hex('#FFB04A'));
      glow(g, lx, 315, 18, '#FFB04A', 0.5);
    }
    box(g, tcx, 242, 1, 14, hex('#6A4028'));
    box(g, tcx + 1, 242, 8, 5, hex('#FF4FD8'));
    ground(g, rnd, ['#3A2E48', '#241C32', '#100C18'], { specks: 0.02 });
    for (const lx of [tcx - 44, tcx + 44]) reflect(g, lx, '#FFB04A', 40, 3);
    layer(g, 10);
    const colors = ['#FF4FD8', '#FFC940', '#2DD4BF', '#FF8A3D', '#9B74F8'];
    for (const [y0, sag] of [
      [120, 26],
      [158, 20],
    ])
      for (let x2 = 0; x2 < GW; x2++) {
        const y = Math.round(y0 + sag * Math.sin((x2 / GW) * Math.PI));
        put(g, x2, y, hex('#1A1224'));
        if (x2 % 16 === 8) {
          const c = colors[((x2 / 16) | 0) % colors.length];
          box(g, x2 - 1, y + 1, 3, 4, hex(c));
          light(g, x2, y + 3, c, 9, 0.45);
          if (y0 === 158) reflect(g, x2, c, 22, 1);
        }
      }
    return finish(g, { lightDir: 1, rimColor: '#C8A0FF', rim: 0.3 });
  },

  // The Guild City: chimneys and workshops under a smoky sunset, forge windows blazing, a great gear, sparks.
  occupational(rnd) {
    const g = canvas();
    const HAZE = '#C86A3A';
    gradient(g, 0, GROUND, ['#1E1216', '#48201E', '#8A3424', '#D8683A', '#FFB060']);
    disc(g, 70, 150, 22, '#FFC070', '#FF8A3D');
    glow(g, 70, 150, 70, '#FF9A50', 0.5);
    layer(g, 1, 0.5, HAZE);
    let x = -4;
    while (x < GW) {
      const w = 20 + Math.floor(rnd() * 26);
      const top = 196 + Math.floor(rnd() * 60);
      box(g, x, top, w, GROUND - top, hex('#4A2A28'));
      if (rnd() > 0.5) box(g, x + 4, top - 18, 6, 18, hex('#4A2A28'));
      x += w + 2;
    }
    layer(g, 2);
    for (const cx of [34, 118, 208]) {
      box(g, cx, 132, 14, 218, hex('#2A1A1A'));
      box(g, cx - 2, 126, 18, 7, hex('#1E1212'));
      for (let s = 0; s < 10; s++) {
        const r = 4 + s;
        const sx = cx + 7 + s * 6 + Math.sin(s) * 3;
        const sy = 116 - s * 12;
        for (let j = -r; j <= r; j++)
          for (let i = -r; i <= r; i++)
            if (i * i + j * j <= r * r && dither(0.75 - s * 0.06, Math.round(sx + i), Math.round(sy + j)) > 0.25)
              put(g, sx + i, sy + j, hex(s < 4 ? '#7A6A6A' : '#5A4A4E'));
      }
    }
    layer(g, 3);
    box(g, 14, 262, 242, 88, hex('#2E201C'));
    for (let y = 0; y < 14; y++) box(g, 10 + y, 248 + y, 250 - y * 2, 1, hex('#1E1412'));
    for (let wx = 26; wx < 250; wx += 38) {
      win(g, wx, 284, 22, 30, '#FF8A3D', 20, 0.45);
      box(g, wx + 10, 284, 2, 30, hex('#2E201C'));
      box(g, wx, 298, 22, 2, hex('#2E201C'));
      box(g, wx + 4, 306, 14, 8, hex('#FFD060'));
    }
    const gear = hex('#8A7060');
    disc(g, 200, 214, 26, '#8A7060', '#6A5040');
    disc(g, 200, 214, 9, '#2E201C');
    for (let a = 0; a < 10; a++)
      box(
        g,
        200 + Math.cos((a / 10) * 2 * Math.PI) * 29 - 3,
        214 + Math.sin((a / 10) * 2 * Math.PI) * 29 - 3,
        7,
        7,
        gear,
      );
    ground(g, rnd, ['#4A3A34', '#2E2420', '#140E0C'], { specks: 0.04 });
    for (let wx = 26; wx < 250; wx += 38) reflect(g, wx + 11, '#FF8A3D', 30, 6);
    layer(g, 10);
    box(g, 0, 0, 5, 200, hex('#140C0C'));
    for (let y = 0; y < 200; y += 10) box(g, 5, y, 3, 6, hex('#140C0C'));
    box(g, 0, 60, 60, 6, hex('#140C0C'));
    for (let n = 0; n < 12; n++) light(g, 20 + rnd() * 230, 250 + rnd() * 90, '#FFD060', 4, 0.5);
    return finish(g, { lightDir: -1, rimColor: '#FFA060', rim: 0.45 });
  },

  // The Wildwood: layers of pines fading into mist, a moonlit river and a sky full of fireflies.
  environmental(rnd) {
    const g = canvas();
    const HAZE = '#3E6A4E';
    gradient(g, 0, GROUND, ['#06140E', '#0C2418', '#163A26', '#245436', '#3E6E48']);
    stars(g, rnd, 40, 130);
    disc(g, 196, 70, 14, '#F0F4D8', '#D8E4B8');
    glow(g, 196, 70, 60, '#E8F4C8', 0.35);
    for (const [count, minH, color, fog, n] of [
      [12, 110, '#1A3A26', 0.6, 1],
      [9, 150, '#12301E', 0.4, 2],
      [7, 190, '#0C2416', 0.2, 3],
    ]) {
      layer(g, n, fog, HAZE);
      for (let i = 0; i < count; i++)
        pine(g, (i + rnd() * 0.7) * (GW / (count - 1)) - 10, GROUND, minH + rnd() * 50, 30 + n * 6, color, '#0A1A10');
    }
    ground(g, rnd, ['#2A4A28', '#1A3018', '#0A160A'], { joints: false, specks: 0.08, speckColor: '#3A6A34' });
    layer(g, 9);
    for (let y = GROUND; y < GH; y++) {
      const t = (y - GROUND) / (GH - GROUND);
      const cx = 150 + Math.round(40 * Math.sin(t * 5 + 1));
      const hw = Math.round(6 + t * 34);
      for (let i = -hw; i <= hw; i++)
        put(g, cx + i, y, mix(hex('#1E4A4E'), hex('#3A7A78'), dither(0.3 + 0.3 * Math.sin(y + i * 0.3), cx + i, y)));
    }
    reflect(g, 186, '#E8F4C8', 40, 3);
    layer(g, 10);
    box(g, 0, 0, 16, GH, hex('#040A06'));
    box(g, GW - 12, 0, 12, GH, hex('#040A06'));
    for (let y = 0; y < 60; y++) box(g, 16, y * 1.5, Math.max(0, 40 - y), 2, hex('#06100A'));
    for (let y = 0; y < 50; y++) box(g, GW - 12 - Math.max(0, 34 - y), y * 1.4, Math.max(0, 34 - y), 2, hex('#06100A'));
    for (let n = 0; n < 18; n++) light(g, 20 + rnd() * 230, 140 + rnd() * 220, '#E8F870', 6, 0.55);
    return finish(g, { lightDir: 1, rimColor: '#C8E8A0', rim: 0.3 });
  },
};

export const REALM_NAMES = Object.keys(REALMS);

/** The realm for a Path: `{ base, lights }`, drawn fresh from a fixed seed. */
export function drawRealm(dimension) {
  return REALMS[dimension](rng(7 + REALM_NAMES.indexOf(dimension) * 101));
}

// ---- the cocoon

export const COCOON_W = 60;
export const COCOON_H = 100;
const CRACKS = [
  [0, -62],
  [2, -60],
  [4, -56],
  [2, -52],
  [6, -48],
  [4, -44],
  [8, -40],
  [5, -36],
  [9, -32],
  [-3, -66],
  [-6, -62],
  [-9, -58],
  [-7, -54],
  [-12, -50],
  [-10, -46],
  [-14, -42],
  [12, -70],
  [15, -66],
  [13, -62],
  [17, -58],
  [-2, -30],
  [1, -26],
  [-4, -22],
];
/** Where the eye looks out, from the cocoon's bottom centre, and its size. */
export const EYE = { dx: -2, dy: -48, w: 12, h: 7 };

/**
 * The silk cocoon, bottom-centre at (cx, by). `shear` tilts the top in pixels,
 * `cracks` (0–1) reveals glowing cracks, `glow` (0–1) adds a halo, `eye`
 * (0–1) opens an eye in the silk, looking out in the `iris` colour.
 */
export function drawCocoon(
  g,
  cx,
  by,
  { shear = 0, lift = 0, cracks = 0, glow = 0, eye = 0, iris = '#FFC940', rnd = Math.random } = {},
) {
  const silk = hex('#EDE6D6');
  const shade = hex('#C9BFAE');
  const deep = hex('#A69C8C');
  const band = hex('#D8CFBD');
  const bright = hex('#FFF7DC');
  const off = (y) => Math.round(shear * (1 - y / (COCOON_H - 1)));
  for (let y = 0; y < COCOON_H; y++) {
    const t = y / (COCOON_H - 1);
    const ny = (t - 0.55) * 2;
    const hw = Math.round((COCOON_W / 2) * Math.sqrt(Math.max(0, 1 - ny * ny * (ny < 0 ? 0.9 : 1.6))));
    for (let i = -hw; i <= hw; i++) {
      let c = silk;
      if (i > hw * 0.45) c = shade;
      if (i > hw * 0.8) c = deep;
      if (i < -hw * 0.6 && y > 6) c = bright;
      if ((y + Math.round(i * 0.5)) % 9 === 0) c = band;
      put(g, cx + i + off(y), by - COCOON_H + y - lift, c);
    }
    put(g, cx - hw - 1 + off(y), by - COCOON_H + y - lift, hex('#3A3044'));
    put(g, cx + hw + 1 + off(y), by - COCOON_H + y - lift, hex('#3A3044'));
  }
  const n = Math.floor(cracks * CRACKS.length);
  for (let k = 0; k < n; k++) {
    const [dx, dy] = CRACKS[k];
    const o = off(COCOON_H + dy);
    box(g, cx + dx + o, by + dy - lift, 2, 3, hex('#3A3040'));
    box(g, cx + dx + o + 2, by + dy - lift, 1, 3, glow > 0.4 ? [255, 255, 255] : hex('#FFE9A0'));
  }
  if (eye > 0) {
    const o = off(COCOON_H + EYE.dy);
    const ex = cx + EYE.dx + o;
    const ey = by + EYE.dy - lift;
    const open = Math.max(1, Math.round(EYE.h * eye));
    // a torn hole in the silk, dark inside, the eye within
    for (let j = -Math.ceil(EYE.h / 2) - 1; j <= Math.ceil(EYE.h / 2) + 1; j++)
      for (let i = -EYE.w / 2 - 2; i <= EYE.w / 2 + 2; i++)
        if ((i * i) / (EYE.w / 2 + 2) ** 2 + (j * j) / (EYE.h / 2 + 1.5) ** 2 <= 1)
          put(g, ex + i, ey + j, hex('#0A0810'));
    for (let j = -Math.floor(open / 2); j <= Math.floor((open - 1) / 2); j++)
      for (let i = -EYE.w / 2; i <= EYE.w / 2; i++) {
        if ((i * i) / (EYE.w / 2) ** 2 + (j * j) / (EYE.h / 2) ** 2 > 1) continue;
        let c = hex('#F4F0E6');
        if (Math.abs(i) <= 3) c = hex(iris);
        if (Math.abs(i) <= 1) c = hex('#07060B');
        put(g, ex + i, ey + j, c);
      }
    if (open > 2) put(g, ex - 1, ey - 1, [255, 255, 255]);
  }
  if (glow > 0)
    for (let r = 0; r < 3; r++)
      for (let a = 0; a < 16; a++)
        if (rnd() < glow * 0.5)
          put(
            g,
            cx + Math.cos(a) * (COCOON_W / 2 + 3 + r * 3),
            by - COCOON_H / 2 + Math.sin(a) * (COCOON_H / 2 + 3 + r * 3) - lift,
            hex('#FFE9A0'),
          );
}

/** Writes a grid to PNG at `scale` screen pixels per art pixel (null = transparent). */
export function toPng(g, scale) {
  const h = g.length;
  const w = g[0].length;
  const png = new PNG({ width: w * scale, height: h * scale });
  for (let y = 0; y < h * scale; y++)
    for (let x = 0; x < w * scale; x++) {
      const c = g[Math.floor(y / scale)][Math.floor(x / scale)];
      if (!c) continue;
      const i = (y * w * scale + x) * 4;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = 255;
    }
  return PNG.sync.write(png);
}

/** The cocoon picture's canvas: 80×106, the cocoon's bottom centre at (40, 102). */
export const COCOON_CANVAS = { width: COCOON_W + 20, height: COCOON_H + 6, cx: (COCOON_W + 20) / 2, by: COCOON_H + 2 };

// ---- the intro's scenes ("Long ago…")

/** Draws `src` (a grid) into `g` at (x0, y0), scaled by `s`, shifted toward `tint` by `amt`. */
function stamp(g, src, x0, y0, s, tint = '#000000', amt = 0) {
  const tc = hex(tint);
  const h = Math.round(src.length * s);
  const w = Math.round(src[0].length * s);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = src[Math.floor(y / s)][Math.floor(x / s)];
      if (c) put(g, x0 + x, y0 + y, amt ? mix(c, tc, amt) : c);
    }
}
const cocoonSprite = (cracks = 0) => {
  const g = blank(COCOON_CANVAS.width, COCOON_CANVAS.height);
  drawCocoon(g, COCOON_CANVAS.cx, COCOON_CANVAS.by, { cracks });
  return g;
};

/** Rows of sleeping cocoons receding into the dark. */
function sleepers(rnd, { overgrown = false } = {}) {
  const g = canvas();
  gradient(g, 0, GROUND, ['#030208', '#07060F', '#0C0A1A', '#12102A']);
  // a shaft of pale light from high above
  for (let y = 0; y < GROUND; y++)
    for (let x = 0; x < GW; x++) {
      const half = 24 + y * 0.22;
      const d = Math.abs(x - GW / 2) / half;
      if (d < 1) g[y][x] = mix(g[y][x], hex('#8C86C8'), dither(0.22 * (1 - d) * (y / GROUND), x, y));
    }
  ground(g, rnd, ['#14122A', '#0C0A1A', '#05040A'], { specks: 0.02 });
  layer(g, 5);
  const cocoon = cocoonSprite();
  for (const [by, s, count, dim] of [
    [262, 0.3, 11, 0.72],
    [298, 0.45, 8, 0.55],
    [340, 0.65, 6, 0.35],
    [398, 0.9, 4, 0.15],
  ]) {
    const w = COCOON_CANVAS.width * s;
    const step = GW / count;
    for (let i = 0; i < count; i++) {
      const cx = step * (i + 0.5) + (rnd() - 0.5) * step * 0.2;
      const x0 = Math.round(cx - w / 2);
      const y0 = Math.round(by - COCOON_CANVAS.by * s);
      stamp(g, cocoon, x0, y0, s, overgrown ? '#1A1A10' : '#07060F', dim + (overgrown ? 0.1 : 0));
      if (!overgrown) glow(g, cx, by - 40 * s, 30 * s, '#8C86C8', 0.12);
      if (overgrown) {
        // vines climb the silk; dust settles on top
        for (let v = 0; v < 3; v++) {
          let vx = x0 + w * (0.25 + v * 0.25);
          for (let y = by; y > by - COCOON_H * s * (0.5 + rnd() * 0.5); y--) {
            vx += (rnd() - 0.5) * 1.6;
            put(g, vx, y, hex(rnd() > 0.3 ? '#2E4A24' : '#4A6A30'));
            if (rnd() > 0.85) put(g, vx + 1, y, hex('#5A7A38'));
          }
        }
        for (let d = 0; d < 6; d++) put(g, x0 + rnd() * w, y0 + rnd() * 6 * s + 2, hex('#6A6450'));
      }
    }
  }
  if (overgrown) {
    layer(g, 10);
    // cobwebs in the top corners
    for (let r = 10; r < 60; r += 10)
      for (let a = 0; a <= 20; a++) {
        const t = (a / 20) * (Math.PI / 2);
        put(g, Math.cos(t) * r, Math.sin(t) * r, hex('#3A3848'));
        put(g, GW - 1 - Math.cos(t) * r, Math.sin(t) * r, hex('#3A3848'));
      }
    for (let n = 0; n < 60; n++) put(g, rnd() * GW, rnd() * GROUND, hex('#4A4636'));
  }
  const out = finish(g, { lightDir: 0, rimColor: '#8C86C8', rim: 0.2, vignette: 0.8 });
  if (overgrown) out.base = out.base.map((row) => row.map((c) => mix(c, hex('#1A140A'), 0.25)));
  return out;
}

/** The Warrior Kingdom under a sky of fire and smoke: the war that would have ended everything. */
function war(rnd) {
  const { base } = drawRealm('physical');
  const g = base.map((row) => row.map((c) => mix(c, hex('#2A0606'), 0.35)));
  for (let y = 0; y < 240; y++)
    for (let x = 0; x < GW; x++) g[y][x] = mix(g[y][x], hex('#8A1A10'), dither(0.5 * (1 - y / 240), x, y));
  // smoke rolling over the sky
  for (let n = 0; n < 26; n++) {
    const sx = rnd() * GW;
    const sy = 40 + rnd() * 180;
    const r = 10 + rnd() * 22;
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++)
        if (i * i + j * j <= r * r) {
          const px = Math.round(sx + i);
          const py = Math.round(sy + j);
          const a = dither(0.6 * (1 - Math.hypot(i, j) / r), px, py);
          if (py >= 0 && py < GH && px >= 0 && px < GW && a > 0) g[py][px] = mix(g[py][px], hex('#2A1216'), a);
        }
  }
  // fires along the horizon
  const fires = [];
  for (let n = 0; n < 9; n++) {
    const fx = 10 + n * 31 + rnd() * 10;
    for (let y = 0; y < 14; y++)
      for (let i = -4 + y / 4; i <= 4 - y / 4; i++)
        put(g, fx + i, GROUND - y, hex(y < 5 ? '#FFD060' : y < 10 ? '#FF8A3D' : '#B3261E'));
    fires.push(fx);
  }
  const gg = { glows: [] };
  fires.forEach((fx) => gg.glows.push({ x: fx, y: GROUND - 6, r: 26, c: hex('#FF6A2A'), s: 0.5 }));
  for (const { x, y, r, c, s } of gg.glows)
    for (let j = Math.floor(y - r); j <= y + r; j++)
      for (let i = Math.floor(x - r); i <= x + r; i++) {
        if (j < 0 || j >= GH || i < 0 || i >= GW) continue;
        const d = Math.hypot(i - x, j - y) / r;
        if (d < 1) g[j][i] = mix(g[j][i], c, dither(s * (1 - d) * (1 - d), i, j));
      }
  for (let n = 0; n < 40; n++) put(g, rnd() * GW, 150 + rnd() * 200, hex('#FFB04A'));
  return { base: g, lights: [] };
}

/** The Archive: shelves of scrolls by candlelight. The cocoon at its heart is placed by the app. */
function archive(rnd) {
  const g = canvas();
  gradient(g, 0, GROUND, ['#0A0608', '#140C0C', '#1E1412', '#2A1C16']);
  layer(g, 2);
  const wood = hex('#3A2418');
  const dark = hex('#24160E');
  for (const [x0, w] of [
    [-6, 88],
    [94, 82],
    [188, 88],
  ]) {
    box(g, x0, 40, w, GROUND - 40, dark);
    box(g, x0, 40, 4, GROUND - 40, wood);
    box(g, x0 + w - 4, 40, 4, GROUND - 40, wood);
    for (let sy = 70; sy < GROUND - 10; sy += 34) {
      box(g, x0, sy, w, 4, wood);
      // scrolls lying on the shelf, ends toward us
      for (let sx = x0 + 6; sx < x0 + w - 10; sx += 9 + Math.floor(rnd() * 3)) {
        if (rnd() < 0.15) continue;
        const r = 3 + Math.floor(rnd() * 2);
        const cy = sy - r - 1;
        disc(g, sx + r, cy, r, rnd() > 0.2 ? '#E8DCC0' : '#C9B890', '#A89878');
        put(g, sx + r, cy, hex('#6A5A48'));
        if (rnd() < 0.18) box(g, sx + r - 1, cy + r - 1, 3, 2, hex('#B3261E'));
      }
    }
  }
  // a high window lets in one shaft of light onto the centre
  layer(g, 1);
  box(g, 118, 8, 34, 26, hex('#4A5A8A'));
  box(g, 134, 8, 2, 26, dark);
  box(g, 118, 20, 34, 2, dark);
  for (let y = 34; y < GROUND; y++)
    for (let x = 0; x < GW; x++) {
      const cx = 135 + (y - 34) * 0.05;
      const half = 17 + (y - 34) * 0.12;
      const d = Math.abs(x - cx) / half;
      if (d < 1) g[y][x] = mix(g[y][x], hex('#C8C8F0'), dither(0.22 * (1 - d), x, y));
    }
  ground(g, rnd, ['#3A2A22', '#221812', '#0C0806'], { specks: 0.03 });
  layer(g, 10);
  for (const [cx, cy] of [
    [40, 138],
    [230, 206],
    [40, 274],
    [230, 104],
    [135, 172],
  ]) {
    box(g, cx - 1, cy - 6, 3, 6, hex('#F3ECDD'));
    put(g, cx, cy - 8, hex('#FFD060'));
    put(g, cx, cy - 7, hex('#FFB04A'));
    light(g, cx, cy - 8, '#FFB04A', 20, 0.5);
  }
  return finish(g, { lightDir: 0, rimColor: '#FFB04A', rim: 0.25, vignette: 0.7 });
}

/** How tall the descent is: the world at night, down through the earth, into the dark, to the Archive. */
export const DESCENT_H = GH * 3;
/** Where the Archive (and its floor) starts in the descent. */
export const DESCENT_ARCHIVE_TOP = DESCENT_H - GH;

/**
 * The intro's last panel, a long scroll downward: the sleeping world under the
 * stars, the earth with the old world's ruins buried in it, the earth giving
 * way to a starry dark, and the Archive at the bottom, where the player wakes.
 */
function descent(rnd) {
  const H2 = DESCENT_H;
  const g = Array.from({ length: H2 }, () => Array(GW).fill(null));
  const surface = 300;
  // the world at night
  const sky = ['#05060F', '#0A0E24', '#141A3A', '#1E2450'].map(hex);
  for (let y = 0; y < surface; y++) {
    const t = (y / surface) * (sky.length - 1);
    const k = Math.min(sky.length - 2, Math.floor(t));
    for (let x = 0; x < GW; x++) g[y][x] = mix(sky[k], sky[k + 1], dither(t - k, x, y));
  }
  for (let n = 0; n < 110; n++) put(g, rnd() * GW, rnd() * 220, hex(rnd() > 0.7 ? '#FFF4C0' : '#8C86C8'));
  disc(g, 200, 70, 12, '#EEEAFF', '#C0B8F4');
  for (const [base, amp, col] of [
    [230, 60, '#1A1E3A'],
    [262, 34, '#12142A'],
  ])
    for (let x = 0; x < GW; x++)
      for (let y = Math.round(base - amp * Math.abs(Math.sin(x / 40 + base))); y < surface; y++) g[y][x] = hex(col);
  // a lone tree and the grass line
  for (let y = 0; y < 40; y++) box(g, 60 - y * 0.4, surface - 40 + y, 3 + y * 0.8, 1, hex('#0A0C18'));
  for (let x = 0; x < GW; x++) {
    g[surface][x] = hex('#2A4A28');
    if (x % 3 === 0) put(g, x, surface - 1, hex('#1E3A20'));
  }
  // the earth, darker as it goes down, roots reaching in
  const earthTop = surface + 1;
  const earthBottom = 820;
  const earth = ['#3A2A1E', '#2A1E16', '#1C140E', '#100A08'].map(hex);
  for (let y = earthTop; y < earthBottom; y++) {
    const t = ((y - earthTop) / (earthBottom - earthTop)) * (earth.length - 1);
    const k = Math.min(earth.length - 2, Math.floor(t));
    for (let x = 0; x < GW; x++) g[y][x] = mix(earth[k], earth[k + 1], dither(t - k, x, y));
  }
  for (let n = 0; n < 900; n++) {
    const y = earthTop + Math.floor(rnd() * (earthBottom - earthTop));
    put(g, rnd() * GW, y, mix(g[y][0], [255, 255, 255], 0.08));
  }
  for (let r = 0; r < 14; r++) {
    let rx = rnd() * GW;
    for (let y = earthTop; y < earthTop + 40 + rnd() * 120; y++) {
      rx += (rnd() - 0.5) * 1.8;
      put(g, rx, y, hex('#4A3424'));
    }
  }
  for (let n = 0; n < 40; n++) {
    const sx = rnd() * GW;
    const sy = earthTop + 20 + rnd() * (earthBottom - earthTop - 40);
    disc(g, sx, sy, 2 + Math.floor(rnd() * 4), '#4A3E36', '#3A302A');
  }
  // the old world, buried: a fallen column, a broken sword, a helmet, a scroll case
  const ruin = hex('#6A6060');
  const ruinDark = hex('#4A4444');
  for (let i = 0; i < 70; i++) box(g, 40 + i, 470 + i * 0.12, 1, 14, i % 12 === 0 ? ruinDark : ruin);
  box(g, 36, 466, 6, 22, ruinDark);
  for (let i = 0; i < 44; i++) put(g, 180 + i, 560 - i * 0.5, hex('#8A8A96'));
  box(g, 176, 556, 8, 3, hex('#6A4A2A'));
  disc(g, 90, 640, 8, '#5A5050', '#3A3434');
  box(g, 82, 640, 17, 4, hex('#3A3434'));
  box(g, 190, 700, 30, 8, hex('#5A3A2A'));
  box(g, 190, 700, 4, 8, hex('#B3261E'));
  // the earth gives way to a starry dark
  const voidTop = earthBottom;
  const voidBottom = DESCENT_ARCHIVE_TOP;
  for (let y = voidTop; y < voidBottom; y++)
    for (let x = 0; x < GW; x++) {
      const t = (y - voidTop) / (voidBottom - voidTop);
      g[y][x] = dither(1 - t * 3, x, y) > 0.5 ? mix(earth[3], [5, 4, 10], 0.5) : hex('#05040A');
    }
  for (let n = 0; n < 30; n++) {
    const sx = rnd() * GW;
    const sy = voidTop + rnd() * 90;
    box(g, sx, sy, 2 + rnd() * 4, 2 + rnd() * 3, hex('#1C140E'));
  }
  for (let n = 0; n < 120; n++)
    put(g, rnd() * GW, voidTop + 40 + rnd() * (voidBottom - voidTop - 40), hex(rnd() > 0.6 ? '#FFF4C0' : '#5A568A'));
  // loose pages drifting down toward the Archive
  for (let n = 0; n < 12; n++) {
    const px = 20 + rnd() * 230;
    const py = voidTop + 60 + rnd() * (voidBottom - voidTop - 80);
    box(g, px, py, 6, 4, hex('#E8DCC0'));
    box(g, px + 1, py + 1, 4, 1, hex('#A89878'));
  }
  // the Archive at the bottom, its ceiling fading into the dark
  const room = archive(rnd).base;
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const c = room[y][x];
      g[DESCENT_ARCHIVE_TOP + y][x] = y < 40 && dither(1 - y / 40, x, y) > 0.5 ? hex('#05040A') : c;
    }
  return { base: g, lights: [] };
}

/** A soft glow straight onto a finished grid (no canvas bookkeeping). */
function glowOnto(g, x, y, r, color, s) {
  const c = hex(color);
  for (let j = Math.floor(y - r); j <= y + r; j++)
    for (let i = Math.floor(x - r); i <= x + r; i++) {
      if (j < 0 || j >= GH || i < 0 || i >= GW) continue;
      const d = Math.hypot(i - x, j - y) / r;
      if (d < 1) g[j][i] = mix(g[j][i], c, dither(s * (1 - d) * (1 - d), i, j));
    }
}

/** The eight kings are the Eight Paths: each king's colour, in Path order (Warrior … Ranger). */
const KING_COLORS = ['#FF4D5E', '#FFC940', '#9B74F8', '#F0E6C8', '#2DD4BF', '#FF4FD8', '#FF8A3D', '#4ADE80'];

/** Eight crowned kings on a ridge, arms raised, their power meeting in the sky. */
function kings(rnd) {
  const g = canvas();
  gradient(g, 0, GROUND, ['#12040A', '#3A0A12', '#7A1418', '#C4381E', '#F07A2A']);
  stars(g, rnd, 20, 90);
  layer(g, 1, 0.45, '#C4381E');
  ridge(g, (x) => 300 - 14 * Math.sin(x / 26) - 5 * Math.sin(x / 7), '#2A0A10');
  layer(g, 3);
  const ink = hex('#0A0206');
  const gold = hex('#FFC940');
  const cy = 120;
  for (let k = 0; k < 8; k++) {
    const x = 22 + k * 32;
    const by = 300 - 14 * Math.sin(x / 26) - 5 * Math.sin(x / 7);
    // robe widening to the ground, head, crown, arms raised toward the centre
    for (let y = 0; y < 34; y++) box(g, x - 3 - y / 6, by - 34 + y, 7 + y / 3, 1, ink);
    disc(g, x, by - 39, 4, '#0A0206');
    for (let i = -3; i <= 3; i++) put(g, x + i, by - 44, gold);
    for (const i of [-3, 0, 3]) (put(g, x + i, by - 45, gold), put(g, x + i, by - 46, gold));
    const hx = x + (135 - x) * 0.12;
    const hy = by - 58;
    for (let t = 0; t <= 1; t += 0.05) box(g, x + (hx - x) * t - 1, by - 30 + (hy - by + 30) * t, 2, 2, ink);
    // each king raises their Path's item: sword, coin, staff, lantern, beads, lute, hammer, bow
    const c = KING_COLORS[k];
    const item = hex(c);
    if (k === 0)
      for (let i = 0; i < 12; i++) (put(g, hx, hy - i, hex('#D8D8E0')), i === 3 && box(g, hx - 2, hy - 3, 5, 1, item));
    if (k === 1) disc(g, hx, hy - 4, 3, c, '#B8902E');
    if (k === 2) {
      for (let i = 0; i < 14; i++) put(g, hx, hy - i + 4, hex('#6A4A2A'));
      disc(g, hx, hy - 11, 2, c);
    }
    if (k === 3) (box(g, hx - 2, hy - 7, 5, 6, item), box(g, hx - 1, hy - 9, 3, 2, hex('#6A5A48')));
    if (k === 4) for (let a = 0; a < 8; a++) put(g, hx + Math.cos(a) * 3, hy - 4 + Math.sin(a) * 3, item);
    if (k === 5) {
      disc(g, hx, hy - 3, 3, c, '#8A2A6A');
      for (let i = 0; i < 7; i++) put(g, hx + 1, hy - 6 - i, hex('#6A4A2A'));
    }
    if (k === 6) {
      for (let i = 0; i < 9; i++) put(g, hx, hy - i, hex('#6A4A2A'));
      box(g, hx - 3, hy - 11, 7, 3, item);
    }
    if (k === 7) for (let i = -6; i <= 6; i++) put(g, hx + 2 - Math.round((i * i) / 12), hy - 4 + i, item);
    // and their power streams to the centre
    for (let t = 0; t <= 1; t += 0.01) {
      const px = hx + (135 - hx) * t;
      const py = hy + (cy - hy) * t - Math.sin(t * Math.PI) * 18;
      put(g, px, py, hex(c));
      if (rnd() > 0.6) put(g, px + (rnd() - 0.5) * 3, py + (rnd() - 0.5) * 3, hex(c));
    }
    glow(g, hx, hy, 10, c, 0.6);
  }
  ground(g, rnd, ['#2A0A10', '#1A060A', '#0A0206'], { joints: false, specks: 0.05, speckColor: '#3A1016' });
  const out = finish(g, { lightDir: 0, rimColor: '#FF7A3A', rim: 0.35, vignette: 0.6 });
  // the combined blaze where the eight streams meet
  glowOnto(out.base, 135, cy, 70, '#FFF4DE', 0.8);
  glowOnto(out.base, 135, cy, 30, '#FFFFFF', 0.9);
  return out;
}

/** The world after: the kingdom broken and dark, ash falling, fires burned low. */
function ruin(rnd) {
  const { base } = drawRealm('physical');
  const g = base.map((row) =>
    row.map((c) => {
      const grey = Math.round(c[0] * 0.3 + c[1] * 0.5 + c[2] * 0.2);
      return mix([grey, grey, grey], hex('#1A1216'), 0.55);
    }),
  );
  // knock the tops off the towers and walls: those pixels become sky again
  const sky = g.map((row) => row[3]);
  for (let n = 0; n < 9; n++) {
    const x0 = 48 + rnd() * 160;
    const w = 12 + rnd() * 26;
    const depth = 150 + rnd() * 70;
    for (let x = Math.round(x0); x < x0 + w && x < GW; x++) {
      const cut = depth - 30 * Math.abs(Math.cos(((x - x0) / w) * Math.PI)) + rnd() * 5;
      for (let y = 60; y < cut; y++) g[y][x] = sky[y];
    }
  }
  // rubble heaps along the ground
  for (let n = 0; n < 40; n++)
    disc(g, rnd() * GW, GROUND - 2 + rnd() * 20, 2 + Math.floor(rnd() * 5), '#3A3036', '#241C22');
  // embers, smoke and falling ash
  for (let n = 0; n < 6; n++) glowOnto(g, 20 + rnd() * 230, GROUND - 4, 16, '#8A2A10', 0.4);
  for (let n = 0; n < 220; n++) put(g, rnd() * GW, rnd() * GH, hex(rnd() > 0.85 ? '#FF8A3D' : '#8A8088'));
  return { base: g, lights: [] };
}

/**
 * The eight kings at their round table, lit from below by the candle at its
 * heart, each in their Path's colour. `smile` gives them wide, fixed grins:
 * the intro crossfades to it as the Keeper says they "saved the world".
 */
function council(rnd, { smile = false } = {}) {
  const g = canvas();
  gradient(g, 0, GH, ['#050308', '#0C0710', '#140A18', '#1C0E1E', '#0A0508']);
  // the hall: pillars at the edges, the eight Paths' banners along the back wall
  layer(g, 1);
  for (const x of [0, 246]) box(g, x, 0, 24, 330, hex('#140C16'));
  for (let k = 0; k < 8; k++) {
    const bx = 32 + k * 27;
    const c = mix(hex(KING_COLORS[k]), hex('#0C0710'), 0.55);
    box(g, bx, 90, 16, 80, c);
    for (let i = 0; i < 8; i++) box(g, bx + i, 170 + Math.floor(i / 2), 16 - i * 2, 1, c);
    box(g, bx - 2, 88, 20, 3, hex('#3A2A18'));
  }
  // the floor
  layer(g, 2);
  gradient(g, 290, GH, ['#1A1018', '#100A10', '#060306']);
  const cx = 135;
  const cy = 340;
  const skin = hex('#E0B898');
  const ink = hex('#07040A');
  // the kings, seated around the far side of the table, back to front
  const seats = Array.from({ length: 8 }, (_, k) => {
    const a = Math.PI * (1.08 + (k / 7) * 0.84);
    return { k, x: cx + Math.cos(a) * 106, y: cy - 4 + Math.sin(a) * 50 };
  }).sort((p, q) => p.y - q.y);
  layer(g, 4);
  for (const { k, x, y } of seats) {
    const s = 1.2 + ((y - (cy - 60)) / 60) * 0.3;
    const head = y - 44 * s;
    const robe = mix(hex(KING_COLORS[k]), hex('#07040A'), 0.45);
    for (let j = 0; j < 70 * s; j++) box(g, x - 9 * s - j * 0.25, head + 8 * s + j, 18 * s + j * 0.5, 1, robe);
    box(g, x - 9 * s, head + 8 * s, 18 * s, 3, mix(robe, hex('#FFFFFF'), 0.15));
    // head, lit from below: brighter at the chin
    const r = Math.round(7 * s);
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++)
        if (i * i + j * j <= r * r) put(g, x + i, head + j, mix(skin, hex('#FFB060'), Math.max(0, j / r) * 0.45));
    // crown
    const gold = hex('#FFC940');
    for (let i = -r; i <= r; i++) put(g, x + i, head - r, gold);
    for (let i = -r; i <= r; i += Math.max(2, r)) {
      put(g, x + i, head - r - 1, gold);
      put(g, x + i, head - r - 2, gold);
    }
    // the face
    const ex = Math.max(2, Math.round(3 * s));
    if (!smile) {
      for (const d of [-ex, ex]) put(g, x + d, head - 1, ink);
      for (let i = -2; i <= 2; i++) put(g, x + i, head + Math.round(3 * s), mix(skin, ink, 0.7));
    } else {
      // eyes squeezed into arcs with a glint, and a grin far too wide
      for (const d of [-ex, ex]) {
        put(g, x + d - 1, head - 1, ink);
        put(g, x + d, head - 2, ink);
        put(g, x + d + 1, head - 1, ink);
        put(g, x + d, head - 1, hex('#FF3A2A'));
      }
      const half = Math.round(5.5 * s);
      for (let i = -half; i <= half; i++) {
        const t = i / half;
        const top = head + Math.round(2 * s) + Math.round((1 - t * t) * -0.5);
        const depth = Math.round((1 - t * t) * 3 * s) + 1;
        for (let j = 0; j <= depth; j++) put(g, x + i, top + j, ink);
        if (Math.abs(i) < half && i % 2 === 0) put(g, x + i, top + 1, hex('#F4F0E6'));
      }
      put(g, x - half - 1, head + Math.round(2 * s) - 1, ink);
      put(g, x + half + 1, head + Math.round(2 * s) - 1, ink);
    }
  }
  // the round table in front of them, and the candle at its heart
  layer(g, 5);
  const rx = 96;
  const ry = 34;
  for (let j = 0; j < 16; j++)
    for (let i = -rx; i <= rx; i++) {
      const e = 1 - (i * i) / (rx * rx);
      if (e < 0) continue;
      put(g, cx + i, cy + Math.sqrt(e) * ry + j, hex(j < 3 ? '#4A2E1C' : '#24140C'));
    }
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) {
      const e = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      if (e > 1) continue;
      put(g, cx + i, cy + j, e > 0.9 ? hex('#6A4A2A') : mix(hex('#3A2418'), hex('#2A180E'), dither(e, cx + i, cy + j)));
    }
  box(g, cx - 3, cy - 14, 6, 12, hex('#F3ECDD'));
  box(g, cx - 1, cy - 19, 2, 3, hex('#FFB04A'));
  put(g, cx, cy - 20, hex('#FFF4C0'));
  light(g, cx, cy - 18, '#FFB04A', 120, 0.55);
  for (let n = 0; n < 8; n++) {
    const a = (n / 8) * Math.PI * 2;
    box(g, cx + Math.cos(a) * 62 - 2, cy + Math.sin(a) * 20 - 5, 4, 5, hex('#8A6A30'));
  }
  return finish(g, { lightDir: 0, rimColor: '#FFB04A', rim: 0.3, vignette: 0.75 });
}

export const INTRO_SCENES = {
  council: (rnd) => council(rnd),
  councilSmile: (rnd) => council(rnd, { smile: true }),
  war: (rnd) => war(rnd),
  sleepers: (rnd) => sleepers(rnd),
  forgotten: (rnd) => sleepers(rnd, { overgrown: true }),
  descent: (rnd) => descent(rnd),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync('assets/realms', { recursive: true });
  const lights = {};
  for (const name of REALM_NAMES) {
    const realm = drawRealm(name);
    writeFileSync(`assets/realms/${name}.png`, toPng(realm.base, 6));
    lights[name] = realm.lights.map(([x, y, c]) => [x, y, typeof c === 'string' ? c : toHex(c)]);
  }
  mkdirSync('assets/intro', { recursive: true });
  for (const [name, draw] of Object.entries(INTRO_SCENES))
    writeFileSync(`assets/intro/${name}.png`, toPng(draw(rng(31)).base, 6));
  mkdirSync('assets/cocoon', { recursive: true });
  for (let stage = 0; stage <= 4; stage++) {
    const g = blank(COCOON_CANVAS.width, COCOON_CANVAS.height);
    drawCocoon(g, COCOON_CANVAS.cx, COCOON_CANVAS.by, { cracks: stage / 4, glow: stage >= 3 ? 0.001 : 0 });
    writeFileSync(`assets/cocoon/crack-${stage}.png`, toPng(g, 6));
  }
  const eye = { x: COCOON_CANVAS.cx + EYE.dx, y: COCOON_CANVAS.by + EYE.dy, w: EYE.w, h: EYE.h };
  writeFileSync(
    'src/art/realm-scene.ts',
    `// Generated by scripts/realm-art.mjs. Do not edit by hand.

import type { Dimension } from '@/game';

/** The realm scenes are ${GW}×${GH} pixels; the ground starts at row ${GROUND}. */
export const REALM_ART = { width: ${GW}, height: ${GH}, ground: ${GROUND} };

/** The cocoon picture, ${COCOON_CANVAS.width}×${COCOON_CANVAS.height} pixels, and where its eye opens (centre and size). */
export const COCOON_ART = {
  width: ${COCOON_CANVAS.width},
  height: ${COCOON_CANVAS.height},
  eye: { x: ${eye.x}, y: ${eye.y}, w: ${eye.w}, h: ${eye.h} },
};

/** The intro's descent: ${GW}×${DESCENT_H} pixels, with the Archive's scene starting at row ${DESCENT_ARCHIVE_TOP}. */
export const DESCENT_ART = { width: ${GW}, height: ${DESCENT_H}, archiveTop: ${DESCENT_ARCHIVE_TOP} };

/** Lights that twinkle over each realm: [x, y, colour] in scene pixels. */
export const REALM_LIGHTS: Record<Dimension, [number, number, string][]> = {
${Object.entries(lights)
  .map(([k, v]) => `  ${k}: ${JSON.stringify(v).replace(/"/g, "'")},`)
  .join('\n')}
};
`,
  );
  console.log(
    `Wrote ${REALM_NAMES.length} realms, ${Object.keys(INTRO_SCENES).length} intro scenes, 5 cocoon stages and src/art/realm-scene.ts.`,
  );
}
