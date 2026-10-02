// Season 1 as a series of vertical episodes (1080×1920, 30fps), drawn the way
// the game draws the Other World: the baked map, the walkers, candlelight,
// dust, the VHS grade, and the real dialogue box with its portrait, fonts and
// a voice blip every other letter. Same Skia (CanvasKit), same art files.
// No music: just the voices.
//
//   node scripts/episode-video.mjs 2 out.mp4
//
// Needs ffmpeg. Lines come straight from the map JSONs, so they match the game.

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import CanvasKitInit from 'canvaskit-wasm/bin/canvaskit.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [episode = '2', out = `episode-${episode}.mp4`] = process.argv.slice(2);

const W = 1080;
const H = 1920;
const FPS = 30;
/** Screen pixels per art pixel (the game draws 3pt per art pixel; 7px keeps them sharp). */
const K = 7;
/** Screen pixels per point, for the dialogue box (a 432pt-wide phone). */
const U = 2.5;
const TILE = 16;
/** Walking speed, art px a second (engine.ts SPEED). */
const SPEED = 112;
const FW = 16;
const FH = 24;
const FEET = 22;
const DIRS = { down: 0, up: 1, left: 2, right: 3 };

// The Scroll theme (palettes.ts), the default.
const C = {
  background: '#F0D9A7',
  card: '#F8EACB',
  frame: '#4A3423',
  accent: '#9A3412',
  text: '#2E1F14',
  muted: '#6B4F33',
  faint: '#80654A',
  shadow: '#C4A064',
};

