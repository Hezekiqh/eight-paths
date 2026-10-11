// A star twinkling far off in the sky (author, Oct 11, 2026: Balderek blasted out of the Kaloseum, gone with a
// twinkle): a bright little bell, two clean partials, a quick sparkle on top, ringing away. Synthesized like the
// game's other chip sounds; the episodes play the same file.
//
//   node scripts/ding-sound.mjs      writes assets/audio/ding.wav

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RATE = 22050;

export function ding(rate = RATE) {
  const len = 0.8;
  const out = new Float32Array(Math.round(rate * len));
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const attack = Math.min(1, t * 600);
    // the bell: 1760 Hz, a partial at 2.76x (a bell's, not a chord's), and a quick sparkle an octave up
    const bell = Math.sin(2 * Math.PI * 1760 * t) * Math.exp(-t * 5);
    const ring = 0.35 * Math.sin(2 * Math.PI * 1760 * 2.76 * t) * Math.exp(-t * 9);
    const sparkle = 0.3 * Math.sin(2 * Math.PI * 3520 * t) * Math.exp(-t * 22);
    out[i] = (bell + ring + sparkle) * attack * 0.5;
  }
  return out;
}

function wav(samples, rate) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + samples.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL('../assets/audio/ding.wav', import.meta.url));
  writeFileSync(out, wav(ding(), RATE));
  console.log(`Wrote ${out}`);
}
