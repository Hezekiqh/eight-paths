// Draws the stand-in sprite for every character in the collection and writes
// them to assets/sprites/<id>/idle.png (×12, sharp pixels), plus the list the
// app loads in src/art/stand-ins.ts. Real art from PixelLab replaces these one
// at a time through src/art/sprites.ts; rerun this after adding a character.
//
// Usage: node scripts/stand-in-sprites.mjs
//
// Every sprite is 32×48 with a two-frame idle bob and an automatic outline.
// The core eight are drawn by hand below; everyone else is described by a
// short spec (body shape, hair, hat, outfit, what they hold) or, for animals
// and spirits, a drawing of their own.

import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const W = 32,
  H = 48,
  LEG_TOP = 34,
  DROP = 2,
  SCALE = 12;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const OUT = hex('#140E1C'),
  EYE = hex('#140E1C');
const SKIN = hex('#E8B48C'),
  SKIN2 = hex('#C98E6A'),
  DARK = hex('#8A5A44');

// Palette shared by the specs.
const C = {
  skin1: '#F2CDA8',
  skin2: '#E8B48C',
  skin3: '#C98E6A',
  skin4: '#A86E4A',
  skin5: '#7A4B32',
  skin6: '#5A3624',
  black: '#2A2030',
  grey: '#8A8898',
  silver: '#C8CCD8',
  white: '#F0E6C8',
  cream: '#E8DCC0',
  brown: '#6A4028',
  wood: '#8A5A34',
  leather: '#5C3A28',
  tan: '#B8A07A',
  steel: '#9AA0B4',
  steel2: '#6A7088',
  gold: '#FFC940',
  brass: '#C8A040',
  red: '#C4442A',
  crimson: '#A02838',
  orange: '#E07A30',
  yellow: '#F2C14E',
  green: '#3E7A4A',
  leaf: '#4ADE80',
  moss: '#5A7A3A',
  teal: '#2DD4BF',
  blue: '#3A6AB0',
  navy: '#2A3470',
  sky: '#7AB0E0',
  purple: '#8B5CF6',
  violet: '#6A4A9E',
  pink: '#FF4FD8',
  rose: '#E07A9A',
  lavender: '#A890C8',
  hairBlack: '#2A2024',
  hairBrown: '#5C3A28',
  hairAuburn: '#A0482A',
  hairBlond: '#E0B850',
  hairGrey: '#B0B0B8',
  hairWhite: '#E8E4DC',
  hairGreen: '#4E7A3A',
  hairGinger: '#D86A2A',
};
const col = (c) => (typeof c === 'string' ? hex(C[c] ?? c) : c);

function canvas() {
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const f = {
    g,
    rect(x, y, w, h, c) {
      const rgb = col(c);
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++) if (i >= 0 && i < W && j >= 0 && j < H) g[j][i] = rgb;
      return f;
    },
    px(pts, c) {
      pts.forEach(([x, y]) => f.rect(x, y, 1, 1, c));
      return f;
    },
    trap(y0, y1, hw0, hw1, c) {
      for (let y = y0; y <= y1; y++) {
        const hw = Math.round(hw0 + ((hw1 - hw0) * (y - y0)) / Math.max(1, y1 - y0));
        f.rect(16 - hw, y, hw * 2, 1, c);
      }
      return f;
    },
    head(skin = SKIN) {
      return f.rect(12, 16, 8, 8, skin).rect(13, 20, 2, 1, EYE).rect(17, 20, 2, 1, EYE);
    },
    arms(c, hand = SKIN) {
      return f.rect(9, 25, 2, 7, c).rect(21, 25, 2, 7, c).rect(9, 32, 2, 2, hand).rect(21, 32, 2, 2, hand);
    },
    body(top, shade, legs, boots) {
      return f
        .rect(11, 24, 10, 10, top)
        .arms(shade)
        .rect(12, 34, 3, 8, legs)
        .rect(17, 34, 3, 8, legs)
        .rect(11, 42, 4, 3, boots)
        .rect(17, 42, 4, 3, boots);
    },
    robe(c, shade, feet) {
      return f.trap(24, 43, 5, 8, c).arms(shade).rect(12, 44, 3, 1, feet).rect(17, 44, 3, 1, feet);
    },
  };
  return f;
}

// The core eight, drawn by hand.
const cast = {
  brannoc(f) {
    const steel = hex('#9AA0B4'),
      steel2 = hex('#6A7088'),
      red = hex('#C4442A');
    f.rect(10, 24, 12, 10, steel).arms(steel2).rect(10, 31, 12, 1, hex('#5C3A28'));
    // Sweetheart, held upright in his right hand: blade, guard, the grip in his fist, pommel
    f.rect(23, 13, 2, 17, hex('#D8DCE8'))
      .rect(21, 30, 6, 1, hex('#8A6A3A'))
      .rect(23, 31, 2, 3, hex('#5C3A28'))
      .rect(21, 32, 4, 2, SKIN)
      .rect(23, 34, 2, 1, hex('#8A6A3A'));
    f.rect(12, 34, 3, 8, steel2)
      .rect(17, 34, 3, 8, steel2)
      .rect(11, 42, 4, 3, hex('#5C3A28'))
      .rect(17, 42, 4, 3, hex('#5C3A28'));
    f.head()
      .rect(12, 15, 8, 2, red)
      .rect(12, 21, 8, 4, red)
      .rect(13, 25, 6, 2, red)
      .rect(14, 27, 4, 1, red)
      .rect(15, 28, 2, 1, red);
    f.rect(14, 22, 4, 1, SKIN);
  },
  ysolde(f) {
    const gown = hex('#9A6A9E'),
      gown2 = hex('#76507C'),
      sack = hex('#B8A07A'),
      gold = hex('#FFC940'),
      hair = hex('#3A2A2E');
    f.robe(gown, gown2, hex('#2A2030'))
      .rect(11, 30, 10, 1, gold)
      .rect(13, 36, 2, 2, sack)
      .rect(18, 39, 2, 2, sack)
      .rect(17, 27, 2, 1, sack);
    f.rect(21, 33, 3, 4, hex('#6A4028'))
      .rect(22, 34, 1, 2, hex('#E8DCC0'))
      .px(
        [
          [21, 31],
          [21, 32],
        ],
        hex('#B0B0B8'),
      ); // chained ledger
    f.head().rect(11, 15, 10, 3, hair).rect(11, 18, 1, 5, hair).rect(20, 18, 1, 5, hair).rect(14, 12, 4, 3, hair);
    f.px(
      [
        [19, 19],
        [19, 21],
        [20, 20],
      ],
      gold,
    ).px(
      [
        [20, 22],
        [20, 23],
      ],
      gold,
    ); // monocle and its chain
  },
  quill(f) {
    const coat = hex('#3A3470'),
      coat2 = hex('#2A2458'),
      hat = hex('#8B5CF6'),
      ink = hex('#2A2A50'),
      glass = hex('#CFE0F0');
    f.robe(coat, coat2, hex('#2A2030')).arms(coat2, ink).rect(11, 30, 10, 1, hex('#6A4028'));
    f.rect(24, 22, 5, 4, hex('#A0302A'))
      .rect(25, 23, 3, 2, hex('#F0E6C8'))
      .px([[28, 26]], hex('#F0E6C8')); // the biting book
    f.head().rect(12, 16, 8, 2, hex('#6A4028'));
    f.rect(12, 19, 3, 3, glass)
      .rect(17, 19, 3, 3, glass)
      .px(
        [
          [13, 20],
          [18, 20],
        ],
        EYE,
      )
      .px(
        [
          [15, 20],
          [16, 20],
        ],
        hex('#FFC940'),
      );
    f.rect(10, 15, 12, 1, hat)
      .trap(8, 14, 1, 4, hat)
      .px(
        [
          [13, 13],
          [19, 12],
        ],
        hex('#FF4D5E'),
      )
      .px([[17, 10]], hex('#FFC940'))
      .px([[15, 12]], hex('#4ADE80'));
  },
  wren(f) {
    const habit = hex('#8A8898'),
      habit2 = hex('#6A687A'),
      veil = hex('#5A586A'),
      lamp = hex('#FFD86A');
    f.robe(habit, habit2, hex('#2A2030'))
      .rect(13, 24, 6, 1, hex('#F0E6C8'))
      .px(
        [
          [15, 30],
          [16, 30],
        ],
        hex('#FFC940'),
      );
    f.rect(11, 15, 10, 10, veil)
      .rect(13, 17, 6, 6, SKIN)
      .px(
        [
          [14, 20],
          [17, 20],
        ],
        EYE,
      );
    f.px([[22, 34]], hex('#3A3440'))
      .rect(21, 35, 3, 4, lamp)
      .rect(22, 36, 1, 2, hex('#FFF4C0'))
      .rect(21, 39, 3, 1, hex('#3A3440'));
  },
  oren(f) {
    const robe = hex('#2DD4BF'),
      robe2 = hex('#1E9C8C'),
      bead = hex('#8A5A34');
    f.trap(23, 43, 5, 7, robe).arms(robe2).rect(11, 30, 10, 1, robe2).rect(12, 44, 3, 1, SKIN).rect(17, 44, 3, 1, SKIN);
    f.rect(12, 14, 8, 9, SKIN).rect(13, 14, 5, 1, hex('#F4CCA8')).rect(13, 19, 2, 1, EYE).rect(17, 19, 2, 1, EYE); // tall, shaved head, calm eyes
    f.px(
      [
        [12, 23],
        [13, 24],
        [14, 25],
        [15, 26],
        [16, 26],
        [18, 24],
        [19, 23],
      ],
      bead,
    ); // one bead missing
  },
  pip(f) {
    const p = [hex('#FF4FD8'), hex('#2DD4BF'), hex('#FFC940'), hex('#8B5CF6')];
    f.body(p[0], p[3], hex('#3E7A4A'), hex('#6A4028'));
    f.rect(16, 24, 5, 5, p[1]).rect(11, 29, 5, 5, p[2]).rect(16, 29, 5, 5, p[0]).rect(11, 24, 5, 5, p[3]);
    f.rect(20, 28, 5, 5, hex('#B87838'))
      .rect(22, 29, 1, 2, hex('#3A2418'))
      .rect(24, 21, 1, 8, hex('#8A5A34'))
      .rect(23, 20, 3, 1, hex('#5C3A28')); // lute
    f.head()
      .rect(12, 15, 8, 2, hex('#D86A2A'))
      .px(
        [
          [11, 16],
          [20, 16],
          [13, 14],
          [17, 14],
          [15, 13],
        ],
        hex('#D86A2A'),
      );
    f.px(
      [
        [13, 21],
        [14, 22],
        [18, 21],
        [17, 22],
      ],
      SKIN2,
    );
  },
  tamsin(f) {
    const apron = hex('#7A4A2A'),
      shirt = hex('#FF8A3D'),
      metal = hex('#9AA0B4'),
      metal2 = hex('#6A7088');
    f.body(apron, shirt, hex('#3A3848'), hex('#1E1A24'))
      .rect(21, 25, 2, 9, metal)
      .px(
        [
          [21, 28],
          [22, 28],
          [21, 31],
        ],
        metal2,
      );
    f.rect(11, 32, 10, 1, hex('#2A2030'))
      .px(
        [
          [13, 33],
          [18, 33],
        ],
        hex('#FFC940'),
      )
      .px([[16, 33]], metal);
    f.head()
      .rect(12, 15, 8, 2, hex('#2A2030'))
      .rect(11, 17, 10, 1, hex('#2A2030'))
      .rect(13, 17, 2, 1, shirt)
      .rect(17, 17, 2, 1, shirt);
    f.px(
      [
        [13, 22],
        [18, 23],
      ],
      hex('#6A6470'),
    );
  },
  moss(f) {
    const cloak = hex('#6A4A30'),
      cloak2 = hex('#4E3622'),
      leaf = hex('#4ADE80'),
      fox = hex('#E07A30');
    f.body(hex('#3E6A3A'), cloak2, hex('#4A3A2A'), hex('#2A2020'))
      .trap(24, 38, 6, 8, cloak)
      .rect(13, 24, 6, 14, hex('#3E6A3A'));
    f.head()
      .rect(12, 15, 8, 2, hex('#4E3A22'))
      .rect(11, 16, 1, 5, hex('#4E3A22'))
      .px(
        [
          [13, 14],
          [18, 15],
          [20, 17],
        ],
        leaf,
      );
    f.rect(23, 42, 5, 3, fox)
      .rect(27, 41, 3, 3, fox)
      .px([[28, 40]], fox)
      .px([[29, 43]], hex('#F0E6C8'))
      .rect(21, 43, 2, 1, fox)
      .px([[21, 42]], hex('#F0E6C8')); // Tuft
  },
};