const CK = await CanvasKitInit({ locateFile: (f) => join(ROOT, 'node_modules/canvaskit-wasm/bin', f) });
const color = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return CK.Color((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
};
const bytes = (path) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const image = (path) => CK.MakeImageFromEncoded(new Uint8Array(readFileSync(path)));
const typeface = (path) => CK.Typeface.MakeTypefaceFromData(bytes(path));
const DIALOGUE = typeface(join(ROOT, 'node_modules/@expo-google-fonts/dotgothic16/400Regular/DotGothic16_400Regular.ttf'));
const JERSEY = typeface(join(ROOT, 'node_modules/@expo-google-fonts/jersey-10/400Regular/Jersey10_400Regular.ttf'));
const WALKERS = image(join(ROOT, 'assets/world/walkers.png'));
const WALKER_ROWS = Object.fromEntries(
  [...readFileSync(join(ROOT, 'src/world/walkers.ts'), 'utf8').matchAll(/^ {2}(\w+): (\d+),$/gm)].map((m) => [m[1], +m[2]]),
);
const NEAREST = { filter: CK.FilterMode.Nearest, mipmap: CK.MipmapMode.None };

// ---- maps: the baked picture, the people, the candles (ambience.ts)
const AMBIENCE = { rooms: { darkness: 0.18 }, outdoor: { darkness: 0 }, dungeon: { darkness: 0.32 } };
const FLAMES = {
  rooms: { c: [{ dx: 4, dy: 1, reach: 0 }, { dx: 7, dy: -1, reach: 44 }, { dx: 11, dy: 1, reach: 0 }] },
  outdoor: { c: [{ dx: 7, dy: 2, reach: 40 }] },
  dungeon: { k: [{ dx: 7, dy: 1, reach: 48 }] },
};
function loadMap(id, style) {
  const json = JSON.parse(readFileSync(join(ROOT, `src/world/maps/${id}.json`), 'utf8'));
  const flames = [];
  json.tiles.forEach((row, ty) =>
    [...row].forEach((c, tx) => {
      for (const f of FLAMES[style][c] ?? []) flames.push([tx * TILE + f.dx, ty * TILE + f.dy, f.reach]);
    }),
  );
  const npcs = Object.fromEntries(json.objects.filter((o) => o.type === 'npc').map((o) => [o.id, o]));
  const signs = json.objects.filter((o) => o.type === 'sign');
  const chests = json.objects.filter((o) => o.type === 'chest');
  const motes = style === 'outdoor' ? 'pollen' : 'dust';
  return { ...json, style, image: image(join(ROOT, `assets/world/${id}.png`)), flames, npcs, signs, chests, motes, darkness: AMBIENCE[style].darkness };
}

// ---- voices (portraits.ts)
// The Keeper gets voice 0: lower than anyone, the lowest blip played an octave down.
const VOICES = { kaldor: 1, aurek: 1, plush: 1, bo: 1, keeper: 0, harrow: 2, hugo: 2, brannoc: 2, brunna: 5, pim: 5 };
function voiceFor(name, sprite) {
  if (sprite && sprite in VOICES) return VOICES[sprite];
  let hash = 0;
  for (const c of name ?? '') hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return 2 + (hash % 3);
}

// ---- the typewriter (typewriter-text.tsx): 28ms a letter, longer after punctuation
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

// ---- text
const fontOf = (face, px) => {
  const f = new CK.Font(face, px);
  return f;
};
const widthOf = (font, s) => font.getGlyphWidths(font.getGlyphIDs(s)).reduce((a, b) => a + b, 0);
function wrap(font, text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(font, next) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
// One paint per colour, kept: CanvasKit objects live in wasm memory and a new one a frame runs it out.
const paints = new Map();
const paint = (hex, a = 1) => {
  const key = `${hex}/${a}`;
  if (!paints.has(key)) {
    const p = new CK.Paint();
    p.setColor(color(hex, a));
    p.setAntiAlias(false);
    paints.set(key, p);
  }
  return paints.get(key);
};

// ---- the dialogue box (dialogue-box.tsx), in points × U
// Kept inside every app's safe area: above the bottom 500px of the frame (Reels' caption is the
// tallest of TikTok, Reels and Shorts) and left of the 160px column of like/comment/share buttons.
const PT = {
  left: 24,
  right: 68,
  bottom: 200,
  frame: 3,
  padX: 16,
  padY: 12,
  gap: 12,
  minHeight: 96,
  speaker: 20,
  text: 16,
  lineHeight: 24,
  portraitW: 16 * 4 + 4,
  portraitH: 17 * 4 + 4,
};
const TEXT_FONT = fontOf(DIALOGUE, PT.text * U);
const SPEAKER_FONT = fontOf(JERSEY, PT.speaker * U);

function drawBox(canvas, { speaker, sprite, text, shown, lift, typed, last }) {
  const boxW = W / U - PT.left - PT.right;
  const x = PT.left * U;
  const wordsX = PT.frame + PT.padX + (sprite ? PT.portraitW + PT.gap : 0);
  const wordsW = boxW - wordsX - PT.frame - PT.padX;
  const lines = wrap(TEXT_FONT, text, wordsW * U);
  const speakerH = speaker ? PT.speaker + 4 : 0;
  const inner = Math.max(sprite ? PT.portraitH : 0, speakerH + lines.length * PT.lineHeight);
  const boxH = Math.max(PT.minHeight, inner + PT.padY * 2 + PT.frame * 2);
  const y = H - (PT.bottom + boxH) * U;
  const rr = (dx, dy, w, h, r) => CK.RRectXY(CK.XYWHRect(x + dx * U, y + dy * U, w * U, h * U), r * U, r * U);
  // hard drop shadow, frame, card
  canvas.drawRRect(rr(4, 4, boxW, boxH, 3), paint(C.shadow));
  canvas.drawRRect(rr(0, 0, boxW, boxH, 3), paint(C.frame));
  canvas.drawRRect(rr(PT.frame, PT.frame, boxW - PT.frame * 2, boxH - PT.frame * 2, 1), paint(C.card));
  // the portrait: head and shoulders of their walker, a pixel higher on every other blip
  if (sprite) {
    const px = x + (PT.frame + PT.padX) * U;
    const py = y + (PT.frame + PT.padY) * U;
    canvas.drawRect(CK.XYWHRect(px, py, PT.portraitW * U, PT.portraitH * U), paint(C.frame));
    canvas.drawRect(CK.XYWHRect(px + 2 * U, py + 2 * U, (PT.portraitW - 4) * U, (PT.portraitH - 4) * U), paint(C.background));
    const row = WALKER_ROWS[sprite];
    const srcY = row * FH - 1 + (lift && !typed ? 1 : 0);
    canvas.save();
    canvas.clipRect(CK.XYWHRect(px + 2 * U, py + 2 * U, 16 * 4 * U, 17 * 4 * U), CK.ClipOp.Intersect, false);
    canvas.drawImageRectOptions(
      WALKERS,
      CK.XYWHRect(0, srcY, 16, 17),
      CK.XYWHRect(px + 2 * U, py + 2 * U, 16 * 4 * U, 17 * 4 * U),
      NEAREST.filter,
      NEAREST.mipmap,
      null,
    );
    canvas.restore();
  }
  const tx = x + wordsX * U;
  let ty = y + (PT.frame + PT.padY) * U;
  if (speaker) {
    canvas.drawText(speaker, tx, ty + PT.speaker * U * 0.82, paint(C.accent), SPEAKER_FONT);
    ty += speakerH * U;
  }
  // the untyped rest is laid out but not drawn, so words never jump lines
  let left = shown;
  const ink = paint(C.text);
  lines.forEach((line, i) => {
    const part = line.slice(0, Math.max(0, left));
    left -= line.length + 1;
    if (part) canvas.drawText(part, tx, ty + i * PT.lineHeight * U + (PT.lineHeight * 0.5 + PT.text * 0.36) * U, ink, TEXT_FONT);
  });
  if (typed) {
    const mx = x + (boxW - PT.frame - 12) * U;
    const my = y + (boxH - PT.frame - 10) * U;
    const p = paint(C.accent);
    if (last) canvas.drawRect(CK.XYWHRect(mx - 3 * U, my - 3 * U, 7 * U, 7 * U), p);
    else {
      // the ▼, as pixel rows: 8pt wide, narrowing to a point
      for (let r = 0; r < 4; r++) canvas.drawRect(CK.XYWHRect(mx - (4 - r) * U, my + (r * 2 - 3) * U, (8 - r * 2) * U, 2 * U), p);
    }
  }
}

// ---- the question menu (dialogue-box.tsx, asking): the speaker, then each choice with the heart cursor
function drawMenu(canvas, { speaker, options, pick, pressed }) {
  const boxW = W / U - PT.left - PT.right;
  const x = PT.left * U;
  const rowH = PT.lineHeight + 8;
  const speakerH = speaker ? PT.speaker + 4 : 0;
  const boxH = Math.max(PT.minHeight, PT.frame * 2 + PT.padY * 2 + speakerH + options.length * rowH);
  const y = H - (PT.bottom + boxH) * U;
  const rr = (dx, dy, w, h, r) => CK.RRectXY(CK.XYWHRect(x + dx * U, y + dy * U, w * U, h * U), r * U, r * U);
  canvas.drawRRect(rr(4, 4, boxW, boxH, 3), paint(C.shadow));
  canvas.drawRRect(rr(0, 0, boxW, boxH, 3), paint(C.frame));
  canvas.drawRRect(rr(PT.frame, PT.frame, boxW - PT.frame * 2, boxH - PT.frame * 2, 1), paint(C.card));
  const tx = x + (PT.frame + PT.padX) * U;
  let ty = y + (PT.frame + PT.padY) * U;
  if (speaker) {
    canvas.drawText(speaker, tx, ty + PT.speaker * U * 0.82, paint(C.accent), SPEAKER_FONT);
    ty += speakerH * U;
  }
  options.forEach((label, i) => {
    const on = pressed && i === pick;
    const base = ty + i * rowH * U + (rowH * 0.5 + PT.text * 0.36) * U;
    heart(canvas, tx + 1 * U, base - 11 * U, 2 * U, on ? C.accent : C.faint);
    canvas.drawText(label, tx + 24 * U, base, paint(on ? C.accent : C.text), TEXT_FONT);
  });
}

/** A pixel heart, 7 × 6 cells of `cell` px, top-left at (x, y). */
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function heart(canvas, x, y, cell, hex) {
  const p = paint(hex);
  HEART.forEach((row, r) => [...row].forEach((c, k) => c === 'X' && canvas.drawRect(CK.XYWHRect(x + k * cell, y + r * cell, cell, cell), p)));
}

const lerpf = (a, b, k) => a + (b - a) * k;
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
/** How far the camera has zoomed in on the card game: 0 → 1 over the first 0.7s, back over the last 0.6s. */
function zoomIn(t, dur) {
  return easeInOut(Math.min(1, Math.max(0, Math.min(t / 0.7, (dur - t) / 0.6))));
}
/** Where you and the Keeper sit: a little apart, the rug between you. */
function cardsSeats(ep, st) {
  const [kx, ky] = center(ep.map.npcs.keeper.x, ep.map.npcs.keeper.y);
  return { hx: Math.round(st.hx) - 7, kx: kx + 7, floorY: Math.round(ky) };
}
function cardsMid(ep, st) {
  const { hx, kx, floorY } = cardsSeats(ep, st);
  return [(hx + kx) / 2, floorY];
}

// ---- cards with the Keeper: the two of you sit on a rug and play, slapping cards onto a pile;
// a heart pops over whoever takes the hand, and the Keeper bobs when he laughs
const CARD_ROUNDS = [{ keeperWins: true }, { keeperWins: false }, { keeperWins: true }];
const ROUND = 2.6;
/** Who wins each hand of three cards, and when (seconds into the game). */
const HAND = 1.1;
function drawCardsOnFloor(canvas, ep, st) {
  const t = st.cards.t;
  const keeper = ep.map.npcs.keeper;
  const { hx, kx, floorY } = cardsSeats(ep, st);
  const midX = Math.round((hx + kx) / 2);
  // the rug
  canvas.drawRect(CK.XYWHRect(hx - 9, floorY - 3, kx - hx + 18, 5), paint('#5A1E1E'));
  canvas.drawRect(CK.XYWHRect(hx - 8, floorY - 2, kx - hx + 16, 3), paint('#8A3A2A'));
  canvas.drawRect(CK.XYWHRect(hx - 8, floorY - 2, kx - hx + 16, 1), paint('#C9A96E'));
  // which hand we're on, and who's playing a card right now (turns alternate, you first)
  const turn = Math.floor(t / (HAND / 2));
  const hand = Math.floor(t / (HAND * 1.5));
  const winner = CARD_ROUNDS[hand % CARD_ROUNDS.length].keeperWins;
  const sinceWin = t - (hand + 1) * HAND * 1.5 + 0.35;
  const laughing = winner && sinceWin > -0.35 && sinceWin < 0.6;
  // sitting: the walker's top 15 rows on the rug, legs folded under (rows 15–22 squashed to 4)
  const sit = (sprite, x, dir, lift) => {
    const sx = DIRS[dir] * 3 * FW;
    const sy = WALKER_ROWS[sprite] * FH;
    const left = Math.round(x - FW / 2);
    canvas.drawImageRectOptions(WALKERS, CK.XYWHRect(sx, sy + 15, FW, 8), CK.XYWHRect(left, floorY - 4, FW, 4), NEAREST.filter, NEAREST.mipmap, null);
    canvas.drawImageRectOptions(WALKERS, CK.XYWHRect(sx, sy, FW, 15), CK.XYWHRect(left, floorY - 18 - lift, FW, 15), NEAREST.filter, NEAREST.mipmap, null);
  };
  sit(ep.hero.sprite, hx, 'right', 0);
  sit(keeper.sprite, kx, 'left', laughing && Math.floor(t * 8) % 2 === 0 ? 1 : 0);
  // a little fan of cards in each lap
  const cardPaint = paint('#F8F0E0');
  const pip = paint('#B42318');
  const back = paint(C.accent);
  for (let i = 0; i < 2; i++) {
    canvas.drawRect(CK.XYWHRect(hx + 4 + i, floorY - 9 - i, 2, 3), back);
    canvas.drawRect(CK.XYWHRect(kx - 6 - i, floorY - 9 - i, 2, 3), back);
  }
  // the pile, growing, a card at a time; the one in flight arcs from a lap to the middle
  const played = Math.min(turn, 9);
  for (let i = 0; i < played % 6; i++) {
    const ox = ((i * 7) % 3) - 1;
    canvas.drawRect(CK.XYWHRect(midX - 1 + ox, floorY - 2 - (i % 2), 3, 2), cardPaint);
    canvas.drawRect(CK.XYWHRect(midX + ox, floorY - 2 - (i % 2), 1, 1), pip);
  }
  const k = (t % (HAND / 2)) / 0.25;
  if (k < 1) {
    const fromX = turn % 2 === 0 ? hx + 4 : kx - 4;
    const x = fromX + (midX - fromX) * k;
    const y = floorY - 7 + 5 * k - Math.sin(Math.PI * k) * 4;
    canvas.drawRect(CK.XYWHRect(Math.round(x) - 1, Math.round(y), 3, 2), cardPaint);
  }
  // the winner's heart floats up and away
  if (sinceWin > 0 && sinceWin < 0.9) {
    const x = winner ? kx - 3 : hx - 3;
    const y = floorY - 26 - sinceWin * 10;
    const p = paint(C.accent);
    ['.X.X.', 'XXXXX', '.XXX.', '..X..'].forEach((row, r) =>
      [...row].forEach((c, cx) => c === 'X' && canvas.drawRect(CK.XYWHRect(Math.round(x) + cx, Math.round(y) + r, 1, 1), p)),
    );
  }
}

function drawOverlays(canvas, st) {
  if (st.line) drawBox(canvas, st.line);
  if (st.menu) drawMenu(canvas, st.menu);
}

// ---- the script: walk, face, say, narrate, wait; compiled into timed segments
const center = (tx, ty) => [tx * TILE + TILE / 2, ty * TILE + TILE - 2];
const HOLD = (text) => Math.min(2.6, 1.1 + text.length * 0.022);
function compile(ep) {
  const segs = [];
  let t = ep.titleDur;
  let pos = center(...ep.hero.at);
  let facing = ep.hero.facing;
  for (const step of ep.script) {
    if (step.walk) {
      const pts = [pos, ...step.walk.map((p) => center(...p))];
      const legs = [];
      let dist = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const len = Math.hypot(bx - ax, by - ay);
        if (len === 0) continue;
        const dir = Math.abs(bx - ax) > Math.abs(by - ay) ? (bx > ax ? 'right' : 'left') : by > ay ? 'down' : 'up';
        legs.push({ a: [ax, ay], b: [bx, by], d0: dist, len, dir });
        dist += len;
      }
      const dur = dist / SPEED;
      segs.push({ kind: 'walk', t0: t, t1: t + dur, legs, dist });
      t += dur;
      pos = pts[pts.length - 1];
      if (legs.length) facing = legs[legs.length - 1].dir;
      if (step.face) {
        segs.push({ kind: 'face', t0: t, t1: t, dir: step.face });
        facing = step.face;
      }
      t += 0.15;
    } else if (step.face) {
      segs.push({ kind: 'face', t0: t, t1: t, dir: step.face });
      facing = step.face;
      t += 0.25;
    } else if (step.menu) {
      // the game's question menu: the choices sit a moment, then the picked one lights up as it's pressed
      const dur = (step.menu.hold ?? 1.5) + 0.45;
      segs.push({ kind: 'menu', t0: t, t1: t + dur, pressAt: t + dur - 0.45, ...step.menu });
      t += dur + 0.15;
    } else if (step.npcWalk) {
      // someone else moves (Nib running off): their own speed, optionally gone at the end, crying on the way
      const npc = ep.map.npcs[step.npcWalk];
      const from = step.from ?? center(npc.x, npc.y);
      const pts = [from, ...step.to.map((p) => center(...p))];
      const legs = [];
      let dist = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const len = Math.hypot(bx - ax, by - ay);
        if (len === 0) continue;
        const dir = Math.abs(bx - ax) > Math.abs(by - ay) ? (bx > ax ? 'right' : 'left') : by > ay ? 'down' : 'up';
        legs.push({ a: [ax, ay], b: [bx, by], d0: dist, len, dir });
        dist += len;
      }
      const speed = step.speed ?? SPEED;
      const dur = dist / speed;
      segs.push({ kind: 'npcWalk', t0: t, t1: t + dur, id: step.npcWalk, legs, dist, speed, hide: step.hide, tears: step.tears });
      if (!step.together) t += dur + 0.15;
    } else if (step.cards) {
      segs.push({ kind: 'cards', t0: t, t1: t + step.cards });
      t += step.cards;
    } else if (step.say || step.narrate || step.you) {
      const npc = step.say ? ep.map.npcs[step.say] : null;
      const speaker = step.you ? 'You' : npc ? npc.name : undefined;
      const sprite = step.you ? ep.hero.sprite : npc ? npc.sprite : undefined;
      const voice = step.you ? 3 : voiceFor(speaker, sprite);
      // the person turns to face you, as in the game
      if (npc) {
        const [nx, ny] = center(npc.x, npc.y);
        const dx = pos[0] - nx;
        const dy = pos[1] - ny;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        segs.push({ kind: 'npcFace', t0: t, t1: t, id: step.say, dir });
      }
      const lines = step.you ?? step.lines ?? (npc ? npc.lines : []);
      lines.forEach((text, i) => {
        const at = letterTimes(text);
        const typing = at[at.length - 1] + 0.03;
        const blips = speaker ? at.map((a, k) => (text[k].trim() && k % 2 === 0 ? a : null)).filter((a) => a !== null) : [];
        const dur = typing + HOLD(text);
        segs.push({ kind: 'line', t0: t, t1: t + dur, speaker, sprite, text, at, typing, blips, voice, last: i === lines.length - 1 });
        t += dur;
      });
      t += 0.25;
    } else if (step.wait) t += step.wait;
  }
  return { segs, end: t };
}

