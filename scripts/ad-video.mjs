// The habit RPG ad: vertical 1080×1920 at 30fps, drawn on the same 270×480
// pixel art as the app (realms, sprites, the cocoon), so every shot is full
// frame and matches the game. One idea, shown over and over: a real habit →
// XP → your hero levels up.
//
//   node scripts/ad-video.mjs 30 out-30.mp4      # 30s, 15s or 6s cut
//   CTA='FREE ON THE|APP STORE' node scripts/ad-video.mjs 15 out.mp4
//
// Needs ffmpeg. Silent on purpose: add a trending sound in TikTok/Reels.
// Text is centred and kept clear of TikTok's bottom caption.

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdirSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

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
function habit({ path, hero, quest, lines, lv, dur, fast = false, impact = false, step = 0 }) {
  const P = PATHS[path];
  const tCheck = fast ? 0.1 : 0.62;
  const tOrbs = fast ? [0.13, 0.32] : [0.68, 1.08];
  const tLv = fast ? 0.34 : 1.15;
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
        const filled = t < tOrbs[1] ? 0.72 : lerp(0.72, 1, ease((t - tOrbs[1]) / 0.15));
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
      // LEVEL UP
      if (lt >= 0) {
        const sc = lt < 0.08 ? 5 : 4;
        text(ui, 'LEVEL UP!', sc, 132 - (sc - 4) * 4, GOLD);
        const label = `${P.cls} LV ${lv} > ${lv + 1}`;
        text(ui, label, 2, 170, hex(P.neon), { count: Math.floor((lt - 0.1) / 0.02) });
      }
      if (step) stepTag(ui, step);
      headline(ui, lines);

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
      const scene = backdrop(path, t);
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
function endCard({ dur, lines = null }) {
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
      if (logo >= 0) {
        const big = logo < 0.08 ? 7 : 6;
        text(ui, 'EIGHT', big, top - (big - 6) * 4, WHITE, { cx: GW / 2 });
        text(ui, 'PATHS', big, top + 48 - (big - 6) * 4, WHITE, { cx: GW / 2 });
        text(ui, 'THE HABIT RPG', 3, top + 104, hex('#FF4D5E'), { cx: GW / 2, count: Math.floor((logo - 0.15) / 0.03) });
      }
      if (logo > 0.6) text(ui, 'NO ADS · WORKS OFFLINE', 1, top + 136, CREAM, { cx: GW / 2 });
      if (logo > 0.9) CTA.forEach((s, i) => text(ui, s, 2, top + 156 + i * 18, GOLD, { cx: GW / 2 }));
      if (logo > 1.2) text(ui, '@8PATHSS', 2, top + 156 + CTA.length * 18 + 10, hex('#D8D2E6'), { cx: GW / 2 });
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
const WALKER_ROW = { brannoc: 0, pell: 8, raider: 23 };
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

// ---- the cuts
const Y = hex('#FFE066');
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
if (!CUTS[cut]) throw new Error(`Unknown cut ${cut}: use 30, 15, 6 or tour.`);
const scenes = CUTS[cut]();

// ---- render: sample the scene through the camera, lay the overlay on top
const buf = Buffer.alloc(W * H * 4);
const colX = new Int32Array(W);
const rowY = new Int32Array(H);
const shakeRnd = rng(3);
const ff = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'ignore', 'inherit'] },
);
let total = 0;
for (const sc of scenes) {
  const n = Math.round(sc.dur * FPS);
  for (let f = 0; f < n; f++) {
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
ff.on('close', (code) => console.log(code === 0 ? `Wrote ${out} (${total} frames, ${(total / FPS).toFixed(1)}s).` : `ffmpeg failed: ${code}`));
