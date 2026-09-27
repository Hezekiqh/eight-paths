import { Image } from 'expo-image';
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
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { COCOON_ART, COCOON_STAGES, DESCENT_ART, INTRO_SCENES, REALM_ART, REALM_BACKGROUNDS } from '@/art/realms';
import { CHARACTER_ART } from '@/art/sprites';
import { CocoonEye } from '@/components/cocoon-eye';
import { PixelSprite } from '@/components/pixel-sprite';
import { TypewriterText } from '@/components/typewriter-text';
import { DIMENSIONS } from '@/game';
import { haptics } from '@/haptics';
import { fonts } from '@/theme';

// The story so far, told in Undertale-style panels: a picture that drifts
// slowly, one line of narration typed beneath it, a cut to black between.
// Tier-one lore only (see LORE.md): no Entity, no Keeper by name.
// Music comes in a later build; `beat` marks where the heartbeat lands.
type Scene = 'black' | 'realms' | 'war' | 'silk' | 'sleepers' | 'forgotten' | 'descent' | 'title';
type Panel = { scene: Scene; line: string; ms: number; from?: number; to?: number; beat?: boolean };

const PANELS: Panel[] = [
  { scene: 'black', line: 'Long ago, the world was loud.', ms: 4200, beat: true },
  { scene: 'realms', line: 'Eight realms. Warriors and scholars. Merchants and monks.', ms: 6400 },
  { scene: 'war', line: 'Then came a war that would have ended everything.', ms: 5400 },
  { scene: 'silk', line: 'So someone made them sleep.', ms: 5200 },
  {
    scene: 'sleepers',
    line: 'Two hundred of them, wrapped in silk, dreaming of everything they ever wanted.',
    ms: 7400,
  },
  { scene: 'forgotten', line: 'Five hundred years passed. The world forgot them.', ms: 6000 },
  {
    scene: 'descent',
    line: 'Until one of them woke on their own.',
    ms: 15500,
    from: 0,
    to: DESCENT_ART.archiveTop,
  },
  { scene: 'title', line: 'That one was you.', ms: 5600, beat: true },
];
const TITLE = PANELS.length - 1;
/** The descent scrolls for this long, then lands in the Archive. */
const DESCEND_MS = 9500;
/** Room under the picture for two or three lines of narration. */
const TEXT_ROOM = 150;
const CUT_MS = 350;

const heartbeat = () => {
  haptics.tap();
  setTimeout(haptics.tap, 170);
};

