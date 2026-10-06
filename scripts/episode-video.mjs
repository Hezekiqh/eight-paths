// Season 1 as a series of vertical episodes (1080×1920, 30fps), drawn the way
// the game draws the Other World: the baked map, the walkers, candlelight,
// dust, the VHS grade, and the real dialogue box with its portrait, fonts and
// a voice blip every other letter. Same Skia (CanvasKit), same art files.
// No music: just the voices.
//
//   node scripts/episode-video.mjs 7            → ~/Movies/Eight Paths Episodes/Episode 07 - The One in the Corner.mp4
//   node scripts/episode-video.mjs 2 out.mp4    (or anywhere you like)
//
// Needs ffmpeg. Lines come straight from the map JSONs, so they match the game.

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import CanvasKitInit from 'canvaskit-wasm/bin/canvaskit.js';
import { PNG } from 'pngjs';

import { laugh } from './laugh-sound.mjs';
import { COCOON_H, EYE, GH, GROUND, GW, box, drawCocoon, drawRealm, hex, mix as mixRgb, put } from './realm-art.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [episode = '2', outArg] = process.argv.slice(2);
/**
 * Where finished episodes go unless a path is given (author, Oct 3, 2026): one folder on the Mac,
 * each named by number and title, "Episode 04 - Welcome Back.mp4".
 */
export const EPISODE_FOLDER = join(homedir(), 'Movies', 'Eight Paths Episodes');

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
const DIALOGUE = typeface(
  join(ROOT, 'node_modules/@expo-google-fonts/dotgothic16/400Regular/DotGothic16_400Regular.ttf'),
);
const JERSEY = typeface(join(ROOT, 'node_modules/@expo-google-fonts/jersey-10/400Regular/Jersey10_400Regular.ttf'));
const WALKERS = image(join(ROOT, 'assets/world/walkers.png'));
const WALKER_ROWS = Object.fromEntries(
  [...readFileSync(join(ROOT, 'src/world/walkers.ts'), 'utf8').matchAll(/^ {2}(\w+): (\d+),$/gm)].map((m) => [
    m[1],
    +m[2],
  ]),
);
const NEAREST = { filter: CK.FilterMode.Nearest, mipmap: CK.MipmapMode.None };

// ---- maps: the baked picture, the people, the candles (ambience.ts)
const AMBIENCE = { rooms: { darkness: 0.18 }, outdoor: { darkness: 0 }, dungeon: { darkness: 0.32 } };
const FLAMES = {
  rooms: {
    c: [
      { dx: 4, dy: 1, reach: 0 },
      { dx: 7, dy: -1, reach: 44 },
      { dx: 11, dy: 1, reach: 0 },
    ],
  },
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
  // pushable boulders, drawn over the picture so they can move (the bake leaves floor under them)
  const boulders = [];
  if (json.pushable)
    json.tiles.forEach((row, ty) => [...row].forEach((c, tx) => c === json.pushable && boulders.push([tx, ty])));
  return {
    ...json,
    boulders,
    style,
    image: image(join(ROOT, `assets/world/${id}.png`)),
    flames,
    npcs,
    signs,
    chests,
    motes,
    darkness: AMBIENCE[style].darkness,
  };
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
/**
 * When each letter appears, in seconds from the line's start. The short-form template (EPISODES.md, from
 * Episode 10) types faster than the game: `ms` a letter, and the punctuation pauses scaled by `pause`.
 */
function letterTimes(text, ms = LETTER_MS, pause = 1) {
  const at = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) t += (ms + (PAUSES[text[i - 1]] ?? 0) * pause) / 1000;
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
    canvas.drawRect(
      CK.XYWHRect(px + 2 * U, py + 2 * U, (PT.portraitW - 4) * U, (PT.portraitH - 4) * U),
      paint(C.background),
    );
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
    if (!part) return;
    const base = ty + i * PT.lineHeight * U + (PT.lineHeight * 0.5 + PT.text * 0.36) * U;
    // the pixel font has no emoji, so Felix's 😛 is drawn as pixels (on the phone, iOS draws its own)
    const at = part.indexOf(TONGUE);
    if (at === -1) {
      canvas.drawText(part, tx, base, ink, TEXT_FONT);
      return;
    }
    const before = part.slice(0, at);
    canvas.drawText(before, tx, base, ink, TEXT_FONT);
    drawTongue(canvas, tx + widthOf(TEXT_FONT, before) + 2 * U, base - PT.text * 0.95 * U, 2.25 * U);
    const after = part.slice(at + TONGUE.length);
    if (after) canvas.drawText(after, tx + widthOf(TEXT_FONT, before) + 22 * U, base, ink, TEXT_FONT);
  });
  if (typed) {
    const mx = x + (boxW - PT.frame - 12) * U;
    const my = y + (boxH - PT.frame - 10) * U;
    const p = paint(C.accent);
    if (last) canvas.drawRect(CK.XYWHRect(mx - 3 * U, my - 3 * U, 7 * U, 7 * U), p);
    else {
      // the ▼, as pixel rows: 8pt wide, narrowing to a point
      for (let r = 0; r < 4; r++)
        canvas.drawRect(CK.XYWHRect(mx - (4 - r) * U, my + (r * 2 - 3) * U, (8 - r * 2) * U, 2 * U), p);
    }
  }
}

const fittedFonts = new Map();
const fitted = (px) => {
  if (!fittedFonts.has(px)) fittedFonts.set(px, fontOf(DIALOGUE, px));
  return fittedFonts.get(px);
};
const TONGUE = '\u{1F61B}';
/** 😛 as an 8×8 pixel face: yellow, two eyes, a grin and its tongue out. */
const TONGUE_FACE = ['..YYYY..', '.YYYYYY.', 'YYKYYKYY', 'YYYYYYYY', 'YKYYYYKY', 'YYKKKKYY', '.YYRRYY.', '...RR...'];
function drawTongue(canvas, x, y, cell) {
  const inks = { Y: paint('#FFC940'), K: paint('#2E1F14'), R: paint('#E0454F') };
  TONGUE_FACE.forEach((row, r) =>
    [...row].forEach(
      (c, k) => inks[c] && canvas.drawRect(CK.XYWHRect(x + k * cell, y + r * cell, cell, cell), inks[c]),
    ),
  );
}

// ---- the question menu (dialogue-box.tsx, asking): the speaker, then each choice with the heart cursor
function drawMenu(canvas, { speaker, options, pick, pressed }) {
  // four rows at most, as in the game (author, Oct 4, 2026; src/world/menu.ts)
  if (options.length > 4) throw new Error(`A menu has ${options.length} options; four at most`);
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
  // a choice too long for one line is set smaller to fit, as the phone's text shrinks to fit its row
  const room = (boxW - PT.frame * 2 - PT.padX * 2 - 24) * U;
  options.forEach((option, i) => {
    // a locked choice (`{ label, locked, icon }`): greyed out, with just its Path's icon where the heart
    // would be, as in the game (author, Oct 4, 2026: no padlock, no "(Mage Lv 10)")
    const locked = typeof option === 'object' ? option.locked : null;
    const icon = typeof option === 'object' ? option.icon : null;
    const label = typeof option === 'object' ? option.label : option;
    const on = pressed && i === pick;
    const base = ty + i * rowH * U + (rowH * 0.5 + PT.text * 0.36) * U;
    if (locked && icon) pathIcon(canvas, icon, tx + 1 * U, base - 12 * U, 2 * U, C.faint);
    else if (locked) padlock(canvas, tx + 1 * U, base - 12 * U, 2 * U, C.faint);
    else heart(canvas, tx + 1 * U, base - 11 * U, 2 * U, on ? C.accent : C.faint);
    // an open choice that belongs to a Path keeps its icon beside the heart
    const indent = icon && !locked ? 44 : 24;
    if (icon && !locked) pathIcon(canvas, icon, tx + 22 * U, base - 12 * U, 2 * U, C.accent);
    const fits = room - (indent - 24) * U;
    const wide = widthOf(TEXT_FONT, label);
    const font = wide <= fits ? TEXT_FONT : fitted(Math.floor((PT.text * U * fits) / wide));
    canvas.drawText(label, tx + indent * U, base, paint(on ? C.accent : locked ? C.faint : C.text), font);
  });
}

/** A pixel padlock, 7 × 7 cells of `cell` px, top-left at (x, y): a locked choice. */
const PADLOCK = ['..XXX..', '.X...X.', '.X...X.', 'XXXXXXX', 'XXX.XXX', 'XXX.XXX', 'XXXXXXX'];
function padlock(canvas, x, y, cell, hex) {
  const p = paint(hex);
  PADLOCK.forEach((row, r) =>
    [...row].forEach((c, k) => c === 'X' && canvas.drawRect(CK.XYWHRect(x + k * cell, y + r * cell, cell, cell), p)),
  );
}

/** Each Path's icon in pixels (7 × 7): the Warrior's sword, the Mage's book, the Bard's note. */
const PATH_ICONS = {
  physical: ['......X', '.....X.', '....X..', 'X..X...', '.XX....', '.XX....', 'X..X...'],
  intellectual: ['.......', '.XX.XX.', 'X..X..X', 'X..X..X', 'X..X..X', 'XXXXXXX', '.......'],
  social: ['...XXX.', '...X..X', '...X...', '...X...', '.XXX...', 'XXXX...', '.XX....'],
};
function pathIcon(canvas, path, x, y, cell, hex) {
  const p = paint(hex);
  (PATH_ICONS[path] ?? []).forEach((row, r) =>
    [...row].forEach((c, k) => c === 'X' && canvas.drawRect(CK.XYWHRect(x + k * cell, y + r * cell, cell, cell), p)),
  );
}