// ---------------------------------------------------------------------------
// Everyone else: a person built from a spec.

const LAYOUT = {
  normal: {
    h: 16,
    ty: 24,
    th: 10,
    ly: 34,
    lh: 8,
    by: 42,
    ay: 25,
    ah: 7,
    hy: 32,
    tx: 11,
    tw: 10,
    aL: 9,
    aR: 21,
    hw: [5, 8],
  },
  kid: {
    h: 21,
    ty: 29,
    th: 7,
    ly: 36,
    lh: 6,
    by: 42,
    ay: 30,
    ah: 4,
    hy: 34,
    tx: 11,
    tw: 10,
    aL: 9,
    aR: 21,
    hw: [4, 6],
  },
  tall: {
    h: 12,
    ty: 20,
    th: 14,
    ly: 34,
    lh: 8,
    by: 42,
    ay: 21,
    ah: 10,
    hy: 31,
    tx: 11,
    tw: 10,
    aL: 9,
    aR: 21,
    hw: [5, 8],
  },
  big: {
    h: 15,
    ty: 23,
    th: 11,
    ly: 34,
    lh: 8,
    by: 42,
    ay: 24,
    ah: 8,
    hy: 32,
    tx: 10,
    tw: 12,
    aL: 8,
    aR: 22,
    hw: [6, 9],
  },
};

const HAIR = {
  none() {},
  short: (f, L, c) => f.rect(12, L.h - 1, 8, 2, c),
  // slicked back, with a sharp widow's peak and sideburns: the villain's cut
  slick: (f, L, c) =>
    f.rect(12, L.h - 1, 8, 2, c).px(
      [
        [15, L.h + 1],
        [16, L.h + 1],
        [12, L.h + 1],
        [12, L.h + 2],
        [19, L.h + 1],
        [19, L.h + 2],
      ],
      c,
    ),
  spiky: (f, L, c) =>
    f.rect(12, L.h - 1, 8, 2, c).px(
      [
        [12, L.h - 2],
        [14, L.h - 3],
        [16, L.h - 2],
        [18, L.h - 3],
        [19, L.h - 2],
      ],
      c,
    ),
  long: (f, L, c) =>
    f
      .rect(11, L.h - 1, 10, 3, c)
      .rect(11, L.h + 2, 1, 7, c)
      .rect(20, L.h + 2, 1, 7, c),
  bob: (f, L, c) =>
    f
      .rect(11, L.h - 1, 10, 3, c)
      .rect(11, L.h + 2, 1, 4, c)
      .rect(20, L.h + 2, 1, 4, c),
  bun: (f, L, c) => f.rect(12, L.h - 1, 8, 2, c).rect(14, L.h - 4, 4, 3, c),
  braids: (f, L, c) =>
    f
      .rect(11, L.h - 1, 10, 3, c)
      .rect(11, L.h + 2, 1, 6, c)
      .rect(20, L.h + 2, 1, 6, c)
      .rect(10, L.h + 7, 1, 6, c)
      .rect(21, L.h + 7, 1, 6, c),
  pigtails: (f, L, c) =>
    f
      .rect(12, L.h - 1, 8, 2, c)
      .rect(9, L.h + 1, 2, 4, c)
      .rect(21, L.h + 1, 2, 4, c),
  topknot: (f, L, c) => f.rect(12, L.h - 1, 8, 2, c).rect(15, L.h - 4, 2, 3, c),
  curly: (f, L, c) =>
    f.rect(11, L.h - 2, 10, 4, c).px(
      [
        [10, L.h],
        [21, L.h],
        [11, L.h + 3],
        [20, L.h + 3],
      ],
      c,
    ),
  bald: (f, L, c) => f.rect(13, L.h, 5, 1, c ?? C.cream),
  silver: (f, L, c) => f.rect(11, L.h - 1, 10, 3, c).rect(20, L.h + 2, 1, 22, c),
};

