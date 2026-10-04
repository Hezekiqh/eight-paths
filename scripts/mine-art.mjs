// The old mine south of Warrior City (author, Oct 3, 2026): ore glinting in the rock, a mine cart,
// and the cocoon Tamsin came out of early, split down the front.

export function mineArt({ box, put, ellipse, hash, wall }) {
  return {
    // an ore vein: the dungeon wall, with seams of copper and silver catching the lantern light
    v(g, x, y, m) {
      wall(g, x, y, m);
      for (let k = 0; k < 7; k++) {
        const ox = x + 2 + Math.floor(hash(x, y, k + 70) * 12);
        const oy = y + 2 + Math.floor(hash(y, x, k + 71) * 9);
        const c = ['#C87A3A', '#E8E0D0', '#D8A85A'][k % 3];
        put(g, ox, oy, c);
        put(g, ox + 1, oy, c);
        if (k % 2) put(g, ox, oy + 1, '#FFF4C8');
      }
    },
    // a mine cart, heaped with rock
    j(g, x, y) {
      box(g, x + 1, y + 13, 14, 1, '#4A4442');
      box(g, x + 2, y + 6, 12, 7, '#5A4A3A');
      box(g, x + 2, y + 6, 12, 1, '#7A6A58');
      box(g, x + 2, y + 9, 12, 1, '#3A3230');
      ellipse(g, x + 8, y + 5, 5, 2, '#6A6260');
      put(g, x + 6, y + 4, '#C87A3A');
      put(g, x + 10, y + 5, '#E8E0D0');
      ellipse(g, x + 4, y + 14, 2, 2, '#2A2422');
      ellipse(g, x + 12, y + 14, 2, 2, '#2A2422');
    },
    // the cocoon she came out of: the silk split open and slumped against the rock
    J(g, x, y) {
      ellipse(g, x + 8, y + 13, 7, 2, '#1E1816');
      box(g, x + 2, y + 6, 4, 8, '#EDE6D6');
      box(g, x + 10, y + 7, 4, 7, '#EDE6D6');
      box(g, x + 3, y + 4, 2, 3, '#C9BFAE');
      box(g, x + 11, y + 5, 2, 3, '#C9BFAE');
      box(g, x + 5, y + 11, 6, 3, '#A69C8C');
      for (let k = 0; k < 4; k++) put(g, x + 3 + k * 3, y + 8 + (k % 2), '#D8CFBD');
    },
  };
}
