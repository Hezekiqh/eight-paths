// The habit RPG ad: vertical 1080×1920 at 30fps, drawn on the same 270×480
// pixel art as the app (realms, sprites, the cocoon), so every shot is full
// frame and matches the game. One idea, shown over and over: a real habit →
// XP → your hero levels up.
//
//   node scripts/ad-video.mjs 30 out-30.mp4      # 30s, 15s or 6s cut
//   CTA='FREE ON THE|APP STORE' node scripts/ad-video.mjs 15 out.mp4
//   node scripts/ad-video.mjs sig-moss out.mp4     # a hero's signature move (signatures.ts)
//
// Needs ffmpeg. No music on purpose (add a trending sound in TikTok/Reels): 8-bit effects
// (chip-sounds.mjs) play on the action, and characters who talk blip in their game voices.
// Text is centred and kept clear of TikTok's bottom caption.

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

import { FILL, chipSounds } from './chip-sounds.mjs';
import { COCOON_H, EYE, GH, GROUND, GW, box, drawCocoon, drawRealm, hex, mix, put } from './realm-art.mjs';

const [cut = '30', out = `ad-${cut}s.mp4`] = process.argv.slice(2);
const CTA = (process.env.CTA ?? 'COMING SOON TO|THE APP STORE').split('|');
const K = 4;
const W = GW * K;
const H = GH * K;
const FPS = 30;
const WHITE = [255, 255, 255];
const INK = [7, 6, 11];
const GOLD = hex('#FFE066');
const CREAM = hex('#F3E6C4');
/** Centre line for text and UI: the frame's centre. */
const UX = GW / 2;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const rng = (s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;

// The Paths, in the app's colours: neon for light on dark, ink for text on the parchment cards.
const PATHS = {
  physical: { cls: 'WARRIOR', neon: '#FF4D5E', ink: '#B3261E' },
  financial: { cls: 'NOBLE', neon: '#FFC940', ink: '#8A5A00' },
  intellectual: { cls: 'MAGE', neon: '#9B74F8', ink: '#5B3FB5' },
  spiritual: { cls: 'CLERIC', neon: '#F0E6C8', ink: '#2F6F8F' },
  emotional: { cls: 'MONK', neon: '#2DD4BF', ink: '#0F766E' },
  social: { cls: 'BARD', neon: '#FF4FD8', ink: '#A21C70' },
  occupational: { cls: 'ARTIFICER', neon: '#FF8A3D', ink: '#B4490A' },
  environmental: { cls: 'RANGER', neon: '#4ADE80', ink: '#276B2B' },
};

// ---- a 5×7 pixel font (the hatch video's, plus punctuation)
// prettier-ignore
const F = {A:['.XXX.','X...X','X...X','XXXXX','X...X','X...X','X...X'],B:['XXXX.','X...X','X...X','XXXX.','X...X','X...X','XXXX.'],C:['.XXX.','X...X','X....','X....','X....','X...X','.XXX.'],D:['XXXX.','X...X','X...X','X...X','X...X','X...X','XXXX.'],E:['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],F:['XXXXX','X....','X....','XXXX.','X....','X....','X....'],G:['.XXX.','X...X','X....','X.XXX','X...X','X...X','.XXX.'],H:['X...X','X...X','X...X','XXXXX','X...X','X...X','X...X'],I:['XXXXX','..X..','..X..','..X..','..X..','..X..','XXXXX'],J:['..XXX','...X.','...X.','...X.','X..X.','X..X.','.XX..'],K:['X...X','X..X.','X.X..','XX...','X.X..','X..X.','X...X'],L:['X....','X....','X....','X....','X....','X....','XXXXX'],M:['X...X','XX.XX','X.X.X','X.X.X','X...X','X...X','X...X'],N:['X...X','XX..X','X.X.X','X..XX','X...X','X...X','X...X'],O:['.XXX.','X...X','X...X','X...X','X...X','X...X','.XXX.'],P:['XXXX.','X...X','X...X','XXXX.','X....','X....','X....'],Q:['.XXX.','X...X','X...X','X...X','X.X.X','X..X.','.XX.X'],R:['XXXX.','X...X','X...X','XXXX.','X.X..','X..X.','X...X'],S:['.XXXX','X....','X....','.XXX.','....X','....X','XXXX.'],T:['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],U:['X...X','X...X','X...X','X...X','X...X','X...X','.XXX.'],V:['X...X','X...X','X...X','X...X','X...X','.X.X.','..X..'],W:['X...X','X...X','X...X','X.X.X','X.X.X','X.X.X','.X.X.'],X:['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],Y:['X...X','X...X','.X.X.','..X..','..X..','..X..','..X..'],Z:['XXXXX','....X','...X.','..X..','.X...','X....','XXXXX'],0:['.XXX.','X...X','X..XX','X.X.X','XX..X','X...X','.XXX.'],1:['..X..','.XX..','..X..','..X..','..X..','..X..','.XXX.'],2:['.XXX.','X...X','....X','...X.','..X..','.X...','XXXXX'],3:['XXXX.','....X','....X','.XXX.','....X','....X','XXXX.'],4:['...X.','..XX.','.X.X.','X..X.','XXXXX','...X.','...X.'],5:['XXXXX','X....','XXXX.','....X','....X','X...X','.XXX.'],6:['.XXX.','X....','X....','XXXX.','X...X','X...X','.XXX.'],7:['XXXXX','....X','...X.','..X..','.X...','.X...','.X...'],8:['.XXX.','X...X','X...X','.XXX.','X...X','X...X','.XXX.'],9:['.XXX.','X...X','X...X','.XXXX','....X','....X','.XXX.'],'!':['..X..','..X..','..X..','..X..','..X..','.....','..X..'],'#':['.X.X.','.X.X.','XXXXX','.X.X.','XXXXX','.X.X.','.X.X.'],'.':['.....','.....','.....','.....','.....','.....','..X..'],"'":['..X..','..X..','.....','.....','.....','.....','.....'],' ':['.....','.....','.....','.....','.....','.....','.....'],'·':['.....','.....','.....','..X..','.....','.....','.....'],'+':['.....','..X..','..X..','XXXXX','..X..','..X..','.....'],',':['.....','.....','.....','.....','.....','..X..','.X...'],'?':['.XXX.','X...X','....X','...X.','..X..','.....','..X..'],'-':['.....','.....','.....','XXXXX','.....','.....','.....'],':':['.....','..X..','.....','.....','.....','..X..','.....'],'@':['.XXX.','X...X','X.XXX','X.X.X','X.XXX','X....','.XXXX'],'/':['....X','....X','...X.','..X..','.X...','X....','X....'],'>':['X....','.X...','..X..','...X.','..X..','.X...','X....']};
const textW = (s, sc) => s.length * 6 * sc - sc;
/** Text with its left edge at x; `count` letters shown, for typing; an ink outline keeps it readable on any scene. */
const textL = (g, s, sc, x, y, c, { count = s.length, outline = true } = {}) => {
  const o = Math.max(1, Math.round(sc / 2));
  for (const pass of outline ? [0, 1] : [1]) {
    let cx = x;
    [...s].slice(0, count).forEach((ch) => {
      (F[ch] ?? F[' ']).forEach((row, r) =>
        [...row].forEach((p, col) => {
          if (p !== 'X') return;
          const px = cx + col * sc;
          const py = y + r * sc;
          if (pass === 0) box(g, px - o, py - o, sc + o * 2, sc + o * 2 + o, INK);
          else box(g, px, py, sc, sc, c);
        }),
      );
      cx += 6 * sc;
    });
  }
};
const text = (g, s, sc, y, c, opts = {}) => textL(g, s, sc, Math.round((opts.cx ?? UX) - textW(s, sc) / 2), y, c, opts);
/** The big lines at the top of the frame. */
const headline = (ui, lines, y = 46) =>
  lines.forEach(([s, c], i) => text(ui, s, 3, y + i * 28, c ?? WHITE));

// ---- sprites (assets/sprites/<id>/idle.png: 32×48 frames drawn at 12×)
const SHEETS = {};
const sheet = (id) => (SHEETS[id] ??= PNG.sync.read(readFileSync(`assets/sprites/${id}/idle.png`)));
/** A character, bottom centre at (cx, by). `white` flashes it, `tint`/`amt` shades it, `fade` dithers it away. */
function sprite(g, id, frame, sc, cx, by, { white = 0, tint = null, amt = 0, fade = 0 } = {}) {
  const sh = sheet(id);
  const frames = Math.max(1, Math.round(sh.width / (32 * 12)));
  for (let y = 0; y < 48 * sc; y++)
    for (let x = 0; x < 32 * sc; x++) {
      const i = (Math.floor(y / sc) * 12 * sh.width + Math.floor(x / sc) * 12 + (frame % frames) * 32 * 12) * 4;
      if (sh.data[i + 3] < 128) continue;
      if (fade > 0 && ((x * 7 + y * 13) % 17) / 17 < fade) continue;
      let c = [sh.data[i], sh.data[i + 1], sh.data[i + 2]];
      if (tint) c = mix(c, tint, amt);
      if (white) c = mix(c, WHITE, white);
      put(g, cx - 16 * sc + x, by - 48 * sc + y, c);
    }
}
const STAR = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '.XX...XX.', '.X.....X.'];
const stars = (g, n, y, c = WHITE) => {
  for (let s = 0; s < n; s++) {
    const x0 = Math.round(UX + (s - (n - 1) / 2) * 13 - 4);
    STAR.forEach((row, r) => [...row].forEach((p, col) => p === 'X' && put(g, x0 + col, y + r, c)));
  }
};
const sparkle = (g, x, y, s, c) => {
  box(g, x - s, y, s * 2 + 1, 1, c);
  box(g, x, y - s, 1, s * 2 + 1, c);
};

// ---- scenes: each is { dur, frame(t) → { scene, ui, cam } }
const REALMS = {};
const realm = (path) => (REALMS[path] ??= drawRealm(path));
const blankUi = () => Array.from({ length: GH }, () => Array(GW).fill(null));
/** A realm with its lights twinkling, optionally darkened toward `shade`. */
function backdrop(path, t, { dark = 0, shade = INK } = {}) {
  const r = realm(path);
  const g = r.base.map((row) => (dark ? row.map((c) => mix(c, shade, dark)) : row.slice()));
  r.lights.forEach(([x, y, c], n) => {
    if (Math.sin(t * 3 + n * 1.7) > 0.2) {
      const col = mix(hex(c), shade, dark * 0.5);
      put(g, x, y, mix(col, WHITE, 0.6));
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(g, x + dx, y + dy, col);
    }
  });
  return g;
}
/** Sunburst rays behind a hero when they level up. */
function rays(g, cx, cy, r, color, t, strength) {
  const c = hex(color);
  for (let y = Math.max(0, cy - r); y < Math.min(GH, cy + r); y++)
    for (let x = Math.max(0, cx - r); x < Math.min(GW, cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r) continue;
      const a = Math.atan2(y - cy, x - cx) + t * 0.9;
      if (((a / Math.PI) * 6 + 12) % 2 > 1) continue;
      const k = strength * (1 - d / r) * 0.7;
      if (k > ((x * 5 + y * 3) % 8) / 8) g[y][x] = mix(g[y][x], c, 0.55);
    }
}
const cam0 = { z: 1, focus: [GW / 2, GH / 2], anchor: [GW / 2, GH / 2], shake: 0, flash: 0 };
/** A camera aimed at `focus`, zoomed by z. */
const camAt = (z, focus, shake = 0, flash = 0) => ({ z, focus, anchor: focus, shake, flash });
/** The hard-cut punch every scene opens with; `impact` makes it the hook's slam. */
function opening(t, cam, impact) {
  if (impact) {
    cam.z *= t < 0.18 ? lerp(1.35, 1, ease(t / 0.18)) : 1;
    cam.shake = Math.max(cam.shake, t < 0.4 ? 6 * (1 - t / 0.4) : 0);
    cam.flash = Math.max(cam.flash, t < 0.2 ? 0.8 * (1 - t / 0.2) : 0);
  } else cam.flash = Math.max(cam.flash, t < 0.1 ? 0.5 * (1 - t / 0.1) : 0);
  return cam;
}


/** A quest card like the app's: parchment, the Path in its ink colour, a checkbox; `since` ≥ 0 once checked. */
function questCard(ui, x, y, path, quest, since = -1, CW = 200) {
  const P = PATHS[path];
  const checked = since >= 0;
  box(ui, x - 2, y - 2, CW + 4, 40, hex('#4A3423'));
  box(ui, x, y, CW, 36, hex('#F8EACB'));
  box(ui, x, y + 33, CW, 3, hex('#E6CB8E'));
  box(ui, x + 7, y + 10, 16, 16, hex('#4A3423'));
  box(ui, x + 9, y + 12, 12, 12, checked ? (since < 0.06 ? WHITE : hex(P.ink)) : hex('#F8EACB'));
  if (checked) [[0, 5], [1, 6], [2, 7], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2]].forEach(([i, j]) => box(ui, x + 11 + i, y + 12 + j, 2, 2, WHITE));
  textL(ui, P.cls, 1, x + 30, y + 6, hex(P.ink), { outline: false });
  textL(ui, quest, 2, x + 30, y + 16, hex('#2E1F14'), { outline: false });
  if (checked) {
    box(ui, x + 28, y + 22, Math.round(textW(quest, 2) * ease(since / 0.12)) + 4, 2, hex('#2E1F14'));
    textL(ui, '+10 XP', 1, x + CW - 42, y + 6, hex(P.ink), { outline: false });
  }
}

/**
 * A habit lands: the quest card slams in, gets checked, XP flies into the
 * hero and they level up. `fast` is the montage version.
 */
function habit({ path, hero, quest, lines, lv, dur, fast = false, impact = false, step = 0, who = null, move = null, evolve = 0 }) {
  const P = PATHS[path];
  // `evolve`: the swift version for the signature cuts, the XP bar filling for `evolve` seconds, audibly, then the level
  const tCheck = fast ? 0.1 : evolve ? 0.3 : 0.62;
  const tOrbs = fast ? [0.13, 0.32] : evolve ? [0.34, 0.58] : [0.68, 1.08];
  const tEvo = tOrbs[1] + 0.02;
  const tLv = evolve ? tEvo + evolve : fast ? 0.34 : 1.15;
  const rnd = rng(path.length * 97 + quest.length);
  const HX = UX;
  const HB = GROUND + 14;
  const chest = [HX, HB - 110];
  const CW = 200;
  const CXL = UX - CW / 2;
  const CY = 126;
  const CHECK = [CXL + 15, CY + 18];
  const orbs = Array.from({ length: 9 }, (_, i) => ({ d: i * 0.025, bend: (rnd() - 0.5) * 140, s: 2 + Math.round(rnd() * 2) }));
  const bursts = Array.from({ length: 14 }, () => ({ a: rnd() * Math.PI * 2, v: 20 + rnd() * 40 }));
  return {
    dur,
    frame(t) {
      const scene = backdrop(path, t);
      const ui = blankUi();
      const lt = t - tLv;
      // a quiet load as the bar fills, then one ding when the level lands; nothing else
      if (evolve) cue(t, tEvo, 'xpfill');
      if (evolve) cue(t, tLv, 'ding');
      // the hero, with rays and sparkles once they level
      if (lt >= 0) rays(scene, HX, HB - 90, 130, P.neon, t, clamp01(lt / 0.15) * (fast ? 0.8 : 1));
      const hits = orbs.filter((o) => t >= tOrbs[1] + o.d && t < tOrbs[1] + o.d + 0.05).length;
      const jump = lt >= 0 && lt < 0.35 ? Math.round(Math.sin((lt / 0.35) * Math.PI) * 14) : 0;
      sprite(scene, hero, Math.floor(t * 3), 4, HX, HB - jump, {
        white: hits ? 0.75 : lt >= 0 && lt < 0.08 ? 1 : 0,
      });
      if (lt > 0)
        [[-62, -110, 0], [58, -96, 0.5], [-54, -40, 1], [66, -30, 0.3], [-80, -76, 0.7], [76, -132, 0.2]].forEach(([dx, dy, o]) => {
          const a = Math.sin((lt + o) * 6);
          if (a > -0.2) sparkle(scene, HX + dx, HB + dy, a > 0.6 ? 3 : 2, hex('#FDE68A'));
        });

      // the card and XP bar, sliding away when the level lands
      const slide = lt >= 0 ? -Math.round(ease(lt / 0.16) * 280) : 0;
      const enter = fast ? 0 : Math.round((1 - ease(t / 0.16)) * 200);
      const bump = t >= tCheck && t < tCheck + 0.1 ? 2 : 0;
      if (slide > -270) {
        const x = CXL + slide;
        const y = CY + enter + bump;
        const checked = t >= tCheck;
        questCard(ui, x, y, path, quest, checked ? t - tCheck : -1);
        // the XP bar under the card
        const yb = y + 42;
        box(ui, x - 2, yb, CW + 4, 15, hex('#4A3423'));
        box(ui, x, yb + 2, CW, 11, [46, 31, 20]);
        textL(ui, `LV ${lv}`, 1, x + 5, yb + 4, CREAM, { outline: false });
        const filled = evolve
          ? t < tEvo ? 0.3 : lerp(0.3, 1, clamp01((t - tEvo) / (tLv - tEvo)))
          : t < tOrbs[1] ? 0.72 : lerp(0.72, 1, ease((t - tOrbs[1]) / 0.15));
        box(ui, x + 44, yb + 5, 150, 5, [92, 70, 50]);
        box(ui, x + 44, yb + 5, Math.round(150 * filled), 5, hex(P.neon));
      }
      // the tap: a ring and a burst at the checkbox
      const tt = t - tCheck;
      if (tt >= 0 && tt < 0.3 && slide === 0) {
        const r = Math.round(4 + tt * 70);
        for (let a = 0; a < 40; a++) put(ui, CHECK[0] + Math.cos(a) * r, CHECK[1] + Math.sin(a) * r, [255, 255, 255, 1 - tt / 0.3]);
        bursts.forEach((b) => box(ui, CHECK[0] + Math.cos(b.a) * b.v * tt * 3, CHECK[1] + Math.sin(b.a) * b.v * tt * 3, 2, 2, hex(P.neon)));
      }
      // XP orbs fly from the card into the hero
      orbs.forEach((o) => {
        const k = (t - tOrbs[0] - o.d) / (tOrbs[1] - tOrbs[0]);
        if (k < 0 || k > 1) return;
        const e = ease(k);
        const x = lerp(CHECK[0], chest[0], e) + Math.sin(e * Math.PI) * o.bend * 0.5;
        const y = lerp(CHECK[1], chest[1], e) - Math.sin(e * Math.PI) * 30;
        box(ui, x - o.s, y - o.s, o.s * 2 + 1, o.s * 2 + 1, hex(P.neon));
        box(ui, x - 1, y - 1, 2, 2, WHITE);
      });
      // LEVEL UP (or, for a signature cut: who levelled, and the move they just learned)
      if (lt >= 0 && who) {
        text(ui, `${P.cls} LV ${lv} > ${lv + 1}`, 2, 112, hex(P.neon), { count: Math.floor(lt / 0.02) });
        if (lt > 0.2) text(ui, 'NEW MOVE!', 2, 134, GOLD);
        if (lt > 0.3) {
          const sc = textW(move, 3) <= GW - 12 ? 3 : 2;
          text(ui, move, sc, 152, WHITE, { count: Math.floor((lt - 0.3) / 0.025) });
        }
      } else if (lt >= 0) {
        const sc = lt < 0.08 ? 5 : 4;
        text(ui, 'LEVEL UP!', sc, 132 - (sc - 4) * 4, GOLD);
        const label = `${P.cls} LV ${lv} > ${lv + 1}`;
        text(ui, label, 2, 170, hex(P.neon), { count: Math.floor((lt - 0.1) / 0.02) });
      }
      if (step) stepTag(ui, step);
      headline(ui, !who ? lines : lt >= 0 ? [[who], ['LEVELED UP!', Y]] : t >= tCheck ? [['HABIT'], ['DONE!', Y]] : lines);

      const cam = camAt(1, [GW / 2, GH / 2]);
      if (lt >= 0) {
        cam.z = lerp(1.14, 1, ease(lt / 0.35));
        cam.focus = [HX, HB - 90];
        cam.anchor = [GW / 2, HB - 90];
        cam.shake = lt < 0.4 ? 5 * (1 - lt / 0.4) : 0;
        cam.flash = lt < 0.25 ? (fast ? 0.4 : 0.7) * (1 - lt / 0.25) : 0;
      }
      return { scene, ui, cam: opening(t, cam, impact) };
    },
  };
}

/** A cocoon wakes and hatches a new hero. `at` is the hatch moment. */
function hatch({ path, hero, name, number, rarity, linesA, linesB, dur, at, wiggles = [0.25, 0.8], impact = false, sub = null }) {
  const P = PATHS[path];
  const rnd = rng(42);
  const BY = GROUND + 6;
  const CX = UX;
  const W1 = wiggles;
  const shards = Array.from({ length: 120 }, () => ({
    x: CX + (rnd() - 0.5) * 50,
    y: BY - 10 - rnd() * 90,
    vx: (rnd() - 0.5) * 5,
    vy: -2 - rnd() * 4,
    c: rnd() > 0.5 ? hex('#EDE6D6') : hex('#C9BFAE'),
  }));
  return {
    dur,
    frame(t) {
      // the build-up is the cocoon alone in the dark (as in the game); the realm appears with the burst
      const scene = t < at ? realm(path).base.map((row) => row.map(() => INK)) : backdrop(path, t);
      const ui = blankUi();
      const cam = camAt(1, [CX, BY - COCOON_H / 2]);
      cam.anchor = [GW / 2, GH * 0.6];
      if (t < at) {
        let shear = 0;
        let lift = Math.round(Math.sin(t * 2.5));
        let cracks = 0.1;
        let glow = 0;
        let eye = 0;
        const build = at - 1.15;
        const eyeAt = at - 0.6;
        const violent = at - 0.25;
        for (const w of W1) if (t >= w && t < w + 0.5) shear += Math.round(Math.sin((t - w) * 26) * 4 * (1 - (t - w) / 0.5));
        cam.z = lerp(1.15, 1.3, clamp01(t / build));
        if (t >= build && t < eyeAt) {
          const k = (t - build) / (eyeAt - build);
          shear = Math.round(Math.sin(t * (24 + k * 30)) * (1.5 + k * 4));
          cracks = lerp(0.12, 0.55, k);
          glow = k * 0.5;
          cam.shake = 1 + k * 2.5;
        } else if (t >= eyeAt && t < violent) {
          cracks = 0.55;
          glow = 0.5;
          eye = clamp01((t - eyeAt) / 0.15);
          cam.focus = [CX + EYE.dx, BY + EYE.dy];
          cam.anchor = [GW / 2, GH * 0.55];
          cam.z = lerp(1.3, 3.2, ease((t - eyeAt) / 0.12));
        } else if (t >= violent) {
          const k = (t - violent) / 0.25;
          shear = Math.round(Math.sin(t * 60) * (4 + k * 5));
          lift = Math.round(Math.abs(Math.sin(t * 34)) * k * 3);
          cracks = 1;
          glow = 1;
          eye = 1;
          cam.z = 1.4;
          cam.shake = 3 + k * 4;
        }
        drawCocoon(scene, CX, BY, { shear, lift, cracks, glow, eye, iris: P.neon, rnd });
        headline(ui, linesA);
      } else {
        const rt = t - at;
        sprite(scene, hero, Math.floor(rt * 3), 4, CX, BY);
        shards.forEach((s) => rt < 1.5 && box(scene, s.x + s.vx * rt * 34, s.y + s.vy * rt * 34 + 70 * rt * rt, 2, 2, s.c));
        [[-70, -100, 0], [74, -88, 0.5], [-62, -30, 1], [80, -38, 0.3], [-88, -64, 0.7], [92, -70, 0.2]].forEach(([dx, dy, o]) => {
          const a = Math.sin((rt + o) * 5);
          if (a > -0.2) sparkle(scene, CX + dx, BY + dy, a > 0.6 ? 3 : 2, hex('#FDE68A'));
        });
        headline(ui, linesB);
        text(ui, name, 4, 112, hex(P.neon), { count: Math.floor(rt / 0.05) });
        if (rt > 0.25) stars(ui, rarity, 146, GOLD);
        if (rt > 0.45) text(ui, number, 2, 162, hex('#D8D2E6'));
        if (rt > 0.8 && sub) text(ui, sub, 1, 182, CREAM, { count: Math.floor((rt - 0.8) / 0.02) });
        cam.z = rt < 0.25 ? lerp(0.92, 1, ease(rt / 0.25)) : lerp(1, 1.06, clamp01((rt - 0.25) / 3));
        cam.focus = [CX, BY - 70];
        cam.anchor = [GW / 2, BY - 70];
        cam.shake = rt < 0.7 ? 7 * (1 - rt / 0.7) : 0;
        cam.flash = rt < 0.45 ? 1 - rt / 0.45 : 0;
      }
      return { scene, ui, cam: opening(t, cam, impact) };
    },
  };
}

/** Rows of locked silhouettes lighting up into heroes. */
const ROSTER = readdirSync('assets/sprites')
  .filter((d) => !d.startsWith('.') && !['aurek', 'kaldor'].includes(d))
  .sort();
function collection({ lines, dur }) {
  const picks = Array.from({ length: 24 }, (_, i) => ROSTER[(i * 37 + 5) % ROSTER.length]);
  const COLS = 6;
  return {
    dur,
    frame(t) {
      const scene = Array.from({ length: GH }, (_, y) => Array.from({ length: GW }, () => mix(hex('#0B0A14'), hex('#1E1733'), y / GH)));
      const ui = blankUi();
      picks.forEach((id, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = UX - 2.5 * 38 + col * 38;
        const by = 170 + row * 60;
        box(scene, cx - 17, by - 50, 34, 54, hex('#241C3A'));
        box(scene, cx - 16, by - 49, 32, 52, hex('#16112A'));
        const at = 0.2 + (row * COLS + col) * 0.045;
        const k = t - at;
        if (k < 0) sprite(scene, id, 0, 1, cx, by, { tint: hex('#2C2448'), amt: 1 });
        else {
          sprite(scene, id, Math.floor(t * 3 + i), 1, cx, by, { white: k < 0.06 ? 1 : 0 });
          if (k < 0.3) sparkle(scene, cx + 12, by - 44, 2, hex('#FDE68A'));
        }
      });
      headline(ui, lines);
      const found = Math.min(100, Math.max(0, Math.floor((t - 0.2) / 0.045) + 1) * 4 + 4);
      text(ui, found < 100 ? `${String(found).padStart(3, '0')} FOUND` : '100+ FOUND', 2, 362, CREAM);
      const cam = camAt(lerp(1, 1.07, t / dur), [UX, 270]);
      return { scene, ui, cam: opening(t, cam, false) };
    },
  };
}

/** One hero in the Other World against a boss: dodge, two hits, a swap, a finisher. */
function battle({ linesA, linesB, dur, swapAt = 2.4 }) {
  const rnd = rng(7);
  const BOSS = [174, 268];
  const HOME = [78, 392];
  const HP = 74;
  const HITS = [
    { at: 1.1, dmg: 12, who: 'brannoc' },
    { at: 1.65, dmg: 14, who: 'brannoc' },
    { at: swapAt + 1.2, dmg: 48, who: 'quill', crit: true },
  ];
  const motes = Array.from({ length: 24 }, () => ({ a: rnd() * Math.PI * 2, r: 30 + rnd() * 40 }));
  return {
    dur,
    frame(t) {
      const scene = backdrop('physical', t, { dark: 0.45 });
      const ui = blankUi();
      const cam = camAt(1, [GW / 2, GH / 2]);
      const dead = HITS[2].at;
      const taken = HITS.filter((h) => t >= h.at).reduce((s, h) => s + h.dmg, 0);
      // the boss
      const hitNow = HITS.find((h) => t >= h.at && t < h.at + 0.1);
      const fade = t > dead + 0.3 ? clamp01((t - dead - 0.3) / 0.6) : 0;
      const wob = hitNow ? Math.round((rnd() - 0.5) * 6) : 0;
      if (fade < 1) sprite(scene, 'aurek', Math.floor(t * 2), 4, BOSS[0] + wob, BOSS[1], { white: hitNow || (t > dead && t < dead + 0.3 && Math.floor(t * 20) % 2) ? 1 : 0, fade });
      // the boss's shot, and the dodge
      const shot = (t - 0.3) / 0.45;
      const dodge = t >= 0.55 && t < 0.95 ? Math.sin(((t - 0.55) / 0.4) * Math.PI) : 0;
      if (shot >= 0 && shot <= 1) {
        const x = lerp(BOSS[0] - 20, HOME[0] + 10, shot);
        const y = lerp(BOSS[1] - 100, HOME[1] - 60, shot);
        box(scene, x - 5, y - 5, 11, 11, hex('#B3261E'));
        box(scene, x - 3, y - 3, 7, 7, hex('#FF4D5E'));
        box(scene, x - 1, y - 1, 3, 3, WHITE);
      }
      // the hero: home, dodging, or dashing in for a hit
      const who = t < swapAt ? 'brannoc' : 'quill';
      let [hx, hy] = HOME;
      hx -= Math.round(dodge * 46);
      const swing = HITS.find((h) => h.who === 'brannoc' && t >= h.at - 0.12 && t < h.at + 0.2);
      if (swing) {
        const k = t < swing.at ? ease((t - swing.at + 0.12) / 0.12) : 1 - ease((t - swing.at) / 0.2);
        hx = lerp(HOME[0], BOSS[0] - 50, k);
        hy = lerp(HOME[1], BOSS[1] + 40, k);
      }
      if (dodge > 0.2) for (let g = 1; g <= 2; g++) sprite(scene, who, 0, 3, hx + g * 14, hy, { tint: hex('#9B74F8'), amt: 0.6, fade: 0.4 + g * 0.2 });
      const charging = who === 'quill' && t > swapAt + 0.4 && t < HITS[2].at;
      sprite(scene, who, Math.floor(t * 3), 3, hx, hy, { white: t >= swapAt && t < swapAt + 0.1 ? 1 : charging && Math.floor(t * 16) % 2 ? 0.35 : 0 });
      // effects: slashes, the swap poof, the charge, the bolt
      HITS.filter((h) => h.who === 'brannoc' && t >= h.at && t < h.at + 0.16).forEach((h) => {
        const k = (t - h.at) / 0.16;
        for (let a = 0; a < 26; a++) {
          const ang = -2.4 + (a / 26) * 2.2 + k * 0.6;
          for (let w = 0; w < 4; w++) put(scene, BOSS[0] + Math.cos(ang) * (48 + w), BOSS[1] - 90 + Math.sin(ang) * (48 + w), w < 2 ? WHITE : hex('#FF4D5E'));
        }
      });
      if (t >= swapAt && t < swapAt + 0.3) {
        const k = (t - swapAt) / 0.3;
        for (let a = 0; a < 48; a++) box(scene, HOME[0] + Math.cos(a) * (10 + k * 50), HOME[1] - 70 + Math.sin(a) * (10 + k * 50), 3, 3, WHITE);
      }
      if (charging) {
        const k = (t - swapAt - 0.4) / (HITS[2].at - swapAt - 0.4);
        motes.forEach((m) => {
          const r = m.r * (1 - k);
          box(scene, HOME[0] + Math.cos(m.a + t * 4) * r, HOME[1] - 80 + Math.sin(m.a + t * 4) * r, 3, 3, hex('#9B74F8'));
        });
        const s = Math.round(3 + k * 8);
        box(scene, HOME[0] - s, HOME[1] - 80 - s, s * 2, s * 2, hex('#9B74F8'));
        box(scene, HOME[0] - s / 2, HOME[1] - 80 - s / 2, s, s, WHITE);
      }
      const bolt = (t - HITS[2].at + 0.12) / 0.12;
      if (bolt >= 0 && bolt <= 1.6) {
        const k = Math.min(1, bolt);
        const x0 = HOME[0];
        const y0 = HOME[1] - 80;
        const x1 = lerp(x0, BOSS[0], k);
        const y1 = lerp(y0, BOSS[1] - 90, k);
        for (let i = 0; i <= 40; i++) {
          const x = lerp(x0, x1, i / 40);
          const y = lerp(y0, y1, i / 40);
          box(scene, x - 4, y - 4, 9, 9, hex('#9B74F8'));
          box(scene, x - 2, y - 2, 5, 5, WHITE);
        }
      }
      // HP bar under the boss, damage numbers, callouts
      if (fade < 1) {
        const yb = BOSS[1] + 6;
        textL(ui, 'AUREK', 1, BOSS[0] - 40, yb, CREAM);
        box(ui, BOSS[0] - 41, yb + 10, 82, 7, INK);
        box(ui, BOSS[0] - 40, yb + 11, Math.round(80 * (1 - taken / HP)), 5, hex('#FF4D5E'));
      }
      HITS.filter((h) => t >= h.at && t < h.at + 0.9).forEach((h) => {
        const k = (t - h.at) / 0.9;
        const y = Math.round(BOSS[1] - 128 - ease(k) * 12);
        if (h.crit) text(ui, `CRIT! ${h.dmg}`, k < 0.06 ? 4 : 3, y - 10, GOLD, { cx: BOSS[0] - 20 });
        else text(ui, String(h.dmg), k < 0.06 ? 4 : 3, y, WHITE, { cx: BOSS[0] + 10 });
      });
      if (t >= 0.62 && t < 1.05) text(ui, 'DODGE!', 2, HOME[1] - 170, WHITE, { cx: HOME[0] + 6 });
      if (t >= swapAt && t < swapAt + 0.6) text(ui, 'SWAP!', 2, HOME[1] - 170, WHITE, { cx: HOME[0] + 6 });
      if (t > dead + 0.8) text(ui, 'VICTORY!', t - dead - 0.8 < 0.08 ? 5 : 4, 150, GOLD);
      headline(ui, t < swapAt ? linesA : linesB);
      if (hitNow) cam.shake = hitNow.crit ? 8 : 4;
      if (t >= dead && t < dead + 0.35) {
        cam.flash = 0.8 * (1 - (t - dead) / 0.35);
        cam.z = lerp(1.12, 1, ease((t - dead) / 0.35));
        cam.focus = [BOSS[0], BOSS[1] - 90];
        cam.anchor = [GW / 2, BOSS[1] - 90];
      }
      return { scene, ui, cam: opening(t, cam, false) };
    },
  };
}

/** The eight heroes, the name, the promise, where to get it. */
const CORE = ['brannoc', 'ysolde', 'quill', 'wren', 'oren', 'pip', 'tamsin', 'moss'];
function endCard({ dur, lines = null, powered = false }) {
  return {
    dur,
    frame(t) {
      const scene = backdrop('intellectual', t, { dark: 0.35 });
      const ui = blankUi();
      CORE.forEach((id, i) => {
        const back = i % 2 === 0;
        const at = 0.05 + i * 0.06;
        const k = clamp01((t - at) / 0.2);
        if (k <= 0) return;
        const by = (back ? 360 : 378) + Math.round((1 - ease(k)) * 140) - (k < 1 ? 0 : Math.round(Math.abs(Math.sin(t * 3 + i)) * 2));
        sprite(scene, id, Math.floor(t * 3 + i), 2, 30 + i * 30, by, back ? { tint: INK, amt: 0.25 } : {});
      });
      const logo = t - 0.35;
      if (lines) headline(ui, lines, 30);
      const top = lines ? 92 : 48;
      if (logo >= 0 && powered) {
        const big = logo < 0.08 ? 6 : 5;
        text(ui, '8 PATHS', big, top + 20 - (big - 5) * 4, WHITE, { cx: GW / 2 });
        const typed = Math.floor((logo - 0.15) / 0.03);
        text(ui, 'THE HABIT', 3, top + 72, hex('#FF4D5E'), { cx: GW / 2, count: typed });
        text(ui, 'POWERED RPG', 3, top + 96, hex('#FF4D5E'), { cx: GW / 2, count: typed - 9 });
      } else if (logo >= 0) {
        const big = logo < 0.08 ? 7 : 6;
        text(ui, 'EIGHT', big, top - (big - 6) * 4, WHITE, { cx: GW / 2 });
        text(ui, 'PATHS', big, top + 48 - (big - 6) * 4, WHITE, { cx: GW / 2 });
        text(ui, 'THE HABIT RPG', 3, top + 104, hex('#FF4D5E'), { cx: GW / 2, count: Math.floor((logo - 0.15) / 0.03) });
      }
      // The powered card: then where to follow, kept clear of the apps' captions (the bottom 125 art px) and buttons (the right 40).
      if (powered) {
        if (logo > 0.6) text(ui, 'FOLLOW @8PATHSS', 2, top + 140, GOLD, { cx: GW / 2 });
        ['ON TIKTOK AND INSTAGRAM', 'FOR EARLY ACCESS AND', 'FOUNDER EXCLUSIVES'].forEach((s, i) => {
          if (logo > 0.9 + i * 0.15) text(ui, s, 1, top + 166 + i * 13, CREAM, { cx: GW / 2 });
        });
        if (logo > 1.5) text(ui, '100 LEFT!', 2, top + 210, hex('#FF4D5E'), { cx: GW / 2 });
      } else {
        if (logo > 0.6) text(ui, 'NO ADS · WORKS OFFLINE', 1, top + 136, CREAM, { cx: GW / 2 });
        if (logo > 0.9) CTA.forEach((s, i) => text(ui, s, 2, top + 156 + i * 18, GOLD, { cx: GW / 2 }));
        if (logo > 1.2) text(ui, '@8PATHSS', 2, top + 156 + CTA.length * 18 + 10, hex('#D8D2E6'), { cx: GW / 2 });
      }
      const cam = camAt(lerp(1, 1.04, t / dur), [GW / 2, GH / 2]);
      cam.flash = logo >= 0 && logo < 0.3 ? 0.7 * (1 - logo / 0.3) : 0;
      return { scene, ui, cam: opening(t, cam, false) };
    },
  };
}


// ---- the tour: how the app works, in the app's parchment look
const PARCHMENT = (t) =>
  Array.from({ length: GH }, (_, y) =>
    Array.from({ length: GW }, (_, x) => (((x >> 2) + (y >> 2)) % 7 === 0 ? hex('#E9CF98') : hex('#F0D9A7'))),
  );
const darkBg = () => Array.from({ length: GH }, (_, y) => Array.from({ length: GW }, () => mix(hex('#0B0A14'), hex('#1E1733'), y / GH)));
/** A little step tag above the headline: "HOW IT WORKS · 1/5". */
const stepTag = (ui, n) => text(ui, `HOW IT WORKS · ${n}/5`, 1, 30, hex('#D8D2E6'));

/** Habits slide in as quest cards, each tagged with its Path. */
function questList({ dur, lines, step }) {
  const Q = [
    ['physical', 'MOVE 30 MIN'],
    ['intellectual', 'READ 20 MIN'],
    ['financial', 'LOG SPENDING'],
    ['emotional', 'JOURNAL'],
    ['social', 'CALL A FRIEND'],
  ];
  return {
    dur,
    frame(t) {
      const scene = PARCHMENT(t);
      const ui = blankUi();
      Q.forEach(([path, quest], i) => {
        const k = clamp01((t - 0.2 - i * 0.18) / 0.22);
        if (k <= 0) return;
        questCard(ui, UX - 100 + Math.round((1 - ease(k)) * 260), 122 + i * 46, path, quest);
      });
      if (step) stepTag(ui, step);
      headline(ui, lines);
      return { scene, ui, cam: opening(t, camAt(1, [GW / 2, GH / 2]), false) };
    },
  };
}

/** The eight Paths of life, each with its hero. */
const LIFE = { physical: 'BODY', financial: 'MONEY', intellectual: 'MIND', spiritual: 'SPIRIT', emotional: 'FEELINGS', social: 'FRIENDS', occupational: 'WORK', environmental: 'OUTDOORS' };
function pathsGrid({ dur, lines, step }) {
  const paths = Object.keys(PATHS);
  return {
    dur,
    frame(t) {
      const scene = darkBg();
      const ui = blankUi();
      paths.forEach((path, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const cx = UX - 93 + col * 62;
        const by = 228 + row * 118;
        const k = t - 0.15 - i * 0.1;
        if (k < 0) return;
        box(scene, cx - 28, by - 98, 56, 104, hex('#241C3A'));
        box(scene, cx - 27, by - 97, 54, 102, hex('#16112A'));
        sprite(scene, CORE[i], Math.floor(t * 3 + i), 2, cx, by, { white: k < 0.06 ? 1 : 0 });
        text(ui, PATHS[path].cls, 1, by + 12, hex(PATHS[path].neon), { cx });
        text(ui, LIFE[path], 1, by + 22, CREAM, { cx });
      });
      if (step) stepTag(ui, step);
      headline(ui, lines);
      return { scene, ui, cam: opening(t, camAt(lerp(1, 1.04, t / dur), [UX, 260]), false) };
    },
  };
}

/** A month of days filling in, and the streak counting up. */
function streak({ dur, lines, step }) {
  const FLAME = ['...X...', '..XX...', '..XXX..', '.XXOXX.', '.XOOOX.', 'XXOYOXX', 'XOYYYOX', 'XOYYYOX', '.XOYOX.', '..XXX..'];
  return {
    dur,
    frame(t) {
      const scene = PARCHMENT(t);
      const ui = blankUi();
      const x0 = UX - 100;
      const y0 = 118;
      box(ui, x0 - 2, y0 - 2, 204, 186, hex('#4A3423'));
      box(ui, x0, y0, 200, 182, hex('#F8EACB'));
      text(ui, 'SEPTEMBER', 2, y0 + 8, hex('#B3261E'), { outline: false });
      'SMTWTFS'.split('').forEach((d, i) => textL(ui, d, 1, x0 + 18 + i * 26, y0 + 30, hex('#6B4F33'), { outline: false }));
      const filled = Math.floor(clamp01((t - 0.2) / 1.6) * 30);
      for (let d = 0; d < 30; d++) {
        const c = (d + 2) % 7;
        const r = Math.floor((d + 2) / 7);
        const x = x0 + 10 + c * 26;
        const y = y0 + 42 + r * 27;
        const on = d < filled;
        box(ui, x, y, 22, 23, on ? hex('#B3261E') : hex('#E6CB8E'));
        const n = String(d + 1);
        textL(ui, n, 1, x + 11 - textW(n, 1) / 2, y + 8, on ? WHITE : hex('#80654A'), { outline: false });
      }
      const fx = UX - 91;
      const fy = 316;
      FLAME.forEach((row, r) =>
        [...row].forEach((ch, c) => ch !== '.' && box(ui, fx + c * 3, fy + r * 3 - Math.round(Math.sin(t * 9) * (r < 3 ? 1 : 0)), 3, 3, ch === 'X' ? hex('#B3261E') : ch === 'O' ? hex('#FF8A3D') : GOLD)),
      );
      textL(ui, `${filled} DAY STREAK`, 2, fx + 28, fy + 8, WHITE);
      if (step) stepTag(ui, step);
      headline(ui, lines);
      return { scene, ui, cam: opening(t, camAt(1, [GW / 2, GH / 2]), false) };
    },
  };
}

/** The eight-Path radar, growing as the habits add up. */
function radar({ dur, lines, step }) {
  const paths = Object.keys(PATHS);
  const vals = [0.92, 0.6, 0.78, 0.5, 0.72, 0.84, 0.66, 0.56];
  const C = [UX, 262];
  const R = 86;
  const pt = (i, r) => [C[0] + Math.sin((i / 8) * Math.PI * 2) * r, C[1] - Math.cos((i / 8) * Math.PI * 2) * r];
  const line = (g, a, b, c) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 0; k <= n; k++) put(g, lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n), c);
  };
  return {
    dur,
    frame(t) {
      const scene = darkBg();
      const ui = blankUi();
      const grow = 0.15 + 0.85 * ease((t - 0.3) / 1.6);
      for (const ring of [0.33, 0.66, 1]) for (let i = 0; i < 8; i++) line(scene, pt(i, R * ring), pt(i + 1, R * ring), hex('#3A3058'));
      for (let i = 0; i < 8; i++) line(scene, C, pt(i, R), hex('#3A3058'));
      // the shape: fill by testing each pixel against the polygon
      const poly = paths.map((_, i) => pt(i, R * vals[i] * grow));
      for (let y = C[1] - R; y <= C[1] + R; y++)
        for (let x = C[0] - R; x <= C[0] + R; x++) {
          let inside = false;
          for (let i = 0, j = 7; i < 8; j = i++) {
            const [xi, yi] = poly[i];
            const [xj, yj] = poly[j];
            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
          }
          if (inside && (x + y) % 2 === 0) put(scene, x, y, hex('#B3261E'));
        }
      for (let i = 0; i < 8; i++) line(scene, poly[i], poly[(i + 1) % 8], hex('#FF4D5E'));
      paths.forEach((path, i) => {
        const [x, y] = pt(i, R + 16);
        text(ui, PATHS[path].cls, 1, Math.round(y - 3), hex(PATHS[path].neon), { cx: Math.min(232, Math.max(30, x)) });
      });
      if (step) stepTag(ui, step);
      headline(ui, lines);
      return { scene, ui, cam: opening(t, camAt(1, [GW / 2, GH / 2]), false) };
    },
  };
}