const HATS = {
  wizard: (f, L, c) => f.rect(10, L.h - 1, 12, 1, c).trap(L.h - 8, L.h - 2, 1, 4, c),
  cap: (f, L, c) => f.rect(12, L.h - 2, 8, 2, c).rect(18, L.h, 4, 1, c),
  crown: (f, L) =>
    f.rect(12, L.h - 2, 8, 2, C.gold).px(
      [
        [12, L.h - 3],
        [15, L.h - 3],
        [16, L.h - 3],
        [19, L.h - 3],
      ],
      C.gold,
    ),
  helmet: (f, L, c = C.steel) => f.rect(11, L.h - 2, 10, 4, c).rect(15, L.h + 2, 2, 2, c),
  plume: (f, L, c = C.steel) => f.rect(11, L.h - 2, 10, 4, c).rect(15, L.h - 6, 2, 4, C.red),
  hood: (f, L, c) => f.rect(11, L.h - 1, 10, 10, c),
  tophat: (f, L, c) =>
    f
      .rect(10, L.h - 1, 12, 1, c)
      .rect(12, L.h - 7, 8, 6, c)
      .rect(12, L.h - 3, 8, 1, C.crimson),
  straw: (f, L) =>
    f
      .rect(9, L.h - 1, 14, 1, C.yellow)
      .rect(12, L.h - 3, 8, 2, C.yellow)
      .rect(12, L.h - 2, 8, 1, C.brown),
  sunhat: (f, L, c) =>
    f
      .rect(9, L.h - 1, 14, 1, c)
      .rect(12, L.h - 3, 8, 2, c)
      .px(
        [
          [13, L.h - 3],
          [18, L.h - 2],
        ],
        C.rose,
      ),
  headband: (f, L, c) =>
    f.rect(12, L.h + 1, 8, 1, c).px(
      [
        [11, L.h + 2],
        [11, L.h + 3],
      ],
      c,
    ),
  toque: (f, L) =>
    f
      .rect(12, L.h - 6, 8, 6, C.white)
      .rect(11, L.h - 8, 10, 3, C.white)
      .rect(12, L.h - 1, 8, 1, C.cream),
  bandana: (f, L, c) =>
    f.rect(12, L.h - 1, 8, 2, c).px(
      [
        [20, L.h + 1],
        [21, L.h + 2],
      ],
      c,
    ),
  visor: (f, L, c) => f.rect(11, L.h + 1, 10, 1, c),
  hardhat: (f, L) => f.rect(11, L.h - 2, 10, 3, C.yellow).rect(15, L.h - 1, 2, 1, C.white),
  feathered: (f, L, c) =>
    f
      .rect(10, L.h - 1, 12, 1, c)
      .rect(12, L.h - 4, 8, 3, c)
      .rect(19, L.h - 7, 1, 4, C.white)
      .rect(20, L.h - 8, 1, 3, C.white),
  goggles: (f, L) =>
    f
      .rect(11, L.h + 1, 10, 1, C.black)
      .rect(13, L.h + 1, 2, 1, C.orange)
      .rect(17, L.h + 1, 2, 1, C.orange),
  mask: (f, L, c) => f.rect(12, L.h + 3, 8, 2, c),
  leaf: (f, L) => f.rect(15, L.h - 4, 1, 3, C.green).rect(16, L.h - 5, 3, 2, C.leaf),
  vines: (f, L) =>
    f.rect(11, L.h - 1, 10, 3, C.green).px(
      [
        [12, L.h - 2],
        [17, L.h - 2],
        [20, L.h + 1],
      ],
      C.pink,
    ),
  branches: (f, L) =>
    f.px(
      [
        [11, L.h - 1],
        [10, L.h - 2],
        [10, L.h - 3],
        [9, L.h - 4],
        [11, L.h - 4],
        [20, L.h - 1],
        [21, L.h - 2],
        [21, L.h - 3],
        [22, L.h - 4],
        [20, L.h - 4],
      ],
      C.brown,
    ),
  veil: (f, L, c) => f.rect(11, L.h - 1, 10, 12, c),
  blindfold: (f, L) => f.rect(12, L.h + 4, 8, 1, C.silver).rect(20, L.h + 4, 2, 3, C.silver),
  welding: (f, L) => f.rect(12, L.h - 3, 8, 3, C.steel2).rect(13, L.h - 2, 6, 1, C.black),
};

// Things held in the right hand (x from `r`, the pixel just past the hand).
const HELD = {
  sword: (f, r, y) => f.rect(r, y - 10, 1, 10, C.silver).rect(r - 1, y - 1, 3, 1, C.brass),
  rapier: (f, r, y) =>
    f.rect(r, y - 12, 1, 12, C.silver).px(
      [
        [r - 1, y - 1],
        [r + 1, y - 1],
      ],
      C.gold,
    ),
  staff: (f, r, y, c = C.sky) => f.rect(r, 10, 1, 35, C.wood).rect(r - 1, 7, 3, 3, c),
  axe: (f, r, y) => f.rect(r, y - 9, 1, 11, C.wood).rect(r + 1, y - 9, 3, 3, C.steel),
  hammer: (f, r, y) => f.rect(r, y - 7, 1, 9, C.wood).rect(r - 1, y - 9, 4, 2, C.steel2),
  wrench: (f, r, y) => f.rect(r, y - 7, 1, 9, C.steel).rect(r - 1, y - 9, 3, 2, C.steel),
  book: (f, r, y, c = C.red) => f.rect(r - 1, y - 3, 4, 4, c).rect(r, y - 2, 2, 2, C.cream),
  scroll: (f, r, y) => f.rect(r - 1, y - 2, 2, 5, C.cream),
  lantern: (f, r, y) =>
    f
      .px([[r, y + 2]], C.black)
      .rect(r - 1, y + 3, 3, 4, '#FFD86A')
      .rect(r - 1, y + 7, 3, 1, C.black),
  umbrella: (f, r, y, c = C.sky) =>
    f
      .rect(r, y - 10, 1, 11, C.black)
      .rect(r - 4, y - 13, 9, 2, c)
      .rect(r - 3, y - 14, 7, 1, c),
  crook: (f, r, y) =>
    f.rect(r, y - 12, 1, 14, C.wood).px(
      [
        [r + 1, y - 13],
        [r + 2, y - 12],
        [r + 2, y - 11],
      ],
      C.wood,
    ),
  telescope: (f, r, y) => f.rect(r - 1, y - 4, 5, 2, C.brass).rect(r + 3, y - 5, 1, 4, C.brass),
  abacus: (f, r, y) =>
    f.rect(r - 1, y - 3, 5, 4, C.wood).px(
      [
        [r, y - 2],
        [r + 2, y - 2],
        [r + 1, y],
        [r + 3, y],
      ],
      C.red,
    ),
  keys: (f, r, y) =>
    f
      .rect(r - 1, y + 2, 4, 4, C.gold)
      .rect(r, y + 3, 2, 2, C.black)
      .px([[r + 3, y + 6]], C.gold),
  ladle: (f, r, y) => f.rect(r, y - 7, 1, 8, C.wood).rect(r - 1, y - 9, 3, 2, C.wood),
  spoon: (f, r, y) => f.rect(r, y - 6, 1, 7, C.wood).rect(r - 1, y - 8, 2, 2, C.wood),
  saw: (f, r, y) => f.rect(r - 1, y - 1, 2, 3, C.wood).rect(r + 1, y - 1, 5, 2, C.silver),
  net: (f, r, y) =>
    f
      .rect(r, y - 11, 1, 12, C.wood)
      .rect(r - 2, y - 15, 5, 4, C.cream)
      .px(
        [
          [r - 1, y - 14],
          [r + 1, y - 13],
        ],
        C.grey,
      ),
  rod: (f, r, y) =>
    f.rect(r, y - 13, 1, 14, C.wood).px(
      [
        [r + 1, y - 13],
        [r + 2, y - 11],
        [r + 3, y - 9],
        [r + 3, y - 7],
      ],
      C.silver,
    ),
  candle: (f, r, y) => f.rect(r, y - 3, 1, 3, C.cream).px([[r, y - 4]], C.yellow),
  bell: (f, r, y) => f.rect(r - 1, y + 1, 3, 3, C.gold).px([[r, y + 4]], C.brown),
  paddle: (f, r, y) => f.rect(r, y - 12, 1, 14, C.wood).rect(r - 1, y + 2, 3, 5, C.wood),
  shears: (f, r, y) =>
    f
      .rect(r, y - 6, 1, 7, C.silver)
      .rect(r + 1, y - 6, 1, 7, C.steel)
      .px(
        [
          [r, y + 1],
          [r + 1, y + 1],
        ],
        C.red,
      ),
  brush: (f, r, y) => f.rect(r, y - 6, 1, 7, C.wood).rect(r, y - 8, 1, 2, C.black),
  flower: (f, r, y) => f.px([[r, y - 1]], C.rose).px([[r, y]], C.green),
  cane: (f, r, y) => f.rect(r, y, 1, 45 - y, C.wood).rect(r - 1, y - 1, 2, 1, C.wood),
  maps: (f, r, y) => f.rect(r - 1, y - 2, 5, 2, C.cream).rect(r - 1, y + 1, 5, 2, C.tan),
  pencil: (f, r, y) => f.rect(r, y - 4, 1, 4, C.yellow).px([[r, y - 5]], C.black),
  sack: (f, r, y) =>
    f.rect(r - 1, y + 1, 4, 4, C.tan).px(
      [
        [r, y],
        [r + 1, y],
      ],
      C.brown,
    ),
  wand: (f, r, y) => f.rect(r, y - 5, 1, 6, C.black).px([[r, y - 6]], C.white),
};

