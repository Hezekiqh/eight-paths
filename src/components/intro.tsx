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

import { COCOON_ART, COCOON_STAGES, DESCENT_ART, INTRO_SCENES, REALM_ART } from '@/art/realms';
import { CocoonEye } from '@/components/cocoon-eye';
import { TypewriterText } from '@/components/typewriter-text';
import { haptics } from '@/haptics';
import { fonts } from '@/theme';

// The story so far, told by the Keeper to the player as they wake: Undertale-
// style panels, a picture that drifts slowly, the Keeper's line typed into a
// dialogue box beneath it, a cut to black between. Music comes in a later
// build; `beat` marks where the heartbeat lands.
type Scene = 'black' | 'war' | 'council' | 'smile' | 'descent' | 'awake' | 'title';
type Panel = {
  scene: Scene;
  line: string;
  ms: number;
  from?: number;
  to?: number;
  beat?: boolean;
  /** Carry straight on from the previous panel without cutting to black. */
  flow?: boolean;
};

const PANELS: Panel[] = [
  { scene: 'black', line: 'Can you hear me?', ms: 3800, beat: true },
  { scene: 'war', line: 'Long ago the eight realms were at war, on the brink of destroying themselves.', ms: 7800 },
  { scene: 'council', line: 'Eight kings united and, with their combined strength, saved the world.', ms: 7200 },
  // The same picture carries on; as the Keeper doubts them, their faces change.
  { scene: 'smile', line: "Or at least that's what they say.", ms: 5200, flow: true },
  {
    scene: 'descent',
    line: 'It has been five hundred years since then.',
    ms: 10500,
    from: 0,
    to: DESCENT_ART.archiveTop,
  },
  { scene: 'awake', line: "I'm glad you're finally awake.", ms: 5600, flow: true },
  { scene: 'title', line: '', ms: 4200, beat: true },
];
const TITLE = PANELS.length - 1;
/** The descent scrolls for this long, then lands in the Archive. */
const DESCEND_MS = 9800;
/** Room under the picture for the Keeper's dialogue box. */
const TEXT_ROOM = 170;
const CUT_MS = 350;

const heartbeat = () => {
  haptics.tap();
  setTimeout(haptics.tap, 170);
};

/**
 * The opening intro, played every time the app starts: the Keeper telling
 * the waking player what happened. A tap skips to the title; a tap on the
 * title finishes. `onDone` fires once it has faded away.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [cut, setCut] = useState(false);
  const pan = useSharedValue(0);
  const zoom = useSharedValue(1);
  const fade = useSharedValue(1);
  const grin = useSharedValue(0);
  const tilt = useSharedValue(0);
  const eye = useSharedValue(0);
  const title = useSharedValue(0);
  const ending = useRef(false);
  const panel = PANELS[index];

  // A centred 9:16 frame holding a whole scene, with the dialogue box beneath
  // it, the pair centred on the screen (and the frame's shape suits vertical ads).
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

  // Each panel: set its motion going, then cut to black (or flow on) and move on.
  useEffect(() => {
    const p = PANELS[index];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    if (!p.flow) {
      pan.set(p.from ?? 0);
      zoom.set(1);
    }
    if (p.to === undefined && !p.flow && !reduceMotion)
      zoom.set(withTiming(1.08, { duration: p.ms, easing: Easing.linear }));
    if (p.to !== undefined && !reduceMotion)
      pan.set(withTiming(p.to, { duration: DESCEND_MS, easing: Easing.inOut(Easing.quad) }));
    else if (p.to !== undefined) pan.set(p.to);
    if (p.beat) {
      heartbeat();
      later(heartbeat, 1100);
    }
    if (p.scene === 'council') grin.set(0);
    if (p.scene === 'smile') {
      // A heartbeat, and the kings' faces slowly split into grins.
      heartbeat();
      grin.set(withTiming(1, { duration: reduceMotion ? 0 : 1400, easing: Easing.inOut(Easing.quad) }));
    }
    if (p.scene === 'descent') eye.set(0);
    if (p.scene === 'awake') {
      // The cocoon stirs, then an eye opens and looks out at the player.
      const step = { duration: 90 };
      haptics.tick();
      tilt.set(withSequence(withTiming(-3, step), withTiming(3, step), withTiming(-2, step), withTiming(0, step)));
      later(() => {
        haptics.celebrate();
        eye.set(withTiming(1, { duration: 300 }));
      }, 700);
      later(() => eye.set(withSequence(withTiming(0.1, { duration: 80 }), withTiming(1, { duration: 80 }))), 2600);
    }
    if (p.scene === 'title') {
      title.set(0);
      title.set(withDelay(400, withTiming(1, { duration: 900 })));
    }
    later(() => {
      if (index >= TITLE) return finish();
      if (PANELS[index + 1].flow) return setIndex(index + 1);
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
  const grinStyle = useAnimatedStyle(() => ({ opacity: grin.value }));
  const tiltStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value }));

  // Panels that carry on from the one before share its picture instead of reloading it.
  const tall = panel.scene === 'descent' || panel.scene === 'awake';
  const kings = panel.scene === 'council' || panel.scene === 'smile';
  const sceneH = (tall ? DESCENT_ART.height : REALM_ART.height) * px;
  const picture = (source: number) => (
    <Image source={source} contentFit="fill" style={{ width: boxW, height: sceneH }} accessible={false} />
  );
  const cocoonW = COCOON_ART.width * px;
  const cocoonH = COCOON_ART.height * px;
  const pictured = panel.scene !== 'black' && panel.scene !== 'title';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.stage, stageStyle]}>
      <StatusBar hidden />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel="The story so far. Tap to skip.">
        {!cut && pictured && (
          <Animated.View
            key={tall ? 'tall' : kings ? 'kings' : index}
            entering={reduceMotion ? undefined : FadeIn.duration(450)}
            style={[styles.box, { top: boxTop, left: (W - boxW) / 2, width: boxW, height: boxH }]}>
            <Animated.View style={panStyle}>
              {panel.scene === 'war' && picture(INTRO_SCENES.war)}
              {kings && (
                <>
                  {picture(INTRO_SCENES.council)}
                  <Animated.View style={[StyleSheet.absoluteFill, grinStyle]}>
                    {picture(INTRO_SCENES.councilSmile)}
                  </Animated.View>
                </>
              )}
              {tall && (
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
          </Animated.View>
        )}

        {!cut && panel.scene === 'title' && (
          <View style={[styles.titleWrap, { top: H * 0.42 }]}>
            <Animated.Text style={[styles.title, titleStyle]} accessibilityRole="header">
              EIGHT PATHS
            </Animated.Text>
          </View>
        )}

        {!cut && panel.line !== '' && (
          <View
            style={[
              styles.dialogue,
              pictured
                ? { top: boxTop + boxH + 18, left: (W - boxW) / 2, right: (W - boxW) / 2 }
                : { top: H * 0.42, left: 28, right: 28 },
            ]}>
            <Text style={styles.speaker}>???</Text>
            <TypewriterText key={index} text={panel.line} letterMs={46} style={styles.line} />
          </View>
        )}
        <Text style={styles.skip}>Tap to skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: '#000000', zIndex: 100 },
  box: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000000' },
  cocoon: { position: 'absolute', transformOrigin: 'bottom' },
  // An RPG dialogue window: the Keeper speaking to the player.
  dialogue: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#07060B',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 4,
  },
  speaker: { color: '#FFD27A', fontFamily: fonts.bold, fontSize: 18, letterSpacing: 2 },
  line: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 18, lineHeight: 28 },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
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