/** A pixel heart, 7 × 6 cells of `cell` px, top-left at (x, y). */
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function heart(canvas, x, y, cell, hex) {
  const p = paint(hex);
  HEART.forEach((row, r) =>
    [...row].forEach((c, k) => c === 'X' && canvas.drawRect(CK.XYWHRect(x + k * cell, y + r * cell, cell, cell), p)),
  );
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
    canvas.drawImageRectOptions(
      WALKERS,
      CK.XYWHRect(sx, sy + 15, FW, 8),
      CK.XYWHRect(left, floorY - 4, FW, 4),
      NEAREST.filter,
      NEAREST.mipmap,
      null,
    );
    canvas.drawImageRectOptions(
      WALKERS,
      CK.XYWHRect(sx, sy, FW, 15),
      CK.XYWHRect(left, floorY - 18 - lift, FW, 15),
      NEAREST.filter,
      NEAREST.mipmap,
      null,
    );
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
      [...row].forEach(
        (c, cx) => c === 'X' && canvas.drawRect(CK.XYWHRect(Math.round(x) + cx, Math.round(y) + r, 1, 1), p),
      ),
    );
  }
}

function drawOverlays(canvas, st) {
  if (st.line) drawBox(canvas, st.line);
  if (st.menu) drawMenu(canvas, st.menu);
}

// ---- a cocoon hatching, as the app's reveal and scripts/hatch-video.mjs play it: on the
// Path's realm, it wiggles, cracks, goes silent while an eye opens in the silk, then bursts
// Short, for a feed: two quick shakes, the eye, the burst, a moment on who it is, then back to the story.
const HATCH_AT = 2.2;
const HATCH_END = 4.2;
const HK = 4;
const HCX = 135;
const HBY = GROUND + 2;
const HWIGGLES = [0.3, 0.75];
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const realms = new Map();
const realmOf = (dimension) => {
  if (!realms.has(dimension)) realms.set(dimension, drawRealm(dimension));
  return realms.get(dimension);
};
const spriteSheets = new Map();
function drawBigSprite(g, id, frame, sc, cx, by) {
  if (!spriteSheets.has(id))
    spriteSheets.set(id, PNG.sync.read(readFileSync(join(ROOT, `assets/sprites/${id}/idle.png`))));
  const sheet = spriteSheets.get(id);
  const frames = Math.max(1, Math.round(sheet.width / (32 * 12)));
  for (let y = 0; y < 48 * sc; y++)
    for (let x = 0; x < 32 * sc; x++) {
      const i = (Math.floor(y / sc) * 12 * sheet.width + Math.floor(x / sc) * 12 + (frame % frames) * 32 * 12) * 4;
      if (sheet.data[i + 3] < 128) continue;
      put(g, cx - 16 * sc + x, by - 48 * sc + y, [sheet.data[i], sheet.data[i + 1], sheet.data[i + 2]]);
    }
}
const wiggleAt = (t, at) =>
  t >= at && t < at + 0.35 ? Math.round(Math.sin((t - at) * 40) * 5 * (1 - (t - at) / 0.35)) : 0;
function hatchCamera(t) {
  const mid = [HCX, HBY - COCOON_H / 2];
  let z = 1.5;
  let focus = mid;
  let shake = 0;
  let flash = 0;
  if (t < HATCH_AT) {
    // in on a white flash, already close
    if (t < 0.15) flash = 1 - t / 0.15;
    z = t < 0.15 ? lerpf(1.9, 1.5, easeOut(t / 0.15)) : 1.5;
    for (const w of HWIGGLES)
      if (t >= w && t < w + 0.3) {
        z += 0.08 * (1 - (t - w) / 0.3);
        shake = 2.5;
      }
    if (t >= 1.1 && t < 1.8) {
      // silence: the eye opens, the camera punches in on it
      focus = [HCX + EYE.dx, HBY + EYE.dy];
      z = lerpf(1.5, 3.2, easeOut((t - 1.1) / 0.12));
    }
    if (t >= 1.8) {
      z = lerpf(2.2, 1.45, easeOut((t - 1.8) / 0.2));
      shake = 3 + ((t - 1.8) / 0.4) * 5;
    }
  } else {
    const rt = t - HATCH_AT;
    z = rt < 0.2 ? lerpf(0.92, 1.0, easeOut(rt / 0.2)) : lerpf(1.0, 1.05, clamp01((rt - 0.2) / 1.8));
    focus = [HCX, HBY - 70];
    shake = rt < 0.5 ? 7 * (1 - rt / 0.5) : 0;
    flash = rt < 0.35 ? 1 - rt / 0.35 : 0;
    // back to the World on a white flash
    if (t > HATCH_END - 0.25) flash = (t - (HATCH_END - 0.25)) / 0.25;
  }
  const k = clamp01((z - 1) / 1.2);
  return { z, focus, anchor: [lerpf(focus[0], GW / 2, k), lerpf(focus[1], GH * 0.6, k)], shake, flash };
}
let hseed = 11;
const hrnd = () => (hseed = (hseed * 1103515245 + 12345) % 2147483648) / 2147483648;
const HATCH_PX = new Uint8Array(W * H * 4);
const HNAME = fontOf(JERSEY, 150);
/** A 3×5 pixel font, just enough for a laugh. */
const TINY = {
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  '!': ['X', 'X', 'X', '.', 'X'],
};
function tinyText(canvas, text, x, y, p) {
  let cx = Math.round(x);
  for (const ch of text) {
    const g = TINY[ch];
    g.forEach((row, r) =>
      [...row].forEach((c, k) => c === 'X' && canvas.drawRect(CK.XYWHRect(cx + k, Math.round(y) + r, 1, 1), p)),
    );
    cx += g[0].length + 1;
  }
}

