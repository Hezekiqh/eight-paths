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
