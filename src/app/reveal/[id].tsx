import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { COCOON_ART, COCOON_STAGES, REALM_ART, REALM_BACKGROUNDS, REALM_LIGHTS } from '@/art/realms';
import { CHARACTER_ART } from '@/art/sprites';
import { PixelSprite } from '@/components/pixel-sprite';
import { TypewriterText } from '@/components/typewriter-text';
import { CLASSES } from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { COMPANIONS, KIND_LABEL, REALMS, formatNumber, isCharacterId } from '@/story/companions';
import { fonts, spacing } from '@/theme';

// The hatch plays the same beats as the hatch videos (scripts/hatch-video.mjs),
// so what people see posted is what happens in the game. Times are seconds.
const IMPACT = 0.13; // the camera slams in on the cocoon
const WIGGLE_FIRST = 0.3;
const WIGGLE_EVERY = 2.1; // while waiting for the tap
const SHAKE = 1.0; // after the tap, the shake builds and cracks the silk
const EYE_OPEN = 0.75; // then silence: an eye opens, the camera punches in, it blinks
const BURST = 0.65; // then the camera snaps back and the shake turns violent
const HATCH_AT = SHAKE + EYE_OPEN + BURST;

type Phase = 'waking' | 'hatching' | 'revealed' | 'entry';

// The cutscene is its own stage, the same in every theme.
const INK = '#07060B';
const WHITE = '#FFFFFF';
const SILK = ['#EDE6D6', '#C9BFAE', '#FFF7DC', '#A69C8C'];

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const wiggle = (since: number) => (since >= 0 && since < 0.6 ? Math.sin(since * 26) * 4 * (1 - since / 0.6) : 0);

/** Where the sparkles sit around a 5★ reveal, as fractions of the sprite's size from its centre. */
const SPARKLES = [
  { x: -0.95, y: -0.55, size: 22, delay: 0 },
  { x: 0.9, y: -0.4, size: 16, delay: 250 },
  { x: -0.8, y: 0.35, size: 14, delay: 500 },
  { x: 1.0, y: 0.45, size: 20, delay: 150 },
  { x: 0, y: -0.8, size: 14, delay: 650 },
  { x: -1.2, y: -0.05, size: 12, delay: 400 },
  { x: 1.25, y: 0.05, size: 12, delay: 800 },
];

/** Silk shards thrown out by the hatch: a fixed spread, so every hatch looks the same. */
const SHARDS = Array.from({ length: 36 }, (_, i) => {
  const angle = -Math.PI / 2 + ((i * 137.5) % 360) * (Math.PI / 180) * 0.9;
  const speed = 0.6 + ((i * 53) % 40) / 100;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.35,
    size: 2 + (i % 3),
    color: SILK[i % SILK.length],
  };
});

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
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

/** One piece of silk, flung out by the hatch and pulled down by gravity. */
function Shard({ shard, burst, reach }: { shard: (typeof SHARDS)[number]; burst: SharedValue<number>; reach: number }) {
  const style = useAnimatedStyle(() => {
    const p = burst.value;
    return {
      opacity: p === 0 ? 0 : 1 - p * p,
      transform: [
        { translateX: shard.vx * reach * p },
        { translateY: shard.vy * reach * p + reach * 1.1 * p * p },
        { rotate: `${p * 360 * shard.vx}deg` },
      ],
    };
  });
  const side = shard.size * (reach / 70);
  return <Animated.View style={[styles.shard, { width: side, height: side, backgroundColor: shard.color }, style]} />;
}