/** One hatch frame as raw RGBA (1080×1920), name card included. */
function hatchFrame(canvas, h) {
  const { t } = h;
  hseed = 11 + Math.floor(t * FPS);
  const realm = realmOf(h.dimension);
  // the build-up is the cocoon alone in the dark (as in the game); the realm appears with the burst
  const scene = t < HATCH_AT ? realm.base.map((r) => r.map(() => [5, 3, 10])) : realm.base.map((r) => r.slice());
  if (t >= HATCH_AT)
    realm.lights.forEach(([x, y, c], n) => {
      if (Math.sin(t * 3 + n * 1.7) > 0.2) {
        const col = hex(c);
        put(scene, x, y, mixRgb(col, [255, 255, 255], 0.6));
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          put(scene, x + dx, y + dy, col);
      }
    });
  if (t < HATCH_AT) {
    let shear = 0;
    let lift = 0;
    let cracks = 0;
    let glow = 0;
    let eye = 0;
    if (t < 1.1) {
      // two quick shakes, a crack with each
      for (const w of HWIGGLES) shear += wiggleAt(t, w);
      cracks = t >= HWIGGLES[1] ? 0.35 : t >= HWIGGLES[0] ? 0.15 : 0;
      glow = t >= HWIGGLES[1] ? 0.25 : 0;
    } else if (t < 1.8) {
      cracks = 0.45;
      glow = 0.4;
      const et = t - 1.1;
      eye = clamp01(et / 0.2);
      if (et > 0.4 && et < 0.52) eye = Math.abs(et - 0.46) / 0.06;
    } else {
      const k = (t - 1.8) / 0.4;
      shear = Math.round(Math.sin(t * 60) * (4 + k * 5));
      lift = Math.round(Math.abs(Math.sin(t * 34)) * k * 3);
      cracks = lerpf(0.45, 1, k);
      glow = 0.5 + k * 0.5;
      eye = 1;
    }
    const jitter = t >= 1.8 ? Math.round((hrnd() - 0.5) * 4) : 0;
    drawCocoon(scene, HCX + jitter, HBY, { shear, lift, cracks, glow, eye, iris: h.color, rnd: hrnd });
  } else {
    const rt = t - HATCH_AT;
    // a character with their own reveal move (src/components/reveal-move.tsx) does it; Felix laughs
    let mx = 0;
    let my = 0;
    const s = rt % 3;
    if (h.move === 'laugh' && s < 1.6) {
      const beat = Math.floor(s * 12);
      mx = beat % 2 === 1 ? 3 : -3;
      my = beat % 3 === 0 ? -6 : 0;
    }
    drawBigSprite(scene, h.character, h.move ? 0 : Math.floor(rt * 3), 3, HCX + mx, HBY + my);
    let sseed = 5;
    const srnd = () => (sseed = (sseed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 120; i++) {
      const sx = HCX + (srnd() - 0.5) * 50;
      const sy = HBY - 10 - srnd() * 90;
      const vx = (srnd() - 0.5) * 5;
      const vy = -2 - srnd() * 4;
      const c = srnd() > 0.5 ? hex('#EDE6D6') : hex('#C9BFAE');
      if (rt < 1.5) box(scene, sx + vx * rt * 34, sy + vy * rt * 34 + 70 * rt * rt, 2, 2, c);
    }
  }
  // the camera: sample the 270×480 scene through the zoom, at 4px a pixel
  const cam = hatchCamera(t);
  const sx0 = cam.shake ? (hrnd() - 0.5) * 2 * cam.shake : 0;
  const sy0 = cam.shake ? (hrnd() - 0.5) * 2 * cam.shake : 0;
  const colX = new Int32Array(W);
  for (let X = 0; X < W; X++)
    colX[X] = Math.min(GW - 1, Math.max(0, Math.floor(cam.focus[0] + (X / HK - cam.anchor[0]) / cam.z + sx0)));
  for (let Y = 0; Y < H; Y++) {
    const srow =
      scene[Math.min(GH - 1, Math.max(0, Math.floor(cam.focus[1] + (Y / HK - cam.anchor[1]) / cam.z + sy0)))];
    for (let X = 0; X < W; X++) {
      const c = srow[colX[X]];
      const i = (Y * W + X) * 4;
      HATCH_PX[i] = c[0] + (255 - c[0]) * cam.flash;
      HATCH_PX[i + 1] = c[1] + (255 - c[1]) * cam.flash;
      HATCH_PX[i + 2] = c[2] + (255 - c[2]) * cam.flash;
      HATCH_PX[i + 3] = 255;
    }
  }
  // the name card is drawn with Skia on a clear canvas and laid over these pixels (no Skia image
  // of the scene: thousands of 8MB images corrupt CanvasKit's memory in a long render)
  canvas.clear(CK.TRANSPARENT);
  // who it is, in the game's fonts: name, stars, Path and number, typed on after the burst
  if (t >= HATCH_AT && t < HATCH_END - 0.3) {
    const rt = t - HATCH_AT;
    centred(canvas, h.name, 330, HNAME, h.color, Math.floor(rt / 0.04));
    if (rt > 0.2) pixelStars(canvas, h.rarity, 384);
    if (rt > 0.35) centred(canvas, h.subtitle, 500, CARD_SMALL, '#FFFFFF', Math.floor((rt - 0.35) / 0.015));
    if (rt > 0.6) centred(canvas, h.number, 570, CARD_SMALL, '#D8D2E6', Math.floor((rt - 0.6) / 0.05));
    if (h.move === 'laugh') {
      const s = rt % 3;
      for (let k = 0; k < 3; k++) {
        const age = s - k * 0.4;
        if (age < 0 || age > 0.9) continue;
        // above his head (the sprite's top), through the camera
        const sx = HCX + (k % 2 === 1 ? 30 : -46);
        const sy = HBY - 150 - age * 12;
        const X = HK * ((sx - cam.focus[0]) * cam.z + cam.anchor[0]);
        const Y = HK * ((sy - cam.focus[1]) * cam.z + cam.anchor[1]);
        canvas.drawText('HA', X, Y, paint('#FFF4C0', 1 - age / 0.9), CARD_MID);
      }
    }
  }
  const text = canvas.readPixels(0, 0, {
    width: W,
    height: H,
    colorType: CK.ColorType.RGBA_8888,
    alphaType: CK.AlphaType.Unpremul,
    colorSpace: CK.ColorSpace.SRGB,
  });
  for (let i = 0; i < text.length; i += 4) {
    const a = text[i + 3];
    if (a === 0) continue;
    const k = a / 255;
    for (let c = 0; c < 3; c++) HATCH_PX[i + c] = Math.round(HATCH_PX[i + c] * (1 - k) + text[i + c] * k);
  }
  return HATCH_PX;
}

/** Rarity stars as the hatch draws them: a 9×9 pixel star each, 8px a pixel, centred. */
const STAR = [
  '....X....',
  '....X....',
  '...XXX...',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '..XX.XX..',
  '.XX...XX.',
  '.X.....X.',
];
function pixelStars(canvas, n, y) {
  const p = paint('#FFFFFF');
  for (let s = 0; s < n; s++) {
    const x0 = Math.round(W / 2 + (s - (n - 1) / 2) * 104 - 36);
    STAR.forEach((row, r) =>
      [...row].forEach((c, k) => c === 'X' && canvas.drawRect(CK.XYWHRect(x0 + k * 8, y + r * 8, 8, 8), p)),
    );
  }
}

/** A cocoon after it's hatched: the silk split open and slumped on the ground. */
function drawSplitCocoon(canvas, x, y) {
  const silk = paint('#EDE6D6');
  const shade = paint('#C9BFAE');
  const deep = paint('#A69C8C');
  canvas.drawRect(CK.XYWHRect(x + 2, y + 12, 12, 3), deep);
  canvas.drawRect(CK.XYWHRect(x + 2, y + 6, 4, 7), silk);
  canvas.drawRect(CK.XYWHRect(x + 3, y + 4, 2, 3), shade);
  canvas.drawRect(CK.XYWHRect(x + 10, y + 7, 4, 6), silk);
  canvas.drawRect(CK.XYWHRect(x + 11, y + 5, 2, 3), shade);
  canvas.drawRect(CK.XYWHRect(x + 6, y + 11, 4, 2), shade);
}

// ---- the script: walk, face, say, narrate, wait; compiled into timed segments
const center = (tx, ty) => [tx * TILE + TILE / 2, ty * TILE + TILE - 2];
const HOLD = (text) => Math.min(2.6, 1.1 + text.length * 0.022);
/** After the fall's impact: the shake, the bounce and the flop, before anyone speaks. */
const FALL_SETTLE = 0.45;
/** A change of place: half of it fading out, half fading in. */
const SCENE_GAP = 1.0;
/** Pushing a boulder: leaning on it (engine.ts PUSH_DELAY), then the slide. */
const PUSH_LEAN = 0.35;
const PUSH_TIME = 0.3;
function compile(ep) {
  const segs = [];
  let t = ep.titleDur;
  let pos = center(...ep.hero.at);
  let facing = ep.hero.facing;
  let map = ep.map;
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
        // `look`: keep facing one way while moving (pushed back, say)
        const dir =
          step.look ?? (Math.abs(bx - ax) > Math.abs(by - ay) ? (bx > ax ? 'right' : 'left') : by > ay ? 'down' : 'up');
        legs.push({ a: [ax, ay], b: [bx, by], d0: dist, len, dir });
        dist += len;
      }
      const speed = step.speed ?? ep.speed ?? SPEED;
      const dur = dist / speed;
      segs.push({ kind: 'walk', t0: t, t1: t + dur, legs, dist, speed });
      // `cut`: the episode ends this many seconds into the walk, mid-stride
      t += step.cut ?? dur;
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
      const npc = map.npcs[step.npcWalk];
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
      segs.push({
        kind: 'npcWalk',
        t0: t,
        t1: t + dur,
        id: step.npcWalk,
        legs,
        dist,
        speed,
        hide: step.hide,
        tears: step.tears,
        dash: step.dash,
      });
      if (!step.together) t += dur + 0.15;
    } else if (step.laugh) {
      // someone laughs: shoulders shaking, a burst of HA over their head (`quiet`: just the shaking, a cower)
      segs.push({ kind: 'laugh', t0: t, t1: t + step.dur, id: step.laugh, quiet: step.quiet });
      // `together`: the next one laughs at the same time
      if (!step.together) t += step.dur;
    } else if (step.scene) {
      // somewhere else: fade to black, and up again there (a new map, you standing at `at`)
      const sc = step.scene;
      // `gap`: how long the cut takes (the template cuts quicker than the old episodes' second)
      const gap = sc.gap ?? SCENE_GAP;
      segs.push({ kind: 'scene', t0: t, t1: t + gap, ...sc, gap, at: center(...sc.at) });
      map = sc.map;
      pos = center(...sc.at);
      facing = sc.facing;
      t += gap + 0.1;
    } else if (step.push) {
      // lean on the boulder in front a moment, then shove it a tile, stepping in behind it
      const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[step.push];
      const tx = Math.floor(pos[0] / TILE);
      const ty = Math.floor(pos[1] / TILE);
      const next = [pos[0] + dx * TILE, pos[1] + dy * TILE];
      segs.push({ kind: 'face', t0: t, t1: t, dir: step.push });
      t += PUSH_LEAN;
      segs.push({
        kind: 'walk',
        t0: t,
        t1: t + PUSH_TIME,
        speed: TILE / PUSH_TIME,
        dist: TILE,
        legs: [{ a: pos, b: next, d0: 0, len: TILE, dir: step.push }],
      });
      segs.push({ kind: 'push', t0: t, t1: t + PUSH_TIME, from: [tx + dx, ty + dy], dx, dy });
      pos = next;
      facing = step.push;
      t += PUSH_TIME + 0.15;
    } else if (step.cards) {
      // `under`: the cards keep going under whatever's said next, until a `cardsEnd`
      segs.push({ kind: 'cards', t0: t, t1: t + (step.under ? 9999 : step.cards) });
      if (!step.under) t += step.cards;
    } else if (step.cardsEnd) {
      const game = segs.findLast((x) => x.kind === 'cards');
      game.t1 = t + 0.6;
      t += 0.75;
    } else if (step.say || step.narrate || step.you) {
      const npc = step.say ? map.npcs[step.say] : null;
      const speaker = step.you ? 'You' : npc ? npc.name : undefined;
      const sprite = step.you ? ep.hero.sprite : npc ? npc.sprite : undefined;
      const voice = step.you ? 3 : voiceFor(speaker, sprite);
      // the person turns to face you, as in the game
      if (npc) {
        const [nx, ny] = center(npc.x, npc.y);
        const dx = pos[0] - nx;
        const dy = pos[1] - ny;
        // a diagonal turns them sideways, so they face you rather than show their back
        const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        segs.push({ kind: 'npcFace', t0: t, t1: t, id: step.say, dir });
      }
      const lines = step.you ?? step.lines ?? (npc ? npc.lines : []);
      lines.forEach((text, i) => {
        const at = letterTimes(text, ep.letterMs, ep.pause);
        const typing = at[at.length - 1] + 0.03;
        const blips = speaker
          ? at.map((a, k) => (text[k].trim() && k % 2 === 0 ? a : null)).filter((a) => a !== null)
          : [];
        // `hold`: how long a finished line stays, against the usual (a talky episode reads a touch quicker)
        // `punch`: the last line of a beat (the punchline) stays this long instead, so it lands
        const dur = typing + (i === lines.length - 1 && step.punch ? step.punch : HOLD(text) * (ep.hold ?? 1));
        segs.push({
          kind: 'line',
          t0: t,
          t1: t + dur,
          speaker,
          sprite,
          text,
          at,
          typing,
          blips,
          voice,
          last: i === lines.length - 1,
        });
        t += dur;
      });
      t += step.gapAfter ?? ep.gapAfter ?? 0.25;
    } else if (step.fall) {
      // dropping in from above the screen onto where you stand: a shadow grows, you slam down, bounce, and end up
      // upside down, seeing stars, until an `upright`
      segs.push({ kind: 'fall', t0: t, t1: t + step.fall, height: step.height ?? 170, flop: step.flop });
      t += step.fall + FALL_SETTLE;
    } else if ('look' in step) {
      // a cut to someone else (the camera on that tile), or back to you (null)
      segs.push({ kind: 'look', t0: t, t1: t, at: step.look && center(...step.look) });
    } else if (step.upright) {
      segs.push({ kind: 'upright', t0: t, t1: t });
      t += 0.2;
    } else if (step.drop) {
      // the floor gives way: you sink out of sight into a hole (the Maze Ward's pothole); `together` with what's said
      segs.push({ kind: 'drop', t0: t, t1: t + step.drop });
      if (!step.together) t += step.drop;
    } else if (step.zoom) {
      // a cut to closer in (or back out, 1): the template's hook opens close on whoever's talking
      segs.push({ kind: 'zoom', t0: t, t1: t, z: step.zoom });
    } else if (step.hatch) {
      // the app's hatch, full screen (scripts/hatch-video.mjs beats), then back to the World
      segs.push({ kind: 'hatch', t0: t, t1: t + HATCH_END, ...step.hatch });
      t += HATCH_END;
    } else if (step.show) {
      segs.push({ kind: 'show', t0: t, t1: t, id: step.show });
    } else if (step.open) {
      segs.push({ kind: 'open', t0: t, t1: t, at: step.open });
    } else if (step.gap) {
      segs.push({ kind: 'gap', t0: t, t1: t, at: step.gap });
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
  let map = ep.map;
  let hide = ep.hide ?? [];
  let twinkles = ep.twinkles ?? [];
  let blackout = 0;
  let white = false;
  /** Boulders where they are now, in tiles (fractions while sliding). */
  let boulders = (map.boulders ?? []).map((b) => [...b]);
  let npcFacing = Object.fromEntries(Object.entries(map.npcs).map(([id, n]) => [id, n.facing ?? 'down']));
  let line = null;
  let menu = null;
  let cards = null;
  /** Where people have walked to, by id: { x, y, dir, frame, gone, tears, dash }. */
  let npcAt = {};
  /** Who's laughing, by id: seconds into it; and who's only shaking (a cower), no HA. */
  let laughing = {};
  const quiet = new Set();
  let hatch = null;
  /** People hidden at the start who have since appeared (someone hatched), and cocoons broken open. */
  let shown = [...(ep.shown ?? [])];
  let opened = [];
  /** Tiles broken open (bars bent wide), drawn as the game's dark gap. */
  let gaps = [...(ep.gaps ?? [])];
  let zoom = ep.zoom ?? 1;
  /** How far you've sunk through the floor (0 to 1), and the hole you went down. */
  let sink = 0;
  let hole = null;
  /** The fall: how high above the floor you are (art px), the squash on impact, upside down, the shake. */
  let air = 0;
  let squash = 0;
  let flipped = false;
  let flippedAt = 0;
  let shake = 0;
  /** Where the camera is looking instead of at you (a cut to someone else), in art px. */
  let look = null;
  for (const s of compiled.segs) {
    if (s.t0 > t) break;
    if (s.kind === 'scene') {
      const half = s.gap / 2;
      white = !!s.flash;
      if (t < s.t0 + half) {
        blackout = (t - s.t0) / half;
        continue;
      }
      blackout = Math.max(0, 1 - (t - s.t0 - half) / half);
      map = s.map;
      [hx, hy] = s.at;
      facing = s.facing;
      walked = 0;
      moving = false;
      hide = s.hide ?? [];
      twinkles = s.twinkles ?? [];
      boulders = (map.boulders ?? []).map((b) => [...b]);
      npcFacing = Object.fromEntries(Object.entries(map.npcs).map(([id, n]) => [id, n.facing ?? 'down']));
      npcAt = {};
      laughing = {};
      shown = [...(s.show ?? [])];
      opened = [];
      line = null;
      menu = null;
      sink = 0;
      hole = null;
      // `airborne`: you arrive still above the screen, for a `fall` to bring you down
      air = s.airborne ? 400 : 0;
      squash = 0;
      flipped = false;
      shake = 0;
      look = null;
      continue;
    }
    if (s.kind === 'push') {
      const k = Math.min(1, (t - s.t0) / (s.t1 - s.t0));
      // (every earlier push has finished, so the one being shoved sits squarely on its tile)
      const b = boulders.find((p) => p[0] === s.from[0] && p[1] === s.from[1]);
      if (b) {
        b[0] = s.from[0] + s.dx * k;
        b[1] = s.from[1] + s.dy * k;
      }
      continue;
    }
    if (s.kind === 'walk') {
      const d = Math.min(s.dist, (t - s.t0) * (s.speed ?? SPEED));
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
        dash: s.dash && !done ? { from: s.legs[0].a, since: t - s.t0, dir: leg.dir } : null,
      };
    } else if (s.kind === 'laugh' && t < s.t1) {
      laughing[s.id] = t - s.t0;
      if (s.quiet) quiet.add(s.id);
    } else if (s.kind === 'line' && t < s.t1) {
      const lt = t - s.t0;
      const shown = s.at.filter((a) => a <= lt).length;
      const blipsSoFar = s.blips.filter((a) => a <= lt).length;
      line = { ...s, shown, typed: lt >= s.typing, lift: blipsSoFar % 2 === 1 };
    } else if (s.kind === 'menu' && t < s.t1) menu = { ...s, pressed: t >= s.pressAt };
    else if (s.kind === 'cards' && t < s.t1 + 0.4) cards = { t: t - s.t0, dur: s.t1 - s.t0 };
    else if (s.kind === 'hatch' && t < s.t1) hatch = { ...s, t: t - s.t0 };
    else if (s.kind === 'show') shown.push(s.id);
    else if (s.kind === 'open') opened.push(s.at);
    else if (s.kind === 'gap') gaps.push(s.at);
    else if (s.kind === 'zoom') zoom = s.z;
    else if (s.kind === 'fall') {
      if (t < s.t1) {
        const k = (t - s.t0) / (s.t1 - s.t0);
        air = s.height * (1 - k * k);
      } else {
        const since = t - s.t1;
        // `flop`: a bounce off the flagstones, over in mid-air, butt up; otherwise feet first, a squash and you're up
        air = s.flop && since < 0.28 ? Math.sin((Math.PI * since) / 0.28) * 7 : 0;
        squash = since < 0.07 ? (s.flop ? 0.45 : 0.3) : s.flop && since >= 0.28 && since < 0.33 ? 0.25 : 0;
        shake = since < 0.25 ? (s.flop ? 3 : 2) * (1 - since / 0.25) : 0;
        flipped = !!s.flop && since >= 0.14;
        flippedAt = s.t1 + 0.14;
      }
    } else if (s.kind === 'upright') flipped = false;
    else if (s.kind === 'look') look = s.at;
    else if (s.kind === 'drop') {
      sink = Math.min(1, (t - s.t0) / (s.t1 - s.t0));
      hole = [hx, hy];
    }
  }
  return {
    zoom,
    air,
    squash,
    flipped,
    flippedFor: t - flippedAt,
    look,
    shake,
    sink,
    hole,
    hx,
    hy,
    facing,
    walked,
    moving,
    npcFacing,
    npcAt,
    laughing,
    quiet,
    line,
    menu,
    cards,
    hatch,
    shown,
    opened,
    gaps,
    map,
    hide,
    twinkles,
    boulders,
    blackout,
    white,
  };
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
  const map = st.map ?? ep.map;
  const mapW = map.image.width();
  const mapH = map.image.height();
  // the camera follows you; for the card game it eases in close on the two of you, and back out
  const zk = st.cards ? zoomIn(st.cards.t, st.cards.dur) : 0;
  const z = (st.zoom ?? 1) + zk;
  const sk = K * z;
  const vw = W / sk;
  const vh = H / sk;
  const [ax, ay] = st.look ?? [st.hx, st.hy];
  const fx = st.cards ? lerpf(st.hx, cardsMid(ep, st)[0], zk) : ax;
  const fy = st.cards ? lerpf(st.hy - 12, cardsMid(ep, st)[1] - 10, zk) : ay - 12;
  const camX = mapW <= vw ? (mapW - vw) / 2 : Math.min(Math.max(fx - vw / 2, 0), mapW - vw);
  // the action sits a third of the way down, so the text box (raised clear of app captions) never covers it
  // (it may look past the map's bottom edge: that strip sits behind the box and the apps' captions anyway)
  const below = (H - (H - PT.bottom * U - 260)) / sk;
  const camY = Math.min(Math.max(fy - vh * 0.34, Math.min(0, mapH - vh)), Math.max(0, mapH - vh) + below);
  canvas.clear(color('#0C0806'));
  canvas.save();
  canvas.scale(sk, sk);
  const shook = st.shake ? [Math.sin(t * 90) * st.shake, Math.cos(t * 77) * st.shake] : [0, 0];
  canvas.translate(-Math.round((camX + shook[0]) * sk) / sk, -Math.round((camY + shook[1]) * sk) / sk);
  canvas.drawImageRectOptions(
    map.image,
    CK.XYWHRect(0, 0, mapW, mapH),
    CK.XYWHRect(0, 0, mapW, mapH),
    NEAREST.filter,
    NEAREST.mipmap,
    null,
  );
  // flames (world-view.tsx flameLit / flameCore)
  const lit = paint('#FFB04A');
  const core = paint('#FFF4C0');
  map.flames.forEach(([x, y], i) => {
    const k = Math.floor(t * 9 + i * 3.7);
    const lean = k % 3 === 0 ? -1 : k % 5 === 0 ? 1 : 0;
    canvas.drawRect(CK.XYWHRect(x + lean, y - (k % 2), 2, 2 + (k % 2)), lit);
    if (Math.floor(t * 7 + i) % 4 !== 0) canvas.drawRect(CK.XYWHRect(x, y + 1, 1, 1), core);
  });
  // bars bent wide, a wall broken through: a dark gap with rubble at its foot, as the game draws it
  for (const [gx, gy] of st.gaps ?? []) {
    canvas.drawRect(CK.XYWHRect(gx * TILE + 1, gy * TILE + 1, TILE - 2, TILE - 1), paint('#0C0908'));
    canvas.drawRect(CK.XYWHRect(gx * TILE + 2, gy * TILE + TILE - 2, 3, 2), paint('#5A524C'));
    canvas.drawRect(CK.XYWHRect(gx * TILE + 10, gy * TILE + TILE - 3, 4, 3), paint('#5A524C'));
  }
  // a cocoon broken open: the grass from the tile beside it laid over, and the split silk on top
  for (const {
    at: [cx, cy],
    grass: [gx, gy],
  } of st.opened) {
    // (the cocoon stands a few pixels taller than its tile, so the grass reaches up into the one above)
    canvas.drawImageRectOptions(
      map.image,
      CK.XYWHRect(gx * TILE, gy * TILE - 4, TILE, TILE + 4),
      CK.XYWHRect(cx * TILE, cy * TILE - 4, TILE, TILE + 4),
      NEAREST.filter,
      NEAREST.mipmap,
      null,
    );
    drawSplitCocoon(canvas, cx * TILE, cy * TILE);
  }
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
  // boulders (world-view.tsx Boulder): three ovals, dark under light
  for (const [bx, by] of st.boulders ?? []) {
    const x = bx * TILE;
    const y = by * TILE;
    const oval = (ox, oy, w, h, hexc) => canvas.drawOval(CK.XYWHRect(x + ox, y + oy, w, h), paint(hexc));
    oval(1, 4, 14, 12, '#2E2A28');
    oval(1, 2, 13, 11, '#4A4440');
    oval(3, 4, 5, 3, '#625A54');
  }
  // something hidden that you're strong enough to notice: a four-point star, swelling and gone (world-view.tsx)
  (st.twinkles ?? []).forEach(([tx, ty], i) => {
    const phase = (t * 0.8 + i * 0.37) % 1;
    const r = Math.round(Math.sin(Math.min(phase / 0.35, 1) * Math.PI) * 4);
    if (r <= 0) return;
    const cx = tx * TILE + 9;
    const cy = ty * TILE + 6;
    const star = paint('#FFF7DC');
    canvas.drawRect(CK.XYWHRect(cx - r, cy, r * 2 + 1, 1), star);
    canvas.drawRect(CK.XYWHRect(cx, cy - r, 1, r * 2 + 1), star);
    if (r > 2) canvas.drawRect(CK.XYWHRect(cx - 1, cy - 1, 3, 3), star);
  });
  // everyone, back to front by their feet; while you play cards, you and the Keeper sit on the floor
  const sitting = st.cards ? ['keeper'] : [];
  const ents = Object.values(map.npcs)
    // someone who only comes later in the story (comesAfter: Felix, once his cocoon breaks) isn't here yet
    .filter(
      (n) =>
        ((!(st.hide ?? ep.hide)?.includes(n.id) && !n.comesAfter) || st.shown.includes(n.id)) &&
        !sitting.includes(n.id) &&
        !st.npcAt[n.id]?.gone,
    )
    .map((n) => {
      const at = st.npcAt[n.id];
      const lt = st.laughing[n.id];
      if (at && lt === undefined) return [WALKER_ROWS[n.sprite], DIRS[at.dir], at.frame, at.x, at.y];
      const [x, y] = at ? [at.x, at.y] : center(n.x, n.y);
      // laughing: a quick shake and a hop, head thrown back on every other beat
      if (lt !== undefined) {
        const beat = Math.floor(lt * 12);
        return [
          WALKER_ROWS[n.sprite],
          DIRS[st.npcFacing[n.id]],
          0,
          x + (beat % 2 ? 1 : -1),
          y - (beat % 3 === 0 ? 2 : 0),
        ];
      }
      return [WALKER_ROWS[n.sprite], DIRS[st.npcFacing[n.id]], 0, x, y];
    });
  // the hole you went down: dark, with a lip of broken flagstone
  if (st.hole) {
    const [hx0, hy0] = st.hole;
    canvas.drawRect(CK.XYWHRect(Math.round(hx0 - 6), Math.round(hy0 - 3), 12, 5), paint('#06040A'));
    canvas.drawRect(CK.XYWHRect(Math.round(hx0 - 7), Math.round(hy0 - 4), 14, 1), paint('#5A524C'));
  }
  if (!st.cards && st.sink < 1)
    ents.push([
      WALKER_ROWS[ep.hero.sprite],
      DIRS[st.facing],
      walkFrame(st.walked, st.moving),
      st.hx,
      st.hy,
      st.sink,
      { air: st.air, squash: st.squash, flipped: st.flipped },
    ]);
  // where you're about to land: a shadow, bigger the closer you get
  if (st.air > 0) {
    const r = Math.max(2, 6 - st.air / 40);
    canvas.drawOval(CK.XYWHRect(st.hx - r, st.hy - r / 3, r * 2, (r * 2) / 3), paint('#000000', 0.45));
  }
  ents.sort((a, b) => a[4] - b[4]);
  for (const [row, dir, frame, x, y, sunk = 0, fx = {}] of ents) {
    // sinking: lower and lower, cut off at the floor
    const cut = Math.round(sunk * FH);
    const lift = Math.round(fx.air ?? 0);
    canvas.save();
    // squashed flat on impact (from the feet), and upside down from the middle
    if (fx.squash) {
      canvas.translate(x, y + 2 - lift);
      canvas.scale(1 + fx.squash * 0.6, 1 - fx.squash);
      canvas.translate(-x, -(y + 2 - lift));
    }
    if (fx.flipped) {
      const mid = y - FEET + FH / 2 - lift;
      canvas.translate(0, mid);
      canvas.scale(1, -1);
      canvas.translate(0, -mid);
    }
    canvas.drawImageRectOptions(
      WALKERS,
      CK.XYWHRect((dir * 3 + frame) * FW, row * FH, FW, FH - cut),
      CK.XYWHRect(Math.round(x - FW / 2), Math.round(y - FEET) + cut - lift, FW, FH - cut),
      NEAREST.filter,
      NEAREST.mipmap,
      null,
    );
    canvas.restore();
  }
  // seeing stars: three little ones circling the head (at the bottom, upside down)
  if (st.flipped && !st.air) {
    const star = paint('#FFE070');
    for (let i = 0; i < 3; i++) {
      const a = st.flippedFor * 7 + (i * Math.PI * 2) / 3;
      const sx = Math.round(st.hx + Math.cos(a) * 8);
      const sy = Math.round(st.hy + 3 + Math.sin(a) * 2.5);
      canvas.drawRect(CK.XYWHRect(sx, sy - 1, 1, 3), star);
      canvas.drawRect(CK.XYWHRect(sx - 1, sy, 3, 1), star);
    }
  }
  if (st.cards) drawCardsOnFloor(canvas, ep, st);
  // HA! HA! popping out over a laughing head, rising and fading
  for (const [id, lt] of Object.entries(st.laughing)) {
    if (st.quiet?.has(id)) continue;
    const [x, y] = st.npcAt[id] ? [st.npcAt[id].x, st.npcAt[id].y] : center(map.npcs[id].x, map.npcs[id].y);
    for (let k = 0; k < 3; k++) {
      const age = lt - k * 0.35;
      if (age < 0 || age > 0.9) continue;
      const side = k % 2 ? 6 : -10;
      tinyText(canvas, 'HA', x + side, y - 30 - age * 10, paint('#FFF4C0', 1 - age / 0.9));
    }
  }
  // a dash: a puff of dust where they set off, and speed streaks behind them
  for (const at of Object.values(st.npcAt)) {
    if (!at.dash || at.gone) continue;
    const { from, since, dir } = at.dash;
    if (since < 0.35) {
      const puff = paint('#D8D0C0', 1 - since / 0.35);
      for (const [dx, dy] of [
        [-4, -2],
        [3, -3],
        [-1, -6],
        [5, 0],
        [-6, 1],
      ])
        canvas.drawRect(CK.XYWHRect(from[0] + dx * (1 + since * 4), from[1] + dy * (1 + since * 2) - 2, 2, 2), puff);
    }
    const back = dir === 'right' ? -1 : dir === 'left' ? 1 : 0;
    const up = dir === 'down' ? -1 : dir === 'up' ? 1 : 0;
    const streak = paint('#FFFFFF', 0.7);
    for (const [len, oy] of [
      [18, -14],
      [26, -9],
      [14, -4],
    ]) {
      if (back) canvas.drawRect(CK.XYWHRect(back < 0 ? at.x - 6 - len : at.x + 6, at.y + oy, len, 1), streak);
      else canvas.drawRect(CK.XYWHRect(at.x + oy / 2 + 4, up < 0 ? at.y - 24 - len : at.y + 2, 1, len), streak);
    }
  }
  // tears, flung back off a crying face as they run
  for (const [id, at] of Object.entries(st.npcAt)) {
    if (!at.tears || at.gone) continue;
    const back = at.dir === 'left' ? 1 : at.dir === 'right' ? -1 : 0;
    const tear = paint('#7FC8FF');
    for (let i = 0; i < 3; i++) {
      const k = (t * 3 + i / 3) % 1;
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
      const shader = CK.Shader.MakeRadialGradient(
        [cx, cy],
        r,
        stops.map((s) => color('#000000', s)),
        null,
        CK.TileMode.Clamp,
      );
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
  canvas.drawImageRectOptions(
    tape,
    CK.XYWHRect(0, 0, VW, VH),
    CK.XYWHRect(0, 0, W, H),
    CK.FilterMode.Linear,
    CK.MipmapMode.None,
    null,
  );
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
    {
      width: VW,
      height: VH,
      alphaType: CK.AlphaType.Premul,
      colorType: CK.ColorType.RGBA_8888,
      colorSpace: CK.ColorSpace.SRGB,
    },
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
  wrap(CARD_BIG, ep.next ?? 'CONTINUED', W - 320).forEach((line, i) =>
    centred(canvas, line, 460 + i * 120, CARD_BIG, C.card, type(0.4)),
  );
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
/** The heroes who can be out exploring the Archive hall: kept out of the episodes' Archive. */
/**
 * A question menu as the game shows it (src/world/menu.ts, author, Oct 4, 2026): four rows at most, the
 * questions you haven't asked yet first, the mean one (`deed: 'bad'`) always keeping its row, then Goodbye.
 */
const menuOf = (questions, asked) => {
  const mean = questions.find((q) => q.deed === 'bad');
  const rest = questions.filter((q) => q !== mean);
  const order = [...rest.filter((q) => !asked.includes(q.ask)), ...rest.filter((q) => asked.includes(q.ask))];
  return [...order.slice(0, mean ? 2 : 3), ...(mean ? [mean] : [])].map((q) => q.ask).concat('Goodbye.');
};

const HALL = ['brannoc', 'ysolde', 'quill', 'wren', 'oren', 'pip', 'tamsin', 'moss'].map((id) => `hall-${id}`);

/**
 * The short-form template (EPISODES.md, measured from Episode 10): text at 20 ms a letter with half the
 * punctuation pauses, setups gone almost as soon as they're typed, a quick walk, no title card, no end card.
 */
const SHORT = { letterMs: 20, pause: 0.5, hold: 0.3, gapAfter: 0.12, speed: 190, titleDur: 0, endDur: 0 };

/**
 * The pothole's landing (src/world/dungeon.ts POTHOLE_LANDING), read from the game so the episode says the same:
 * what each of them says, by name ("OLD MOTT: Nice trip." → { 'OLD MOTT': ['Nice trip.'] }).
 */
const POTHOLE_LANDING = () => {
  const src = readFileSync(join(ROOT, 'src/world/dungeon.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const POTHOLE_LANDING'));
  const lines = [...block.slice(0, block.indexOf('];')).matchAll(/^\s+(['"])(.*)\1,$/gm)].map((m) =>
    m[2].replace(/\\'/g, "'"),
  );
  const said = {};
  for (const l of lines) {
    const m = l.match(/^([A-Z][A-Z ]+): (.+)$/);
    if (m) (said[m[1]] ??= []).push(m[2]);
  }
  return said;
};

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
        {
          walk: [
            [14, 5],
            [14, 4],
          ],
          face: 'right',
        },
        { say: 'keeper', lines: ["Ah, you're on your feet. I'm so glad to finally see you again."] },
        { menu: { speaker: 'The Keeper', options: ['Again?', '...'], pick: 0, hold: 1.0 } },
        { say: 'keeper', lines: ["...You don't remember, do you.", 'Oh dear. Where do I begin?'] },
        ask(0),
        {
          say: 'keeper',
          lines: [
            "You're in a pocket dimension. I've been keeping you company for the past five hundred years.",
            "It's a long story.",
          ],
        },
        ask(1),
        { say: 'keeper', lines: ["Let's just say I'm an old friend."] },
        ask(2),
        {
          say: 'keeper',
          lines: [
            "I know more than I'm saying. I won't pretend I don't.",
            "But who you were is yours to find. I think you'd rather remember it than be told.",
          ],
        },
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
        {
          walk: [
            [14, 11],
            [13, 11],
            [13, 12],
          ],
          face: 'down',
        },
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
        {
          walk: [
            [12, 9],
            [10, 9],
            [10, 10],
          ],
          face: 'left',
        },
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
        {
          npcWalk: 'nib',
          to: [
            [9, 9],
            [9, 8],
            [-2, 8],
          ],
          speed: 105,
          hide: true,
          tears: true,
        },
        { wait: 0.4 },
        // the episode ends as you reach the cocoon in the long grass
        {
          walk: [
            [10, 9],
            [10, 6],
            [9, 6],
          ],
          face: 'left',
        },
        { wait: 1.6 },
      ],
    };
  },
  // You (the wizard, as in every episode) break open the roadside cocoon: out comes Felix Rook, the Academy's
  // strategist, who chats, then strolls off toward Kaldor's towers. Written for this episode.
  // Taken out of the series (author, Oct 4, 2026): players only see it by playing, so it has no number
  // and the episodes after it moved down one. `node scripts/episode-video.mjs both-sides` still draws it.
  'both-sides': () => {
    const map = loadMap('courier-road', 'outdoor');
    map.npcs.felix = {
      id: 'felix',
      type: 'npc',
      x: 8,
      y: 6,
      sprite: 'felix',
      facing: 'right',
      name: 'Felix',
      lines: [],
    };
    const QUESTIONS = ['Who are you?', 'What now?'];
    return {
      number: 'BONUS',
      title: 'BOTH SIDES',
      map,
      hero: { sprite: 'quill', at: [9, 6], facing: 'left' },
      hide: ['nib', 'felix'],
      titleDur: 3.0,
      endDur: 4.5,
      script: [
        { wait: 0.6 },
        { narrate: true, lines: ['A cocoon, half hidden in the long grass at the roadside.'] },
        { menu: { options: ['Break it open.', 'Leave it.'], pick: 0, hold: 1.2 } },
        {
          hatch: {
            character: 'felix',
            dimension: 'intellectual',
            name: 'FELIX',
            subtitle: 'THE STRATEGIST',
            number: '#093',
            rarity: 2,
            color: '#9B74F8',
            move: 'laugh',
          },
        },
        { open: { at: [8, 6], grass: [10, 6] } },
        { show: 'felix' },
        // you step back a tile, still facing him: face to face, one tile between you
        { walk: [[10, 6]], look: 'left', speed: 50 },
        { say: 'felix', lines: ['...Ah. Awake. How long was I out?'] },
        { menu: { speaker: 'Felix', options: ['Five hundred years.', "I don't know."], pick: 0, hold: 1.1 } },
        { say: 'felix', lines: ["Five hundred. Hm. I'd have bet four."] },
        { menu: { speaker: 'Felix', options: QUESTIONS, pick: 0 } },
        {
          say: 'felix',
          lines: [
            'Felix Rook. I advised the last war.',
            'Both sides, actually. It lasted much longer that way. Much more interesting.',
          ],
        },
        { menu: { speaker: 'Felix', options: QUESTIONS, pick: 1 } },
        {
          say: 'felix',
          lines: [
            'Hmmmm. Good question.',
            'Whatever will cause the most fun, I guess.',
            "Thank you for the door. I'll remember it. Probably.",
          ],
        },
        // he laughs, then he's gone, lightning fast, east toward the towers
        { laugh: 'felix', dur: 1.4 },
        {
          npcWalk: 'felix',
          to: [
            [8, 7],
            [42, 7],
          ],
          speed: 520,
          hide: true,
          dash: true,
        },
        { wait: 0.5 },
        // and you set off after him, toward the next place the story goes
        {
          walk: [
            [10, 7],
            [42, 7],
          ],
          cut: 2.4,
        },
      ],
    };
  },
  // 30 seconds (author, Oct 3, 2026): no title card. It opens on Felix laughing (out loud) and
  // dashing off down the road, leaving his sign. You spot the shiny thing only a Mage sees, take the
  // hidden passage, and come out in the Archive, where the Keeper's waiting. The lines are the game's
  // (felix-maze.json, felix-maze.ts).
  4: () => {
    const maze = loadMap('felix-maze', 'outdoor');
    const archive = loadMap('archive', 'rooms');
    maze.npcs.felix = {
      id: 'felix',
      type: 'npc',
      x: 4,
      y: 5,
      sprite: 'felix',
      facing: 'left',
      name: 'Felix',
      lines: [],
    };
    const sign = maze.examine.S.slice(-1);
    const twinkle = [[2, 1]];
    return {
      number: 4,
      title: 'WELCOME BACK',
      map: maze,
      hero: { sprite: 'quill', at: [1, 5], facing: 'right' },
      hide: ['felix-maze', 'guard-1', 'guard-2'],
      twinkles: twinkle,
      titleDur: 0,
      endDur: 4.5,
      script: [
        // frame one: Felix, laughing, then gone down the road east
        { laugh: 'felix', dur: 1.4 },
        {
          npcWalk: 'felix',
          to: [
            [4, 5],
            [31, 5],
          ],
          speed: 520,
          hide: true,
          dash: true,
        },
        // what he left behind
        {
          walk: [
            [2, 5],
            [2, 4],
          ],
          face: 'up',
        },
        { narrate: true, lines: sign },
        // the shiny thing: only a Mage of Lv 6 sees it
        { you: ['(What is that shiny thing?)'] },
        { walk: [[2, 2]], face: 'up' },
        { you: ["(It's a hidden passage!)"] },
        // the choice is put plainly, by nobody, as in the game
        { narrate: true, lines: ['Take it?'] },
        { menu: { options: ['Yes', 'No'], pick: 0, hold: 0.8 } },
        // out in the Archive, right in front of the Keeper
        { scene: { map: archive, at: [20, 6], facing: 'up', hide: HALL } },
        { wait: 0.3 },
        { say: 'keeper', lines: ['Welcome back.', 'You wanna play cards?'] },
        { wait: 0.5 },
      ],
    };
  },
  // 5–6 (author, Oct 4, 2026): consolidated. 5: the cards, then straight to the green candle (its one line
  // of lore), the Keeper's warning, and out in front of Felix: "There he is, officers!" 6: Sir Himothy
  // gives his name, you try "Mr. Himothy", he cuts you off, and it's straight to the answers (four at most,
  // as in the game: two clever ones greyed with their Path's icon, two anyone can say). The lines are the
  // game's (keeper-welcome.json, felix-maze.ts). The Keeper's Q&A ("Another Long Story") is left for players.
  5: () => {
    const archive = loadMap('archive', 'rooms');
    const maze = loadMap('felix-maze', 'outdoor');
    const keeper = JSON.parse(readFileSync(join(ROOT, 'src/world/keeper-welcome.json'), 'utf8'));
    return {
      number: 5,
      title: 'THE GREEN CANDLE',
      next: 'SIR HIMOTHY THE THIRD',
      hold: 0.75,
      map: archive,
      hero: { sprite: 'quill', at: [20, 6], facing: 'up' },
      hide: HALL,
      twinkles: [[25, 3]],
      titleDur: 0,
      endDur: 4.5,
      script: [
        // frame one: mid-hand
        { cards: 1, under: true },
        { say: 'keeper', lines: ['Stop peeking.'] },
        { cardsEnd: true },
        // you get up and wander off (author, Oct 4, 2026), and choose to leave again
        { walk: [[20, 4]], face: 'right' },
        { say: 'keeper', lines: ['Leaving so soon?'] },
        { menu: { speaker: 'The Keeper', options: ['Leave.', 'Keep playing cards.'], pick: 0, hold: 0.6 } },
        { walk: [[25, 4]], face: 'up' },
        // its one line of lore
        { say: 'keeper', lines: [keeper.candle[1].replace(/^It /, 'That candle ')] },
        { menu: { options: ['Touch the green flame', 'Go back the way I came'], pick: 0, hold: 0.6 } },
        { say: 'keeper', lines: [keeper.confronted] },
        // the flash, and out past the maze, in front of Felix and the king's guards
        { scene: { map: maze, at: [22, 4], facing: 'right', show: ['felix-maze', 'guard-1', 'guard-2'], flash: true } },
        { say: 'felix-maze', lines: ['There he is, officers! That one, plotting to take the throne!'] },
        { wait: 0.4 },
      ],
    };
  },
  6: () => {
    const maze = loadMap('felix-maze', 'outdoor');
    const lock = (path, cls) => ({ locked: `${cls} Lv 10`, icon: path });
    const answers = [
      { label: '"Plots take weeks. I woke up today."', ...lock('intellectual', 'Mage') },
      { label: '"Let me buy you both a drink."', ...lock('social', 'Bard') },
      '"Your name is stupid, Timmy."',
      '"I\'m innocent!"',
    ];
    const HIMOTHY = 'Sir Himothy the Third';
    return {
      number: 6,
      title: 'SIR HIMOTHY THE THIRD',
      next: 'THE ONE IN THE CORNER',
      hold: 0.8,
      map: maze,
      hero: { sprite: 'quill', at: [22, 4], facing: 'right' },
      shown: ['felix-maze', 'guard-1', 'guard-2'],
      titleDur: 0,
      endDur: 4.5,
      script: [
        // frame one: the captain, in your face, and very proud of his name
        {
          say: 'guard-2',
          lines: ['The name is Sir Himothy the Third. And you have to say the whole thing.'],
        },
        { menu: { speaker: HIMOTHY, options: ['"Mr. Himothy, I..."'], pick: 0, hold: 0.5 } },
        { say: 'guard-2', lines: ['SAY. THE WHOLE. THING.'] },
        // the clever answers are there, greyed out until Lv 10; the wizard isn't there yet
        { menu: { speaker: HIMOTHY, options: answers, pick: 3, hold: 1.6 } },
        { say: 'guard-2', lines: ['Innocent, huh? Sounds like something a guilty person would say.', 'Seize him!'] },
        // they close in
        {
          npcWalk: 'guard-1',
          to: [
            [23, 3],
            [22, 3],
          ],
          speed: 70,
          together: true,
        },
        {
          npcWalk: 'guard-2',
          to: [
            [25, 5],
            [23, 5],
            [22, 5],
          ],
          speed: 70,
          together: true,
        },
        // they close in together (about a second), and it goes black as they reach you
        // (author, Oct 4, 2026: no sack, no narration)
        { wait: 1.1 },
      ],
    };
  },
  // Taken out of the series (author, Oct 4, 2026): the Keeper's Q&A, left for players to find.
  'another-long-story': () => {
    const archive = loadMap('archive', 'rooms');
    const keeper = JSON.parse(readFileSync(join(ROOT, 'src/world/keeper-welcome.json'), 'utf8'));
    const asks = keeper.asks;
    return {
      number: 'BONUS',
      title: 'ANOTHER LONG STORY',
      next: 'THE GREEN CANDLE',
      hold: 0.75,
      map: archive,
      hero: { sprite: 'quill', at: [20, 6], facing: 'up' },
      hide: HALL,
      titleDur: 0,
      endDur: 4.5,
      script: [
        { cards: 1, under: true },
        { say: 'keeper', lines: ['Stop peeking.'] },
        { menu: { speaker: 'The Keeper', options: asks.map((q) => q.ask), pick: 1, hold: 0.6 } },
        { say: 'keeper', lines: asks[1].answer },
        { menu: { speaker: 'The Keeper', options: [asks[2].ask], pick: 0, hold: 0.2 } },
        { say: 'keeper', lines: asks[2].answer },
        // and you're left wondering
        { you: keeper.afterThoughts },
      ],
    };
  },
  // 7–8 (the author's direction, Oct 3, 2026): the Kingdom Dungeon, as the game plays it
  // (kingdom-dungeon.json, dungeon.ts). The menus show all of Brannoc's questions, but the episodes
  // only pick what the story needs: the rest are there for players to try for themselves.
  // 7: in the cell (author, Oct 4, 2026: no march, open on "I am armed!"); the one in the corner was a
  // prince, once, and ended up here over an apple cart.
  7: () => {
    const cells = loadMap('kingdom-dungeon', 'dungeon');
    const brannoc = cells.npcs['brannoc-cell'];
    const answer = (ask) => brannoc.questions.find((q) => q.ask === ask).answer;
    return {
      number: 7,
      title: 'THE ONE IN THE CORNER',
      next: 'FOR THE APPLES',
      hold: 0.45,
      map: cells,
      hero: { sprite: 'quill', at: [6, 4], facing: 'left' },
      titleDur: 0,
      endDur: 4.5,
      script: [
        // frame one: shoved in with him
        // (visibly unarmed, and still dangerous)
        { say: 'brannoc-cell', lines: brannoc.lines },
        // three questions, picked quickly (author, Oct 4, 2026); it ends on the apple cart
        { menu: { speaker: 'Brannoc', options: menuOf(brannoc.questions, []), pick: 0, hold: 0.3 } },
        { say: 'brannoc-cell', lines: answer('Who are you?') },
        { menu: { speaker: 'Brannoc', options: menuOf(brannoc.questions, ['Who are you?']), pick: 0, hold: 0.3 } },
        { say: 'brannoc-cell', lines: answer('Why are you cowering in the corner?') },
        { menu: { speaker: 'Brannoc', options: menuOf(brannoc.questions, ['Who are you?', 'Why are you cowering in the corner?']), pick: 0, hold: 0.3 } },
        { say: 'brannoc-cell', lines: answer('What are you in for?') },
      ],
    };
  },
  // 8: the apple cart, "We need to escape", the bars, and Gary saw nothing.
  8: () => {
    const cells = loadMap('kingdom-dungeon', 'dungeon');
    const brannoc = cells.npcs['brannoc-cell'];
    const answer = (ask) => brannoc.questions.find((q) => q.ask === ask).answer;
    const garySaw = ['...', 'I did not see that.', '... I do not get paid enough to have seen that.'];
    return {
      number: 8,
      title: 'FOR THE APPLES',
      next: 'GARY',
      hold: 0.6,
      map: cells,
      hero: { sprite: 'quill', at: [4, 4], facing: 'left' },
      titleDur: 0,
      endDur: 4.5,
      script: [
        // frame one: the menu, and "We need to escape." (author, Oct 4, 2026)
        { menu: { speaker: 'Brannoc', options: menuOf(brannoc.questions, ['Who are you?', 'Why are you cowering in the corner?', 'What are you in for?']), pick: menuOf(brannoc.questions, ['Who are you?', 'Why are you cowering in the corner?', 'What are you in for?']).indexOf('We need to escape.'), hold: 0.8 } },
        { say: 'brannoc-cell', lines: answer('We need to escape.') },
        { narrate: true, lines: ['*squeak*'] },
        { say: 'brannoc-cell', lines: ['AAAAAAH!'] },
        // straight past you, through the bars, along the corridor and up the ladder
        {
          npcWalk: 'brannoc-cell',
          to: [
            [5, 4],
            [5, 5],
            [5, 6],
            [20, 6],
            [20, 8],
          ],
          speed: 260,
          hide: true,
          together: true,
        },
        // the bars bend as he goes through them
        { wait: 0.3 },
        { gap: [5, 5] },
        { wait: 0.6 },
        { face: 'down' },
        { say: 'jailer', lines: garySaw },
        { wait: 0.3 },
      ],
    };
  },
  // ---- The short-form template (EPISODES.md, author, Oct 5, 2026): Episode 10, "the worst prisoners ever", is the
  // one that worked. About 15 seconds, open on the line, three quick beats, punchlines that hold, no end card.
  // 10: three prisoners, three petty crimes against the king, three sentences that don't fit them.
  10: () => {
    const cells = loadMap('kingdom-dungeon', 'dungeon');
    // each beat's menu flashes up and Goodbye is picked
    const menu = (id) => {
      const options = menuOf(cells.npcs[id].questions, []);
      return { menu: { speaker: cells.npcs[id].name, options, pick: options.length - 1, hold: 0.5 } };
    };
    return {
      ...SHORT,
      number: 10,
      title: 'THE WORST PRISONERS EVER',
      map: cells,
      hide: ['brannoc-cell'],
      gaps: [[5, 5]],
      hero: { sprite: 'quill', at: [10, 6], facing: 'up' },
      // the hook: in close on Old Mott, then back out for the other two
      zoom: 1.5,
      script: [
        { say: 'prisoner-1', punch: 1.6 },
        menu('prisoner-1'),
        { zoom: 1 },
        { walk: [[14, 6]], face: 'up' },
        { say: 'prisoner-2', punch: 1.4 },
        menu('prisoner-2'),
        { walk: [[18, 6]], face: 'up' },
        { say: 'prisoner-3', punch: 1.6 },
      ],
    };
  },
  // 11: two steps into the Maze Ward the floor gives way, and you drop into the Deep Cells outside Silas Seen's cell.
  // The other two have a go, Silas Seen blames Gary, and Gary is asleep (author, Oct 6, 2026).
  11: () => {
    const ward = loadMap('dungeon-mazes', 'dungeon');
    const cells = loadMap('kingdom-dungeon', 'dungeon');
    const said = POTHOLE_LANDING();
    return {
      ...SHORT,
      number: 11,
      title: 'SEE YOU NEXT FALL',
      map: ward,
      hero: { sprite: 'quill', at: [2, 2], facing: 'right' },
      script: [
        // the wizard never speaks. Frame one: already walking into the maze, and two steps in the floor goes
        { walk: [[4, 2]] },
        { drop: 0.25 },
        { wait: 0.1 },
        // the hook: out of the top of the screen, down onto your feet outside the last cell
        { zoom: 1.6 },
        { scene: { map: cells, at: [18, 6], facing: 'up', hide: ['brannoc-cell'], gap: 0.3, airborne: true } },
        { gap: [5, 5] },
        { fall: 0.45 },
        // cut to the other two
        { look: [12, 5] },
        { zoom: 1.3 },
        { say: 'prisoner-1', lines: said['OLD MOTT'] },
        { say: 'prisoner-2', lines: said.NAILS, punch: 0.9 },
        { laugh: 'prisoner-1', dur: 1.3, together: true },
        { laugh: 'prisoner-2', dur: 1.3 },
        // back to Silas Seen
        { look: null },
        { zoom: 1.6 },
        { say: 'prisoner-3', lines: said['SILAS SEEN'], punch: 1.2 },
        // and Gary
        { look: [3, 7] },
        { say: 'jailer', lines: said.GARY, punch: 1.4 },
      ],
    };
  },
};

if (!EPISODES[episode]) throw new Error(`No episode ${episode} yet: ${Object.keys(EPISODES).join(', ')}`);
const ep = EPISODES[episode]();
/** "THE ONE IN THE CORNER" → "The One in the Corner" (no "?": file names). */
const SMALL = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
const titleCase = (t) =>
  t
    .replace(/\?/g, '')
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
const out =
  outArg ??
  (mkdirSync(EPISODE_FOLDER, { recursive: true }),
  join(EPISODE_FOLDER, `Episode ${String(ep.number).padStart(2, '0')} - ${titleCase(ep.title)}.mp4`));
const compiled = compile(ep);
const FADE = 0.5;
const total = compiled.end + ep.endDur;
const frames = Math.ceil(total * FPS);

// STILLS='3.5,9' writes those moments as PNGs next to `out` instead of a video, for checking the look.
if (process.env.STILLS) {
  const surface = CK.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  for (const s of process.env.STILLS.split(',').map(Number)) {
    const file = out.replace(/\.\w+$/, `-${s}.png`);
    const st = s >= ep.titleDur && s < compiled.end ? stateAt(ep, compiled, s) : null;
    if (st?.hatch) {
      const png = new PNG({ width: W, height: H });
      png.data = Buffer.from(hatchFrame(canvas, st.hatch));
      writeFileSync(file, PNG.sync.write(png));
      continue;
    }
    if (s < ep.titleDur) drawTitle(canvas, ep, s);
    else if (st) {
      drawWorld(canvas, ep, st, s);
      drawOverlays(canvas, st);
      if (st.blackout > 0)
        canvas.drawRect(CK.XYWHRect(0, 0, W, H), paint(st.white ? '#FFFFFF' : '#000000', Math.min(1, st.blackout)));
    } else drawEnd(canvas, ep, s - compiled.end);
    writeFileSync(file, surface.makeImageSnapshot().encodeToBytes());
  }
  console.log(
    `total ${total.toFixed(1)}s`,
    compiled.segs
      .filter((x) => x.kind === 'line')
      .map((x) => `${x.t0.toFixed(1)} ${x.speaker ?? '-'}: ${x.text.slice(0, 30)}`)
      .join('\n'),
  );
  process.exit(0);
}

// ---- render the picture (AUDIO_ONLY=1 keeps the picture already in `out` and only remixes the sound)
const work = mkdtempSync(join(tmpdir(), 'episode-'));
const silent = join(work, 'picture.mp4');
if (process.env.AUDIO_ONLY) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-an', '-c:v', 'copy', silent], {
    stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error(`AUDIO_ONLY needs an existing ${out}`);
} else if (!process.env.PART) {
  // CanvasKit wears out over a long run (after ~850 frames it can crash in canvas.clear), so every
  // episode is drawn in fresh runs of at most CHUNK frames, also cut either side of a hatch, then
  // joined losslessly.
  const CHUNK = 600;
  const marks = [
    0,
    frames,
    ...compiled.segs.filter((x) => x.kind === 'hatch').flatMap((x) => [Math.round(x.t0 * FPS), Math.round(x.t1 * FPS)]),
  ];
  for (let f = CHUNK; f < frames; f += CHUNK) marks.push(f);
  const cuts = [...new Set(marks)].filter((f) => f >= 0 && f <= frames).sort((a, b) => a - b);
  const list = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    if (cuts[i + 1] <= cuts[i]) continue;
    const part = join(work, `part-${i}.mp4`);
    const r = spawnSync(process.execPath, [process.argv[1], episode, part], {
      env: { ...process.env, PART: `${cuts[i]},${cuts[i + 1]}` },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    if (r.status !== 0) throw new Error(`part ${i} (frames ${cuts[i]}–${cuts[i + 1]}) failed`);
    list.push(`file '${part}'`);
  }
  writeFileSync(join(work, 'parts.txt'), list.join('\n'));
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(work, 'parts.txt'), '-c', 'copy', silent],
    {
      stdio: 'inherit',
    },
  );
  if (r.status !== 0) throw new Error('joining the parts failed');
} else await renderPicture();

