import { Circle, Group, Oval, Path, Rect, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { Attack } from '@/world/combat';

// What each Path's attack looks like, drawn on the World's canvas in art
// pixels. The frame loop in world-view.tsx does the hitting; this only draws.
//
// `flash` is the last swing or burst: [strike x, strike y, radius, time left,
// your x, your y, facing, duration]. `bolts` are in flight: [x, y, dx, dy,
// travelled], per bolt.

/** Facing (down, up, left, right) as an angle, in radians. */
const FACING_ANGLE = [Math.PI / 2, -Math.PI / 2, Math.PI, 0];

/** How many bolts can be drawn in flight at once. */
const MAX_BOLTS = 6;

type FlashProps = { flash: SharedValue<number[]>; color: string; range: number };

/** 0 when a swing starts, 1 when it's done. */
function useProgress(flash: SharedValue<number[]>) {
  return useDerivedValue(() => {
    const f = flash.get();
    return f[3] > 0 && f[7] > 0 ? 1 - f[3] / f[7] : 1;
  });
}

function useShowing(flash: SharedValue<number[]>) {
  return useDerivedValue(() => (flash.get()[3] > 0 ? 1 : 0));
}

/** Warrior: a blade sweeping an arc in front of you, with a white trail. */
function Sword({ flash, color, range }: FlashProps) {
  const p = useProgress(flash);
  const shown = useShowing(flash);
  const reach = range + 2;
  const arc = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: -reach, y: -reach, width: reach * 2, height: reach * 2 }, -70, 140);
    return path;
  }, [reach]);
  const at = useDerivedValue(() => {
    const f = flash.get();
    return [{ translateX: f[4] }, { translateY: f[5] - 8 }, { rotate: FACING_ANGLE[f[6]] ?? 0 }];
  });
  const blade = useDerivedValue(() => [{ rotate: ((-70 + 140 * p.get()) * Math.PI) / 180 }]);
  const trail = useDerivedValue(() => 0.7 * (1 - p.get() * 0.6));
  return (
    <Group transform={at} opacity={shown}>
      <Path path={arc} style="stroke" strokeWidth={3} color={color} start={0} end={p} opacity={trail} />
      <Group transform={blade}>
        <Rect x={4} y={-1} width={reach - 4} height={2} color="#E8ECF4" />
        <Rect x={reach - 2} y={-1} width={2} height={2} color="#FFFFFF" />
        <Rect x={3} y={-3} width={2} height={6} color="#8A6A3A" />
      </Group>
    </Group>
  );
}

/** Monk: a quick impact star where the palm lands. */
function Palm({ flash, color }: FlashProps) {
  const p = useProgress(flash);
  const at = useDerivedValue(() => {
    const f = flash.get();
    return [{ translateX: f[0] }, { translateY: f[1] }, { scale: 0.6 + p.get() * 0.9 }];
  });
  const fade = useDerivedValue(() => (flash.get()[3] > 0 ? 1 - p.get() * 0.8 : 0));
  return (
    <Group transform={at} opacity={fade}>
      <Circle cx={0} cy={0} r={4} color={color} />
      <Circle cx={0} cy={0} r={2} color="#FFFFFF" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Group key={i} transform={[{ rotate: (i * Math.PI) / 3 }]}>
          <Rect x={6} y={-1} width={5} height={2} color={color} />
        </Group>
      ))}
    </Group>
  );
}

/** Cleric: a golden glow blooming outward, with rays. */
function Light({ flash, color, range }: FlashProps) {
  const p = useProgress(flash);
  const shown = useShowing(flash);
  const cx = useDerivedValue(() => flash.get()[0]);
  const cy = useDerivedValue(() => flash.get()[1]);
  const r = useDerivedValue(() => range * (0.3 + 0.7 * p.get()));
  const glow = useDerivedValue(() => 0.45 * (1 - p.get()));
  const ring = useDerivedValue(() => 1 - p.get());
  const rays = useDerivedValue(() => {
    const f = flash.get();
    return [{ translateX: f[0] }, { translateY: f[1] }, { rotate: p.get() * 0.6 }, { scale: 0.4 + p.get() }];
  });
  return (
    <Group opacity={shown}>
      <Circle cx={cx} cy={cy} r={r} color={color} opacity={glow} />
      <Circle cx={cx} cy={cy} r={r} color="#FFFFFF" style="stroke" strokeWidth={2} opacity={ring} />
      <Group transform={rays} opacity={ring}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Group key={i} transform={[{ rotate: (i * Math.PI) / 4 }]}>
            <Rect x={range * 0.45} y={-1} width={6} height={2} color={color} />
          </Group>
        ))}
      </Group>
    </Group>
  );
}

