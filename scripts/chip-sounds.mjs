// 8-bit sound effects for the ads, synthesized like an old handheld's sound chip: square
// waves with a set duty cycle, and a noise channel from a shift register. Low and chunky on
// purpose. Every melody here is original.
//
//   import { chipSounds } from './chip-sounds.mjs';
//   const bank = chipSounds(22050);   // { name: Float32Array (−1…1), … }

/** A note name ("C4", "F#3") as its frequency in Hz. */
const NOTES = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
const hz = (n) => {
  const m = n.match(/^([A-G]#?)(\d)$/);
  return 440 * Math.pow(2, (NOTES[m[1]] + (Number(m[2]) - 4) * 12) / 12);
};

/** How long the XP bar takes to fill in the ads (ad-video.mjs habit `evolve`). */
export const FILL = 0.45;

export function chipSounds(RATE) {
  const len = (s) => Math.round(s * RATE);

  /** A square wave whose pitch (Hz) and loudness (0…1) follow the given functions of time (0…1 through the sound). */
  function square(seconds, pitch, loud, duty = 0.5) {
    const out = new Float32Array(len(seconds));
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const k = i / out.length;
      phase += pitch(k) / RATE;
      out[i] = (phase % 1 < duty ? 1 : -1) * loud(k);
    }
    return out;
  }
  /** The noise channel: a 15-bit shift register clocked at `rate(k)` Hz (lower is rumblier). */
  function noise(seconds, rate, loud) {
    const out = new Float32Array(len(seconds));
    let reg = 1;
    let acc = 0;
    let bit = 1;
    for (let i = 0; i < out.length; i++) {
      const k = i / out.length;
      acc += rate(k) / RATE;
      while (acc >= 1) {
        acc -= 1;
        const fb = (reg ^ (reg >> 1)) & 1;
        reg = (reg >> 1) | (fb << 14);
        bit = reg & 1;
      }
      out[i] = (bit ? 1 : -1) * loud(k);
    }
    return out;
  }
  /** Notes one after another: [note, seconds, duty?]; null is a rest. */
  function tune(notes, loud = 0.5) {
    const parts = notes.map(([n, s, duty = 0.25]) =>
      n ? square(s, () => hz(n), (k) => loud * (k < 0.85 ? 1 : (1 - k) / 0.15), duty) : new Float32Array(len(s)),
    );
    return join(parts);
  }
  function join(parts) {
    const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  }
  /** Lays b over a, from `at` seconds in. */
  function over(a, b, at = 0) {
    const out = new Float32Array(Math.max(a.length, len(at) + b.length));
    out.set(a);
    for (let i = 0; i < b.length; i++) out[len(at) + i] += b[i];
    return out;
  }
  const fade = (k) => Math.min(1, k * 20) * (1 - k);

  return {
    // ---- the habit and the level
    /** The box ticked: two quick low blips. */
    tick: tune([['G3', 0.04, 0.5], [null, 0.02], ['D4', 0.06, 0.5]], 0.45),
    /** XP pouring into the bar: one soft tone gliding up while the bar fills (FILL seconds), quiet under everything. */
    xpfill: (() => {
      const out = new Float32Array(len(FILL));
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const k = i / out.length;
        phase += (220 * Math.pow(2, k * 1.25)) / RATE;
        const tri = 4 * Math.abs((phase % 1) - 0.5) - 1; // a triangle: the soft channel
        out[i] = tri * 0.14 * Math.min(1, k * 10) * (k > 0.9 ? (1 - k) / 0.1 : 1);
      }
      return out;
    })(),
    /** The level lands: one clean ding, ringing out. */
    ding: (() => {
      const out = new Float32Array(len(0.9));
      for (let i = 0; i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t * 400) * Math.exp(-t * 5.5);
        out[i] = env * (0.26 * Math.sin(2 * Math.PI * 1318.5 * t) + 0.08 * Math.sin(2 * Math.PI * 2637 * t) + 0.04 * Math.sin(2 * Math.PI * 3955.5 * t));
      }
      return out;
    })(),
    /** "NEW MOVE!": a low two-note sting. */
    newmove: tune([['A#3', 0.08, 0.5], ['F4', 0.16, 0.5]], 0.4),

    // ---- attacks: low and chunky
    /** Gathering the move: a low hum climbing for 0.75s, wobbling faster as it fills. */
    load: square(
      0.75,
      (k) => 55 * Math.pow(2, k * 1.7) * (1 + 0.04 * Math.sin(k * (30 + 90 * k))),
      (k) => 0.38 * Math.min(1, k * 6),
      0.5,
    ),
    /** Letting it go: a deep thump with a crunch on top. */
    fire: over(
      square(0.16, (k) => 140 * (1 - 0.6 * k), (k) => 0.55 * (1 - k), 0.5),
      noise(0.1, (k) => 2600 * (1 - 0.7 * k), (k) => 0.3 * (1 - k)),
    ),
    /** A blow landing: short low crunch. */
    thit: over(
      noise(0.09, () => 1500, (k) => 0.45 * (1 - k)),
      square(0.07, (k) => 110 * (1 - 0.4 * k), (k) => 0.35 * (1 - k), 0.5),
    ),
    /** Wrench on armour: a dull low ring. */
    clunk: over(square(0.16, (k) => 165 * (1 - 0.15 * k), (k) => 0.4 * (1 - k), 0.25), noise(0.04, () => 3000, (k) => 0.25 * (1 - k))),
    /** Enemies going down: a low falling poof. */
    tkill: over(
      noise(0.32, (k) => 1800 * (1 - 0.85 * k), (k) => 0.45 * fade(k)),
      square(0.22, (k) => 98 * (1 - 0.5 * k), (k) => 0.3 * (1 - k), 0.5),
    ),
    /** Oren's palm: the biggest, lowest thump. */
    boom: over(
      square(0.3, (k) => 90 * (1 - 0.65 * k), (k) => 0.6 * (1 - k), 0.5),
      noise(0.28, (k) => 900 * (1 - 0.8 * k), (k) => 0.4 * (1 - k)),
    ),
    /** Brannoc's hop back: a little low boing. */
    hop: square(0.12, (k) => 130 + 160 * Math.sin(k * Math.PI), (k) => 0.3 * (1 - k), 0.25),
    /** Wren's heart back: a soft low two-note rise. */
    mend: tune([['E4', 0.07], ['B4', 0.16]], 0.35),

    // ---- the end card
    /** 8 PATHS lands: a low chord stab, struck and let ring. */
    brand: over(
      over(square(0.6, () => hz('C3'), (k) => 0.25 * (1 - k), 0.5), square(0.6, () => hz('G3'), (k) => 0.2 * (1 - k), 0.25)),
      square(0.6, () => hz('C4'), (k) => 0.16 * (1 - k), 0.125),
    ),
  };
}