function person(f, s) {
  const L = LAYOUT[s.size ?? 'normal'];
  const skin = C[s.skin] ?? s.skin;
  const hairC = C[s.hair?.[1]] ?? s.hair?.[1];
  const top = s.top ?? C.blue,
    shade = s.shade ?? s.top ?? C.blue;
  const cx = L.tx,
    cw = L.tw;

  if (s.cape) f.trap(L.ty, 40, cw / 2, cw / 2 + 3, s.cape);
  if (s.outfit === 'robe') {
    f.trap(L.ty, 43, L.hw[0], L.hw[1], top)
      .rect(12, 44, 3, 1, s.boots ?? C.black)
      .rect(17, 44, 3, 1, s.boots ?? C.black);
  } else {
    f.rect(cx, L.ty, cw, L.th, top)
      .rect(cx + 1, L.ly, 3, L.lh, s.legs ?? C.navy)
      .rect(cx + cw - 4, L.ly, 3, L.lh, s.legs ?? C.navy)
      .rect(cx, L.by, 4, 3, s.boots ?? C.leather)
      .rect(cx + cw - 4, L.by, 4, 3, s.boots ?? C.leather);
  }
  const hand = s.gloves ?? skin;
  f.rect(L.aL, L.ay, 2, L.ah, shade).rect(L.aR, L.ay, 2, L.ah, shade);
  f.rect(L.aL, L.hy, 2, 2, hand).rect(L.aR, L.hy, 2, 2, hand);
  if (s.apron) f.rect(cx + 2, L.ty + 2, cw - 4, Math.min(L.th + 6, 44 - L.ty - 2), s.apron);
  if (s.belt) f.rect(cx, L.ty + Math.floor(L.th * 0.65), cw, 1, s.belt);
  if (s.scarf) f.rect(cx + 1, L.ty, cw - 2, 2, s.scarf).rect(cx + cw - 3, L.ty + 2, 2, 4, s.scarf);
  if (s.stripes) for (let y = L.ty + 1; y < L.ty + L.th; y += 2) f.rect(cx, y, cw, 1, s.stripes);
  if (s.checks)
    for (let y = L.ty; y < L.ty + L.th; y++)
      for (let x = cx; x < cx + cw; x++) if ((x + y) % 2) f.px([[x, y]], s.checks);
  if (s.sash) for (let i = 0; i < cw; i++) f.px([[cx + i, L.ty + Math.round((i * (L.th - 1)) / (cw - 1))]], s.sash);
  if (s.patches) s.patches.forEach(([x, y, c]) => f.rect(cx + x, L.ty + y, 2, 2, c));
  if (s.dots) s.dots.forEach(([x, y, c]) => f.px([[x, y]], c));

  f.rect(12, L.h, 8, 8, skin);
  const eyeY = L.h + 4;
  if (s.face === 'white')
    f.rect(12, L.h, 8, 8, C.white).px(
      [
        [15, L.h + 6],
        [16, L.h + 6],
      ],
      C.red,
    );
  if (s.face === 'beak')
    f.rect(12, L.h + 1, 8, 7, C.cream)
      .rect(19, L.h + 4, 3, 2, C.cream)
      .rect(21, L.h + 5, 2, 2, C.tan);
  if (s.eyes === 'glasses')
    f.rect(12, eyeY - 1, 3, 3, '#CFE0F0')
      .rect(17, eyeY - 1, 3, 3, '#CFE0F0')
      .px(
        [
          [13, eyeY],
          [18, eyeY],
          [15, eyeY],
          [16, eyeY],
        ],
        EYE,
      );
  else if (s.eyes !== 'none') f.rect(13, eyeY, 2, 1, EYE).rect(17, eyeY, 2, 1, EYE);
  if (s.freckles)
    f.px(
      [
        [13, eyeY + 1],
        [18, eyeY + 1],
        [14, eyeY + 2],
      ],
      SKIN2,
    );
  if (s.soot)
    f.px(
      [
        [13, eyeY + 2],
        [18, eyeY + 1],
      ],
      C.grey,
    );
  if (s.tooth) f.px([[16, L.h + 6]], C.gold);
  if (s.beard) {
    const bc = C[s.beard[0]] ?? s.beard[0];
    f.rect(12, L.h + 5, 8, 3, bc).rect(14, L.h + 6, 4, 1, skin);
    if (s.beard[1]) f.rect(13, L.h + 8, 6, s.beard[1], bc);
  }
  if (s.mustache) f.rect(14, L.h + 5, 4, 1, C[s.mustache] ?? s.mustache);
  // an obvious villain: a handlebar mustache curling up past the cheeks and a pointed goatee
  if (s.villain) {
    const vc = C[s.villain] ?? s.villain;
    f.rect(13, L.h + 5, 6, 1, vc).px(
      [
        [12, L.h + 5],
        [19, L.h + 5],
        [11, L.h + 4],
        [20, L.h + 4],
        [15, L.h + 7],
        [16, L.h + 7],
        [15, L.h + 8],
      ],
      vc,
    );
  }
  if (s.hair) HAIR[s.hair[0]](f, L, hairC);
  if (s.hat) {
    const [kind, c] = s.hat;
    const fill = C[c] ?? c;
    HATS[kind](f, L, fill);
    if (kind === 'hood' || kind === 'veil')
      f.rect(12 + 1, L.h + 1, 6, 6, skin)
        .rect(14, eyeY, 1, 1, EYE)
        .rect(17, eyeY, 1, 1, EYE);
    if (kind === 'visor') f.rect(12, L.h - 1, 8, 2, hairC ?? C.hairBrown);
  }
  (s.held ?? []).forEach(([item, color]) => HELD[item](f, L.aR + 2, L.hy, C[color] ?? color));
  (s.left ?? []).forEach(([item, color]) => {
    if (item === 'shield')
      f.rect(L.aL - 4, L.ty + 2, 4, 7, C[color] ?? color).px(
        [
          [L.aL - 3, L.ty + 4],
          [L.aL - 2, L.ty + 5],
        ],
        C.gold,
      );
    if (item === 'basket')
      f.rect(L.aL - 4, L.hy, 4, 3, C.tan)
        .rect(L.aL - 4, L.hy - 1, 1, 1, C.brown)
        .px([[L.aL - 3, L.hy - 1]], C.red);
    if (item === 'cane') f.rect(L.aL - 1, L.hy, 1, 45 - L.hy, C.wood);
    if (item === 'journal') f.rect(L.aL - 3, L.hy - 1, 3, 4, C[color] ?? color);
    if (item === 'maps') f.rect(L.aL - 3, L.hy - 3, 2, 6, C.cream);
    if (item === 'mailbag')
      f.rect(L.aL - 3, L.hy - 2, 4, 5, C.leather).px(
        [
          [L.aL, L.ty],
          [L.aL + 1, L.ty + 1],
        ],
        C.leather,
      );
  });
  if (s.pet === 'sheep')
    f.rect(24, 40, 6, 4, C.white)
      .rect(28, 38, 3, 3, C.black)
      .px(
        [
          [24, 44],
          [28, 44],
        ],
        C.black,
      );
  if (s.pet === 'bird') f.rect(21, L.ty - 3, 2, 2, C.sky).px([[23, L.ty - 2]], C.orange);
  if (s.pet === 'fox') f.rect(23, 42, 5, 3, C.orange).rect(27, 41, 3, 3, C.orange);
  if (s.bells) s.bells.forEach(([x, y]) => f.px([[x, y]], C.gold));
  if (s.badges) for (let x = cx + 1; x < cx + cw - 1; x += 2) f.px([[x, L.ty + 1]], [C.gold, C.silver, C.red][x % 3]);
  if (s.confetti)
    f.px(
      [
        [7, 20],
        [24, 18],
        [6, 30],
        [25, 27],
        [8, 12],
        [23, 10],
      ],
      C.pink,
    ).px(
      [
        [5, 24],
        [26, 22],
        [9, 16],
      ],
      C.yellow,
    );
  if (s.moss) f.px(s.moss, C.leaf);
}