// PART='from,to' draws only those frames, picture only, to `out` (one run of a split render)
if (process.env.PART) {
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', out], { stdio: 'inherit' });
  process.exit(0);
}

async function renderPicture() {
  const ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${W}x${H}`,
      '-r',
      `${FPS}`,
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      // what YouTube asks for: High profile, a keyframe every 2 seconds, BT.709
      '-profile:v',
      'high',
      '-level',
      '4.2',
      '-g',
      '60',
      '-keyint_min',
      '60',
      '-sc_threshold',
      '0',
      '-bf',
      '2',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-colorspace',
      'bt709',
      silent,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const surface = CK.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  const black = (a) => a > 0 && canvas.drawRect(CK.XYWHRect(0, 0, W, H), paint('#000000', Math.min(1, a)));
  const [from, to] = process.env.PART ? process.env.PART.split(',').map(Number) : [0, frames];
  for (let f = from; f < to; f++) {
    const t = f / FPS;
    if (t < ep.titleDur) {
      drawTitle(canvas, ep, t);
      black((t - (ep.titleDur - FADE)) / FADE);
    } else if (t < compiled.end) {
      const st = stateAt(ep, compiled, t);
      // a hatch frame is raw pixels, straight to the video
      if (st.hatch) {
        const px = hatchFrame(canvas, st.hatch);
        if (!ff.stdin.write(Buffer.from(px))) await once(ff.stdin, 'drain');
        continue;
      }
      drawWorld(canvas, ep, st, t);
      drawOverlays(canvas, st);
      if (st.white) {
        if (st.blackout > 0) canvas.drawRect(CK.XYWHRect(0, 0, W, H), paint('#FFFFFF', Math.min(1, st.blackout)));
      } else black(st.blackout);
      // no title card: the first frame is already the scene (author: open on the line, not a fade)
      if (ep.titleDur > 0) black(1 - (t - ep.titleDur) / FADE);
      // the template ends on the last laugh, no fade and no end card, so the short loops straight back round
      if (ep.endDur > 0) black((t - (compiled.end - FADE)) / FADE);
    } else {
      drawEnd(canvas, ep, t - compiled.end);
    }
    const px = canvas.readPixels(0, 0, {
      width: W,
      height: H,
      colorType: CK.ColorType.RGBA_8888,
      alphaType: CK.AlphaType.Unpremul,
      colorSpace: CK.ColorSpace.SRGB,
    });
    if (!ff.stdin.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))) await once(ff.stdin, 'drain');
    if (f % 150 === 0) process.stderr.write(`\r${Math.round((f / frames) * 100)}%`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  process.stderr.write('\r100%\n');
}

// ---- the voices: a blip every other letter, at the game's volume (sounds.ts EFFECT_VOLUME 0.5)
const RATE = 22050;
const pcm = (path) => {
  const b = readFileSync(path);
  const at = b.indexOf('data') + 8;
  return new Int16Array(b.buffer.slice(b.byteOffset + at, b.byteOffset + b.length));
};
const blips = [1, 2, 3, 4, 5].map((v) => pcm(join(ROOT, `assets/audio/blip-${v}.wav`)));
const VOICE_SOUNDS = [pcm(join(ROOT, 'assets/audio/blip-0.wav')), ...blips];
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
const LAUGH = laugh(RATE);
const mix = new Float32Array(Math.ceil(total * RATE));
const place = (sound, at, gain) => {
  const start = Math.round(at * RATE);
  for (let i = 0; i < sound.length && start + i < mix.length; i++) mix[start + i] += (sound[i] / 32768) * gain;
};
for (const s of compiled.segs) {
  if (s.kind === 'line') for (const a of s.blips) place(VOICE_SOUNDS[s.voice], s.t0 + a, s.voice === 0 ? 0.7 : 0.5); // EFFECT_VOLUME
  if (s.kind === 'menu') place(SELECT, s.pressAt, 0.5);
  // a laugh out loud, as in the game (a quiet one is only a cower)
  if (s.kind === 'laugh' && !s.quiet) {
    const start = Math.round(s.t0 * RATE);
    LAUGH.forEach((v, i) => {
      if (start + i < mix.length) mix[start + i] += v * 0.5;
    });
  }
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
  [
    '-y',
    '-loglevel',
    'error',
    '-i',
    silent,
    '-i',
    voices,
    // the game's blips are soft under a phone's own volume; a feed needs them up front
    // Instagram and YouTube reject uploads part-way through without 44.1/48 kHz audio and the index
    // up front (faststart): 48 kHz stereo, BT.709 tags, moov first.
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-af',
    'volume=14dB,alimiter=limit=0.9',
    '-c:v',
    'copy',
    '-bsf:v',
    'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-shortest',
    out,
  ],
  { stdio: 'inherit' },
);
if (r.status !== 0) throw new Error('ffmpeg mux failed');
console.log(`${out}: ${total.toFixed(1)}s`);
