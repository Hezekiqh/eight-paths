// Synthesises stand-ins for every sound the app plays, into assets/audio/,
// so the audio system works before the real soundtrack arrives: a few
// chiptune effects, and quiet piano-like pieces for the music (encoded to
// .m4a with ffmpeg, which must be installed). Replace a file with a real one
// of the same name (and update src/audio/sounds.ts if the extension changes).
// Rerun: node scripts/placeholder-audio.mjs (add --effects to skip the music)

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const OUT = 'assets/audio';

/** A note name like 'C4' or 'F#5' to its frequency; null is a rest. */
const freq = (note) => {
  if (!note) return 0;
  const [, name, octave] = note.match(/^([A-G]#?)(\d)$/);
  const steps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(name);
  return 440 * 2 ** ((steps - 9) / 12 + (Number(octave) - 4));
};

const waves = {
  square: (t) => (t % 1 < 0.5 ? 1 : -1),
  pulse: (t) => (t % 1 < 0.25 ? 1 : -1),
  triangle: (t) => 1 - 4 * Math.abs((t % 1) - 0.5),
  sine: (t) => Math.sin(2 * Math.PI * t),
  // A crunchy burst for hits; changes value 32 times a cycle, so `f` sets its grit.
  noise: (t) => {
    const k = Math.floor(t * 32);
    const x = Math.sin(k * 12.9898) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  },
};

/** Adds a note into `buf`: wave, start and length in seconds, volume, a short attack and release. */
function note(buf, { f, at, len, vol = 0.3, wave = 'square', slide = 0 }) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(len * RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const env = Math.min(1, i / (RATE * 0.005), (n - i) / (RATE * 0.03));
    phase += (f + slide * (i / n)) / RATE;
    buf[start + i] += waves[wave](phase) * vol * env;
  }
}

/** Plays a list of notes one after another, each `step` seconds long. */
function melody(buf, notes, { at = 0, step, gate = 0.9, ...rest }) {
  notes.forEach((name, i) => {
    if (name) note(buf, { f: freq(name), at: at + i * step, len: step * gate, ...rest });
  });
}

function wav(name, seconds, draw, dir = OUT) {
  const buf = new Float32Array(Math.ceil(seconds * RATE));
  draw(buf);
  const data = Buffer.alloc(buf.length * 2);
  buf.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(`${dir}/${name}.wav`, Buffer.concat([head, data]));
}

mkdirSync(OUT, { recursive: true });

// Sound effects.
wav('quest', 0.3, (b) => melody(b, ['E5', 'B5'], { step: 0.12, vol: 0.25 }));
wav('level-up', 0.8, (b) => melody(b, ['C5', 'E5', 'G5', 'C6', null, 'C6'], { step: 0.11, vol: 0.25 }));
wav('hatch', 1.6, (b) => {
  melody(b, ['G4', 'C5', 'E5', 'G5', 'E5', 'G5'], { step: 0.1, vol: 0.22 });
  note(b, { f: freq('C6'), at: 0.62, len: 0.9, vol: 0.25 });
  note(b, { f: freq('C4'), at: 0.62, len: 0.9, vol: 0.25, wave: 'triangle' });
});
wav('heartbeat', 0.45, (b) => {
  note(b, { f: 70, at: 0, len: 0.12, vol: 0.7, wave: 'sine', slide: -30 });
  note(b, { f: 60, at: 0.17, len: 0.14, vol: 0.6, wave: 'sine', slide: -25 });
});

// Combat in the World: short and punchy, so they can fire often.
wav('swing', 0.1, (b) => note(b, { f: 900, at: 0, len: 0.08, vol: 0.12, wave: 'noise', slide: -700 }));
wav('hit', 0.12, (b) => {
  note(b, { f: 1400, at: 0, len: 0.05, vol: 0.3, wave: 'noise', slide: -800 });
  note(b, { f: 220, at: 0, len: 0.08, vol: 0.25, wave: 'square', slide: -120 });
});
wav('kill', 0.35, (b) => {
  note(b, { f: 700, at: 0, len: 0.25, vol: 0.3, wave: 'noise', slide: -600 });
  note(b, { f: 330, at: 0, len: 0.2, vol: 0.2, wave: 'square', slide: -250 });
  note(b, { f: 880, at: 0.12, len: 0.1, vol: 0.12, wave: 'pulse' });
});
wav('hurt', 0.3, (b) => {
  note(b, { f: 180, at: 0, len: 0.22, vol: 0.35, wave: 'square', slide: -110 });
  note(b, { f: 500, at: 0, len: 0.1, vol: 0.2, wave: 'noise', slide: -400 });
});

// Voices: a blip per letter in the World's dialogue, one pitch per kind of
// speaker, low to high (like Undertale's).
[110, 165, 247, 330, 494].forEach((f, i) =>
  wav(`blip-${i + 1}`, 0.05, (b) => note(b, { f, at: 0, len: 0.04, vol: 0.14, wave: 'pulse' })),
);

if (process.argv.includes('--effects')) process.exit(0);

// Music: slow, sparse piano-like pieces with an echo, in the spirit of
// Minecraft's soundtrack. Each plays once and gives way to silence; only the
// intro loops.

/** A soft struck note: a few harmonics fading away, like a felt piano. */
function piano(buf, f, at, { vol = 0.2, len = 4 } = {}) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(len * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 1.6);
    const s =
      Math.sin(2 * Math.PI * f * t) +
      0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 2) +
      0.12 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 3);
    buf[start + i] += s * env * vol;
  }
}