/**
 * The opening intro, played every time the app starts. A tap skips to the
 * title; a tap on the title finishes. `onDone` fires once it has faded away.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [cut, setCut] = useState(false);
  // Which panel's camera has landed (the descent holds its line until then).
  const [landed, setLanded] = useState(-1);
  const [realm, setRealm] = useState(0);
  const pan = useSharedValue(0);
  const zoom = useSharedValue(1);
  const fade = useSharedValue(1);
  const wrap = useSharedValue(0);
  const tilt = useSharedValue(0);
  const eye = useSharedValue(0);
  const forgotten = useSharedValue(0);
  const title = useSharedValue(0);
  const ending = useRef(false);
  const panel = PANELS[index];

  // A centred 9:16 frame holding a whole scene, with the narration beneath it,
  // the pair centred on the screen (and the frame's shape suits vertical ads).
  const boxW = Math.min(W - 48, ((H - TEXT_ROOM - 80) * REALM_ART.width) / REALM_ART.height, 520);
  const px = boxW / REALM_ART.width;
  const boxH = REALM_ART.height * px;
  const boxTop = Math.max(40, (H - boxH - TEXT_ROOM) / 2);

  const finish = () => {
    if (ending.current) return;
    ending.current = true;
    fade.set(withTiming(0, { duration: 600 }));
    setTimeout(onDone, 620);
  };

  // Each panel: set its motion going, then cut to black and move on.
  useEffect(() => {
    const p = PANELS[index];
    pan.set(p.from ?? 0);
    zoom.set(1);
    if (p.to === undefined && !reduceMotion) zoom.set(withTiming(1.08, { duration: p.ms, easing: Easing.linear }));
    if (p.to !== undefined && !reduceMotion) {
      const ms = p.scene === 'descent' ? DESCEND_MS : p.ms;
      pan.set(withTiming(p.to, { duration: ms, easing: Easing.inOut(Easing.quad) }));
    } else if (p.to !== undefined) pan.set(p.to);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    if (p.beat) {
      heartbeat();
      later(heartbeat, 1100);
    }
    if (p.scene === 'realms') for (let i = 1; i < 8; i++) later(() => setRealm(i), i * 780);
    if (p.scene === 'silk') {
      wrap.set(0);
      wrap.set(withDelay(900, withTiming(1, { duration: reduceMotion ? 0 : 2600, easing: Easing.out(Easing.quad) })));
    }
    if (p.scene === 'forgotten') {
      forgotten.set(0);
      forgotten.set(withTiming(1, { duration: reduceMotion ? 0 : 3200 }));
    }
    if (p.scene === 'descent') {
      eye.set(0);
      const land = reduceMotion ? 0 : DESCEND_MS;
      const step = { duration: 90 };
      later(() => {
        haptics.tick();
        tilt.set(withSequence(withTiming(-3, step), withTiming(3, step), withTiming(-2, step), withTiming(0, step)));
      }, land + 700);
      later(() => {
        haptics.celebrate();
        eye.set(withTiming(1, { duration: 300 }));
      }, land + 2000);
      later(
        () => eye.set(withSequence(withTiming(0.1, { duration: 80 }), withTiming(1, { duration: 80 }))),
        land + 3200,
      );
    }
    if (p.scene === 'title') {
      title.set(0);
      title.set(withDelay(1600, withTiming(1, { duration: 900 })));
    }
    later(() => {
      if (index >= TITLE) return finish();
      setCut(true);
      later(() => {
        setCut(false);
        setIndex(index + 1);
      }, CUT_MS);
    }, p.ms);
    return () => timers.forEach(clearTimeout);
    // Shared values are stable; the panel index drives everything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const onTap = () => {
    if (index < TITLE) {
      setCut(false);
      setIndex(TITLE);
    } else finish();
  };

  const stageStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const panStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -pan.value * px }, { scale: zoom.value }] }));
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, wrap.value * 3),
    transform: [{ scaleY: wrap.value }],
  }));
  const forgottenStyle = useAnimatedStyle(() => ({ opacity: forgotten.value }));
  const tiltStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value }));

  const sceneH = (panel.scene === 'descent' ? DESCENT_ART.height : REALM_ART.height) * px;
  const picture = (source: number) => (
    <Image source={source} contentFit="fill" style={{ width: boxW, height: sceneH }} accessible={false} />
  );
  const cocoonW = COCOON_ART.width * px;
  const cocoonH = COCOON_ART.height * px;
  const silhouette = CHARACTER_ART.moss;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.stage, stageStyle]}>
      <StatusBar hidden />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel="The story so far. Tap to skip.">
        {!cut && panel.scene !== 'black' && panel.scene !== 'title' && (
          <Animated.View
            key={index}
            entering={reduceMotion ? undefined : FadeIn.duration(450)}
            style={[styles.box, { top: boxTop, left: (W - boxW) / 2, width: boxW, height: boxH }]}>
            <Animated.View style={panStyle}>
              {panel.scene === 'realms' && picture(REALM_BACKGROUNDS[DIMENSIONS[realm]])}
              {panel.scene === 'war' && picture(INTRO_SCENES.war)}
              {(panel.scene === 'sleepers' || panel.scene === 'forgotten') && picture(INTRO_SCENES.sleepers)}
              {panel.scene === 'forgotten' && (
                <Animated.View style={[StyleSheet.absoluteFill, forgottenStyle]}>
                  {picture(INTRO_SCENES.forgotten)}
                </Animated.View>
              )}
              {panel.scene === 'descent' && (
                <>
                  {picture(INTRO_SCENES.descent)}
                  <Animated.View
                    style={[
                      styles.cocoon,
                      {
                        left: (REALM_ART.width / 2 - COCOON_ART.width / 2) * px,
                        top: (DESCENT_ART.archiveTop + REALM_ART.ground + 2 - 102) * px,
                        width: cocoonW,
                        height: cocoonH,
                      },
                      tiltStyle,
                    ]}>
                    <Image source={COCOON_STAGES[2]} contentFit="fill" style={{ width: cocoonW, height: cocoonH }} />
                    <CocoonEye open={eye} px={px} color="#FFC940" />
                  </Animated.View>
                </>
              )}
            </Animated.View>
            {panel.scene === 'silk' && (
              <View style={styles.silk}>
                {silhouette && <PixelSprite sheet={silhouette.idle} scale={1.9 * px} tint="#D8D2E6" animate={false} />}
                <Animated.View style={[styles.wrap, { width: cocoonW * 1.15, height: cocoonH * 1.15 }, wrapStyle]}>
                  <Image source={COCOON_STAGES[0]} contentFit="fill" style={{ width: '100%', height: '100%' }} />
                </Animated.View>
              </View>
            )}
          </Animated.View>
        )}

        {!cut && (
          <View
            style={[
              styles.narration,
              panel.scene === 'black' || panel.scene === 'title'
                ? { top: H * 0.42, left: 32, right: 32 }
                : { top: boxTop + boxH + 22, left: (W - boxW) / 2, right: (W - boxW) / 2 },
            ]}>
            {panel.scene === 'title' && (
              <Animated.Text style={[styles.title, titleStyle]} accessibilityRole="header">
                EIGHT PATHS
              </Animated.Text>
            )}
            <TypewriterText
              key={index}
              text={panel.line}
              letterMs={48}
              start={panel.scene !== 'descent' || landed === index}
              style={styles.line}
            />
          </View>
        )}
        <Text style={styles.skip}>Tap to skip</Text>
      </Pressable>
      <DescentCue
        active={panel.scene === 'descent' && !cut}
        onLand={() => setLanded(index)}
        reduceMotion={reduceMotion}
      />
    </Animated.View>
  );
}

/** Holds the descent's narration back until the camera lands in the Archive. */
function DescentCue({ active, onLand, reduceMotion }: { active: boolean; onLand: () => void; reduceMotion: boolean }) {
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(onLand, reduceMotion ? 0 : DESCEND_MS - 400);
    return () => clearTimeout(id);
  }, [active, onLand, reduceMotion]);
  return null;
}

const styles = StyleSheet.create({
  stage: { backgroundColor: '#000000', zIndex: 100 },
  box: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000000' },
  cocoon: { position: 'absolute', transformOrigin: 'bottom' },
  silk: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  wrap: { position: 'absolute', transformOrigin: 'bottom' },
  narration: { position: 'absolute', gap: 18 },
  line: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 19, lineHeight: 30, textAlign: 'center' },
  title: { color: '#FFD27A', fontFamily: fonts.bold, fontSize: 64, letterSpacing: 4, textAlign: 'center' },
  skip: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    color: '#5A5670',
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
