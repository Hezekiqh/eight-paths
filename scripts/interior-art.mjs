// Warrior City's interiors (author, Oct 3, 2026): furniture for rooms that aren't the Archive.
// Each piece fills one tile, drawn over the floor; walls ('V', windows 'Y', stained glass 'y',
// a fireplace 'F', a notice board 'N') are two tiles tall, like the Archive's shelves.

const TILE = 16;

/** Floors other than the Archive's planks: stone flags, clean white tile, straw over boards. */
export const FLOORS = {
  stone: (x, y, hash) => {
    const fx = Math.floor(x / 8) + (Math.floor(y / 8) % 2) * 4;
    const base = ['#5A5450', '#544E4A', '#605A56'][Math.floor(hash(Math.floor(fx / 1), Math.floor(y / 8), 21) * 3)];
    return x % 8 === 0 || y % 8 === 0 ? '#3A3432' : base;
  },
  tile: (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? '#E0DCD4' : '#D0CCC4'),
  hay: (x, y, hash) => (hash(x, y, 23) < 0.35 ? '#C8A84A' : hash(x, y, 24) < 0.5 ? '#B8963A' : '#8A6A3A'),
  // the bank's marble: big polished squares, cream and green, a gold seam between (author, Oct 7, 2026)
  marble: (x, y, hash) => {
    if (x % 16 === 0 || y % 16 === 0) return '#B8963A';
    const green = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
    const vein = hash(Math.floor(x / 2), Math.floor(y / 3), 25) < 0.06;
    if (green) return vein ? '#5A7A6A' : '#3A5A4A';
    return vein ? '#C8C0B0' : '#E8E2D4';
  },
};

