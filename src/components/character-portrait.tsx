import { SymbolView } from 'expo-symbols';

import { CHARACTER_ART } from '@/art/sprites';
import { PixelSprite } from '@/components/pixel-sprite';
import { CLASSES } from '@/game';
import type { Companion } from '@/story/companions';
import { colors } from '@/theme';

type Props = {
  companion: Companion;
  locked?: boolean;
  /** Points per art pixel for sprites; symbols scale to match. */
  scale?: number;
  /** Idle bob on or off; the collection grid keeps its 100+ sprites still. */
  animate?: boolean;
};

/**
 * A character's sprite, or their class symbol until they have art. Locked
 * characters show as a dark silhouette, or a padlock when there's no art.
 */
export function CharacterPortrait({ companion, locked = false, scale = 1, animate = true }: Props) {
  const art = CHARACTER_ART[companion.id];
  const info = CLASSES[companion.dimension];
  if (art) {
    return <PixelSprite sheet={art.idle} scale={scale} animate={animate} tint={locked ? colors.border : undefined} />;
  }
  return (
    <SymbolView
      name={locked ? 'lock.fill' : info.symbol}
      tintColor={locked ? colors.textFaint : info.color}
      size={22 * scale}
    />
  );
}