/** Everyone's state at time t. */
function stateAt(ep, compiled, t) {
  let [hx, hy] = center(...ep.hero.at);
  let facing = ep.hero.facing;
  let walked = 0;
  let moving = false;
  const npcFacing = Object.fromEntries(Object.entries(ep.map.npcs).map(([id, n]) => [id, n.facing ?? 'down']));
  let line = null;
  let menu = null;
  let cards = null;
  /** Where people have walked to, by id: { x, y, dir, frame, gone, tears }. */
  const npcAt = {};
  for (const s of compiled.segs) {
    if (s.t0 > t) break;
    if (s.kind === 'walk') {
      const d = Math.min(s.dist, (t - s.t0) * SPEED);
      const leg = s.legs.findLast((l) => l.d0 <= d) ?? s.legs[0];
      const k = Math.min(1, (d - leg.d0) / leg.len);
      hx = leg.a[0] + (leg.b[0] - leg.a[0]) * k;
      hy = leg.a[1] + (leg.b[1] - leg.a[1]) * k;
      facing = leg.dir;
      moving = t < s.t1;
      walked = d;
    } else if (s.kind === 'face') facing = s.dir;
    else if (s.kind === 'npcFace') npcFacing[s.id] = s.dir;
    else if (s.kind === 'npcWalk') {
      const d = Math.min(s.dist, (t - s.t0) * s.speed);
      const leg = s.legs.findLast((l) => l.d0 <= d) ?? s.legs[0];
      const k = Math.min(1, (d - leg.d0) / leg.len);
      const done = t >= s.t1;
      npcAt[s.id] = {
        x: leg.a[0] + (leg.b[0] - leg.a[0]) * k,
        y: leg.a[1] + (leg.b[1] - leg.a[1]) * k,
        dir: leg.dir,
        frame: walkFrame(d, !done),
        gone: done && s.hide,
        tears: s.tears && !done,
      };
    }
    else if (s.kind === 'line' && t < s.t1) {
      const lt = t - s.t0;
      const shown = s.at.filter((a) => a <= lt).length;
      const blipsSoFar = s.blips.filter((a) => a <= lt).length;
      line = { ...s, shown, typed: lt >= s.typing, lift: blipsSoFar % 2 === 1 };
    } else if (s.kind === 'menu' && t < s.t1) menu = { ...s, pressed: t >= s.pressAt };
    else if (s.kind === 'cards' && t < s.t1 + 0.4) cards = { t: t - s.t0, dur: s.t1 - s.t0 };
  }
  return { hx, hy, facing, walked, moving, npcFacing, npcAt, line, menu, cards };
}

