import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CHARACTER_ART } from '@/art/sprites';
import { PixelSprite } from '@/components/pixel-sprite';
import { TypewriterText } from '@/components/typewriter-text';
import { CLASSES } from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { COMPANIONS, KIND_LABEL, REALMS, formatNumber, isCharacterId } from '@/story/companions';
import { fonts, spacing } from '@/theme';

/** Each pulse (swell, then shrink back) gets shorter, then holds at the fastest until the player taps. */
const PULSE_MS = [1600, 1300, 1050, 850, 680, 540, 430, 340, 270, 220];
const INTRO_MS = 1400;
const FLASH_MS = 700;

type Phase = 'intro' | 'pulsing' | 'flash' | 'revealed' | 'entry';

// The cutscene is its own dark stage, the same in every theme.
const INK = '#07060B';
const WHITE = '#FFFFFF';

/** Where the sparkles sit around a 5★ reveal, as offsets from the sprite's centre. */
const SPARKLES = [
  { x: -95, y: -80, size: 22, delay: 0 },
  { x: 90, y: -60, size: 16, delay: 250 },
  { x: -80, y: 50, size: 14, delay: 500 },
  { x: 100, y: 70, size: 20, delay: 150 },
  { x: 0, y: -120, size: 14, delay: 650 },
  { x: -120, y: -10, size: 12, delay: 400 },
  { x: 125, y: 5, size: 12, delay: 800 },
];

function Sparkle({ x, y, size, delay }: (typeof SPARKLES)[number]) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + t.value * 0.75,
    transform: [{ translateX: x }, { translateY: y }, { scale: 0.6 + t.value * 0.6 }, { rotate: `${t.value * 45}deg` }],
  }));
  return <Animated.Text style={[styles.sparkle, { fontSize: size }, style]}>✦</Animated.Text>;
}

/**
 * A new character's arrival. "Something stirs…", then a plain white
 * silhouette that swells and shrinks, slowly at first and then faster, and
 * keeps pulsing until the player taps. The tap is a white flash and the
 * character in full colour, with sparkles for a 5★. `preview` (from the dev
 * test button) plays it without marking anyone as revealed.
 */
