// Warrior City's interiors (author, Oct 3, 2026): furniture for rooms that aren't the Archive.
// Each piece fills one tile, drawn over the floor; walls ('V', windows 'Y', stained glass 'y',
// a fireplace 'F', a notice board 'N') are two tiles tall, like the Archive's shelves.

const TILE = 16;

/** Floors other than the Archive's planks: stone flags, clean white tile, straw over boards. */
export const FLOORS = {
  stone: (x, y, hash) => {
    // flags in staggered courses, each its own shade, lit on its upper-left edges and shaded on the lower-right
    const row = Math.floor(y / 8);
    const sx = x + (row % 2) * 5;
    const ix = sx % 10;
    const jy = y % 8;
    if (ix === 0 || jy === 0) return '#3A3432';
    const h = hash(Math.floor(sx / 10), row, 21);
    if (jy === 1 || ix === 1) return h < 0.5 ? '#6A6460' : '#66605C';
    if (jy === 7 || ix === 9) return '#4A4442';
    if (hash(x, y, 22) < 0.04) return '#4A4442';
    return ['#5A5450', '#544E4A', '#605A56'][Math.floor(h * 3)];
  },
  tile: (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? '#E0DCD4' : '#D0CCC4'),
  hay: (x, y, hash) => (hash(x, y, 23) < 0.35 ? '#C8A84A' : hash(x, y, 24) < 0.5 ? '#B8963A' : '#8A6A3A'),
};

