import type { Dimension } from '@/game';

// Drawn by scripts/realm-art.mjs; run it again after changing the art.
export { COCOON_ART, DESCENT_ART, REALM_ART, REALM_LIGHTS } from './realm-scene';

export const REALM_BACKGROUNDS: Record<Dimension, number> = {
  physical: require('@/assets/realms/physical.png'),
  financial: require('@/assets/realms/financial.png'),
  intellectual: require('@/assets/realms/intellectual.png'),
  spiritual: require('@/assets/realms/spiritual.png'),
  emotional: require('@/assets/realms/emotional.png'),
  social: require('@/assets/realms/social.png'),
  occupational: require('@/assets/realms/occupational.png'),
  environmental: require('@/assets/realms/environmental.png'),
};

/** The silk cocoon from whole (0) to about to burst (4). */
export const COCOON_STAGES = [
  require('@/assets/cocoon/crack-0.png'),
  require('@/assets/cocoon/crack-1.png'),
  require('@/assets/cocoon/crack-2.png'),
  require('@/assets/cocoon/crack-3.png'),
  require('@/assets/cocoon/crack-4.png'),
];

/** The intro's panels ("Long ago…"), drawn by the same script. */
export const INTRO_SCENES = {
  war: require('@/assets/intro/war.png'),
  council: require('@/assets/intro/council.png'),
  councilSmile: require('@/assets/intro/councilSmile.png'),
  sleepers: require('@/assets/intro/sleepers.png'),
  forgotten: require('@/assets/intro/forgotten.png'),
  descent: require('@/assets/intro/descent.png'),
};
