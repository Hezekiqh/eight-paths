// Warrior City's buildings (author, Oct 3, 2026): each its own look, drawn once across its whole
// block of tiles from its top-left tile, like Kaldor's statue. A building's letter fills its block;
// its door is a different letter somewhere on the bottom row (the doorway out of the map), which
// the building draws itself. Pixel art in the World's palette, lit from the upper left.

const TILE = 16;

/** The block a building covers, from its top-left tile: width along the top row, height down the left column. */
function extent(m, letter) {
  let w = 1;
  while (m.at(w, 0) === letter) w++;
  let h = 1;
  while (m.at(0, h) === letter) h++;
  // the door: tiles on the bottom row that aren't the building's letter
  const doors = [];
  for (let i = 0; i < w; i++) if (m.at(i, h - 1) !== letter) doors.push(i);
  return { w: w * TILE, h: h * TILE, doors };
}

export function cityArt({ box, put, ellipse, hash }) {
  const shade = (g, x, y, w, h, alpha = 0.35) => {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const c = g[y + j]?.[x + i];
        if (c) g[y + j][x + i] = [c[0] * (1 - alpha), c[1] * (1 - alpha), c[2] * (1 - alpha)].map(Math.round);
      }
  };
  /** A wooden door with a frame and a ring, `dw` tiles wide, at tile column `col` of the bottom row. */
  const door = (g, x, y, ext, wood = '#6A4428', frame = '#3A2618', tall = 22) => {
    // a full-height door (`tall` pixels), a stone lintel over it, a step at its foot
    for (const col of ext.doors) {
      const dx = x + col * TILE;
      const top = y + ext.h - tall - 1;
      box(g, dx, top - 3, 16, 3, '#8A8280');
      box(g, dx + 2, top - 4, 12, 1, '#ACA5A0');
      box(g, dx + 1, top, 14, tall, frame);
      box(g, dx + 2, top + 1, 12, tall - 1, wood);
      put(g, dx + 2, top + 1, frame);
      put(g, dx + 13, top + 1, frame);
      for (let i = 5; i < 13; i += 3) box(g, dx + i, top + 2, 1, tall - 2, mixC(wood, '#000000', 0.3));
      box(g, dx + 2, top + Math.round(tall * 0.3), 12, 1, mixC(wood, '#000000', 0.3));
      box(g, dx + 2, top + Math.round(tall * 0.7), 12, 1, mixC(wood, '#000000', 0.3));
      put(g, dx + 11, top + Math.round(tall * 0.55), '#C8963A');
      put(g, dx + 11, top + Math.round(tall * 0.55) + 1, '#8A6420');
      box(g, dx - 1, y + ext.h - 1, 18, 2, '#8A8280');
    }
  };

  const mixC = (c, d, k) => {
    const a = typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c;
    const b = typeof d === 'string' ? [1, 3, 5].map((i) => parseInt(d.slice(i, i + 2), 16)) : d;
    return a.map((v, i) => Math.round(v + (b[i] - v) * k));
  };
  /**
   * A pitched roof seen from above and in front, over the top `rows` pixels: the far slope (lit),
   * the ridge, the near slope (in shade) in staggered shingles, gable ends at each side, eaves
   * overhanging the wall by 2 with their shadow beneath, and a dark outline.
   */
  const roof = (g, x, y, w, rows, c, dark, light, opts = {}) => {
    const far = Math.max(4, Math.round(rows * 0.38));
    const ox = x - 2;
    const ow = w + 4;
    for (let j = 0; j < rows; j++) {
      const nearSide = j >= far;
      // gable ends: the slopes pull in at the sides toward the ridge
      const inset = nearSide ? 0 : Math.round(((far - j) / far) * 3);
      const base = nearSide ? c : light;
      for (let i = inset; i < ow - inset; i++) {
        const row = nearSide ? Math.floor((j - far) / 4) : Math.floor(j / 3);
        const seam = nearSide ? ((i + (row % 2) * 4) % 8 === 0) : ((i + (row % 2) * 3) % 6 === 0);
        const rowLine = nearSide ? (j - far) % 4 === 3 : j % 3 === 2;
        let col = base;
        if (rowLine || seam) col = nearSide ? dark : c;
        // the near slope darkens toward the eaves, the far slope lightens toward the ridge
        if (nearSide && j > rows - 4) col = dark;
        if (i <= inset || i >= ow - inset - 1) col = '#1E1816';
        put(g, ox + i, y + j, col);
      }
    }
    // the ridge
    box(g, ox + 3, y + far - 1, ow - 6, 1, mixC(light, '#FFFFFF', 0.25));
    box(g, ox + 3, y + far, ow - 6, 1, dark);
    // outline top and eaves edge
    box(g, ox + 3, y, ow - 6, 1, '#1E1816');
    box(g, ox, y + rows - 1, ow, 1, '#1E1816');
    // a chimney, if asked for
    if (opts.chimney) {
      const cx = ox + Math.round(ow * opts.chimney);
      box(g, cx, y - 6, 6, far + 4, '#7A5A4A');
      box(g, cx - 1, y - 7, 8, 2, '#4A3A34');
      box(g, cx + 4, y - 6, 2, far + 4, '#5A4238');
      box(g, cx, y + far - 2, 6, 1, '#1E1816');
    }
    // the eaves' shadow on the wall below
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < w; i++) {
        const px = x + i;
        const py = y + rows + j;
        const cur = g[py]?.[px];
        if (cur) g[py][px] = mixC(cur, '#000000', 0.45 - j * 0.13);
      }
  };
  /** A building's footprint: its shadow on the ground (down and to the right), and a dark outline round the walls. */
  const ground = (g, x, y, w, h, wallTop) => {
    for (let j = 2; j < 7; j++)
      for (let i = 4; i < w + 5; i++) {
        const cur = g[y + h + j - 3]?.[x + i];
        if (cur && (j > 2 || i > w)) g[y + h + j - 3][x + i] = mixC(cur, '#101810', 0.35);
      }
    for (let j = wallTop; j < h; j++) {
      put(g, x - 1, y + j, '#1E1816');
      put(g, x + w, y + j, '#1E1816');
    }
    box(g, x - 1, y + h, w + 2, 1, '#1E1816');
  };
  /** A stone plinth along the foot of a wall, and darker corners. */
  const footing = (g, x, y, w, h, wallTop) => {
    box(g, x, y + h - 4, w, 4, '#6A6260');
    box(g, x, y + h - 4, w, 1, '#8A8280');
    for (let i = 0; i < w; i += 7) box(g, x + i, y + h - 3, 1, 3, '#4A4442');
    box(g, x, y + wallTop, 2, h - wallTop, mixC(g[y + wallTop + 2]?.[x + 3] ?? [100, 90, 80], '#000000', 0.25));
    box(g, x + w - 3, y + wallTop, 3, h - wallTop, mixC(g[y + wallTop + 2]?.[x + w - 5] ?? [100, 90, 80], '#000000', 0.3));
  };
  /** A window: a frame, glass, and the glint of light in the corner. */
  const win = (g, x, y, w = 7, h = 7, glass = '#6A8AB0', frame = '#3A2618') => {
    box(g, x - 1, y - 1, w + 2, h + 2, frame);
    box(g, x, y, w, h, glass);
    box(g, x + Math.floor(w / 2), y, 1, h, frame);
    put(g, x + 1, y + 1, '#C8D8F0');
  };

  const art = {};

  // The Kaloseum: a great oval of tiered stone, sand in the middle, arches round its front wall,
  // and the Crown's banners on the rim.
  art.C = (g, x, y, m) => {
    if (m.at(-1, 0) === 'C' || m.at(0, -1) === 'C') return;
    const ext = extent(m, 'C');
    const face = 44;
    const rx = ext.w / 2 - 3;
    const ry = (ext.h - face - 6) / 2;
    const cx = x + ext.w / 2;
    const cy = y + ry + 3;
    // its shadow
    ellipse(g, cx + 6, cy + face + 4, rx, ry * 0.6, [26, 38, 22]);
    // the front wall, hanging below the near rim
    for (let i = -rx; i <= rx; i++) {
      const rim = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - (i * i) / (rx * rx))));
      for (let j = 0; j < face; j++) {
        const px = cx + i;
        const py = rim + j;
        const band = j < 3 || (j > 20 && j < 23) || j > face - 3;
        let c = band ? '#8A8280' : (Math.floor(py / 5) + Math.floor(px / 9)) % 2 ? '#6A6260' : '#726A66';
        // the arches: a row of tall dark openings, upper and lower
        const k = ((px - cx + 1000) % 22);
        if ((j > 5 && j < 19 && k > 6 && k < 15) || (j > 25 && j < face - 4 && k > 5 && k < 16)) c = '#1E1816';
        if ((j === 6 || j === 26) && k > 7 && k < 14) c = '#1E1816';
        // light on the left of the curve, shade on the right
        if (i > rx * 0.55) c = band ? '#6A6260' : c === '#1E1816' ? c : '#5A5250';
        put(g, px, py, c);
      }
    }
    // the rim and the tiers inside, then the sand
    ellipse(g, cx, cy, rx, ry, '#8A8280');
    ellipse(g, cx, cy, rx - 4, ry - 3, '#5A5250');
    for (let t = 0; t < 4; t++) ellipse(g, cx, cy + 2, rx - 8 - t * 9, ry - 6 - t * 6, t % 2 ? '#726A66' : '#625A56');
    ellipse(g, cx, cy + 4, rx - 46, ry - 30, '#C8A870');
    for (let i = 0; i < 260; i++) {
      const a = hash(i, 3, 41) * Math.PI * 2;
      const r = Math.sqrt(hash(i, 4, 41));
      put(g, cx + Math.cos(a) * (rx - 48) * r, cy + 4 + Math.sin(a) * (ry - 32) * r, hash(i, 5, 41) < 0.5 ? '#B8985E' : '#D8B880');
    }
    // the crowd in the stands: specks of colour on the tiers
    for (let i = 0; i < 420; i++) {
      const a = hash(i, 6, 43) * Math.PI * 2;
      const r = 0.62 + hash(i, 7, 43) * 0.3;
      if (Math.sin(a) > 0.55) continue;
      put(g, cx + Math.cos(a) * rx * r, cy + 2 + Math.sin(a) * ry * r, ['#B04030', '#C8963A', '#4A6AA0', '#E0D4B8', '#3A5A2C'][i % 5]);
    }
    // banners round the rim, red with a gold fist
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      const bx = Math.round(cx + Math.cos(a) * (rx - 1));
      const by = Math.round(cy + Math.sin(a) * (ry - 1));
      box(g, bx, by - 14, 1, 14, '#3A2618');
      box(g, bx + 1, by - 14, 6, 8, '#9A2A22');
      put(g, bx + 3, by - 11, '#C8963A');
      put(g, bx + 4, by - 11, '#C8963A');
    }
    // the great gate, an arch over the door tiles
    if (ext.doors.length) {
      const gx = x + ext.doors[0] * TILE - 4;
      const gw = ext.doors.length * TILE + 8;
      const gy = y + ext.h - 30;
      box(g, gx - 2, gy - 4, gw + 4, 34, '#8A8280');
      box(g, gx, gy, gw, 30, '#1E1816');
      ellipse(g, gx + gw / 2, gy, gw / 2, 5, '#1E1816');
      box(g, gx + 2, gy + 6, gw - 4, 1, '#3A3230');
      // the portcullis, raised
      for (let i = gx + 3; i < gx + gw - 2; i += 4) box(g, i, gy - 2, 1, 7, '#4A4442');
    }
  };

  // The chapel: grey stone, a steep slate roof, a bell tower, and a round window of coloured glass.
  art.P = (g, x, y, m) => {
    if (m.at(-1, 0) === 'P' || m.at(0, -1) === 'P') return;
    const ext = extent(m, 'P');
    const body = Math.round(ext.h * 0.5);
    box(g, x, y + ext.h - body, ext.w, body, '#8A8280');
    for (let j = ext.h - body; j < ext.h; j += 5) box(g, x, y + j, ext.w, 1, '#6A6260');
    shade(g, x + ext.w - 6, y + ext.h - body, 6, body);
    ground(g, x, y, ext.w, ext.h, ext.h - body);
    footing(g, x, y, ext.w, ext.h, ext.h - body);
    roof(g, x, y + 10, ext.w, ext.h - body - 10, '#4A4A5A', '#34343E', '#62627A');
    // the bell tower, rising out of the ridge: stone, a belfry with its bell, a pointed spire
    const tw = 18;
    const tx = Math.round(x + ext.w / 2 - tw / 2);
    const roofTop = y + 10;
    const ridge = roofTop + Math.max(4, Math.round((ext.h - body - 10) * 0.38));
    const tTop = y - 4;
    box(g, tx, tTop, tw, ridge - tTop + 2, '#8A8280');
    for (let j = tTop; j < ridge + 2; j += 5) box(g, tx, j, tw, 1, '#76706C');
    box(g, tx + tw - 4, tTop, 4, ridge - tTop + 2, '#6A6260');
    box(g, tx - 1, tTop, 1, ridge - tTop + 2, '#1E1816');
    box(g, tx + tw, tTop, 1, ridge - tTop + 2, '#1E1816');
    // the belfry: an arched opening, the bell inside
    box(g, tx + 5, tTop + 5, 8, 10, '#1E1816');
    ellipse(g, tx + 9, tTop + 5, 4, 2, '#1E1816');
    ellipse(g, tx + 9, tTop + 11, 3, 3, '#C8963A');
    put(g, tx + 8, tTop + 10, '#F0D07A');
    box(g, tx - 2, tTop + 16, tw + 4, 2, '#ACA5A0');
    // the spire, lit on the left
    const sh = 18;
    for (let k = 0; k < sh; k++) {
      const half = Math.round((tw / 2 + 2) * (k / sh));
      const cy = tTop - sh + k;
      box(g, tx + tw / 2 - half, cy, half, 1, '#62627A');
      box(g, tx + tw / 2, cy, half, 1, '#34343E');
      put(g, tx + tw / 2 - half - 1, cy, '#1E1816');
      put(g, tx + tw / 2 + half, cy, '#1E1816');
    }
    box(g, tx + tw / 2 - 1, tTop - sh - 5, 2, 5, '#C8963A');
    // its shadow across the roof's near slope
    shade(g, tx + tw, ridge, 8, ext.h - body - (ridge - y), 0.3);
    // the rose window
    const wy = y + ext.h - body + 7;
    ellipse(g, x + ext.w / 2, wy, 7, 6, '#3A2618');
    for (let a = 0; a < 6; a++)
      ellipse(g, x + ext.w / 2 + Math.cos(a) * 3, wy + Math.sin(a) * 3, 2, 2, ['#B04030', '#4A6AA0', '#C8963A', '#3A8A5A', '#8A4AA0', '#E0D4B8'][a]);
    win(g, x + 8, wy - 2, 5, 9, '#4A6AA0');
    win(g, x + ext.w - 14, wy - 2, 5, 9, '#B04030');
    door(g, x, y, ext);
  };

  // The library: warm sandstone, a pediment, four columns, and a great open book over the door.
  art.B = (g, x, y, m) => {
    if (m.at(-1, 0) === 'B' || m.at(0, -1) === 'B') return;
    const ext = extent(m, 'B');
    const top = 18;
    ground(g, x, y, ext.w, ext.h, top);
    box(g, x, y + top, ext.w, ext.h - top, '#C8B088');
    for (let j = top; j < ext.h; j += 6) box(g, x, y + j, ext.w, 1, '#B09870');
    // the roof behind, showing at either side of the pediment
    roof(g, x, y + 2, ext.w, top - 2, '#6A6A7A', '#4A4A5A', '#8A8A9A');
    // the pediment
    for (let j = 0; j < top; j++) {
      const half = Math.round((ext.w / 2 + 2) * (j / top));
      box(g, x + ext.w / 2 - half, y + j, half * 2, 1, j < 3 ? '#9A8460' : '#D8C098');
    }
    box(g, x - 2, y + top - 2, ext.w + 4, 3, '#9A8460');
    // a frieze under the pediment, with dentils
    box(g, x, y + top + 1, ext.w, 4, '#D8C8A8');
    for (let i = 1; i < ext.w; i += 4) box(g, x + i, y + top + 4, 2, 2, '#B09870');
    // tall arched windows between the columns
    const step = Math.max(14, Math.floor(ext.w / 5));
    for (let i = 6 + Math.floor(step / 2) + 2; i < ext.w - 10; i += step) {
      if (Math.abs(x + i + 3 - (x + ext.w / 2)) < 10) continue;
      box(g, x + i - 1, y + top + 10, 8, 18, '#5A4A3A');
      box(g, x + i, y + top + 11, 6, 17, '#4A6A90');
      ellipse(g, x + i + 3, y + top + 11, 3, 2, '#4A6A90');
      box(g, x + i + 3, y + top + 11, 1, 17, '#5A4A3A');
      put(g, x + i + 1, y + top + 13, '#A8C8E8');
      box(g, x + i - 2, y + top + 28, 10, 2, '#E8DCC0');
    }
    // columns
    for (let i = 6; i < ext.w - 4; i += step) {
      box(g, x + i, y + top + 2, 5, ext.h - top - 4, '#E8DCC0');
      box(g, x + i + 4, y + top + 2, 1, ext.h - top - 4, '#B09870');
      box(g, x + i - 1, y + top + 1, 7, 2, '#D8C8A8');
    }
    // the book sign, open
    const bx = x + ext.w / 2 - 9;
    box(g, bx, y + 6, 18, 9, '#3A2618');
    box(g, bx + 1, y + 7, 7, 7, '#F0E6CC');
    box(g, bx + 10, y + 7, 7, 7, '#F0E6CC');
    for (let j = 9; j < 14; j += 2) {
      box(g, bx + 2, y + j, 5, 1, '#8A7A64');
      box(g, bx + 11, y + j, 5, 1, '#8A7A64');
    }
    shade(g, x + ext.w - 4, y + top, 4, ext.h - top);
    // steps up to the door
    box(g, x + ext.w / 2 - 14, y + ext.h - 3, 28, 3, '#E8DCC0');
    box(g, x + ext.w / 2 - 14, y + ext.h - 1, 28, 1, '#B09870');
    door(g, x, y, ext, '#5A3A20');
  };

  // The adventurers' guild: timber over stone, a green roof, a shield banner, and the notice board.
  art.N = (g, x, y, m) => {
    if (m.at(-1, 0) === 'N' || m.at(0, -1) === 'N') return;
    const ext = extent(m, 'N');
    const wall = Math.round(ext.h * 0.55);
    box(g, x, y + ext.h - wall, ext.w, wall, '#7A6A54');
    for (let i = 0; i < ext.w; i += 8) box(g, x + i, y + ext.h - wall, 2, wall, '#4A3020');
    box(g, x, y + ext.h - 8, ext.w, 8, '#6A6260');
    ground(g, x, y, ext.w, ext.h, ext.h - wall);
    roof(g, x, y, ext.w, ext.h - wall, '#3A6A3A', '#2A4A2A', '#5A8A4A', { chimney: 0.8 });
    // the shield banner over the door
    const sx = x + ext.w / 2 - 6;
    const sy = y + ext.h - wall - 4;
    box(g, sx, sy, 12, 11, '#2A4A8A');
    box(g, sx + 2, sy + 11, 8, 2, '#2A4A8A');
    box(g, sx + 4, sy + 13, 4, 2, '#2A4A8A');
    box(g, sx + 5, sy + 2, 2, 9, '#C8963A');
    box(g, sx + 2, sy + 5, 8, 2, '#C8963A');
    // the notice board, crowded with jobs
    const nx = x + 6;
    const ny = y + ext.h - wall + 6;
    box(g, nx, ny, 18, 12, '#5A3A20');
    for (let k = 0; k < 6; k++) box(g, nx + 2 + (k % 3) * 5, ny + 2 + Math.floor(k / 3) * 5, 4, 4, k % 2 ? '#F0E6CC' : '#E0D4B8');
    win(g, x + ext.w - 18, ny + 1, 8, 8, '#C8A85A');
    door(g, x, y, ext);
  };

  // The hospital: clean white walls, a pale blue roof, curtained windows, and the healer's herb sign.
  art.V = (g, x, y, m) => {
    if (m.at(-1, 0) === 'V' || m.at(0, -1) === 'V') return;
    const ext = extent(m, 'V');
    const wall = Math.round(ext.h * 0.55);
    box(g, x, y + ext.h - wall, ext.w, wall, '#E8E4DC');
    box(g, x, y + ext.h - 3, ext.w, 3, '#B8B4AC');
    shade(g, x + ext.w - 5, y + ext.h - wall, 5, wall, 0.2);
    ground(g, x, y, ext.w, ext.h, ext.h - wall);
    footing(g, x, y, ext.w, ext.h, ext.h - wall);
    roof(g, x, y, ext.w, ext.h - wall, '#6A8AB0', '#4A6A90', '#8AAAD0');
    // the herb sign: a green leaf on a white disc
    const hx = x + ext.w / 2;
    const hy = y + ext.h - wall - 2;
    ellipse(g, hx, hy, 7, 6, '#F4F0EA');
    ellipse(g, hx, hy, 4, 3, '#3A8A5A');
    box(g, hx, hy - 3, 1, 6, '#2A6A3A');
    for (let i = 8; i < ext.w - 10; i += 18) {
      if (Math.abs(x + i + 4 - hx) < 12) continue;
      win(g, x + i, y + ext.h - wall + 7, 8, 8, '#8AAAD0');
      box(g, x + i, y + ext.h - wall + 7, 2, 8, '#E0B0B0');
      box(g, x + i + 6, y + ext.h - wall + 7, 2, 8, '#E0B0B0');
    }
    door(g, x, y, ext, '#8A6A48');
  };

  // The tavern: plaster and dark timber, a sagging brown roof, a hanging tankard, barrels by the door.
  art.W = (g, x, y, m) => {
    if (m.at(-1, 0) === 'W' || m.at(0, -1) === 'W') return;
    const ext = extent(m, 'W');
    const wall = Math.round(ext.h * 0.55);
    box(g, x, y + ext.h - wall, ext.w, wall, '#E0D4B8');
    for (let i = 0; i < ext.w; i += 12) box(g, x + i, y + ext.h - wall, 2, wall, '#4A3020');
    box(g, x, y + ext.h - wall + Math.round(wall / 2), ext.w, 2, '#4A3020');
    ground(g, x, y, ext.w, ext.h, ext.h - wall);
    footing(g, x, y, ext.w, ext.h, ext.h - wall);
    roof(g, x, y, ext.w, ext.h - wall, '#7A4A2A', '#5A3420', '#9A6A3A', { chimney: 0.15 });
    // warm light in the windows
    for (let i = 5; i < ext.w - 8; i += 12) win(g, x + i, y + ext.h - wall + 4, 6, 6, '#E8B04A', '#4A3020');
    // the tankard sign
    const tx = x + ext.w / 2 + 12;
    const ty = y + ext.h - wall - 2;
    box(g, tx - 4, ty - 2, 12, 1, '#3A2618');
    box(g, tx, ty, 7, 9, '#C8963A');
    box(g, tx, ty, 7, 2, '#F4F0EA');
    box(g, tx + 7, ty + 2, 2, 5, '#C8963A');
    // barrels
    for (const bx of [x + 3, x + 12]) {
      box(g, bx, y + ext.h - 10, 8, 10, '#7A4A2A');
      box(g, bx, y + ext.h - 8, 8, 1, '#3A2618');
      box(g, bx, y + ext.h - 3, 8, 1, '#3A2618');
    }
    door(g, x, y, ext);
  };

  // The store: honey-coloured planks, a red-and-white striped awning, crates and sacks out front.
  art.a = (g, x, y, m) => {
    if (m.at(-1, 0) === 'a' || m.at(0, -1) === 'a') return;
    const ext = extent(m, 'a');
    const wall = Math.round(ext.h * 0.6);
    box(g, x, y + ext.h - wall, ext.w, wall, '#B8884A');
    for (let j = ext.h - wall; j < ext.h; j += 4) box(g, x, y + j, ext.w, 1, '#8A6430');
    ground(g, x, y, ext.w, ext.h, ext.h - wall);
    roof(g, x, y, ext.w, ext.h - wall, '#5A4A3A', '#40342A', '#7A6450', { chimney: 0.75 });
    // the awning
    const ay = y + ext.h - wall;
    for (let i = -2; i < ext.w + 2; i++) box(g, x + i, ay, 1, 7, Math.floor((i + 2) / 4) % 2 ? '#F4F0EA' : '#B04030');
    for (let i = -2; i < ext.w + 2; i += 4) box(g, x + i, ay + 7, 2, 1, '#B04030');
    win(g, x + 6, ay + 11, 10, 7, '#6A8AB0');
    // crates and a sack
    box(g, x + ext.w - 16, y + ext.h - 9, 9, 9, '#8A6430');
    box(g, x + ext.w - 16, y + ext.h - 9, 9, 1, '#5A4020');
    box(g, x + ext.w - 12, y + ext.h - 9, 1, 9, '#5A4020');
    ellipse(g, x + ext.w - 4, y + ext.h - 4, 3, 4, '#D8C8A0');
    door(g, x, y, ext);
  };

  // The horse barn: red planks, a white-trimmed loft door full of hay, and big braced doors.
  art.r = (g, x, y, m) => {
    if (m.at(-1, 0) === 'r' || m.at(0, -1) === 'r') return;
    const ext = extent(m, 'r');
    const wall = Math.round(ext.h * 0.6);
    box(g, x, y + ext.h - wall, ext.w, wall, '#9A3A2A');
    for (let i = 0; i < ext.w; i += 4) box(g, x + i, y + ext.h - wall, 1, wall, '#7A2A1E');
    box(g, x, y + ext.h - wall, ext.w, 2, '#E8E0D0');
    ground(g, x, y, ext.w, ext.h, ext.h - wall);
    roof(g, x, y, ext.w, ext.h - wall, '#4A3A34', '#34282A', '#6A5650');
    // the hay loft
    const lx = x + ext.w / 2 - 7;
    box(g, lx - 1, y + ext.h - wall - 12, 16, 12, '#E8E0D0');
    box(g, lx + 1, y + ext.h - wall - 10, 12, 10, '#D8B84A');
    for (let i = 0; i < 12; i += 3) put(g, lx + 2 + i, y + ext.h - wall - 11, '#E8C85A');
    // the big doors, braced with an X (over the door tiles)
    for (const col of ext.doors) {
      const dx = x + col * TILE;
      const dy = y + ext.h - TILE - 6;
      box(g, dx + 1, dy, 14, 22, '#E8E0D0');
      box(g, dx + 2, dy + 1, 12, 21, '#7A2A1E');
      for (let i = 0; i < 12; i++) {
        put(g, dx + 2 + i, dy + 1 + Math.round(i * 1.7), '#E8E0D0');
        put(g, dx + 13 - i, dy + 1 + Math.round(i * 1.7), '#E8E0D0');
      }
    }
  };

  // The Bank of Warrior City (author, Oct 7, 2026): pale stone, a slate roof trimmed in gold, fat columns,
  // a great gold coin over the door, and a door banded in iron. It is the only building in the city that looks
  // like it has never been hit. Its letter is '$', the only one left that suits it.
  art['$'] = (g, x, y, m) => {
    if (m.at(-1, 0) === '$' || m.at(0, -1) === '$') return;
    const ext = extent(m, '$');
    const top = 22;
    ground(g, x, y, ext.w, ext.h, top);
    box(g, x, y + top, ext.w, ext.h - top, '#D8D0C0');
    for (let j = top; j < ext.h; j += 6) box(g, x, y + j, ext.w, 1, '#C0B8A6');
    roof(g, x, y + 2, ext.w, top - 2, '#3A3A4A', '#2A2A36', '#5A5A6A');
    // the gold cornice, and a frieze of little coins along it
    box(g, x - 2, y + top - 1, ext.w + 4, 3, '#C8963A');
    box(g, x - 2, y + top + 2, ext.w + 4, 1, '#8A6420');
    for (let i = 3; i < ext.w; i += 6) put(g, x + i, y + top, '#FFF0A0');
    // columns, fat and polished
    const step = Math.max(16, Math.floor(ext.w / 6));
    for (let i = 5; i < ext.w - 6; i += step) {
      if (ext.doors.some((c) => Math.abs(c * TILE + 8 - (i + 3)) < 14)) continue;
      box(g, x + i, y + top + 4, 7, ext.h - top - 8, '#F0EADC');
      box(g, x + i + 5, y + top + 4, 2, ext.h - top - 8, '#B8AE9C');
      box(g, x + i - 1, y + top + 3, 9, 2, '#C8963A');
      box(g, x + i - 1, y + ext.h - 5, 9, 2, '#B8AE9C');
    }
    // the coin over the door
    if (ext.doors.length) {
      const cx = x + ext.doors[0] * TILE + 8;
      const cy = y + top - 4;
      ellipse(g, cx, cy, 8, 8, '#8A6420');
      ellipse(g, cx, cy, 7, 7, '#E8C86A');
      ellipse(g, cx, cy, 5, 5, '#C8963A');
      box(g, cx - 1, cy - 3, 3, 6, '#8A6420');
      box(g, cx - 3, cy - 1, 7, 2, '#8A6420');
    }
    shade(g, x + ext.w - 5, y + top, 5, ext.h - top, 0.25);
    // wide steps, then the door: dark oak, banded in iron
    box(g, x + ext.w / 2 - 20, y + ext.h - 3, 40, 3, '#F0EADC');
    box(g, x + ext.w / 2 - 20, y + ext.h - 1, 40, 1, '#B8AE9C');
    door(g, x, y, ext, '#3A2A1E', '#1E1816');
    for (const col of ext.doors) {
      const dx = x + col * TILE;
      for (const j of [8, 14]) box(g, dx + 2, y + ext.h - j, 12, 1, '#6A6A74');
    }
  };

  // The bakery by the Kaloseum (author, Oct 7, 2026), the morning after the Warden came down on it out of the sky
  // (dungeon.ts: "Somewhere in town, a roof gives way."). A ruin you look into from the street: the roof gone but
  // for one corner hanging on over the last wall standing, broken rafters sticking up at angles, the front wall
  // down in heaps of brick and tile, and inside, on a floor white with flour, a crater the shape of a very large
  // man. The oven at the back is still lit, and its chimney still smoking. Loaves flattened on a snapped counter,
  // a burst sack, the sign hanging by one chain, and rubble out across the grass and the road.
  // Every letter is taken, so its parts are named keys (bakery-wall, -oven, -crater, -flour, -loaves, -rubble,
  // -floor, -tray): the map's `art` points a letter at each, so each can be examined, and the top-left wall tile
  // draws the whole ruin from where the map puts them. Only the swept floor is walkable.
  const BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  /** Smooth noise (0–1) over a grid of `s` pixels, for drifts and heaps that don't look rolled on dice. */
  const vnoise = (px, py, s, seed) => {
    const fx = px / s;
    const fy = py / s;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = hash(ix, iy, seed);
    const b = hash(ix + 1, iy, seed);
    const c = hash(ix, iy + 1, seed);
    const d = hash(ix + 1, iy + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const seg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const BAKERY = ['wall', 'oven', 'crater', 'flour', 'loaves', 'rubble', 'floor', 'tray'].map((k) => `bakery-${k}`);
  for (const k of BAKERY) art[k] = () => {};

  // Mistress Hettie's tray, out on the grass: an upturned crate, a tray of buns pressed thin, and a card.
  art['bakery-tray'] = (g, x, y) => {
    ellipse(g, x + 9, y + 14, 7, 2, mixC(g[y + 14]?.[x + 9] ?? [70, 110, 58], '#101810', 0.4));
    box(g, x + 2, y + 6, 13, 8, '#8A6430');
    box(g, x + 2, y + 6, 13, 1, '#A8804A');
    for (const sx of [x + 6, x + 10]) box(g, sx, y + 7, 1, 7, '#5A4020');
    box(g, x + 2, y + 13, 13, 1, '#3A2618');
    box(g, x + 14, y + 7, 1, 7, '#5A4020');
    // the tray, and the buns on it
    box(g, x + 1, y + 2, 15, 5, '#5A5450');
    box(g, x + 2, y + 2, 13, 4, '#8A8280');
    box(g, x + 2, y + 2, 13, 1, '#ACA5A0');
    for (let k = 0; k < 4; k++) {
      box(g, x + 3 + k * 3, y + 3, 3, 2, '#C8904A');
      put(g, x + 3 + k * 3, y + 3, '#E8B870');
    }
    // the card: SECONDS (and, in pencil, THIRDS)
    box(g, x + 11, y, 4, 3, '#F4F0EA');
    put(g, x + 12, y + 1, '#3A2618');
    put(g, x + 14, y + 1, '#8A8280');
  };

  art['bakery-wall'] = (g, x, y, m) => {
    const key = (dx, dy) => (m.key ? m.key(dx, dy) : m.at(dx, dy));
    const ours = (dx, dy) => BAKERY.includes(key(dx, dy));
    if (ours(-1, 0) || ours(0, -1)) return;
    let W = 1;
    while (ours(W, 0)) W++;
    let H = 1;
    while (ours(0, H)) H++;
    const w = W * TILE;
    const h = H * TILE;
    // where the parts are, from the map, in tiles from here; and the box round them, in pixels
    const tiles = (part) => {
      const out = [];
      for (let ty = -2; ty < H + 3; ty++)
        for (let tx = -3; tx < W + 3; tx++) if (key(tx, ty) === `bakery-${part}`) out.push([tx, ty]);
      return out;
    };
    const span = (ts) => ({
      x0: Math.min(...ts.map((t) => t[0])) * TILE,
      y0: Math.min(...ts.map((t) => t[1])) * TILE,
      x1: (Math.max(...ts.map((t) => t[0])) + 1) * TILE,
      y1: (Math.max(...ts.map((t) => t[1])) + 1) * TILE,
    });
    const P = (i, j, c) => put(g, x + i, y + j, c);
    const B = (i, j, bw, bh, c) => box(g, x + i, y + j, bw, bh, c);
    const at = (i, j) => (x + i >= 0 && x + i < g.w ? g[y + j]?.[x + i] : undefined);
    const tint = (i, j, c, k) => {
      const cur = at(i, j);
      if (cur) g[y + j][x + i] = mixC(cur, c, k);
    };
    const on = (i, j, a) => a > (BAYER4[(y + j) & 3][(x + i) & 3] + 0.5) / 16;
    const partAt = (i, j) => key(Math.floor(i / TILE), Math.floor(j / TILE));
    const swept = (i, j) => partAt(i, j) === 'bakery-floor';
    const K = '#1E1816';
    const FLOUR = '#F4F0EA';
    const FLOUR_SHADE = '#DCD6CA';

    const crater = span(tiles('crater'));
    const oven = span(tiles('oven'));
    const sack = span(tiles('flour'));
    const counter = span(tiles('loaves'));
    const lane = tiles('floor');
    const gap = lane.reduce((a, t) => (t[1] > a[1] ? t : a));
    const gx = gap[0] * TILE + 8;
    const front = tiles('rubble').filter(([, ty]) => ty === H - 1);
    const outside = tiles('rubble').filter(([, ty]) => ty >= H);

    // ---- the ground round it: the ruin's shadow on the grass, down and to the right
    for (let j = 18; j < h + 3; j++) for (let i = w; i < w + 5; i++) tint(i, j, '#101810', j < 30 ? 0.18 : 0.32);

    // ---- the floor: big worn flags, every row cut to its own lengths, grey-brown where the flour isn't
    const FLAG = ['#7E7262', '#786C5C', '#86796A'];
    for (let j = 14; j < h; j++)
      for (let i = 3; i < w - 3; i++) {
        const row = Math.floor(j / 8);
        const ox = Math.floor(hash(row, 0, 201) * 12);
        const len = 9 + (row % 3) * 2;
        const col = Math.floor((i + ox) / len);
        const seam = j % 8 === 0 || (i + ox) % len === 0;
        let c = FLAG[Math.floor(hash(col, row, 201) * 3)];
        if (seam) c = hash(i, j, 202) < 0.85 ? '#5A5042' : c;
        else if (j % 8 === 1 || (i + ox) % len === 1) c = mixC(c, '#FFFFFF', 0.07);
        P(i, j, c);
      }

    // ---- the crater, measured first so the flour can pile up round it: a very large man, face down, arms and
    // legs flung out
    const ccx = (crater.x0 + crater.x1) / 2;
    const ccy = (crater.y0 + crater.y1) / 2 - 1;
    const s = (crater.x1 - crater.x0) / 40;
    const body = (i, j) =>
      Math.min(
        Math.hypot(i + 0.6, j + 13.2) - 4.9,
        Math.max(Math.abs(i * 0.95 + j * 0.05) - 6.8, Math.abs(j + 1.4) - 7.6) - 0.4,
        seg(i, j, -5, -6, -15.5, -13.5) - 3.1,
        seg(i, j, 5, -6, 16, -11.5) - 3.1,
        seg(i, j, -3.6, 5, -9.5, 16) - 3.5,
        seg(i, j, 3.6, 5, 11, 15) - 3.5,
      );
    const D = (i, j) => body((i - ccx) / s, (j - ccy) / s) * s + (vnoise(x + i, y + j, 3, 203) - 0.5) * 1.8;

    // ---- flour over all of it: thrown out round the crater in a ring, poured out of the sack, drifted against
    // the walls, and swept off the one strip from the doorway to the oven (into ridges along its edges)
    const scx = (sack.x0 + sack.x1) / 2;
    const scy = (sack.y0 + sack.y1) / 2;
    const flourAt = (i, j) => {
      if (swept(i, j)) return 0;
      const d = D(i, j);
      let a =
        0.36 +
        0.3 * Math.max(0, 1 - Math.hypot((i - scx) / 30, (j - scy - 14) / 30)) +
        (d > 2.6 ? 0.55 * Math.exp(-(((d - 7) / 6) ** 2)) : 0) +
        0.9 * Math.max(0, 1 - Math.hypot((i - scx + 7) / 15, (j - scy - 5) / 10)) +
        0.45 * Math.max(0, 1 - (j - 16) / 6) +
        0.35 * Math.max(0, 1 - Math.min(i - 5, w - 6 - i) / 6) +
        (vnoise(x + i, y + j, 6, 202) - 0.5) * 0.9 +
        (vnoise(x + i, y + j, 2, 212) - 0.5) * 0.2;
      for (const dd of [1, 2, 3]) if (swept(i + dd, j) || swept(i - dd, j)) a += 0.4 - dd * 0.08;
      return a;
    };
    const DRIFT = 0.7;
    /** Flour on a pixel: a drift where there's a lot (white, shaded on its lower right), specks where there's less. */
    const dust = (i, j, a, f = flourAt) => {
      if (a > DRIFT) {
        const shaded = f(i + 1, j + 1) <= DRIFT || f(i + 2, j + 2) <= DRIFT;
        const lit = f(i - 1, j - 1) <= DRIFT;
        P(i, j, shaded ? FLOUR_SHADE : lit || a > DRIFT + 0.3 ? '#FCFAF6' : FLOUR);
      } else if (a > 0.5 && on(i, j, (a - 0.5) * 3)) P(i, j, FLOUR_SHADE);
      else if (a > 0.3 && hash(x + i, y + j, 213) < (a - 0.3) * 0.5) P(i, j, FLOUR_SHADE);
      else if (a > 0.3) tint(i, j, FLOUR, 0.1);
    };
    for (let j = 14; j < h; j++) for (let i = 3; i < w - 3; i++) dust(i, j, flourAt(i, j));
    // bits of roof tile all over the floor, and broom marks on the strip
    for (let k = 0; k < 40; k++) {
      const i = 5 + Math.floor(hash(k, 1, 214) * (w - 10));
      const j = 18 + Math.floor(hash(k, 2, 214) * (h - 22));
      if (swept(i, j) || swept(i + 2, j) || D(i, j) < 3) continue;
      B(i, j, 2, 1, hash(k, 3, 214) < 0.7 ? '#A8503A' : '#7A3426');
      P(i + 1, j + 1, '#3A2E24');
    }
    for (const [tx, ty] of lane)
      for (let k = 0; k < 3; k++) {
        const i = tx * TILE + 3 + Math.floor(hash(tx, ty * 3 + k, 215) * 9);
        const j = ty * TILE + 2 + k * 5;
        for (let n = 0; n < 4; n++) tint(i + n, j + (n >> 1), FLOUR, 0.35);
      }

    // ---- the crater itself
    for (let j = crater.y0 - 10; j < crater.y1 + 10; j++)
      for (let i = crater.x0 - 10; i < crater.x1 + 10; i++) {
        if (swept(i, j) || i < 3 || j < 4) continue;
        const d = D(i, j);
        if (d <= 0) {
          // in the hole: under the upper-left lip, its own shadow; the far wall, lower right, in the sun;
          // the bottom dark, and darker where the head went in
          const head = Math.hypot((i - ccx) / s + 0.6, (j - ccy) / s + 13.2) < 3.2;
          let c = head ? '#140C08' : '#2A1E16';
          if (D(i - 1, j - 2) > 0 || D(i - 2, j - 1) > 0 || D(i, j - 3) > 0) c = '#100804';
          else if (D(i + 1, j + 1) > 0) c = '#8A7A66';
          else if (D(i + 1, j + 2) > 0 || D(i + 2, j + 1) > 0) c = '#5E4E3E';
          else if (!head && hash(x + i, y + j, 204) < 0.06) c = '#4A3C30';
          else if (!head && hash(x + i, y + j, 205) < 0.035) c = '#B8B0A2';
          P(i, j, c);
        } else if (d < 1.6) {
          // the lip: broken flags tipped up round the edge, pale, catching the light
          P(i, j, D(i - 2, j - 2) <= 0 ? '#B4A898' : '#DCD4C6');
        } else if (d < 2.6) {
          // and the crack round the outside of it
          if (hash(x + i, y + j, 206) < 0.75) P(i, j, '#4A3E32');
        }
      }
    for (let k = 0; k < 26; k++) {
      const i = Math.round(crater.x0 + hash(k, 1, 209) * (crater.x1 - crater.x0));
      const j = Math.round(crater.y0 + hash(k, 2, 209) * (crater.y1 - crater.y0));
      if (D(i, j) > -2.5 || D(i + 2, j + 1) > -2.5 || swept(i, j)) continue;
      const pale = hash(k, 3, 209) < 0.35;
      B(i, j, 2, 1, pale ? '#E8E2D6' : '#7A6E60');
      P(i, j + 1, pale ? '#B8B0A2' : '#4A3E32');
      P(i + 1, j + 1, '#140C08');
    }
    // cracks running out across the flags, and slabs knocked loose
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + hash(k, 3, 207) * 0.4;
      let px = ccx;
      let py = ccy;
      while (D(Math.round(px), Math.round(py)) <= 2.6 && Math.hypot(px - ccx, py - ccy) < 40) {
        px += Math.cos(a);
        py += Math.sin(a);
      }
      const len = 5 + Math.floor(hash(k, 4, 207) * 11);
      for (let n = 0; n < len; n++) {
        const i = Math.round(px);
        const j = Math.round(py);
        if (!swept(i, j) && i > 3 && j > 16 && i < w - 4) P(i, j, '#4A3E32');
        px += Math.cos(a + (hash(k, n, 208) - 0.5) * 1.4);
        py += Math.sin(a + (hash(n, k, 208) - 0.5) * 1.4);
      }
      if (k % 3 === 0) {
        const bx = Math.round(px + Math.cos(a) * 2);
        const by = Math.round(py + Math.sin(a) * 2);
        if (!swept(bx, by) && !swept(bx + 4, by) && by > 18 && bx > 4 && bx < w - 8) {
          B(bx, by, 4, 3, '#A89C8C');
          B(bx, by, 4, 1, '#D8D0C2');
          B(bx, by + 3, 4, 1, '#4A3E32');
          P(bx + 4, by + 1, '#4A3E32');
        }
      }
    }

    // ---- the back wall: knocked down to a ragged stub all along, but for the stretch that holds the oven and its
    // chimney, which stands to its full height, plate and all
    const ovenL = oven.x0 - 3;
    const ovenR = oven.x1 + 5;
    const backTop = (i) => {
      if (i >= ovenL && i < ovenR) return Math.round(hash(i >> 1, 2, 210) * 1.2);
      const away = Math.min(Math.abs(i - ovenL), Math.abs(i - ovenR + 1));
      return Math.round(1 + Math.min(1, away / 5) * (5 + vnoise(x + i, y, 5, 236) * 7) + hash(i, 1, 210) * 2);
    };
    for (let i = 0; i < w; i++) {
      const top = backTop(i);
      for (let j = top; j < 16; j++) {
        let c = '#E8D8B8';
        if ((i + 6) % 15 < 2) c = '#5A3A22';
        if (j === 8 || j === 9) c = '#5A3A22';
        if (j >= 14) c = '#3A2618';
        // plaster knocked off, showing the laths behind, and flour on the bottom of it
        if (c === '#E8D8B8' && vnoise(x + i, y + j, 4, 235) > 0.64) c = j % 2 ? '#6A4428' : '#9A7448';
        if (j > 10 && j < 14 && c === '#E8D8B8' && hash(x + i, y + j, 211) < 0.5) c = FLOUR;
        P(i, j, c);
      }
      if (top <= 1) {
        // the wall plate along the top
        P(i, top, K);
        P(i, top + 1, '#7A5230');
        P(i, top + 2, '#5A3A22');
      } else {
        // the broken edge: a dark line, laths and bits of plaster, and what fell off it lying in the grass behind
        P(i, top - 1, K);
        P(i, top, hash(i, 3, 210) < 0.5 ? '#8A6440' : '#C8B898');
        if (hash(i, 4, 210) < 0.3) P(i, top - 2, '#8A6440');
        if (i % 3 === 0 && hash(i, 5, 210) < 0.45 && top > 4) {
          const c = hash(i, 6, 210) < 0.5 ? '#8A3A2A' : '#D8CCB0';
          const py = top - 3 - Math.floor(hash(i, 7, 210) * 3);
          B(i, py, 3, 2, c);
          B(i, py, 3, 1, mixC(c, '#FFFFFF', 0.25));
          tint(i + 1, py + 2, '#000000', 0.35);
        }
      }
    }
    // its shadow on the floor
    for (let i = 3; i < w - 3; i++) {
      tint(i, 16, '#000000', 0.3);
      tint(i, 17, '#000000', 0.15);
    }

    // ---- the side walls, seen from above: what's left of them, in broken lengths, with brick where they snapped
    const sideWall = (i0, from, to, dir) => {
      for (let j = from; j < to; j++) {
        P(i0, j, K);
        P(i0 + dir, j, '#7A5230');
        P(i0 + dir * 2, j, '#5A3A22');
        P(i0 + dir * 3, j, '#5A3A22');
        P(i0 + dir * 4, j, '#3A2618');
        tint(i0 + dir * 5, j, '#000000', dir > 0 ? 0.3 : 0.12);
      }
      for (const j of [from, to - 1])
        for (let k = 1; k < 5; k++) if (hash(k, j, 212) < 0.6) P(i0 + dir * k, j, k % 2 ? '#8A3A2A' : '#AA5A4A');
    };
    for (const [a, b] of [
      [backTop(2), 22],
      [27, 38],
    ])
      sideWall(0, a, b, 1);
    for (const [a, b] of [
      [backTop(w - 3), 25],
      [30, 41],
      [47, 55],
    ])
      sideWall(w - 1, a, b, -1);

    // ---- the oven: a brick dome against the back wall, its mouth still glowing
    const ocx = Math.round((oven.x0 + oven.x1) / 2) + 2;
    const orx = 14;
    // its warmth on the floor in front of it
    for (let j = 18; j < 44; j++)
      for (let i = ocx - 18; i < ocx + 18; i++) {
        const r = Math.hypot((i - ocx) / 18, (j - 28) / 14);
        if (r < 1) tint(i, j, '#F8A040', Math.floor((1 - r) * 3) * 0.07);
      }
    for (let j = 0; j < 27; j++)
      for (let i = -orx; i <= orx; i++) {
        const dome = j < 12 ? (i * i) / (orx * orx) + ((j - 12) * (j - 12)) / 144 <= 1 : true;
        if (!dome) continue;
        const edge =
          j >= 26 ||
          Math.abs(i) === orx ||
          (j < 12 && (i * i) / ((orx - 1) * (orx - 1)) + ((j - 12) * (j - 12)) / 121 > 1);
        const course = Math.floor(j / 3);
        const mortar = j % 3 === 2 || (i + 30 + (course % 2) * 3) % 6 === 0;
        let c = mortar ? '#5A2418' : i < -4 ? '#AA5A4A' : i > 6 ? '#6A2A1E' : '#8A3A2A';
        if (edge) c = K;
        P(ocx + i, j, c);
      }
    // flour on its shoulders
    for (let i = -orx + 2; i < orx - 2; i++) {
      const j = 12 - Math.round(12 * Math.sqrt(Math.max(0, 1 - (i * i) / (orx * orx)))) + 1;
      if (hash(i, 5, 213) < 0.6) P(ocx + i, j, FLOUR);
      if (hash(i, 6, 213) < 0.3) P(ocx + i, j + 1, FLOUR_SHADE);
    }
    // the mouth, an arch, and the fire inside
    B(ocx - 6, 15, 12, 11, K);
    ellipse(g, x + ocx, y + 15, 6, 4, K);
    B(ocx - 5, 20, 10, 6, '#C84A1E');
    B(ocx - 4, 19, 8, 4, '#E86A2A');
    B(ocx - 3, 21, 6, 3, '#F8B040');
    P(ocx - 1, 20, '#FFE080');
    P(ocx + 2, 21, '#FFE080');
    P(ocx, 22, '#FFF4C0');
    // the hearth slab
    B(ocx - 9, 26, 18, 3, '#8A8280');
    B(ocx - 9, 26, 18, 1, '#ACA5A0');
    B(ocx - 9, 29, 18, 1, '#4A4442');
    // the chimney stub, on the back wall over the oven: brick, snapped off ragged at the top, still smoking
    const chx = ocx - 4;
    const chTop = -15;
    for (let j = chTop; j < 2; j++)
      for (let i = 0; i < 9; i++) {
        const ragged = j - chTop < [3, 1, 0, 0, 2, 4, 2, 1, 3][i];
        if (ragged) continue;
        const course = Math.floor((j - chTop) / 3);
        const mortar = (j - chTop) % 3 === 2 || (i + (course % 2) * 2) % 4 === 0;
        let c = mortar ? '#5A2418' : i < 3 ? '#AA5A4A' : i > 6 ? '#6A2A1E' : '#8A3A2A';
        P(chx + i, j, c);
      }
    for (let j = chTop; j < 2; j++) {
      P(chx - 1, j, K);
      P(chx + 9, j, K);
    }
    B(chx + 2, chTop + 1, 5, 2, '#1A120C');
    // its shadow on the wall and the floor behind: a strip to the right
    for (let j = chTop + 2; j < 2; j++) tint(chx + 10, j, '#101810', 0.35);
    // smoke: a wisp, leaning off to the right with the wind, thinning as it goes
    for (let k = 0; k < 8; k++) {
      const px = chx + 4 + k * 2.2 + Math.sin(k * 1.1) * 2;
      const py = chTop - 3 - k * 4.5;
      const r = 1.5 + k * 0.45;
      const R = Math.ceil(r) + 1;
      for (let j = -R; j <= R; j++)
        for (let i = -R - 1; i <= R + 1; i++) {
          if ((i * i) / ((r + 0.8) * (r + 0.8)) + (j * j) / (r * r) > 1) continue;
          const lit = i + j < -r * 0.3;
          tint(Math.round(px + i), Math.round(py + j), lit ? '#F4F2EE' : '#C8C4C0', Math.max(0.25, 0.85 - k * 0.08));
        }
    }

    // a heap of rubble: brick, tile, plaster and stone, piled up lit from the upper left
    const heap = (cx, base, rx, ry, seed) => {
      const top = (i) =>
        base - ry * Math.pow(Math.max(0, 1 - (i * i) / (rx * rx)), 0.6) * (0.75 + vnoise(cx + i, seed, 3, 221) * 0.5);
      // the dark of the gaps between the pieces, and a shadow at its foot
      for (let i = -rx; i <= rx; i++) {
        const t = Math.round(top(i));
        for (let j = t; j < base; j++) P(cx + i, j, '#3A2C24');
      }
      for (let i = -rx; i <= rx + 3; i++) {
        tint(cx + i, base, '#000000', 0.35);
        tint(cx + i, base + 1, '#000000', 0.15);
      }
      // then the pieces, back to front, so the nearer ones sit on the ones behind: bricks, tiles, plaster, stone
      const pieces = [];
      for (let k = 0; k < rx * ry * 0.5; k++) {
        const i = Math.round((hash(k, 1, seed) * 2 - 1) * rx);
        const t = top(i);
        if (t >= base - 1) continue;
        pieces.push([cx + i, Math.round(t + hash(k, 2, seed) * (base - t - 2)), hash(k, 3, seed), hash(k, 4, seed)]);
      }
      pieces.sort((a, b) => a[1] - b[1]);
      for (const [px, py, kind, turn] of pieces) {
        const [c, lite, dark, pw, ph] =
          kind < 0.4
            ? ['#8A3A2A', '#B05A44', '#5A2418', 5, 3]
            : kind < 0.62
              ? ['#A8503A', '#C8705A', '#6A2A1E', 4, 2]
              : kind < 0.82
                ? ['#D8CCB0', '#F0E8D4', '#A89C80', 4, 3]
                : ['#8A8280', '#ACA5A0', '#5A5450', 3, 2];
        const [bw, bh] = turn < 0.3 ? [ph + 1, pw - 1] : [pw, ph];
        B(px, py, bw, bh, c);
        B(px, py, bw, 1, lite);
        P(px, py + bh - 1, lite);
        B(px + 1, py + bh - 1, bw - 1, 1, dark);
        B(px + bw - 1, py + 1, 1, bh - 1, dark);
      }
      // its outline against what's behind, and flour settled on its top
      for (let i = -rx; i <= rx; i++) {
        const t = Math.round(top(i));
        if (t >= base) continue;
        P(cx + i, t - 1, K);
        if (hash(cx + i, base, seed) < 0.55) P(cx + i, t, hash(cx + i, t, seed) < 0.5 ? FLOUR : FLOUR_SHADE);
      }
    };

    // ---- the roof, fallen in: tiles heaped against the right-hand wall, behind the counter
    const tilesIn = [];
    for (let j = counter.y0 + 4; j < counter.y1; j += 14) tilesIn.push([w - 11, j + 10]);
    for (const [hx, hy] of tilesIn) heap(hx, hy, 5, 8, 250 + hy);

    // ---- the sack of flour, burst: slumped against the back wall, torn low down, flour poured out across the floor
    {
      const bx = Math.round(scx) + 4;
      const by = Math.round(scy) - 3;
      const pile = (i, j) =>
        swept(i, j)
          ? 0
          : Math.max(0, 1 - Math.hypot((i - (bx - 6)) / 10, (j - (by + 9)) / 5)) * 1.8 +
            (vnoise(x + i, y + j, 3, 230) - 0.5) * 0.5;
      for (let j = by; j < by + 16; j++)
        for (let i = bx - 20; i < bx + 6; i++)
          if (pile(i, j) > 0.5) dust(i, j, pile(i, j) + 0.3, (a, b) => pile(a, b) + 0.3);
      for (let j = -9; j <= 7; j++) {
        const hw = j < -5 ? 2 : Math.round(6.5 * Math.sqrt(Math.max(0, 1 - ((j - 1) / 7.6) ** 2))) + (j > 3 ? 1 : 0);
        for (let i = -hw; i <= hw; i++) {
          let c = '#C8B080';
          if (i < -hw + 2 || (j < -2 && i < 0)) c = '#DCC89C';
          if (i > hw - 3 || j > 4) c = '#A08A5C';
          if (j >= -5 && (i + j * 2) % 5 === 0 && hash(i, j, 231) < 0.6) c = mixC(c, '#000000', 0.12);
          if (i === -hw || i === hw || j === 7 || j === -9) c = '#4A3A22';
          P(bx + i, by + j, c);
        }
      }
      // the tie round its neck
      B(bx - 3, by - 6, 7, 1, '#7A5230');
      P(bx + 3, by - 5, '#7A5230');
      // the tear, low on the left, and the flour coming out of it
      for (let k = 0; k < 5; k++) P(bx - 5 + Math.round(k * 0.4), by + 1 + k, '#2A1E12');
      for (let k = 0; k < 4; k++) P(bx - 6 + Math.round(k * 0.4), by + 2 + k, FLOUR);
    }

    // ---- the counter, snapped in the middle and sagging into the break, every loaf on it flat
    {
      const cx0 = counter.x0 + 2;
      const cw = 11;
      const top0 = counter.y0 + 5;
      const bot1 = counter.y1 - 3;
      const mid = Math.round((top0 + bot1) / 2);
      const half = (ya, yb, skew, breakAtEnd) => {
        for (let j = ya; j < yb; j++) {
          const sh = Math.round((j - ya) * skew);
          const toBreak = breakAtEnd ? yb - j : j - ya;
          const dip = toBreak < 5 ? (5 - toBreak) * 0.07 : 0;
          for (let i = -1; i <= cw + 2; i++) {
            let c = i === 0 ? '#B08A58' : hash(i, j, 216) < 0.12 || (i === 6 && j % 5 < 3) ? '#7A5636' : '#8A6440';
            if (i >= cw) c = '#4A3020';
            if (i === -1 || i === cw + 2) c = K;
            P(cx0 + sh + i, j, i >= 0 && i < cw + 2 ? mixC(c, '#000000', dip) : c);
          }
          tint(cx0 + sh + cw + 3, j + 1, '#000000', 0.35);
          tint(cx0 + sh + cw + 4, j + 1, '#000000', 0.2);
        }
        // the snapped end: splinters, pale where the wood tore
        const ej = breakAtEnd ? yb : ya - 1;
        const esh = breakAtEnd ? Math.round((yb - ya) * skew) : 0;
        for (let i = 0; i < cw + 2; i++)
          P(
            cx0 + esh + i,
            ej + (breakAtEnd ? 1 : -1) * Math.round(hash(i, ya, 214) * 2),
            hash(i, yb, 214) < 0.5 ? '#D8B888' : '#7A5230',
          );
      };
      // the far half, with its end towards you, and the near one, with the end facing the street
      B(cx0 - 1, top0 - 1, cw + 4, 1, K);
      half(top0, mid - 3, -0.22, true);
      half(mid + 3, bot1, 0.2, false);
      for (let i = -1; i <= cw + 3; i++) {
        P(cx0 + Math.round((bot1 - mid - 2) * 0.1) + i, bot1, i < 0 || i > cw + 1 ? K : '#5A3A20');
        P(cx0 + Math.round((bot1 - mid - 2) * 0.1) + i, bot1 + 1, K);
      }
      // the loaves: round loaves, flattened to the thickness of a plate
      const loaf = (lx, ly) => {
        B(lx + 1, ly, 6, 1, '#E8B870');
        B(lx, ly + 1, 8, 1, '#C8904A');
        B(lx, ly + 2, 8, 1, '#A8703A');
        B(lx + 1, ly + 3, 6, 1, '#5A3A20');
        P(lx + 2, ly + 1, '#F0D090');
        P(lx + 5, ly + 1, '#8A5A2A');
      };
      loaf(cx0 + 1, top0 + 2);
      loaf(cx0 + 2, top0 + 8);
      loaf(cx0 + 2, mid + 4);
      loaf(cx0 + 3, mid + 10);
      loaf(cx0 + 4, mid - 2);
      loaf(cx0 - 9, mid + 6);
      for (let k = 0; k < 12; k++)
        P(cx0 + Math.floor(hash(k, 1, 215) * cw), top0 + Math.floor(hash(k, 2, 215) * (bot1 - top0)), FLOUR);
    }

    // ---- broken rafters, sticking up at angles: their shadows on whatever's under them, then the timber
    const beam = (ax, ay, bx, by, wide = 4) => {
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      const lift = Math.max(4, Math.round(len * 0.3));
      for (let t = 0; t <= len; t += 0.5) {
        const px = ax + ((bx - ax) * t) / len;
        const py = ay + ((by - ay) * t) / len;
        const off = Math.round((t / len) * lift);
        for (let k = 0; k < wide; k++)
          tint(Math.round(px + nx * k + off), Math.round(py + ny * k + off * 1.3 + 1), '#000000', 0.3);
      }
      for (let t = 0; t <= len; t += 0.5) {
        const px = ax + ((bx - ax) * t) / len;
        const py = ay + ((by - ay) * t) / len;
        for (let k = -1; k <= wide; k++) {
          const c = k < 0 || k === wide ? K : k === 0 ? '#A8784A' : k === wide - 1 ? '#4A3020' : '#7A5230';
          P(px + nx * k, py + ny * k, c);
        }
      }
      // the snapped end, splintered pale
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      for (let k = 0; k < wide; k++) {
        const reach = Math.round(hash(ax + k, ay, 216) * 3);
        for (let r = 0; r < reach; r++)
          P(bx + ux * r + nx * k, by + uy * r + ny * k, r === reach - 1 ? '#D8B888' : '#7A5230');
        P(bx + ux * reach + nx * k, by + uy * reach + ny * k, k === 1 ? '#D8B888' : K);
      }
    };

    // ---- the last corner standing, front left: its wall up to the eaves, and a piece of roof hanging on above
    const cornerW = 22;
    const faceTop = (i) => (i < 11 ? 34 : Math.round(34 + (i - 10) * 1.7 + hash(i, 1, 217) * 3));
    for (let i = 0; i < cornerW; i++)
      for (let j = faceTop(i); j < h; j++) {
        let c = '#E8D8B8';
        if (i < 2 || (i >= 12 && i < 14)) c = '#5A3A22';
        if (i === 2 && j > faceTop(i) + 1) c = '#7A5230';
        if (j === 56 || j === 57) c = '#5A3A22';
        if (j >= h - 5) c = j === h - 5 ? '#8A8280' : i % 7 === 3 ? '#4A4442' : '#6A6260';
        if (j === faceTop(i) || j === faceTop(i) + 1) c = i < 11 ? '#5A3A22' : j === faceTop(i) ? K : '#C8B898';
        if (c === '#E8D8B8' && j > h - 12 && hash(x + i, y + j, 232) < 0.45) c = FLOUR;
        P(i, j, c);
      }
    for (let k = 0; k < 10; k++) B(3 + k, 58 + Math.round(k * 1.4), 2, 1, '#5A3A22');
    for (let j = 36; j < h - 5; j++) tint(cornerW - 2, j, '#000000', 0.25);
    for (let j = faceTop(cornerW - 1); j < h - 5; j += 2)
      P(cornerW - 1 + Math.round(hash(j, 2, 217) * 2), j, j % 4 ? '#8A6440' : '#8A3A2A');
    // half the shop window, and the one loaf in it that's still a loaf
    B(4, 42, 8, 9, '#5A3A22');
    B(5, 43, 6, 7, '#3A3028');
    P(5, 43, '#8A9AB0');
    P(6, 44, '#6A7A90');
    B(5, 48, 6, 2, '#C8904A');
    B(6, 47, 4, 1, '#E8B870');
    B(-1, faceTop(0), 1, h - faceTop(0) + 1, K);
    B(-1, h, cornerW + 1, 1, K);

    // the roof that's left over it: tiles in staggered rows, the eave along the bottom, a ragged broken edge
    const eave = 37;
    const roofTop = 10;
    const roofEdge = (j) => Math.round(4 + (j - roofTop) * 0.7 + vnoise(j, 0, 3, 218) * 5);
    for (let j = roofTop; j < eave; j++) {
      const r = roofEdge(j);
      for (let i = -3; i < r; i++) {
        const row = Math.floor((j - roofTop) / 4);
        const seam = (i + 3 + (row % 2) * 4) % 8 === 0;
        const rowLine = (j - roofTop) % 4 === 3;
        let c = '#A8503A';
        if (rowLine || seam) c = '#7A3426';
        if (j > eave - 4) c = '#7A3426';
        if ((j - roofTop) % 4 === 0 && !seam && i < r - 3) c = '#C8705A';
        if (i === -3 || j === roofTop) c = K;
        if (i >= r - 2) c = hash(i, j, 219) < 0.5 ? '#E8B8A0' : '#5A2418';
        if (c !== K && hash(x + i, y + j, 233) < 0.12) c = mixC(c, FLOUR, 0.6);
        P(i, j, c);
      }
      P(roofEdge(j), j, K);
    }
    B(-3, eave, roofEdge(eave - 1) + 3, 1, K);
    for (let i = 0; i < cornerW; i++) {
      tint(i, eave + 1, '#000000', 0.4);
      tint(i, eave + 2, '#000000', 0.2);
    }
    // battens poking out past the broken tiles, and tiles slipping off the edge
    for (let j = roofTop + 3; j < eave - 2; j += 4)
      B(roofEdge(j) + 1, j, 2 + Math.round(hash(j, 1, 220) * 5), 1, '#8A6440');
    const slip = (sx, sy, tilt) => {
      for (let k = 0; k < 4; k++) {
        B(sx + k, sy + Math.round(k * tilt), 1, 3, k === 0 ? '#C8705A' : '#A8503A');
        P(sx + k, sy + Math.round(k * tilt) + 3, K);
      }
    };
    slip(roofEdge(eave - 2) + 1, eave - 1, 0.7);
    slip(roofEdge(roofTop + 10) + 3, roofTop + 11, -0.4);
    // the corner and its piece of roof throw their shadow down and to the right, across the floor and the hole
    for (let j = roofTop + 3; j < h - 5; j++) {
      let from = 0;
      while (from < w / 2 && (j < eave ? from <= roofEdge(j) + 2 : j >= faceTop(from))) from++;
      const reach = j < eave ? 6 : Math.min(8, 3 + Math.round((j - eave) * 0.3));
      for (let i = from; i < from + reach; i++) tint(i, j, '#1A1008', 0.32);
    }

    // the rafters: two still nailed into the corner's piece of roof, sticking up out of it, snapped; and one at the
    // right, leaning out where the side wall gave
    beam(roofEdge(roofTop + 5) - 4, roofTop + 7, roofEdge(roofTop + 5) + 4, roofTop - 16);
    beam(roofEdge(roofTop + 12) - 6, roofTop + 14, -9, roofTop - 4);
    beam(w - 5, 30, w + 6, 10);

    // ---- the front: down in heaps of brick, plaster and tile, from the corner across to the stub at the right
    const fl = Math.min(...front.map(([tx]) => tx)) * TILE;
    const fr = (Math.max(...front.filter(([tx]) => tx < gap[0]).map(([tx]) => tx)) + 1) * TILE;
    heap(Math.round(fl + (fr - fl) * 0.2), h + 2, 12, 14, 231);
    heap(Math.round(fl + (fr - fl) * 0.56), h + 3, 15, 17, 232);
    heap(Math.round(fl + (fr - fl) * 0.9), h + 2, 8, 10, 233);
    // a beam from the front wall, down across the heap, and a loaf sticking out of the bottom
    beam(fl + 10, h - 12, fl + 34, h - 4, 3);
    B(fr - 14, h - 2, 6, 2, '#C8904A');
    B(fr - 13, h - 2, 4, 1, '#E8B870');
    // the right: a stub of the front wall, its corner post still up, and rubble at its foot
    const sx0 = gap[0] * TILE + TILE;
    for (let i = sx0; i < w; i++) {
      const top = i > w - 8 ? 56 : Math.round(64 - (i - sx0) * 0.2 + hash(i, 1, 224) * 4);
      for (let j = top; j < h; j++) {
        let c = '#E8D8B8';
        if (i > w - 7 && i < w - 3) c = '#5A3A22';
        if (i === w - 7) c = '#7A5230';
        if (j >= h - 5) c = j === h - 5 ? '#8A8280' : i % 7 === 3 ? '#4A4442' : '#6A6260';
        if (j === top) c = K;
        if (j === top + 1 && i <= w - 8) c = '#C8B898';
        P(i, j, c);
      }
      if (i >= w - 3) for (let j = top; j < h; j++) tint(i, j, '#000000', 0.3);
    }
    B(w, 56, 1, h - 55, K);
    B(sx0, h, w - sx0 + 1, 1, K);
    for (const [tx] of front.filter(([tx]) => tx > gap[0])) heap(tx * TILE + 6, h + 2, 9, 11, 234 + tx);

    // ---- flour out through the doorway gap: a drift across the step and onto the road, and dust on the grass
    const spill = (i, j) => {
      const along = j - (h - 6);
      if (along < 0) return 0;
      const off = i - gx - Math.sin(along * 0.15) * 2;
      return 1.7 - Math.abs(off) / (7 + along * 1.15) - along / 21 + (vnoise(x + i, y + j, 6, 225) - 0.5) * 0.45;
    };
    for (let j = h - 6; j < h + 32; j++)
      for (let i = gx - 30; i < gx + 30; i++) {
        const a = spill(i, j);
        if (a > 0.1) dust(i, j, a, spill);
      }
    for (let j = h; j < h + 20; j++)
      for (let i = -12; i < w + 12; i++) {
        const a = 0.5 - (j - h) / 24 + (vnoise(x + i, y + j, 7, 226) - 0.5) * 0.7;
        if (a > 0.15) tint(i, j, FLOUR, Math.floor(a * 3) * 0.12);
      }

    // ---- rubble out on the grass and the road: bricks and tiles, thickest in front of where the wall came down
    for (const [tx, ty] of outside) heap(tx * TILE + 8, ty * TILE + 13, 8, 8, 240 + tx);
    for (let k = 0; k < 64; k++) {
      const u = hash(k, 1, 227);
      const v = hash(k, 2, 227);
      const px = Math.round(-12 + u * (w + 24));
      const py = Math.round(h + 2 + v * v * 30);
      if (Math.abs(px - gx) < 8) continue;
      const near = 1 - Math.abs(px - (fl + fr) / 2) / (w * 0.7);
      if (hash(k, 3, 227) > near + 0.1) continue;
      const kind = hash(k, 4, 227);
      const c = kind < 0.45 ? '#8A3A2A' : kind < 0.75 ? '#A8503A' : kind < 0.88 ? '#D8CCB0' : '#8A8280';
      const bw = kind < 0.45 ? 4 : 3;
      for (let i = 0; i < bw; i++) tint(px + i + 1, py + 2, '#000000', 0.4);
      tint(px + bw, py + 1, '#000000', 0.4);
      B(px, py, bw, 2, c);
      B(px, py, bw, 1, mixC(c, '#FFFFFF', 0.25));
    }

    // ---- the sign, on the corner that's left: a bracket, one chain, the board hanging off it by a corner
    {
      const bx = 3;
      const by = eave + 3;
      B(bx, by, 13, 2, '#2A1C12');
      B(bx, by - 1, 2, 1, '#2A1C12');
      B(bx + 11, by + 2, 1, 4, '#8A8280');
      P(bx + 11, by + 3, '#ACA5A0');
      // the snapped chain, dangling
      B(bx + 4, by + 2, 1, 2, '#8A8280');
      // the board, hung from its top-right corner, tipped down to the left
      const hx = bx + 11.5;
      const hy = by + 6;
      const ang = 0.5;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      for (let j = -2; j < 16; j++)
        for (let i = -14; i < 3; i++) {
          // into the board's own frame: u to the left along its top edge, v down
          const dx = i + 0.5;
          const dy = j + 0.5;
          const u = -dx * ca + dy * sa;
          const v = dx * sa + dy * ca;
          if (u < 0 || u > 11 || v < 0 || v > 7) continue;
          const edge = u < 1 || u > 10 || v < 1 || v > 6;
          P(Math.round(hx + i), Math.round(hy + j), edge ? '#3A2618' : v < 2 ? '#D8A858' : '#C8984A');
        }
      // a loaf painted on it
      const lx = Math.round(hx - 5.5 * ca + 3.5 * sa);
      const ly = Math.round(hy + 5.5 * sa + 3.5 * ca);
      ellipse(g, x + lx, y + ly, 2, 1, '#8A5A2A');
      put(g, x + lx - 1, y + ly - 1, '#E8B870');
    }
  };

  // The training ground's sand, and its furniture: straw dummies and racks of practice weapons.
  art.z = (g, x, y) => {
    for (let j = 0; j < TILE; j++)
      for (let i = 0; i < TILE; i++) put(g, x + i, y + j, hash(x + i, y + j, 47) < 0.12 ? '#B8985E' : '#D0B07A');
  };
  art.e = (g, x, y) => {
    art.z(g, x, y);
    box(g, x + 7, y + 4, 2, 12, '#4A3020');
    box(g, x + 3, y + 6, 10, 2, '#4A3020');
    ellipse(g, x + 8, y + 9, 4, 4, '#D8B84A');
    ellipse(g, x + 8, y + 3, 3, 3, '#D8B84A');
    put(g, x + 7, y + 3, '#3A2618');
    put(g, x + 9, y + 3, '#3A2618');
  };
  art.k = (g, x, y) => {
    art.z(g, x, y);
    box(g, x + 1, y + 6, 14, 2, '#4A3020');
    box(g, x + 1, y + 13, 14, 2, '#4A3020');
    for (let i = 3; i < 14; i += 4) {
      box(g, x + i, y + 1, 1, 13, '#8A8280');
      box(g, x + i - 1, y + 1, 3, 2, '#ACA5A0');
    }
  };
  // A cottage: plaster and timber under a pitched roof (one of four colours, by where it stands),
  // windows with boxes of flowers, sometimes a chimney. Warrior City's are 'u'; every older map's
  // thatched cottages ('H') are drawn the same way now (author, Oct 3, 2026).
  const cottage = (letter) => (g, x, y, m) => {
    if (m.at(-1, 0) === letter || m.at(0, -1) === letter) return;
    const ext = extent(m, letter);
    const pick = Math.floor(hash(x, y, 51) * 4);
    const [rc, rd, rl] = [
      ['#B8913A', '#8A6A28', '#D8B15A'],
      ['#8A4A3A', '#6A3428', '#AA6A5A'],
      ['#4A5A6A', '#34424E', '#6A7A8A'],
      ['#5A6A3A', '#424E2A', '#7A8A5A'],
    ][pick];
    const wallH = Math.round(ext.h * 0.5);
    const wy = y + ext.h - wallH;
    ground(g, x, y, ext.w, ext.h, ext.h - wallH);
    box(g, x, wy, ext.w, wallH, '#E8DCC0');
    box(g, x, wy, ext.w, 2, '#4A3020');
    box(g, x, wy, 2, wallH, '#4A3020');
    box(g, x + ext.w - 2, wy, 2, wallH, '#4A3020');
    box(g, x, y + ext.h - 3, ext.w, 3, '#8A8280');
    shade(g, x + ext.w - 6, wy, 4, wallH, 0.15);
    roof(g, x, y, ext.w, ext.h - wallH, rc, rd, rl, hash(x, y, 52) < 0.6 ? { chimney: hash(x, y, 53) < 0.5 ? 0.2 : 0.75 } : {});
    for (const wx of [x + 5, x + ext.w - 13]) {
      win(g, wx, wy + 5, 8, 7);
      box(g, wx - 1, wy + 13, 10, 3, '#6A4428');
      for (let i = 0; i < 8; i += 2) put(g, wx + i, wy + 12, ['#E8D26A', '#C86A8A', '#E8E0D0'][i % 3]);
    }
    door(g, x, y, ext, '#6A4428', '#3A2618', 15);
    // a long cottage gets more windows along it
    for (let wx = x + 22; wx < x + ext.w - 22; wx += 14) {
      if (ext.doors.some((c) => Math.abs(x + c * TILE + 8 - (wx + 4)) < 12)) continue;
      win(g, wx, wy + 5, 8, 7);
    }
  };
  art.u = cottage('u');
  art.H = cottage('H');

  // A stone house (the older towns' 'I'): grey stone walls on a plinth, a slate or tile roof,
  // shuttered windows, an outline and a shadow.
  art.I = (g, x, y, m) => {
    if (m.at(-1, 0) === 'I' || m.at(0, -1) === 'I') return;
    const ext = extent(m, 'I');
    const pick = Math.floor(hash(x, y, 61) * 3);
    const [rc, rd, rl] = [
      ['#5A5A6A', '#40404E', '#7A7A8A'],
      ['#7A3A2E', '#5A2A20', '#9A5A4A'],
      ['#4A4A42', '#34342E', '#6A6A5E'],
    ][pick];
    const wallH = Math.max(14, Math.round(ext.h * 0.45));
    const wy = y + ext.h - wallH;
    ground(g, x, y, ext.w, ext.h, ext.h - wallH);
    box(g, x, wy, ext.w, wallH, '#8A8280');
    for (let j = 0; j < wallH; j += 5)
      for (let i = (j / 5) % 2 ? 0 : 6; i < ext.w; i += 12) box(g, x + i, wy + j, 1, 5, '#76706C');
    for (let j = 0; j < wallH; j += 5) box(g, x, wy + j, ext.w, 1, '#76706C');
    footing(g, x, y, ext.w, ext.h, ext.h - wallH);
    roof(g, x, y, ext.w, ext.h - wallH, rc, rd, rl, hash(x, y, 62) < 0.5 ? { chimney: 0.78 } : {});
    for (let wx = x + 6; wx < x + ext.w - 10; wx += 16) {
      if (ext.doors.some((c) => Math.abs(x + c * TILE + 8 - (wx + 4)) < 12)) continue;
      win(g, wx, wy + 4, 8, 7, '#6A8AB0');
      box(g, wx - 3, wy + 3, 2, 9, '#5A3A20');
      box(g, wx + 9, wy + 3, 2, 9, '#5A3A20');
    }
    door(g, x, y, ext, '#5A3A20', '#2A1C12', Math.min(20, wallH + 4));
  };
  return art;
}
