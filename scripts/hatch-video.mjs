// A vertical hatch video for social posts: 1080×1920 at 30fps, drawn on the
// same 270×480 scenes as the app's character reveal (scripts/realm-art.mjs),
// so the post and the game play the same moment.
//
//   META='{"name":"PIP","subtitle":"THE BARD · THE FESTIVAL CITY","number":"#082","color":"#FF4FD8",
//          "rarity":5,"episode":1,"goose":true}' node scripts/hatch-video.mjs pip social out.mp4
//
// Needs ffmpeg. Silent on purpose: the hatch lands at exactly 0:08 so a song's
// beat drop can be lined up in TikTok.
//
// 0.0  wide shot, then an impact zoom onto the cocoon: flash, shake, headline
// 0.3  wiggle              2.4  wiggle           4.2  wiggle and the first crack
// 5.0  stillness           5.6  the shake builds, cracking and glowing
// 6.6  silence: an eye opens in the silk, the camera punches in, it blinks
// 7.35 the camera snaps back, the shake turns violent
// 8.0  the hatch: flash, silk shards, the character, name and stars
// 12.8 a flash that loops back to the start

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

import { COCOON_H, EYE, GH, GROUND, GW, box, drawCocoon, drawRealm, hex, mix, put } from './realm-art.mjs';

