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
import { playSound, useMusic } from '@/audio';
import { haptics } from '@/haptics';
import { fonts } from '@/theme';

// The story so far, told by the Keeper to the player as they wake: Undertale-
// style panels, a picture that drifts slowly, the Keeper's line typed into a
// dialogue box laid over the foot of it, a cut to black between. The picture
// comes first and the words after, so the eye isn't asked to do both at once.
// Music comes in a later build; `beat` marks where the heartbeat lands.
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
  /** When the line starts typing, once the picture has had its moment. */
  textAt?: number;
};

const PANELS: Panel[] = [
  { scene: 'black', line: 'Can you hear me?', ms: 2400, beat: true },
  { scene: 'war', line: 'Long ago the eight realms were at war, on the brink of destroying themselves.', ms: 5400 },
  { scene: 'council', line: 'Eight kings united and, with their combined strength, saved the world.', ms: 5000 },
  // The same picture carries on; as the Keeper doubts them, their faces change.
  { scene: 'smile', line: "Or at least that's what they say.", ms: 3800, flow: true, textAt: 1000 },
  {
    scene: 'descent',
    line: 'It has been five hundred years since then.',
    ms: 6400,
    from: 0,
    to: DESCENT_ART.archiveTop,
    // Typing begins as the fall slows, not while the picture is racing past.
    textAt: 4400,
  },
  { scene: 'awake', line: "I'm glad you're finally awake.", ms: 4000, flow: true, textAt: 1300 },
  { scene: 'title', line: '', ms: 2200, beat: true },
];
const TITLE = PANELS.length - 1;
/** The descent scrolls for this long, then lands in the Archive. */
const DESCEND_MS = 5600;
/** Room above and below the picture, for the skip button. */
const MARGIN = 140;
const CUT_MS = 250;
/** How far the dialogue box sits inside the picture's edge. */
const INSET = 10;
/** How long the picture shows alone before the words, unless a panel says. */
const TEXT_AT = 700;
/** Time to finish reading once a line has typed out, before moving on. */
const readMs = (line: string) => (line ? 1200 + 20 * line.length : 0);

const heartbeat = () => {
  playSound('heartbeat');
  haptics.tap();
  setTimeout(haptics.tap, 170);
};

/**
 * The opening intro, played every time the app starts: the Keeper telling
 * the waking player what happened. Each panel moves on by itself once its
 * line has been read; a tap finishes a line that is still typing, or moves
 * on from one that has. Skip jumps to the title; a tap on the title
 * finishes. `onDone` fires once it has faded away.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  useMusic('intro');
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
  const moving = useRef(false);
  // Which panel each milestone was last reached on, so a new panel starts clean.
  const [textFrom, setTextFrom] = useState(-1);
  const [typedOn, setTypedOn] = useState(-1);
  const [rushedOn, setRushedOn] = useState(-1);
  const [shownOn, setShownOn] = useState(-1);
  const panel = PANELS[index];
  const typed = typedOn === index || panel.line === '';

  // A centred 9:16 frame holding a whole scene, the dialogue box over its
  // foot (the frame's shape suits vertical ads).
  const boxW = Math.min(W - 48, ((H - MARGIN) * REALM_ART.width) / REALM_ART.height, 520);
  const px = boxW / REALM_ART.width;
  const boxH = REALM_ART.height * px;
  const boxTop = Math.max(40, (H - boxH) / 2);

  const finish = () => {
    if (ending.current) return;
    ending.current = true;
    fade.set(withTiming(0, { duration: 600 }));
    setTimeout(onDone, 620);
  };

  // Cut to black (or flow on) into the next panel; once per panel.
  const advance = () => {
    if (moving.current) return;
    moving.current = true;
    if (index >= TITLE) return finish();
    if (PANELS[index + 1].flow) return setIndex(index + 1);
    setCut(true);
    setTimeout(() => {
      setCut(false);
      setIndex(index + 1);
    }, CUT_MS);
  };

  // Each panel: set its motion going, then let the line in once the picture has landed.
  useEffect(() => {
    const p = PANELS[index];
    moving.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    if (!p.flow) {
      pan.set(p.from ?? 0);
      zoom.set(1);
    }
    if (p.to === undefined && !p.flow && !reduceMotion)
      zoom.set(withTiming(1.04, { duration: p.ms, easing: Easing.linear }));
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
        eye.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }));
      }, 700);
      later(() => eye.set(withSequence(withTiming(0.1, { duration: 80 }), withTiming(1, { duration: 80 }))), 2600);
    }
    if (p.scene === 'title') {
      title.set(0);
      title.set(withDelay(150, withTiming(1, { duration: 600 })));
    }
    later(() => setTextFrom(index), reduceMotion ? 0 : (p.textAt ?? (p.flow || p.scene === 'black' ? 400 : TEXT_AT)));
    later(() => setShownOn(index), p.ms);
    return () => timers.forEach(clearTimeout);
    // Shared values are stable; the panel index drives everything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Move on once the panel has had its time and the line has been read.
  useEffect(() => {
    if (!typed || shownOn !== index) return;
    const id = setTimeout(advance, readMs(panel.line));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, shownOn, index]);

  const onTap = () => {
    if (cut) return;
    if (!typed) setRushedOn(index);
    else advance();
  };

  const skip = () => {
    setCut(false);
    setIndex(TITLE);
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
        accessibilityLabel="The story so far. Tap to continue.">
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

        {/* The box only arrives with its words, so the picture has the screen to itself first. */}
        {!cut && panel.line !== '' && (textFrom === index || rushedOn === index) && (
          <Animated.View
            key={`line-${index}`}
            entering={reduceMotion ? undefined : FadeIn.duration(200)}
            style={[
              styles.dialogue,
              pictured
                ? {
                    bottom: H - boxTop - boxH + INSET,
                    left: (W - boxW) / 2 + INSET,
                    right: (W - boxW) / 2 + INSET,
                  }
                : { top: H * 0.42, left: 28, right: 28 },
            ]}>
            <Text style={styles.speaker}>???</Text>
            <TypewriterText
              key={index}
              text={panel.line}
              letterMs={36}
              start={textFrom === index}
              instant={rushedOn === index}
              onDone={() => setTypedOn(index)}
              style={styles.line}
            />
          </Animated.View>
        )}
      </Pressable>
      {index < TITLE && (
        <Pressable
          onPress={skip}
          hitSlop={16}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Skip the intro">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      )}
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
  skipButton: { position: 'absolute', bottom: 28, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  skip: { color: '#5A5670', fontFamily: fonts.regular, fontSize: 14, letterSpacing: 1 },
});