/** A room around the notes: a soft repeating echo. */
function echo(buf, { delay = 0.42, feedback = 0.38 } = {}) {
  const d = Math.floor(delay * RATE);
  for (let i = d; i < buf.length; i++) buf[i] += buf[i - d] * feedback;
}

/** A seeded random, so the placeholders come out the same every run. */
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/**
 * A piece: a slow chord progression, one low note per chord, and a few
 * scattered notes from the scale over it, with long rests between.
 */
function piece(buf, { chords, scale, bar, seed, vol = 0.16 }) {
  const rand = seeded(seed);
  chords.forEach((chord, i) => {
    const at = i * bar;
    piano(buf, freq(chord[0]) / 2, at, { vol: vol * 0.9, len: bar + 1 });
    chord.slice(1).forEach((n, k) => piano(buf, freq(n), at + k * 0.09, { vol: vol * 0.5, len: bar }));
    let t = at + 0.8 + rand() * 0.8;
    while (t < at + bar - 0.6) {
      if (rand() < 0.7) piano(buf, freq(scale[Math.floor(rand() * scale.length)]), t, { vol });
      t += 0.9 + rand() * 1.6;
    }
  });
  echo(buf);
  const peak = buf.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  for (let i = 0; i < buf.length; i++) buf[i] *= 0.8 / peak;
}

/** Writes a piece to a temporary .wav and compresses it to .m4a. */
function music(name, seconds, draw) {
  const tmp = `${OUT}/.tmp`;
  mkdirSync(tmp, { recursive: true });
  wav(name, seconds, draw, tmp);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${tmp}/${name}.wav`, '-c:a', 'aac', '-b:a', '64k', `${OUT}/${name}.m4a`]);
  rmSync(tmp, { recursive: true });
}

const C_MAJOR = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E4', 'G4', 'A4'];
const A_MINOR = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'E4'];
const D_DORIAN = ['D4', 'E4', 'F4', 'A4', 'C5', 'D5'];

// The intro: a slow minor theme under the Keeper's telling, looped.
music('intro', 25.6, (b) =>
  piece(b, { chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['E3', 'G#3', 'B3']], scale: A_MINOR, bar: 6.4, seed: 7 }),
);
// Home: warm and unhurried, for the tabs.
music('home-1', 38.4, (b) =>
  piece(b, { chords: [['C3', 'E4', 'G4'], ['A2', 'C4', 'E4'], ['F2', 'A3', 'C4'], ['G2', 'B3', 'D4'], ['C3', 'E4', 'G4'], ['F2', 'A3', 'C4']], scale: C_MAJOR, bar: 6.4, seed: 11 }),
);
music('home-2', 38.4, (b) =>
  piece(b, { chords: [['F2', 'A3', 'C4'], ['C3', 'E4', 'G4'], ['D3', 'F4', 'A4'], ['A2', 'C4', 'E4'], ['F2', 'A3', 'C4'], ['G2', 'B3', 'D4']], scale: C_MAJOR, bar: 6.4, seed: 23 }),
);
// The World: lower and darker, for the Archive and the caves under it.
music('world-1', 44.8, (b) =>
  piece(b, { chords: [['D2', 'F3', 'A3'], ['A#1', 'D3', 'F3'], ['C2', 'E3', 'G3'], ['A1', 'C3', 'E3'], ['D2', 'F3', 'A3']], scale: D_DORIAN, bar: 8.96, seed: 5, vol: 0.14 }),
);
music('world-2', 44.8, (b) =>
  piece(b, { chords: [['A1', 'C3', 'E3'], ['F1', 'A2', 'C3'], ['G1', 'B2', 'D3'], ['E1', 'G#2', 'B2'], ['A1', 'C3', 'E3']], scale: A_MINOR.map((n) => n.replace(/\d/, (o) => o - 1)), bar: 8.96, seed: 42, vol: 0.14 }),
);
