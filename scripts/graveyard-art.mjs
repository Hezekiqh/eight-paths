// The Graveyard of Kings, behind Kingdom Town's chapel (author, Oct 7, 2026): a dry-stone wall, three royal
// headstones, rows of soldiers' graves dug open from below, the Warden's great grave with its chain snapped, the
// crypt's mound and gate, and the sockets the gate's stones go back into. Named keys only (a map's `art` points
// its letters at them), so no older map's letter is ever drawn over.

const S = {
  stone: '#7A7470',
  stoneLight: '#9A938C',
  stoneDark: '#4A4442',
  outline: '#2A2422',
  moss: '#4E6E34',
  earth: '#5A4028',
  earthDark: '#3E2C1C',
  earthLight: '#7A5A38',
  hole: '#140E0A',
  iron: '#3A3A42',
  ironLight: '#6A6A78',
  wood: '#5A3E28',
  woodDark: '#3A2818',
  gold: '#C8963A',
  turf: '#3A5A2C',
  turfLight: '#4E7A3A',
  turfDark: '#2A4220',
};

export function graveyardArt({ box, put, ellipse, hash }) {
  /** A headstone with a rounded top, `w` wide and `h` tall, standing with its foot at (cx, by). */
  const headstone = (g, cx, by, w, h) => {
    const x = cx - Math.floor(w / 2);
    const y = by - h;
    box(g, x + 1, by, w, 1, S.outline);
    box(g, x, y + 2, w, h - 2, S.stone);
    ellipse(g, cx, y + 2, Math.floor(w / 2), 2, S.stone);
    box(g, x, y + 2, 1, h - 2, S.stoneLight);
    box(g, x + w - 1, y + 2, 1, h - 2, S.stoneDark);
    box(g, x, by - 1, w, 1, S.stoneDark);
  };
  /** A few clods of earth flung out round a hole, the way they'd land if thrown from below. */
  const clods = (g, x, y, seed) => {
    for (let k = 0; k < 9; k++) {
      const a = hash(x, y, seed + k) * Math.PI * 2;
      const r = 6 + hash(y, x, seed + k) * 2;
      put(g, x + 8 + Math.round(Math.cos(a) * r), y + 10 + Math.round(Math.sin(a) * r * 0.7), S.earthDark);
    }
  };
  return {
    'gy-wall'(g, x, y) {
      // dry-stone, seen from above: rough blocks, mortarless, moss in the cracks
      box(g, x, y, 16, 16, S.stoneDark);
      for (let j = 0; j < 16; j += 4)
        for (let i = -((j / 4) % 2) * 3; i < 16; i += 6)
          box(g, x + Math.max(0, i), y + j, Math.min(5, 16 - i), 3, S.stone);
      for (let k = 0; k < 3; k++)
        put(g, x + Math.floor(hash(x, y, k + 90) * 16), y + Math.floor(hash(y, x, k + 91) * 16), S.moss);
    },
    'gy-door'(g, x, y) {
      // the chapel's back door, set into the wall
      box(g, x, y, 16, 16, S.stoneDark);
      box(g, x + 3, y + 1, 10, 15, S.woodDark);
      box(g, x + 4, y + 2, 8, 14, S.wood);
      for (let i = 6; i < 12; i += 3) box(g, x + i, y + 2, 1, 14, S.woodDark);
      put(g, x + 10, y + 9, S.gold);
    },
    'gy-dug'(g, x, y) {
      // a soldier's headstone, and in front of it the grave, open, its earth thrown outwards
      clods(g, x, y, 100);
      ellipse(g, x + 8, y + 11, 6, 4, S.earthLight);
      ellipse(g, x + 8, y + 11, 5, 3, S.earth);
      box(g, x + 5, y + 9, 6, 5, S.hole);
      box(g, x + 5, y + 9, 6, 1, S.earthDark);
      headstone(g, x + 8, y + 7, 6, 7);
      box(g, x + 7, y + 3, 2, 1, S.stoneDark);
      box(g, x + 7, y + 5, 2, 1, S.stoneDark);
    },
    'gy-warden'(g, x, y, m) {
      // the Warden's grave across two tiles: a great slab of a headstone over a deep pit, a snapped chain
      if (m.at(-1, 0) === 'V') return;
      clods(g, x, y, 110);
      clods(g, x + 16, y, 120);
      ellipse(g, x + 16, y + 11, 14, 5, S.earthLight);
      ellipse(g, x + 16, y + 11, 13, 4, S.earth);
      box(g, x + 6, y + 9, 20, 6, S.hole);
      headstone(g, x + 16, y + 8, 14, 8);
      for (let i = 11; i < 21; i += 2) put(g, x + i, y + 3, S.stoneDark);
      for (let i = 12; i < 20; i += 2) put(g, x + i, y + 5, S.stoneDark);
      // the chain: links lying in the earth either side, the ends bent outwards
      for (const [cx, cy] of [
        [2, 13],
        [4, 14],
        [6, 15],
        [27, 13],
        [29, 12],
        [30, 10],
      ]) {
        box(g, x + cx, y + cy, 2, 1, S.ironLight);
        put(g, x + cx, y + cy + 1, S.iron);
      }
      put(g, x + 31, y + 9, S.ironLight);
      put(g, x + 1, y + 11, S.ironLight);
    },
    'gy-mound'(g, x, y, m) {
      // the crypt's mound: turf over the top, a stone face along the bottom
      const bottom = m.at(0, 1) !== 'M' && m.at(0, 1) !== 'G';
      box(g, x, y, 16, 16, S.turf);
      for (let k = 0; k < 6; k++)
        put(g, x + Math.floor(hash(x, y, k + 130) * 16), y + Math.floor(hash(y, x, k + 131) * 16), S.turfLight);
      if (m.at(0, -1) !== 'M') box(g, x, y, 16, 2, S.turfLight);
      if (m.at(-1, 0) !== 'M') box(g, x, y, 2, 16, S.turfDark);
      if (m.at(1, 0) !== 'M') box(g, x + 14, y, 2, 16, S.turfDark);
      if (bottom) {
        box(g, x, y + 6, 16, 10, S.stone);
        for (let j = 9; j < 16; j += 3) box(g, x, y + j, 16, 1, S.stoneDark);
        box(g, x, y + 6, 16, 1, S.stoneLight);
      }
    },
    'gy-gate'(g, x, y) {
      // the iron gate in the mound's stone face
      box(g, x, y, 16, 16, S.turf);
      box(g, x, y, 16, 2, S.turfLight);
      box(g, x, y + 3, 16, 13, S.stone);
      box(g, x + 1, y + 3, 14, 2, S.stoneLight);
      box(g, x + 2, y + 5, 12, 11, S.hole);
      for (let i = 3; i < 14; i += 3) box(g, x + i, y + 5, 1, 11, S.iron);
      box(g, x + 2, y + 8, 12, 1, S.ironLight);
      box(g, x + 2, y + 13, 12, 1, S.iron);
    },
    'gy-king'(g, x, y) {
      // the Mad King's stone: the tallest, a crown carved at the top, lichen up one side
      headstone(g, x + 8, y + 15, 12, 15);
      box(g, x + 5, y + 5, 6, 2, S.gold);
      for (const i of [5, 7, 8, 10]) put(g, x + i, y + 4, S.gold);
      for (let j = 9; j < 14; j += 2) box(g, x + 5, y + j, 6, 1, S.stoneDark);
      for (let j = 8; j < 14; j++) if (hash(x, y + j, 140) < 0.5) put(g, x + 3, y + j, S.moss);
    },
    'gy-queen'(g, x, y) {
      // the Beautiful Queen's stone: a plain circlet, and a blank where her name should be
      headstone(g, x + 8, y + 15, 10, 13);
      ellipse(g, x + 8, y + 6, 2, 1, S.stoneDark);
      put(g, x + 8, y + 5, S.stoneLight);
      box(g, x + 5, y + 9, 6, 1, S.stoneDark);
      box(g, x + 5, y + 12, 6, 1, S.stoneDark);
    },
    'gy-prince'(g, x, y) {
      // the Lost Prince's stone: smaller, a little crown, and very tidy
      headstone(g, x + 8, y + 15, 8, 11);
      box(g, x + 6, y + 7, 4, 1, S.gold);
      put(g, x + 6, y + 6, S.gold);
      put(g, x + 9, y + 6, S.gold);
      box(g, x + 6, y + 10, 4, 1, S.stoneDark);
    },
    'gy-socket'(g, x, y) {
      // a flagstone with a round socket in it, worn by the stone that used to sit there
      box(g, x + 1, y + 2, 14, 13, S.stoneDark);
      box(g, x + 1, y + 2, 14, 12, S.stone);
      box(g, x + 1, y + 2, 14, 1, S.stoneLight);
      ellipse(g, x + 8, y + 8, 4, 3, S.outline);
      ellipse(g, x + 8, y + 9, 3, 2, S.hole);
      put(g, x + 3, y + 12, S.moss);
      put(g, x + 12, y + 4, S.moss);
    },
    'gy-heap'(g, x, y) {
      // a heap of earth, a spade stood in it
      ellipse(g, x + 8, y + 12, 7, 4, S.earthDark);
      ellipse(g, x + 8, y + 11, 6, 3, S.earth);
      ellipse(g, x + 7, y + 10, 3, 1, S.earthLight);
      box(g, x + 10, y + 1, 1, 8, S.wood);
      box(g, x + 9, y + 1, 3, 1, S.woodDark);
      box(g, x + 9, y + 8, 3, 3, S.ironLight);
    },
  };
}
