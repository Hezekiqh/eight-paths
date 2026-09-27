// Draws the app icon, a scroll sealed in red wax stamped with an 8, on a 32×32 pixel grid
// and writes every size the app needs into assets/images/.
// Usage: node scripts/app-icon.mjs

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const N = 32;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const P = {
  bg: hex('#E6CB8E'),
  paper: hex('#F8EACB'),
  paper2: hex('#F0D9A7'),
  roll: hex('#D9B878'),
  roll2: hex('#B8935A'),
  ink: hex('#4A3423'),
  line: hex('#C9A96E'),
  wax: hex('#B42318'),
  wax2: hex('#8A1C12'),
  wax3: hex('#D8452F'),
  mark: hex('#F8EACB'),
  mark2: hex('#E6CB8E'),
};
const g = Array.from({ length: N }, () => Array(N).fill(P.bg));
const rect = (x, y, w, h, c) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < N && j < N) g[j][i] = c;
};
// Scroll sheet with rolled ends top and bottom.
rect(6, 5, 20, 22, P.paper);
rect(6, 5, 1, 22, P.paper2);
rect(25, 5, 1, 22, P.paper2);
rect(4, 3, 24, 3, P.roll);
rect(4, 5, 24, 1, P.roll2);
rect(3, 4, 1, 1, P.roll2);
rect(28, 4, 1, 1, P.roll2);
rect(4, 26, 24, 3, P.roll);
rect(4, 26, 24, 1, P.roll2);
rect(3, 27, 1, 1, P.roll2);
rect(28, 27, 1, 1, P.roll2);
// Ink lines of writing.
for (const [y, w] of [
  [8, 14],
  [10, 11],
  [21, 12],
  [23, 9],
])
  rect(9, y, w, 1, P.line);
// Wax seal: an octagon.
const sealRows = [
  [13, 7],
  [12, 9],
  [11, 11],
  [11, 11],
  [11, 11],
  [11, 11],
  [11, 11],
  [11, 11],
  [12, 9],
  [13, 7],
];
sealRows.forEach(([x, w], k) => rect(x, 11 + k, w, 1, P.wax));
// Seal shading and drips.
rect(12, 12, 2, 1, P.wax3);
rect(11, 13, 1, 2, P.wax3);
rect(20, 19, 2, 1, P.wax2);
rect(21, 17, 1, 2, P.wax2);
rect(14, 21, 1, 2, P.wax);
rect(18, 21, 1, 1, P.wax);
// An 8, for Eight Paths, pressed into the wax.
const eight = ['.XXXXX.', 'XX...XX', 'XX...XX', '.XXXXX.', 'XX...XX', 'XX...XX', 'XX...XX', '.XXXXX.'];
eight.forEach((row, y) =>
  [...row].forEach((c, x) => {
    if (c === 'X') g[12 + y][13 + x] = P.mark;
  }),
);
// Pressed-in shading on the upper-left of each loop.
g[13][13] = P.mark2;
g[16][13] = P.mark2;
// Ink outline around every non-background shape.
const out = g.map((row) => row.slice());
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    if (g[y][x] !== P.bg) continue;
    if (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== P.bg)
    )
      out[y][x] = P.ink;
  }
const isBg = (c) => c === P.bg;

/**
 * Renders the grid at `k` pixels per cell, centred on a `size` canvas.
 * `mode`: 'full' paints the background, 'art' leaves it transparent,
 * 'mask' paints the art white on transparent (Android's monochrome icon).
 */
function render(size, k, mode) {
  const png = new PNG({ width: size, height: size });
  const off = Math.floor((size - N * k) / 2);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / k),
        gy = Math.floor((y - off) / k);
      const c = out[gy]?.[gx] ?? P.bg;
      const i = (y * size + x) * 4;
      if (mode !== 'full' && isBg(c)) continue;
      const rgb = mode === 'mask' ? [255, 255, 255] : c;
      png.data[i] = rgb[0];
      png.data[i + 1] = rgb[1];
      png.data[i + 2] = rgb[2];
      png.data[i + 3] = 255;
    }
  return PNG.sync.write(png);
}

function solid(size, c) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = c[0];
    png.data[i + 1] = c[1];
    png.data[i + 2] = c[2];
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

const dir = 'assets/images';
writeFileSync(`${dir}/icon.png`, render(1024, 32, 'full'));
writeFileSync(`${dir}/splash-icon.png`, render(1024, 32, 'art'));
// Android crops adaptive icons to a circle or squircle: keep the art in the middle two thirds.
writeFileSync(`${dir}/android-icon-foreground.png`, render(1024, 20, 'art'));
writeFileSync(`${dir}/android-icon-background.png`, solid(1024, P.bg));
writeFileSync(`${dir}/android-icon-monochrome.png`, render(1024, 20, 'mask'));
writeFileSync(`${dir}/favicon.png`, render(48, 1, 'full'));
console.log('Wrote the app icon and its variants.');