const [id, dimension, out] = process.argv.slice(2);
const meta = JSON.parse(process.env.META);
const K = 4;
const W = GW * K;
const H = GH * K;
const FPS = 30;
const HATCH = 8.0;
const END = 13.0;
const WHITE = [255, 255, 255];
const INK = [7, 6, 11];
let seed = 11;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// ---- a 5×7 pixel font
// prettier-ignore
const F = {A:['.XXX.','X...X','X...X','XXXXX','X...X','X...X','X...X'],B:['XXXX.','X...X','X...X','XXXX.','X...X','X...X','XXXX.'],C:['.XXX.','X...X','X....','X....','X....','X...X','.XXX.'],D:['XXXX.','X...X','X...X','X...X','X...X','X...X','XXXX.'],E:['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],F:['XXXXX','X....','X....','XXXX.','X....','X....','X....'],G:['.XXX.','X...X','X....','X.XXX','X...X','X...X','.XXX.'],H:['X...X','X...X','X...X','XXXXX','X...X','X...X','X...X'],I:['XXXXX','..X..','..X..','..X..','..X..','..X..','XXXXX'],J:['..XXX','...X.','...X.','...X.','X..X.','X..X.','.XX..'],K:['X...X','X..X.','X.X..','XX...','X.X..','X..X.','X...X'],L:['X....','X....','X....','X....','X....','X....','XXXXX'],M:['X...X','XX.XX','X.X.X','X.X.X','X...X','X...X','X...X'],N:['X...X','XX..X','X.X.X','X..XX','X...X','X...X','X...X'],O:['.XXX.','X...X','X...X','X...X','X...X','X...X','.XXX.'],P:['XXXX.','X...X','X...X','XXXX.','X....','X....','X....'],Q:['.XXX.','X...X','X...X','X...X','X.X.X','X..X.','.XX.X'],R:['XXXX.','X...X','X...X','XXXX.','X.X..','X..X.','X...X'],S:['.XXXX','X....','X....','.XXX.','....X','....X','XXXX.'],T:['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],U:['X...X','X...X','X...X','X...X','X...X','X...X','.XXX.'],V:['X...X','X...X','X...X','X...X','X...X','.X.X.','..X..'],W:['X...X','X...X','X...X','X.X.X','X.X.X','X.X.X','.X.X.'],X:['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],Y:['X...X','X...X','.X.X.','..X..','..X..','..X..','..X..'],Z:['XXXXX','....X','...X.','..X..','.X...','X....','XXXXX'],0:['.XXX.','X...X','X..XX','X.X.X','XX..X','X...X','.XXX.'],1:['..X..','.XX..','..X..','..X..','..X..','..X..','.XXX.'],2:['.XXX.','X...X','....X','...X.','..X..','.X...','XXXXX'],3:['XXXX.','....X','....X','.XXX.','....X','....X','XXXX.'],4:['...X.','..XX.','.X.X.','X..X.','XXXXX','...X.','...X.'],5:['XXXXX','X....','XXXX.','....X','....X','X...X','.XXX.'],6:['.XXX.','X....','X....','XXXX.','X...X','X...X','.XXX.'],7:['XXXXX','....X','...X.','..X..','.X...','.X...','.X...'],8:['.XXX.','X...X','X...X','.XXX.','X...X','X...X','.XXX.'],9:['.XXX.','X...X','X...X','.XXXX','....X','....X','.XXX.'],'!':['..X..','..X..','..X..','..X..','..X..','.....','..X..'],'#':['.X.X.','.X.X.','XXXXX','.X.X.','XXXXX','.X.X.','.X.X.'],'.':['.....','.....','.....','.....','.....','.....','..X..'],"'":['..X..','..X..','.....','.....','.....','.....','.....'],' ':['.....','.....','.....','.....','.....','.....','.....'],'·':['.....','.....','.....','..X..','.....','.....','.....']};
/** Centred text on the overlay; `count` letters shown, for typing. */
const text = (g, s, sc, y, c, { count = s.length, shadow = INK, cx = GW / 2 } = {}) => {
  let x = Math.round(cx - (s.length * 6 * sc - sc) / 2);
  [...s].slice(0, count).forEach((ch) => {
    (F[ch] ?? F[' ']).forEach((row, r) =>
      [...row].forEach((p, col) => {
        if (p !== 'X') return;
        if (shadow) box(g, x + col * sc + Math.max(1, sc / 2), y + r * sc + Math.max(1, sc / 2), sc, sc, shadow);
        box(g, x + col * sc, y + r * sc, sc, sc, c);
      }),
    );
    x += 6 * sc;
  });
};

// ---- the character
const sheet = PNG.sync.read(readFileSync(`assets/sprites/${id}/idle.png`));
const frames = Math.max(1, Math.round(sheet.width / (32 * 12)));
const drawSprite = (g, frame, sc, cx, by) => {
  for (let y = 0; y < 48 * sc; y++)
    for (let x = 0; x < 32 * sc; x++) {
      const i = (Math.floor(y / sc) * 12 * sheet.width + Math.floor(x / sc) * 12 + (frame % frames) * 32 * 12) * 4;
      if (sheet.data[i + 3] < 128) continue;
      put(g, cx - 16 * sc + x, by - 48 * sc + y, [sheet.data[i], sheet.data[i + 1], sheet.data[i + 2]]);
    }
};
const GOOSE = ['...WWW..', '..WWKWOO', '..WWWWOO', '...WW...', '...WW...', '..WWW...', '.WWWWWW.', 'WWWWWWWW', 'WWWWWWW.', '.WWWWW..', '..O..O..'];
const drawGoose = (g, x0, by, bob) =>
  GOOSE.forEach((row, r) =>
    [...row].forEach((ch, col) => {
      if (ch !== '.') box(g, x0 + col * 3, by - (GOOSE.length - r) * 3 - bob * 2, 3, 3, ch === 'W' ? [245, 243, 236] : ch === 'K' ? INK : hex('#F59E0B'));
    }),
  );
const STAR = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '.XX...XX.', '.X.....X.'];
const drawStars = (g, n, y) => {
  for (let s = 0; s < n; s++) {
    const x0 = Math.round(GW / 2 + (s - (n - 1) / 2) * 13 - 4);
    STAR.forEach((row, r) => [...row].forEach((p, col) => p === 'X' && put(g, x0 + col, y + r, WHITE)));
  }
};

// ---- the camera: zoom toward a focus point, which drifts toward the frame's centre as it zooms
const CX = 135;
const BY = GROUND + 2;
const COCOON_MID = [CX, BY - COCOON_H / 2];
const EYE_AT = [CX + EYE.dx, BY + EYE.dy];

/** Wiggle (tilt in pixels) at time t, for a wiggle starting at `at`. */
const wiggleAt = (t, at) => (t >= at && t < at + 0.6 ? Math.round(Math.sin((t - at) * 26) * 4 * (1 - (t - at) / 0.6)) : 0);
const WIGGLES = [0.3, 2.4, 4.2];

function camera(t) {
  let z = 1;
  let focus = COCOON_MID;
  let shake = 0;
  let flash = 0;
  if (t < 0.13) z = 1;
  else if (t < HATCH) {
    // impact, then a slow pull back that reveals the realm
    const hit = t - 0.13;
    z = hit < 0.12 ? lerp(1, 2.05, ease(hit / 0.12)) : lerp(2.05, 1.7, ease((hit - 0.12) / 0.4));
    if (t > 0.65) z = lerp(1.7, 1.25, ease((t - 0.65) / 4.4));
    if (t > 5.0) z = lerp(1.25, 1.4, clamp01((t - 5.0) / 1.6));
    for (const w of WIGGLES) if (t >= w && t < w + 0.25) z += 0.06 * (1 - (t - w) / 0.25);
    shake = hit < 0.7 ? 6 * (1 - hit / 0.7) : 0;
    flash = hit < 0.25 ? 0.9 * (1 - hit / 0.25) : 0;
    for (const w of WIGGLES) if (t >= w && t < w + 0.3) shake = Math.max(shake, 1.5);
    if (t >= 5.6 && t < 6.6) shake = 1 + ((t - 5.6) / 1.0) * 2.5;
    if (t >= 6.6 && t < 7.35) {
      focus = EYE_AT;
      z = lerp(1.4, 3.4, ease((t - 6.6) / 0.14));
    }
    if (t >= 7.35) {
      z = lerp(2.2, 1.45, ease((t - 7.35) / 0.3));
      shake = 3 + ((t - 7.35) / 0.65) * 4;
    }
  } else {
    const rt = t - HATCH;
    z = rt < 0.25 ? lerp(0.92, 1.0, ease(rt / 0.25)) : lerp(1.0, 1.1, clamp01((rt - 0.25) / 4.5));
    focus = [CX, BY - 70];
    shake = rt < 0.8 ? 7 * (1 - rt / 0.8) : 0;
    flash = rt < 0.5 ? 1 - rt / 0.5 : 0;
    if (t > END - 0.25) flash = (t - (END - 0.25)) / 0.25;
    if (t > END - 0.6) z += ease((t - (END - 0.6)) / 0.6) * 0.5;
  }
  const k = clamp01((z - 1) / 1.2);
  const anchor = [lerp(focus[0], GW / 2, k), lerp(focus[1], GH * 0.6, k)];
  return { z, focus, anchor, shake, flash };
}

// ---- render
const realm = drawRealm(dimension);
const shards = Array.from({ length: 120 }, () => ({
  x: CX + (rnd() - 0.5) * 50,
  y: BY - 10 - rnd() * 90,
  vx: (rnd() - 0.5) * 5,
  vy: -2 - rnd() * 4,
  c: rnd() > 0.5 ? hex('#EDE6D6') : hex('#C9BFAE'),
}));
const buf = Buffer.alloc(W * H * 4);
const colX = new Int32Array(W);
const rowY = new Int32Array(H);
const ff = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'ignore', 'inherit'] },
);
const total = Math.round(END * FPS);
const tag = `AWAKENING ${String(meta.episode).padStart(3, '0')}`;
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  const scene = realm.base.map((r) => r.slice());
  const ui = Array.from({ length: GH }, () => Array(GW).fill(null));
  realm.lights.forEach(([x, y, c], n) => {
    if (Math.sin(t * 3 + n * 1.7) > 0.2) {
      const col = hex(c);
      put(scene, x, y, mix(col, WHITE, 0.6));
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(scene, x + dx, y + dy, col);
    }
  });

  if (t < HATCH) {
    let shear = 0;
    let lift = 0;
    let cracks = 0;
    let glow = 0;
    let eye = 0;
    if (t < 5.6) {
      lift = Math.round(Math.sin(t * 2.5));
      for (const w of WIGGLES) shear += wiggleAt(t, w);
      if (t >= 4.2) cracks = 0.12;
    } else if (t < 6.6) {
      const k = (t - 5.6) / 1.0;
      shear = Math.round(Math.sin(t * (24 + k * 30)) * (1.5 + k * 4));
      cracks = lerp(0.12, 0.55, k);
      glow = k * 0.5;
    } else if (t < 7.35) {
      cracks = 0.55;
      glow = 0.5;
      const et = t - 6.6;
      eye = clamp01(et / 0.3);
      if (et > 0.5 && et < 0.65) eye = Math.abs(et - 0.575) / 0.075;
    } else {
      const k = (t - 7.35) / 0.65;
      shear = Math.round(Math.sin(t * 60) * (4 + k * 5));
      lift = Math.round(Math.abs(Math.sin(t * 34)) * k * 3);
      cracks = lerp(0.55, 1, k);
      glow = 0.5 + k * 0.5;
      eye = 1;
    }
    const jitter = t >= 7.35 ? Math.round((rnd() - 0.5) * 4) : 0;
    drawCocoon(scene, CX + jitter, BY, { shear, lift, cracks, glow, eye, iris: meta.color, rnd });
    if (t >= 0.13) {
      text(ui, 'SOMEONE IS', 3, 70, WHITE);
      text(ui, 'WAKING UP!', 3, 96, WHITE);
    }
  } else {
    const rt = t - HATCH;
    const frame = Math.floor(rt * 3);
    drawSprite(scene, frame, 3, meta.goose ? CX - 20 : CX, BY);
    if (meta.goose) drawGoose(scene, CX + 34, BY, frame % 2);
    shards.forEach((s) => {
      if (rt < 1.5) box(scene, s.x + s.vx * rt * 34, s.y + s.vy * rt * 34 + 70 * rt * rt, 2, 2, s.c);
    });
    if (meta.rarity === 5)
      [[-78, 250, 0], [82, 262, 0.5], [-70, 320, 1], [88, 312, 0.3], [-96, 286, 0.7], [100, 280, 0.2]].forEach(([dx, y, o]) => {
        const a = Math.sin((rt + o) * 5);
        if (a > -0.2) {
          const s = a > 0.6 ? 3 : 2;
          box(scene, CX + dx - s, y, s * 2 + 1, 1, hex('#FDE68A'));
          box(scene, CX + dx, y - s, 1, s * 2 + 1, hex('#FDE68A'));
        }
      });
    text(ui, meta.name, 5, 64, hex(meta.color), { count: Math.floor(rt / 0.08) });
    if (rt > 0.4) drawStars(ui, meta.rarity, 110);
    if (rt > 0.9) text(ui, meta.subtitle, 1, 128, WHITE, { count: Math.floor((rt - 0.9) / 0.03) });
    if (rt > 1.6) text(ui, meta.number, 2, 142, hex('#D8D2E6'), { count: Math.floor((rt - 1.6) / 0.1) });
    // the lore line: how many are left
    const left = `${200 - meta.episode} LEFT.`;
    if (rt > 2.2) text(ui, left, 2, 176, hex('#D8D2E6'), { count: Math.floor((rt - 2.2) / 0.05) });
  }
  if (t >= 0.13) text(ui, tag, 1, 46, hex('#B9B3C9'), { cx: 22 + (tag.length * 6) / 2 });

  // camera: sample the scene through the zoom, then lay the overlay on top
  const cam = camera(t);
  const sx0 = cam.shake ? (rnd() - 0.5) * 2 * cam.shake : 0;
  const sy0 = cam.shake ? (rnd() - 0.5) * 2 * cam.shake : 0;
  for (let X = 0; X < W; X++) colX[X] = Math.min(GW - 1, Math.max(0, Math.floor(cam.focus[0] + (X / K - cam.anchor[0]) / cam.z + sx0)));
  for (let Y = 0; Y < H; Y++) rowY[Y] = Math.min(GH - 1, Math.max(0, Math.floor(cam.focus[1] + (Y / K - cam.anchor[1]) / cam.z + sy0)));
  const ux = Math.round(sx0 * 0.5);
  const uy = Math.round(sy0 * 0.5);
  for (let Y = 0; Y < H; Y++) {
    const srow = scene[rowY[Y]];
    const urow = ui[Math.floor(Y / K) - uy] ?? null;
    for (let X = 0; X < W; X++) {
      const u = urow ? urow[Math.floor(X / K) - ux] : null;
      const c = u ?? srow[colX[X]];
      const i = (Y * W + X) * 4;
      if (cam.flash > 0) {
        buf[i] = c[0] + (255 - c[0]) * cam.flash;
        buf[i + 1] = c[1] + (255 - c[1]) * cam.flash;
        buf[i + 2] = c[2] + (255 - c[2]) * cam.flash;
      } else {
        buf[i] = c[0];
        buf[i + 1] = c[1];
        buf[i + 2] = c[2];
      }
      buf[i + 3] = 255;
    }
  }
  if (!ff.stdin.write(Buffer.from(buf))) await once(ff.stdin, 'drain');
}
ff.stdin.end();
ff.on('close', (code) => console.log(code === 0 ? `Wrote ${out} (${total} frames).` : `ffmpeg failed: ${code}`));
