import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { TUTORIAL_QUEST_ID } from '@/game/quests';
import { haptics } from '@/haptics';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { COMPANIONS, DEFAULT_PARTY, ROSTER } from '@/story/companions';
import { useGameStore } from '@/store';
import { useSession } from '@/store/session';
import { fonts } from '@/theme';
import { ARROW_H, EDGE, TOUR_STEPS, placeTour, type Rect } from '@/tutorial/steps';
import { awaitTarget, useTour } from '@/tutorial/tour';

const DIM = 'rgba(0,0,0,0.78)';
/** Roughly the tab bar's height above the home indicator; targets are scrolled clear of it. */
const TAB_BAR_H = 76;
/** How long a screen change settles before the overlay shows (a sheet takes about this to slide away). */
const SETTLE_MS = 600;
/** After the first hero's hatch, a breath before the Keeper speaks again. */
const RESUME_MS = 900;
/** Once the tour's overlay has faded away, the Premium offer slides up. */
const OFFER_MS = 700;
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
 * The Keeper's tour of the app: it opens each tab in turn, the screen dims but
 * for a framed window onto one thing at a time, a pixel arrow bobs at it, and
 * the Keeper explains it in the same black dialogue box as the intro. A tap
 * finishes the line, then moves on; Skip, in the box's corner, ends it. One
 * step is done by the player: tapping completes the first habit, and the tour
 * steps aside while it lands and the first hero hatches. The last line is at the
 * Other World's door; the player steps in when they like. Lives above the tabs;
 * Today starts it once, right after onboarding, until replayed from Settings.
 * When it ends the first time, the Premium offer is shown.
 *
 * The habit creator is a sheet that covers any Modal, so while the tour is
 * there it's drawn inside the sheet instead (`inside`), as a plain overlay.
 */