export function interiorArt({ box, put, ellipse, hash, tint }) {
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
      // dressed stone in courses, worked out from where it sits so the two tiles of the wall run on: each block
      // its own shade, its top edge lit, its right end in shade (lit from the upper left)
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const py = y + j;
          const course = Math.floor(py / 5);
          const bx = x + i + (course % 2 ? 5 : 0);
          const ii = bx % 10;
          if (py % 5 === 0 || ii === 0) {
            put(g, x + i, py, d);
            continue;
          }
          const h = hash(Math.floor(bx / 10), course, 25);
          if (h < 0.3) tint?.(g, x + i, py, 0.12, '#0A0608', false);
          else if (h > 0.8) tint?.(g, x + i, py, 0.12, l, false);
          if (py % 5 === 1) tint?.(g, x + i, py, 0.4, l, false);
          else if (ii === 9) tint?.(g, x + i, py, 0.25, '#0A0608', false);
          else if (hash(x + i, py, 26) < 0.05) tint?.(g, x + i, py, 0.3, '#0A0608', false);
        }
    if (kind === 'wood' || kind === 'plank')
      // boards, each its own shade, lit down its left edge, a knot here and there
      for (let i = 0; i < TILE; i++) {
        const board = Math.floor((x + i) / 4);
        const h = hash(board, 0, 27);
        for (let j = 0; j < TILE; j++) {
          if (i % 4 === 0) {
            put(g, x + i, y + j, d);
            continue;
          }
          if (h < 0.35) tint?.(g, x + i, y + j, 0.15, '#0A0608', false);
          if (i % 4 === 1) tint?.(g, x + i, y + j, 0.3, l, false);
          if (hash(x + i, y + j, 28) < 0.03) tint?.(g, x + i, y + j, 0.35, '#0A0608', false);
        }
      }
    if (kind === 'plaster' || kind === 'white')
      // limewash, never quite even, with a timber rail along the top of the wainscot
      for (let j = 0; j < TILE; j++)
        for (let i = 0; i < TILE; i++) {
          const n = hash(Math.floor((x + i) / 3), Math.floor((y + j) / 2), 29);
          if (n < 0.25) tint?.(g, x + i, y + j, 0.08, '#0A0608', false);
          else if (n > 0.85) tint?.(g, x + i, y + j, 0.1, l, false);
        }
    if (upper) {
      box(g, x, y, TILE, 1, '#1A120C');
      box(g, x, y + 1, TILE, 2, d);
      box(g, x, y + 3, TILE, 1, l);
      for (let i = 0; i < TILE; i++) tint?.(g, x + i, y + 4, 0.25, '#0A0608', false);
    } else {
      box(g, x, y + 12, TILE, 4, d);
      box(g, x, y + 12, TILE, 1, l);
      box(g, x, y + 15, TILE, 1, '#1A120C');
      for (let i = 0; i < TILE; i++) tint?.(g, x + i, y + 11, 0.2, '#0A0608', false);
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
    // the chimney breast: dressed stone blocks, lit on the left, the right in shade, an outline round it
    const stones = (top, h) => {
      box(g, x, top, 16, h, '#2A2220');
      for (let j = 0; j < h; j++)
        for (let i = 1; i < 15; i++) {
          const py = top + j;
          const course = Math.floor((py - y + 32) / 4);
          const joint = py % 4 === 0 || (i + (course % 2) * 3) % 6 === 0;
          let c = joint ? '#4A3E3A' : hash(Math.floor((i + (course % 2) * 3) / 6), course, 30) < 0.5 ? '#7A6A64' : '#726260';
          if (!joint && i < 3) c = '#8A7C76';
          if (!joint && i > 12) c = '#5E504C';
          put(g, x + i, py, c);
        }
    };
    if (m.at(0, -1) === '#') {
      stones(y + 4, 12);
      box(g, x + 1, y + 3, 14, 1, '#2A2220');
      return;
    }
    stones(y, 14);
    // the mantel shelf, then the firebox: soot-black, the fire on a bed of embers, its glow on the stone
    box(g, x, y + 1, 16, 2, '#5A3A22');
    box(g, x, y + 1, 16, 1, '#7A5232');
    box(g, x + 3, y + 4, 10, 10, '#2A2220');
    box(g, x + 4, y + 5, 8, 9, '#140E0C');
    box(g, x + 4, y + 5, 8, 1, '#0A0606');
    box(g, x + 4, y + 12, 8, 2, '#8A2A10');
    box(g, x + 5, y + 11, 6, 1, '#4A2A1A');
    for (let i = 5; i < 11; i += 2) put(g, x + i, y + 12, '#F0A040');
    ellipse(g, x + 8, y + 10, 3, 2, '#E8742A');
    ellipse(g, x + 8, y + 9, 2, 2, '#FFB04A');
    put(g, x + 8, y + 9, '#FFF0C0');
    put(g, x + 7, y + 7, '#FFD060');
    put(g, x + 9, y + 6, '#E8742A');
    for (const i of [2, 13]) put(g, x + i, y + 11, '#C87040');
    // the hearthstone
    box(g, x, y + 14, 16, 2, '#5A4A44');
    box(g, x, y + 14, 16, 1, '#7A6A64');
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
  // the Long Mess's table (author, Oct 7, 2026): dark oak, joined along its length, a bowl at every place, and
  // over every bowl a curl of pale blue ghost steam. Benches run along both sides, nobody on them.
  art['3'] = (g, x, y, m) => {
    const l = m.at(-1, 0) !== '3';
    const r = m.at(1, 0) !== '3';
    const x0 = x + (l ? 1 : 0);
    const w = TILE - (l ? 1 : 0) - (r ? 1 : 0);
    const n = Math.round(x / TILE);
    // the far bench, mostly hidden behind the table
    box(g, x0, y, w, 2, '#3A2414');
    box(g, x0, y, w, 1, '#5A3A22');
    // the table's shadow on the flags, and the near bench's
    for (let i = 0; i < TILE; i++) {
      tint?.(g, x + i, y + 12, 0.5);
      tint?.(g, x + i, y + 15, 0.45);
    }
    // the top: two long boards, lit along the near edge of each, an outline round it all
    box(g, x, y + 2, TILE, 1, '#1E120A');
    box(g, x0, y + 3, w, 7, '#5A3820');
    box(g, x0, y + 3, w, 1, '#7A5232');
    box(g, x0, y + 6, w, 1, '#3A2414');
    box(g, x0, y + 7, w, 1, '#6A4428');
    for (let i = 0; i < TILE; i++) if (hash(x + i, y, 40) < 0.18) put(g, x + i, y + 4 + Math.floor(hash(x + i, y, 41) * 2) * 4, '#4A2E1A');
    if (n % 4 === 0) box(g, x + 15, y + 3, 1, 7, '#3A2414'); // where one length of table meets the next
    box(g, x, y + 10, TILE, 2, '#2E1C10');
    if (l) box(g, x, y + 2, 1, 10, '#1E120A');
    if (r) box(g, x + 15, y + 2, 1, 10, '#1E120A');
    // legs at the ends and every few feet
    if (l || n % 4 === 0) box(g, x + (r ? 12 : 2), y + 11, 2, 2, '#1E120A');
    // the near bench
    box(g, x0, y + 12, w, 1, '#1E120A');
    box(g, x0, y + 13, w, 2, '#5A3A22');
    box(g, x0, y + 13, w, 1, '#7A5232');
    if (l) box(g, x + 2, y + 15, 2, 1, '#1E120A');
    if (r || n % 3 === 0) box(g, x + 11, y + 15, 2, 1, '#1E120A');
    // a bowl at every place, a spoon beside some, a cup beside others
    box(g, x + 5, y + 4, 7, 4, '#2A2420');
    box(g, x + 4, y + 5, 9, 2, '#2A2420');
    box(g, x + 5, y + 5, 7, 2, '#D8D4CC');
    box(g, x + 6, y + 4, 5, 1, '#F4F0EA');
    box(g, x + 6, y + 5, 5, 1, '#8AB8D0');
    put(g, x + 7, y + 5, '#C8E4F0');
    box(g, x + 6, y + 7, 5, 1, '#A8A49C');
    const side = hash(x, y, 42);
    if (side < 0.45) {
      box(g, x + 12, y + 5, 1, 3, '#B8B8C0');
      put(g, x + 12, y + 4, '#E8E8F0');
    } else if (side < 0.75) {
      box(g, x + 2, y + 4, 2, 3, '#8A6A44');
      put(g, x + 2, y + 4, '#C8A070');
    }
    // and over every bowl, a curl of ghost steam rising
    for (const [i, j] of [[7, 3], [8, 2], [8, 1], [9, 0], [8, -1]]) put(g, x + i, y + j, j < 1 ? '#8AB8D0' : '#C8E4F0');
  };
  // a ghost stove: black iron, a pot on top, and a blue flame under it that gives no heat
  art['4'] = (g, x, y, m) => {
    const l = m.at(-1, 0) !== '4';
    const r = m.at(1, 0) !== '4';
    // the cold blue light it gives off, on the floor round its foot
    for (let j = 12; j < 22; j++)
      for (let i = -4; i < 20; i++) {
        const d = Math.hypot(i - 8, (j - 14) * 1.6) / 12;
        if (d < 1) tint?.(g, x + i, y + j, 0.22 * (1 - d), '#6AB0D8');
      }
    for (let i = 0; i < TILE; i++) tint?.(g, x + i, y + 16, 0.45);
    // the body: an outline, black iron lit on its top and left, rivets
    box(g, x + (l ? 0 : 0), y + 3, TILE, 13, '#0E0E12');
    box(g, x + (l ? 1 : 0), y + 4, TILE - (l ? 1 : 0) - (r ? 1 : 0), 11, '#2A2A30');
    box(g, x + (l ? 1 : 0), y + 4, TILE - (l ? 1 : 0) - (r ? 1 : 0), 1, '#5A5A66');
    if (l) box(g, x + 1, y + 4, 1, 11, '#44444E');
    box(g, x, y + 7, TILE, 1, '#1A1A20');
    for (const i of [3, 12]) put(g, x + i, y + 6, '#6A6A78');
    // the oven door, the ghost flame inside
    box(g, x + 3, y + 9, 10, 5, '#0E0E12');
    box(g, x + 4, y + 10, 8, 3, '#14202A');
    box(g, x + 5, y + 11, 6, 2, '#3A7AA8');
    for (let i = 5; i < 11; i += 2) put(g, x + i, y + 10, '#6AB0D8');
    put(g, x + 7, y + 11, '#C8E4F0');
    put(g, x + 8, y + 11, '#E8F4FA');
    box(g, x + 3, y + 8, 10, 1, '#5A5A66');
    // the feet
    if (l) box(g, x + 1, y + 15, 2, 1, '#0E0E12');
    if (r) box(g, x + 13, y + 15, 2, 1, '#0E0E12');
    // a pot on the hob, lit on its left, a lid, and the steam that never warms anything
    box(g, x + 3, y, 10, 4, '#0E0E12');
    box(g, x + 4, y, 8, 4, '#3A3A44');
    box(g, x + 4, y, 2, 4, '#5A5A66');
    box(g, x + 3, y - 1, 10, 1, '#2A2A30');
    put(g, x + 8, y - 2, '#5A5A66');
    put(g, x + 2, y + 1, '#2A2A30');
    put(g, x + 13, y + 1, '#2A2A30');
    for (const [i, j] of [[6, -3], [7, -4], [9, -3], [10, -5], [8, -6], [11, -4]]) put(g, x + i, y + j, '#C8E4F0');
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
    // staves lit on the left, shaded on the right, two iron hoops, a lid
    ellipse(g, x + 8, y + 9, 7, 6, '#2A1A10');
    ellipse(g, x + 8, y + 9, 6, 6, '#7A4A2A');
    box(g, x + 3, y + 5, 2, 9, '#9A6A3A');
    box(g, x + 11, y + 5, 3, 9, '#5A3820');
    box(g, x + 8, y + 4, 1, 10, '#5A3820');
    box(g, x + 2, y + 6, 12, 1, '#3A2E2A');
    box(g, x + 2, y + 12, 12, 1, '#3A2E2A');
    put(g, x + 3, y + 6, '#7A6A64');
    put(g, x + 3, y + 12, '#7A6A64');
    ellipse(g, x + 8, y + 4, 5, 2, '#5A3820');
    ellipse(g, x + 8, y + 4, 4, 1, '#B07A48');
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
  return art;
}
