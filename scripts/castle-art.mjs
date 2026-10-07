// Kaldor's castle (author, Oct 4, 2026): grand, and dangerous-looking. Outside: the castle itself,
// drawn once across its whole block from its top-left tile (black stone, two great towers, a keep
// with red-lit windows and spiked battlements, the Crown's banners), a moat, skull pikes, a guard
// post, and a soldier down on the training sand. Inside: pillars, a red carpet, half-stairs up to
// side galleries, a winding stair, and the king's floor's furniture.

const TILE = 16;

/** The block a letter covers, from its top-left tile; `doors`: bottom-row tiles that aren't the letter. */
function extent(m, letter) {
  let w = 1;
  while (m.at(w, 0) === letter) w++;
  let h = 1;
  while (m.at(0, h) === letter) h++;
  const doors = [];
  for (let i = 0; i < w; i++) if (m.at(i, h - 1) !== letter) doors.push(i);
  return { w: w * TILE, h: h * TILE, doors };
}

const hexOf = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c);
const mixC = (c, d, k) => {
  const a = hexOf(c);
  const b = hexOf(d);
  return a.map((v, i) => Math.round(v + (b[i] - v) * k));
};

/** Black stone, lit from the upper left. */
const ST = {
  face: '#3A3640',
  faceAlt: '#36323C',
  light: '#56525E',
  dark: '#242028',
  mortar: '#1E1A22',
  outline: '#121014',
  roof: '#1E1A26',
  roofLight: '#34303E',
  ember: '#E06A2A',
  glow: '#F0B050',
  red: '#8A1A1A',
  redDark: '#5A0E10',
  gold: '#C8963A',
  iron: '#4A4A54',
  bone: '#D8D0B8',
};