// Characters who aren't built like people.
const SPECIAL = {
  owl(f) {
    const b = C.brown,
      belly = C.tan;
    f.rect(10, 22, 12, 18, b).rect(12, 30, 8, 9, belly).rect(12, 32, 8, 5, C.crimson);
    f.px(
      [
        [10, 21],
        [11, 20],
        [21, 21],
        [20, 20],
      ],
      b,
    );
    f.rect(11, 24, 4, 4, C.white).rect(17, 24, 4, 4, C.white).rect(12, 25, 2, 2, EYE).rect(18, 25, 2, 2, EYE);
    f.rect(15, 27, 2, 2, C.orange).rect(12, 40, 3, 2, C.orange).rect(17, 40, 3, 2, C.orange);
    f.rect(11, 24, 4, 1, C.brass).rect(17, 24, 4, 1, C.brass);
  },
  dog(f) {
    const c = '#B8864A';
    f.rect(6, 34, 16, 6, c).rect(7, 40, 2, 5, c).rect(11, 40, 2, 5, c).rect(16, 40, 2, 5, c).rect(19, 40, 2, 5, c);
    f.rect(19, 27, 8, 8, c)
      .rect(26, 31, 2, 3, C.black)
      .rect(18, 28, 2, 6, C.brown)
      .px([[23, 30]], EYE);
    f.rect(19, 34, 5, 2, C.red).px(
      [
        [4, 32],
        [5, 33],
      ],
      c,
    );
  },
  raccoon(f) {
    const g = C.grey;
    f.rect(12, 26, 8, 12, g)
      .rect(12, 18, 8, 8, g)
      .px(
        [
          [12, 17],
          [19, 17],
        ],
        g,
      );
    f.rect(12, 21, 8, 2, C.black)
      .px(
        [
          [13, 21],
          [18, 21],
        ],
        C.white,
      )
      .rect(15, 24, 2, 1, C.black);
    f.rect(13, 30, 6, 7, C.silver).rect(12, 38, 3, 6, g).rect(17, 38, 3, 6, g);
    for (let i = 0; i < 6; i++) f.rect(20 + (i > 2 ? 1 : 0), 34 + i, 3, 1, i % 2 ? C.black : g);
    f.rect(6, 30, 4, 5, C.tan)
      .px(
        [
          [7, 29],
          [8, 29],
        ],
        C.brown,
      )
      .rect(10, 29, 2, 3, g);
  },
  bear(f) {
    const c = '#7A4A2A';
    f.rect(8, 22, 16, 18, c)
      .rect(10, 12, 12, 11, c)
      .px(
        [
          [10, 11],
          [11, 11],
          [20, 11],
          [21, 11],
        ],
        c,
      );
    f.rect(13, 17, 6, 4, C.tan)
      .rect(15, 17, 2, 1, C.black)
      .px(
        [
          [12, 15],
          [19, 15],
        ],
        EYE,
      );
    f.rect(11, 26, 10, 11, '#A87A4A').rect(9, 40, 5, 4, c).rect(18, 40, 5, 4, c);
    f.rect(5, 25, 3, 8, c).rect(24, 25, 3, 8, c);
  },
  stag(f) {
    const w = C.white;
    f.rect(6, 32, 16, 7, w).rect(7, 39, 2, 6, w).rect(10, 39, 2, 6, w).rect(16, 39, 2, 6, w).rect(19, 39, 2, 6, w);
    f.rect(19, 24, 3, 9, w)
      .rect(19, 21, 7, 5, w)
      .px([[24, 23]], EYE)
      .rect(25, 24, 2, 2, C.silver);
    f.px(
      [
        [20, 20],
        [20, 19],
        [19, 18],
        [19, 17],
        [18, 16],
        [21, 18],
        [22, 17],
        [23, 20],
        [23, 19],
        [24, 18],
        [25, 17],
        [24, 16],
        [26, 19],
        [27, 18],
      ],
      C.cream,
    );
    f.px(
      [
        [5, 33],
        [4, 34],
      ],
      w,
    );
  },
  flame(f) {
    f.trap(16, 36, 1, 7, C.orange)
      .trap(22, 36, 1, 5, C.yellow)
      .rect(12, 36, 8, 3, C.orange)
      .rect(13, 39, 6, 1, C.orange);
    f.rect(13, 29, 2, 2, EYE).rect(17, 29, 2, 2, EYE).rect(15, 33, 2, 1, C.crimson);
  },
  twins(f) {
    const draw = (dx, hair, top) => {
      f.rect(7 + dx, 21, 8, 8, C.skin2)
        .rect(8 + dx, 25, 2, 1, EYE)
        .rect(12 + dx, 25, 2, 1, EYE)
        .rect(7 + dx, 20, 8, 2, hair);
      f.rect(7 + dx, 29, 8, 7, top)
        .rect(8 + dx, 36, 2, 6, C.navy)
        .rect(12 + dx, 36, 2, 6, C.navy)
        .rect(7 + dx, 42, 3, 3, C.leather)
        .rect(12 + dx, 42, 3, 3, C.leather);
    };
    draw(0, C.hairBrown, C.rose);
    draw(10, C.hairBrown, C.teal);
    f.rect(8, 17, 6, 3, C.red).rect(18, 17, 6, 3, C.sky);
  },
  // Midas (gold, spends) and Minnow (grey, saves).
  penrose(f) {
    const draw = (dx, hair, top) => {
      f.rect(7 + dx, 21, 8, 8, C.skin1)
        .rect(8 + dx, 25, 2, 1, EYE)
        .rect(12 + dx, 25, 2, 1, EYE)
        .rect(7 + dx, 20, 8, 2, hair);
      f.rect(7 + dx, 29, 8, 7, top)
        .rect(8 + dx, 36, 2, 6, C.black)
        .rect(12 + dx, 36, 2, 6, C.black);
      f.rect(7 + dx, 42, 3, 3, C.black).rect(12 + dx, 42, 3, 3, C.black);
    };
    draw(0, C.hairBlond, C.gold);
    draw(10, C.hairBlond, C.grey);
    f.px(
      [
        [6, 31],
        [5, 33],
        [7, 35],
      ],
      C.gold,
    )
      .rect(24, 32, 3, 3, C.brown)
      .px([[25, 31]], C.gold);
  },
};

// ---------------------------------------------------------------------------
// Specs. Colours are palette names from C or hex strings.

