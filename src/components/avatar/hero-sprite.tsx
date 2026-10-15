import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import type { Mood, PlayerLook } from '@/game';

import { drawHero, H, W } from './draw';

/** Calm moods breathe slowly; the lively ones bounce faster. */
const FPS: Partial<Record<Mood, number>> = {
  sleepy: 1,
  calm: 1.2,
  waking: 1,
  winding: 1.5,
  champion: 4,
  cheerful: 3,
  busy: 3,
  victory: 4,
  anxious: 1.5,
  confident: 1.5,
  overdrive: 9,
  cool: 1,
};

type Props = {
  look: PlayerLook;
  mood: Mood;
  /** Points per art pixel. */
  scale?: number;
  animate?: boolean;
  /** "head" frames just the head and shoulders, for the creator's option tiles. */
  crop?: 'full' | 'head';
};

/** The part of the 32×48 grid each crop shows: x, y, width, height. */
const CROPS = { full: [0, 0, W, H], head: [7, 8, 18, 20] } as const;

/** The player's own hero, drawn live from their look and stepping between two frames of their mood. */
export function HeroSprite({ look, mood, scale = 3, animate = true, crop = 'full' }: Props) {
  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(0);
  const animated = animate && !reduceMotion;
  const frame = animated ? tick % 2 : 0;
  const fps = FPS[mood] ?? 2;

  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [animated, fps]);

  const runs = useMemo(() => drawHero(look, mood, frame as 0 | 1), [look, mood, frame]);
  const [x, y, w, h] = CROPS[crop];

  return (
    <View style={{ width: w * scale, height: h * scale, overflow: 'hidden' }} accessible={false}>
      <Svg width={w * scale} height={h * scale} viewBox={`${x} ${y} ${w} ${h}`}>
        {runs.map((r) => (
          <Rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
        ))}
      </Svg>
    </View>
  );
}