export function castleArt({ box, put, ellipse, hash, wall, tint }) {
  /** A run of black ashlar: courses of blocks, the left edge lit, the right in shade. */
  const masonry = (g, x, y, w, h, seed = 0) => {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const course = Math.floor(j / 6);
        const joint = (i + (course % 2) * 7 + seed) % 14 === 0 || j % 6 === 5;
        let c = joint
          ? ST.mortar
          : hash(Math.floor((i + course * 3) / 14), course, 71 + seed) < 0.5
            ? ST.face
            : ST.faceAlt;
        if (!joint && i < 3) c = ST.light;
        if (!joint && i > w - 4) c = ST.dark;
        put(g, x + i, y + j, c);
      }
    box(g, x - 1, y, 1, h, ST.outline);
    box(g, x + w, y, 1, h, ST.outline);
  };
  /** Crenellations along the top of a wall, with an iron spike on each merlon. */
  const battlements = (g, x, y, w, spikes = true) => {
    box(g, x - 1, y + 5, w + 2, 3, ST.light);
    box(g, x - 1, y + 8, w + 2, 1, ST.outline);
    for (let i = 0; i + 5 <= w; i += 8) {
      box(g, x + i, y, 5, 6, ST.face);
      box(g, x + i, y, 1, 6, ST.light);
      box(g, x + i + 4, y, 1, 6, ST.dark);
      box(g, x + i - 1, y - 1, 7, 1, ST.outline);
      if (spikes) {
        put(g, x + i + 2, y - 2, ST.iron);
        put(g, x + i + 2, y - 3, ST.iron);
        put(g, x + i + 2, y - 4, '#8A8A96');
      }
    }
  };
  /** A narrow window lit red from inside. */
  const slit = (g, x, y, h = 7, lit = true) => {
    box(g, x - 1, y - 1, 4, h + 2, ST.outline);
    box(g, x, y, 2, h, lit ? ST.ember : '#0C0A0E');
    if (lit) put(g, x, y + 1, ST.glow);
  };
  /** The Crown's emblem: a gold fist crushing a crown, centred at (cx, cy). */
  const emblem = (g, cx, cy) => {
    box(g, cx - 4, cy + 4, 9, 2, ST.gold);
    put(g, cx - 4, cy + 3, ST.gold);
    put(g, cx, cy + 3, ST.gold);
    put(g, cx + 4, cy + 3, ST.gold);
    box(g, cx - 3, cy - 3, 7, 5, ST.gold);
    box(g, cx - 3, cy - 3, 7, 1, '#E8C060');
    for (let i = -2; i < 4; i += 2) put(g, cx + i, cy - 1, '#8A6420');
    box(g, cx + 4, cy - 2, 1, 3, '#8A6420');
  };
  /** A great hanging banner: red, a gold fist crushing a crown, a ragged tail. */
  const banner = (g, x, y, w, h) => {
    box(g, x - 2, y - 1, w + 4, 2, ST.iron);
    box(g, x, y, w, h, ST.red);
    box(g, x + w - 2, y, 2, h, ST.redDark);
    for (let i = 0; i < w; i += 2) box(g, x + i, y + h, 1, (i / 2) % 2 ? 3 : 1, ST.red);
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h * 0.4);
    // the crown, crushed
    box(g, cx - 4, cy + 4, 9, 2, ST.gold);
    put(g, cx - 4, cy + 3, ST.gold);
    put(g, cx, cy + 3, ST.gold);
    put(g, cx + 4, cy + 3, ST.gold);
    // the fist over it
    box(g, cx - 3, cy - 3, 7, 5, ST.gold);
    box(g, cx - 3, cy - 3, 7, 1, '#E8C060');
    for (let i = -2; i < 4; i += 2) put(g, cx + i, cy - 1, '#8A6420');
  };
  /** A round tower's conical slate roof, and a black pennant at the tip. */
  const cone = (g, cx, top, base, r) => {
    for (let j = 0; j <= base - top; j++) {
      const half = Math.round((j / (base - top)) * r);
      for (let i = -half; i <= half; i++) {
        const lit = i < -half / 3;
        const band = j % 5 === 4;
        put(g, cx + i, top + j, band ? ST.outline : lit ? ST.roofLight : ST.roof);
      }
      put(g, cx - half - 1, top + j, ST.outline);
      put(g, cx + half + 1, top + j, ST.outline);
    }
    box(g, cx, top - 9, 1, 9, ST.iron);
    box(g, cx + 1, top - 9, 6, 3, ST.red);
    box(g, cx + 1, top - 6, 4, 1, ST.red);
  };
  /** A brazier: an iron bowl on legs, burning. */
  const brazier = (g, x, y) => {
    box(g, x + 1, y + 6, 1, 5, ST.iron);
    box(g, x + 6, y + 6, 1, 5, ST.iron);
    box(g, x, y + 4, 8, 3, ST.iron);
    box(g, x + 1, y + 1, 6, 3, ST.ember);
    box(g, x + 2, y - 2, 4, 3, ST.glow);
    put(g, x + 3, y - 4, ST.glow);
    put(g, x + 4, y - 3, '#FFF0C0');
  };

  const outdoor = {};

  /** A colour across a round surface, lit from the upper left: `t` 0 at the left edge, 1 at the right. */
  const roundLight = (t) => Math.max(0, Math.cos((t - 0.28) * Math.PI * 0.95));
  /**
   * Black ashlar with some life in it: each block its own shade, a lit top edge and a dark bottom,
   * a few cracked or soot-stained, and (round) shaded like a drum, light on the left.
   */
  const ashlar = (g, x, y, w, h, seed = 0, round = false, course = 6, block = 12) => {
    for (let j = 0; j < h; j++) {
      const row = Math.floor(j / course);
      for (let i = 0; i < w; i++) {
        const off = (row % 2) * Math.floor(block / 2);
        const bi = Math.floor((i + off + seed) / block);
        const v = hash(bi, row, 70 + seed);
        let c = mixC('#34303A', '#46424E', v);
        const inRow = j % course;
        const inBlock = (i + off + seed) % block;
        if (inRow === course - 1 || inBlock === 0) c = '#1A161E';
        else if (inRow === 0) c = mixC(c, '#6A6676', 0.35);
        else if (inRow === course - 2) c = mixC(c, '#1A161E', 0.25);
        if (v > 0.93 && inRow > 0 && inRow < course - 1) c = mixC(c, '#14101A', 0.5); // soot
        if (v < 0.04 && inBlock === Math.floor(block / 2) && inRow > 0) c = '#14101A'; // a crack
        const t = (i + 0.5) / w;
        const k = round ? roundLight(t) : 1 - Math.max(0, t - 0.8) * 2.5 + Math.max(0, 0.06 - t) * 4;
        c = mixC(c, round ? '#0E0C12' : '#1A161E', round ? 0.62 * (1 - k) : Math.max(0, 0.35 * (1 - k)));
        if (round && k > 0.93 && inRow !== course - 1) c = mixC(c, '#7A7686', 0.25);
        put(g, x + i, y + j, c);
      }
    }
    box(g, x - 1, y, 1, h, ST.outline);
    box(g, x + w, y, 1, h, ST.outline);
  };
  /** Machicolations: a row of corbels jutting out under the battlements, dark gaps between. */
  const corbels = (g, x, y, w) => {
    box(g, x - 2, y, w + 4, 3, '#4A4654');
    box(g, x - 2, y, w + 4, 1, '#6A6676');
    for (let i = 0; i < w; i += 6) {
      box(g, x + i, y + 3, 4, 4, '#3E3A48');
      put(g, x + i, y + 3, '#5A5666');
      box(g, x + i + 4, y + 3, 2, 3, '#0C0A10');
      put(g, x + i + 1, y + 6, '#2A2632');
    }
    box(g, x - 2, y + 7, w + 4, 1, '#14101A');
  };
  /** Crenellations with an iron spike on each merlon, and the wall-walk's shadow behind. */
  const crenels = (g, x, y, w, spikes = true) => {
    box(g, x - 2, y + 5, w + 4, 4, '#2A2632');
    box(g, x - 2, y + 5, w + 4, 1, '#5A5666');
    for (let i = 0; i + 5 <= w + 2; i += 8) {
      const mx = x - 1 + i;
      box(g, mx, y, 6, 6, '#3E3A48');
      box(g, mx, y, 6, 1, '#6A6676');
      box(g, mx, y, 1, 6, '#5A5666');
      box(g, mx + 5, y, 1, 6, '#1E1A24');
      box(g, mx - 1, y - 1, 8, 1, ST.outline);
      if (spikes) {
        box(g, mx + 2, y - 4, 1, 3, '#5A5A66');
        put(g, mx + 2, y - 5, '#9A9AA6');
      }
    }
    box(g, x - 2, y + 9, w + 4, 1, ST.outline);
  };
  /** An arched window, lit red-gold from inside, with a stone surround, a sill and soot above. */
  const archWin = (g, x, y, w = 5, h = 10, lit = true) => {
    for (let j = -3; j < 0; j++)
      for (let i = 0; i < w; i++)
        put(g, x + i, y + j - 1, mixC(g[y + j - 1]?.[x + i] ?? [40, 36, 44], '#0C0A10', 0.25));
    box(g, x - 2, y - 1, w + 4, h + 3, '#5A5666');
    box(g, x - 1, y, w + 2, h + 1, ST.outline);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const top = j < 2 && (i === 0 || i === w - 1);
        if (top) continue;
        put(g, x + i, y + j, lit ? mixC(ST.glow, ST.ember, Math.min(1, j / h + 0.2)) : '#0C0A10');
      }
    if (lit) {
      box(g, x + Math.floor(w / 2), y + 1, 1, h - 1, '#5A1A10'); // the mullion
      box(g, x, y + Math.floor(h / 2), w, 1, '#5A1A10');
    }
    box(g, x - 2, y + h + 1, w + 4, 2, '#6A6676');
  };
  /** A long banner on a bar: deep red, gold-edged, the fist crushing a crown, a swallowtail. */
  const longBanner = (g, x, y, w, h) => {
    box(g, x - 3, y - 2, w + 6, 2, '#5A5A66');
    put(g, x - 3, y - 3, ST.gold);
    put(g, x + w + 2, y - 3, ST.gold);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        let c = i < 2 ? '#A02A24' : i > w - 3 ? '#4A0C0E' : ST.red;
        if (i === 1 || i === w - 2) c = ST.gold;
        if (j % 9 === 8 && i > 1 && i < w - 2) c = mixC(c, '#3A0A0A', 0.3); // folds
        put(g, x + i, y + j, c);
      }
    for (let i = 0; i < w; i++) {
      const tail = Math.abs(i - (w - 1) / 2);
      box(g, x + i, y + h, 1, Math.round(tail * 0.9), i < 2 ? '#A02A24' : ST.red);
    }
    emblem(g, x + Math.floor(w / 2), y + 12);
  };
  /** A round tower's conical roof in slate courses, with a pennant flying from the tip. */
  const slateCone = (g, cx, top, base, r) => {
    const hgt = base - top;
    for (let j = 0; j <= hgt; j++) {
      const half = Math.round(Math.pow(j / hgt, 0.9) * r);
      for (let i = -half; i <= half; i++) {
        const t = half === 0 ? 0.5 : (i + half) / (2 * half);
        const k = roundLight(t);
        const course = j % 4 === 3;
        const seam = (i + Math.floor(j / 4) * 2 + 40) % 5 === 0 && j % 4 !== 3;
        let c = mixC('#14101C', '#4A4658', k);
        if (course) c = mixC(c, '#0A080E', 0.6);
        else if (seam) c = mixC(c, '#0A080E', 0.35);
        put(g, cx + i, top + j, c);
      }
      put(g, cx - half - 1, top + j, ST.outline);
      put(g, cx + half + 1, top + j, ST.outline);
    }
    // the eaves, overhanging, with a lip of light
    box(g, cx - r - 3, base, 2 * r + 7, 2, '#0A080E');
    box(g, cx - r - 3, base, r, 1, '#3A3648');
    // the finial and pennant
    box(g, cx, top - 12, 1, 12, '#6A6A76');
    put(g, cx, top - 13, ST.gold);
    for (let j = 0; j < 4; j++)
      box(g, cx + 1, top - 12 + j, 9 - j * 2 + (j === 0 ? 0 : 0), 1, j % 2 ? ST.redDark : ST.red);
  };
  /** Light spilling out of a window onto the wall below it. */
  const glowPool = (g, cx, cy, r) => {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) {
        const d = Math.hypot(i, j * 1.4) / r;
        if (d >= 1) continue;
        const c = g[cy + j]?.[cx + i];
        if (c) g[cy + j][cx + i] = mixC(c, '#E06A2A', 0.18 * (1 - d));
      }
  };

  // The castle, drawn once from its top-left tile: back to front, the keep and its donjon, the
  // curtain walls, the two great round towers, and the gatehouse jutting out between them.
  outdoor['@'] = (g, x, y, m) => {
    if (m.at(-1, 0) === '@' || m.at(0, -1) === '@') return;
    const ext = extent(m, '@');
    const W = ext.w;
    const H = ext.h;
    const foot = y + H;
    // a dusk sky behind it, darkening upward, embers drifting
    for (let j = 0; j < H - 24; j++)
      for (let i = 0; i < W; i++) {
        const k = j / (H - 24);
        put(g, x + i, y + j, hash(i, j, 77) < 0.004 ? '#E06A2A' : mixC('#100C14', '#2E2632', k));
      }
    // its shadow on the ground in front
    for (let j = 0; j < 7; j++)
      for (let i = 6; i < W + 6; i++) {
        const py = foot + j - 1;
        if (g[py]?.[x + i]) g[py][x + i] = mixC(g[py][x + i], '#08060A', 0.5 - j * 0.06);
      }

    // the keep, behind: a long hall with a pitched slate roof, and the donjon rising from its middle
    const keepW = Math.round(W * 0.5);
    const keepX = x + Math.round((W - keepW) / 2);
    const keepTop = y + 34;
    for (let j = 0; j < 12; j++) {
      const inset = Math.round(((12 - j) / 12) * 10);
      for (let i = inset; i < keepW - inset; i++)
        put(g, keepX + i, keepTop - 12 + j, j % 3 === 2 ? '#0E0C14' : mixC('#1E1A28', '#3A3648', 1 - i / keepW));
    }
    ashlar(g, keepX, keepTop, keepW, foot - keepTop, 2);
    const dW = 56;
    const dX = x + Math.round((W - dW) / 2);
    const dTop = y + 14;
    ashlar(g, dX, dTop + 10, dW, keepTop - dTop, 3);
    corbels(g, dX, dTop + 8, dW);
    crenels(g, dX, dTop, dW);
    // the donjon's eye: a round window, burning
    ellipse(g, dX + dW / 2, dTop + 24, 7, 7, '#5A5666');
    ellipse(g, dX + dW / 2, dTop + 24, 6, 6, ST.outline);
    ellipse(g, dX + dW / 2, dTop + 24, 5, 5, ST.ember);
    ellipse(g, dX + dW / 2, dTop + 24, 3, 3, ST.glow);
    ellipse(g, dX + dW / 2, dTop + 24, 1, 1, '#FFF4D0');
    for (const tx of [dX - 4, dX + dW - 6]) {
      ashlar(g, tx, dTop + 2, 10, keepTop - dTop + 4, 9, true, 5, 6);
      slateCone(g, tx + 5, y + 2, dTop + 2, 7);
    }
    // the keep's windows and banners
    for (const wx of [keepX + 14, keepX + 34, keepX + keepW - 39, keepX + keepW - 19]) {
      archWin(g, wx, keepTop + 14, 5, 11);
      glowPool(g, wx + 2, keepTop + 32, 8);
    }
    longBanner(g, keepX + 54, keepTop + 6, 14, 46);
    longBanner(g, keepX + keepW - 68, keepTop + 6, 14, 46);

    // the curtain walls, lower, with machicolations and spikes
    const tw = 72;
    const curtainTop = y + Math.round(H * 0.46);
    for (const [cx, cw] of [
      [x + tw - 6, keepX - (x + tw - 6) + 6],
      [keepX + keepW - 2, x + W - tw + 6 - (keepX + keepW - 2)],
    ]) {
      ashlar(g, cx, curtainTop + 10, cw, foot - curtainTop - 10, 1);
      corbels(g, cx, curtainTop + 8, cw);
      crenels(g, cx, curtainTop, cw);
      for (let sx = cx + 12; sx < cx + cw - 10; sx += 20) {
        // a cross-shaped arrow loop
        box(g, sx, curtainTop + 22, 2, 12, ST.outline);
        box(g, sx - 2, curtainTop + 26, 6, 2, ST.outline);
        put(g, sx, curtainTop + 23, ST.ember);
      }
      // chains hanging from the wall-walk
      for (let j = 0; j < 26; j += 2)
        put(g, cx + Math.round(cw / 2), curtainTop + 10 + j, j % 4 ? '#4A4A54' : '#7A7A86');
    }

    // the two great round towers, out front, battered at the foot
    for (const tx of [x, x + W - tw]) {
      const top = y + 40;
      ashlar(g, tx, top + 10, tw, foot - top - 10, tx === x ? 4 : 5, true);
      // the batter: the foot of the tower splays out
      for (let j = 0; j < 12; j++) {
        const spread = Math.round((j / 12) * 3);
        box(g, tx - spread, foot - 12 + j, spread, 1, '#24202A');
        box(g, tx + tw, foot - 12 + j, spread, 1, '#0E0C12');
      }
      corbels(g, tx, top + 8, tw);
      crenels(g, tx, top, tw);
      slateCone(g, tx + tw / 2, y + 2, top - 3, tw / 2 - 4);
      archWin(g, tx + 16, top + 26, 5, 10);
      archWin(g, tx + tw - 22, top + 26, 5, 10);
      archWin(g, tx + tw / 2 - 3, top + 62, 6, 12);
      glowPool(g, tx + 18, top + 44, 7);
      glowPool(g, tx + tw / 2, top + 82, 8);
    }

    // the gatehouse, jutting out in front of the keep: two turrets and a deep arch
    if (ext.doors.length) {
      const gcx = x + ext.doors[0] * TILE + (ext.doors.length * TILE) / 2;
      const ghW = 104;
      const ghX = Math.round(gcx - ghW / 2);
      const ghTop = foot - 92;
      ashlar(g, ghX, ghTop + 10, ghW, foot - ghTop - 10, 6);
      corbels(g, ghX, ghTop + 8, ghW);
      crenels(g, ghX, ghTop, ghW);
      for (const tx of [ghX - 10, ghX + ghW - 12]) {
        ashlar(g, tx, ghTop - 6, 22, foot - ghTop + 6, 7, true, 5, 7);
        crenels(g, tx + 1, ghTop - 14, 20);
        archWin(g, tx + 8, ghTop + 14, 4, 8);
        archWin(g, tx + 8, ghTop + 44, 4, 8);
      }
      // the Crown's banner over the arch
      longBanner(g, gcx - 9, ghTop + 14, 18, 26);
      // the arch: voussoirs, the dark, the portcullis teeth, murder holes
      const aw = ext.doors.length * TILE + 12;
      const ax = Math.round(gcx - aw / 2);
      const aTop = foot - 40;
      for (let j = -13; j < 40; j++)
        for (let i = -5; i < aw + 5; i++) {
          const dx = i - aw / 2 + 0.5;
          const outer = (dx / (aw / 2 + 5)) ** 2 + (Math.min(0, j) / 13) ** 2;
          const inner = (dx / (aw / 2)) ** 2 + (Math.min(0, j) / 8) ** 2;
          if (j < 0 ? inner <= 1 : i >= 0 && i < aw) put(g, ax + i, aTop + j, '#08060A');
          else if (outer <= 1) {
            // voussoirs fanning round the arch, jambs below
            const v = j < 0 ? Math.floor(((Math.atan2(j, dx) + Math.PI) / Math.PI) * 9) : Math.floor(j / 6);
            put(g, ax + i, aTop + j, v % 2 ? '#5E5A6A' : '#4A4656');
            if (j >= 0 && j % 6 === 5) put(g, ax + i, aTop + j, '#1A161E');
          }
        }
      for (let i = ax + 2; i < ax + aw - 1; i += 4) {
        box(g, i, aTop - 6, 1, 12, '#3A3A44');
        put(g, i, aTop + 6, '#8A8A96');
      }
      box(g, ax + 1, aTop - 2, aw - 2, 1, '#3A3A44');
      box(g, ax + 1, aTop + 2, aw - 2, 1, '#3A3A44');
      // the keystone skull
      box(g, gcx - 3, aTop - 16, 7, 6, ST.bone);
      box(g, gcx - 2, aTop - 10, 5, 2, ST.bone);
      put(g, gcx - 2, aTop - 14, ST.outline);
      put(g, gcx + 2, aTop - 14, ST.outline);
      put(g, gcx, aTop - 12, ST.outline);
      brazier(g, ax - 18, foot - 18);
      brazier(g, ax + aw + 10, foot - 18);
      glowPool(g, ax - 14, foot - 22, 10);
      glowPool(g, ax + aw + 14, foot - 22, 10);
    }
    // the plinth along the foot of everything
    box(g, x - 1, foot - 4, W + 2, 4, '#26222C');
    box(g, x - 1, foot - 4, W + 2, 1, '#4A4656');
    box(g, x - 1, foot, W + 2, 1, ST.outline);
  };

  // The moat: still black water between stone lips.
  outdoor['~'] = (g, x, y, m) => {
    const water = (c) => c === '~' || c === '2';
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        let c = hash(Math.floor((x + i) / 5), Math.floor((y + j) / 3), 81) < 0.5 ? '#1A2826' : '#16221F';
        if ((x + i + (y + j) * 3) % 23 === 0) c = '#2C4440';
        put(g, x + i, y + j, c);
      }
    if (!water(m.at(0, -1))) {
      box(g, x, y, TILE, 3, '#3A3640');
      box(g, x, y + 3, TILE, 1, '#0C0A0E');
    }
    if (!water(m.at(0, 1))) {
      box(g, x, y + 12, TILE, 4, '#46424C');
      box(g, x, y + 12, TILE, 1, '#5A5662');
      for (let i = 2; i < TILE; i += 6) box(g, x + i, y + 13, 1, 3, '#2E2A32');
    }
    if (!water(m.at(-1, 0))) box(g, x, y, 3, TILE, '#3A3640');
    if (!water(m.at(1, 0))) box(g, x + 13, y, 3, TILE, '#3A3640');
  };

  // A pike with a skull on it. Fair warning.
  outdoor.o = (g, x, y) => {
    ellipse(g, x + 9, y + 15, 4, 1, '#1A1410');
    box(g, x + 7, y + 4, 2, 12, '#5A3E28');
    box(g, x + 8, y + 4, 1, 12, '#3A2818');
    ellipse(g, x + 8, y + 3, 3, 3, ST.bone);
    box(g, x + 6, y + 5, 5, 2, ST.bone);
    put(g, x + 7, y + 3, ST.outline);
    put(g, x + 9, y + 3, ST.outline);
    put(g, x + 8, y + 6, ST.outline);
    put(g, x + 6, y + 1, '#F0E8D0');
  };

  // A dead tree: bare black branches.
  outdoor['&'] = (g, x, y) => {
    ellipse(g, x + 9, y + 15, 5, 1, '#1A1410');
    box(g, x + 7, y + 4, 3, 12, '#2A2024');
    box(g, x + 7, y + 4, 1, 12, '#3E3438');
    for (const [bx, by, dx] of [
      [7, 7, -1],
      [9, 5, 1],
      [8, 9, 1],
      [7, 3, -1],
    ])
      for (let k = 0; k < 5; k++) put(g, x + bx + dx * k, y + by - Math.floor(k / 2), '#2A2024');
  };

  // The guard post, drawn once: a squat watchtower, crenellated, a brazier burning on its roof,
  // and a striped barrier arm across the front.
  outdoor.i = (g, x, y, m) => {
    if (m.at(-1, 0) === 'i' || m.at(0, -1) === 'i') return;
    const ext = extent(m, 'i');
    const top = y + 12;
    for (let j = 0; j < 5; j++)
      for (let i = 3; i < ext.w + 5; i++) {
        const py = y + ext.h + j - 2;
        if (g[py]?.[x + i]) g[py][x + i] = mixC(g[py][x + i], '#08060A', 0.4 - j * 0.07);
      }
    masonry(g, x, top + 8, ext.w, ext.h - top + y - 8, 6);
    battlements(g, x, top, ext.w, false);
    brazier(g, x + ext.w / 2 - 4, top - 6);
    slit(g, x + 8, top + 16);
    slit(g, x + ext.w - 10, top + 16);
    // a black doorway, and the duty board beside it
    box(g, x + ext.w / 2 - 5, y + ext.h - 15, 10, 15, ST.outline);
    box(g, x + ext.w / 2 - 4, y + ext.h - 14, 8, 14, '#0C0A0E');
    box(g, x + 4, y + ext.h - 14, 7, 6, '#6A4A2E');
    box(g, x + 5, y + ext.h - 13, 5, 1, '#E0D4B8');
    box(g, x + 5, y + ext.h - 11, 4, 1, '#E0D4B8');
  };

  // A soldier down on the training sand: flat on his back, helmet rolled off, sword dropped.
  outdoor.t = (g, x, y) => {
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) put(g, x + i, y + j, hash(x + i, y + j, 91) < 0.3 ? '#B8985E' : '#C8A870');
    ellipse(g, x + 8, y + 12, 7, 2, '#8A6A40');
    box(g, x + 3, y + 8, 9, 4, '#7A7A84'); // breastplate
    box(g, x + 3, y + 8, 9, 1, '#9A9AA4');
    box(g, x + 5, y + 9, 4, 3, '#9A2A22'); // tabard
    box(g, x + 12, y + 9, 3, 1, '#4A3A30'); // legs
    box(g, x + 12, y + 11, 3, 1, '#4A3A30');
    box(g, x, y + 8, 3, 3, '#E8C8A0'); // head
    put(g, x + 1, y + 9, '#2A1C14');
    ellipse(g, x + 3, y + 4, 2, 2, '#7A7A84'); // the helmet, rolled away
    put(g, x + 3, y + 3, '#9A9AA4');
    box(g, x + 7, y + 14, 8, 1, '#A0A0AA'); // the sword
    box(g, x + 6, y + 13, 1, 3, '#5A3E28');
    // little stars over him
    put(g, x + 1, y + 5, '#F0E070');
    put(g, x + 4, y + 6, '#F0E070');
  };

  // ---- inside the castle (dungeon style)
  const inside = {};

  // The red carpet down the hall: deep red, a gold border, a row of gold diamonds down the middle.
  inside['='] = (g, x, y, m) => {
    // a runner one tile tall, along a corridor: the same carpet, turned
    if (m.at(0, -1) !== '=' && m.at(0, 1) !== '=' && (m.at(-1, 0) === '=' || m.at(1, 0) === '=')) {
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          let c = (x + i + y + j) % 3 === 0 ? '#741618' : '#7E1A1C';
          if (j < 2 || j > 13) c = '#C8963A';
          else if (j === 2 || j === 13) c = '#4A0C0E';
          else if (j === 4 || j === 11) c = '#A07028';
          put(g, x + i, y + j, c);
        }
      for (let k = -3; k <= 3; k++) {
        const half = 3 - Math.abs(k);
        box(g, x + 8 + k, y + 8 - half, 1, half * 2 + 1, k === 0 ? '#E8C060' : '#C8963A');
      }
      if (m.at(-1, 0) !== '=') box(g, x, y, 2, TILE, '#C8963A');
      if (m.at(1, 0) !== '=') box(g, x + 14, y, 2, TILE, '#C8963A');
      return;
    }
    const L = m.at(-1, 0) !== '=';
    const R = m.at(1, 0) !== '=';
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        let c = (x + i + y + j) % 3 === 0 ? '#741618' : '#7E1A1C';
        if ((L && i < 2) || (R && i > 13)) c = '#C8963A';
        else if ((L && i === 2) || (R && i === 13)) c = '#4A0C0E';
        else if ((L && i === 4) || (R && i === 11)) c = '#A07028';
        put(g, x + i, y + j, c);
      }
    // the diamonds run down the carpet's middle, wherever the middle is
    let left = 0;
    while (m.at(-left - 1, 0) === '=') left++;
    let right = 0;
    while (m.at(right + 1, 0) === '=') right++;
    const mid = ((left + right + 1) * TILE) / 2 - left * TILE;
    if (mid >= -4 && mid <= TILE + 4)
      for (let k = -3; k <= 3; k++) {
        const half = 3 - Math.abs(k);
        box(g, x + Math.round(mid) - half, y + 8 + k, half * 2 + 1, 1, k === 0 ? '#E8C060' : '#C8963A');
      }
    if (m.at(0, -1) !== '=' && m.at(0, -1) !== 'Y') box(g, x, y, TILE, 2, '#C8963A');
  };

  // A rug: deep blue-black wool, a red and gold border round its edge, a little pattern inside.
  inside.h = (g, x, y, m) => {
    // furniture stands on the rug, so only bare floor and walls make an edge
    const bare = (c) => '.,=W#%U'.includes(c);
    const edge = { l: bare(m.at(-1, 0)), r: bare(m.at(1, 0)), t: bare(m.at(0, -1)), b: bare(m.at(0, 1)) };
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) {
        let c = (i + j) % 8 === 0 || (i - j + 16) % 8 === 0 ? '#3A2A44' : '#2A1E34';
        const d = Math.min(edge.l ? i : 9, edge.r ? 15 - i : 9, edge.t ? j : 9, edge.b ? 15 - j : 9);
        if (d === 0) c = '#14101A';
        else if (d < 3) c = '#8A1A1C';
        else if (d === 3) c = '#C8963A';
        put(g, x + i, y + j, c);
      }
  };

  // A pillar: fluted black stone, a gold band, a heavy capital and base, lit on its left.
  inside.I = (g, x, y) => {
    ellipse(g, x + 10, y + 15, 8, 2, '#0A080C');
    box(g, x, y + 10, 16, 6, '#2A2632');
    box(g, x, y + 10, 16, 1, '#6A6676');
    box(g, x + 1, y + 8, 14, 2, '#3A3644');
    for (let j = -14; j < 8; j++)
      for (let i = 2; i < 14; i++) {
        const t = (i - 2) / 12;
        let c = mixC('#16121C', '#5A5666', roundLight(t));
        if ((i - 2) % 3 === 2) c = mixC(c, '#0A080E', 0.45); // flutes
        put(g, x + i, y + j, c);
      }
    box(g, x + 2, y - 4, 12, 2, '#C8963A');
    box(g, x + 2, y - 4, 4, 1, '#E8C060');
    box(g, x, y - 18, 16, 4, '#3A3644');
    box(g, x, y - 18, 16, 1, '#6A6676');
    box(g, x + 1, y - 14, 14, 1, '#0A080E');
    box(g, x, y - 18, 1, 4, ST.outline);
    box(g, x + 15, y - 18, 1, 4, ST.outline);
  };

  // The winding stair, drawn once across its block: a round stairwell walled in stone, the steps
  // spiralling up round a central post and vanishing into the dark above, a gold handrail, and a
  // way in at the foot (the block's door tile).
  inside.U = (g, x, y, m) => {
    if (m.at(-1, 0) === 'U' || m.at(0, -1) === 'U') return;
    const ext = extent(m, 'U');
    const cx = x + ext.w / 2;
    const cy = y + ext.h / 2 - 5;
    const R = Math.min(ext.w, ext.h) / 2 - 1;
    const Rin = R - 5;
    const post = 4;
    ellipse(g, cx + 4, cy + 6, R + 1, R - 2, '#08060A');
    // the tower's front: the ring's lower half stands up out of the floor as a wall, so it reads as a
    // tower you walk into, not a hole
    const wallH = 8;
    for (let i = -R; i <= R; i++) {
      const rim = Math.round(cy + Math.sqrt(Math.max(0, R * R - i * i)));
      for (let j = 0; j < wallH; j++) {
        const t = (i + R) / (2 * R);
        let c = mixC('#14101A', '#5A5666', roundLight(t));
        if (j % 4 === 3) c = mixC(c, '#0A080E', 0.5);
        if ((i + Math.floor(j / 4) * 3 + 40) % 7 === 0) c = mixC(c, '#0A080E', 0.4);
        put(g, Math.round(cx + i), rim + j - wallH + 2, c);
      }
    }
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) {
        const d = Math.hypot(i, j);
        if (d > R) continue;
        const px = Math.round(cx + i);
        const py = Math.round(cy + j);
        if (d > Rin) {
          // the stairwell's wall: stone courses round the ring, lit top-left
          const a = Math.atan2(j, i);
          const lit = Math.max(0, -Math.cos(a + Math.PI / 4));
          const block = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 18) + Math.floor(d) * 7;
          let c = mixC('#24202C', '#5E5A6A', lit * 0.8 + 0.1);
          if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 36) % 2 === 0 && Math.floor(d) === Math.floor(Rin) + 2)
            c = '#14101A';
          if (block % 5 === 0 && d > R - 1) c = mixC(c, '#0A080E', 0.4);
          if (d > R - 1) c = mixC(c, ST.outline, 0.6);
          put(g, px, py, c);
          continue;
        }
        if (d <= post) {
          const lit = Math.max(0, (-i - j) / (post * 1.6) + 0.3);
          put(g, px, py, mixC('#2A2632', '#8A8696', Math.min(1, lit)));
          continue;
        }
        // the steps: 14 wedges round the turn, each a little higher (lighter) than the one before,
        // the last few lost in the dark going up
        const a = (Math.atan2(j, i) + Math.PI * 2.5) % (Math.PI * 2); // 0 at the bottom, clockwise
        const step = Math.floor((a / (Math.PI * 2)) * 14);
        const into = (a / (Math.PI * 2)) * 14 - step;
        let c = mixC('#3A3644', '#7A7686', step / 13);
        if (into < 0.12)
          c = '#14101A'; // each step's riser
        else if (into > 0.85) c = mixC(c, '#14101A', 0.3);
        if (step >= 11) c = mixC(c, '#060408', (step - 10) / 4 + 0.15);
        if (Math.abs(d - (post + 1)) < 0.6) c = mixC(c, '#14101A', 0.4);
        put(g, px, py, c);
      }
    // the handrail, gold, just inside the wall
    for (let k = 0; k < 220; k++) {
      const a = (k / 220) * Math.PI * 2;
      const px = Math.round(cx + Math.cos(a) * (Rin - 1));
      const py = Math.round(cy + Math.sin(a) * (Rin - 1));
      const dark = Math.sin(a) < -0.6 && Math.cos(a) > -0.2;
      put(g, px, py, dark ? '#6A4A1C' : '#C8963A');
    }
    // the way in, at the foot: the wall opens onto the first step
    for (const col of ext.doors) {
      const dx = x + col * TILE;
      box(g, dx + 2, y + ext.h - 8, 12, 8, '#3A3644');
      box(g, dx + 2, y + ext.h - 8, 12, 1, '#14101A');
      box(g, dx + 2, y + ext.h - 4, 12, 1, '#14101A');
      box(g, dx, y + ext.h - 10, 2, 10, '#5E5A6A');
      box(g, dx + 14, y + ext.h - 10, 2, 10, '#24202C');
    }
  };

  // A canopy bed: dark wood posts, red velvet, a gold-trimmed pillow.
  inside.Q = (g, x, y) => {
    ellipse(g, x + 9, y + 15, 7, 2, '#100C0E');
    box(g, x + 1, y + 1, 14, 14, '#3A2418');
    box(g, x + 2, y + 2, 12, 12, '#8A1A1C');
    box(g, x + 2, y + 2, 12, 3, '#E8E0D0');
    box(g, x + 2, y + 5, 12, 1, ST.gold);
    for (const [px, py] of [
      [1, 0],
      [14, 0],
      [1, 14],
      [14, 14],
    ])
      box(g, x + px, y + py - 3, 1, 4, '#2A1810');
    for (let i = 3; i < 14; i += 3) box(g, x + i, y + 8, 1, 6, '#6A1416');
  };

  // A tea table, set for five, everyone's cup half full.
  inside.n = (g, x, y) => {
    ellipse(g, x + 9, y + 14, 6, 2, '#100C0E');
    ellipse(g, x + 8, y + 9, 7, 5, '#5A3A22');
    ellipse(g, x + 8, y + 8, 6, 4, '#7A5232');
    for (const [cx, cy] of [
      [4, 7],
      [8, 6],
      [12, 7],
      [6, 10],
      [10, 10],
    ]) {
      box(g, cx + x, cy + y, 2, 2, '#E8E0D0');
      put(g, cx + x, cy + y, '#8A5A3A');
    }
  };

  // A wardrobe, tall and carved.
  inside.w = (g, x, y) => {
    box(g, x + 1, y - 8, 14, 23, '#2A1810');
    box(g, x + 2, y - 7, 12, 21, '#4A2E1E');
    box(g, x + 7, y - 7, 1, 21, '#2A1810');
    put(g, x + 6, y + 3, ST.gold);
    put(g, x + 9, y + 3, ST.gold);
    box(g, x + 2, y - 7, 12, 1, '#6A4430');
  };

  // A vanity: a gilt mirror over a little table of pots.
  inside.y = (g, x, y) => {
    box(g, x + 2, y + 9, 12, 6, '#5A3A22');
    box(g, x + 2, y + 9, 12, 1, '#7A5232');
    ellipse(g, x + 8, y + 3, 5, 6, ST.gold);
    ellipse(g, x + 8, y + 3, 4, 5, '#9AB0C8');
    put(g, x + 6, y + 1, '#E0ECF8');
    box(g, x + 4, y + 7, 2, 2, '#C86A8A');
    box(g, x + 10, y + 7, 2, 2, '#6A8AC8');
  };

  // A chessboard on a little table, one piece missing (Felix's room).
  inside.z = (g, x, y) => {
    ellipse(g, x + 9, y + 14, 6, 2, '#100C0E');
    box(g, x + 2, y + 4, 12, 10, '#3A2418');
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 8; i++) put(g, x + 4 + i, y + 5 + j, (i + j) % 2 ? '#E8E0D0' : '#2A2020');
    box(g, x + 5, y + 6, 1, 2, '#C8963A');
    box(g, x + 10, y + 10, 1, 2, '#8A1A1C');
  };

  // A child's cot, dusty, a little wooden sword laid in it (the old nursery).
  inside.K = (g, x, y) => {
    ellipse(g, x + 9, y + 15, 6, 1, '#100C0E');
    box(g, x + 2, y + 3, 12, 11, '#6A4A2E');
    box(g, x + 3, y + 4, 10, 9, '#A8A090');
    for (let i = 2; i < 15; i += 3) box(g, x + i, y + 1, 1, 13, '#5A3A22');
    box(g, x + 5, y + 7, 7, 1, '#8A6A40');
    box(g, x + 6, y + 6, 1, 3, '#5A3A22');
    for (let i = 0; i < 6; i++)
      put(g, x + 3 + Math.floor(hash(x, y, i) * 10), y + 4 + Math.floor(hash(y, x, i) * 9), '#8A8478');
  };

  // A writing desk with an open journal and a quill.
  inside.D = (g, x, y) => {
    ellipse(g, x + 9, y + 15, 7, 1, '#100C0E');
    box(g, x + 1, y + 6, 14, 8, '#4A2E1E');
    box(g, x + 1, y + 6, 14, 1, '#6A4430');
    box(g, x + 4, y + 7, 8, 5, '#E8E0C8');
    box(g, x + 8, y + 7, 1, 5, '#B8B098');
    for (let j = 8; j < 12; j += 1) box(g, x + 5, y + j, 2, 1, '#6A6050');
    box(g, x + 12, y + 3, 1, 6, '#E8E8F0');
  };

  // The war council's table (author, Oct 7, 2026): a map of the eight kingdoms, the Mage Kingdom's border inked in
  // red, little carved soldiers pushed up against it, and a dagger stuck in the middle. Drawn once across its block:
  // heavy black oak with a lit rim, the map pinned flat on it, the table's shadow pooled on the marble beneath.
  inside.T = (g, x, y, m) => {
    if (m.at(-1, 0) === 'T' || m.at(0, -1) === 'T') return;
    const { w, h } = extent(m, 'T');
    const top = h - 8; // the tabletop; the apron and legs below it
    // the shadow on the floor, down and to the right
    for (let j = top; j < h + 3; j++)
      for (let i = 2; i < w + 3; i++) tint?.(g, x + i, y + j, 0.55 - Math.max(0, j - h) * 0.12);
    // legs and the apron's front, in shade
    for (const lx of [2, w - 6]) {
      box(g, x + lx, y + top, 4, 8, '#1A100A');
      box(g, x + lx + 1, y + top, 2, 7, '#3A2416');
      put(g, x + lx + 1, y + top, '#5A3A22');
    }
    box(g, x, y + top, w, 3, '#24160C');
    box(g, x, y + top, w, 1, '#3A2416');
    box(g, x - 1, y + top, 1, 3, ST.outline);
    box(g, x + w, y + top, 1, 3, ST.outline);
    // the top: an outline, a lit rim on the top and left, the far right in shade
    box(g, x - 1, y - 1, w + 2, top + 1, ST.outline);
    box(g, x, y, w, top, '#3A2416');
    box(g, x, y, w, 1, '#7A5232');
    box(g, x, y, 1, top, '#6A4430');
    box(g, x + w - 1, y + 1, 1, top - 1, '#24160C');
    box(g, x + 1, y + top - 1, w - 2, 1, '#2A1A0E');
    for (let i = 2; i < w - 2; i++) if (hash(x + i, y, 64) < 0.25) put(g, x + i, y + 1 + (i % 2), '#4A2E1E');
    // the map: parchment, the land a shade warmer than the sea, a dark line round every coast
    const mx = x + 4;
    const my = y + 3;
    const mw = w - 8;
    const mh = top - 6;
    const cell = 6;
    const noise = (px, py) => {
      const gx = px / cell;
      const gy = py / cell;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = gx - ix;
      const fy = gy - iy;
      const v = (a, b) => hash(a, b, 65);
      const top2 = v(ix, iy) * (1 - fx) + v(ix + 1, iy) * fx;
      const bot = v(ix, iy + 1) * (1 - fx) + v(ix + 1, iy + 1) * fx;
      return top2 * (1 - fy) + bot * fy;
    };
    const land = (i, j) => {
      const dx = (i - mw / 2) / (mw / 2);
      const dy = (j - mh / 2) / (mh / 2);
      return 1 - (dx * dx * 0.7 + dy * dy * 0.8) + (noise(i, j) - 0.5) * 1.1 > 0.3;
    };
    for (let j = 0; j < mh; j++)
      for (let i = 0; i < mw; i++) {
        const on = land(i, j);
        let c = on ? '#E2D2A2' : '#A8B4A0';
        if (on && (!land(i - 1, j) || !land(i + 1, j) || !land(i, j - 1) || !land(i, j + 1))) c = '#6A4E30';
        else if (!on && (i + j * 2) % 7 === 0) c = '#94A08E'; // the sea's little waves
        else if (on && hash(mx + i, my + j, 66) < 0.04) c = '#C8B888';
        put(g, mx + i, my + j, c);
      }
    // the parchment's edge: a lit top, a curled shaded corner, a pin in each corner
    box(g, mx, my, mw, 1, '#F0E4C0');
    box(g, mx + mw - 1, my, 1, mh, '#A89870');
    box(g, mx, my + mh - 1, mw, 1, '#A89870');
    for (const [px, py] of [[1, 1], [mw - 2, 1], [1, mh - 2], [mw - 2, mh - 2]]) put(g, mx + px, my + py, '#8A1A1A');
    // the old borders between the kingdoms, dotted in brown
    for (const bx of [0.24, 0.45]) {
      for (let j = 2; j < mh - 2; j++) {
        const i = Math.round(mw * bx + Math.sin(j * 0.7 + bx * 9) * 2);
        if (j % 2 === 0 && land(i, j)) put(g, mx + i, my + j, '#7A5A3A');
      }
    }
    for (let i = 2; i < mw * 0.62; i++) {
      const j = Math.round(mh * 0.55 + Math.sin(i * 0.4) * 1.5);
      if (i % 2 === 0 && land(i, j)) put(g, mx + i, my + j, '#7A5A3A');
    }
    // the Mage Kingdom's border, inked thick in red
    const redAt = (j) => Math.round(mw * 0.68 + Math.sin(j * 0.35) * 1.5);
    for (let j = 1; j < mh - 1; j++) {
      put(g, mx + redAt(j), my + j, '#A82020');
      put(g, mx + redAt(j) + 1, my + j, '#7A1414');
    }
    // little carved soldiers pushed up against it, each with its shadow
    for (let k = 0; k < 6; k++) {
      const j = 2 + Math.floor((k * (mh - 6)) / 5);
      const i = redAt(j) - 3 - (k % 2) * 3;
      put(g, mx + i + 2, my + j + 3, '#8A7A58');
      box(g, mx + i, my + j + 1, 2, 2, '#2A2A30');
      put(g, mx + i, my + j + 1, '#5A5A66');
      put(g, mx + i, my + j, '#8A1A1A');
      put(g, mx + i + 1, my + j, '#5A0E10');
    }
    // the dagger, stuck point-down in the middle of the map
    const dx = mx + Math.round(mw * 0.42);
    const dy = my + Math.round(mh * 0.3);
    for (let k = 1; k < 4; k++) put(g, dx + k + 1, dy + 3 + k, '#8A7A58');
    box(g, dx, dy - 4, 1, 7, '#C8C8D4');
    box(g, dx + 1, dy - 4, 1, 7, '#7A7A88');
    put(g, dx, dy - 4, '#F4F4FA');
    box(g, dx - 2, dy - 5, 6, 1, ST.gold);
    put(g, dx - 2, dy - 5, '#E8C060');
    box(g, dx, dy - 8, 2, 3, '#4A2E1E');
    put(g, dx, dy - 9, ST.gold);
  };
  // A hearth in the wall, burning low.
  inside.F = (g, x, y, m) => {
    wall?.(g, x, y, m);
    box(g, x + 1, y + 2, 14, 14, '#4A4650');
    box(g, x + 1, y + 2, 14, 2, '#6A6470');
    box(g, x + 3, y + 5, 10, 11, '#0C0A0E');
    box(g, x + 4, y + 12, 8, 3, ST.ember);
    box(g, x + 6, y + 10, 4, 2, ST.glow);
  };

  return { outdoor, inside };
}

/** The scorched grounds around the castle: grass gone the colour of ash. */
export const ASH = {
  grass: ['#4A4838', '#444232', '#504E3C'],
  blade: '#5E5C46',
  grassDark: '#36342A',
  flower: ['#6A5A40', '#5A4A3A', '#7A3A2A'],
};