/** A realm light that twinkles, in step with the videos. */
function Twinkle({
  x,
  y,
  color,
  index,
  clock,
  px,
}: {
  x: number;
  y: number;
  color: string;
  index: number;
  clock: SharedValue<number>;
  px: number;
}) {
  const style = useAnimatedStyle(() => ({ opacity: Math.sin(clock.value * 3 + index * 1.7) > 0.2 ? 1 : 0 }));
  return (
    <Animated.View
      style={[styles.twinkle, { left: x - px * 1.5, top: y - px * 1.5, width: px * 3, height: px * 3 }, style]}>
      <View style={{ position: 'absolute', left: px, top: 0, width: px, height: px * 3, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, top: px, width: px * 3, height: px, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: px, top: px, width: px, height: px, backgroundColor: '#FFFFFF' }} />
    </Animated.View>
  );
}

/**
 * A new character hatches. They rest in silk cocoons, so the scene opens in
 * their home realm: the camera slams in on a cocoon ("Someone is waking
 * up!"), which wiggles until the player taps. The tap sets off a shake that
 * cracks the silk; then silence, an eye opens and looks out, and the silk
 * bursts: a flash, shards and the character, with sparkles for a 5★. The next
 * tap opens their collection entry. `preview` (from the dev test button)
 * plays it without marking anyone as revealed.
 */