// ---- the Other World, drawn from the game's own baked maps and walkers (assets/world)
const MAPS = {};
const map = (name) => (MAPS[name] ??= PNG.sync.read(readFileSync(`assets/world/${name}.png`)));
const WALKERS = PNG.sync.read(readFileSync('assets/world/walkers.png'));
const WALKER_ROW = {
  ...Object.fromEntries(['brannoc', 'ysolde', 'quill', 'wren', 'oren', 'pip', 'tamsin', 'moss'].map((id, i) => [id, i])),
  pell: 8,
  jory: 10,
  plush: 20,
  sleeper: 21,
  raider: 23,
  shadow: 35,
  rusted: 36,
  echo: 37,
};
const DIRS = { down: 0, up: 1, left: 2, right: 3 };
/** The map seen through a 90×160 window centred on (cx, cy) map pixels, drawn at 3×. */
const MZ = 3;
const VW = GW / MZ;
const VH = GH / MZ;
function mapView(name, cx, cy) {
  const m = map(name);
  const x0 = Math.round(Math.min(Math.max(cx - VW / 2, 0), Math.max(0, m.width - VW)));
  const y0 = m.height < VH ? Math.round((m.height - VH) / 2) : Math.round(Math.min(Math.max(cy - VH / 2, 0), m.height - VH));
  const g = Array.from({ length: GH }, (_, y) =>
    Array.from({ length: GW }, (_, x) => {
      const mx = x0 + Math.floor(x / MZ);
      const my = y0 + Math.floor(y / MZ);
      if (mx < 0 || my < 0 || mx >= m.width || my >= m.height) return [6, 5, 10];
      const i = (my * m.width + mx) * 4;
      return [m.data[i], m.data[i + 1], m.data[i + 2]];
    }),
  );
  return { g, x0, y0 };
}
/** A walker (16×24, feet at 22) standing at map (mx, my), facing `dir`, on step `step` (0 stand, 1, 2). */
function walker(view, id, mx, my, dir, step, { white = 0, fade = 0, tint = null } = {}) {
  const sx = (DIRS[dir] * 3 + step) * 16;
  const sy = WALKER_ROW[id] * 24;
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 16; x++) {
      const i = ((sy + y) * WALKERS.width + sx + x) * 4;
      if (WALKERS.data[i + 3] < 128) continue;
      if (fade > 0 && ((x * 7 + y * 13) % 17) / 17 < fade) continue;
      let c = [WALKERS.data[i], WALKERS.data[i + 1], WALKERS.data[i + 2]];
      if (tint) c = mix(c, tint, 0.5);
      if (white) c = mix(c, WHITE, white);
      box(view.g, Math.round((mx - 8 + x - view.x0) * MZ), Math.round((my - 22 + y - view.y0) * MZ), MZ, MZ, c);
    }
}
const stepOf = (t, moving) => (moving ? [1, 0, 2, 0][Math.floor(t * 8) % 4] : 0);
const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
const hearts = (ui, n, of, x, y) => {
  for (let h = 0; h < of; h++) HEART.forEach((row, r) => [...row].forEach((p, c) => p === 'X' && box(ui, x + h * 14 + c * 2, y + r * 2, 2, 2, h < n ? hex('#FF4D5E') : hex('#3A3058'))));
};

