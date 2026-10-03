import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
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
import { CocoonEye } from '@/components/cocoon-eye';
import { PixelSprite } from '@/components/pixel-sprite';
import { REVEAL_MOVES, RevealMove } from '@/components/reveal-move';
import { TypewriterText } from '@/components/typewriter-text';
import { CLASSES } from '@/game';
import { haptics } from '@/haptics';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { useGameStore } from '@/store';
import {
  COMPANIONS,
  KIND_LABEL,
  RARITY_TIERS,
  REALMS,
  formatNumber,
  isCharacterId,
  rarityLabel,
  type Rarity,
} from '@/story/companions';
import { fonts, spacing } from '@/theme';
import { CONFETTI, Confetto, Rays } from '@/components/level-up';

// The hatch plays the same beats as the hatch videos (scripts/hatch-video.mjs),
// so what people see posted is what happens in the game. Times are seconds.
const IMPACT = 0.13; // the camera slams in on the cocoon
const WIGGLE_FIRST = 0.3;
const WIGGLE_EVERY = 2.1; // while waiting for the tap

/**
 * How grand each hatch is: a 1★ Common is barely an event, and a 5★ Legendary
 * is outrageous. Each star more adds a layer.
 */
type Flair = {
  headline: string;
  /** The opening camera slam. */
  impact: boolean;
  /** Seconds of the building shake after the tap, and how violent it gets. */
  shake: number;
  power: number;
  /** Silence while an eye opens in the silk (0 = no eye). */
  eye: number;
  /** Seconds of the final violent burst before the hatch (0 = straight to it). */
  burst: number;
  shards: boolean;
  glow: boolean;
  sparkles: boolean;
  /** Gold rays, confetti and a banner: the full Legendary treatment. */
  legendary: boolean;
};
const FLAIR: Record<Rarity, Flair> = {
  1: {
    headline: 'A cocoon.',
    impact: false,
    shake: 0.35,
    power: 0.3,
    eye: 0,
    burst: 0,
    shards: false,
    glow: false,
    sparkles: false,
    legendary: false,
  },
  2: {
    headline: 'Someone is waking up.',
    impact: false,
    shake: 0.6,
    power: 0.6,
    eye: 0,
    burst: 0,
    shards: true,
    glow: false,
    sparkles: false,
    legendary: false,
  },
  3: {
    headline: 'SOMEONE IS\nWAKING UP!',
    impact: true,
    shake: 1.0,
    power: 1,
    eye: 0,
    burst: 0.5,
    shards: true,
    glow: true,
    sparkles: false,
    legendary: false,
  },
  4: {
    headline: 'SOMEONE IS\nWAKING UP!',
    impact: true,
    shake: 1.0,
    power: 1,
    eye: 0.75,
    burst: 0.65,
    shards: true,
    glow: true,
    sparkles: true,
    legendary: false,
  },
  5: {
    headline: 'SOMETHING ANCIENT\nSTIRS…',
    impact: true,
    shake: 1.6,
    power: 1.6,
    eye: 1.1,
    burst: 1.0,
    shards: true,
    glow: true,
    sparkles: true,
    legendary: true,
  },
};

type Phase = 'waking' | 'hatching' | 'revealed' | 'entry';

// The cutscene is its own stage, the same in every theme.
/** Typing speed for the hatch's captions and entry: twice the normal dialogue speed. */
const CAPTION_MS = 14;

const INK = '#07060B';
const WHITE = '#FFFFFF';
const SILK = ['#EDE6D6', '#C9BFAE', '#FFF7DC', '#A69C8C'];

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const wiggle = (since: number) => (since >= 0 && since < 0.6 ? Math.sin(since * 26) * 4 * (1 - since / 0.6) : 0);

/** Where the sparkles sit around a Legendary or Epic reveal, as fractions of the sprite's size. */
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
 * bursts: a flash, shards and the character, with sparkles for a rare one (4★ or 5★). The next
 * tap opens their collection entry. `preview` (from the dev test button)
 * plays it without marking anyone as revealed.
 */