export default function RevealScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const markRevealed = useGameStore((s) => s.markRevealed);
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('waking');
  const [crack, setCrack] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  // The camera and the cocoon, driven every frame by the timeline below.
  const clock = useSharedValue(0);
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const camZ = useSharedValue(1);
  const flash = useSharedValue(0);
  const tilt = useSharedValue(0);
  const lift = useSharedValue(0);
  const glow = useSharedValue(0);
  const eye = useSharedValue(0);
  const burst = useSharedValue(0);
  const timeline = useRef({ phase: 'waking' as Phase, start: 0, zAtTap: 1.25, crack: 0, wiggles: 0, eyed: false });
  // The collection entry types out its lore; a tap shows it all, the next closes.
  const [bioDone, setBioDone] = useState(false);
  const [entryDone, setEntryDone] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const valid = isCharacterId(id);

  // The realm art covers the screen; everything else is placed in its pixels.
  const px = Math.max(W / REALM_ART.width, H / REALM_ART.height);
  const sceneLeft = (W - REALM_ART.width * px) / 2;
  const sceneTop = (H - REALM_ART.height * px) / 2;
  const at = (x: number, y: number) => [sceneLeft + x * px, sceneTop + y * px] as const;
  const standY = REALM_ART.ground + 2;
  const cocoonMid = at(135, standY - 50);
  const eyeAt = at(135 - COCOON_ART.width / 2 + COCOON_ART.eye.x, standY - 102 + COCOON_ART.eye.y);
  const revealFocus = at(135, standY - 70);
  const anchor = at(135, REALM_ART.height * 0.6);

  useEffect(() => {
    if (!valid) return;
    const tl = timeline.current;
    tl.start = performance.now();
    if (reduceMotion) return;
    let frame = 0;
    const setCrackStage = (stage: number) => {
      if (stage === tl.crack) return;
      tl.crack = stage;
      setCrack(stage);
      haptics.tap();
    };
    const tick = () => {
      const now = performance.now();
      const t = (now - tl.start) / 1000;
      clock.set(now / 1000);
      let z = 1;
      let focus: readonly [number, number] = cocoonMid;
      let shake = 0;
      let fl = 0;
      if (tl.phase === 'waking') {
        const hit = t - IMPACT;
        if (hit >= 0) {
          z = hit < 0.12 ? lerp(1, 2.05, ease(hit / 0.12)) : lerp(2.05, 1.7, ease((hit - 0.12) / 0.4));
          if (t > 0.65) z = lerp(1.7, 1.25, ease((t - 0.65) / 4.4));
          shake = hit < 0.7 ? 6 * (1 - hit / 0.7) : 0;
          fl = hit < 0.25 ? 0.9 * (1 - hit / 0.25) : 0;
        }
        const n = t < WIGGLE_FIRST ? -1 : Math.floor((t - WIGGLE_FIRST) / WIGGLE_EVERY);
        const since = n < 0 ? -1 : t - WIGGLE_FIRST - n * WIGGLE_EVERY;
        if (n >= 0 && n + 1 > tl.wiggles) {
          tl.wiggles = n + 1;
          haptics.tick();
          if (tl.wiggles === 3) setCrackStage(1);
        }
        if (since >= 0 && since < 0.25) z += 0.06 * (1 - since / 0.25);
        if (since >= 0 && since < 0.3) shake = Math.max(shake, 1.5);
        tilt.set(wiggle(since) * 0.6);
        lift.set(Math.round(Math.sin(t * 2.5)));
        tl.zAtTap = z;
      } else if (tl.phase === 'hatching') {
        const h = t;
        if (h < SHAKE) {
          z = lerp(tl.zAtTap, 1.4, clamp01(h / SHAKE));
          shake = 1 + h * 2.5;
          const k = h / SHAKE;
          tilt.set(Math.sin((5.6 + h) * (24 + k * 30)) * (1.5 + k * 4) * 0.6);
          setCrackStage(Math.min(3, Math.ceil(lerp(0.12, 0.55, k) * 4)));
          glow.set(k * 0.5);
        } else if (h < SHAKE + EYE_OPEN) {
          const et = h - SHAKE;
          focus = eyeAt;
          z = lerp(1.4, 3.4, ease(et / 0.14));
          tilt.set(0);
          if (et > 0.5 && et < 0.65) eye.set(Math.abs(et - 0.575) / 0.075);
          else eye.set(clamp01(et / 0.3));
          if (!tl.eyed) {
            tl.eyed = true;
            haptics.celebrate();
          }
        } else if (h < HATCH_AT) {
          const k = (h - SHAKE - EYE_OPEN) / BURST;
          z = lerp(2.2, 1.45, ease(k * 2.2));
          shake = 3 + k * 4;
          eye.set(1);
          tilt.set(Math.sin((5.6 + h) * 60) * (4 + k * 5) * 0.6);
          lift.set(Math.round(Math.abs(Math.sin(h * 34)) * k * 3));
          setCrackStage(4);
          glow.set(0.5 + k * 0.5);
        } else {
          hatch(now);
        }
      } else {
        const rt = t;
        focus = revealFocus;
        z = rt < 0.25 ? lerp(0.92, 1, ease(rt / 0.25)) : lerp(1, 1.1, clamp01((rt - 0.25) / 4.5));
        shake = rt < 0.8 ? 7 * (1 - rt / 0.8) : 0;
        fl = rt < 0.5 ? 1 - rt / 0.5 : 0;
      }
      // Zoom toward the focus point, which drifts toward the frame's centre as it zooms.
      const k = clamp01((z - 1) / 1.2);
      const ax = lerp(focus[0], anchor[0], k);
      const ay = lerp(focus[1], anchor[1], k);
      const sx = shake > 0 ? (Math.random() - 0.5) * 2 * shake * px : 0;
      const sy = shake > 0 ? (Math.random() - 0.5) * 2 * shake * px : 0;
      camZ.set(z);
      camX.set(ax - focus[0] * z + sx);
      camY.set(ay - focus[1] * z + sy);
      if (tl.phase !== 'hatching') flash.set(fl);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hint = setTimeout(() => setHintShown(true), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hint);
    };
    // The timeline reads the layout once; a rotation mid-hatch doesn't matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, reduceMotion]);

  function hatch(now: number) {
    const tl = timeline.current;
    tl.phase = 'revealed';
    tl.start = now;
    tilt.set(0);
    lift.set(0);
    glow.set(0);
    eye.set(0);
    haptics.celebrate();
    if (!reduceMotion) burst.set(withTiming(1, { duration: 1300, easing: Easing.linear }));
    setPhase('revealed');
  }

  const sceneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: camX.value }, { translateY: camY.value }, { scale: camZ.value }],
  }));
  const cocoonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * px }, { rotate: `${tilt.value}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.45,
    transform: [{ scale: 1 + glow.value * 0.3 }],
  }));
  const eyeStyle = useAnimatedStyle(() => ({ opacity: eye.value > 0 ? 1 : 0 }));
  const lidStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.max(0.12, eye.value) }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  if (!valid) return null;
  const companion = COMPANIONS[id];
  const info = CLASSES[companion.dimension];
  const art = CHARACTER_ART[id];

  const cocoonW = COCOON_ART.width * px;
  const cocoonH = COCOON_ART.height * px;
  const [cocoonLeft, cocoonTop] = at(135 - COCOON_ART.width / 2, standY - 102);
  const spriteScale = 3 * px;
  const spriteW = (art?.idle.width ?? 32) * spriteScale;
  const spriteH = (art?.idle.height ?? 48) * spriteScale;
  const [, groundY] = at(0, standY);
  const e = COCOON_ART.eye;

  const onTap = () => {
    const tl = timeline.current;
    if (phase === 'waking') {
      if (reduceMotion) {
        flash.set(1);
        flash.set(withTiming(0, { duration: 500 }));
        return hatch(performance.now());
      }
      tl.phase = 'hatching';
      tl.start = performance.now();
      setPhase('hatching');
    } else if (phase === 'revealed') {
      haptics.tap();
      setPhase('entry');
    } else if (phase === 'entry') {
      if (!entryDone) return setSkipped(true);
      if (!preview) markRevealed([id]);
      router.back();
    }
  };

  const hatched = phase === 'revealed' || phase === 'entry';
  const revealed = phase === 'revealed';
  return (
    <Pressable
      style={styles.stage}
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={
        revealed ? `${companion.name} joined your collection. Tap to continue.` : 'Someone is waking up. Tap to hatch.'
      }>
      <StatusBar style="light" />
      <Animated.View style={[styles.scene, { width: W, height: H }, sceneStyle]}>
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
        {!reduceMotion &&
          REALM_LIGHTS[companion.dimension].map(([x, y, color], i) => {
            const [lx, ly] = at(x, y);
            return <Twinkle key={i} x={lx} y={ly} color={color} index={i} clock={clock} px={px} />;
          })}

        {!hatched && (
          <View style={[styles.anchor, { left: cocoonLeft, top: cocoonTop, width: cocoonW, height: cocoonH }]}>
            <Animated.View
              style={[
                styles.glow,
                {
                  left: cocoonW * 0.1,
                  top: cocoonH * 0.02,
                  width: cocoonW * 0.8,
                  height: cocoonH * 0.92,
                  borderRadius: cocoonW,
                },
                glowStyle,
              ]}
            />
            <Animated.View style={[{ width: cocoonW, height: cocoonH, transformOrigin: 'bottom' }, cocoonStyle]}>
              <Image source={COCOON_STAGES[crack]} contentFit="fill" style={{ width: cocoonW, height: cocoonH }} />
              <Animated.View
                style={[
                  styles.eyeHole,
                  {
                    left: (e.x - e.w / 2 - 2) * px,
                    top: (e.y - e.h / 2 - 1.5) * px,
                    width: (e.w + 4) * px,
                    height: (e.h + 3) * px,
                    borderRadius: (e.h + 3) * px,
                  },
                  eyeStyle,
                ]}>
                <Animated.View
                  style={[styles.eyeball, { width: e.w * px, height: e.h * px, borderRadius: e.h * px }, lidStyle]}>
                  <View style={{ width: 7 * px, height: e.h * px, backgroundColor: info.color, alignItems: 'center' }}>
                    <View style={{ width: 3 * px, height: e.h * px, backgroundColor: INK }} />
                  </View>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </View>
        )}

        {hatched && (
          <View
            pointerEvents="none"
            style={[
              styles.anchor,
              { left: sceneLeft + 135 * px - spriteW / 2, top: groundY - spriteH, width: spriteW },
            ]}>
            {revealed &&
              companion.rarity === 5 &&
              SPARKLES.map((s, i) => (
                <View key={i} style={[styles.sparkleSlot, { top: spriteH / 2, left: spriteW / 2 }]}>
                  <Sparkle x={s.x * spriteW} y={s.y * spriteH} size={s.size} delay={s.delay} />
                </View>
              ))}
            {art && <PixelSprite sheet={art.idle} scale={spriteScale} animate={revealed} />}
          </View>
        )}

        {!reduceMotion && (
          <View pointerEvents="none" style={[styles.shardOrigin, { left: cocoonMid[0], top: cocoonMid[1] }]}>
            {SHARDS.map((shard, i) => (
              <Shard key={i} shard={shard} burst={burst} reach={W * 0.6} />
            ))}
          </View>
        )}
      </Animated.View>

      {!hatched && (
        <View style={[styles.top, { top: sceneTop + 70 * px }]} pointerEvents="none">
          <Text style={[styles.headline, { fontSize: 26 * px, lineHeight: 30 * px }]}>{'SOMEONE IS\nWAKING UP!'}</Text>
          {phase === 'waking' && hintShown && (
            <Animated.Text entering={FadeIn.duration(800)} style={styles.hint}>
              Tap to hatch
            </Animated.Text>
          )}
        </View>
      )}

      {revealed && (
        <>
          <Animated.View entering={FadeIn.duration(400)} style={[styles.top, { top: sceneTop + 60 * px }]}>
            <Text
              style={[styles.name, { color: info.color, fontSize: 44 * px }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {companion.name.toUpperCase()}
            </Text>
            <Text style={[styles.stars, { fontSize: 15 * px }]}>{'★'.repeat(companion.rarity)}</Text>
            <Text style={styles.detail}>
              {info.className} · {REALMS[companion.dimension]}
            </Text>
            <Text style={[styles.number, { color: '#D8D2E6' }]}>{formatNumber(companion.number)}</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(600).duration(400)} style={[styles.band, { top: groundY + 14 * px }]}>
            <TypewriterText text={`${companion.name} joined your collection!`} style={styles.title} />
            <Text style={styles.hint}>Tap to continue</Text>
          </Animated.View>
        </>
      )}

      {phase === 'entry' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.entryStage}>
          <View style={styles.entry}>
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
          </View>
        </Animated.View>
      )}

      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
    </Pressable>
  );
}

const shadow = { textShadowColor: INK, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 };

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: INK, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, top: 0, transformOrigin: 'left top' },
  anchor: { position: 'absolute', alignItems: 'center' },
  glow: { position: 'absolute', backgroundColor: '#FFE9A0' },
  eyeHole: { position: 'absolute', backgroundColor: '#0A0810', alignItems: 'center', justifyContent: 'center' },
  eyeball: { backgroundColor: '#F4F0E6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  twinkle: { position: 'absolute' },
  shardOrigin: { position: 'absolute', width: 0, height: 0 },
  shard: { position: 'absolute' },
  sparkleSlot: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', color: '#FDE68A' },
  top: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', gap: spacing.xs },
  headline: { color: WHITE, fontFamily: fonts.bold, letterSpacing: 1, textAlign: 'center', ...shadow },
  name: { fontFamily: fonts.bold, letterSpacing: 2, ...shadow },
  stars: { color: WHITE, letterSpacing: 4, ...shadow },
  band: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: 'rgba(7, 6, 11, 0.78)',
  },
  number: { fontFamily: fonts.bold, fontSize: 20, fontVariant: ['tabular-nums'], ...shadow },
  title: { color: WHITE, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  detail: { color: WHITE, fontFamily: fonts.regular, fontSize: 14, ...shadow },
  hint: { color: '#D8D2E6', fontFamily: fonts.regular, fontSize: 13, marginTop: spacing.sm, ...shadow },
  entryStage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 6, 11, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
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
  flash: { ...StyleSheet.absoluteFill, backgroundColor: WHITE },
});