/** Walking into Millbrook; a villager says hello. */
function worldWalk({ dur, lines }) {
  const NPC = [300, 126];
  return {
    dur,
    frame(t) {
      const k = clamp01(t / (dur * 0.55));
      const hx = lerp(470, NPC[0] + 18, k);
      const hy = 128;
      const view = mapView('millbrook', (hx + NPC[0]) / 2 + (1 - k) * 60, hy);
      walker(view, 'pell', NPC[0], NPC[1], k < 1 ? 'down' : 'right', 0);
      walker(view, 'brannoc', hx, hy, 'left', stepOf(t, k < 1));
      const ui = blankUi();
      headline(ui, lines);
      hearts(ui, 5, 5, 18, 112);
      const tt = t - dur * 0.58;
      if (tt > 0) {
        box(ui, UX - 110, 286, 220, 64, INK);
        box(ui, UX - 108, 288, 216, 60, hex('#F8F4EA'));
        textL(ui, 'PELL', 1, UX - 100, 294, hex('#A21C70'), { outline: false });
        const L = ['WELCOME TO', 'MILLBROOK!'];
        let left = Math.floor(tt / 0.035);
        L.forEach((s, i) => {
          textL(ui, s, 2, UX - 100, 306 + i * 18, INK, { outline: false, count: Math.max(0, left) });
          left -= s.length;
        });
      }
      return { scene: view.g, ui, cam: opening(t, camAt(1, [GW / 2, GH / 2]), false) };
    },
  };
}