function walkFrame(distance, moving) {
  if (!moving) return 0;
  const phase = Math.floor(distance / 7) % 4;
  return phase === 1 ? 1 : phase === 3 ? 2 : 0;
}

// ---- the World, at K px per art pixel
const VIEW_W = W / K;
const VIEW_H = H / K;
function drawWorld(canvas, ep, st, t) {
  const map = ep.map;
  const mapW = map.image.width();
  const mapH = map.image.height();
  // the camera follows you; for the card game it eases in close on the two of you, and back out
  const zk = st.cards ? zoomIn(st.cards.t, st.cards.dur) : 0;
  const z = 1 + zk;
  const sk = K * z;
  const vw = W / sk;
  const vh = H / sk;
  const fx = st.cards ? lerpf(st.hx, cardsMid(ep, st)[0], zk) : st.hx;
  const fy = st.cards ? lerpf(st.hy - 12, cardsMid(ep, st)[1] - 10, zk) : st.hy - 12;
  const camX = mapW <= vw ? (mapW - vw) / 2 : Math.min(Math.max(fx - vw / 2, 0), mapW - vw);
  // the action sits a third of the way down, so the text box (raised clear of app captions) never covers it
  // (it may look past the map's bottom edge: that strip sits behind the box and the apps' captions anyway)
  const below = (H - (H - PT.bottom * U - 260)) / sk;
  const camY = Math.min(Math.max(fy - vh * 0.34, Math.min(0, mapH - vh)), Math.max(0, mapH - vh) + below);
  canvas.clear(color('#0C0806'));
  canvas.save();
  canvas.scale(sk, sk);
  canvas.translate(-Math.round(camX * sk) / sk, -Math.round(camY * sk) / sk);
  canvas.drawImageRectOptions(map.image, CK.XYWHRect(0, 0, mapW, mapH), CK.XYWHRect(0, 0, mapW, mapH), NEAREST.filter, NEAREST.mipmap, null);
  // flames (world-view.tsx flameLit / flameCore)
  const lit = paint('#FFB04A');
  const core = paint('#FFF4C0');
  map.flames.forEach(([x, y], i) => {
    const k = Math.floor(t * 9 + i * 3.7);
    const lean = k % 3 === 0 ? -1 : k % 5 === 0 ? 1 : 0;
    canvas.drawRect(CK.XYWHRect(x + lean, y - (k % 2), 2, 2 + (k % 2)), lit);
    if (Math.floor(t * 7 + i) % 4 !== 0) canvas.drawRect(CK.XYWHRect(x, y + 1, 1, 1), core);
  });
  // signs and chests, drawn over the map as the game does (world-view.tsx Sign, Chest)
  for (const o of map.signs) {
    const x = o.x * TILE;
    const y = o.y * TILE;
    canvas.drawRect(CK.XYWHRect(x + 7, y + 8, 2, 7), paint('#4A3020'));
    canvas.drawRect(CK.XYWHRect(x + 2, y + 2, 12, 8), paint('#140E1C'));
    canvas.drawRect(CK.XYWHRect(x + 3, y + 3, 10, 6), paint('#B08A58'));
    canvas.drawRect(CK.XYWHRect(x + 4, y + 5, 8, 1), paint('#6A4A2A'));
    canvas.drawRect(CK.XYWHRect(x + 4, y + 7, 6, 1), paint('#6A4A2A'));
  }
  for (const o of map.chests) {
    const x = o.x * TILE;
    const y = o.y * TILE;
    canvas.drawRect(CK.XYWHRect(x + 1, y + 13, 14, 2), paint('#10080A', 0.5));
    canvas.drawRect(CK.XYWHRect(x + 1, y + 6, 14, 8), paint('#140E1C'));
    canvas.drawRect(CK.XYWHRect(x + 2, y + 7, 12, 6), paint('#8A5A30'));
    canvas.drawRect(CK.XYWHRect(x + 2, y + 9, 12, 1), paint('#5A3A20'));
    canvas.drawRect(CK.XYWHRect(x + 1, y + 3, 14, 4), paint('#140E1C'));
    canvas.drawRect(CK.XYWHRect(x + 2, y + 4, 12, 2), paint('#A0703C'));
    canvas.drawRect(CK.XYWHRect(x + 7, y + 5, 2, 4), paint('#FFC940'));
    canvas.drawRect(CK.XYWHRect(x + 2, y + 6, 12, 1), paint('#FFC940'));
  }
  // everyone, back to front by their feet; while you play cards, you and the Keeper sit on the floor
  const sitting = st.cards ? ['keeper'] : [];
  const ents = Object.values(map.npcs)
    .filter((n) => !ep.hide?.includes(n.id) && !sitting.includes(n.id) && !st.npcAt[n.id]?.gone)
    .map((n) => {
      const at = st.npcAt[n.id];
      return at
        ? [WALKER_ROWS[n.sprite], DIRS[at.dir], at.frame, at.x, at.y]
        : [WALKER_ROWS[n.sprite], DIRS[st.npcFacing[n.id]], 0, ...center(n.x, n.y)];
    });
  if (!st.cards) ents.push([WALKER_ROWS[ep.hero.sprite], DIRS[st.facing], walkFrame(st.walked, st.moving), st.hx, st.hy]);
  ents.sort((a, b) => a[4] - b[4]);
  for (const [row, dir, frame, x, y] of ents) {
    canvas.drawImageRectOptions(
      WALKERS,
      CK.XYWHRect((dir * 3 + frame) * FW, row * FH, FW, FH),
      CK.XYWHRect(Math.round(x - FW / 2), Math.round(y - FEET), FW, FH),
      NEAREST.filter,
      NEAREST.mipmap,
      null,
    );
  }
  if (st.cards) drawCardsOnFloor(canvas, ep, st);
  // tears, flung back off a crying face as they run
  for (const [id, at] of Object.entries(st.npcAt)) {
    if (!at.tears || at.gone) continue;
    const back = at.dir === 'left' ? 1 : at.dir === 'right' ? -1 : 0;
    const tear = paint('#7FC8FF');
    for (let i = 0; i < 3; i++) {
      const k = ((t * 3 + i / 3) % 1);
      const x = at.x + back * (3 + k * 8) + (i - 1);
      const y = at.y - 16 + k * k * 10;
      canvas.drawRect(CK.XYWHRect(Math.round(x), Math.round(y), 1, 2), tear);
    }
  }
  // dust drifting in the air
  const dust = paint('#D8D0C0', 0.55);
  for (let i = 0; i < 26; i++) {
    const sx = (i * 0.618) % 1;
    const sy = (i * 0.414 + 0.3) % 1;
    const pollen = map.motes === 'pollen';
    const vx = pollen ? 4 + (i % 3) * 2 : i % 2 ? 1.5 : -1.5;
    const vy = pollen ? Math.sin(t * 0.8 + i) * 3 : 2 + (i % 4);
    const x = (((sx * mapW + vx * t) % mapW) + mapW) % mapW;
    const y = (((sy * mapH + (pollen ? vy : vy * t)) % mapH) + mapH) % mapH;
    canvas.drawRect(CK.XYWHRect(Math.round(x), Math.round(y), 1, 1), pollen ? paint('#F4EFA0', 0.55) : dust);
  }
  // the dark, with the candles' light and yours cut out of it
  if (map.darkness > 0) {
    canvas.saveLayer(null, null);
    canvas.drawRect(CK.XYWHRect(0, 0, mapW, mapH), paint('#05030A', map.darkness));
    const hole = (cx, cy, r, stops) => {
      const p = new CK.Paint();
      p.setBlendMode(CK.BlendMode.DstOut);
      const shader = CK.Shader.MakeRadialGradient([cx, cy], r, stops.map((s) => color('#000000', s)), null, CK.TileMode.Clamp);
      p.setShader(shader);
      canvas.drawCircle(cx, cy, r, p);
      shader.delete();
      p.delete();
    };
    map.flames.forEach(([x, y, reach], i) => {
      if (reach > 0) hole(x + 1, y + 2, reach * (0.94 + 0.06 * Math.sin(t * 11 + i * 2.3)), [1, 0.8, 0]);
    });
    hole(st.hx, st.hy - 10, 34, [1, 0]);
    canvas.restore();
  }
  canvas.restore();
  // the tape, over the world and under the words (12 fps, warm in the Archive)
  const tape = vhsAt(Math.floor(t * 12), map.id === 'archive' ? 1 : 0);
  canvas.drawImageRectOptions(tape, CK.XYWHRect(0, 0, VW, VH), CK.XYWHRect(0, 0, W, H), CK.FilterMode.Linear, CK.MipmapMode.None, null);
}

