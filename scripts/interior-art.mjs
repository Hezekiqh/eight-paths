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
};

export function interiorArt({ box, put, ellipse, hash }) {
  const WALLS = {
    stone: ['#6A6260', '#585250', '#8A8280'],
    plaster: ['#D8CCB0', '#C0B498', '#E8DCC0'],
    wood: ['#6A4A2E', '#523A22', '#8A6440'],
    white: ['#E8E4DC', '#D0CCC4', '#F4F0EA'],
    plank: ['#8A3A2A', '#6A2A1E', '#AA5A4A'],
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
    for (const [px, py] of [[4, 1], [11, 1], [5, 6], [12, 8]]) put(g, x + px, y + py, '#B04030');
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
    for (let k = 0; k < 4; k++) put(g, x + 2 + Math.floor(hash(x, y, k) * 12), y + 5 + Math.floor(hash(y, x, k) * 6), '#8A6A44');
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
    for (let k = 0; k < 8; k++) put(g, x + 3 + Math.floor(hash(x, y, k) * 10), y + 5 + Math.floor(hash(y, x, k) * 8), '#E8C86A');
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
  return art;
}
