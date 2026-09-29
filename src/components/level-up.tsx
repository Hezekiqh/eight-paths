import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { REALM_ART, REALM_BACKGROUNDS } from '@/art/realms';
import { CHARACTER_ART } from '@/art/sprites';
import { PixelSprite } from '@/components/pixel-sprite';
import { CLASSES } from '@/game';
import { haptics } from '@/haptics';
import { COMPANIONS, REALMS, type CharacterId } from '@/story/companions';
import { fonts, spacing } from '@/theme';

type Props = { characterId: CharacterId; level: number; onDone: () => void };

/**
 * A character's own celebration art, when they have one (a lore piece: a
 * victory pose in their world). Characters without one celebrate in their
 * home realm instead. Add entries as the art is made.
 */
const CELEBRATION_ART: Partial<Record<CharacterId, number>> = {};

const INK = '#07060B';
const RAYS = 12;
/** Confetti pieces: a fixed spread so every celebration looks the same. */
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 37) % 100) / 100,
  delay: (i * 97) % 900,
  size: 5 + (i % 3) * 2,
  spin: i % 2 ? 1 : -1,
  gold: i % 3 === 0,
}));

function Confetto({
  piece,
  color,
  width,
  height,
}: {
  piece: (typeof CONFETTI)[number];
  color: string;
  width: number;
  height: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(piece.delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1)));
  }, [piece.delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.05 ? t.value * 20 : 1 - t.value * 0.4,
    transform: [
      { translateX: piece.x * width + Math.sin(t.value * 6 + piece.x * 10) * 14 },
      { translateY: -20 + t.value * height * 0.75 },
      { rotate: `${t.value * 540 * piece.spin}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.confetto,
        { width: piece.size, height: piece.size * 0.6, backgroundColor: piece.gold ? '#FFC940' : color },
        style,
      ]}
    />
  );
}

/** A fan of light turning slowly behind the character, in their Path's colour. */
function Rays({ color, size, spin }: { color: string; size: number; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {Array.from({ length: RAYS }, (_, i) => (
        <View
          key={i}
          style={[
            styles.ray,
            {
              width: size * 0.11,
              height: size,
              backgroundColor: color,
              transform: [{ rotate: `${(i * 180) / RAYS}deg` }],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

/**
 * The level-up moment: the character's home realm fills the screen, they
 * leap into the middle with light bursting behind them and confetti falling,
 * and big text says they levelled up. A tap (or a few seconds) closes it.
 */
export function LevelUp({ characterId, level, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const companion = COMPANIONS[characterId];
  const info = CLASSES[companion.dimension];
  const art = CHARACTER_ART[characterId];
  const custom = CELEBRATION_ART[characterId];

  // The realm covers the screen, like the hatch; the character stands on its ground.
  const px = Math.max(W / REALM_ART.width, H / REALM_ART.height);
  const sceneLeft = (W - REALM_ART.width * px) / 2;
  const sceneTop = (H - REALM_ART.height * px) / 2;
  const groundY = sceneTop + (REALM_ART.ground + 2) * px;
  const scale = Math.max(4, Math.floor((W * 0.4) / (art?.idle.width ?? 32)));
  const spriteW = (art?.idle.width ?? 32) * scale;
  const spriteH = (art?.idle.height ?? 48) * scale;
  const raySize = spriteH * 2.2;

  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const jump = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    haptics.celebrate();
    if (!reduceMotion) {
      pop.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.back(2.2)) }));
      burst.set(withSequence(withTiming(1.25, { duration: 320 }), withTiming(1, { duration: 400 })));
      // A leap for joy, then small happy hops.
      jump.set(
        withSequence(
          withDelay(150, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })),
          withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
          withDelay(
            500,
            withRepeat(withSequence(withTiming(0.3, { duration: 220 }), withTiming(0, { duration: 220 })), -1),
          ),
        ),
      );
      spin.set(withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1));
    }
    const id = setTimeout(onDone, 4500);
    return () => clearTimeout(id);
  }, [burst, jump, onDone, pop, reduceMotion, spin]);

  const spriteStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -jump.value * spriteH * 0.35 }, { scale: pop.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * Math.min(1, burst.value),
    transform: [{ scale: burst.value }],
  }));

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDone} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={styles.stage}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={`${companion.name} levelled up to level ${level}. Tap to continue.`}>
          {custom ? (
            <Image source={custom} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
          ) : (
            <>
              <Image
                source={REALM_BACKGROUNDS[companion.dimension]}
                contentFit="fill"
                style={{
                  position: 'absolute',
                  left: sceneLeft,
                  top: sceneTop,
                  width: REALM_ART.width * px,
                  height: REALM_ART.height * px,
                }}
                accessible={false}
              />
              <Animated.View
                style={[
                  styles.center,
                  { left: W / 2 - raySize / 2, top: groundY - spriteH * 0.55 - raySize / 2 },
                  burstStyle,
                ]}>
                <Rays color={info.color} size={raySize} spin={spin} />
              </Animated.View>
              {!reduceMotion && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {CONFETTI.map((p, i) => (
                    <Confetto key={i} piece={p} color={info.color} width={W} height={H} />
                  ))}
                </View>
              )}
              <Animated.View
                style={[styles.center, { left: W / 2 - spriteW / 2, top: groundY - spriteH }, spriteStyle]}>
                {art && <PixelSprite sheet={art.idle} scale={scale} />}
              </Animated.View>
            </>
          )}

          <View style={[styles.captions, { top: Math.max(70, sceneTop + 50 * px) }]}>
            <Animated.Text entering={FadeIn.delay(200).duration(300)} style={[styles.title, { color: info.color }]}>
              {companion.name.toUpperCase()}
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(350).duration(300)} style={styles.leveled}>
              LEVELED UP!
            </Animated.Text>
          </View>
          <Animated.View entering={FadeIn.delay(500).duration(300)} style={[styles.band, { top: groundY + 16 }]}>
            <Text style={styles.levels}>
              Lv {level - 1} → <Text style={{ color: info.color }}>Lv {level}</Text>
            </Text>
            <Text style={styles.detail}>
              {info.className} · {REALMS[companion.dimension]}
            </Text>
            <Text style={styles.hint}>Tap to continue</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const shadow = { textShadowColor: INK, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 };

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: INK, overflow: 'hidden' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', opacity: 0.35, borderRadius: 999 },
  confetto: { position: 'absolute', top: 0, left: 0 },
  captions: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 56, letterSpacing: 2, textAlign: 'center', ...shadow },
  leveled: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 40, letterSpacing: 2, ...shadow },
  band: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: 4,
    padding: spacing.md,
    backgroundColor: 'rgba(7, 6, 11, 0.8)',
  },
  levels: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 30 },
  detail: { color: '#D8D2E6', fontFamily: fonts.regular, fontSize: 14 },
  hint: { color: '#B9B3C9', fontFamily: fonts.regular, fontSize: 13, marginTop: spacing.xs },
});
