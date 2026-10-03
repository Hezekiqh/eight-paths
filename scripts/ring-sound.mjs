// A phone ringing, the old kind: a warbling double trill, twice, like a handset on a hall table,
// synthesized like the game's other chip sounds. The Keeper calls on it (author, Oct 3, 2026: he
// slipped a phone into your pocket).
//
//   node scripts/ring-sound.mjs      writes assets/audio/ring.wav (one ring; the game repeats it)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RATE = 22050;

export function ring(rate = RATE) {
  const burst = 0.4;
  const gap = 0.2;
  const out = new Float32Array(Math.round(rate * (burst * 2 + gap + 0.05)));
  for (const start of [0, burst + gap]) {
    let phase = 0;
    const n = Math.round(burst * rate);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      // the warble: two notes swapping twenty times a second, a square wave at half duty
      const pitch = Math.floor(t * 20) % 2 === 0 ? 1320 : 1660;
      phase += pitch / rate;
      const env = Math.min(1, t * 80) * Math.min(1, (burst - t) * 40);
      const at = Math.round(start * rate) + i;
      if (at < out.length) out[at] += (phase % 1 < 0.5 ? 1 : -1) * env * 0.3;
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
  const out = fileURLToPath(new URL('../assets/audio/ring.wav', import.meta.url));
  writeFileSync(out, wav(ring(), RATE));
  console.log(`Wrote ${out}`);
}