/** The Barracks: raiders close in; slash, dodge roll, then Whirlwind clears the room. */
function worldFight({ dur, lines, linesB, turn = 3.0 }) {
  const HERO = [128, 118];
  const foes = [
    { x: 196, y: 92, hp: 3 },
    { x: 204, y: 124, hp: 3 },
    { x: 192, y: 150, hp: 3 },
  ];
  const SPIN = turn + 0.7;
  return {
    dur,
    frame(t) {
      const view = mapView('barracks-hall', 150, 118);
      const ui = blankUi();
      const fx = [];
      // the hero: a slash at 1.1, a dodge roll at 1.6, a slash at 2.2, the charged Whirlwind at SPIN
      let [hx, hy] = HERO;
      let dir = 'right';
      if (t >= 1.6 && t < 1.88) hy -= Math.round(Math.sin(((t - 1.6) / 0.28) * Math.PI) * 26);
      const spinning = t >= SPIN && t < SPIN + 0.55;
      if (spinning) dir = ['down', 'right', 'up', 'left'][Math.floor((t - SPIN) * 16) % 4];
      const charging = t >= turn + 0.2 && t < SPIN;
      // the raiders walk in, take hits, and fall
      foes.forEach((f, i) => {
        const near = clamp01((t - 0.1) / 1.0);
        let x = lerp(f.x, HERO[0] + 22 + i * 4, near);
        let y = lerp(f.y, HERO[1] - 18 + i * 18, near);
        const hit1 = i === 0 && t >= 1.1;
        const hit2 = i === 0 && t >= 2.2;
        const out = (hit2 && t >= 2.2 + 0.25) || (t >= SPIN + 0.1);
        if (hit1 && t < 1.3) x += (t - 1.1) * 60;
        if (t >= SPIN + 0.1) {
          const k = t - SPIN - 0.1;
          const a = Math.atan2(y - HERO[1], x - HERO[0]);
          x += Math.cos(a) * k * 90;
          y += Math.sin(a) * k * 90;
        }
        if (out && t > (i === 0 && hit2 ? 2.45 : SPIN + 0.1) + 0.45) return;
        const white = (i === 0 && ((t >= 1.1 && t < 1.18) || (t >= 2.2 && t < 2.28))) || (t >= SPIN + 0.1 && t < SPIN + 0.2) ? 1 : 0;
        const fade = out ? clamp01((t - (i === 0 && hit2 ? 2.45 : SPIN + 0.1)) / 0.45) : 0;
        if (i === 0 && hit2 && t >= SPIN) return;
        walker(view, 'raider', x, y, 'left', stepOf(t + i, near < 1), { white, fade });
      });
      if (t >= 1.6 && t < 1.88) for (let g = 1; g <= 2; g++) walker(view, 'brannoc', hx, hy + g * 8, dir, 0, { fade: 0.3 + g * 0.25, tint: hex('#9B74F8') });
      walker(view, 'brannoc', hx, hy, dir, 0, { white: charging && Math.floor(t * 14) % 2 ? 0.4 : 0 });
      // effects, in screen space (map → screen is ×2 after the view offset)
      const S = ([mx, my]) => [(mx - view.x0) * MZ, (my - view.y0) * MZ];
      for (const at of [1.1, 2.2])
        if (t >= at - 0.04 && t < at + 0.12) {
          const [sx, sy] = S([HERO[0] + 14, HERO[1] - 12]);
          const k = (t - at + 0.04) / 0.16;
          for (let a = 0; a < 22; a++) {
            const ang = -1.3 + (a / 22) * 2.6 * k;
            for (let w = 0; w < 4; w++) put(view.g, sx + Math.cos(ang) * (36 + w), sy + Math.sin(ang) * (36 + w), w < 2 ? WHITE : hex('#FF4D5E'));
          }
        }
      if (charging) {
        const [sx, sy] = S([HERO[0], HERO[1] - 10]);
        for (let a = 0; a < 20; a++) {
          const r = 60 * (1 - ((t * 2 + a / 20) % 1));
          box(view.g, sx + Math.cos(a) * r, sy + Math.sin(a) * r, 3, 3, hex('#FF4D5E'));
        }
      }
      if (spinning) {
        const [sx, sy] = S([HERO[0], HERO[1] - 10]);
        const k = (t - SPIN) / 0.55;
        for (let a = 0; a < 90; a++) {
          const ang = (a / 90) * Math.PI * 2 + k * 20;
          if ((a + Math.floor(k * 30)) % 9 < 5) for (let w = 0; w < 5; w++) put(view.g, sx + Math.cos(ang) * (64 + k * 20 + w), sy + Math.sin(ang) * (50 + k * 14 + w), w < 2 ? WHITE : hex('#FF4D5E'));
        }
      }
      // numbers and callouts
      const [hsx, hsy] = S(HERO);
      for (const at of [1.1, 2.2]) if (t >= at && t < at + 0.6) text(ui, '3', 3, Math.round(hsy - 80 - (t - at) * 30), WHITE, { cx: hsx + 60 });
      if (t >= SPIN + 0.1 && t < SPIN + 0.9) [-40, 0, 40].forEach((dy, i) => text(ui, '6', 3, Math.round(hsy - 60 + dy - (t - SPIN) * 30), GOLD, { cx: hsx + 64 + i * 6 }));
      if (t >= 1.62 && t < 2.0) text(ui, 'DODGE ROLL!', 2, hsy - 130, WHITE, { cx: hsx });
      if (t >= turn && t < SPIN + 1.0) {
        box(ui, UX - 106, 118, 212, 44, INK);
        box(ui, UX - 104, 120, 208, 40, hex('#F8EACB'));
        text(ui, 'WARRIOR LV 20', 1, 126, hex('#B3261E'), { outline: false });
        text(ui, 'WHIRLWIND!', 3, 138, hex('#2E1F14'), { outline: false, count: Math.floor((t - turn) / 0.04) });
      }
      if (t > SPIN + 1.1) text(ui, 'ROOM CLEARED!', 3, 140, GOLD, { count: Math.floor((t - SPIN - 1.1) / 0.03) });
      hearts(ui, 5, 5, 18, 104);
      headline(ui, t < turn ? lines : linesB);
      const cam = camAt(1, [GW / 2, GH / 2]);
      if (t >= 1.1 && t < 1.2) cam.shake = 3;
      if (t >= 2.2 && t < 2.3) cam.shake = 3;
      if (t >= SPIN && t < SPIN + 0.3) {
        cam.shake = 6;
        cam.flash = 0.5 * (1 - (t - SPIN) / 0.3);
      }
      return { scene: view.g, ui, cam: opening(t, cam, false) };
    },
  };
}

const Y = hex('#FFE066');

// ---- signature moves (src/world/signatures.ts): a habit takes a hero to Lv 10, then, in the Other
// World, they fool about in character and show off their own move. One scene per core companion.

