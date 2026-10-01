import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COCOON_ART, COCOON_STAGES } from '@/art/realms';
import { CHARACTER_ART } from '@/art/sprites';
import { playSound } from '@/audio';
import { Button } from '@/components/button';
import { PixelSprite } from '@/components/pixel-sprite';
import { haptics } from '@/haptics';
import { useTradeNotices } from '@/social/notices';
import { describeSide } from '@/social/trade';
import { useClassInfo } from '@/store/hooks';
import { COMPANIONS, type CharacterId } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';

// Timings in ms: the departures walk off one by one, then the cocoons drop in.
const START = 500;
const LEAVE_EVERY = 350;
const LEAVE_FOR = 700;
const ARRIVE_EVERY = 300;
const ARRIVE_FOR = 500;
const COCOON_PX = 1.5;

/** One departing hero: stands a beat, then walks off to the left and fades. */
function Leaving({ id, delay, still }: { id: CharacterId; delay: number; still: boolean }) {
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    t.set(withDelay(delay, withTiming(1, { duration: LEAVE_FOR, easing: Easing.in(Easing.quad) })));
    const tick = setTimeout(() => haptics.tap(), delay);
    return () => clearTimeout(tick);
  }, [t, delay, still]);
  const style = useAnimatedStyle(() => ({
    opacity: still ? 0.35 : 1 - t.get(),
    transform: [{ translateX: still ? 0 : -80 * t.get() }],
  }));
  const art = CHARACTER_ART[id];
  return (
    <Animated.View style={[styles.slot, style]} accessibilityLabel={`${COMPANIONS[id].name} leaves`}>
      {art && <PixelSprite sheet={art.idle} scale={2} />}
    </Animated.View>
  );
}

/** One arriving copy: a cocoon that drops in and lands. It hatches after this screen. */
function Arriving({ id, delay, still }: { id: CharacterId; delay: number; still: boolean }) {
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    t.set(withDelay(delay, withTiming(1, { duration: ARRIVE_FOR, easing: Easing.out(Easing.back(2)) })));
  }, [t, delay, still]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.get() * 2),
    transform: [{ translateY: -60 * (1 - t.get()) }],
  }));
  return (
    <Animated.View style={[styles.slot, style]} accessibilityLabel={`A cocoon for ${COMPANIONS[id].name} arrives`}>
      <Image
        source={COCOON_STAGES[0]}
        contentFit="fill"
        style={{ width: COCOON_ART.width * COCOON_PX, height: COCOON_ART.height * COCOON_PX }}
      />
      <Text style={styles.slotName} numberOfLines={1}>
        {COMPANIONS[id].name}
      </Text>
    </Animated.View>
  );
}

/**
 * The moment a trade completes: the heroes you gave walk off, and cocoons for
 * the ones you got drop in. Plays once per trade on each side (see
 * social/notices); the arrivals hatch right after, through the usual reveal.
 */
export default function TradeMoment() {
  const moment = useTradeNotices((s) => s.moments[0]);
  const finish = useTradeNotices((s) => s.finishMoment);
  const color = useClassInfo()?.color ?? colors.accent;
  const still = useReducedMotion();

  const arriveAt = START + (moment?.left.length ?? 0) * LEAVE_EVERY + LEAVE_FOR;

  useEffect(() => {
    if (!moment) {
      router.back();
      return;
    }
    const land = setTimeout(
      () => {
        haptics.success();
        if (moment.arrived.length) playSound('quest');
      },
      still ? 0 : arriveAt + ARRIVE_FOR,
    );
    return () => clearTimeout(land);
  }, [moment, arriveAt, still]);

  if (!moment) return <View style={styles.screen} />;

  const done = () => {
    finish();
    router.back();
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.content}>
        <Text style={styles.kicker}>TRADE COMPLETE</Text>
        <Text style={styles.title}>With {moment.partner}</Text>

        {moment.left.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.label}>SETTING OFF</Text>
            <View style={styles.row}>
              {moment.left.map((id, i) => (
                <Leaving key={`${id}-${i}`} id={id} delay={START + i * LEAVE_EVERY} still={still} />
              ))}
            </View>
            <Text style={styles.body}>
              {`${describeSide(moment.left)} ${moment.left.length > 1 ? 'head' : 'heads'} off to ${moment.partner}'s world.`}
            </Text>
          </View>
        )}

        {moment.arrived.length > 0 && (
          <View style={[styles.block, { borderColor: color }]}>
            <Text style={styles.label}>ARRIVING</Text>
            <View style={styles.row}>
              {moment.arrived.map((id, i) => (
                <Arriving key={`${id}-${i}`} id={id} delay={arriveAt + i * ARRIVE_EVERY} still={still} />
              ))}
            </View>
            <Text style={styles.body}>
              {moment.arrived.length > 1 ? 'Cocoons arrive' : 'A cocoon arrives'} from {moment.partner}.
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />
        <Button title={moment.arrived.length ? 'Hatch' : 'Done'} onPress={done} color={color} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  kicker: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 15, letterSpacing: 2, marginTop: spacing.xl },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 32 },
  block: { ...windowStyle, padding: spacing.lg, gap: spacing.md },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, minHeight: 90, alignItems: 'flex-end' },
  slot: { alignItems: 'center', gap: spacing.xs },
  slotName: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, maxWidth: 70 },
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
});