export function KeeperTour({ inside = false }: { inside?: boolean }) {
  const running = useTour((s) => s.running);
  const finish = useTour((s) => s.finish);
  const pathname = usePathname();
  const onSheet = pathname === '/quest-editor';
  // Shown once the screen has settled: iOS drops an overlay opened while a sheet is still sliding away.
  const [settled, setSettled] = useState(pathname);
  useEffect(() => {
    const id = setTimeout(() => setSettled(pathname), SETTLE_MS);
    return () => clearTimeout(id);
  }, [pathname]);
  const visible = running && onSheet === inside && settled === pathname;
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const index = useTour((s) => s.step);
  const setIndex = useTour((s) => s.go);
  /** Where the step's target was measured; null when it points at nothing on screen. */
  const [measured, setMeasured] = useState<{ index: number; rect: Rect | null } | null>(null);
  const [typed, setTyped] = useState(false);
  /** Inside the sheet: where the sheet's top-left is on screen, so screen positions can be drawn in it. */
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [instant, setInstant] = useState(false);
  /** Stepped aside while the first habit lands and its hero hatches. */
  const paused = useTour((s) => s.paused);
  const setPaused = useTour((s) => s.pause);
  const bob = useSharedValue(0);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const player = useGameStore((s) => s.player);
  const tutorialDone = useGameStore((s) => !!s.player?.tutorialComplete);
  const hatching = useGameStore((s) => s.drops.length > 0);
  const first = player ? (player.origin ?? DEFAULT_PARTY[player.classDimension]) : null;
  const line = step.line
    .replace('{name}', player?.name ?? 'friend')
    .replace('{hero}', first ? COMPANIONS[first].name : 'Your first hero')
    .replace('{left}', String(ROSTER.length - 1));

  // Open this step's screen (only the tabs' copy does, so it happens once).
  useEffect(() => {
    if (inside || !running || paused || pathname === step.route) return;
    // Leaving the habit creator: close its sheet.
    if (onSheet) router.back();
    else router.navigate((step.href ?? step.route) as never);
  }, [inside, running, onSheet, paused, step.route, step.href, pathname]);

  // Find where this step's target is now (its tab may have just opened, or scrolled).
  useEffect(() => {
    if (!visible || paused || pathname !== step.route) return;
    let live = true;
    const id = setTimeout(() => {
      // Keep clear of the status bar and the tab bar.
      const band = { top: insets.top + EDGE, bottom: height - insets.bottom - TAB_BAR_H };
      (step.target ? awaitTarget(step.target, band) : Promise.resolve(null)).then((rect) => {
        if (live) setMeasured({ index, rect });
      });
    }, 80);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [visible, paused, index, step.target, step.route, pathname, width, height, insets.top, insets.bottom]);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = { duration: 420, easing: Easing.inOut(Easing.quad) };
    bob.set(withRepeat(withSequence(withTiming(1, ease), withTiming(0, ease)), -1));
  }, [bob, reduceMotion]);

  // Back from the first habit: once it's done, its hero has hatched and Today is in front again, carry on.
  useEffect(() => {
    if (inside || !paused || !tutorialDone || hatching || pathname !== '/') return;
    const id = setTimeout(() => {
      setPaused(false);
      setIndex(index + 1);
      setMeasured(null);
      setTyped(false);
      setInstant(false);
    }, RESUME_MS);
    return () => clearTimeout(id);
  }, [inside, paused, tutorialDone, hatching, pathname, index, setIndex, setPaused]);

  const goTo = (next: number) => {
    setIndex(next);
    setMeasured(null);
    setTyped(false);
    setInstant(false);
  };

  /**
   * Ends the tour (the last line, or Skip). The player steps into the Other World when they choose.
   * The first time, the Premium offer follows; replays from Settings don't show it again.
   */
  const end = () => {
    haptics.tap();
    goTo(0);
    setPaused(false);
    finish();
    const { premium, offerSeen } = usePremium.getState();
    if (premiumEnabled && !premium && !offerSeen) setTimeout(() => router.push('/paywall'), OFFER_MS);
  };
  const skip = () => end();

  const onTap = () => {
    // Taps while the next target is being found would skip its line.
    if (measured?.index !== index) return;
    if (!typed) return setInstant(true);
    if (last) {
      haptics.success();
      return end();
    }
    // The first habit: Today completes it (with its banner and XP), and the tour waits for the hatch.
    if (step.complete === 'first-quest' && !tutorialDone) {
      haptics.select();
      setPaused(true);
      useSession.setState({ pendingQuest: TUTORIAL_QUEST_ID });
      return;
    }
    haptics.select();
    goTo(index + 1);
  };

  /** undefined while measuring. */
  const found = measured?.index === index ? measured.rect : undefined;
  const target = found && inside ? { ...found, x: found.x - origin.x, y: found.y - origin.y } : found;
  const layout = target ? placeTour(target, { width, height: height - origin.y }) : null;
  const dir = layout?.arrow.dir ?? 'down';
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * 7 * (dir === 'up' ? 1 : -1) }],
  }));

  if (!visible || paused) return null;
  const fadeIn = reduceMotion ? undefined : FadeIn.duration(220);
  const measuring = target === undefined;
  const hole = layout?.hole;

  const Layer = inside ? InSheet : OverAll;
  return (
    <Layer onClose={skip} onOrigin={setOrigin}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={`${line} ${last ? 'Tap to finish.' : 'Tap to continue.'}`}>
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
                  text={line}
                  letterMs={30}
                  instant={instant}
                  onDone={() => setTyped(true)}
                  style={styles.line}
                />
              </View>
              <View style={styles.footer}>
                {!last && (
                  <Pressable onPress={skip} hitSlop={14} accessibilityRole="button" accessibilityLabel="Skip the tour">
                    <Text style={styles.skip}>Skip</Text>
                  </Pressable>
                )}
                <View pointerEvents="none" style={styles.flex} />
                <Text pointerEvents="none" style={[styles.more, !typed && styles.hidden]}>
                  {last
                    ? 'Tap to finish'
                    : step.complete && !tutorialDone
                      ? 'Tap to complete it'
                      : `${index + 1}/${TOUR_STEPS.length}  ▼`}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Layer>
  );
}

/** Over everything: a transparent Modal above the tabs. */
type LayerProps = { onClose: () => void; onOrigin: (o: { x: number; y: number }) => void; children: React.ReactNode };

function OverAll({ onClose, children }: LayerProps) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {children}
    </Modal>
  );
}

/** Inside a sheet: the same, as a plain layer on top of the sheet's content. */
function InSheet({ onOrigin, children }: LayerProps) {
  const ref = useRef<View>(null);
  return (
    <View
      ref={ref}
      onLayout={() => ref.current?.measureInWindow((x, y) => onOrigin({ x, y }))}
      style={[StyleSheet.absoluteFill, styles.sheet]}
      pointerEvents="box-none">
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  sheet: { zIndex: 100 },
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