/** Map pixels → screen pixels in a mapView. */
const toS = (view, mx, my) => [(mx - view.x0) * MZ, (my - view.y0) * MZ];
/** A ring (squashed for the floor) at screen (sx, sy). */
function ringS(g, sx, sy, r, c, w = 3, squash = 0.75) {
  const n = Math.max(24, Math.round(r * 5));
  for (let a = 0; a < n; a++) {
    const ang = (a / n) * Math.PI * 2;
    for (let k = 0; k < w; k++) put(g, sx + Math.cos(ang) * (r + k), sy + Math.sin(ang) * (r + k) * squash, c);
  }
}
/** A filled, dithered glow at screen (sx, sy). */
function glowS(g, sx, sy, r, c, strength) {
  for (let y = Math.max(0, Math.round(sy - r)); y < Math.min(GH, sy + r); y++)
    for (let x = Math.max(0, Math.round(sx - r)); x < Math.min(GW, sx + r); x++) {
      const d = Math.hypot(x - sx, y - sy) / r;
      if (d > 1) continue;
      const k = strength * (1 - d);
      if (k > ((x * 5 + y * 3) % 8) / 8) g[y][x] = mix(g[y][x], c, 0.55);
    }
}
/** A damage number floating up from screen (sx, sy), `age` seconds old. */
const pop = (ui, s, sx, sy, age, c = WHITE) => {
  if (age >= 0 && age < 0.7) text(ui, s, 2, Math.round(sy - 66 - age * 36), c, { cx: Math.round(sx) });
};
// ---- voices, as the game does them (portraits.ts, typewriter-text.tsx, dialogue-box.tsx):
// 28ms a letter, longer after punctuation, and a blip every other letter in the speaker's own voice.
const VOICES = { kaldor: 1, aurek: 1, plush: 1, bo: 1, keeper: 2, harrow: 2, hugo: 2, brannoc: 2, brunna: 5, pim: 5 };
/** A speaker's voice, 1 (low) to 5 (high): fixed for some, otherwise from their name as the game shows it ("Sister Wren"). */
function voiceFor(name, sprite) {
  if (sprite && VOICES[sprite]) return VOICES[sprite];
  let hash = 0;
  for (const c of name ?? '') hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return 2 + (hash % 3);
}
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const LETTER_MS = 28;
const PAUSES = { '.': 260, '!': 260, '?': 260, ',': 120, ':': 160, ';': 160 };
/** When each letter appears, in seconds from the line's start. */
function letterTimes(text) {
  const at = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) t += (LETTER_MS + (PAUSES[text[i - 1]] ?? 0)) / 1000;
    at.push(t);
  }
  return at;
}
/** The clock of the whole video, set by the render loop each frame, and every sound heard so far: [seconds, effect]. */
let NOW = 0;
const SOUNDS = [];
/** Plays `name` (an effect in sounds.ts, or 'evolve') if scene time `at` fell within this frame, `t` being the scene's clock. */
function cue(t, at, name) {
  if (at <= t && at > t - 1 / FPS) SOUNDS.push([NOW - (t - at), name]);
}
/**
 * Types `text` out at the game's pace, `age` seconds in: returns how many letters show and whether the
 * speaker's head is up (it bobs a pixel every other blip). Blips that fell in this frame are heard.
 */
function speak(text, age, voice) {
  const at = letterTimes(text);
  let shown = 0;
  let blips = 0;
  for (let k = 0; k < at.length; k++) {
    if (at[k] > age) break;
    shown = k + 1;
    if (k % 2 !== 0 || !text[k].trim()) continue;
    blips++;
    if (voice && at[k] > age - 1 / FPS) SOUNDS.push([NOW - (age - at[k]), `blip${voice}`]);
  }
  return { shown, lift: blips % 2, done: shown >= text.length, end: at[at.length - 1] ?? 0 };
}

/** A speech bubble over a head at screen (sx, sy), typing in over `age` seconds; '|' breaks the line. */
function bubble(ui, s, sx, sy, age, voice = null) {
  if (age < 0) return;
  const rows = s.split('|');
  const sc = 2;
  const w = Math.max(...rows.map((r) => textW(r, sc))) + 14;
  const h = rows.length * 18 - 4 + 12;
  const x = Math.round(Math.min(GW - w - 6, Math.max(6, sx - w / 2)));
  // over their head, unless that would cover the move's banner: then under their feet
  const above = sy - 92 - h >= 120;
  const y = Math.round(above ? sy - 92 - h : sy + 14);
  box(ui, x - 2, y - 2, w + 4, h + 4, INK);
  box(ui, x, y, w, h, hex('#F8F4EA'));
  const tail = above ? y + h : y - 6;
  box(ui, Math.round(sx) - 1, above ? tail + 3 : tail, 2, 3, hex('#F8F4EA'));
  box(ui, Math.round(sx) - 3, above ? tail : tail + 3, 6, 3, hex('#F8F4EA'));
  let left = speak(rows.join(' '), age, voice).shown;
  rows.forEach((r, i) => {
    textL(ui, r, sc, x + 7, y + 6 + i * 18, INK, { outline: false, count: Math.max(0, left) });
    left -= r.length + 1;
  });
}
/** A charging glow gathering in at screen (sx, sy). */
function charging(g, sx, sy, t, c) {
  for (let a = 0; a < 20; a++) {
    const r = 60 * (1 - ((t * 2 + a / 20) % 1));
    box(g, sx + Math.cos(a) * r, sy + Math.sin(a) * r, 3, 3, c);
  }
}
/** A puff where an enemy fell, `age` seconds after. */
function puffS(g, sx, sy, age) {
  if (age < 0 || age > 0.35) return;
  const p = age / 0.35;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    box(g, sx + Math.cos(a) * (9 + 33 * p), sy - 24 + Math.sin(a) * (9 + 33 * p) * 0.8, 6 - Math.round(p * 4), 6 - Math.round(p * 4), hex('#E8E0D0'));
  }
}
/** Facing toward (dx, dy). */
const dirTo = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');

/**
 * The shared frame of every signature scene: the map, the move's banner, the
 * shout, the hearts and the headline. `play` draws the hero and enemies and
 * says where the hero is ({ hero: [mx, my] }), how many hearts, and any shake.
 * The move goes off at F. Heroes keep quiet as they do it; only a `shout` (Ysolde's) is said, at F (or `shoutAt`).
 */
/** The core companion of each Path: whose voice a signature scene's bubbles are in. */
const PATH_HERO = { physical: 'brannoc', financial: 'ysolde', intellectual: 'quill', spiritual: 'wren', emotional: 'oren', social: 'pip', occupational: 'tamsin', environmental: 'moss' };
const HERO_NAME = { brannoc: 'Brannoc', ysolde: 'Ysolde', quill: 'Quill', wren: 'Sister Wren', oren: 'Oren', pip: 'Pip', tamsin: 'Tamsin', moss: 'Moss' };
function signature({ path, map: name, at, F, dur, move, shout, shoutAt = null, sub = null, lines, play, sfx = [], chargeAt = F - 0.75 }) {
  const P = PATHS[path];
  /** Seconds of the scene skipped: it opens half a second before the move gathers (Oren's breath, everyone else's charge). */
  const skip = Math.max(0, Math.min(F - 0.75, shoutAt ?? F) - 0.5);
  const voice = voiceFor(HERO_NAME[PATH_HERO[path]], PATH_HERO[path]);
  return {
    dur: dur - skip,
    frame(t0) {
      const t = t0 + skip;
      cue(t, chargeAt, 'load');
      for (const [when, what] of sfx) if (when >= skip) cue(t, when, what);
      const view = mapView(name, at[0], at[1]);
      const ui = blankUi();
      const S = (mx, my) => toS(view, mx, my);
      const out = play(t, view, ui, S) ?? {};
      const [hsx, hsy] = S(...out.hero);
      // charging, then the move's name
      if (t >= F - 0.75 && t < F && !out.noCharge) charging(view.g, hsx, hsy - 30, t, hex(P.neon));
      if (sub && t >= F - 0.2 && t < F + 1.9) text(ui, sub, 1, 124, CREAM);
      // bubbles hang over where they stand (`speaker`, if a hop shouldn't drag them about)
      const [bsx, bsy] = out.speaker ? S(...out.speaker) : [hsx, hsy];
      const sa = shoutAt ?? F;
      if (shout && t >= sa && t < sa + 1.7) bubble(ui, shout, bsx, bsy, t - sa, voice);
      for (const [s, a, age] of out.bubbles ?? []) if (age >= 0 && age < a) bubble(ui, s, bsx, bsy, age, voice);
      hearts(ui, out.hp ?? 5, 5, 18, 104);
      const cam = camAt(1, [GW / 2, GH / 2]);
      if (out.shake) cam.shake = out.shake;
      if (out.flash) cam.flash = out.flash;
      return { scene: view.g, ui, cam: opening(t0, cam, false) };
    },
  };
}
const F0 = 3.3;
const WORLD_LINES = [['THEN, IN THE'], ['OTHER WORLD...', Y]];
/** Where each enemy stands at time t: walks from `from` toward `to`, arriving by `by`. */
const approach = (from, to, t, start, by) => {
  const k = ease(clamp01((t - start) / (by - start)));
  return [lerp(from[0], to[0], k), lerp(from[1], to[1], k), k > 0 && k < 1];
};

