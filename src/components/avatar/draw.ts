import type { Mood, PlayerLook } from '@/game';

/**
 * Draws the player's hero as a 32×48 pixel grid, the same size and build as
 * the party's stand-in sprites (scripts/stand-in-sprites.mjs), in one of two
 * frames for the given mood. Everything is plain rectangles so it can be
 * rebuilt instantly as the creator's options change.
 */
export const W = 32;
export const H = 48;

const OUT = '#140E1C';
const EYE = '#140E1C';
const GOLD = '#FFC940';
const SHINE = '#FFF4C0';
const STEEL = '#9AA0B4';
const STEEL2 = '#6A7088';
const LEATHER = '#5C3A28';
const PINK = '#FF4FD8';
const LEAF = '#4ADE80';
const WHITE = '#F0E6C8';

type Grid = (string | null)[][];
type Arm = 'down' | 'up' | 'flex' | 'out' | 'wave' | 'hips' | 'cross' | 'bite';

/** Darker version of a hex color, for shading. */
function shade(hex: string, by = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.min(255, Math.round(((n >> s) & 255) * by));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

function canvas(dx: number, dy: number) {
  const g: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  let ox = dx;
  let oy = dy;
  const f = {
    g,
    /** Effects float free of the bob; the body moves with it. */
    still() {
      ox = 0;
      oy = 0;
      return f;
    },
    rect(x: number, y: number, w: number, h: number, c: string) {
      for (let j = y + oy; j < y + oy + h; j++)
        for (let i = x + ox; i < x + ox + w; i++) if (i >= 0 && i < W && j >= 0 && j < H) g[j][i] = c;
      return f;
    },
    px(pts: [number, number][], c: string) {
      pts.forEach(([x, y]) => f.rect(x, y, 1, 1, c));
      return f;
    },
    trap(y0: number, y1: number, hw0: number, hw1: number, c: string) {
      for (let y = y0; y <= y1; y++) {
        const hw = Math.round(hw0 + ((hw1 - hw0) * (y - y0)) / Math.max(1, y1 - y0));
        f.rect(16 - hw, y, hw * 2, 1, c);
      }
      return f;
    },
  };
  return f;
}

type Pose = {
  left: Arm;
  right: Arm;
  eyes: 'open' | 'closed' | 'happy' | 'fierce' | 'worried' | 'bulging' | 'smug' | 'shades';
  mouth: 'smile' | 'grin' | 'yawn' | 'flat' | 'wavy' | 'smirk' | 'teeth';
};

const POSES: Record<Mood, [Pose, Pose]> = {
  ready: [
    { left: 'down', right: 'down', eyes: 'open', mouth: 'smile' },
    { left: 'down', right: 'down', eyes: 'open', mouth: 'smile' },
  ],
  waking: [
    { left: 'up', right: 'up', eyes: 'closed', mouth: 'yawn' },
    { left: 'down', right: 'down', eyes: 'closed', mouth: 'flat' },
  ],
  sleepy: [
    { left: 'down', right: 'down', eyes: 'closed', mouth: 'flat' },
    { left: 'down', right: 'down', eyes: 'closed', mouth: 'flat' },
  ],
  winding: [
    { left: 'down', right: 'out', eyes: 'closed', mouth: 'smile' },
    { left: 'down', right: 'out', eyes: 'open', mouth: 'smile' },
  ],
  champion: [
    { left: 'up', right: 'up', eyes: 'happy', mouth: 'grin' },
    { left: 'up', right: 'up', eyes: 'happy', mouth: 'grin' },
  ],
  strong: [
    { left: 'flex', right: 'flex', eyes: 'fierce', mouth: 'grin' },
    { left: 'flex', right: 'flex', eyes: 'fierce', mouth: 'flat' },
  ],
  smart: [
    { left: 'out', right: 'out', eyes: 'open', mouth: 'flat' },
    { left: 'out', right: 'out', eyes: 'open', mouth: 'smile' },
  ],
  rich: [
    { left: 'down', right: 'up', eyes: 'open', mouth: 'grin' },
    { left: 'down', right: 'up', eyes: 'happy', mouth: 'grin' },
  ],
  calm: [
    { left: 'down', right: 'down', eyes: 'closed', mouth: 'smile' },
    { left: 'down', right: 'down', eyes: 'closed', mouth: 'smile' },
  ],
  peaceful: [
    { left: 'down', right: 'down', eyes: 'happy', mouth: 'smile' },
    { left: 'down', right: 'down', eyes: 'happy', mouth: 'smile' },
  ],
  cheerful: [
    { left: 'down', right: 'up', eyes: 'happy', mouth: 'grin' },
    { left: 'down', right: 'wave', eyes: 'happy', mouth: 'grin' },
  ],
  busy: [
    { left: 'down', right: 'up', eyes: 'fierce', mouth: 'flat' },
    { left: 'down', right: 'out', eyes: 'fierce', mouth: 'flat' },
  ],
  outdoorsy: [
    { left: 'down', right: 'out', eyes: 'happy', mouth: 'smile' },
    { left: 'down', right: 'out', eyes: 'open', mouth: 'smile' },
  ],
  // Leveled up: a fist pump, then a jump with both arms up in the confetti.
  victory: [
    { left: 'down', right: 'up', eyes: 'happy', mouth: 'teeth' },
    { left: 'up', right: 'up', eyes: 'happy', mouth: 'teeth' },
  ],
  // Behind on the day: biting a nail, eyes darting, sweating.
  anxious: [
    { left: 'bite', right: 'down', eyes: 'worried', mouth: 'wavy' },
    { left: 'bite', right: 'down', eyes: 'worried', mouth: 'wavy' },
  ],
  // Ahead of the day: hands on hips, a knowing smirk.
  confident: [
    { left: 'hips', right: 'hips', eyes: 'smug', mouth: 'smirk' },
    { left: 'hips', right: 'hips', eyes: 'smug', mouth: 'grin' },
  ],
  // Way ahead: arms flailing, eyes bulging, vibrating with energy.
  overdrive: [
    { left: 'up', right: 'out', eyes: 'bulging', mouth: 'teeth' },
    { left: 'out', right: 'up', eyes: 'bulging', mouth: 'teeth' },
  ],
  // A habit an hour: arms crossed, sunglasses on.
  cool: [
    { left: 'cross', right: 'cross', eyes: 'shades', mouth: 'smirk' },
    { left: 'cross', right: 'cross', eyes: 'shades', mouth: 'smirk' },
  ],
};

/** How far the body moves on each frame (x, y): a bob, a jump, a shiver. Most just bob down 1 on the second. */
const MOTION: Partial<Record<Mood, [[number, number], [number, number]]>> = {
  champion: [[0, 0], [0, -3]],
  cheerful: [[0, 0], [0, -1]],
  sleepy: [[0, 0], [0, 0]],
  calm: [[0, 0], [0, 0]],
  smart: [[0, 0], [0, 0]],
  cool: [[0, 0], [0, 0]],
  victory: [[0, 0], [0, -4]],
  anxious: [[0, 0], [1, 0]],
  overdrive: [[-1, 0], [1, -2]],
};

function arm(f: ReturnType<typeof canvas>, side: 'L' | 'R', pose: Arm, sleeve: string, skin: string) {
  // Mirror x for the right arm around the body's centre (x 16).
  const m = (x: number, w: number) => (side === 'L' ? x : 32 - x - w);
  switch (pose) {
    case 'down':
      f.rect(m(9, 2), 25, 2, 7, sleeve).rect(m(9, 2), 32, 2, 2, skin);
      break;
    case 'up':
      f.rect(m(9, 2), 19, 2, 6, sleeve).rect(m(9, 2), 17, 2, 2, skin);
      break;
    case 'wave':
      f.rect(m(9, 2), 21, 2, 4, sleeve).rect(m(7, 2), 19, 2, 2, sleeve).rect(m(6, 2), 17, 2, 2, skin);
      break;
    case 'flex':
      // Upper arm straight out, forearm up, fist by the ear, and a bulge.
      f.rect(m(6, 3), 25, 3, 2, sleeve)
        .rect(m(6, 2), 21, 2, 4, skin)
        .rect(m(6, 2), 19, 2, 2, skin)
        .rect(m(7, 1), 24, 1, 1, skin);
      break;
    case 'out':
      f.rect(m(9, 2), 25, 2, 4, sleeve).rect(m(10, 3), 29, 3, 2, sleeve).rect(m(12, 2), 29, 2, 2, skin);
      break;
    case 'hips':
      // Elbow out, fist on the hip.
      f.rect(m(8, 2), 25, 2, 4, sleeve).rect(m(9, 2), 29, 2, 1, sleeve).rect(m(10, 2), 30, 2, 2, skin);
      break;
    case 'cross':
      // Both forearms folded across the chest; each hand peeks out the other side.
      f.rect(m(9, 2), 25, 2, 4, sleeve).rect(11, 28, 10, 2, sleeve).px([[m(20, 1), side === 'L' ? 28 : 29]], skin);
      break;
    case 'bite':
      // A hand up at the mouth, nibbling a nail.
      f.rect(m(9, 2), 25, 2, 4, sleeve).rect(m(11, 2), 26, 2, 3, sleeve).rect(m(13, 2), 24, 2, 2, sleeve);
      f.rect(m(14, 2), 22, 2, 2, skin);
      break;
  }
}

type F = ReturnType<typeof canvas>;
type Pt = [number, number];

/** Hair, under whatever's worn on the head; a hood or helmet hides most of it. */
function hair(f: F, look: PlayerLook) {
  const c = look.hairColor;
  const hi = shade(c, 1.35);
  if (look.headwear === 'hood') return;
  const sides = (h = 3) => f.rect(11, 16, 1, h, c).rect(20, 16, 1, h, c);
  switch (look.hair) {
    case 'short':
      f.rect(12, 15, 8, 2, c);
      sides();
      break;
    case 'spiky':
      f.rect(12, 15, 8, 2, c);
      sides();
      f.px([[12, 14], [14, 13], [15, 14], [17, 13], [18, 14], [20, 14]], c);
      break;
    case 'messy':
      f.rect(12, 15, 8, 2, c).rect(13, 17, 2, 1, c);
      sides(4);
      f.px([[11, 14], [13, 13], [16, 14], [19, 13], [21, 15], [10, 17], [21, 18]], c);
      break;
    case 'sidepart':
      f.rect(12, 15, 8, 2, c).rect(12, 17, 4, 1, c).px([[17, 15]], hi);
      sides(4);
      break;
    case 'long':
      f.rect(11, 15, 10, 3, c).rect(11, 18, 1, 9, c).rect(20, 18, 1, 9, c).rect(10, 19, 1, 7, c).rect(21, 19, 1, 7, c);
      break;
    case 'ponytail':
      f.rect(12, 15, 8, 2, c).rect(21, 16, 2, 2, c).rect(22, 18, 1, 7, c).px([[21, 25]], c);
      sides();
      break;
    case 'braids':
      f.rect(12, 15, 8, 2, c).px([[16, 15]], hi);
      sides();
      f.rect(11, 19, 1, 8, c).rect(20, 19, 1, 8, c);
      f.px([[11, 20], [11, 22], [11, 24], [20, 20], [20, 22], [20, 24]], hi).px([[11, 27], [20, 27]], GOLD);
      break;
    case 'bun':
      f.rect(12, 15, 8, 2, c).rect(14, 12, 4, 3, c).px([[15, 12]], hi);
      sides(4);
      break;
    case 'curly':
      f.rect(11, 14, 10, 3, c).rect(10, 16, 2, 5, c).rect(20, 16, 2, 5, c);
      f.px([[12, 13], [15, 13], [18, 13], [9, 18], [22, 18]], c).px([[13, 15], [17, 14], [10, 19]], hi);
      break;
    case 'afro':
      f.rect(10, 11, 12, 6, c).rect(9, 13, 1, 7, c).rect(22, 13, 1, 7, c).rect(10, 17, 2, 5, c).rect(20, 17, 2, 5, c);
      f.rect(12, 10, 8, 1, c).px([[13, 12], [17, 11], [20, 13], [11, 15]], hi);
      break;
    case 'mohawk':
      f.rect(15, 11, 2, 5, c).rect(14, 13, 4, 2, c).px([[15, 11]], hi);
      f.px([[12, 16], [13, 16], [18, 16], [19, 16]], shade(look.skin, 0.85));
      break;
    case 'bald':
      f.px([[14, 16]], shade(look.skin, 1.2)); // a shine on top
      break;
  }
}

function face(f: F, look: PlayerLook, pose: Pose, frame: number) {
  const skin = look.skin;
  const eye = look.eyes;
  f.rect(12, 16, 8, 8, skin);
  const glasses = look.face === 'glasses' && pose.eyes !== 'shades';
  if (glasses) f.rect(12, 19, 3, 3, '#CFE0F0').rect(17, 19, 3, 3, '#CFE0F0').rect(15, 20, 2, 1, GOLD);
  switch (pose.eyes) {
    case 'open':
      // A dark outer pixel and the eye's colour inside, so every colour still reads.
      f.px([[13, 20], [18, 20]], EYE).px([[14, 20], [17, 20]], eye);
      break;
    case 'closed':
      f.rect(13, 21, 2, 1, shade(skin, 0.55)).rect(17, 21, 2, 1, shade(skin, 0.55));
      break;
    case 'happy':
      f.px([[13, 21], [14, 20], [17, 20], [18, 21]], EYE);
      break;
    case 'fierce':
      f.px([[13, 20], [18, 20]], EYE).px([[14, 20], [17, 20]], eye);
      f.px([[13, 18], [14, 19], [18, 18], [17, 19]], glasses ? EYE : shade(look.hairColor, 0.9));
      break;
    case 'worried': {
      // Brows up in the middle; the eyes dart side to side.
      const brow = shade(look.hairColor, 0.9);
      f.px([[13, 19], [14, 18], [17, 18], [18, 19]], brow);
      f.rect(13, 20, 2, 1, '#FFFFFF').rect(17, 20, 2, 1, '#FFFFFF');
      f.px(frame ? [[14, 20], [18, 20]] : [[13, 20], [17, 20]], eye === EYE ? EYE : eye);
      break;
    }
    case 'bulging':
      // Huge eyes that pop out past the face on the second frame, with pin-prick pupils.
      if (frame) f.rect(11, 17, 4, 4, '#FFFFFF').rect(17, 17, 4, 4, '#FFFFFF').px([[12, 18], [19, 19]], EYE).px([[14, 17]], '#E04040');
      else f.rect(12, 18, 3, 3, '#FFFFFF').rect(17, 18, 3, 3, '#FFFFFF').px([[13, 19], [18, 19]], EYE);
      break;
    case 'smug':
      f.px([[13, 20], [18, 20]], EYE).px([[14, 20], [17, 20]], eye).rect(13, 19, 2, 1, shade(skin, 0.7)).rect(17, 19, 2, 1, shade(skin, 0.7));
      f.px(frame ? [[17, 17], [18, 17]] : [[17, 18], [18, 18]], shade(look.hairColor, 0.9));
      break;
    case 'shades':
      f.rect(12, 19, 3, 2, '#141018').rect(17, 19, 3, 2, '#141018').rect(15, 19, 2, 1, '#141018').px([[11, 19], [20, 19]], '#141018');
      f.px([frame ? [18, 19] : [13, 19]], '#FFFFFF');
      break;
  }
  const lip = shade(skin, 0.6);
  if (pose.mouth === 'smile') f.px([[14, 22], [17, 22]], lip).rect(15, 23, 2, 1, lip);
  if (pose.mouth === 'grin') f.rect(14, 22, 4, 1, lip).rect(15, 23, 2, 1, '#FFFFFF');
  if (pose.mouth === 'yawn') f.rect(15, 22, 2, 2, EYE);
  if (pose.mouth === 'flat') f.rect(15, 23, 2, 1, lip);
  if (pose.mouth === 'wavy') f.px([[14, 23], [15, 22], [16, 23], [17, 22]], lip);
  if (pose.mouth === 'smirk') f.px([[15, 23], [16, 23], [17, 22]], lip);
  if (pose.mouth === 'teeth') f.rect(13, 22, 6, 2, '#FFFFFF').px([[12, 22], [19, 22]], lip).px([[16, 23]], shade(skin, 0.85));
  // Blush for the soft moods.
  if (pose.eyes === 'happy') f.px([[12, 22], [19, 22]], '#E07A9A');

  switch (look.face) {
    case 'monocle':
      f.px([[17, 19], [18, 19], [19, 19], [16, 20], [19, 20], [17, 21], [18, 21], [19, 21]], GOLD).px([[20, 22], [20, 23]], GOLD);
      break;
    case 'eyepatch':
      f.rect(17, 19, 3, 3, '#2A2030').px([[16, 18], [15, 17], [14, 17], [13, 16], [20, 19], [21, 19]], '#2A2030');
      break;
    case 'freckles':
      f.px([[12, 21], [13, 22], [19, 21], [18, 22]], shade(skin, 0.7));
      break;
    case 'scar':
      f.px([[18, 18], [17, 19], [18, 21], [19, 22]], '#C46A6A');
      break;
  }
}

function facialHair(f: F, look: PlayerLook) {
  const hc = look.hairColor;
  switch (look.facial) {
    case 'stubble':
      f.px([[12, 22], [14, 23], [16, 23], [18, 23], [19, 22], [13, 23], [17, 23]], shade(look.skin, 0.75));
      break;
    case 'mustache':
      f.rect(14, 22, 4, 1, hc).px([[13, 23], [18, 23]], hc);
      break;
    case 'goatee':
      f.rect(15, 24, 2, 2, hc).px([[14, 22], [17, 22]], hc);
      break;
    case 'beard':
      f.rect(12, 22, 8, 2, hc).rect(13, 24, 6, 1, hc).rect(14, 25, 4, 1, hc).rect(15, 23, 2, 1, shade(look.skin, 0.6));
      break;
  }
}

function headwear(f: F, look: PlayerLook) {
  const oc = look.outfitColor;
  switch (look.headwear) {
    case 'headband':
      f.rect(11, 17, 10, 1, GOLD === oc ? '#C4442A' : GOLD);
      break;
    case 'bandana': {
      const b = oc === '#C4442A' ? '#2A3470' : '#C4442A';
      f.rect(11, 14, 10, 3, b).px([[21, 16], [22, 17], [22, 15]], b).px([[13, 15], [17, 14], [19, 15]], WHITE);
      break;
    }
    case 'flowers': {
      const petals: Pt[] = [[11, 15], [13, 14], [15, 15], [17, 14], [19, 15], [21, 16]];
      f.rect(11, 16, 10, 1, '#3E7A4A');
      petals.forEach((p, i) => f.px([p], [PINK, GOLD, WHITE][i % 3]));
      break;
    }
    case 'hood': {
      const h = shade(oc, 0.8);
      f.rect(11, 14, 10, 3, h).rect(10, 16, 2, 9, h).rect(20, 16, 2, 9, h).rect(12, 13, 8, 1, h);
      break;
    }
    case 'wizard': {
      const h = shade(oc, 0.85);
      f.rect(9, 15, 14, 1, h).trap(9, 14, 1, 4, h).px([[18, 6], [19, 7]], h).px([[14, 12], [17, 10]], GOLD).px([[16, 13]], SHINE);
      break;
    }
    case 'helmet':
      f.rect(11, 14, 10, 3, STEEL).rect(12, 13, 8, 1, STEEL).rect(11, 17, 1, 5, STEEL2).rect(20, 17, 1, 5, STEEL2);
      f.rect(15, 17, 2, 4, STEEL2).px([[13, 14], [14, 14]], WHITE).px([[16, 11], [16, 12]], '#C4442A');
      break;
    case 'crown':
      f.rect(12, 13, 8, 2, GOLD).px([[12, 12], [14, 11], [16, 12], [17, 11], [19, 12]], GOLD).px([[15, 13]], '#C4442A');
      break;
  }
}

/** Draws the clothes and says what the arms wear (they go on last, over the face when a hand is at the mouth). */
function outfit(f: F, look: PlayerLook) {
  const c = look.outfitColor;
  const dark = shade(c);
  const skin = look.skin;
  const pants = look.pantsColor;
  let sleeve = dark;
  const sleeveHand = skin;
  const legs = (color: string, boots: string) =>
    f.rect(12, 34, 3, 8, color).rect(17, 34, 3, 8, color).rect(11, 42, 4, 3, boots).rect(17, 42, 4, 3, boots);
  switch (look.outfit) {
    case 'tunic':
      f.rect(11, 24, 10, 10, c).rect(11, 31, 10, 1, LEATHER).px([[16, 31]], GOLD);
      legs(pants, LEATHER);
      break;
    case 'vest':
      sleeve = '#E8DCC0';
      f.rect(11, 24, 10, 10, '#F0E6C8').rect(11, 24, 4, 10, c).rect(17, 24, 4, 10, c).px([[16, 27], [16, 30]], GOLD);
      legs(pants, '#2A2020');
      break;
    case 'apron':
      f.rect(11, 24, 10, 10, c).rect(12, 27, 8, 12, '#E8DCC0').px([[12, 25], [12, 26], [19, 25], [19, 26]], '#E8DCC0');
      f.rect(14, 31, 4, 2, shade('#E8DCC0', 0.85));
      legs(pants, LEATHER);
      f.rect(12, 34, 8, 5, '#E8DCC0');
      break;
    case 'gi':
      sleeve = c;
      f.rect(11, 24, 10, 10, c).px([[14, 24], [15, 25], [16, 26], [17, 25], [18, 24]], shade(c, 1.3));
      f.rect(15, 26, 2, 1, skin).rect(11, 31, 10, 1, '#2A2030').px([[13, 32], [13, 33]], '#2A2030');
      f.rect(12, 34, 3, 9, c).rect(17, 34, 3, 9, c).rect(12, 43, 3, 2, skin).rect(17, 43, 3, 2, skin);
      break;
    case 'robe':
      f.trap(24, 43, 5, 8, c).rect(15, 24, 2, 19, dark).rect(12, 44, 3, 1, '#2A2030').rect(17, 44, 3, 1, '#2A2030');
      break;
    case 'dress':
      sleeve = c;
      f.rect(12, 24, 8, 6, c).rect(12, 29, 8, 1, GOLD).trap(30, 42, 5, 9, c);
      f.px([[10, 41], [13, 41], [16, 41], [19, 41], [22, 41]], dark).rect(13, 43, 2, 2, '#2A2030').rect(17, 43, 2, 2, '#2A2030');
      break;
    case 'armor':
      sleeve = STEEL2;
      f.rect(10, 24, 12, 10, STEEL).rect(13, 26, 6, 5, c).rect(14, 27, 4, 3, dark).rect(10, 32, 12, 1, LEATHER);
      legs(STEEL2, LEATHER);
      break;
    case 'cloak':
      f.trap(24, 40, 6, 8, dark).rect(12, 24, 8, 10, c).rect(13, 24, 6, 1, GOLD);
      legs(pants, '#2A2020');
      break;
  }
  return { sleeve, hand: sleeveHand };
}

/** What the hero holds and what floats around them for the mood (effects are drawn after the outline). */
function props(f: ReturnType<typeof canvas>, mood: Mood, frame: number, look: PlayerLook) {
  switch (mood) {
    case 'strong':
      // Power lines that flicker off the flexed arms.
      f.still().px(
        frame
          ? [
              [3, 18],
              [28, 18],
              [3, 22],
              [28, 22],
            ]
          : [
              [4, 19],
              [27, 19],
            ],
        WHITE,
      );
      f.px([[21, 16 + frame]], '#7AB0E0'); // a drop of sweat
      break;
    case 'smart': {
      // An open book in both hands, and a bulb that lights up.
      f.rect(12, 28, 8, 4, '#A0302A').rect(13, 28, 3, 3, WHITE).rect(16, 28, 3, 3, WHITE).rect(16, 28, 1, 4, '#6A2020');
      const bulb = frame ? SHINE : GOLD;
      f.still().rect(15, 7, 3, 3, bulb).rect(16, 10, 1, 1, STEEL);
      if (frame)
        f.px(
          [
            [13, 6],
            [19, 6],
            [16, 4],
            [12, 9],
            [20, 9],
          ],
          GOLD,
        );
      break;
    }
    case 'rich':
      // A coin flipped from the raised hand.
      f.still().rect(24, frame ? 9 : 12, 3, 3, GOLD).px([[25, frame ? 10 : 13]], SHINE);
      break;
    case 'calm':
      f.still()
        .rect(13, 11, 6, 1, GOLD)
        .px(
          [
            [12, 12],
            [19, 12],
          ],
          GOLD,
        );
      if (frame)
        f.px(
          [
            [9, 14],
            [23, 15],
            [7, 26],
            [25, 24],
          ],
          SHINE,
        );
      break;
    case 'peaceful': {
      const y = frame ? 9 : 12;
      f.still()
        .rect(23, y, 2, 2, PINK)
        .rect(26, y, 2, 2, PINK)
        .rect(23, y + 1, 5, 2, PINK)
        .rect(24, y + 3, 3, 1, PINK)
        .px([[25, y + 4]], PINK);
      break;
    }
    case 'cheerful':
      // A music note bouncing beside the wave.
      f.still()
        .rect(5, frame ? 11 : 13, 1, 5, EYE)
        .rect(3, frame ? 15 : 17, 3, 2, EYE)
        .rect(6, frame ? 11 : 13, 2, 1, EYE);
      break;
    case 'busy':
      // A hammer raised, then brought down with a spark.
      if (frame === 0) f.rect(21, 11, 1, 6, '#8A5A34').rect(19, 9, 5, 3, STEEL2);
      else {
        f.rect(19, 28, 6, 1, '#8A5A34').rect(24, 26, 3, 5, STEEL2);
        f.still().px(
          [
            [28, 25],
            [29, 28],
            [28, 31],
          ],
          GOLD,
        );
      }
      break;
    case 'outdoorsy':
      // A leaf in the hair and a sprout that grows at their feet.
      f.px([[19, 14]], LEAF).px([[20, 13]], LEAF);
      f.still()
        .rect(26, 44, 1, frame ? 4 : 2, '#3E7A4A')
        .px(
          frame
            ? [
                [25, 44],
                [27, 43],
                [24, 43],
                [28, 42],
              ]
            : [
                [25, 46],
                [27, 46],
              ],
          LEAF,
        );
      break;
    case 'winding':
      // A warm mug with steam.
      f.rect(21, 28, 3, 3, '#B87838').rect(24, 29, 1, 1, '#B87838');
      f.still().px(frame ? [[22, 25], [23, 23]] : [[22, 26], [21, 24]], '#C8CCD8');
      break;
    case 'champion':
      f.still()
        .px(
          frame
            ? [
                [4, 12],
                [27, 10],
                [6, 30],
                [26, 33],
                [16, 5],
              ]
            : [
                [5, 16],
                [26, 14],
                [3, 26],
                [28, 28],
                [16, 7],
              ],
          GOLD,
        )
        .px(frame ? [[16, 4], [15, 5], [17, 5], [16, 6]] : [], SHINE);
      break;
    case 'sleepy': {
      const z = (x: number, y: number, s: number) =>
        f.rect(x, y, s, 1, '#A890C8').rect(x, y + s - 1, s, 1, '#A890C8').px(
          Array.from({ length: Math.max(0, s - 2) }, (_, i) => [x + s - 2 - i, y + 1 + i] as [number, number]),
          '#A890C8',
        );
      f.still();
      z(22, 12, 3);
      if (frame) z(25, 6, 4);
      break;
    }
    case 'waking':
      if (frame === 0)
        f.still().px(
          [
            [6, 14],
            [25, 14],
          ],
          SHINE,
        );
      break;
    case 'victory': {
      // Confetti in four colours, shuffled each frame.
      const bits: Pt[] = frame
        ? [[4, 8], [27, 6], [7, 20], [25, 18], [2, 30], [29, 28], [12, 5], [21, 9], [5, 38], [27, 37]]
        : [[6, 12], [25, 10], [3, 22], [28, 21], [5, 33], [26, 31], [10, 8], [22, 5], [3, 42], [29, 41]];
      f.still();
      bits.forEach((p, i) => f.px([p], [GOLD, PINK, '#2DD4BF', '#8B5CF6'][i % 4]));
      if (frame) f.px([[16, 3], [15, 4], [16, 4], [17, 4], [16, 5]], GOLD);
      break;
    }
    case 'anxious':
      // Sweat flying off, and a scribble of worry over the head.
      f.px(frame ? [[21, 17], [10, 19]] : [[22, 15], [9, 17]], '#7AB0E0');
      f.still().px(
        frame ? [[14, 9], [15, 8], [16, 9], [17, 8], [18, 9]] : [[13, 8], [14, 9], [15, 8], [16, 9], [17, 8]],
        '#8A8898',
      );
      break;
    case 'confident':
      // A "ting" of light off the smile.
      if (frame) f.px([[21, 21], [20, 22], [21, 22], [22, 22], [21, 23]], SHINE);
      break;
    case 'overdrive': {
      // Hair standing on end and lightning crackling off them.
      if (look.headwear === 'none' || look.headwear === 'headband') f.px([[12, 13], [14, 12], [16, 11], [18, 12], [20, 13]], look.hairColor);
      const bolt = (x: number, y: number) => f.px([[x, y], [x + 1, y + 1], [x, y + 2], [x + 1, y + 3]], GOLD);
      f.still();
      if (frame) {
        bolt(3, 14);
        bolt(27, 22);
        bolt(5, 32);
      } else {
        bolt(26, 12);
        bolt(3, 24);
        bolt(27, 34);
      }
      break;
    }
    case 'cool':
      break;
    case 'ready':
      break;
  }
}

/** Fills empty cells beside the body with the outline, like the stand-in sprites. */
function outline(g: Grid) {
  const out = g.map((row) => row.slice());
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x]) continue;
      const near =
        (y > 0 && g[y - 1][x]) || (y < H - 1 && g[y + 1][x]) || (x > 0 && g[y][x - 1]) || (x < W - 1 && g[y][x + 1]);
      if (near) out[y][x] = OUT;
    }
  return out;
}

export type Run = { x: number; y: number; w: number; c: string };

/** The hero for one frame, as runs of same-coloured pixels per row (few rects to draw). */
export function drawHero(look: PlayerLook, mood: Mood, frame: 0 | 1): Run[] {
  const pose = POSES[mood][frame];
  const [dx, dy] = (MOTION[mood] ?? [[0, 0], [0, 1]])[frame];
  const body = canvas(dx, dy);
  const { sleeve, hand } = outfit(body, look);
  face(body, look, pose, frame);
  facialHair(body, look);
  hair(body, look);
  headwear(body, look);
  arm(body, 'L', pose.left, sleeve, hand);
  arm(body, 'R', pose.right, sleeve, hand);
  // Held things belong to the body (outlined); floating effects aren't.
  const held = canvas(dx, dy);
  props(held, mood, frame, look);
  const g = outline(body.g);
  const merged: Grid = g.map((row, y) => row.map((c, x) => held.g[y][x] ?? c));
  const runs: Run[] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = merged[y][x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < W && merged[y][x + w] === c) w++;
      runs.push({ x, y, w, c });
      x += w;
    }
  }
  return runs;
}
