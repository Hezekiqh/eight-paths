// A giant's footfall (author, Oct 8, 2026: Aurek the Tall walking up into the Kaloseum): a deep thump that drops in
// pitch, a crunch of stone and grit on top, and a low rumble after. Phones can't play the very bottom of it, so the
// thump carries harmonics an octave and a fifth up, where a phone speaker can say it. Synthesized like the game's
// other chip sounds; the episodes play the same file.
//
//   node scripts/stomp-sound.mjs      writes assets/audio/stomp.wav

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RATE = 22050;

export function stomp(rate = RATE) {
  const len = 0.9;
  const out = new Float32Array(Math.round(rate * len));
  let phase = 0;
  // a fixed seed: the same stomp every time
  let seed = 7;
  const noise = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    // the thump: 90 Hz falling to 38 Hz over a fifth of a second
    const freq = 38 + 52 * Math.exp(-t * 14);
    phase += freq / rate;
    const body = Math.sin(2 * Math.PI * phase) + 0.55 * Math.sin(4 * Math.PI * phase) + 0.3 * Math.sin(6 * Math.PI * phase);
    const thump = body * Math.min(1, t * 400) * Math.exp(-t * 7);
    // the crunch: a burst of noise, softened, gone in a tenth of a second
    low += (noise() - low) * 0.25;
    const crunch = low * Math.exp(-t * 30) * 0.9;
    // the rumble after: slow noise under it all
    const rumble = low * 0.25 * Math.exp(-t * 3) * Math.min(1, t * 10);
    out[i] = Math.tanh((thump * 0.8 + crunch + rumble) * 1.4) * 0.85;
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
  const out = fileURLToPath(new URL('../assets/audio/stomp.wav', import.meta.url));
  writeFileSync(out, wav(stomp(), RATE));
  console.log(`Wrote ${out}`);
}