const SIG_SCENES = {
  // Brannoc sizes them up, flees, thinks better of it, spins Sweetheart, then hops well back.
  brannoc: () => {
    const F = F0;
    const foes = [
      { from: [236, 102], to: [172, 108] },
      { from: [246, 126], to: [178, 128] },
      { from: [236, 150], to: [170, 148] },
      // the last one circles round behind him while he's busy being brave
      { from: [246, 80], via: [150, 86], to: [126, 124] },
    ];
    const inOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    return signature({
      path: 'physical', map: 'barracks-hall', at: [142, 106], F, dur: F + 1.25,
      move: 'SWEETHEART SWING', sfx: [[F, 'fire'], [F + 0.05, 'tkill'], [F + 0.55, 'hop']], shout: null, lines: WORLD_LINES,
      play(t, view, ui, S) {
        let hx = 150;
        let hy = 126;
        let dir = 'right';
        let moving = false;
        if (t < 0.9) [hx, moving] = [lerp(126, 150, inOut(t / 0.9)), true];
        else if (t < 1.15) hx = 150;
        else if (t < 1.85) [hx, dir, moving] = [lerp(150, 112, inOut((t - 1.15) / 0.7)), 'left', true];
        else if (t < 2.25) [hx, dir] = [112, t < 2.0 ? 'left' : 'right'];
        else if (t < 2.75) [hx, moving] = [lerp(112, 150, inOut((t - 2.25) / 0.5)), true];
        const spin = t >= F && t < F + 0.5;
        if (spin) dir = ['down', 'right', 'up', 'left'][Math.floor((t - F) * 12) % 4];
        // …and the hop back
        if (t >= F + 0.55) {
          const k = clamp01((t - F - 0.55) / 0.4);
          hx = lerp(150, 128, inOut(k));
          hy = 126 - Math.round(Math.sin(k * Math.PI) * 6);
        }
        foes.forEach((f, i) => {
          let x, y, walking;
          if (f.via) {
            const k = clamp01((t - 1.0) / (F - 0.1 - 1.0));
            const a = k < 0.6 ? approach(f.from, f.via, t, 1.0, 1.0 + (F - 1.1) * 0.6) : approach(f.via, f.to, t, 1.0 + (F - 1.1) * 0.6, F - 0.1);
            [x, y, walking] = [a[0], a[1], k > 0 && k < 1];
          } else [x, y, walking] = approach(f.from, f.to, t, 1.0, F - 0.1);
          if (t >= F + 0.05) {
            const k = t - F - 0.05;
            const a = Math.atan2(y - 120, x - 150);
            x += Math.cos(a) * k * 110;
            y += Math.sin(a) * k * 110;
          }
          const fade = clamp01((t - F - 0.1) / 0.45);
          if (fade >= 1) return;
          walker(view, 'raider', x, y, dirTo(hx - x, hy - y), stepOf(t + i * 0.3, walking), {
            white: t >= F + 0.05 && t < F + 0.15 ? 1 : 0,
            fade,
          });
          const [sx, sy] = S(x, y);
          pop(ui, '3', sx, sy, t - F - 0.05, GOLD);
        });
        walker(view, 'brannoc', hx, hy, dir, stepOf(t * 1.2, moving));
        const [sx, sy] = S(150, 116);
        if (spin) {
          const k = (t - F) / 0.5;
          for (let a = 0; a < 90; a++) {
            const ang = (a / 90) * Math.PI * 2 + k * 20;
            if ((a + Math.floor(k * 30)) % 9 < 5) for (let w = 0; w < 5; w++) put(view.g, sx + Math.cos(ang) * (64 + k * 20 + w), sy + Math.sin(ang) * (50 + k * 14 + w), w < 2 ? WHITE : hex('#FF4D5E'));
          }
        }
        return {
          hero: [hx, hy],
          speaker: [hx, 126],
          shake: spin && t < F + 0.3 ? 6 : 0,
          flash: t >= F && t < F + 0.25 ? 0.5 * (1 - (t - F) / 0.25) : 0,
        };
      },
    });
  },

  // Ysolde flips a coin while they gather; then the tab comes due, a heart at a time.
  ysolde: () => {
    const F = F0;
    const H = [330, 182];
    const foes = [
      { from: [270, 150], to: [304, 170] },
      { from: [390, 150], to: [356, 170] },
      { from: [270, 220], to: [306, 200] },
      { from: [390, 222], to: [354, 200] },
    ];
    const TICKS = [0.55, 0.95, 1.35];
    return signature({
      path: 'financial', map: 'kingdom-town', at: [330, 162], F, dur: F + 2.0,
      move: 'COLLECT THE TAB', sfx: [[F, 'fire'], [F + 0.55, 'thit'], [F + 0.95, 'thit'], [F + 1.35, 'tkill']], shout: 'YOU OWE ME.', lines: WORLD_LINES,
      play(t, view, ui, S) {
        const walking = t < 0.9;
        const hy = walking ? lerp(150, H[1], t / 0.9) : H[1];
        foes.forEach((f, i) => {
          const [x, y, moving] = approach(f.from, f.to, t, 0.8, F - 0.1);
          const frozen = t >= F;
          const gone = t - F - TICKS[2] - i * 0.06;
          const fade = clamp01(gone / 0.4);
          if (fade >= 1) return;
          const tick = TICKS.some((k) => t - F - i * 0.06 >= k && t - F - i * 0.06 < k + 0.08);
          walker(view, 'shadow', x, y, dirTo(H[0] - x, H[1] - y), frozen ? 0 : stepOf(t + i, moving), {
            white: tick ? 1 : 0,
            tint: frozen ? GOLD : null,
            fade,
          });
          const [sx, sy] = S(x, y);
          if (frozen && fade === 0) {
            // the coin of debt bobbing over their head
            const lift = Math.floor(t * 4) % 2;
            box(view.g, sx - 6, sy - 84 - lift * 3, 12, 12, hex('#8A5A00'));
            box(view.g, sx - 4, sy - 82 - lift * 3, 8, 8, GOLD);
          }
          for (const k of TICKS) pop(ui, '-1', sx, sy, t - F - i * 0.06 - k, GOLD);
        });
        walker(view, 'ysolde', H[0], hy, 'down', stepOf(t, walking));
        const [hsx, hsy] = S(H[0], hy);
        // the coin flip
        for (const at of [1.1, 1.7, 2.3]) {
          const k = (t - at) / 0.5;
          if (k >= 0 && k < 1) {
            const w = 2 + Math.round(4 * Math.abs(Math.sin(k * 12)));
            box(view.g, hsx + 14 - w / 2, hsy - 72 - Math.sin(k * Math.PI) * 40, w, 8, GOLD);
          }
        }
        // the coins flung in a ring
        if (t >= F && t < F + 0.5) {
          const k = (t - F) / 0.5;
          for (let c = 0; c < 16; c++) {
            const a = (c / 16) * Math.PI * 2 + k * 2;
            const r = 20 + k * 100;
            box(view.g, hsx + Math.cos(a) * r - 3, hsy - 30 + Math.sin(a) * r * 0.75 - 3, 6, 6, k > 0.8 ? hex('#8A5A00') : GOLD);
          }
        }
        return {
          hero: [H[0], hy],
          shake: TICKS.some((k) => t - F >= k && t - F < k + 0.08) ? 2 : 0,
          flash: t >= F && t < F + 0.2 ? 0.4 : 0,
        };
      },
    });
  },

  // Quill paces the Archive with his biting book, talking; then five footnotes, in fire.
  quill: () => {
    const F = F0;
    const foes = [
      { from: [140, 140], to: [178, 146] },
      { from: [140, 176], to: [180, 176] },
      { from: [276, 136], to: [240, 144] },
      { from: [276, 170], to: [238, 176] },
      { from: [208, 230], to: [208, 196] },
    ];
    return signature({
      path: 'intellectual', map: 'archive', at: [208, 122], F, dur: F + 1.1,
      move: 'FOOTNOTE BARRAGE', sfx: [[F, 'fire'], [F + 0.25, 'tkill']], shout: null, lines: WORLD_LINES,
      play(t, view, ui, S) {
        const pacing = t < 2.6;
        const hx = pacing ? 208 + Math.sin(t * 2.4) * 22 : 208;
        const dir = pacing ? (Math.cos(t * 2.4) > 0 ? 'right' : 'left') : 'down';
        const hy = 160;
        foes.forEach((f, i) => {
          const [x, y, moving] = approach(f.from, f.to, t, 1.0, F - 0.1);
          const hitAt = F + 0.25 + i * 0.03;
          const fade = clamp01((t - hitAt) / 0.35);
          if (fade < 1)
            walker(view, 'shadow', x, y, dirTo(208 - x, 160 - y), stepOf(t + i, moving), { white: t >= hitAt && t < hitAt + 0.1 ? 1 : 0, fade });
          const [sx, sy] = S(x, y);
          puffS(view.g, sx, sy, t - hitAt);
          pop(ui, '3', sx, sy, t - hitAt, hex('#FF8A3D'));
          // the bolt on its way
          const k = (t - F) / (hitAt - F);
          if (k >= 0 && k < 1) {
            const [hsx, hsy] = S(hx, hy - 10);
            const bx = lerp(hsx, sx, k);
            const by = lerp(hsy, sy - 24, k);
            box(view.g, bx - 6, by - 6, 12, 12, hex('#FF8A3D'));
            box(view.g, bx - 3, by - 3, 6, 6, hex('#FFE9A0'));
            box(view.g, bx - 4 - (sx - hsx) * 0.08, by - 2 - (sy - hsy) * 0.08, 5, 5, hex('#FF8A3D'));
          }
        });
        walker(view, 'quill', hx, hy, dir, stepOf(t * 1.6, pacing));
        // the book that bites, hovering at her shoulder, snapping
        const [sx, sy] = S(hx + 9, hy - 26 + Math.sin(t * 5) * 2);
        const open = Math.floor(t * (t > F ? 14 : 5)) % 2;
        box(view.g, sx - 9, sy - 6 - open * 3, 18, 6, hex('#7A3B1E'));
        box(view.g, sx - 9, sy + 3 + open * 3, 18, 6, hex('#7A3B1E'));
        if (open) box(view.g, sx - 7, sy - 1, 14, 5, hex('#F3ECDD'));
        return {
          hero: [hx, hy],
          shake: t >= F + 0.25 && t < F + 0.45 ? 4 : 0,
        };
      },
    });
  },

  // Sister Wren rings her bell and listens; the lantern flares, a heart comes back, and the light holds them.
  wren: () => {
    const F = F0;
    const H = [96, 90];
    const foes = [
      { from: [170, 80], to: [120, 84] },
      { from: [170, 104], to: [118, 102] },
      { from: [20, 92], to: [72, 92] },
    ];
    return signature({
      path: 'spiritual', map: 'chapel', at: [96, 70], F, dur: F + 1.6,
      move: 'LANTERN VIGIL', sfx: [[F, 'fire'], [F + 0.1, 'mend'], [F + 0.8, 'tkill']], shout: null, lines: WORLD_LINES,
      play(t, view, ui, S) {
        const walking = t < 1.5;
        const hx = walking ? lerp(74, H[0], t / 1.5) : H[0];
        const [hsx, hsy] = S(hx, H[1]);
        // her lantern: a warm pool, breathing; at F it flares wide
        const flare = t >= F ? Math.max(0, 1 - (t - F) / 1.4) : 0;
        glowS(view.g, hsx, hsy - 24, 40 + flare * 120, hex('#FFE9A0'), 0.35 + 0.08 * Math.sin(t * 4) + flare * 0.6);
        const burst = F + 0.8;
        foes.forEach((f, i) => {
          const [x, y, moving] = approach(f.from, f.to, t, 0.7, F - 0.1);
          const frozen = t >= F;
          const fade = clamp01((t - burst - 0.15) / 0.4);
          if (fade >= 1) return;
          walker(view, 'rusted', x, y, dirTo(H[0] - x, H[1] - y), frozen ? 0 : stepOf(t + i, moving), {
            tint: frozen ? hex('#CFE8FF') : null,
            white: t >= burst && t < burst + 0.1 ? 1 : 0,
            fade,
          });
          const [sx, sy] = S(x, y);
          pop(ui, '2', sx, sy, t - burst, hex('#FFE9A0'));
          puffS(view.g, sx, sy, t - burst - 0.15);
        });
        walker(view, 'wren', hx, H[1], walking ? 'right' : 'down', stepOf(t * 0.7, walking));
        // the bell: a little shimmer by her hand
        for (const at of [1.7, 2.2]) if (t >= at && t < at + 0.3) sparkle(view.g, hsx + 18, hsy - 30 - (t - at) * 30, 3, WHITE);
        if (t >= burst && t < burst + 0.35) ringS(view.g, hsx, hsy - 24, 20 + (t - burst) * 260, hex('#FFE9A0'), 4);
        if (t >= F + 0.1 && t < F + 0.8) pop(ui, '+1 HEART', hsx, hsy - 20, (t - F - 0.1) * 0.9, hex('#FF4D5E'));
        return {
          hero: [hx, H[1]],
          hp: t >= F + 0.1 ? 4 : 3,
          flash: t >= F && t < F + 0.3 ? 0.55 * (1 - (t - F) / 0.3) : 0,
          shake: t >= burst && t < burst + 0.2 ? 4 : 0,
        };
      },
    });
  },

  // Oren doesn't move. They run rings round her. She breathes in. Then they leave, quickly, through the air.
  oren: () => {
    const F = F0 + 0.4;
    const H = [128, 96];
    return signature({
      path: 'emotional', map: 'the-pit', at: [128, 78], F, dur: F + 1.1,
      move: 'ONE BREATH', sfx: [[F, 'boom'], [F + 0.15, 'tkill']], chargeAt: F - 0.6, shout: null, shoutAt: F - 0.6, lines: WORLD_LINES,
      play(t, view, ui, S) {
        const [hsx, hsy] = S(...H);
        const breathe = t >= F - 0.6 && t < F;
        if (breathe) ringS(view.g, hsx, hsy - 24, 90 * (1 - (t - F + 0.6) / 0.6) + 14, hex('#2DD4BF'), 3);
        // their circling slows as he breathes in, then stops
        const spin = (tt) => tt * 2.4 - Math.max(0, tt - (F - 0.6)) * 2.0;
        for (let i = 0; i < 4; i++) {
          const ang = spin(Math.min(t, F)) + (i * Math.PI) / 2;
          const r = 34 * clamp01((t - 0.2) / 0.8) + 4;
          let x = H[0] + Math.cos(ang) * r * 1.2;
          let y = H[1] + Math.sin(ang) * r * 0.7;
          if (t < 0.5) x += (1 - t / 0.5) * 80 * (i % 2 ? 1 : -1);
          if (t >= F) {
            const k = t - F;
            const a = Math.atan2(y - H[1], x - H[0]);
            x += Math.cos(a) * k * 220;
            y += Math.sin(a) * k * 160 - Math.sin(Math.min(1, k * 2) * Math.PI) * 20;
          }
          const fade = clamp01((t - F - 0.3) / 0.5);
          if (fade < 1)
            walker(view, 'shadow', x, y, t >= F ? ['down', 'left', 'up', 'right'][Math.floor(t * 14 + i) % 4] : dirTo(Math.cos(ang + 1.6), Math.sin(ang + 1.6)), t < F ? stepOf(t * 1.5 + i, true) : 0, {
              white: t >= F && t < F + 0.1 ? 1 : 0,
              fade,
            });
          const [sx, sy] = S(x, y);
          pop(ui, '6', sx, sy, t - F, hex('#2DD4BF'));
        }
        // one of them swings; he leans, slightly
        const lean = t >= 1.3 && t < 1.55 ? -4 : 0;
        walker(view, 'oren', H[0] + lean, H[1], t >= F && t < F + 0.6 ? 'right' : 'down', 0, { white: breathe && Math.floor(t * 10) % 2 ? 0.35 : 0 });
        if (t >= F && t < F + 0.3) {
          const k = (t - F) / 0.3;
          for (let a = 0; a < 6; a++) {
            const ang = (a * Math.PI) / 3;
            box(view.g, hsx + 30 + Math.cos(ang) * (16 + k * 30), hsy - 30 + Math.sin(ang) * (16 + k * 30), 8, 8, hex('#2DD4BF'));
          }
          box(view.g, hsx + 22, hsy - 38, 16, 16, WHITE);
        }
        return {
          hero: H,
          noCharge: true,
          shake: t >= F && t < F + 0.4 ? 8 : 0,
          flash: t >= F && t < F + 0.25 ? 0.6 * (1 - (t - F) / 0.25) : 0,
        };
      },
    });
  },

  // Pip can't keep still: hops, cartwheels, waves at the enemy. Then the lute plays, and plays again.
  pip: () => {
    const F = F0;
    const H = [264, 176];
    const foes = [0, 1, 2, 3].map((i) => {
      const a = (i * Math.PI) / 2 + 0.6;
      return { from: [H[0] + Math.cos(a) * 80, H[1] + Math.sin(a) * 60], to: [H[0] + Math.cos(a) * 22, H[1] + Math.sin(a) * 15] };
    });
    const R2 = F + 0.4;
    return signature({
      path: 'social', map: 'millbrook', at: [264, 156], F, dur: F + 1.2,
      move: 'ENCORE', sfx: [[F, 'fire'], [F + 0.4, 'tkill']], shout: null, shoutAt: F + 0.2, lines: WORLD_LINES,
      play(t, view, ui, S) {
        const busy = t < F - 0.7;
        const hx = busy ? H[0] + Math.sin(t * 3) * 18 : H[0];
        const hop = busy ? Math.round(Math.abs(Math.sin(t * 11)) * 5) : 0;
        const hy = (busy ? H[1] + Math.sin(t * 6) * 7 : H[1]) - hop;
        const wheel = t >= 1.0 && t < 1.6;
        const dir = wheel ? ['down', 'left', 'up', 'right'][Math.floor(t * 14) % 4] : busy ? (Math.cos(t * 3) > 0 ? 'right' : 'left') : 'down';
        const [hsx, hsy] = S(H[0], H[1]);
        foes.forEach((f, i) => {
          let [x, y, moving] = approach(f.from, f.to, t, 0.6, F - 0.1);
          const a = Math.atan2(y - H[1], x - H[0]);
          if (t >= F) {
            const k = ease(clamp01((t - F) / 0.25));
            x += Math.cos(a) * k * 18;
            y += Math.sin(a) * k * 12;
          }
          if (t >= R2) {
            const k = t - R2;
            x += Math.cos(a) * k * 120;
            y += Math.sin(a) * k * 90;
          }
          const fade = clamp01((t - R2 - 0.1) / 0.4);
          if (fade < 1)
            walker(view, 'sleeper', x, y, dirTo(H[0] - x, H[1] - y), stepOf(t * 0.6 + i, moving), {
              white: (t >= F && t < F + 0.1) || (t >= R2 && t < R2 + 0.1) ? 1 : 0,
              fade,
            });
          const [sx, sy] = S(x, y);
          pop(ui, '2', sx, sy, t - F, hex('#FF4FD8'));
          pop(ui, '2', sx, sy, t - R2, WHITE);
        });
        walker(view, 'pip', hx, hy, dir, stepOf(t * 2, busy && !wheel));
        // notes drifting up as she goes
        for (let n = 0; n < 6; n++) {
          const k = (t * 0.9 + n / 6) % 1;
          if (!busy) break;
          const [nx, ny] = S(hx + Math.sin(n * 2.1) * 10, hy - 20 - k * 20);
          box(view.g, nx, ny, 4, 4, hex('#FF4FD8'));
          box(view.g, nx + 3, ny - 9, 2, 10, hex('#FF4FD8'));
        }
        if (t >= F && t < F + 0.35) ringS(view.g, hsx, hsy - 24, 10 + ((t - F) / 0.35) * 90, hex('#FF4FD8'), 4);
        if (t >= R2 && t < R2 + 0.45) {
          const r = 10 + ((t - R2) / 0.45) * 150;
          ringS(view.g, hsx, hsy - 24, r, hex('#FF4FD8'), 5);
          ringS(view.g, hsx, hsy - 24, r * 0.7, WHITE, 2);
        }
        return {
          hero: [hx, hy],
          shake: (t >= F && t < F + 0.2 ? 3 : 0) + (t >= R2 && t < R2 + 0.3 ? 6 : 0),
          flash: t >= R2 && t < R2 + 0.2 ? 0.4 : 0,
        };
      },
    });
  },

  // Tamsin has work to do; Baron Plush would rather nap. The wrench settles it: he leaves, tumbling, through the air.
  tamsin: () => {
    const F = 0.8;
    const H = [126, 96];
    const PLUSH = [158, 96];
    const HIT = F + 0.12;
    return signature({
      path: 'occupational', map: 'sleeping-keep', at: [150, 80], F, dur: F + 1.9,
      move: 'HOLD THIS', sfx: [[F, 'fire'], [HIT, 'clunk'], [HIT + 0.04, 'boom'], [F + 0.75, 'clunk'], [F + 0.85, 'tkill']], shout: null, lines: WORLD_LINES,
      play(t, view, ui, S) {
        // the wrench: out through all of them to the far wall, and back to her hand
        const out = t >= F && t < F + 0.9;
        const k = (t - F) / 0.9;
        const wx = k < 0.5 ? lerp(H[0] + 12, 200, k * 2) : lerp(200, H[0] + 12, (k - 0.5) * 2);
        // up and away to the right, tumbling, still asleep
        const pa = t >= HIT ? t - HIT : 0;
        const px = PLUSH[0] + pa * 70;
        const py = PLUSH[1] - pa * 90 + pa * pa * 40;
        walker(view, 'plush', px, py, pa > 0 ? ['down', 'left', 'up', 'right'][Math.floor(t * 12) % 4] : 'left', 0, { white: pa > 0 && pa < 0.1 ? 1 : 0 });
        for (let z = 0; z < 3; z++) {
          const za = pa - z * 0.18;
          if (za <= 0) continue;
          const [sx, sy] = S(PLUSH[0] + za * 62, PLUSH[1] - za * 80);
          pop(ui, 'Z', sx, sy, za * 0.5, CREAM);
        }
        walker(view, 'tamsin', H[0], H[1], 'right', 0);
        if (out) {
          // the game's wrench, nine times as big, spinning
          const [cx, cy] = S(wx, H[1] - 10);
          const spin = (t - F) * 16;
          const L = 42;
          for (let q = -L; q <= L; q += 2) {
            const qx = cx + Math.cos(spin) * q;
            const qy = cy + Math.sin(spin) * q;
            box(view.g, qx - 4, qy - 4, 9, 9, q > L - 14 ? hex('#D8D8E0') : hex('#C8C8D0'));
            if (q < -L + 8) box(view.g, qx - 4, qy - 4, 9, 9, hex('#8A8A94'));
          }
          for (const side of [-1, 1]) {
            const qx = cx + Math.cos(spin) * L + Math.cos(spin + (side * Math.PI) / 2) * 10;
            const qy = cy + Math.sin(spin) * L + Math.sin(spin + (side * Math.PI) / 2) * 10;
            box(view.g, qx - 6, qy - 6, 12, 12, hex('#C8C8D0'));
          }
        }
        return { hero: H, shake: t >= HIT && t < HIT + 0.25 ? 7 : 0, flash: t >= HIT && t < HIT + 0.15 ? 0.4 : 0 };
      },
    });
  },

  // Moss wanders off and turns up somewhere else. Then he looses a volley straight up, and it comes down on all of them.
  moss: () => {
    const F = F0;
    const foes = [
      { from: [260, 40], to: [214, 62] },
      { from: [264, 110], to: [216, 100] },
      { from: [120, 40], to: [168, 60] },
      { from: [124, 120], to: [166, 102] },
    ];
    const VOLLEYS = [0.45, 0.75];
    const FALL = 0.3;
    return signature({
      path: 'environmental', map: 'field-of-banners', at: [190, 64], F, dur: F + 1.4,
      move: 'ARROW BARRAGE', sfx: [[F, 'fire'], [F + 0.45, 'thit'], [F + 0.75, 'tkill']], shout: null, sub: 'ONCE A DAY · AFTER A REAL HABIT', lines: WORLD_LINES,
      play(t, view, ui, S) {
        // Moss: walks in, fades out, turns up a little way off
        let mx = lerp(164, 184, clamp01(t / 0.9));
        let fade = 0;
        if (t >= 0.9 && t < 1.3) fade = (t - 0.9) / 0.4;
        else if (t >= 1.3 && t < 1.6) fade = 1;
        else if (t >= 1.6 && t < 2.0) fade = 1 - (t - 1.6) / 0.4;
        if (t >= 1.45) mx = 192;
        const my = t >= 1.45 ? 80 : 84;
        const [msx, msy] = S(mx, my);
        foes.forEach((f, i) => {
          const [x, y, moving] = approach(f.from, f.to, t, 0.8, F - 0.1);
          const lands = VOLLEYS.map((v) => F + v + i * 0.04);
          const gone = clamp01((t - lands[1] - 0.05) / 0.35);
          const [sx, sy] = S(x, y);
          // the shadow of what's coming, growing as it falls
          for (const at of lands) {
            const k = (t - (at - FALL)) / FALL;
            if (k >= 0 && k < 1) box(view.g, sx - 3 - k * 9, sy - 2, 6 + k * 18, 4, mix(hex('#2F5A22'), INK, 0.4));
          }
          if (gone < 1)
            walker(view, 'shadow', x, y, dirTo(mx - x, my - y), stepOf(t + i, moving), {
              white: lands.some((at) => t >= at && t < at + 0.1) ? 1 : 0,
              fade: gone,
            });
          // three arrows a volley, dropping out of the sky
          for (const at of lands) {
            const k = (t - (at - FALL)) / FALL;
            if (k < 0 || k >= 1) continue;
            for (const dx of [-12, 0, 12]) {
              const ax = sx + dx + (1 - k) * 20;
              const ay = sy - 30 - (1 - k) * 260 + Math.abs(dx);
              box(view.g, ax, ay - 24, 3, 24, hex('#C8A870'));
              box(view.g, ax - 3, ay, 9, 6, hex('#D8D8E0'));
              box(view.g, ax - 3, ay - 27, 3, 6, hex('#4ADE80'));
              box(view.g, ax + 3, ay - 27, 3, 6, hex('#4ADE80'));
            }
          }
          for (const at of lands) pop(ui, '2', sx, sy, t - at, hex('#4ADE80'));
          puffS(view.g, sx, sy, t - lands[1] - 0.05);
        });
        walker(view, 'moss', mx, my, t >= F - 0.7 ? 'up' : 'down', stepOf(t, t < 0.9), { fade });
        // the volley going up
        if (t >= F && t < F + 0.35) {
          const k = (t - F) / 0.35;
          for (const dx of [-14, -5, 4, 13]) box(view.g, msx + dx + k * dx, msy - 70 - k * 300, 3, 22, hex('#C8A870'));
        }
        return {
          hero: [mx, my],
          noCharge: fade > 0,
          shake: VOLLEYS.some((v) => t >= F + v && t < F + v + 0.12) ? 4 : 0,
        };
      },
    });
  },
};

