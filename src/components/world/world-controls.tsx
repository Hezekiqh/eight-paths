import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/haptics';
import type { ControlScheme } from '@/world/store';
import { FRAME, colors, fonts } from '@/theme';

import type { WorldSim } from './world-view';

/** How far the thumb travels for a full push, in points. */
const REACH = 44;
const BASE = 128;
const KNOB = 56;
/** A touch-pad touch that moves less than this and lifts quickly is a tap. */
const TAP_SLOP = 10;
const TAP_MS = 250;

type Props = {
  scheme: ControlScheme;
  sim: WorldSim;
  /** Talk or examine: the A button, or a tap on the touch pad. */
  onAct: () => void;
  onPause: () => void;
  /** Fight: shown where there's something to fight, in the walking character's colour. `charges` says holding it charges a blow (Path Lv 10). */
  fight?: { color: string; label: string; charges?: boolean } | null;
};

/**
 * On-screen controls over the World. Joystick: a fixed stick at bottom left.
 * Touch pad: put a thumb down anywhere and drag; a quick tap acts. Both keep
 * the A and pause buttons.
 */
export function WorldControls({ scheme, sim, onAct, onPause, fight }: Props) {
  const insets = useSafeAreaInsets();
  const left = Math.max(insets.left, 20);
  const right = Math.max(insets.right, 20);
  const bottom = Math.max(insets.bottom, 16);

  // the knob's offset, and (touch pad) where the thumb went down
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const touching = useSharedValue(false);

  const steer = (dx: number, dy: number) => {
    'worklet';
    const d = Math.hypot(dx, dy);
    const k = d > REACH ? REACH / d : 1;
    knobX.set(dx * k);
    knobY.set(dy * k);
    sim.inputX.set((dx * k) / REACH);
    sim.inputY.set((dy * k) / REACH);
  };
  const release = () => {
    'worklet';
    touching.set(false);
    knobX.set(0);
    knobY.set(0);
    sim.inputX.set(0);
    sim.inputY.set(0);
  };

  const stick = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      touching.set(true);
      steer(e.x - BASE / 2, e.y - BASE / 2);
    })
    .onUpdate((e) => steer(e.x - BASE / 2, e.y - BASE / 2))
    .onFinalize(release);

  // Touch pad: a drag walks; a short, still touch is a tap that acts.
  const drag = Gesture.Pan()
    .minDistance(TAP_SLOP)
    .onBegin((e) => {
      originX.set(e.x);
      originY.set(e.y);
    })
    .onStart(() => touching.set(true))
    .onUpdate((e) => steer(e.x - originX.get(), e.y - originY.get()))
    .onFinalize(release);
  const tap = Gesture.Tap()
    .maxDuration(TAP_MS)
    .maxDistance(TAP_SLOP)
    .runOnJS(true)
    .onEnd((_e, success) => {
      if (success) onAct();
    });
  const pad = Gesture.Race(drag, tap);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.get() }, { translateY: knobY.get() }],
  }));
  const padRing = useAnimatedStyle(() => ({
    opacity: touching.get() ? 1 : 0,
    transform: [{ translateX: originX.get() - BASE / 2 }, { translateY: originY.get() - BASE / 2 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {scheme === 'touchpad' ? (
        <GestureDetector gesture={pad}>
          <View style={StyleSheet.absoluteFill} accessibilityLabel="Touch pad: drag anywhere to walk, tap to talk">
            <Animated.View style={[styles.base, styles.floating, padRing]} pointerEvents="none">
              <Animated.View style={[styles.knob, knobStyle]} />
            </Animated.View>
          </View>
        </GestureDetector>
      ) : (
        <GestureDetector gesture={stick}>
          <View style={[styles.base, { left, bottom }]} accessibilityLabel="Joystick: drag to walk">
            <Animated.View style={[styles.knob, knobStyle]} pointerEvents="none" />
          </View>
        </GestureDetector>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Talk or examine"
        onPress={() => {
          haptics.tap();
          onAct();
        }}
        style={({ pressed }) => [styles.a, { right: right + 8, bottom: bottom + 24 }, pressed && styles.pressed]}>
        <Text style={styles.aLabel}>A</Text>
      </Pressable>

      {fight && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fight.label}
          accessibilityHint={fight.charges ? 'Hold, then let go, for a charged blow' : undefined}
          onPressIn={() => {
            haptics.tap();
            sim.attackPressed.set(true);
            sim.attackHeld.set(true);
          }}
          onPressOut={() => sim.attackHeld.set(false)}
          style={({ pressed }) => [
            styles.b,
            { right: right + 88, bottom: bottom + 4, backgroundColor: fight.color },
            pressed && styles.pressed,
          ]}>
          <SymbolView name="bolt.fill" tintColor={colors.background} size={26} />
        </Pressable>
      )}

      {fight && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dodge roll"
          onPressIn={() => {
            haptics.tap();
            sim.dodgePressed.set(true);
          }}
          style={({ pressed }) => [
            styles.dodge,
            { right: right + 12, bottom: bottom + 108 },
            pressed && styles.pressed,
          ]}>
          <SymbolView name="wind" tintColor={colors.text} size={20} />
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pause"
        hitSlop={10}
        onPress={() => {
          haptics.select();
          onPause();
        }}
        style={({ pressed }) => [styles.pause, { right, top: Math.max(insets.top, 12) }, pressed && styles.pressed]}>
        <SymbolView name="pause.fill" tintColor={colors.text} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    width: BASE,
    height: BASE,
    borderRadius: BASE / 2,
    borderWidth: FRAME,
    borderColor: 'rgba(240, 230, 200, 0.35)',
    backgroundColor: 'rgba(20, 14, 28, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: { left: 0, top: 0 },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: FRAME,
    borderColor: colors.frame,
    backgroundColor: 'rgba(240, 230, 200, 0.75)',
  },
  a: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: FRAME,
    borderColor: colors.frame,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  b: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: FRAME,
    borderColor: colors.frame,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  dodge: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: FRAME,
    borderColor: colors.frame,
    backgroundColor: 'rgba(240, 230, 200, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  aLabel: { color: colors.background, fontFamily: fonts.bold, fontSize: 36, marginTop: -2 },
  pause: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderWidth: FRAME,
    borderColor: colors.frame,
    backgroundColor: 'rgba(20, 14, 28, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
});