/**
 * The VHS shader's maths, run in plain JS (CanvasKit runs runtime shaders on
 * the CPU at seconds a frame). Same formula, evaluated per point (the shader's
 * own units) and scaled up; the scanlines and vignette never change, so they're
 * worked out once, and only the grain and the rolling band per tape tick (12 a second).
 */
const VW = Math.round(W / U);
const VH = Math.round(H / U);
const smooth = (e0, e1, x) => {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};
const mixf = (a, b, k) => a + (b - a) * k;
const fract = (x) => x - Math.floor(x);
const vhsBase = new Map();
function vhsStill(warm) {
  if (vhsBase.has(warm)) return vhsBase.get(warm);
  const base = new Float32Array(VW * VH);
  const vig = mixf(0.6, 0.35, warm);
  for (let y = 0; y < VH; y++) {
    const py = y + 0.5;
    const scan = 0.5 + 0.5 * Math.sin(py * 2.0944);
    const cy = (py / VH - 0.5) * 1.25;
    for (let x = 0; x < VW; x++) {
      const cx = (x + 0.5) / VW - 0.5;
      base[y * VW + x] = (1 - scan) * 0.12 + smooth(0.3, 0.8, Math.hypot(cx, cy)) * vig + mixf(0.2, 0.04, warm);
    }
  }
  vhsBase.set(warm, base);
  return base;
}
let vhsLast = { key: '', img: null };
function vhsAt(tick, warm) {
  const key = `${tick}:${warm}`;
  if (vhsLast.key === key) return vhsLast.img;
  vhsLast.img?.delete();
  const t = 3 + tick / 12;
  const base = vhsStill(warm);
  const buf = new Uint8Array(VW * VH * 4);
  const bandY = fract(t * 0.05);
  const tone = [mixf(0.05, 0.12, warm), mixf(0.03, 0.06, warm), mixf(0.09, 0.0, warm)];
  const tf = Math.floor(t * 12);
  for (let y = 0; y < VH; y++) {
    const py = y + 0.5;
    const band = smooth(0.035, 0, Math.abs(py / VH - bandY));
    const r = mixf(tone[0], 0.85, band * 0.6);
    const g = mixf(tone[1], 0.8, band * 0.6);
    const b = mixf(tone[2], 0.9, band * 0.6);
    const gy = Math.floor(py / 2) + tf;
    for (let x = 0; x < VW; x++) {
      const n = fract(Math.sin((Math.floor((x + 0.5) / 2) + tf) * 12.9898 + gy * 78.233) * 43758.5453);
      const a = Math.min(0.85, Math.max(0, base[y * VW + x] + (n - 0.5) * 0.05 + band * 0.07));
      const i = (y * VW + x) * 4;
      buf[i] = r * a * 255;
      buf[i + 1] = g * a * 255;
      buf[i + 2] = b * a * 255;
      buf[i + 3] = a * 255;
    }
  }
  const img = CK.MakeImage(
    { width: VW, height: VH, alphaType: CK.AlphaType.Premul, colorType: CK.ColorType.RGBA_8888, colorSpace: CK.ColorSpace.SRGB },
    buf,
    VW * 4,
  );
  vhsLast = { key, img };
  return img;
}