/** Splits text into lines of at most `n` letters, on spaces. */
function wrap(text, n) {
  const out = [''];
  for (const w of text.split(' ')) {
    const cur = out[out.length - 1];
    if (cur && cur.length + 1 + w.length > n) out.push(w);
    else out[out.length - 1] = cur ? `${cur} ${w}` : w;
  }
  return out;
}
/** The top of a walker (head and shoulders), drawn big in a dialogue box: the game's portraits (portraits.ts). */
function portrait(ui, id, x, y, sc, lift) {
  const sy = WALKER_ROW[id] * 24;
  for (let py = 0; py < 17; py++)
    for (let px = 0; px < 16; px++) {
      const i = ((sy + py) * WALKERS.width + px) * 4;
      if (WALKERS.data[i + 3] < 128) continue;
      box(ui, x + px * sc, y + py * sc - lift, sc, sc, [WALKERS.data[i], WALKERS.data[i + 1], WALKERS.data[i + 2]]);
    }
}
// The Scroll theme (palettes.ts), the game's dialogue box.
const SCROLL = { background: hex('#F0D9A7'), card: hex('#F8EACB'), frame: hex('#4A3423'), accent: hex('#9A3412'), text: hex('#2E1F14') };

/**
 * Straight after the move: someone they know walks up, and they talk, in the
 * game's dialogue box (portrait, name, the line typing in). `lines` are
 * [speaker id, name, text].
 */
function talk({ map: name, at, hero, friend, from, lines }) {
  const ARRIVE = 0.7;
  const spans = [];
  let t0 = ARRIVE;
  for (const [, , txt] of lines) {
    const len = letterTimes(txt).at(-1) + 1.0;
    spans.push([t0, t0 + len]);
    t0 += len;
  }
  const voices = lines.map(([id, label]) => voiceFor(titleCase(label), id));
  const dur = t0 + 0.2;
  const BX = 8;
  const BW = GW - 16;
  const PS = 3;
  const TX = BX + 10 + 16 * PS + 10;
  const PER = Math.floor((BX + BW - 8 - TX) / 12);
  return {
    dur,
    frame(t) {
      const view = mapView(name, at[0], at[1]);
      const ui = blankUi();
      const k = ease(clamp01(t / ARRIVE));
      const fx = lerp(from[0], friend.at[0], k);
      const fy = lerp(from[1], friend.at[1], k);
      const n = spans.findIndex(([a, b]) => t >= a && t < b);
      const cur = n >= 0 ? n : t < ARRIVE ? -1 : lines.length - 1;
      const speaking = cur >= 0 ? lines[cur][0] : null;
      const age = cur >= 0 ? t - spans[cur][0] : 0;
      // only the line being typed speaks: the last one, held after it's done, stays quiet
      const said = cur >= 0 ? speak(lines[cur][2].toUpperCase(), age, n === cur ? voices[cur] : null) : null;
      const typed = said ? said.shown : 0;
      const blip = said && !said.done ? said.lift : 0;
      // the two of them, face to face; whoever's talking bobs with their voice
      walker(view, friend.id, fx, fy - (speaking === friend.id ? blip : 0), k < 1 ? dirTo(friend.at[0] - from[0], friend.at[1] - from[1]) : dirTo(hero.at[0] - fx, hero.at[1] - fy), stepOf(t, k < 1));
      walker(view, hero.id, hero.at[0], hero.at[1] - (speaking === hero.id ? blip : 0), t < ARRIVE * 0.5 ? 'down' : dirTo(fx - hero.at[0], fy - hero.at[1]), 0);
      if (cur >= 0) {
        const [who, label, txt] = lines[cur];
        const rows = wrap(txt.toUpperCase(), PER);
        const BH = Math.max(16 * PS + 14, 30 + rows.length * 18);
        const BY = 262;
        box(ui, BX - 3, BY - 3, BW + 6, BH + 6, SCROLL.frame);
        box(ui, BX, BY, BW, BH, SCROLL.card);
        box(ui, BX + 6, BY + 6, 16 * PS + 8, 16 * PS + 8, SCROLL.frame);
        box(ui, BX + 8, BY + 8, 16 * PS + 4, 16 * PS + 4, SCROLL.background);
        portrait(ui, who, BX + 10, BY + 8, PS, blip);
        box(ui, BX + 8, BY + 8 + 16 * PS + 4, 16 * PS + 4, 2, SCROLL.frame);
        textL(ui, label, 2, TX, BY + 8, SCROLL.accent, { outline: false });
        let left = typed;
        rows.forEach((r, i) => {
          textL(ui, r, 2, TX, BY + 28 + i * 18, SCROLL.text, { outline: false, count: Math.max(0, left) });
          left -= r.length + 1;
        });
        // the "more" arrow once the line's out
        if (said.done && Math.floor(t * 3) % 2) box(ui, BX + BW - 14, BY + BH - 10, 6, 4, SCROLL.accent);
      }
      // in close on the two of them (4 screen pixels to an art pixel), their feet just above the box
      const [ax, ay] = toS(view, (hero.at[0] + friend.at[0]) / 2, hero.at[1]);
      const cam = camAt(4 / 3, [ax, ay - 30]);
      cam.anchor = [GW / 2, 210];
      return { scene: view.g, ui, cam: opening(t, cam, false) };
    },
  };
}
/** Who comes to find each hero after the fight, and what they say. */
const TALKS = {
  brannoc: { friend: 'oren', lines: [['brannoc', 'BRANNOC', 'That was so scary.'], ['oren', 'OREN', 'You beat them with one swing.'], ['brannoc', 'BRANNOC', "I didn't see. I had my eyes closed."]] },
  ysolde: { friend: 'tamsin', lines: [['ysolde', 'YSOLDE', 'They owe me six coppers.'], ['tamsin', 'TAMSIN', "They're gone."], ['ysolde', 'YSOLDE', 'Then I want their next of kin.']] },
  quill: { friend: 'ysolde', lines: [['quill', 'QUILL', "That's odd... the ladies will go crazy for this new move."], ['ysolde', 'YSOLDE', "No they won't."], ['quill', 'QUILL', 'I know...']] },
  wren: { friend: 'brannoc', lines: [['wren', 'SISTER WREN', 'Are you hurt?'], ['brannoc', 'BRANNOC', 'Gravely. My pride.'], ['wren', 'SISTER WREN', "I'm sorry. I can't help with that."]] },
  oren: { friend: 'pip', lines: [['pip', 'PIP', 'That was AMAZING! Again!'], ['oren', 'OREN', 'No.'], ['pip', 'PIP', 'Encore?'], ['oren', 'OREN', '...No.']] },
  pip: { friend: 'pell', lines: [['pip', 'PIP', 'Pell! Did you like the performance?'], ['pell', 'PELL', 'Eh. It was mid.'], ['pip', 'PIP', '...Why do you talk like that?']] },
  // Tamsin's talk comes first: she walks up to Plush, and then the wrench answers him.
  tamsin: { friend: 'tamsin', host: 'plush', first: true, lines: [['tamsin', 'TAMSIN', "There's work to be done."], ['plush', 'BARON PLUSH', 'Can we take a nap first?']] },
  moss: { friend: 'jory', lines: [['moss', 'MOSS', 'Sorry about the birds.'], ['jory', 'JORY', 'What birds?'], ['moss', 'MOSS', '...Exactly.']] },
};
/** Where each talk happens: the fight's own place, the hero where they ended up, the friend walking in from one side. */
const TALK_SPOTS = {
  brannoc: { map: 'barracks-hall', at: [142, 106], hero: [134, 126], friend: [156, 126], from: [210, 126] },
  ysolde: { map: 'kingdom-town', at: [330, 162], hero: [320, 182], friend: [342, 182], from: [400, 182] },
  quill: { map: 'archive', at: [208, 140], hero: [198, 160], friend: [220, 160], from: [270, 160] },
  wren: { map: 'chapel', at: [96, 70], hero: [86, 90], friend: [108, 90], from: [170, 90] },
  oren: { map: 'the-pit', at: [128, 76], hero: [118, 96], friend: [140, 96], from: [200, 96] },
  pip: { map: 'millbrook', at: [264, 156], hero: [254, 176], friend: [276, 176], from: [330, 176] },
  tamsin: { map: 'sleeping-keep', at: [150, 80], hero: [158, 96], friend: [132, 96], from: [80, 96] },
  moss: { map: 'field-of-banners', at: [190, 64], hero: [180, 80], friend: [202, 80], from: [260, 80] },
};

