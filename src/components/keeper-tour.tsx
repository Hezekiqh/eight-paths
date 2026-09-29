import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TypewriterText } from '@/components/typewriter-text';
import { haptics } from '@/haptics';
import { fonts } from '@/theme';
import { ARROW_H, EDGE, TOUR_STEPS, placeTour, type Rect } from '@/tutorial/steps';
import { measureTarget, useTour } from '@/tutorial/tour';

const DIM = 'rgba(0,0,0,0.78)';
/** Roughly the tab bar's height above the home indicator; targets are scrolled clear of it. */
const TAB_BAR_H = 76;
/** How long the closing title card stays up. */
const TITLE_MS = 2600;
const WHITE = '#FFFFFF';
/** A chunky pixel arrow pointing down: rows of blocks narrowing to the tip, under a stem. */
const ARROW_ROWS = [6, 6, 6, 22, 18, 14, 10, 6, 2];
const BLOCK = ARROW_H / ARROW_ROWS.length;

function PixelArrow({ dir }: { dir: 'up' | 'down' }) {
  return (
    <View style={[styles.arrow, dir === 'up' && styles.flip]}>
      {ARROW_ROWS.map((w, i) => (
        <View key={i} style={{ width: w, height: BLOCK, backgroundColor: WHITE }} />
      ))}
    </View>
  );
}

/**
 * The Keeper's tour of the app: the screen dims but for a framed window onto
 * one thing at a time, a pixel arrow bobs at it, and the Keeper explains it in
 * the same black dialogue box as the intro. A tap finishes the line, then moves
 * on; Skip, in the box's corner, ends it. Shown once, until replayed from the Profile tab.
 */
export function KeeperTour({ visible }: { visible: boolean }) {
  const finish = useTour((s) => s.finish);
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  /** Where the step's target was measured; null when it points at nothing on screen. */
  const [measured, setMeasured] = useState<{ index: number; rect: Rect | null } | null>(null);
  const [typed, setTyped] = useState(false);
  const [instant, setInstant] = useState(false);
  /** After the last line: the game's name, alone in the middle of the screen. */
  const [titled, setTitled] = useState(false);
  const bob = useSharedValue(0);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  // Find where this step's target is now (the screen may have scrolled).
  useEffect(() => {
    if (!visible) return;
    let live = true;
    const id = setTimeout(() => {
      // Keep clear of the status bar and the tab bar.
      const band = { top: insets.top + EDGE, bottom: height - insets.bottom - TAB_BAR_H };
      (step.target ? measureTarget(step.target, band) : Promise.resolve(null)).then((rect) => {
        if (live) setMeasured({ index, rect });
      });
    }, 80);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [visible, index, step.target, width, height, insets.top, insets.bottom]);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = { duration: 420, easing: Easing.inOut(Easing.quad) };
    bob.set(withRepeat(withSequence(withTiming(1, ease), withTiming(0, ease)), -1));
  }, [bob, reduceMotion]);

  const goTo = (next: number) => {
    setIndex(next);
    setMeasured(null);
    setTyped(false);
    setInstant(false);
  };

  const end = () => {
    haptics.tap();
    goTo(0);
    setTitled(false);
    finish();
  };

  // The title card closes itself, or on a tap.
  useEffect(() => {
    if (!titled) return;
    const id = setTimeout(end, TITLE_MS);
    return () => clearTimeout(id);
    // `end` only touches stable setters and the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titled]);

  const onTap = () => {
    // Taps while the next target is being found would skip its line.
    if (measured?.index !== index) return;
    if (!typed) return setInstant(true);
    if (last) {
      haptics.success();
      return setTitled(true);
    }
    haptics.select();
    goTo(index + 1);
  };

  /** undefined while measuring. */
  const target = measured?.index === index ? measured.rect : undefined;
  const layout = target ? placeTour(target, { width, height }) : null;
  const dir = layout?.arrow.dir ?? 'down';
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * 7 * (dir === 'up' ? 1 : -1) }],
  }));

  if (!visible) return null;
  if (titled) {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={end}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.titleCard]}
          onPress={end}
          accessibilityRole="button"
          accessibilityLabel="Eight Paths. Tap to begin.">
          <Animated.Text entering={reduceMotion ? undefined : FadeIn.duration(700)} style={styles.title}>
            EIGHT PATHS
          </Animated.Text>
        </Pressable>
      </Modal>
    );
  }
  const fadeIn = reduceMotion ? undefined : FadeIn.duration(220);
  const measuring = target === undefined;
  const hole = layout?.hole;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={end}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={`${step.line} ${last ? 'Tap to finish.' : 'Tap to continue.'}`}>
        {/* The dimmed screen, in four bands around the target's window. */}
        {hole ? (
          <>
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} />
            <View style={[styles.dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.height }]} />
            <View style={[styles.dim, { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height }]} />
            <View style={[styles.frame, { left: hole.x, top: hole.y, width: hole.width, height: hole.height }]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
        )}
      </Pressable>

      {/* Over the tap-anywhere layer, letting taps through except on Skip. */}
      {!measuring && (
        <View key={index} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {layout && (
            <Animated.View
              entering={fadeIn}
              style={[styles.arrowWrap, { left: layout.arrow.x - 11, top: layout.arrow.y }, bobStyle]}>
              <PixelArrow dir={layout.arrow.dir} />
            </Animated.View>
          )}
          <Animated.View
            entering={fadeIn}
            style={[styles.dialogue, layout ? layout.box : { top: height * 0.38 }, { left: EDGE, right: EDGE }]}>
            <Pressable onPress={onTap} accessible={false} style={styles.words}>
              <View pointerEvents="none" style={styles.words}>
                <Text style={styles.speaker}>???</Text>
                <TypewriterText
                  text={step.line}
                  letterMs={30}
                  instant={instant}
                  onDone={() => setTyped(true)}
                  style={styles.line}
                />
              </View>
              <View style={styles.footer}>
                {!last && (
                  <Pressable onPress={end} hitSlop={14} accessibilityRole="button" accessibilityLabel="Skip the tour">
                    <Text style={styles.skip}>Skip</Text>
                  </Pressable>
                )}
                <View pointerEvents="none" style={styles.flex} />
                <Text pointerEvents="none" style={[styles.more, !typed && styles.hidden]}>
                  {last ? 'Tap to begin' : `${index + 1}/${TOUR_STEPS.length}  ▼`}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  titleCard: { backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  // The intro's title, dead centre.
  title: { color: '#FFD27A', fontFamily: fonts.bold, fontSize: 64, letterSpacing: 4, textAlign: 'center' },
  frame: { position: 'absolute', borderWidth: 3, borderColor: WHITE, borderRadius: 6 },
  arrowWrap: { position: 'absolute', width: 22, alignItems: 'center' },
  arrow: { alignItems: 'center' },
  flip: { transform: [{ scaleY: -1 }] },
  // The intro's RPG dialogue window: the Keeper speaking to the player.
  dialogue: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: '#07060B',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 4,
  },
  speaker: { color: '#FFD27A', fontFamily: fonts.bold, fontSize: 18, letterSpacing: 2 },
  line: { color: WHITE, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 26 },
  more: { color: '#8A86A0', fontFamily: fonts.regular, fontSize: 12 },
  hidden: { opacity: 0 },
  words: { gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  skip: { color: '#8A86A0', fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
});