const SPECS = {
  // Physical
  tobin: {
    size: 'kid',
    skin: 'skin3',
    hair: ['spiky', 'hairBlack'],
    hat: ['headband', 'red'],
    top: C.cream,
    shade: C.skin3,
    legs: C.tan,
    boots: C.skin3,
  },
  dessa: {
    skin: 'skin4',
    hair: ['bob', 'hairAuburn'],
    top: C.orange,
    shade: C.skin4,
    legs: C.tan,
    boots: C.leather,
    belt: C.leather,
    left: [['mailbag']],
  },
  marta: {
    skin: 'skin2',
    hair: ['braids', 'hairBlond'],
    top: C.red,
    checks: C.crimson,
    shade: C.red,
    legs: C.navy,
    held: [['axe']],
  },
  bo: {
    skin: 'skin1',
    hair: ['topknot', 'hairBlack'],
    top: C.yellow,
    stripes: C.red,
    shade: C.yellow,
    legs: C.red,
    boots: C.red,
  },
  plush: {
    size: 'big',
    skin: 'skin1',
    hair: ['short', 'hairWhite'],
    hat: ['crown'],
    top: C.sky,
    stripes: C.white,
    shade: C.sky,
    legs: C.sky,
    boots: C.white,
    badges: true,
    mustache: 'hairWhite',
  },
  harrow: {
    size: 'big',
    skin: 'skin2',
    hair: ['bald'],
    beard: ['hairGrey', 0],
    top: C.brown,
    apron: C.leather,
    shade: C.skin2,
    legs: C.black,
    held: [['hammer']],
  },
  ingrid: {
    skin: 'skin1',
    hair: ['braids', 'hairBlond'],
    hat: ['plume'],
    top: C.steel,
    shade: C.steel2,
    legs: C.steel2,
    belt: C.brown,
    left: [['shield', 'crimson']],
  },
  kofi: {
    size: 'big',
    skin: 'skin6',
    hair: ['bald', C.skin5],
    top: C.crimson,
    shade: C.skin6,
    legs: C.black,
    dots: [
      [8, 26],
      [9, 26],
      [22, 26],
      [23, 26],
    ].map(([x, y]) => [x, y, C.gold]),
  },
  yuki: {
    skin: 'skin1',
    hair: ['bob', 'hairBlack'],
    top: C.blue,
    shade: C.skin1,
    legs: C.blue,
    boots: C.skin1,
    scarf: C.white,
  },
  // Kaldor the Kingbreaker: a crown over a grey hood, a red beard, a crimson cloak and a sword
  kaldor: {
    size: 'tall',
    skin: '#D8A880',
    hat: ['hood', '#8A8A9A'],
    beard: ['#C4442A', 2],
    top: '#3A2A2A',
    shade: '#6A1216',
    cape: '#6A1216',
    legs: '#2A1A1A',
    boots: '#1A1010',
    belt: C.gold,
    held: [['sword']],
  },
  nana: {
    size: 'kid',
    skin: 'skin2',
    hair: ['bun', 'hairWhite'],
    top: C.rose,
    dots: [
      [12, 31, C.yellow],
      [17, 33, C.yellow],
      [14, 30, C.white],
    ],
    shade: C.rose,
    outfit: 'robe',
    left: [['cane']],
    held: [['flower']],
  },
  aurelio: {
    size: 'tall',
    skin: 'skin3',
    hair: ['short', 'hairWhite'],
    beard: ['hairWhite', 3],
    top: C.gold,
    shade: C.brass,
    legs: C.brass,
    boots: C.brown,
    cape: C.crimson,
    left: [['shield', 'gold']],
  },
  // Financial
  wendel: {
    skin: 'skin2',
    hair: ['short', 'hairGrey'],
    hat: ['visor', 'green'],
    eyes: 'glasses',
    top: C.cream,
    shade: C.cream,
    legs: C.brown,
    held: [['keys']],
  },
  penny: {
    size: 'kid',
    skin: 'skin3',
    hair: ['pigtails', 'hairAuburn'],
    freckles: true,
    top: C.green,
    shade: C.green,
    legs: C.tan,
  },
  saoirse: {
    skin: 'skin1',
    hair: ['long', 'hairGinger'],
    outfit: 'robe',
    top: C.lavender,
    patches: [
      [1, 4, C.teal],
      [6, 9, C.yellow],
      [2, 14, C.rose],
      [7, 3, C.sky],
    ],
    shade: C.lavender,
    dots: [
      [13, 24, C.silver],
      [15, 24, C.silver],
      [17, 24, C.silver],
    ],
  },
  hamish: {
    size: 'big',
    skin: 'skin1',
    hair: ['curly', 'hairGinger'],
    top: C.cream,
    apron: C.blue,
    shade: C.cream,
    legs: C.blue,
    boots: C.brown,
    dots: [
      [23, 42, C.rose],
      [24, 41, C.rose],
      [25, 42, C.rose],
      [26, 42, C.rose],
      [23, 44, C.rose],
      [26, 44, C.rose],
      [26, 41, C.black],
    ],
  },
  tithe: {
    skin: 'skin1',
    hair: ['bun', 'hairBlack'],
    outfit: 'robe',
    top: C.crimson,
    shade: C.crimson,
    bells: [
      [14, 24],
      [16, 25],
      [18, 24],
      [15, 26],
      [17, 26],
    ],
    held: [['bell']],
  },
  priya: {
    skin: 'skin4',
    hat: ['veil', 'orange'],
    outfit: 'robe',
    top: C.orange,
    sash: C.gold,
    shade: C.orange,
    held: [['abacus']],
  },
  // The Quartermaster, the stores' ghost: grey-white, spectacles, and a ledger to sign
  quartermaster: {
    skin: '#D8E0E8',
    hair: ['bald', '#C8D0D8'],
    eyes: 'glasses',
    outfit: 'robe',
    top: '#B8C0C8',
    shade: '#8A94A0',
    boots: '#8A94A0',
    held: [['book', C.tan]],
  },
  gus: {
    size: 'big',
    skin: 'skin3',
    hair: ['short', 'hairBrown'],
    mustache: 'hairBrown',
    top: C.cream,
    apron: C.tan,
    shade: C.cream,
    legs: C.brown,
    held: [['candle']],
  },
  mirela: {
    skin: 'skin3',
    hair: ['long', 'hairBrown'],
    hat: ['hardhat'],
    tooth: true,
    top: C.orange,
    shade: C.orange,
    legs: C.navy,
    belt: C.leather,
    held: [['sack']],
  },
  ambrose: {
    size: 'tall',
    skin: 'skin5',
    hair: ['short', 'hairBlack'],
    top: C.navy,
    shade: C.navy,
    legs: C.navy,
    boots: C.black,
    belt: C.gold,
    held: [['keys']],
  },
  marchbank: {
    skin: 'skin1',
    hair: ['bun', 'hairWhite'],
    outfit: 'robe',
    top: C.lavender,
    shade: C.lavender,
    eyes: 'glasses',
    scarf: C.violet,
    held: [['sack']],
  },
  fennick: {
    skin: 'skin3',
    hair: ['long', 'hairGrey'],
    beard: ['hairGrey', 3],
    top: C.tan,
    patches: [
      [1, 2, C.brown],
      [6, 6, C.grey],
      [2, 7, C.moss],
    ],
    shade: C.tan,
    legs: C.brown,
    boots: C.brown,
    left: [['cane']],
    held: [['sack']],
  },
  opaline: {
    skin: 'skin5',
    hair: ['curly', 'hairBlack'],
    hat: ['feathered', 'teal'],
    outfit: 'robe',
    top: C.teal,
    sash: C.gold,
    shade: C.teal,
    dots: [
      [13, 33, C.white],
      [18, 37, C.white],
    ],
  },
  silas: {
    size: 'tall',
    skin: 'skin1',
    hair: ['short', 'hairBlack'],
    hat: ['tophat', 'black'],
    mustache: 'hairBlack',
    top: C.black,
    stripes: C.steel2,
    shade: C.black,
    legs: C.black,
    boots: C.black,
    belt: C.gold,
    held: [['scroll']],
  },
  barnabus: {
    size: 'big',
    skin: 'skin2',
    hair: ['bald'],
    beard: ['hairGrey', 2],
    top: C.violet,
    shade: C.violet,
    legs: C.violet,
    boots: C.black,
    belt: C.gold,
    held: [['sack']],
    dots: [
      [6, 44, C.gold],
      [8, 43, C.gold],
      [24, 44, C.gold],
      [26, 43, C.gold],
      [25, 42, C.gold],
      [7, 45, C.gold],
    ],
  },
  // Nib, the kid on the Courier Road who wants a duel: as in the World, a brown tunic and spiky dark hair
  nib: {
    size: 'kid',
    skin: 'skin2',
    hair: ['spiky', '#2A1A12'],
    top: '#8A7A5A',
    shade: '#6A5A40',
    legs: '#4A3A2A',
    boots: '#3A2A1A',
    held: [['sword']],
  },
  ottilie: {
    skin: 'skin3',
    hair: ['bun', 'hairBrown'],
    eyes: 'glasses',
    top: C.green,
    outfit: 'robe',
    shade: C.green,
    held: [['book', 'navy']],
  },
  astra: {
    skin: 'skin5',
    hair: ['long', 'hairBlack'],
    outfit: 'robe',
    top: C.navy,
    dots: [
      [13, 30, C.gold],
      [18, 34, C.gold],
      [15, 38, C.white],
      [11, 40, C.gold],
      [20, 28, C.white],
    ],
    shade: C.navy,
    held: [['telescope']],
  },
  thane: {
    size: 'tall',
    skin: 'skin1',
    hair: ['short', 'hairGrey'],
    outfit: 'robe',
    top: C.cream,
    stripes: C.tan,
    shade: C.cream,
    dots: [
      [12, 10, C.white],
      [14, 9, C.white],
      [16, 9, C.white],
      [18, 9, C.white],
      [20, 10, C.white],
      [13, 11, C.black],
      [19, 11, C.black],
    ],
    held: [['scroll']],
  },
  felix: {
    skin: 'skin2',
    hair: ['slick', 'hairBlack'],
    top: C.white,
    checks: C.black,
    shade: C.black,
    legs: C.black,
    villain: 'hairBlack',
  },
  hana: {
    skin: 'skin1',
    hair: ['long', 'hairBlack'],
    outfit: 'robe',
    top: C.rose,
    sash: C.navy,
    shade: C.rose,
    held: [['scroll']],
  },
  bramble: {
    skin: 'skin2',
    hair: ['curly', 'hairGrey'],
    eyes: 'glasses',
    top: C.moss,
    shade: C.moss,
    legs: C.brown,
    dots: [
      [12, 30, C.leaf],
      [19, 29, C.yellow],
    ],
    held: [['pencil']],
  },
  quimby: {
    skin: 'skin2',
    face: 'beak',
    eyes: 'glasses',
    hat: ['tophat', 'black'],
    top: C.black,
    outfit: 'robe',
    shade: C.black,
    gloves: C.black,
  },
  lyra: {
    skin: 'skin3',
    hair: ['braids', 'hairAuburn'],
    top: C.teal,
    shade: C.teal,
    legs: C.brown,
    belt: C.leather,
    left: [['maps']],
    held: [['maps']],
  },
  solomon: {
    skin: 'skin4',
    hair: ['short', 'hairWhite'],
    beard: ['hairWhite', 5],
    eyes: 'none',
    outfit: 'robe',
    top: C.brown,
    shade: C.brown,
    left: [['cane']],
  },
  elowen: {
    size: 'tall',
    skin: 'skin1',
    hair: ['silver', 'hairWhite'],
    outfit: 'robe',
    top: C.purple,
    shade: C.violet,
    dots: [
      [14, 28, C.gold],
      [18, 34, C.gold],
      [13, 38, C.white],
    ],
    held: [['staff', 'sky']],
  },
  // Spiritual
  moth: {
    size: 'kid',
    skin: 'skin2',
    hat: ['hood', 'grey'],
    outfit: 'robe',
    top: C.grey,
    shade: C.grey,
    held: [['candle']],
  },
  hollis: {
    size: 'kid',
    skin: 'skin4',
    hair: ['short', 'hairBlack'],
    top: C.tan,
    shade: C.tan,
    legs: C.brown,
    held: [['bell']],
  },
  tuck: {
    size: 'big',
    skin: 'skin1',
    hair: ['bald'],
    top: C.brown,
    outfit: 'robe',
    shade: C.brown,
    belt: C.cream,
    held: [['ladle']],
  },
  zahra: {
    skin: 'skin4',
    hat: ['veil', 'navy'],
    outfit: 'robe',
    top: C.blue,
    shade: C.navy,
    held: [['staff', 'gold']],
  },
  honeywell: {
    skin: 'skin1',
    hair: ['short', 'hairBrown'],
    hat: ['tophat', 'crimson'],
    mustache: 'hairBrown',
    top: C.red,
    stripes: C.white,
    shade: C.red,
    legs: C.black,
    boots: C.black,
    held: [['wand']],
  },
  clementine: {
    skin: 'skin2',
    hair: ['curly', 'hairAuburn'],
    outfit: 'robe',
    top: C.teal,
    shade: C.teal,
    bells: [
      [12, 28],
      [15, 30],
      [18, 27],
      [13, 35],
      [17, 37],
      [20, 33],
      [11, 40],
      [19, 41],
    ],
    held: [['bell']],
  },
  ansel: {
    skin: 'skin2',
    hair: ['long', 'hairGrey'],
    beard: ['hairGrey', 6],
    outfit: 'robe',
    top: C.moss,
    shade: C.moss,
    pet: 'bird',
  },
  // The Chaplain's Echo, the crypt's ghost: pale blue all over, a white collar, a lantern
  chaplain: {
    skin: '#C8D0E8',
    hair: ['bald', '#B8C0D8'],
    outfit: 'robe',
    top: '#8A94B8',
    shade: '#6A7498',
    boots: '#6A7498',
    scarf: '#E8ECF8',
    held: [['lantern']],
  },
  ilse: {
    size: 'tall',
    skin: 'skin1',
    hat: ['hood', 'white'],
    outfit: 'robe',
    top: C.white,
    sash: C.grey,
    shade: C.cream,
    held: [['staff', 'white']],
  },
  oona: {
    skin: 'skin5',
    hair: ['long', 'hairWhite'],
    hat: ['blindfold'],
    outfit: 'robe',
    top: C.violet,
    shade: C.violet,
    dots: [
      [14, 30, C.silver],
      [17, 34, C.silver],
    ],
  },
  // Emotional
  dot: {
    size: 'kid',
    skin: 'skin3',
    hair: ['pigtails', 'hairBlack'],
    top: C.yellow,
    shade: C.yellow,
    legs: C.blue,
    left: [['journal', 'pink']],
  },
  juniper: {
    skin: 'skin2',
    hair: ['bun', 'hairBrown'],
    top: C.teal,
    apron: C.tan,
    shade: C.teal,
    legs: C.brown,
    soot: true,
    dots: [
      [24, 32, C.tan],
      [25, 32, C.tan],
      [24, 33, C.tan],
      [25, 34, C.tan],
      [26, 33, C.tan],
    ],
  },
  rowan: {
    skin: 'skin4',
    hair: ['short', 'hairAuburn'],
    soot: true,
    top: C.red,
    shade: C.red,
    legs: C.black,
    belt: C.yellow,
    dots: [
      [23, 32, C.steel],
      [24, 32, C.steel],
      [23, 33, C.steel],
      [24, 33, C.steel],
      [24, 34, C.sky],
    ],
  },
  mireille: {
    skin: 'skin1',
    face: 'white',
    hair: ['bob', 'hairBlack'],
    top: C.white,
    stripes: C.black,
    shade: C.white,
    legs: C.black,
    gloves: C.white,
  },
  corwin: {
    skin: 'skin2',
    hair: ['short', 'hairGrey'],
    top: C.steel2,
    shade: C.steel2,
    legs: C.black,
    cape: C.red,
    dots: [
      [13, 19, C.rose],
      [13, 20, C.rose],
      [14, 21, C.rose],
    ],
    held: [['sword']],
  },
  // Silas Seen: a navy hood and robe, a pale face. Left the king on read.
  silasseen: {
    skin: '#E8D8C8',
    hat: ['hood', '#2E3C50'],
    outfit: 'robe',
    top: '#2E3C50',
    shade: '#243040',
    boots: '#1A2230',
  },
  nell: {
    skin: 'skin3',
    hair: ['long', 'hairBlond'],
    hat: ['sunhat', 'yellow'],
    top: C.green,
    shade: C.green,
    outfit: 'robe',
    dots: [
      [23, 30, C.rose],
      [24, 31, C.rose],
      [23, 32, C.green],
    ],
  },
  lark: {
    skin: 'skin4',
    hair: ['short', 'hairBrown'],
    top: C.tan,
    shade: C.tan,
    legs: C.brown,
    boots: C.leather,
    scarf: C.green,
  },
  iris: {
    skin: 'skin2',
    hair: ['bob', 'hairAuburn'],
    top: C.moss,
    shade: C.moss,
    legs: C.brown,
    scarf: C.lavender,
    boots: C.black,
  },
  willa: {
    skin: 'skin3',
    hair: ['short', 'hairBrown'],
    hat: ['sunhat', 'yellow'],
    top: C.yellow,
    shade: C.yellow,
    legs: C.navy,
    boots: C.black,
    held: [['rod']],
  },
  kaito: {
    skin: 'skin2',
    hair: ['topknot', 'hairWhite'],
    beard: ['hairWhite', 7],
    outfit: 'robe',
    top: C.teal,
    shade: C.teal,
    sash: C.black,
    held: [['brush']],
  },
  // Social
  fitz: {
    skin: 'skin2',
    hair: ['short', 'hairGinger'],
    hat: ['feathered', 'crimson'],
    top: C.crimson,
    shade: C.crimson,
    legs: C.cream,
    belt: C.gold,
    held: [['bell']],
  },
  marigold: {
    skin: 'skin3',
    hair: ['curly', 'hairGinger'],
    top: C.yellow,
    patches: [
      [0, 0, C.pink],
      [6, 5, C.teal],
    ],
    shade: C.orange,
    legs: C.pink,
    dots: [
      [9, 16, C.red],
      [11, 14, C.sky],
      [21, 14, C.leaf],
    ],
  },
  amara: {
    skin: 'skin5',
    hair: ['curly', 'hairBlack'],
    outfit: 'robe',
    top: C.pink,
    shade: C.pink,
    confetti: true,
  },
  marisol: {
    skin: 'skin1',
    hair: ['long', 'hairBlack'],
    hat: ['mask', 'gold'],
    outfit: 'robe',
    top: C.crimson,
    cape: C.crimson,
    shade: C.crimson,
    dots: [
      [13, 20, C.white],
      [18, 20, C.white],
    ],
  },
  barnaby: {
    size: 'big',
    skin: 'skin1',
    hair: ['short', 'hairBrown'],
    hat: ['toque'],
    top: C.white,
    apron: C.cream,
    shade: C.white,
    legs: C.tan,
    held: [['spoon']],
  },
  // Old Mott, from the Deep Cells: bald, a white tuft and beard, an old brown tunic (as in the World)
  oldmott: {
    skin: '#E0B498',
    hair: ['bald', '#ECE8DC'],
    beard: ['#ECE8DC', 2],
    top: '#7A6A48',
    shade: '#5C4E34',
    legs: '#3E3428',
    boots: '#2A2018',
    belt: '#3E3020',
  },
  bastian: {
    skin: 'skin5',
    hair: ['short', 'hairBlack'],
    top: C.blue,
    shade: C.blue,
    legs: C.white,
    belt: C.gold,
  },
  lola: {
    size: 'big',
    skin: 'skin2',
    hair: ['curly', 'hairBlack'],
    top: C.red,
    apron: C.white,
    shade: C.red,
    legs: C.black,
    held: [['ladle']],
  },
  oyelaran: {
    size: 'tall',
    skin: 'skin6',
    hair: ['short', 'hairBlack'],
    outfit: 'robe',
    top: C.navy,
    sash: C.silver,
    shade: C.navy,
    held: [['scroll']],
  },
  // Occupational
  sprocket: {
    size: 'kid',
    skin: 'skin3',
    hair: ['short', 'hairAuburn'],
    hat: ['goggles'],
    top: C.orange,
    shade: C.orange,
    legs: C.brown,
    gloves: C.leather,
    held: [['wrench']],
  },
  rivet: {
    skin: 'skin2',
    hair: ['short', 'hairBrown'],
    hat: ['cap', 'black'],
    top: C.navy,
    shade: C.navy,
    legs: C.brown,
    held: [['lantern']],
  },
  hilde: {
    size: 'big',
    skin: 'skin2',
    hair: ['braids', 'hairBlond'],
    top: C.red,
    apron: C.leather,
    shade: C.skin2,
    legs: C.black,
    soot: true,
    held: [['hammer']],
  },
  joss: {
    skin: 'skin4',
    hair: ['short', 'hairBrown'],
    hat: ['straw'],
    top: C.red,
    checks: C.cream,
    shade: C.red,
    legs: C.blue,
    boots: C.brown,
    held: [['crook']],
  },
  // Nails: spiky orange hair, a white shirt under a black jacket. One ice cube.
  nails: {
    skin: 'skin2',
    hair: ['spiky', '#C4642A'],
    top: '#E4DCC8',
    shade: '#2E2430',
    legs: '#2E2430',
    boots: '#1A1418',
    scarf: '#2E2430',
  },
  greta: {
    size: 'big',
    skin: 'skin3',
    hair: ['bun', 'hairGrey'],
    top: C.grey,
    apron: C.tan,
    shade: C.grey,
    legs: C.brown,
    held: [['hammer']],
  },
  wilbur: {
    skin: 'skin1',
    hair: ['curly', 'hairBrown'],
    top: C.green,
    apron: C.tan,
    shade: C.green,
    legs: C.brown,
    dots: [
      [11, 19, C.yellow],
      [20, 19, C.yellow],
    ],
    held: [['saw']],
  },
  // The Kaldorium's Warden: the biggest guard in the kingdom, bald and black-bearded, belted in gold
  kaldoriumwarden: {
    size: 'big',
    skin: '#C8956C',
    hair: ['bald', '#C8956C'],
    beard: ['#2A1810', 2],
    top: '#5A3A2E',
    shade: '#3E2820',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: C.gold,
    held: [['sword']],
  },
  rosa: {
    skin: 'skin4',
    hair: ['long', 'hairBlack'],
    hat: ['welding'],
    top: C.orange,
    apron: C.leather,
    shade: C.orange,
    legs: C.navy,
    held: [['wrench']],
  },
  morrow: {
    skin: 'skin2',
    hair: ['short', 'hairWhite'],
    beard: ['hairWhite', 2],
    hat: ['cap', 'yellow'],
    top: C.yellow,
    shade: C.yellow,
    legs: C.yellow,
    boots: C.black,
    held: [['lantern']],
  },
  adaeze: {
    size: 'tall',
    skin: 'skin6',
    hair: ['bun', 'hairBlack'],
    outfit: 'robe',
    top: C.orange,
    shade: C.orange,
    badges: true,
    held: [['hammer']],
  },
  // Environmental
  sprout: {
    size: 'kid',
    skin: 'skin2',
    hair: ['short', 'hairGreen'],
    hat: ['leaf'],
    top: C.leaf,
    shade: C.green,
    legs: C.brown,
  },
  fern: {
    skin: 'skin3',
    hair: ['long', 'hairBrown'],
    hat: ['sunhat', 'tan'],
    top: C.yellow,
    shade: C.yellow,
    legs: C.brown,
    dots: [
      [24, 26, C.yellow],
      [23, 28, C.black],
      [26, 24, C.yellow],
      [25, 29, C.yellow],
    ],
  },
  cora: {
    skin: 'skin1',
    hair: ['braids', 'hairAuburn'],
    outfit: 'robe',
    top: C.moss,
    shade: C.moss,
    pet: 'sheep',
    held: [['crook']],
  },
  brimsby: {
    size: 'big',
    skin: 'skin2',
    hair: ['bun', 'hairGrey'],
    top: C.rose,
    apron: C.white,
    shade: C.rose,
    outfit: 'robe',
    dots: [
      [15, 28, C.cream],
      [18, 30, C.cream],
    ],
    held: [['ladle']],
  },
  wynn: {
    skin: 'skin3',
    hair: ['curly', 'hairGrey'],
    top: C.sky,
    shade: C.sky,
    legs: C.navy,
    boots: C.yellow,
    held: [['umbrella', 'teal']],
  },
  tala: {
    skin: 'skin5',
    hair: ['braids', 'hairBlack'],
    top: C.teal,
    shade: C.teal,
    legs: C.brown,
    held: [['paddle']],
  },
  tully: {
    skin: 'skin3',
    hair: ['short', 'hairGrey'],
    beard: ['hairGrey', 1],
    hat: ['cap', 'navy'],
    top: C.navy,
    shade: C.navy,
    legs: C.brown,
    held: [['net']],
  },
  hugo: {
    size: 'big',
    skin: 'skin2',
    hair: ['short', 'hairGreen'],
    beard: ['hairGreen', 4],
    top: C.brown,
    shade: C.brown,
    legs: C.green,
    held: [['shears']],
  },
  ivy: {
    skin: 'skin2',
    hat: ['vines'],
    outfit: 'robe',
    top: C.green,
    shade: C.green,
    moss: [
      [12, 28],
      [14, 31],
      [17, 29],
      [19, 33],
      [13, 37],
      [18, 40],
      [11, 42],
    ],
  },
  warden: {
    size: 'tall',
    skin: '#6A4A30',
    hat: ['branches'],
    outfit: 'robe',
    top: C.brown,
    shade: C.brown,
    gloves: C.moss,
    eyes: 'none',
    dots: [
      [13, 16, C.leaf],
      [18, 16, C.leaf],
    ],
    moss: [
      [12, 22],
      [15, 25],
      [19, 23],
      [13, 30],
      [18, 34],
      [14, 39],
      [20, 41],
      [11, 12],
      [19, 12],
    ],
  },
  // These four match their World sprites (scripts/world-art.mjs), so the
  // character you earn looks like the one you met.
  aurek: {
    size: 'tall',
    skin: '#A8B8A8',
    hair: ['short', '#5A6A5A'],
    top: '#7A8A7A',
    shade: '#5A6A5A',
    legs: '#5A6A5A',
    boots: '#3A4A3A',
    held: [['sword']],
  },
  varga: {
    skin: '#D8A880',
    hair: ['short', '#1A1210'],
    cape: '#6A1216',
    top: '#5A3A3A',
    shade: '#3E2828',
    legs: '#3A2A20',
    boots: '#2A1A12',
    belt: '#8A3A2A',
    held: [['sword']],
  },
  gert: {
    outfit: 'robe',
    skin: 'skin2',
    hair: ['short', '#8A8A7A'],
    top: '#6A6A5A',
    shade: '#4E4E42',
    boots: '#3A3A30',
    held: [['lantern']],
  },
  brunna: {
    size: 'kid',
    skin: 'skin2',
    hair: ['short', '#C8A060'],
    top: '#8A6A4A',
    shade: '#6A4E36',
    legs: '#6A4E36',
    boots: '#4A3A2A',
  },
};