export default function RevealScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const markRevealed = useGameStore((s) => s.markRevealed);
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('intro');
  const scale = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // The collection entry types out its lore; a tap shows it all, the next closes.
  const [bioDone, setBioDone] = useState(false);
  const [entryDone, setEntryDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    const pulse = (i: number) => {
      const ms = PULSE_MS[Math.min(i, PULSE_MS.length - 1)];
      const half = { duration: ms / 2, easing: Easing.inOut(Easing.sin) };
      scale.set(withSequence(withTiming(1.18, half), withTiming(1, half)));
      haptics.tick();
      later(() => pulse(i + 1), ms);
    };
    later(() => {
      setPhase('pulsing');
      if (!reduceMotion) pulse(0);
    }, INTRO_MS);
    return () => timers.current.forEach(clearTimeout);
  }, [reduceMotion, scale]);

  if (!isCharacterId(id)) return null;
  const companion = COMPANIONS[id];
  const info = CLASSES[companion.dimension];
  const art = CHARACTER_ART[id];

  const onTap = () => {
    if (phase === 'pulsing') {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      scale.set(withTiming(1, { duration: 150 }));
      setPhase('flash');
      haptics.celebrate();
      timers.current.push(setTimeout(() => setPhase('revealed'), FLASH_MS));
    } else if (phase === 'revealed') {
      haptics.tap();
      setPhase('entry');
    } else if (phase === 'entry') {
      if (!entryDone) return setSkipped(true);
      if (!preview) markRevealed([id]);
      router.back();
    }
  };

  const revealed = phase === 'revealed';
  return (
    <Pressable
      style={styles.stage}
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={
        revealed ? `${companion.name} joined your collection. Tap to continue.` : 'Someone is waking. Tap to reveal.'
      }>
      <StatusBar style="light" />
      {phase === 'intro' && (
        <Animated.Text entering={FadeIn.duration(600)} style={styles.intro}>
          Something stirs…
        </Animated.Text>
      )}

      {phase === 'entry' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.entry}>
          <View style={[styles.entryHeader, { borderColor: info.color }]}>
            <Text style={styles.entryLabel}>COLLECTION ENTRY</Text>
            <Text style={[styles.entryNumber, { color: info.color }]}>{formatNumber(companion.number)}</Text>
          </View>
          <View style={styles.entryTop}>
            <View style={[styles.entrySprite, { borderColor: info.color }]}>
              {art && <PixelSprite sheet={art.idle} scale={3} />}
            </View>
            <View style={styles.entryStats}>
              <Text style={styles.entryName}>{companion.name}</Text>
              {companion.fullName && <Text style={styles.entryFullName}>{companion.fullName}</Text>}
              {[
                ['TYPE', KIND_LABEL[companion.kind]],
                ['CLASS', `${info.className} · ${info.dimensionLabel}`],
                ['REALM', REALMS[companion.dimension]],
                ['ALIGN', companion.alignment],
                ['RARITY', '★'.repeat(companion.rarity)],
              ].map(([label, value]) => (
                <View key={label} style={styles.entryRow}>
                  <Text style={styles.entryRowLabel}>{label}</Text>
                  <Text style={styles.entryRowValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.entryLore, { borderColor: info.color }]}>
            <TypewriterText
              text={companion.bio}
              style={styles.entryBio}
              instant={skipped}
              onDone={() => setBioDone(true)}
            />
            <TypewriterText
              text={`“${companion.quote}”`}
              style={styles.entryQuote}
              start={bioDone}
              instant={skipped}
              onDone={() => setEntryDone(true)}
            />
          </View>
          <Text style={styles.hint}>{entryDone ? 'Tap to close' : 'Tap to show all'}</Text>
        </Animated.View>
      )}

      {phase !== 'intro' && phase !== 'entry' && (
        <View style={styles.center}>
          <View style={styles.starsSlot}>
            {revealed && (
              <Animated.Text entering={FadeIn.duration(500)} style={styles.stars}>
                {'★'.repeat(companion.rarity)}
              </Animated.Text>
            )}
          </View>
          <View style={styles.spriteBox}>
            {revealed && companion.rarity === 5 && SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}
            <Animated.View style={pulseStyle}>
              {art && <PixelSprite sheet={art.idle} scale={4} tint={revealed ? undefined : WHITE} animate={revealed} />}
            </Animated.View>
          </View>
          <View style={styles.captionSlot}>
            {phase === 'pulsing' && (
              <Animated.Text entering={FadeIn.delay(1500).duration(800)} style={styles.hint}>
                Tap to wake them
              </Animated.Text>
            )}
            {revealed && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.caption}>
                <Text style={[styles.number, { color: info.color }]}>{formatNumber(companion.number)}</Text>
                <TypewriterText text={`${companion.name} joined your collection!`} style={styles.title} />
                <Text style={styles.detail}>
                  {info.className} · {REALMS[companion.dimension]}
                </Text>
                <Text style={styles.hint}>Tap to continue</Text>
              </Animated.View>
            )}
          </View>
        </View>
      )}

      {phase === 'flash' && <Animated.View entering={FadeIn.duration(120)} style={styles.flash} pointerEvents="none" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  intro: { color: WHITE, fontFamily: fonts.dialogue, fontSize: 16, letterSpacing: 1 },
  center: { alignItems: 'center', gap: spacing.lg },
  starsSlot: { height: 40, justifyContent: 'center' },
  stars: { color: WHITE, fontSize: 30, letterSpacing: 4 },
  spriteBox: { height: 48 * 4 + 40, width: 280, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', color: '#FDE68A' },
  captionSlot: { minHeight: 150, alignItems: 'center' },
  caption: { alignItems: 'center', gap: spacing.sm },
  number: { fontFamily: fonts.bold, fontSize: 22, fontVariant: ['tabular-nums'] },
  title: { color: WHITE, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  detail: { color: '#B9B3C9', fontFamily: fonts.regular, fontSize: 14 },
  hint: { color: '#8C86A0', fontFamily: fonts.regular, fontSize: 13, marginTop: spacing.md },
  entry: { width: '100%', maxWidth: 440, gap: spacing.md },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    paddingBottom: spacing.sm,
  },
  entryLabel: { color: '#B9B3C9', fontFamily: fonts.bold, fontSize: 16, letterSpacing: 2 },
  entryNumber: { fontFamily: fonts.bold, fontSize: 26, fontVariant: ['tabular-nums'] },
  entryTop: { flexDirection: 'row', gap: spacing.lg },
  entrySprite: {
    width: 32 * 3 + 32,
    height: 48 * 3 + 24,
    borderWidth: 3,
    backgroundColor: '#15121F',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  entryStats: { flex: 1, gap: 3 },
  entryName: { color: WHITE, fontFamily: fonts.bold, fontSize: 30 },
  entryFullName: { color: '#B9B3C9', fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.xs },
  entryRow: { flexDirection: 'row', gap: spacing.sm },
  entryRowLabel: { width: 62, color: '#8C86A0', fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  entryRowValue: { flex: 1, color: WHITE, fontFamily: fonts.regular, fontSize: 13 },
  entryLore: { borderTopWidth: 2, paddingTop: spacing.md, gap: spacing.md },
  entryBio: { color: WHITE, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  entryQuote: { color: '#B9B3C9', fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  flash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: WHITE },
});