// ---- title and end cards, in the game's fonts on black
const CARD_BIG = fontOf(JERSEY, 120);
const CARD_MID = fontOf(JERSEY, 76);
const CARD_SMALL = fontOf(JERSEY, 52);
function centred(canvas, text, y, font, hex, count = text.length) {
  const x = (W - widthOf(font, text)) / 2;
  canvas.drawText(text.slice(0, Math.max(0, count)), x, y, paint(hex), font);
}
function drawTitle(canvas, ep, t) {
  canvas.clear(color('#05030A'));
  const type = (s, start) => Math.max(0, Math.floor((t - start) / 0.045));
  centred(canvas, `EPISODE ${ep.number}`, H / 2 - 120, CARD_MID, '#FFC940', type(0, 0.2));
  const titleLines = wrap(CARD_BIG, ep.title, W - 120);
  let used = 0;
  titleLines.forEach((line, i) => {
    centred(canvas, line, H / 2 + 20 + i * 130, CARD_BIG, C.card, Math.max(0, type(0, 0.7) - used));
    used += line.length;
  });
}
const CARD_LOGO = fontOf(JERSEY, 170);
/**
 * The close: what's next, then the brand as the ads end on it ("8 PATHS / THE HABIT
 * POWERED RPG"), then where to follow. Kept above the apps' captions and clear of their buttons.
 */