export function interiorArt({ box, put, ellipse, hash }) {
  const WALLS = {
    stone: ['#6A6260', '#585250', '#8A8280'],
    plaster: ['#D8CCB0', '#C0B498', '#E8DCC0'],
    wood: ['#6A4A2E', '#523A22', '#8A6440'],
    white: ['#E8E4DC', '#D0CCC4', '#F4F0EA'],
    plank: ['#8A3A2A', '#6A2A1E', '#AA5A4A'],
    marble: ['#E0D8C8', '#B8963A', '#F4EEE2'],
  };
  /** A plain wall, two tiles tall: the top tile has the cornice, the bottom a skirting board. */
  const wall = (g, x, y, m, kind) => {
    const [c, d, l] = WALLS[kind] ?? WALLS.stone;
    const upper = m.at(0, -1) === '#';
    box(g, x, y, TILE, TILE, c);
    if (kind === 'stone')
      for (let j = 0; j < TILE; j += 5) {
        box(g, x, y + j, TILE, 1, d);
        box(g, x + ((j / 5) % 2 ? 4 : 11), y + j, 1, 5, d);
      }
    if (kind === 'wood' || kind === 'plank') for (let i = 0; i < TILE; i += 4) box(g, x + i, y, 1, TILE, d);
    if (upper) {
      box(g, x, y, TILE, 3, d);
      box(g, x, y + 3, TILE, 1, l);
    } else {
      box(g, x, y + 12, TILE, 4, d);
      box(g, x, y + 12, TILE, 1, l);
    }
  };
  const art = {};
  const kindOf = (m) => m.wall ?? 'stone';
  art.V = (g, x, y, m) => wall(g, x, y, m, kindOf(m));
  // a window: daylight through it
  art.Y = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    if (m.at(0, -1) === '#') return;
    box(g, x + 3, y + 1, 10, 10, '#3A2618');
    box(g, x + 4, y + 2, 8, 8, '#8AAAD0');
    box(g, x + 7, y + 2, 1, 8, '#3A2618');
    box(g, x + 4, y + 5, 8, 1, '#3A2618');
    put(g, x + 5, y + 3, '#C8D8F0');
  };
  // stained glass, tall and arched, across both tiles of the wall
  art.y = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    const upper = m.at(0, -1) === '#';
    const top = upper ? y + 4 : y;
    const h = upper ? 12 : 11;
    box(g, x + 3, top, 10, h, '#3A2618');
    const colours = ['#B04030', '#4A6AA0', '#C8963A', '#3A8A5A', '#8A4AA0'];
    for (let j = 1; j < h - 1; j++)
      for (let i = 4; i < 12; i++) put(g, x + i, top + j, colours[(Math.floor(i / 3) + Math.floor((top + j) / 4)) % 5]);
    if (upper) ellipse(g, x + 8, top, 5, 2, '#3A2618');
  };
  // a fireplace in the wall, burning
  art.F = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    if (m.at(0, -1) === '#') {
      box(g, x + 1, y + 6, 14, 10, '#7A6A64');
      return;
    }
    box(g, x + 1, y, 14, 14, '#7A6A64');
    box(g, x + 3, y + 3, 10, 11, '#1E1816');
    ellipse(g, x + 8, y + 11, 4, 3, '#E8742A');
    ellipse(g, x + 8, y + 10, 2, 3, '#FFD060');
    box(g, x, y + 14, 16, 2, '#5A4A44');
  };
  // the guild's notice board, crowded with jobs: papers of every size, pinned at angles
  art.N = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    if (m.at(0, -1) === '#') {
      box(g, x + 1, y + 9, 14, 7, '#5A3A20');
      box(g, x + 1, y + 9, 14, 1, '#7A5230');
      box(g, x + 3, y + 10, 5, 5, '#E0D4B8');
      put(g, x + 5, y + 10, '#B04030');
      return;
    }
    box(g, x + 1, y, 14, 12, '#5A3A20');
    box(g, x + 1, y + 11, 14, 1, '#3A2618');
    box(g, x + 2, y + 1, 6, 4, '#F0E6CC');
    box(g, x + 9, y + 1, 5, 6, '#E8DCC0');
    box(g, x + 3, y + 6, 5, 5, '#E0D4B8');
    box(g, x + 10, y + 8, 4, 3, '#F0E6CC');
    for (const [px, py] of [
      [4, 1],
      [11, 1],
      [5, 6],
      [12, 8],
    ])
      put(g, x + px, y + py, '#B04030');
    for (let k = 0; k < 6; k++) put(g, x + 3 + (k % 3) * 2, y + 3 + Math.floor(k / 3) * 5, '#8A7A64');
  };
  // a pew: a long wooden bench, joined to its neighbours
  art.P = (g, x, y, m) => {
    const l = m.at(-1, 0) !== 'P';
    const r = m.at(1, 0) !== 'P';
    box(g, x + (l ? 1 : 0), y + 3, TILE - (l ? 1 : 0) - (r ? 1 : 0), 4, '#5A3A20');
    box(g, x + (l ? 1 : 0), y + 7, TILE - (l ? 1 : 0) - (r ? 1 : 0), 4, '#7A5230');
    box(g, x + (l ? 1 : 0), y + 7, TILE - (l ? 1 : 0) - (r ? 1 : 0), 1, '#9A7248');
    if (l) box(g, x + 1, y + 3, 2, 11, '#3A2618');
    if (r) box(g, x + 13, y + 3, 2, 11, '#3A2618');
  };
  // the altar: white cloth over stone, candles and a bell
  art.A = (g, x, y) => {
    box(g, x + 1, y + 4, 14, 11, '#8A8280');
    box(g, x + 1, y + 4, 14, 6, '#F0E8D8');
    box(g, x + 1, y + 9, 14, 1, '#C8963A');
    for (const cx of [x + 3, x + 12]) {
      box(g, cx, y + 1, 1, 3, '#F3ECDD');
      put(g, cx, y, '#FFD060');
    }
    ellipse(g, x + 8, y + 3, 2, 2, '#C8963A');
  };
  // a lectern with an open book
  art.L = (g, x, y) => {
    box(g, x + 7, y + 7, 2, 8, '#4A3020');
    box(g, x + 3, y + 3, 10, 5, '#5A3A20');
    box(g, x + 4, y + 3, 4, 4, '#F0E6CC');
    box(g, x + 8, y + 3, 4, 4, '#E8DCC0');
  };
  // a table with a candle and papers, stools either side
  art.t = (g, x, y) => {
    box(g, x + 1, y + 4, 14, 9, '#6A4428');
    box(g, x + 1, y + 4, 14, 1, '#8A6440');
    box(g, x + 2, y + 13, 2, 3, '#3A2618');
    box(g, x + 12, y + 13, 2, 3, '#3A2618');
    box(g, x + 4, y + 6, 4, 3, '#F0E6CC');
    box(g, x + 10, y + 5, 1, 3, '#F3ECDD');
    put(g, x + 10, y + 4, '#FFD060');
  };
  // a long map table for the guild
  art.n = (g, x, y, m) => {
    const l = m.at(-1, 0) !== 'n';
    const r = m.at(1, 0) !== 'n';
    box(g, x, y + 3, TILE, 10, '#5A3A20');
    box(g, x + (l ? 1 : 0), y + 4, TILE - (l ? 1 : 0) - (r ? 1 : 0), 8, '#D8C898');
    for (let k = 0; k < 4; k++)
      put(g, x + 2 + Math.floor(hash(x, y, k) * 12), y + 5 + Math.floor(hash(y, x, k) * 6), '#8A6A44');
    if (l) box(g, x + 1, y + 13, 2, 3, '#3A2618');
    if (r) box(g, x + 13, y + 13, 2, 3, '#3A2618');
  };
  // a hospital bed, seen from above: a wooden headboard, a plump pillow, a blanket folded down
  art.b = (g, x, y) => {
    box(g, x + 2, y, 12, 16, '#3A2618');
    box(g, x + 2, y, 12, 3, '#6A4428');
    box(g, x + 3, y + 3, 10, 12, '#F4F0EA');
    ellipse(g, x + 8, y + 5, 4, 2, '#FFFFFF');
    box(g, x + 3, y + 8, 10, 7, '#5A8A6A');
    box(g, x + 3, y + 8, 10, 2, '#E8E4DC');
    for (let i = 4; i < 13; i += 3) box(g, x + i, y + 11, 1, 4, '#4A7A5A');
    box(g, x + 2, y + 15, 12, 1, '#2A1C12');
  };
  // an apothecary's shelf: jars and bundles of herbs
  art.H = (g, x, y) => {
    box(g, x + 1, y + 1, 14, 14, '#5A3A20');
    for (const sy of [y + 2, y + 7, y + 12]) box(g, x + 2, sy + 3, 12, 1, '#3A2618');
    for (let k = 0; k < 9; k++) {
      const jx = x + 2 + (k % 3) * 4;
      const jy = y + 2 + Math.floor(k / 3) * 5;
      box(g, jx, jy, 3, 3, ['#3A8A5A', '#8AAAD0', '#C8963A', '#B04030', '#E8E0D0'][k % 5]);
    }
  };
  // the tavern's bar counter, joined along its length
  art.u = (g, x, y, m) => {
    const l = m.at(-1, 0) !== 'u';
    const r = m.at(1, 0) !== 'u';
    box(g, x, y + 2, TILE, 13, '#5A3A20');
    box(g, x, y + 2, TILE, 3, '#8A6440');
    for (let i = 2; i < TILE; i += 5) box(g, x + i, y + 6, 1, 9, '#3A2618');
    if (l) box(g, x, y + 2, 1, 13, '#2A1C12');
    if (r) box(g, x + 15, y + 2, 1, 13, '#2A1C12');
    if (hash(x, y, 31) < 0.5) {
      box(g, x + 6, y, 4, 4, '#C8963A');
      box(g, x + 6, y, 4, 1, '#F4F0EA');
    }
  };
  // a barrel
  art.x = (g, x, y) => {
    ellipse(g, x + 8, y + 9, 6, 6, '#7A4A2A');
    box(g, x + 2, y + 6, 12, 1, '#3A2618');
    box(g, x + 2, y + 12, 12, 1, '#3A2618');
    ellipse(g, x + 8, y + 4, 5, 2, '#9A6A3A');
  };
  // shelves of goods for sale
  art.S = (g, x, y) => {
    box(g, x + 1, y + 1, 14, 14, '#6A4428');
    for (const sy of [y + 5, y + 10, y + 14]) box(g, x + 2, sy, 12, 1, '#3A2618');
    for (let k = 0; k < 9; k++) {
      const gx = x + 2 + (k % 4) * 3;
      const gy = y + 2 + Math.floor(k / 4) * 5;
      box(g, gx, gy, 2, 3, ['#B04030', '#C8963A', '#3A8A5A', '#E8E0D0', '#4A6AA0'][(k + Math.floor(x / 16)) % 5]);
    }
  };
  // a crate
  art.k = (g, x, y) => {
    box(g, x + 2, y + 3, 12, 12, '#8A6430');
    box(g, x + 2, y + 3, 12, 1, '#B8884A');
    box(g, x + 2, y + 3, 1, 12, '#5A4020');
    box(g, x + 13, y + 3, 1, 12, '#5A4020');
    for (let i = 0; i < 12; i++) put(g, x + 2 + i, y + 3 + i, '#5A4020');
  };
  // a horse stall: a wooden half-door, and the horse's head looking over it
  art.X = (g, x, y) => {
    box(g, x, y + 8, TILE, 8, '#7A4A2A');
    for (let i = 0; i < TILE; i += 4) box(g, x + i, y + 8, 1, 8, '#4A3020');
    box(g, x, y + 8, TILE, 2, '#9A6A3A');
    const coat = ['#7A4A2A', '#3A2A20', '#C8A878', '#E8E0D0'][Math.floor(hash(x, y, 33) * 4)];
    box(g, x + 5, y + 1, 6, 8, coat);
    box(g, x + 6, y + 6, 4, 4, coat);
    put(g, x + 6, y + 3, '#1E1816');
    put(g, x + 9, y + 3, '#1E1816');
    box(g, x + 5, y, 1, 2, coat);
    box(g, x + 10, y, 1, 2, coat);
  };
  // a heap of hay
  art.h = (g, x, y) => {
    ellipse(g, x + 8, y + 10, 7, 5, '#C8A84A');
    ellipse(g, x + 8, y + 8, 5, 4, '#D8B85A');
    for (let k = 0; k < 8; k++)
      put(g, x + 3 + Math.floor(hash(x, y, k) * 10), y + 5 + Math.floor(hash(y, x, k) * 8), '#E8C86A');
  };
  // ---- the Bank of Warrior City (author, Oct 7, 2026)
  // the vault door: a 2x2 block of the back wall, a great round door of steel with a wheel and three brass dials.
  // Each of its four tiles draws the whole door (centred on the block), so the last one drawn leaves it whole.
  art.G = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    const cx = m.at(-1, 0) === 'G' ? x : x + TILE;
    const cy = m.at(0, -1) === '#' ? y + TILE : y;
    ellipse(g, cx, cy, 15, 15, '#2A2A30');
    ellipse(g, cx, cy, 14, 14, '#7A7A84');
    ellipse(g, cx, cy, 12, 12, '#9A9AA4');
    ellipse(g, cx, cy, 10, 10, '#6A6A74');
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      put(g, Math.round(cx + Math.cos(a) * 13), Math.round(cy + Math.sin(a) * 13), '#4A4A54');
    }
    // the wheel: four spokes and a hub
    box(g, cx - 7, cy, 15, 1, '#C8963A');
    box(g, cx, cy - 7, 1, 15, '#C8963A');
    for (let i = -5; i <= 5; i++) {
      put(g, cx + i, cy + i, '#C8963A');
      put(g, cx + i, cy - i, '#C8963A');
    }
    ellipse(g, cx, cy, 2, 2, '#E8C86A');
    // three brass dials across the top
    for (const dx of [-6, 0, 6]) {
      ellipse(g, cx + dx, cy - 9, 2, 2, '#E8C86A');
      put(g, cx + dx, cy - 10, '#3A2618');
    }
  };
  // a wall of deposit boxes, two tiles tall: rows of little brass-handled drawers
  art.K = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    const upper = m.at(0, -1) === '#';
    const top = upper ? y + 5 : y;
    const h = upper ? 11 : 12;
    box(g, x, top, TILE, h, '#5A3A20');
    for (let j = 0; j + 4 <= h; j += 4)
      for (let i = 0; i < TILE; i += 4) {
        box(g, x + i + 1, top + j + 1, 3, 3, '#8A6440');
        put(g, x + i + 2, top + j + 2, '#E8C86A');
      }
  };
  // the tellers' counter: dark wood, joined along its length, with a brass grille above it
  art.U = (g, x, y, m) => {
    const l = m.at(-1, 0) !== 'U';
    const r = m.at(1, 0) !== 'U';
    box(g, x, y + 6, TILE, 9, '#4A2A18');
    box(g, x, y + 6, TILE, 2, '#7A5230');
    for (let i = 3; i < TILE; i += 6) box(g, x + i, y + 9, 1, 6, '#2A1C12');
    box(g, x, y, TILE, 1, '#C8963A');
    for (let i = 1; i < TILE; i += 3) box(g, x + i, y, 1, 6, '#B8963A');
    if (l) box(g, x, y, 1, 15, '#2A1C12');
    if (r) box(g, x + 15, y, 1, 15, '#2A1C12');
    box(g, x, y + 15, TILE, 1, '#1A1210');
  };
  // a clerk's high desk with a ledger open on it: columns of figures, and a line in red ink
  art.E = (g, x, y) => {
    box(g, x + 2, y + 12, 2, 4, '#3A2618');
    box(g, x + 12, y + 12, 2, 4, '#3A2618');
    box(g, x + 1, y + 3, 14, 10, '#5A3A20');
    box(g, x + 1, y + 3, 14, 1, '#7A5230');
    box(g, x + 3, y + 4, 5, 7, '#F0E6CC');
    box(g, x + 8, y + 4, 5, 7, '#E8DCC0');
    box(g, x + 8, y + 4, 1, 7, '#B8A888');
    for (let j = 5; j < 10; j += 2) {
      box(g, x + 4, y + j, 3, 1, '#8A7A64');
      box(g, x + 9, y + j, 3, 1, '#8A7A64');
    }
    box(g, x + 9, y + 9, 3, 1, '#B04030');
    put(g, x + 13, y + 2, '#1E1816');
    box(g, x + 13, y, 1, 2, '#F4F0EA');
  };
  // heaps of gold coin on the vault floor
  art.Z = (g, x, y) => {
    ellipse(g, x + 8, y + 11, 7, 4, '#8A6420');
    ellipse(g, x + 8, y + 9, 6, 4, '#C8963A');
    ellipse(g, x + 8, y + 7, 4, 3, '#E8C86A');
    for (let k = 0; k < 7; k++)
      put(g, x + 3 + Math.floor(hash(x, y, k) * 10), y + 5 + Math.floor(hash(y, x, k) * 7), '#FFF0A0');
  };
  // an iron-bound strongbox, stamped with a fist: the war chest, one of very many
  art.R = (g, x, y) => {
    box(g, x + 1, y + 4, 14, 11, '#5A3A20');
    box(g, x + 1, y + 4, 14, 3, '#7A5230');
    box(g, x + 1, y + 7, 14, 1, '#2A2A30');
    box(g, x + 3, y + 4, 2, 11, '#4A4A54');
    box(g, x + 11, y + 4, 2, 11, '#4A4A54');
    box(g, x + 7, y + 8, 2, 3, '#C8963A');
    box(g, x + 1, y + 15, 14, 1, '#1A1210');
  };
  // The Painters' School (author, Oct 7, 2026): boarded up five hundred years. Drawn by name (a map's
  // `art` points a letter at them).
  // a window, boarded over from outside: light through the cracks
  art.boarded = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    if (m.at(0, -1) === '#') return;
    box(g, x + 3, y + 1, 10, 10, '#3A2618');
    box(g, x + 4, y + 2, 8, 8, '#E8D8A8');
    for (const by of [y + 2, y + 5, y + 8]) box(g, x + 3, by, 10, 2, '#6A4428');
  };
  // four bare hooks over clean squares where the paintings hung, and a brass plate under each
  art.hooks = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    if (m.at(0, -1) === '#') {
      box(g, x + 7, y + 6, 2, 2, '#2A1C12');
      box(g, x + 3, y + 9, 10, 7, '#E8DEC4');
      return;
    }
    box(g, x + 3, y, 10, 8, '#E8DEC4');
    box(g, x + 5, y + 9, 6, 2, '#C8963A');
    put(g, x + 6, y + 9, '#F0D07A');
  };
  // an easel with a canvas never finished: a sky, and a pencil line for the ground
  art.easel = (g, x, y) => {
    box(g, x + 4, y + 4, 1, 12, '#5A3A20');
    box(g, x + 11, y + 4, 1, 12, '#5A3A20');
    box(g, x + 7, y + 2, 2, 13, '#4A3020');
    box(g, x + 3, y + 2, 10, 9, '#F0E6CC');
    box(g, x + 3, y + 2, 10, 5, '#8AAAD0');
    box(g, x + 3, y + 8, 10, 1, '#8A8280');
    box(g, x + 2, y + 11, 12, 1, '#5A3A20');
  };
  // the master, in stone: an old man, a brush behind his ear, one arm a little longer than the other
  art.statue = (g, x, y) => {
    box(g, x + 3, y + 12, 10, 4, '#6A6260');
    box(g, x + 3, y + 12, 10, 1, '#8A8280');
    box(g, x + 5, y + 5, 6, 7, '#9A928C');
    ellipse(g, x + 8, y + 3, 3, 3, '#ACA5A0');
    box(g, x + 4, y + 6, 1, 6, '#8A8280');
    box(g, x + 11, y + 6, 1, 5, '#8A8280');
    box(g, x + 10, y + 1, 3, 1, '#C8963A');
  };
  // the master's stool, paint on the seat
  art.stool = (g, x, y) => {
    ellipse(g, x + 8, y + 7, 5, 3, '#7A5230');
    box(g, x + 4, y + 8, 1, 7, '#4A3020');
    box(g, x + 11, y + 8, 1, 7, '#4A3020');
    box(g, x + 7, y + 9, 2, 6, '#4A3020');
    put(g, x + 6, y + 6, '#B04030');
    put(g, x + 9, y + 7, '#4A6AA0');
  };
  // a student's desk, a sketchbook open on it
  art.desk = (g, x, y) => {
    box(g, x + 1, y + 4, 14, 9, '#6A4428');
    box(g, x + 1, y + 4, 14, 1, '#8A6440');
    box(g, x + 2, y + 13, 2, 3, '#3A2618');
    box(g, x + 12, y + 13, 2, 3, '#3A2618');
    box(g, x + 4, y + 6, 4, 5, '#F0E6CC');
    box(g, x + 8, y + 6, 4, 5, '#E8DCC0');
    put(g, x + 5, y + 8, '#3A2618');
    put(g, x + 6, y + 7, '#3A2618');
    put(g, x + 10, y + 9, '#3A2618');
  };

  // ---- the bakery by the Kaloseum (author, Oct 7, 2026): the Warden came down through its roof. Named keys too.
  /** The block of `name` tiles this one is part of: its top-left tile, in pixels, and its size in tiles. */
  const block = (x, y, m, name) => {
    let l = 0;
    while (m.at(-l - 1, 0) === name) l++;
    let u = 0;
    while (m.at(0, -u - 1) === name) u++;
    let w = 1;
    while (m.at(w - l, -u) === name) w++;
    let h = 1;
    while (m.at(-l, h - u) === name) h++;
    return { bx: x - l * TILE, by: y - u * TILE, w, h, last: m.at(1, 0) !== name && m.at(0, 1) !== name };
  };
  const rgb = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c);
  const mixAt = (a, b, k) => rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k));
  const flour = (g, x, y, w, h, n, seed) => {
    for (let k = 0; k < n; k++)
      put(g, x + Math.floor(hash(k, seed, 81) * w), y + Math.floor(hash(seed, k, 82) * h), '#F4F0EA');
  };
  // a hole in the top of the back wall, where the roof gave way: sky through it, broken laths, a rafter hanging in.
  // Each tile draws its wall; the last tile of the block draws the hole across all of it.
  art.skyhole = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    const b = block(x, y, m, 'skyhole');
    if (!b.last) return;
    const w = b.w * TILE;
    const h = b.h * TILE;
    for (let j = 0; j < h - 6; j++)
      for (let i = 0; i < w; i++) {
        const edge = 3 + Math.round(hash(i, j, 83) * 2) + Math.round(Math.abs(i - w / 2) * 0.35);
        if (j > h - 6 - edge || i < edge - 3 || i > w - edge + 2) continue;
        put(g, b.bx + i, b.by + j, j < 6 ? '#6A9AD0' : j < 14 ? '#8AB4E0' : '#A8C8EC');
      }
    // one cloud
    ellipse(g, b.bx + w / 2 + 3, b.by + 8, 5, 2, '#F4F4F8');
    ellipse(g, b.bx + w / 2 + 6, b.by + 7, 3, 2, '#FFFFFF');
    // laths snapped off round the edge, and a rafter hanging in at an angle
    for (let i = 2; i < w - 2; i += 5) box(g, b.bx + i, b.by + 1, 2, 3 + (i % 3), '#7A5230');
    for (let k = 0; k < 18; k++) box(g, b.bx + 4 + k, b.by + 4 + Math.round(k * 0.9), 2, 2, '#6A4428');
    flour(g, b.bx, b.by + h - 10, w, 10, 30, 1);
  };
  // the bread oven: a brick dome set into the wall, its mouth glowing, a peel leaning beside it. Drawn whole by the
  // block's last tile.
  art.oven = (g, x, y, m) => {
    wall(g, x, y, m, kindOf(m));
    const b = block(x, y, m, 'oven');
    if (!b.last) return;
    const w = b.w * TILE;
    const h = b.h * TILE;
    const cx = b.bx + w / 2;
    box(g, b.bx + 2, b.by + 6, w - 4, h - 6, '#8A3A2A');
    ellipse(g, cx, b.by + 10, w / 2 - 2, 8, '#8A3A2A');
    for (let j = 4; j < h; j += 4)
      for (let i = 2 + ((j / 4) % 2) * 3; i < w - 2; i += 6) box(g, b.bx + i, b.by + j, 1, 3, '#6A2A1E');
    for (let j = 4; j < h; j += 4) box(g, b.bx + 2, b.by + j, w - 4, 1, '#6A2A1E');
    // the mouth, and the fire in it
    box(g, cx - 7, b.by + 15, 14, 11, '#1E1816');
    ellipse(g, cx, b.by + 15, 7, 4, '#1E1816');
    box(g, cx - 6, b.by + 21, 12, 5, '#E86A2A');
    box(g, cx - 4, b.by + 19, 8, 3, '#F8B040');
    put(g, cx - 1, b.by + 18, '#FFE080');
    put(g, cx + 2, b.by + 19, '#FFE080');
    box(g, cx - 9, b.by + 26, 18, 2, '#5A5450');
    // the peel, leaning on the right
    box(g, b.bx + w - 4, b.by + 6, 1, h - 6, '#8A6440');
    ellipse(g, b.bx + w - 4, b.by + 6, 2, 3, '#A8804A');
  };
  // a rack of loaves, every one of them flattened
  art.flatbread = (g, x, y) => {
    box(g, x + 1, y + 1, 14, 14, '#6A4428');
    for (const sy of [y + 5, y + 10, y + 14]) box(g, x + 2, sy, 12, 1, '#3A2618');
    for (const sy of [y + 3, y + 8, y + 12])
      for (let i = 0; i < 2; i++) {
        box(g, x + 2 + i * 6, sy, 6, 2, '#C8904A');
        box(g, x + 3 + i * 6, sy, 4, 1, '#E0B06A');
      }
    flour(g, x + 1, y + 1, 14, 14, 6, x);
  };
  // the roof, in a heap: tiles, laths, a rafter, and the end of a loaf poking out of the bottom
  art.rubblepile = (g, x, y) => {
    ellipse(g, x + 8, y + 10, 7, 5, '#7A3426');
    for (let k = 0; k < 14; k++) {
      const px = x + 2 + Math.floor(hash(x + k, y, 84) * 11);
      const py = y + 6 + Math.floor(hash(y, x + k, 85) * 8);
      box(g, px, py, 3, 2, ['#A8503A', '#C8705A', '#6A5A50', '#8A8280'][k % 4]);
    }
    box(g, x + 1, y + 7, 13, 2, '#6A4428');
    ellipse(g, x + 12, y + 14, 3, 1, '#C8904A');
    flour(g, x, y + 4, 16, 12, 10, y);
  };
  // a sack of flour, burst: a slumped sack, and a white fan of flour across the floor
  art.flourburst = (g, x, y) => {
    for (let k = 0; k < 60; k++) {
      const a = hash(k, 1, 86) * Math.PI;
      const r = hash(k, 2, 86) * 8;
      put(g, x + 8 + Math.cos(a) * r * 1.3, y + 9 + Math.sin(a) * r, k % 3 ? '#F4F0EA' : '#E0DCD4');
    }
    ellipse(g, x + 8, y + 7, 5, 5, '#C8B890');
    ellipse(g, x + 8, y + 6, 4, 3, '#D8C8A0');
    box(g, x + 6, y + 2, 4, 2, '#A8986C');
    box(g, x + 6, y + 9, 5, 2, '#F4F0EA');
    put(g, x + 5, y + 6, '#8A7A54');
  };
  // the crater: the floor broken in the shape of a very large man, arms and legs out, flagstones cracked round it,
  // daylight from the hole above on it. Drawn whole by the block's last tile.
  art.crater = (g, x, y, m) => {
    const b = block(x, y, m, 'crater');
    if (!b.last) return;
    const w = b.w * TILE;
    const h = b.h * TILE;
    const cx = b.bx + w / 2;
    const cy = b.by + h / 2;
    const s = Math.min(w, h) / 34;
    const seg = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - ax - t * dx, py - ay - t * dy);
    };
    const depth = (i, j) =>
      Math.min(
        Math.hypot(i, j + 13) - 5,
        Math.max(Math.abs(i) - 7, Math.abs(j + 1) - 8),
        seg(i, j, -6, -6, -17, -15) - 3,
        seg(i, j, 6, -6, 17, -15) - 3,
        seg(i, j, -4, 6, -10, 17) - 3.5,
        seg(i, j, 4, 6, 10, 17) - 3.5,
      );
    for (let py = b.by - 4; py < b.by + h + 4; py++)
      for (let px = b.bx - 4; px < b.bx + w + 4; px++) {
        const i = (px - cx) / s;
        const j = (py - cy) / s;
        const d = depth(i, j);
        const cur = g[py]?.[px];
        if (!cur) continue;
        // a pool of daylight from the hole in the roof
        const lit = Math.hypot((px - cx) / (w * 0.62), (py - cy) / (h * 0.62));
        let c = lit < 1 ? mixAt(cur, '#F8F0D8', 0.22 * (1 - lit)) : cur;
        if (d <= 0) c = d > -1.2 ? '#2A2220' : j > 0 && d > -3 ? '#3A3230' : '#463E3A';
        else if (d < 2) c = '#2A2220';
        else if (d < 7 && hash(px, py, 87) < 0.05) c = '#2A2220';
        put(g, px, py, c);
      }
    // cracks running out across the flagstones
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + hash(k, 3, 88);
      let px = cx + Math.cos(a) * 15 * s;
      let py = cy + Math.sin(a) * 15 * s;
      for (let n = 0; n < 6 + Math.floor(hash(k, 4, 88) * 6); n++) {
        put(g, px, py, '#2A2220');
        px += Math.cos(a + (hash(k, n, 89) - 0.5)) * 1.2;
        py += Math.sin(a + (hash(n, k, 89) - 0.5)) * 1.2;
      }
    }
    flour(g, b.bx - 2, b.by - 2, w + 4, h + 4, 40, 9);
  };
  // the counter: dark wood, and a tray of buns pressed thin as coins
  art.bakecounter = (g, x, y, m) => {
    box(g, x, y + 4, TILE, 10, '#5A3A20');
    box(g, x, y + 4, TILE, 2, '#7A5230');
    box(g, x, y + 13, TILE, 2, '#3A2618');
    if (m.at(-1, 0) !== 'bakecounter') box(g, x, y + 4, 1, 11, '#2A1C12');
    if (m.at(1, 0) !== 'bakecounter') box(g, x + 15, y + 4, 1, 11, '#2A1C12');
    box(g, x + 3, y + 1, 10, 4, '#8A8280');
    for (let i = 0; i < 3; i++) ellipse(g, x + 5 + i * 3, y + 3, 1, 1, '#D8A060');
    flour(g, x, y + 4, 16, 9, 5, x + y);
  };
  return art;
}
