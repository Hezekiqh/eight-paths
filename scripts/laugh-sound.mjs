// A laugh, "HA HA HA HA HA HA!", synthesized like the game's other chip sounds: each HA is a breath
// of noise (the h) and a square wave sliding down (the a), the pitch tumbling lower syllable by
// syllable. Felix laughs it as he dashes off (author, Oct 3, 2026: make the laughter audible).
//
//   node scripts/laugh-sound.mjs      writes assets/audio/laugh.wav

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
/** Seconds the whole laugh lasts (the World's and the episodes' laugh is 1.4s; it ends just inside). */
const SYLLABLES = 6;
const STEP = 0.2;

export function laugh(rate = RATE) {
  const out = new Float32Array(Math.round(rate * (SYLLABLES * STEP + 0.15)));
  let reg = 1;
  for (let s = 0; s < SYLLABLES; s++) {
    const start = Math.round(s * STEP * rate);
    // the first HA is the loudest and highest; each after a little lower and softer
    const top = 560 * Math.pow(0.93, s);
    const gain = 0.55 * Math.pow(0.9, s);
    const h = 0.03;
    const a = 0.13;
    let phase = 0;
    for (let i = 0; i < Math.round((h + a) * rate); i++) {
      const t = i / rate;
      let v;
      if (t < h) {
        // the h: noise from a shift register, quick in and out
        const bit = (reg ^ (reg >> 1)) & 1;
        reg = (reg >> 1) | (bit << 14);
        v = ((reg & 1) * 2 - 1) * 0.35 * Math.sin((Math.PI * t) / h);
      } else {
        // the a: a quarter-duty square sliding down a few semitones, a wobble on top
        const k = (t - h) / a;
        const pitch = top * (1 - 0.18 * k) * (1 + 0.02 * Math.sin(2 * Math.PI * 22 * t));
        phase += pitch / rate;
        const env = Math.min(1, k * 12) * Math.pow(1 - k, 1.4);
        v = (phase % 1 < 0.25 ? 1 : -1) * env;
      }
      if (start + i < out.length) out[start + i] += v * gain;
    }
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
  const out = fileURLToPath(new URL('../assets/audio/laugh.wav', import.meta.url));
  writeFileSync(out, wav(laugh(), RATE));
  console.log(`Wrote ${out}`);
}
