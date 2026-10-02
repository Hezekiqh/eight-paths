import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { CARD_TIMING, HANDS_ON_TABLE, deal, scored, winnerOf, type Hand, type Score } from '@/world/cards';

type Props = {
  /** Whether the player is walking: the first step away asks if they're leaving. */
  moving: { get(): boolean };
  /** Paused (a dialogue is open): the cards wait, and walking doesn't count. */
  paused: boolean;
  onMove: () => void;
};

/**
 * Cards with the Keeper: a window over the Archive where a hand is dealt,
 * turned over and won every few seconds, for as long as the player stands
 * still. It never takes touches, so the stick still works to walk away.
 */
export function CardGame({ moving, paused, onMove }: Props) {
  const [hands, setHands] = useState<Hand[]>([]);
  const [shown, setShown] = useState(0);
  const [score, setScore] = useState<Score>({ keeper: 0, you: 0 });
  const pausedRef = useRef(paused);

  // The hand cycle: deal, turn over, score; three hands on the table, then sweep and start again.
  useEffect(() => {
    if (paused) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const play = () => {
      const hand = deal();
      setHands((h) => (h.length >= HANDS_ON_TABLE ? [hand] : [...h, hand]));
      setShown(0);
      timers.push(
        setTimeout(() => {
          haptics.select();
          setShown(1);
        }, CARD_TIMING.flip * 1000),
        setTimeout(() => {
          setShown(2);
          setScore((s) => scored(s, hand));
          if (winnerOf(hand) === 'you') haptics.success();
        }, CARD_TIMING.result * 1000),
        setTimeout(play, CARD_TIMING.next * 1000),
      );
    };
    play();
    return () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
  }, [paused]);

  // Walk, and the Keeper notices. A short grace after a pause, so a held stick doesn't ask twice at once.
  const since = useRef(0);
  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) since.current = Date.now();
  }, [paused]);
  const noticed = () => {
    if (pausedRef.current || Date.now() - since.current < 600) return;
    onMove();
  };
  useAnimatedReaction(
    () => moving.get(),
    (now, before) => {
      if (now && !before) scheduleOnRN(noticed);
    },
  );

  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={styles.window}>
        <Text style={styles.title}>Cards</Text>
        <Row label="The Keeper" hands={hands} shown={shown} side="keeper" />
        <Row label="You" hands={hands} shown={shown} side="you" />
        <Text style={styles.score} accessibilityLabel={`The Keeper ${score.keeper}, you ${score.you}`}>
          The Keeper {score.keeper} · You {score.you}
        </Text>
      </View>
    </View>
  );
}

function Row({ label, hands, shown, side }: { label: string; hands: Hand[]; shown: number; side: 'keeper' | 'you' }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.cards}>
        {hands.map((hand, i) => {
          const latest = i === hands.length - 1;
          return (
            <Card
              key={i}
              value={hand[side]}
              up={!latest || shown >= 1}
              won={winnerOf(hand) === side && (!latest || shown >= 2)}
              fresh={latest && shown >= 2}
              ink={side === 'you' ? colors.danger : colors.text}
            />
          );
        })}
      </View>
    </View>
  );
}

const CARD = { width: 40, height: 56 };

/** One card: dealt in face down, squeezed edge-on and opened face up; a heart floats off the winner. */
function Card({ value, up, won, fresh, ink }: { value: number; up: boolean; won: boolean; fresh: boolean; ink: string }) {
  const still = useReducedMotion();
  const turn = useSharedValue(1);
  const [turned, setTurned] = useState(up);
  // Reduce Motion: no squeeze, it's just face up.
  const face = still ? up : turned;
  useEffect(() => {
    if (still || up === turned) return;
    turn.set(withSequence(withTiming(0, { duration: 150 }), withTiming(1, { duration: 150 })));
    const id = setTimeout(() => setTurned(up), 150);
    return () => clearTimeout(id);
  }, [up, turned, still, turn]);
  const flip = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.05, turn.get()) }] }));

  const rise = useSharedValue(0);
  useEffect(() => {
    if (!fresh || !won || still) return;
    rise.set(0);
    rise.set(withTiming(1, { duration: 700 }));
  }, [fresh, won, still, rise]);
  const heart = useAnimatedStyle(() => ({
    opacity: rise.get() > 0 && rise.get() < 1 ? 1 : 0,
    transform: [{ translateY: -rise.get() * 22 }],
  }));

  return (
    <View>
      <Animated.View style={[styles.card, face ? styles.face : styles.back, flip]}>
        {face ? (
          <>
            <Text style={[styles.value, { color: ink }]}>{value}</Text>
            <Text style={[styles.suit, { color: ink }]}>♥</Text>
          </>
        ) : (
          <View style={styles.backInner}>
            <Text style={styles.backMark}>8</Text>
          </View>
        )}
      </Animated.View>
      {won && <Animated.Text style={[styles.float, heart]}>♥</Animated.Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: spacing.lg, left: 0, right: 0, alignItems: 'center' },
  window: { ...windowStyle, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, minWidth: 260 },
  title: { color: colors.accent, fontFamily: fonts.bold, fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { width: 78, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
  cards: { flexDirection: 'row', gap: spacing.sm, minHeight: CARD.height },
  card: { ...CARD, borderWidth: 2, borderColor: colors.frame, borderRadius: 2 },
  face: { backgroundColor: '#FFFDF5', padding: 3 },
  back: { backgroundColor: colors.accent, padding: 4 },
  backInner: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMark: { color: colors.card, fontFamily: fonts.bold, fontSize: 20 },
  value: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 22 },
  suit: { alignSelf: 'center', fontSize: 16, marginTop: 2 },
  float: { position: 'absolute', top: -6, alignSelf: 'center', color: colors.accent, fontSize: 14 },
  score: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
});
