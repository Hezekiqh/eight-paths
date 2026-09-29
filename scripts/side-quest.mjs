// A SIDE QUEST episode: a short, vertical, choose-your-action clip set in a
// realm, with the character acting out a beat of a side story.
// 1080×1920 at 30fps, drawn on the same 270×480 scenes as the hatch videos.
//
//   node scripts/side-quest.mjs <spec.json> <out.mp4>
//
// Silent on purpose (songs are added in TikTok). Structure of every clip:
//   0.0–2.0   recap card over the dimmed realm ("YOU CHOSE A.")
//   2.0–10.5  the scene: sprites, emotes, props and one caption at a time
//   10.5–14   the choice card ("A: ... / B: ... COMMENT A OR B") or the end card
//   last 0.3s fades to black so the loop back to the recap card is seamless.
//
// Spec fields (times in seconds):
//   id, dimension, day, of, recap:[big lines], sub:[small lines]
//   captions:[[t0,t1,"LINE", "LINE2"?]]
//   pip:[[t,x,flip,mode]]      modes: idle walk run sneak play hop bow hidden
//   goose:[[t,x,y,flip,mode]]  y = height above the ground; modes: idle walk run happy sulk hidden
//   gooseString:[t0,t1]        the goose carries the lute string in its beak
//   emotes:[[t0,t1,"pip"|"goose"|"crowd", icon]]  icons: ! ? note heart sweat dots anger
//   notes:[[t0,t1,"pip"|"goose"]]  rising music notes
//   flicker:[t0,t1]  lights flicker out of rhythm      bright:t  lights glow brighter from t
//   inside:t   the scene dims (inside the tent) from t
//   stash:{t, x}   crowd:t   cheer:[[t0,t1]]   confetti:[[t0,t1]]   fallingString:t
//   zoom:[[t,z,fx]]   choice:{q,a,b}  or  end:{big, sub:[...]}

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

import { GH, GROUND, GW, box, drawRealm, hex, mix, put } from './realm-art.mjs';

const [specPath, out] = process.argv.slice(2);
const S = JSON.parse(readFileSync(specPath, 'utf8'));
const K = 4;
const W = GW * K;
const H = GH * K;
const FPS = 30;
const END = 14.0;
const CARD_OUT = 2.0;
const CHOICE_IN = 10.5;
const WHITE = [255, 255, 255];
const INK = [7, 6, 11];
const SOFT = hex('#D8D2E6');
const PINK = hex('#FF4FD8');
const GOLD = hex('#FFC940');
let seed = 23;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const BY = GROUND + 2;

