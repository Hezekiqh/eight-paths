// Imports pixel art (for example a PixelLab export) into assets/sprites/.
//
// iOS scales images smoothly, which blurs pixel art, so every sprite is
// enlarged here with nearest-neighbour scaling. Shown at a whole number of
// points per art pixel, it then stays sharp on every screen.
//
// Usage:
//   node scripts/import-sprite.mjs <input> <character> <name> [--frames N] [--scale 12]
//
// <input> is one PNG (a single image, or a horizontal strip of N equal frames
// with --frames N), or a folder of frame PNGs, which are joined left to right
// in filename order. Output: assets/sprites/<character>/<name>.png, plus the
// entry to paste into src/art/sprites.ts.

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return Number(value);
};
const scale = option('--scale', 12);
let frames = option('--frames', 0);
const [input, character, name] = args;

if (!input || !character || !name || !Number.isInteger(scale) || scale < 1) {
  console.error('Usage: node scripts/import-sprite.mjs <input> <character> <name> [--frames N] [--scale 12]');
  process.exit(1);
}

const read = (path) => PNG.sync.read(readFileSync(path));

let sheet;
if (statSync(input).isDirectory()) {
  const files = readdirSync(input)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (files.length === 0) throw new Error(`No PNGs in ${input}`);
  const images = files.map((f) => read(join(input, f)));
  const { width, height } = images[0];
  if (images.some((img) => img.width !== width || img.height !== height)) {
    throw new Error('Every frame in the folder must be the same size');
  }
  sheet = new PNG({ width: width * images.length, height });
  images.forEach((img, i) => PNG.bitblt(img, sheet, 0, 0, width, height, i * width, 0));
  frames = images.length;
} else {
  sheet = read(input);
  frames ||= 1;
}

if (sheet.width % frames !== 0) {
  throw new Error(`Width ${sheet.width} does not split into ${frames} equal frames`);
}

const out = new PNG({ width: sheet.width * scale, height: sheet.height * scale });
for (let y = 0; y < out.height; y++) {
  for (let x = 0; x < out.width; x++) {
    const from = (Math.floor(y / scale) * sheet.width + Math.floor(x / scale)) * 4;
    sheet.data.copy(out.data, (y * out.width + x) * 4, from, from + 4);
  }
}

const dir = join('assets', 'sprites', character);
mkdirSync(dir, { recursive: true });
const path = join(dir, `${name}.png`);
writeFileSync(path, PNG.sync.write(out));

const frameWidth = sheet.width / frames;
console.log(`Wrote ${path} (${frames} frame${frames === 1 ? '' : 's'} of ${frameWidth}×${sheet.height}, ×${scale})`);
console.log('\nAdd to src/art/sprites.ts:\n');
console.log(
  `${name}: { source: require('@/assets/sprites/${character}/${name}.png'), width: ${frameWidth}, height: ${sheet.height}, frames: ${frames}${frames > 1 ? ', fps: 4' : ''} },`,
);