function drawEnd(canvas, ep, t) {
  canvas.clear(color('#05030A'));
  const type = (start) => Math.max(0, Math.floor((t - start) / 0.045));
  // with the next episode still unwritten, the card just says so
  centred(canvas, ep.next ? 'NEXT TIME' : 'TO BE', 330, CARD_MID, '#FFC940', type(0.1));
  wrap(CARD_BIG, ep.next ?? 'CONTINUED', W - 320).forEach((line, i) => centred(canvas, line, 460 + i * 120, CARD_BIG, C.card, type(0.4)));
  if (t > 1.3) {
    centred(canvas, '8 PATHS', 800, CARD_LOGO, '#FFFFFF');
    centred(canvas, 'THE HABIT', 890, CARD_MID, '#FF4D5E', type(1.45));
    centred(canvas, 'POWERED RPG', 970, CARD_MID, '#FF4D5E', type(1.45) - 9);
  }
  if (t > 2.4) {
    centred(canvas, 'FOLLOW @8PATHSS', 1110, CARD_MID, '#FFC940');
    centred(canvas, 'ON TIKTOK AND INSTAGRAM', 1180, CARD_SMALL, C.card);
    centred(canvas, 'FOR EARLY ACCESS AND', 1240, CARD_SMALL, C.card);
    centred(canvas, 'FOUNDER EXCLUSIVES', 1300, CARD_SMALL, C.card);
  }
  if (t > 3.0) centred(canvas, '100 LEFT!', 1390, CARD_MID, '#FF4D5E');
}

// ---- episodes
const EPISODES = {
  // Just you and the Keeper. Written by the author for this episode (not in the game yet).
  2: () => {
    const map = loadMap('archive', 'rooms');
    const QUESTIONS = ['Where am I?', 'Who are you?', 'How do you know me?', 'What am I supposed to do now?'];
    const ask = (pick) => ({ menu: { speaker: 'The Keeper', options: QUESTIONS, pick } });
    return {
      number: 2,
      title: 'AN OLD FRIEND',
      next: 'HALF A STICK',
      map,
      hero: { sprite: 'quill', at: [12, 5], facing: 'up' },
      hide: ['quill', 'brannoc', 'ysolde', 'wren', 'oren', 'pip', 'tamsin', 'moss'],
      titleDur: 3.0,
      endDur: 4.5,
      script: [
        { wait: 0.6 },
        { walk: [[14, 5], [14, 4]], face: 'right' },
        { say: 'keeper', lines: ["Ah, you're on your feet. I'm so glad to finally see you again."] },
        { menu: { speaker: 'The Keeper', options: ['Again?', '...'], pick: 0, hold: 1.0 } },
        { say: 'keeper', lines: ["...You don't remember, do you.", 'Oh dear. Where do I begin?'] },
        ask(0),
        { say: 'keeper', lines: ["You're in a pocket dimension. I've been keeping you company for the past five hundred years.", "It's a long story."] },
        ask(1),
        { say: 'keeper', lines: ["Let's just say I'm an old friend."] },
        ask(2),
        { say: 'keeper', lines: ["I know more than I'm saying. I won't pretend I don't.", "But who you were is yours to find. I think you'd rather remember it than be told."] },
        ask(3),
        { say: 'keeper', lines: ["Well, you could stay here, if you'd like.", 'We could play cards.'] },
        { menu: { speaker: 'The Keeper', options: ['Play cards.', 'Goodbye.'], pick: 0, hold: 1.1 } },
        { cards: CARD_ROUNDS.length * ROUND + 0.4 },
        { walk: [[14, 5]], face: 'down' },
        { say: 'keeper', lines: ['Leaving so soon?'] },
        { menu: { speaker: 'The Keeper', options: ['Yes.', 'No.'], pick: 0, hold: 1.1 } },
        { face: 'up' },
        {
          say: 'keeper',
          lines: [
            'Outside of this Archive is the Other World.',
            "You don't have the same power you once had. You'll have to grow stronger, a little each day.",
            'Your actions in the real world affect your strength in this one.',
            'In time, higher levels will grant you abilities you once had.',
            "Once you're out there, you can do whatever you'd like.",
          ],
        },
        { walk: [[14, 11], [13, 11], [13, 12]], face: 'down' },
        { wait: 0.2 },
      ],
    };
  },
  // Nib's duel, your questions, and what happens if you're mean to him. Written by the author for this episode.
  3: () => {
    const map = loadMap('courier-road', 'outdoor');
    const nib = map.npcs.nib;
    const QUESTIONS = ['Who are you?', 'What are you doing out here?', 'Got any gossip?', 'Beat it, kid.'];
    const ask = (pick) => ({ menu: { speaker: 'Nib', options: QUESTIONS, pick } });
    return {
      number: 3,
      title: 'HALF A STICK',
      map,
      hero: { sprite: 'quill', at: [12, 2], facing: 'down' },
      titleDur: 3.0,
      endDur: 4.5,
      script: [
        { wait: 0.5 },
        { walk: [[12, 9], [10, 9], [10, 10]], face: 'left' },
        { say: 'nib', lines: nib.lines },
        ask(0),
        { say: 'nib', lines: ["I'm Nib. What's it to ya?"] },
        ask(1),
        { say: 'nib', lines: ['Dueling chumps like you.'] },
        ask(2),
        { say: 'nib', lines: ["Don't you have a job or something?"] },
        ask(3),
        { say: 'nib', lines: ['...', "I'm telling my MUM!"] },
        { narrate: true, lines: ['Nib bursts into tears and runs off down the road.'] },
        { npcWalk: 'nib', to: [[9, 9], [9, 8], [-2, 8]], speed: 105, hide: true, tears: true },
        { wait: 0.4 },
        // the episode ends as you reach the cocoon in the long grass
        { walk: [[10, 11], [6, 11]], face: 'left' },
        { wait: 1.6 },
      ],
    };
  },
};