// ---- a 5×7 pixel font (same face as the hatch videos, plus a little punctuation)
// prettier-ignore
const F = {A:['.XXX.','X...X','X...X','XXXXX','X...X','X...X','X...X'],B:['XXXX.','X...X','X...X','XXXX.','X...X','X...X','XXXX.'],C:['.XXX.','X...X','X....','X....','X....','X...X','.XXX.'],D:['XXXX.','X...X','X...X','X...X','X...X','X...X','XXXX.'],E:['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],F:['XXXXX','X....','X....','XXXX.','X....','X....','X....'],G:['.XXX.','X...X','X....','X.XXX','X...X','X...X','.XXX.'],H:['X...X','X...X','X...X','XXXXX','X...X','X...X','X...X'],I:['XXXXX','..X..','..X..','..X..','..X..','..X..','XXXXX'],J:['..XXX','...X.','...X.','...X.','X..X.','X..X.','.XX..'],K:['X...X','X..X.','X.X..','XX...','X.X..','X..X.','X...X'],L:['X....','X....','X....','X....','X....','X....','XXXXX'],M:['X...X','XX.XX','X.X.X','X.X.X','X...X','X...X','X...X'],N:['X...X','XX..X','X.X.X','X..XX','X...X','X...X','X...X'],O:['.XXX.','X...X','X...X','X...X','X...X','X...X','.XXX.'],P:['XXXX.','X...X','X...X','XXXX.','X....','X....','X....'],Q:['.XXX.','X...X','X...X','X...X','X.X.X','X..X.','.XX.X'],R:['XXXX.','X...X','X...X','XXXX.','X.X..','X..X.','X...X'],S:['.XXXX','X....','X....','.XXX.','....X','....X','XXXX.'],T:['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],U:['X...X','X...X','X...X','X...X','X...X','X...X','.XXX.'],V:['X...X','X...X','X...X','X...X','X...X','.X.X.','..X..'],W:['X...X','X...X','X...X','X.X.X','X.X.X','X.X.X','.X.X.'],X:['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],Y:['X...X','X...X','.X.X.','..X..','..X..','..X..','..X..'],Z:['XXXXX','....X','...X.','..X..','.X...','X....','XXXXX'],0:['.XXX.','X...X','X..XX','X.X.X','XX..X','X...X','.XXX.'],1:['..X..','.XX..','..X..','..X..','..X..','..X..','.XXX.'],2:['.XXX.','X...X','....X','...X.','..X..','.X...','XXXXX'],3:['XXXX.','....X','....X','.XXX.','....X','....X','XXXX.'],4:['...X.','..XX.','.X.X.','X..X.','XXXXX','...X.','...X.'],5:['XXXXX','X....','XXXX.','....X','....X','X...X','.XXX.'],6:['.XXX.','X....','X....','XXXX.','X...X','X...X','.XXX.'],7:['XXXXX','....X','...X.','..X..','.X...','.X...','.X...'],8:['.XXX.','X...X','X...X','.XXX.','X...X','X...X','.XXX.'],9:['.XXX.','X...X','X...X','.XXXX','....X','....X','.XXX.'],'!':['..X..','..X..','..X..','..X..','..X..','.....','..X..'],'?':['.XXX.','X...X','....X','...X.','..X..','.....','..X..'],'#':['.X.X.','.X.X.','XXXXX','.X.X.','XXXXX','.X.X.','.X.X.'],'.':['.....','.....','.....','.....','.....','.....','..X..'],',':['.....','.....','.....','.....','.....','..X..','.X...'],':':['.....','..X..','.....','.....','.....','..X..','.....'],'/':['....X','....X','...X.','..X..','.X...','X....','X....'],'-':['.....','.....','.....','XXXXX','.....','.....','.....'],"'":['..X..','..X..','.....','.....','.....','.....','.....'],' ':['.....','.....','.....','.....','.....','.....','.....'],'·':['.....','.....','.....','..X..','.....','.....','.....']};
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
const fits = (s, sc) => s.length * 6 * sc - sc <= GW - 16;
for (const l of [...(S.recap ?? []), ...(S.sub ?? [])]) if (!fits(l, 2)) console.warn('long line:', l);

// ---- sprites
const sheet = PNG.sync.read(readFileSync(`assets/sprites/${S.id}/idle.png`));
const frames = Math.max(1, Math.round(sheet.width / (32 * 12)));
const SC = 3;
const drawSprite = (g, frame, cx, by, flip) => {
  for (let y = 0; y < 48 * SC; y++)
    for (let x = 0; x < 32 * SC; x++) {
      const sx = flip ? 32 * SC - 1 - x : x;
      const i = (Math.floor(y / SC) * 12 * sheet.width + Math.floor(sx / SC) * 12 + (frame % frames) * 32 * 12) * 4;
      if (sheet.data[i + 3] < 128) continue;
      put(g, cx - 16 * SC + x, by - 48 * SC + y, [sheet.data[i], sheet.data[i + 1], sheet.data[i + 2]]);
    }
};
const GOOSE = ['...WWW..', '..WWKWOO', '..WWWWOO', '...WW...', '...WW...', '..WWW...', '.WWWWWW.', 'WWWWWWWW', 'WWWWWWW.', '.WWWWW..', '..O..O..'];
const GS = 3;
const drawGoose = (g, cx, by, flip, dip) =>
  GOOSE.forEach((row, r) =>
    [...row].forEach((ch, col) => {
      if (ch === '.') return;
      const c = flip ? 7 - col : col;
      const neck = r < 5 ? dip : 0;
      box(g, cx - 4 * GS + c * GS, by - (GOOSE.length - r) * GS + neck, GS, GS, ch === 'W' ? [245, 243, 236] : ch === 'K' ? INK : hex('#F59E0B'));
    }),
  );
// the beak sits at the top-right of the goose (top-left when flipped)
const beakOf = (cx, by, flip) => [flip ? cx - 4 * GS : cx + 4 * GS - 1, by - 9 * GS];

// ---- icons (7×7), drawn in the scene so they move with the camera
// prettier-ignore
const ICON = {
  '!': [['..X..','..X..','..X..','..X..','.....','..X..'], GOLD],
  '?': [['.XXX.','X...X','...X.','..X..','.....','..X..'], WHITE],
  note: [['..XXX','..X.X','..X..','..X..','XXX..','XXX..'], PINK],
  heart: [['.X.X.','XXXXX','XXXXX','.XXX.','..X..'], hex('#FF5A7A')],
  sweat: [['..X..','.XXX.','XXXXX','XXXXX','.XXX.'], hex('#7FD3FF')],
  dots: [['.....','.....','.....','.....','X.X.X'], WHITE],
  anger: [['X...X','.X.X.','.....','.X.X.','X...X'], hex('#FF5A4A')],
};
const drawIcon = (g, name, x, y, sc = 3) => {
  const [rows, c] = ICON[name];
  rows.forEach((row, r) => [...row].forEach((p, col) => p === 'X' && box(g, x + col * sc, y + r * sc, sc, sc, c)));
};

// ---- keyframed motion
const at = (keys, t) => {
  if (!keys?.length) return null;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b || t < a[0]) return { k: a, x: a[1], y: a.length > 4 ? a[2] : 0 };
  const u = (t - a[0]) / (b[0] - a[0]);
  return { k: a, x: lerp(a[1], b[1], u), y: a.length > 4 ? lerp(a[2], b[2], u) : 0 };
};
const within = (t, [a, b]) => t >= a && t < b;

// ---- the scene
const realm = drawRealm(S.dimension);
const confetti = Array.from({ length: 90 }, () => ({ x: rnd() * GW, v: 30 + rnd() * 40, o: rnd() * 6, c: ['#FF4FD8', '#FFC940', '#2DD4BF', '#FF8A3D', '#9B74F8'][Math.floor(rnd() * 5)] }));
const CROWD = [18, 46, 74, 104, 166, 196, 224, 252].map((x, n) => ({ x, h: 8 + (n % 3) * 3, o: n * 0.7 }));
const STASH = [['#C9A227', -12, -3, 3, 3], ['#FF8A3D', -6, -2, 2, 2], ['#2DD4BF', 5, -2, 2, 2], ['#D8D2E6', 9, -4, 8, 1], ['#D8D2E6', 10, -6, 8, 1], ['#FFC940', -2, -8, 4, 4], ['#B3261E', -9, -5, 2, 2], ['#9B74F8', 1, -3, 2, 2], ['#E8DCC0', -14, -9, 12, 1]];

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
const tag = `SIDE QUEST · DAY ${S.day}/${S.of ?? 5}`;

for (let f = 0; f < total; f++) {
  const t = f / FPS;
  const scene = realm.base.map((r) => r.slice());
  const ui = Array.from({ length: GH }, () => Array(GW).fill(null));

  // lights: normal twinkle, an out-of-rhythm flicker, or brighter for the show
  const flick = S.flicker && within(t, S.flicker);
  const bright = S.bright != null && t >= S.bright;
  realm.lights.forEach(([x, y, c], n) => {
    let on = Math.sin(t * 3 + n * 1.7) > 0.2;
    if (flick) on = Math.sin(t * 17 + n * n * 3.1) > (Math.sin(t * 5) > 0 ? -0.2 : 0.6);
    if (bright) on = true;
    if (!on) return;
    const col = hex(c);
    put(scene, x, y, mix(col, WHITE, 0.6));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(scene, x + dx, y + dy, col);
    if (bright) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) put(scene, x + dx, y + dy, mix(col, scene[y]?.[x] ?? INK, 0.5));
  });

  // inside the tent: the whole scene dims
  if (S.inside != null && t >= S.inside) {
    const k = clamp01((t - S.inside) / 0.4) * 0.55;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) scene[y][x] = mix(scene[y][x], [14, 8, 24], k);
  }

  // the stash
  if (S.stash && t >= S.stash.t) {
    const sx = S.stash.x;
    const k = clamp01((t - S.stash.t) / 0.3);
    box(scene, sx - 18, BY - 2, 36, 2, hex('#3A2A1A'));
    STASH.forEach(([c, dx, dy, w, h]) => box(scene, sx + dx, BY + dy - Math.round((1 - k) * 6), w, h, hex(c)));
    [[-16, -16, 0], [14, -14, 0.4], [0, -20, 0.8]].forEach(([dx, dy, o]) => {
      if (Math.sin((t + o) * 6) > 0.3) { box(scene, sx + dx - 2, BY + dy, 5, 1, WHITE); box(scene, sx + dx, BY + dy - 2, 1, 5, WHITE); }
    });
  }

  // the goose
  const g = at(S.goose, t);
  let gooseHead = null;
  if (g && g.k[4] !== 'hidden') {
    const mode = g.k[4];
    const flip = g.k[3];
    const step = Math.floor(t * (mode === 'run' ? 12 : 6));
    let lift = g.y;
    if (mode === 'walk' || mode === 'run') lift += step % 2;
    if (mode === 'happy') lift += Math.abs(Math.round(Math.sin(t * 9) * 5));
    const dip = mode === 'sulk' ? 3 : mode === 'honk' ? (Math.sin(t * 12) > 0 ? -2 : 0) : 0;
    const gx = Math.round(g.x);
    const gy = Math.round(BY - lift);
    drawGoose(scene, gx, gy, flip, dip);
    gooseHead = [gx, gy - 36];
    if (S.gooseString && within(t, S.gooseString)) {
      const [bx, byy] = beakOf(gx, gy + dip, flip);
      for (let i = 0; i < 24; i++) box(scene, bx + Math.round((flip ? -1 : 1) * i * 0.45 + Math.sin(i * 0.5 + t * 14) * 1.5), byy + i, 2, 1, hex('#FFF4D6'));
    }
    if (mode === 'run') for (let i = 0; i < 3; i++) box(scene, gx + (flip ? 14 : -16) + (flip ? i * 4 : -i * 4), gy - 1 - i, 2, 2, hex('#6A5C78'));
  }

  // pip
  const p = at(S.pip, t);
  let pipHead = null;
  if (p && p.k[3] !== 'hidden') {
    const mode = p.k[3];
    const flip = p.k[2];
    let lift = 0;
    const step = Math.floor(t * (mode === 'run' ? 12 : mode === 'sneak' ? 3 : 6));
    if (mode === 'walk' || mode === 'sneak') lift = step % 2;
    if (mode === 'run') lift = (step % 2) * 3;
    if (mode === 'hop') lift = Math.round(Math.abs(Math.sin(t * 7)) * 10);
    if (mode === 'play') lift = Math.round(Math.abs(Math.sin(t * 6)) * 2);
    if (mode === 'bow') lift = -Math.round(Math.abs(Math.sin(t * 2.5)) * 6);
    const px = Math.round(p.x);
    const frame = Math.floor(t * 3);
    drawSprite(scene, frame, px, BY - lift, flip);
    pipHead = [px, BY - lift - 48 * SC];
    if (mode === 'run') for (let i = 0; i < 3; i++) box(scene, px + (flip ? 18 : -20) + (flip ? i * 5 : -i * 5), BY - 2 - i * 2, 3, 3, hex('#6A5C78'));
  }

  // music notes
  for (const [t0, t1, who] of S.notes ?? []) {
    if (!within(t, [t0, t1 + 1.2])) continue;
    const head = who === 'goose' ? gooseHead : pipHead;
    if (!head) continue;
    for (let n = 0; n < 4; n++) {
      const born = t0 + n * 0.3 + Math.floor((t - t0) / 1.2) * 1.2;
      const age = t - born;
      if (age < 0 || age > 1.2 || born > t1) continue;
      drawIcon(scene, 'note', head[0] + 14 + n * 8 - age * 6 + Math.sin(age * 6 + n) * 5, head[1] + 20 - age * 40, 2);
    }
  }

  // the string falling from the rafters
  if (S.fallingString != null && within(t, [S.fallingString, S.fallingString + 1.2]) && pipHead) {
    const k = ease((t - S.fallingString) / 1.0);
    const y = lerp(150, pipHead[1] + 80, k);
    for (let i = 0; i < 18; i++) put(scene, pipHead[0] + 12 + Math.round(Math.sin(i * 0.6 + t * 10) * 2), y - i, hex('#F3E6C4'));
    if (k > 0.95) { box(scene, pipHead[0] + 8, pipHead[1] + 48, 9, 1, WHITE); box(scene, pipHead[0] + 12, pipHead[1] + 44, 1, 9, WHITE); }
  }

  // the crowd, in silhouette at the front
  if (S.crowd != null && t >= S.crowd) {
    const cheering = (S.cheer ?? []).some((w) => within(t, w));
    CROWD.forEach((c) => {
      const bob = cheering ? Math.round(Math.abs(Math.sin(t * 8 + c.o)) * 6) : Math.round(Math.sin(t * 1.5 + c.o));
      const top = 418 - c.h - bob;
      for (let y = 0; y < 12; y++) for (let x = -6; x <= 6; x++) if (x * x + (y - 6) * (y - 6) <= 36) put(scene, c.x + x, top + y, hex('#120B1C'));
      box(scene, c.x - 14, top + 12, 28, GH - top, hex('#120B1C'));
      box(scene, c.x - 4, top, 8, 1, hex('#4A3470'));
      if (cheering) { box(scene, c.x - 16, top + 2 - (bob >> 1), 3, 12, hex('#120B1C')); box(scene, c.x + 13, top + 2 - (bob >> 1), 3, 12, hex('#120B1C')); }
    });
  }

  // emotes
  for (const [t0, t1, who, icon] of S.emotes ?? []) {
    if (!within(t, [t0, t1])) continue;
    const pop = Math.round((1 - clamp01((t - t0) / 0.12)) * 4);
    if (who === 'crowd') {
      if (S.crowd == null) continue;
      CROWD.forEach((c, n) => n % 2 === 0 && drawIcon(scene, icon, c.x - 7, 380 - c.h + pop - Math.round(Math.sin(t * 4 + n) * 2)));
      continue;
    }
    const head = who === 'goose' ? gooseHead : pipHead;
    if (head) drawIcon(scene, icon, head[0] - 7, head[1] - 22 + pop);
  }

  // confetti
  for (const w of S.confetti ?? []) {
    if (!within(t, [w[0], w[1] + 2])) continue;
    const age = t - w[0];
    confetti.forEach((c) => {
      const y = -10 + ((age * c.v + c.o * 20) % 500);
      if (age * c.v + c.o * 20 > 500 || t > w[1] + 2) return;
      box(scene, c.x + Math.sin(age * 4 + c.o) * 6, y, 2, Math.sin(age * 9 + c.o) > 0 ? 2 : 1, hex(c.c));
    });
  }

  // ---- overlay text
  const inCard = t < CARD_OUT;
  const inChoice = t >= CHOICE_IN;
  if (!inCard && !inChoice) {
    for (const [t0, t1, ...lines] of S.captions ?? []) {
      if (!within(t, [t0, t1])) continue;
      const age = t - t0;
      let used = 0;
      lines.forEach((l, n) => {
        const count = Math.max(0, Math.floor((age - used * 0.035) / 0.035));
        text(ui, l, 2, 92 + n * 22, WHITE, { count });
        used += l.length;
      });
    }
  }
  if (inCard) {
    (S.recap ?? []).forEach((l, n) => text(ui, l, 3, 150 + n * 30, hex('#FF4FD8'), { count: Math.floor(t / 0.05) }));
    (S.sub ?? []).forEach((l, n) => t > 0.5 && text(ui, l, 2, 160 + (S.recap?.length ?? 0) * 30 + n * 22, SOFT, { count: Math.floor((t - 0.5) / 0.03) }));
  }
  if (inChoice) {
    const ct = t - CHOICE_IN;
    if (S.choice) {
      text(ui, S.choice.q, 2, 130, WHITE, { count: Math.floor(ct / 0.03) });
      if (ct > 0.6) text(ui, S.choice.a, 2, 176, GOLD, { count: Math.floor((ct - 0.6) / 0.03) });
      if (ct > 1.1) text(ui, S.choice.b, 2, 204, hex('#2DD4BF'), { count: Math.floor((ct - 1.1) / 0.03) });
      if (ct > 1.8 && Math.sin(ct * 5) > -0.6) text(ui, 'COMMENT A OR B', 2, 256, SOFT);
    } else if (S.end) {
      text(ui, S.end.big, 4, 140, PINK, { count: Math.floor(ct / 0.08) });
      (S.end.sub ?? []).forEach((l, n) => ct > 1.0 && text(ui, l, 2, 196 + n * 22, SOFT, { count: Math.floor((ct - 1.0) / 0.05) }));
    }
  }
  text(ui, tag, 1, 46, hex('#B9B3C9'), { cx: 22 + (tag.length * 6) / 2 });
  if (S.label) text(ui, S.label, 1, 56, hex('#FF4FD8'), { cx: 22 + (S.label.length * 6) / 2 });

  // ---- camera
  const zk = at(S.zoom ?? [[0, 1, GW / 2]], t);
  const z = zk.x;
  const fx = zk.k.length > 2 ? lerp(zk.k[2], (S.zoom.find((k) => k[0] > zk.k[0]) ?? zk.k)[2], clamp01((t - zk.k[0]) / Math.max(0.01, ((S.zoom.find((k) => k[0] > zk.k[0]) ?? zk.k)[0] - zk.k[0])))) : GW / 2;
  const half = GW / 2 / z;
  const cx = Math.min(GW - half, Math.max(half, fx));
  const fy = GH * 0.62;
  for (let X = 0; X < W; X++) colX[X] = Math.min(GW - 1, Math.max(0, Math.floor(cx + (X / K - GW / 2) / z)));
  for (let Y = 0; Y < H; Y++) rowY[Y] = Math.min(GH - 1, Math.max(0, Math.floor(fy + (Y / K - GH * 0.62) / z)));

  // cards dim the scene; the last 0.3s fade to black for the loop
  let dim = 0;
  if (inCard) dim = t < 1.7 ? 0.72 : lerp(0.72, 0, (t - 1.7) / 0.3);
  if (inChoice) dim = lerp(0, 0.66, clamp01((t - CHOICE_IN) / 0.4));
  if (t > END - 0.3) dim = lerp(0.66, 0.72, (t - (END - 0.3)) / 0.3);
  
  for (let Y = 0; Y < H; Y++) {
    const srow = scene[rowY[Y]];
    const urow = ui[Math.floor(Y / K)];
    for (let X = 0; X < W; X++) {
      const u = urow[Math.floor(X / K)];
      let c = u ?? srow[colX[X]];
      if (!u && dim) c = mix(c, [6, 4, 12], dim);
      const i = (Y * W + X) * 4;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = 255;
    }
  }
  if (!ff.stdin.write(Buffer.from(buf))) await once(ff.stdin, 'drain');
}
ff.stdin.end();
ff.on('close', (code) => console.log(code === 0 ? `Wrote ${out} (${total} frames).` : `ffmpeg failed: ${code}`));