/** The real-life habit that levels each hero, in their Path's words. */
const SIG_HABITS = {
  brannoc: { path: 'physical', quest: 'MOVE 30 MIN', name: 'BRANNOC', move: 'SWEETHEART SWING', lines: [['I WENT'], ['FOR A RUN.', Y]] },
  ysolde: { path: 'financial', quest: 'LOG SPENDING', name: 'YSOLDE', move: 'COLLECT THE TAB', lines: [['I CHECKED'], ['MY BUDGET.', Y]] },
  quill: { path: 'intellectual', quest: 'READ 20 MIN', name: 'QUILL', move: 'FOOTNOTE BARRAGE', lines: [['I READ'], ['20 PAGES.', Y]] },
  wren: { path: 'spiritual', quest: 'GRATITUDE', name: 'SISTER WREN', move: 'LANTERN VIGIL', lines: [['I WROTE 3'], ['THANK-YOUS.', Y]] },
  oren: { path: 'emotional', quest: 'JOURNAL', name: 'OREN', move: 'ONE BREATH', lines: [['I JOURNALED'], ['FOR 5 MIN.', Y]] },
  pip: { path: 'social', quest: 'CALL A FRIEND', name: 'PIP', move: 'ENCORE', lines: [['I CALLED'], ['MY MOM.', Y]] },
  tamsin: { path: 'occupational', quest: 'DEEP WORK', name: 'TAMSIN', move: 'HOLD THIS', lines: [['1 HOUR OF'], ['DEEP WORK.', Y]] },
  moss: { path: 'environmental', quest: 'WALK OUTSIDE', name: 'MOSS', move: 'ARROW BARRAGE', lines: [['I WENT'], ['OUTSIDE.', Y]] },
};
/** Habit done → hero levels to 10 and learns their move → the move in the Other World → someone they know comes over to talk → 8 PATHS. */
const signatureCut = (hero) => {
  const h = SIG_HABITS[hero];
  // who stands waiting (`host`, else the hero after their fight) and who walks up (`friend`)
  const conversation = talk({
    map: TALK_SPOTS[hero].map,
    at: TALK_SPOTS[hero].at,
    hero: { id: TALKS[hero].host ?? hero, at: TALK_SPOTS[hero].hero },
    friend: { id: TALKS[hero].friend, at: TALK_SPOTS[hero].friend },
    from: TALK_SPOTS[hero].from,
    lines: TALKS[hero].lines,
  });
  return [
    habit({ path: h.path, hero, quest: h.quest, lv: 9, dur: 0.6 + FILL + 1.05, evolve: FILL, impact: true, lines: h.lines, who: h.name, move: h.move }),
    ...(TALKS[hero].first ? [conversation, SIG_SCENES[hero]()] : [SIG_SCENES[hero](), conversation]),
    endCard({ dur: 4.2, powered: true }),
  ];
};

// ---- the cuts
const brannoc = (dur, impact = true) =>
  habit({ path: 'physical', hero: 'brannoc', quest: 'MOVE 30 MIN', lv: 14, dur, impact, lines: [['I WENT'], ['FOR A RUN.', Y]] });
const quill = (dur) => habit({ path: 'intellectual', hero: 'quill', quest: 'READ 20 MIN', lv: 8, dur, lines: [['I READ'], ['20 PAGES.', Y]] });
const pip = (dur) => habit({ path: 'social', hero: 'pip', quest: 'CALL A FRIEND', lv: 11, dur, lines: [['I CALLED'], ['MY MOM.', Y]] });
const EVERY = [['EVERY HABIT'], ['HAS A HERO.', Y]];
const montage = (each, picks) =>
  [
    { path: 'financial', hero: 'ysolde', quest: 'LOG SPENDING', lv: 6 },
    { path: 'spiritual', hero: 'wren', quest: 'PRAY', lv: 9 },
    { path: 'emotional', hero: 'oren', quest: 'JOURNAL', lv: 12 },
    { path: 'occupational', hero: 'tamsin', quest: 'DEEP WORK', lv: 17 },
    { path: 'environmental', hero: 'moss', quest: 'WALK OUTSIDE', lv: 5 },
    { path: 'social', hero: 'pip', quest: 'CALL A FRIEND', lv: 11 },
  ]
    .filter((m) => picks.includes(m.hero))
    .map((m) => habit({ ...m, dur: each, fast: true, lines: EVERY }));
const juniper = (dur, at) =>
  hatch({
    path: 'emotional',
    hero: 'juniper',
    name: 'JUNIPER',
    number: '#042',
    rarity: 5,
    linesA: [['KEEP'], ['SHOWING UP...', Y]],
    linesB: [['NEW HEROES'], ['WAKE UP.', Y]],
    dur,
    at,
  });

const CUTS = {
  30: () => [
    brannoc(3.0),
    quill(2.6),
    pip(2.6),
    ...montage(0.7, ['ysolde', 'wren', 'oren', 'tamsin', 'moss']),
    juniper(4.4, 2.6),
    collection({ dur: 2.4, lines: [['COLLECT'], ['100+ HEROES.', Y]] }),
    battle({ dur: 5.6, linesA: [['STRONGER'], ['HABITS...', Y]], linesB: [['...STRONGER'], ['HITS.', Y]] }),
    endCard({ dur: 5.9 }),
  ],
  15: () => [
    brannoc(2.8),
    quill(2.3),
    ...montage(0.6, ['pip', 'ysolde', 'oren', 'moss']),
    juniper(3.8, 2.2),
    endCard({ dur: 3.7 }),
  ],
  6: () => [brannoc(2.7), endCard({ dur: 3.3, lines: [['YOUR HABITS'], ['ARE THE XP.', Y]] })],
  // the cold open for the story series: Brannoc hatches, and the title drops
  prince: () => [
    hatch({
      path: 'physical',
      hero: 'brannoc',
      name: 'BRANNOC',
      number: '#008',
      rarity: 3,
      sub: 'STRONGEST MAN ALIVE. ALLEGEDLY.',
      linesA: [['SOMEONE IS'], ['WAKING UP!', Y]],
      linesB: [['THE PRINCE'], ['WHO RAN.', Y]],
      dur: 7.0,
      at: 4.4,
      wiggles: [0.3, 1.4, 2.4],
      impact: true,
    }),
  ],
  // the egg, then how it works, then the game, then where to get it
  tour: () => [
    hatch({
      path: 'physical',
      hero: 'brannoc',
      name: 'BRANNOC',
      number: '#008',
      rarity: 3,
      sub: 'THE WARRIOR · YOUR FIRST HERO',
      linesA: [['SOMEONE IS'], ['WAKING UP!', Y]],
      linesB: [['MEET YOUR'], ['FIRST HERO.', Y]],
      dur: 7.5,
      at: 5.0,
      wiggles: [0.3, 1.5, 2.6],
      impact: true,
    }),
    questList({ dur: 3.4, step: 1, lines: [['ADD YOUR'], ['HABITS.', Y]] }),
    pathsGrid({ dur: 3.6, step: 2, lines: [['EACH ONE'], ['FEEDS A PATH', Y]] }),
    habit({ path: 'physical', hero: 'brannoc', quest: 'MOVE 30 MIN', lv: 14, dur: 3.0, step: 3, lines: [['DO IT IN'], ['REAL LIFE.', Y]] }),
    streak({ dur: 3.0, step: 4, lines: [['SHOW UP'], ['EVERY DAY.', Y]] }),
    radar({ dur: 3.0, step: 5, lines: [['SEE YOUR'], ['WHOLE LIFE.', Y]] }),
    worldWalk({ dur: 3.6, lines: [['ENTER THE'], ['OTHER WORLD.', Y]] }),
    worldFight({ dur: 6.0, lines: [['TRAIN IRL.'], ['HIT HARDER.', Y]], linesB: [['HABITS'], ['UNLOCK MOVES', Y]] }),
    endCard({ dur: 5.0 }),
  ],
};
// one per core companion: `node scripts/ad-video.mjs sig-brannoc out.mp4`
for (const hero of Object.keys(SIG_SCENES)) CUTS[`sig-${hero}`] = () => signatureCut(hero);
if (!CUTS[cut]) throw new Error(`Unknown cut ${cut}: use 30, 15, 6, tour, prince or sig-<hero> (${Object.keys(SIG_SCENES).join(', ')}).`);
const scenes = CUTS[cut]();

// ---- render: sample the scene through the camera, lay the overlay on top
const buf = Buffer.alloc(W * H * 4);
const colX = new Int32Array(W);
const rowY = new Int32Array(H);
const shakeRnd = rng(3);
const ff = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '17',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', `${out}.silent.mp4`],
  { stdio: ['pipe', 'ignore', 'inherit'] },
);
let total = 0;
for (const sc of scenes) {
  const n = Math.round(sc.dur * FPS);
  for (let f = 0; f < n; f++) {
    NOW = total / FPS;
    const { scene, ui, cam } = sc.frame(f / FPS);
    const sx0 = cam.shake ? (shakeRnd() - 0.5) * 2 * cam.shake : 0;
    const sy0 = cam.shake ? (shakeRnd() - 0.5) * 2 * cam.shake : 0;
    for (let X = 0; X < W; X++) colX[X] = Math.min(GW - 1, Math.max(0, Math.floor(cam.focus[0] + (X / K - cam.anchor[0]) / cam.z + sx0)));
    for (let Yp = 0; Yp < H; Yp++) rowY[Yp] = Math.min(GH - 1, Math.max(0, Math.floor(cam.focus[1] + (Yp / K - cam.anchor[1]) / cam.z + sy0)));
    const ux = Math.round(sx0 * 0.5);
    const uy = Math.round(sy0 * 0.5);
    for (let Yp = 0; Yp < H; Yp++) {
      const srow = scene[rowY[Yp]];
      const urow = ui[Math.floor(Yp / K) - uy] ?? null;
      for (let X = 0; X < W; X++) {
        const u = urow ? urow[Math.floor(X / K) - ux] : null;
        let c = srow[colX[X]];
        if (u) c = u.length === 4 ? mix(c, u, u[3]) : u;
        const i = (Yp * W + X) * 4;
        const fl = cam.flash;
        buf[i] = fl > 0 ? c[0] + (255 - c[0]) * fl : c[0];
        buf[i + 1] = fl > 0 ? c[1] + (255 - c[1]) * fl : c[1];
        buf[i + 2] = fl > 0 ? c[2] + (255 - c[2]) * fl : c[2];
        buf[i + 3] = 255;
      }
    }
    if (!ff.stdin.write(Buffer.from(buf))) await once(ff.stdin, 'drain');
    total++;
  }
}
ff.stdin.end();
await once(ff, 'close');

// ---- the voices: each blip at the game's volume (sounds.ts EFFECT_VOLUME 0.5); no music, add a sound when posting
const silent = `${out}.silent.mp4`;
if (SOUNDS.length === 0) renameSync(silent, out);
else {
  const RATE = 22050;
  const pcm = (path) => {
    const b = readFileSync(path);
    const at = b.indexOf('data') + 8;
    return new Int16Array(b.buffer.slice(b.byteOffset + at, b.byteOffset + b.length));
  };
  // The 8-bit bank (chip-sounds.mjs) for everything but the voices, which are the game's own blips.
  const clips = chipSounds(RATE);
  for (let v = 1; v <= 5; v++) clips[`blip${v}`] = Float32Array.from(pcm(`assets/audio/blip-${v}.wav`), (x) => x / 32768);
  const VOLUME = { blip1: 0.5, blip2: 0.5, blip3: 0.5, blip4: 0.5, blip5: 0.5 };
  const mix = new Float32Array(Math.ceil((total / FPS) * RATE));
  for (const [at, name] of SOUNDS) {
    const start = Math.round(at * RATE);
    const clip = clips[name];
    const gain = VOLUME[name] ?? 1;
    for (let i = 0; i < clip.length && start + i < mix.length; i++) if (start + i >= 0) mix[start + i] += clip[i] * gain;
  }
  const wav = Buffer.alloc(44 + mix.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + mix.length * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(RATE, 24);
  wav.writeUInt32LE(RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(mix.length * 2, 40);
  mix.forEach((v, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  const voices = `${out}.voices.wav`;
  writeFileSync(voices, wav);
  // Upload-safe for Instagram, TikTok and YouTube: 48 kHz stereo AAC, BT.709 colour tags, the index up front.
  const mux = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', silent, '-i', voices, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest', out],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const [code] = await once(mux, 'close');
  unlinkSync(silent);
  unlinkSync(voices);
  if (code !== 0) throw new Error(`ffmpeg mux failed: ${code}`);
}
console.log(`Wrote ${out} (${total} frames, ${(total / FPS).toFixed(1)}s, ${SOUNDS.length} sounds).`);