if (!EPISODES[episode]) throw new Error(`No episode ${episode} yet: ${Object.keys(EPISODES).join(', ')}`);
const ep = EPISODES[episode]();
const compiled = compile(ep);
const FADE = 0.5;
const total = compiled.end + ep.endDur;
const frames = Math.ceil(total * FPS);

// STILLS='3.5,9' writes those moments as PNGs next to `out` instead of a video, for checking the look.
if (process.env.STILLS) {
  const surface = CK.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  for (const s of process.env.STILLS.split(',').map(Number)) {
    if (s < ep.titleDur) drawTitle(canvas, ep, s);
    else if (s < compiled.end) {
      const st = stateAt(ep, compiled, s);
      drawWorld(canvas, ep, st, s);
      drawOverlays(canvas, st);
    } else drawEnd(canvas, ep, s - compiled.end);
    writeFileSync(out.replace(/\.\w+$/, `-${s}.png`), surface.makeImageSnapshot().encodeToBytes());
  }
  console.log(`total ${total.toFixed(1)}s`, compiled.segs.filter((x) => x.kind === 'line').map((x) => `${x.t0.toFixed(1)} ${x.speaker ?? '-'}: ${x.text.slice(0, 30)}`).join('\n'));
  process.exit(0);
}

// ---- render the picture
const work = mkdtempSync(join(tmpdir(), 'episode-'));
const silent = join(work, 'picture.mp4');
const ff = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', silent],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
const surface = CK.MakeSurface(W, H);
const canvas = surface.getCanvas();
const black = (a) => a > 0 && canvas.drawRect(CK.XYWHRect(0, 0, W, H), paint('#000000', Math.min(1, a)));
for (let f = 0; f < frames; f++) {
  const t = f / FPS;
  if (t < ep.titleDur) {
    drawTitle(canvas, ep, t);
    black((t - (ep.titleDur - FADE)) / FADE);
  } else if (t < compiled.end) {
    const st = stateAt(ep, compiled, t);
    drawWorld(canvas, ep, st, t);
    drawOverlays(canvas, st);
    black(1 - (t - ep.titleDur) / FADE);
    black((t - (compiled.end - FADE)) / FADE);
  } else {
    drawEnd(canvas, ep, t - compiled.end);
  }
  const px = canvas.readPixels(0, 0, { width: W, height: H, colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB });
  if (!ff.stdin.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))) await once(ff.stdin, 'drain');
  if (f % 150 === 0) process.stderr.write(`\r${Math.round((f / frames) * 100)}%`);
}
ff.stdin.end();
await once(ff, 'close');
process.stderr.write('\r100%\n');

// ---- the voices: a blip every other letter, at the game's volume (sounds.ts EFFECT_VOLUME 0.5)
const RATE = 22050;
const pcm = (path) => {
  const b = readFileSync(path);
  const at = b.indexOf('data') + 8;
  return new Int16Array(b.buffer.slice(b.byteOffset + at, b.byteOffset + b.length));
};
const blips = [1, 2, 3, 4, 5].map((v) => pcm(join(ROOT, `assets/audio/blip-${v}.wav`)));
/** A sound played slower, so lower: `rate` 0.5 is an octave down. */
const slowed = (src, rate) => {
  const out = new Int16Array(Math.floor(src.length / rate));
  for (let i = 0; i < out.length; i++) {
    const at = i * rate;
    const k = Math.floor(at);
    out[i] = Math.round(src[k] + ((src[k + 1] ?? 0) - src[k]) * (at - k));
  }
  return out;
};
// voice 0, the Keeper's: the lowest blip, an octave and a bit down
const VOICE_SOUNDS = [slowed(blips[0], 0.45), ...blips];
/** The pick of a menu choice: a short, bright two-note tick. */
const SELECT = (() => {
  const out = new Int16Array(Math.floor(RATE * 0.09));
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const freq = t < 0.035 ? 988 : 1319;
    const square = Math.sign(Math.sin(2 * Math.PI * freq * t));
    out[i] = Math.round(square * Math.exp(-t * 32) * 0.35 * 32767);
  }
  return out;
})();
const mix = new Float32Array(Math.ceil(total * RATE));
const place = (sound, at, gain) => {
  const start = Math.round(at * RATE);
  for (let i = 0; i < sound.length && start + i < mix.length; i++) mix[start + i] += (sound[i] / 32768) * gain;
};
for (const s of compiled.segs) {
  if (s.kind === 'line') for (const a of s.blips) place(VOICE_SOUNDS[s.voice], s.t0 + a, s.voice === 0 ? 0.7 : 0.5);
  if (s.kind === 'menu') place(SELECT, s.pressAt, 0.5);
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
const voices = join(work, 'voices.wav');
writeFileSync(voices, wav);

// ---- no music: the voices are the soundtrack (add a sound when posting if you like)
const r = spawnSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-i', silent, '-i', voices,
    // the game's blips are soft under a phone's own volume; a feed needs them up front
    '-map', '0:v', '-map', '1:a', '-af', 'volume=14dB,alimiter=limit=0.9', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out],
  { stdio: 'inherit' },
);
if (r.status !== 0) throw new Error('ffmpeg mux failed');
console.log(`${out}: ${total.toFixed(1)}s`);