const SPECIAL_IDS = {
  hoot: 'owl',
  duke: 'dog',
  rufus: 'raccoon',
  bartholomew: 'bear',
  antler: 'stag',
  lumen: 'flame',
  kitkat: 'twins',
  penrose: 'penrose',
};
const FLOATS = new Set(['lumen']);

// Drawn after the person: Bastian's drum sits over his chest; Aurek's stitches.
function extras(f, id) {
  // Kaldor's crown sits on his hood, and his red beard shows under it, as in the World
  if (id === 'kaldor') {
    const L = LAYOUT.tall;
    HATS.crown(f, L);
    f.rect(13, L.h + 5, 6, 2, '#C4442A').rect(14, L.h + 7, 4, 1, '#C4442A');
  }
  // Aurek's seams: down the chest and across the brow, as in the World
  if (id === 'aurek') {
    const L = LAYOUT.tall;
    f.rect(16, L.ty, 1, L.th, '#2A1A1A').rect(13, L.h + 1, 6, 1, '#2A1A1A');
    for (let y = L.ty + 2; y < L.ty + L.th; y += 3) f.px([[15, y], [17, y]], '#2A1A1A');
  }
  if (id === 'bastian')
    f.rect(12, 27, 8, 6, C.red)
      .rect(12, 27, 8, 1, C.white)
      .rect(12, 32, 8, 1, C.gold)
      .px(
        [
          [22, 24],
          [23, 23],
        ],
        C.wood,
      );
}