export default function RevealScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const finishDrop = useGameStore((s) => s.finishDrop);
  const redoDrop = useGameStore((s) => s.redoDrop);
  const premium = usePremium((s) => s.premium);
  // A Premium redo is offered once per drop, never on a preview or on a drop that is already a redo.
  const canRedo = useGameStore((s) => !preview && isCharacterId(id) && s.drops.includes(id) && !s.redrawn.includes(id));
  const flair = FLAIR[isCharacterId(id) ? COMPANIONS[id].rarity : 3];
  const SHAKE = flair.shake;
  const EYE_OPEN = flair.eye;
  const BURST = flair.burst;
  const HATCH_AT = SHAKE + EYE_OPEN + BURST;
  const legendSpin = useSharedValue(0);
  const copies = useGameStore((s) => (isCharacterId(id) ? (s.owned?.[id] ?? 0) : 0));
  const reduceMotion = useReducedMotion();
  // A hatch is always upright, even over the sideways World (a cocoon broken there); the World turns
  // the phone back when it's in front again.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);
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
  // The camera aims at the layout as it is now: a hatch opened over the sideways World turns upright
  // after it mounts, and aiming at the sideways layout pushed the cocoon off to one side.
  const layout = useRef({ cocoonMid, eyeAt, revealFocus, anchor, px });
  useEffect(() => {
    layout.current = { cocoonMid, eyeAt, revealFocus, anchor, px };
  });

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
      const { cocoonMid, eyeAt, revealFocus, anchor, px } = layout.current;
      let focus: readonly [number, number] = cocoonMid;
      let shake = 0;
      let fl = 0;
      if (tl.phase === 'waking') {
        const hit = t - IMPACT;
        if (!flair.impact) z = 1.2;
        else if (hit >= 0) {
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
          const k = h / SHAKE;
          shake = (1 + k * 2.5) * flair.power;
          tilt.set(Math.sin((5.6 + h) * (24 + k * 30)) * (1.5 + k * 4) * 0.6 * flair.power);
          setCrackStage(Math.min(flair.burst > 0 ? 3 : 4, Math.ceil(lerp(0.12, 0.55, k) * 4)));
          if (flair.glow) glow.set(k * 0.5);
        } else if (h < SHAKE + EYE_OPEN) {
          const et = h - SHAKE;
          focus = eyeAt;
          z = lerp(1.4, 3.4, ease(et / 0.14));
          tilt.set(0);
          if (et > 0.5 && et < 0.65) eye.set(Math.abs(et - 0.575) / 0.075);
          else eye.set(clamp01(et / 0.5));
          if (!tl.eyed) {
            tl.eyed = true;
            haptics.celebrate();
          }
        } else if (h < HATCH_AT) {
          const k = (h - SHAKE - EYE_OPEN) / BURST;
          z = lerp(2.2, 1.45, ease(k * 2.2));
          shake = (3 + k * 4) * flair.power;
          if (EYE_OPEN > 0) eye.set(1);
          tilt.set(Math.sin((5.6 + h) * 60) * (4 + k * 5) * 0.6);
          lift.set(Math.round(Math.abs(Math.sin(h * 34)) * k * 3));
          setCrackStage(4);
          if (flair.glow) glow.set(0.5 + k * 0.5);
        } else {
          hatch(now);
        }
      } else {
        const rt = t;
        focus = revealFocus;
        z = rt < 0.25 ? lerp(0.92, 1, ease(rt / 0.25)) : lerp(1, 1.1, clamp01((rt - 0.25) / 4.5));
        shake = rt < 0.8 ? 7 * (1 - rt / 0.8) * flair.power : 0;
        fl = rt < 0.5 ? (1 - rt / 0.5) * Math.min(1, 0.35 + flair.power * 0.5) : 0;
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
    // no fanfare: the burst and the buzz are enough
    haptics.celebrate();
    if (flair.legendary) {
      // A Legendary gets a drumroll of buzzes and slow-turning golden light.
      setTimeout(haptics.celebrate, 350);
      setTimeout(haptics.celebrate, 700);
      if (!reduceMotion) legendSpin.set(withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1));
    }
    if (!reduceMotion && flair.shards) burst.set(withTiming(1, { duration: 1300, easing: Easing.linear }));
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
      if (!preview) finishDrop(id);
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
        {/* the build-up is the cocoon alone in the dark; the realm appears with the burst */}
        {hatched && (
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
        )}
        {hatched &&
          !reduceMotion &&
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
              <CocoonEye open={eye} px={px} color={info.color} />
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
              flair.sparkles &&
              SPARKLES.map((s, i) => (
                <View key={i} style={[styles.sparkleSlot, { top: spriteH / 2, left: spriteW / 2 }]}>
                  <Sparkle x={s.x * spriteW} y={s.y * spriteH} size={s.size} delay={s.delay} />
                </View>
              ))}
            {revealed && flair.legendary && (
              <View pointerEvents="none" style={[styles.raysSlot, { top: spriteH * 0.45, left: spriteW / 2 }]}>
                <Rays color="#FFD27A" size={spriteH * 2.6} spin={legendSpin} />
              </View>
            )}
            {art && isCharacterId(id) && REVEAL_MOVES[id] ? (
              <RevealMove kind={REVEAL_MOVES[id]!} play={revealed} px={spriteScale}>
                <PixelSprite sheet={art.idle} scale={spriteScale} />
              </RevealMove>
            ) : (
              art && <PixelSprite sheet={art.idle} scale={spriteScale} animate={revealed} />
            )}
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
          <Text
            style={[
              styles.headline,
              companion.rarity <= 2
                ? { fontSize: 16 * px, lineHeight: 20 * px }
                : { fontSize: 26 * px, lineHeight: 30 * px },
              flair.legendary && { color: '#FFD27A' },
            ]}>
            {flair.headline}
          </Text>
          {phase === 'waking' && hintShown && (
            <Animated.Text entering={FadeIn.duration(800)} style={styles.hint}>
              Tap to hatch
            </Animated.Text>
          )}
        </View>
      )}

      {revealed && flair.legendary && !reduceMotion && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {CONFETTI.map((p, i) => (
            <Confetto key={i} piece={p} color={i % 2 ? '#FFD27A' : '#FFF4C0'} width={W} height={H} />
          ))}
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
            <Text style={[styles.stars, { fontSize: 15 * px, color: RARITY_TIERS[companion.rarity].color }]}>
              {rarityLabel(companion.rarity)}
            </Text>
            <Text style={styles.detail}>
              {info.className} · {REALMS[companion.dimension]}
            </Text>
            <Text style={[styles.number, { color: '#D8D2E6' }]}>{formatNumber(companion.number)}</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(600).duration(400)} style={[styles.band, { top: groundY + 14 * px }]}>
            <TypewriterText
              letterMs={CAPTION_MS}
              text={
                copies > 1
                  ? `Another ${companion.name}! You now have ${copies}.`
                  : `${companion.name} joined your collection!`
              }
              style={styles.title}
            />
            <Text style={styles.hint}>Tap to continue</Text>
            {premiumEnabled && canRedo && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={premium ? 'Redo this drop' : 'Redo this drop, with Premium'}
                hitSlop={8}
                onPress={() => {
                  if (!premium) return router.push('/paywall');
                  const pick = redoDrop(id);
                  if (!pick) return;
                  haptics.tap();
                  router.replace({ pathname: '/reveal/[id]', params: { id: pick } });
                }}
                style={({ pressed }) => [styles.redo, pressed && { opacity: 0.7 }]}>
                <Text style={styles.redoText}>{premium ? 'REDO' : 'REDO · PREMIUM'}</Text>
              </Pressable>
            )}
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
                  ['RARITY', rarityLabel(companion.rarity)],
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
                letterMs={CAPTION_MS}
                text={companion.bio}
                style={styles.entryBio}
                instant={skipped}
                onDone={() => setBioDone(true)}
              />
              <TypewriterText
                letterMs={CAPTION_MS}
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

      <Animated.View
        style={[styles.flash, flair.legendary && { backgroundColor: '#FFE9A0' }, flashStyle]}
        pointerEvents="none"
      />
    </Pressable>
  );
}

const shadow = { textShadowColor: INK, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 };

const styles = StyleSheet.create({
  raysSlot: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, backgroundColor: INK, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, top: 0, transformOrigin: 'left top' },
  anchor: { position: 'absolute', alignItems: 'center' },
  glow: { position: 'absolute', backgroundColor: '#FFE9A0' },
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
  redo: {
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: WHITE,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  redoText: { color: WHITE, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1 },
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