/** Bard: rings rippling out from the lute, and notes riding them. */
function Lute({ flash, color, range }: FlashProps) {
  const p = useProgress(flash);
  const shown = useShowing(flash);
  const cx = useDerivedValue(() => flash.get()[0]);
  const cy = useDerivedValue(() => flash.get()[1]);
  const outer = useDerivedValue(() => range * p.get());
  const inner = useDerivedValue(() => range * Math.max(0, p.get() - 0.3));
  const fade = useDerivedValue(() => 1 - p.get());
  const notes = useDerivedValue(() => {
    const f = flash.get();
    return [{ translateX: f[0] }, { translateY: f[1] }, { scale: 0.3 + p.get() * 0.8 }];
  });
  return (
    <Group opacity={shown}>
      <Circle cx={cx} cy={cy} r={outer} color={color} style="stroke" strokeWidth={2} opacity={fade} />
      <Circle cx={cx} cy={cy} r={inner} color={color} style="stroke" strokeWidth={1} opacity={fade} />
      <Group transform={notes} opacity={fade}>
        {[-2.4, -0.8, 1, 2.6].map((a) => (
          <Group key={a} transform={[{ translateX: Math.cos(a) * range }, { translateY: Math.sin(a) * range }]}>
            <Circle cx={0} cy={3} r={2} color={color} />
            <Rect x={1} y={-4} width={1} height={7} color={color} />
            <Rect x={1} y={-4} width={3} height={1} color={color} />
          </Group>
        ))}
      </Group>
    </Group>
  );
}

/** One bolt in flight, drawn as its Path's projectile. */
function Bolt({ index, bolts, attack }: { index: number; bolts: SharedValue<number[][]>; attack: Attack }) {
  const at = useDerivedValue(() => {
    const b = bolts.get()[index];
    if (!b) return [{ translateX: -99 }, { translateY: -99 }];
    const heading = Math.atan2(b[3], b[2]);
    // Coins and wrenches spin as they fly; fire and arrows point where they're going.
    const spin = attack.look === 'wrench' ? b[4] / 5 : heading;
    return [{ translateX: b[0] }, { translateY: b[1] }, { rotate: spin }];
  });
  const coin = useDerivedValue(() => {
    const b = bolts.get()[index];
    return b ? 1 + 5 * Math.abs(Math.sin(b[4] / 6)) : 0;
  });
  const coinX = useDerivedValue(() => -coin.get() / 2);
  const flicker = useDerivedValue(() => {
    const b = bolts.get()[index];
    return b ? 0.6 + 0.4 * Math.abs(Math.sin(b[4] / 3)) : 0;
  });
  if (attack.look === 'fire') {
    return (
      <Group transform={at}>
        <Circle cx={-9} cy={0} r={1.5} color={attack.color} opacity={0.35} />
        <Circle cx={-5} cy={0} r={2.5} color={attack.color} opacity={0.6} />
        <Circle cx={0} cy={0} r={4} color={attack.color} opacity={flicker} />
        <Circle cx={0.5} cy={0} r={2} color="#FFE9A0" />
      </Group>
    );
  }
  if (attack.look === 'coin') {
    return (
      <Group transform={at}>
        <Oval x={coinX} y={-3} width={coin} height={6} color="#A07A1A" />
        <Oval x={coinX} y={-2.5} width={coin} height={5} color={attack.color} />
      </Group>
    );
  }
  if (attack.look === 'wrench') {
    return (
      <Group transform={at}>
        <Rect x={-5} y={-1} width={9} height={2} color={attack.color} />
        <Rect x={3} y={-3} width={3} height={2} color={attack.color} />
        <Rect x={3} y={1} width={3} height={2} color={attack.color} />
        <Rect x={-5} y={-1} width={2} height={2} color="#8A8A94" />
      </Group>
    );
  }
  // arrow
  return (
    <Group transform={at}>
      <Rect x={-7} y={-0.5} width={11} height={1} color="#C8A870" />
      <Rect x={3} y={-1.5} width={3} height={3} color="#D8D8E0" />
      <Rect x={6} y={-0.5} width={1} height={1} color="#FFFFFF" />
      <Rect x={-8} y={-2} width={2} height={1} color={attack.color} />
      <Rect x={-8} y={1} width={2} height={1} color={attack.color} />
    </Group>
  );
}

/** The walking character's attack: a swing, a burst, or bolts in flight. */
export function AttackEffects({
  attack,
  flash,
  bolts,
}: {
  attack: Attack;
  flash: SharedValue<number[]>;
  bolts: SharedValue<number[][]>;
}) {
  const props = { flash, color: attack.color, range: attack.range };
  if (attack.kind === 'bolt') {
    return (
      <Group>
        {Array.from({ length: MAX_BOLTS }, (_, i) => (
          <Bolt key={i} index={i} bolts={bolts} attack={attack} />
        ))}
      </Group>
    );
  }
  if (attack.look === 'sword') return <Sword {...props} />;
  if (attack.look === 'palm') return <Palm {...props} />;
  if (attack.look === 'lute') return <Lute {...props} />;
  return <Light {...props} />;
}
