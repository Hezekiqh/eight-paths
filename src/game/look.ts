/**
 * The player's own character, from the character creator on Today: a small
 * pixel person drawn from these choices (see components/avatar).
 */
export const SKIN_TONES = ['#F2CDA8', '#E8B48C', '#C98E6A', '#A86E4A', '#7A4B32', '#5A3624', '#9CC8E0', '#8FB878'] as const;
export const EYE_COLORS = ['#140E1C', '#6A4028', '#3A6AB0', '#3E7A4A', '#E0A030', '#8B5CF6', '#C4442A'] as const;
export const HAIR_COLORS = [
  '#2A2024',
  '#5C3A28',
  '#A0482A',
  '#D86A2A',
  '#E0B850',
  '#B0B0B8',
  '#E8E4DC',
  '#4E7A3A',
  '#6A4A9E',
  '#FF4FD8',
  '#3A6AB0',
] as const;
export const OUTFIT_COLORS = [
  '#C4442A',
  '#3A6AB0',
  '#3E7A4A',
  '#6A4A9E',
  '#E07A30',
  '#2DD4BF',
  '#8A8898',
  '#6A4028',
  '#F2C14E',
  '#FF4FD8',
  '#2A3470',
  '#F0E6C8',
  '#2A2030',
] as const;
export const PANTS_COLORS = ['#4A3A2A', '#3A3848', '#2A3470', '#6A4028', '#3E6A3A', '#B8A07A', '#2A2030', '#8A8898'] as const;

export const HAIR_STYLES = [
  'short',
  'spiky',
  'messy',
  'sidepart',
  'long',
  'ponytail',
  'braids',
  'bun',
  'curly',
  'afro',
  'mohawk',
  'bald',
] as const;
export const FACIAL_HAIR = ['none', 'stubble', 'mustache', 'goatee', 'beard'] as const;
export const FACE_EXTRAS = ['none', 'glasses', 'monocle', 'eyepatch', 'freckles', 'scar'] as const;
export const HEADWEAR = ['none', 'headband', 'bandana', 'flowers', 'hood', 'wizard', 'helmet', 'crown'] as const;
export const OUTFITS = ['tunic', 'vest', 'apron', 'gi', 'robe', 'dress', 'armor', 'cloak'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type FacialHair = (typeof FACIAL_HAIR)[number];
export type FaceExtra = (typeof FACE_EXTRAS)[number];
export type Headwear = (typeof HEADWEAR)[number];
export type Outfit = (typeof OUTFITS)[number];

export type PlayerLook = {
  skin: string;
  eyes: string;
  hair: HairStyle;
  hairColor: string;
  facial: FacialHair;
  face: FaceExtra;
  headwear: Headwear;
  outfit: Outfit;
  outfitColor: string;
  pantsColor: string;
};

export const DEFAULT_LOOK: PlayerLook = {
  skin: SKIN_TONES[1],
  eyes: EYE_COLORS[0],
  hair: 'short',
  hairColor: HAIR_COLORS[1],
  facial: 'none',
  face: 'none',
  headwear: 'none',
  outfit: 'tunic',
  outfitColor: OUTFIT_COLORS[1],
  pantsColor: PANTS_COLORS[0],
};

/** Names for every choice, as the creator shows them. */
export const LOOK_NAMES: Record<string, string> = {
  short: 'Short',
  spiky: 'Spiky',
  messy: 'Messy',
  sidepart: 'Side part',
  long: 'Long',
  ponytail: 'Ponytail',
  braids: 'Braids',
  bun: 'Bun',
  curly: 'Curly',
  afro: 'Afro',
  mohawk: 'Mohawk',
  bald: 'Bald',
  none: 'None',
  stubble: 'Stubble',
  mustache: 'Mustache',
  goatee: 'Goatee',
  beard: 'Beard',
  glasses: 'Glasses',
  monocle: 'Monocle',
  eyepatch: 'Eyepatch',
  freckles: 'Freckles',
  scar: 'Scar',
  headband: 'Headband',
  bandana: 'Bandana',
  flowers: 'Flowers',
  hood: 'Hood',
  wizard: 'Wizard hat',
  helmet: 'Helmet',
  crown: 'Crown',
  tunic: 'Tunic',
  vest: 'Vest',
  apron: 'Apron',
  gi: 'Gi',
  robe: 'Robe',
  dress: 'Dress',
  armor: 'Armor',
  cloak: 'Cloak',
};

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  (list as readonly unknown[]).includes(v) ? (v as T) : fallback;

/** A random look, for "Surprise me". */
export function randomLook(random: () => number = Math.random): PlayerLook {
  const any = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  return {
    skin: any(SKIN_TONES),
    eyes: any(EYE_COLORS),
    hair: any(HAIR_STYLES),
    hairColor: any(HAIR_COLORS),
    facial: random() < 0.6 ? 'none' : any(FACIAL_HAIR),
    face: random() < 0.6 ? 'none' : any(FACE_EXTRAS),
    headwear: random() < 0.5 ? 'none' : any(HEADWEAR),
    outfit: any(OUTFITS),
    outfitColor: any(OUTFIT_COLORS),
    pantsColor: any(PANTS_COLORS),
  };
}

/** A saved look, with anything unknown put back to the default. Null when there's none. */
export function cleanLook(raw: unknown): PlayerLook | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  // The first creator had one "extra" slot; it now lives in its own category.
  const extra = r.extra;
  return {
    skin: pick(SKIN_TONES, r.skin, DEFAULT_LOOK.skin),
    eyes: pick(EYE_COLORS, r.eyes, DEFAULT_LOOK.eyes),
    hair: pick(HAIR_STYLES, r.hair, DEFAULT_LOOK.hair),
    hairColor: pick(HAIR_COLORS, r.hairColor, DEFAULT_LOOK.hairColor),
    facial: pick(FACIAL_HAIR, r.facial ?? extra, DEFAULT_LOOK.facial),
    face: pick(FACE_EXTRAS, r.face ?? extra, DEFAULT_LOOK.face),
    headwear: pick(HEADWEAR, r.headwear ?? extra, DEFAULT_LOOK.headwear),
    outfit: pick(OUTFITS, r.outfit, DEFAULT_LOOK.outfit),
    outfitColor: pick(OUTFIT_COLORS, r.outfitColor, DEFAULT_LOOK.outfitColor),
    pantsColor: pick(PANTS_COLORS, r.pantsColor, DEFAULT_LOOK.pantsColor),
  };
}