// ---------------------------------------------------------------------------

function render(fill) {
  const p = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c = fill[y][x];
      if (
        !c &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => fill[y + dy]?.[x + dx])
      )
        c = OUT;
      if (!c) continue;
      const i = (y * W + x) * 4;
      p.data[i] = c[0];
      p.data[i + 1] = c[1];
      p.data[i + 2] = c[2];
      p.data[i + 3] = 255;
    }
  return p;
}

/** Two frames side by side; the second bobs the upper body down a pixel (or all of it, for floaters). */
function strip(grid, floats) {
  const base = Array.from({ length: H }, (_, y) => (y >= DROP ? grid[y - DROP] : Array(W).fill(null)));
  const cut = floats ? H : LEG_TOP + DROP;
  const bob = base.map((row, y) =>
    y === 0 ? Array(W).fill(null) : y < cut ? base[y - 1] : y === cut ? row.map((c, x) => base[y - 1][x] ?? c) : row,
  );
  const frames = [render(base), render(bob)];
  const out = new PNG({ width: W * 2 * SCALE, height: H * SCALE });
  frames.forEach((fr, k) => {
    for (let y = 0; y < out.height; y++)
      for (let x = 0; x < W * SCALE; x++) {
        const s = (Math.floor(y / SCALE) * W + Math.floor(x / SCALE)) * 4;
        fr.data.copy(out.data, (y * out.width + x + k * W * SCALE) * 4, s, s + 4);
      }
  });
  return out;
}

const drawn = [];
for (const [id, draw] of Object.entries(cast)) drawn.push([id, draw, false]);
for (const [id, kind] of Object.entries(SPECIAL_IDS)) drawn.push([id, SPECIAL[kind], FLOATS.has(id)]);
for (const [id, spec] of Object.entries(SPECS))
  drawn.push([
    id,
    (f) => {
      person(f, spec);
      extras(f, id);
    },
    false,
  ]);

for (const [id, draw, floats] of drawn) {
  const f = canvas();
  draw(f);
  mkdirSync(`assets/sprites/${id}`, { recursive: true });
  writeFileSync(`assets/sprites/${id}/idle.png`, PNG.sync.write(strip(f.g, floats)));
}

const ids = drawn.map(([id]) => id).sort();
writeFileSync(
  'src/art/stand-ins.ts',
  `// Generated by scripts/stand-in-sprites.mjs. Do not edit by hand.
import type { CharacterArt } from './sprites';

const idle = (source: number) => ({ idle: { source, width: 32, height: 48, frames: 2, fps: 2 } });

/** Placeholder art for every character until their real sprite arrives. */
export const STAND_INS: Record<string, CharacterArt> = {
${ids.map((id) => `  ${id}: idle(require('@/assets/sprites/${id}/idle.png')),`).join('\n')}
};
`,
);
console.log(`Drew ${drawn.length} stand-ins.`);
