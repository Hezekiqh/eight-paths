import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { playSound } from '@/audio';
import { TypewriterText } from '@/components/typewriter-text';
import { Portrait } from '@/components/world/portrait';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import type { Question } from '@/world/maps';
import { portraitFor, splitSpeaker, voiceFor } from '@/world/portraits';
import { isShouted, rumblesIn } from '@/world/rumbles';
import type { WalkerId } from '@/world/walkers';

export type Dialogue = {
  speaker?: string;
  /** Whose face to show, when it isn't found from `speaker` (see portraits.ts). */
  sprite?: WalkerId;
  lines: string[];
  questions?: Question[];
  /** Said back when the player picks Goodbye, before the conversation closes. */
  farewell?: string[];
  /** Runs once the conversation closes (e.g. stepping through a door). */
  then?: () => void;
  /**
   * A decision at the end of the lines: each option runs its own `then`, instead of the usual goodbye.
   * A `locked` option is shown greyed out with what it needs (e.g. "Warrior Lv 10") and can't be picked,
   * so players see what their habits would unlock. `icon`: the Path's symbol, beside the choice.
   */
  choices?: { label: string; then: () => void; locked?: string; icon?: SFSymbol }[];
};

type Props = {
  dialogue: Dialogue;
  onClose: () => void;
  /** Each question the player asks, as its answer starts (for the lore journal). */
  onAsk?: (question: Question) => void;
};

/**
 * An RPG dialogue window along the bottom of the World. Tap anywhere to finish
 * the line being typed, then again for the next; the last tap closes it. If
 * the speaker can be asked things, their lines end in a menu of questions:
 * each answer plays, then the menu comes back until you say Goodbye (and they
 * say their `farewell`, if they have one).
 */
export function DialogueBox({ dialogue, onClose, onAsk }: Props) {
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState(dialogue.lines);
  /** Bumped per answer, so the typewriter starts fresh even at line 0. */
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const [skip, setSkip] = useState(false);
  const [asking, setAsking] = useState(false);
  /** Goodbye was said and they're answering it: the last tap closes, no menu. */
  const [parting, setParting] = useState(false);
  // A line can hand the box to someone else: "VARGA: …" shows Varga, in her voice.
  const said = splitSpeaker(lines[index] ?? '');
  const line = said.text;
  const speaker = said.speaker ?? dialogue.speaker;
  const sprite = said.sprite ?? dialogue.sprite ?? portraitFor(dialogue.speaker);
  const voice = voiceFor(speaker, sprite);
  const [lift, setLift] = useState(false);
  const shouted = useMemo(() => isShouted(line), [line]);
  // Loud words ("the crowd roars") buzz as they're typed; `felt` counts how many have gone off this line.
  const rumbles = useMemo(() => rumblesIn(line), [line]);
  const felt = useRef(0);
  // A fresh count for each new line (and each answer, which can restart at line 0).
  useEffect(() => {
    felt.current = 0;
  }, [round, index]);
  const feelRumbles = useCallback(
    (upTo: number) => {
      // One step at a time: a ref bumped mid-expression (`rumbles[felt.current++]`) can be
      // reordered by the React Compiler and read past the end, which crashed Kaldor's speech.
      for (;;) {
        const next = rumbles[felt.current];
        if (!next || next.at > upTo) return;
        felt.current += 1;
        haptics.rumble(next.kind);
      }
    },
    [rumbles],
  );
  // Narration (no speaker) stays silent with a faint click per letter; people blip every
  // other letter, buzz in their own voice, and bob as they talk.
  const onLetter = useCallback(
    (i: number) => {
      feelRumbles(i);
      if (!speaker) return haptics.tick();
      if (i % 2 !== 0) return;
      playSound(`blip${voice}`);
      haptics.speak(voice, shouted);
      setLift((l) => !l);
    },
    [speaker, voice, shouted, feelRumbles],
  );
  // Skipped to the end (or Reduce Motion): the line's first loud word still lands, once.
  const onTyped = useCallback(() => {
    if (felt.current === 0 && rumbles.length > 0) feelRumbles(rumbles[0].at);
    setTyped(true);
  }, [rumbles, feelRumbles]);
  const last = index === lines.length - 1;
  const questions = parting ? [] : (dialogue.questions ?? []);
  const choices = parting ? [] : (dialogue.choices ?? []);

  const advance = () => {
    if (!typed) {
      setSkip(true);
      return;
    }
    haptics.select();
    if (last) {
      if (questions.length > 0 || choices.length > 0) setAsking(true);
      else onClose();
      return;
    }
    setIndex((i) => i + 1);
    setTyped(false);
    setSkip(false);
  };

  /** Plays `next` from its first line, in place of the menu. */
  const say = (next: string[]) => {
    setLines(next);
    setRound((r) => r + 1);
    setIndex(0);
    setTyped(false);
    setSkip(false);
    setAsking(false);
  };

  // Picking an option clicks (a question, a choice or Goodbye); moving on to the next line doesn't.
  const ask = (question: Question) => {
    playSound('select');
    haptics.select();
    onAsk?.(question);
    say(question.answer);
  };

  const place = {
    left: Math.max(insets.left, spacing.xl) + 120,
    right: Math.max(insets.right, spacing.xl) + 120,
    bottom: Math.max(insets.bottom, spacing.lg),
  };

  if (asking) {
    // Catches stray taps so they don't reach the World underneath.
    return (
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true}>
        <View style={[styles.window, place]} accessibilityViewIsModal>
          {speaker && <Text style={styles.speaker}>{speaker}</Text>}
          {questions.map((q) => (
            <Choice key={q.ask} label={q.ask} onPress={() => ask(q)} />
          ))}
          {choices.map((c) => (
            <Choice
              key={c.label}
              label={c.label}
              locked={c.locked}
              icon={c.icon}
              onPress={() => {
                playSound('select');
                haptics.select();
                onClose();
                c.then();
              }}
            />
          ))}
          {choices.length === 0 && (
            <Choice
              label="Goodbye."
              onPress={() => {
                playSound('select');
                haptics.select();
                if (!dialogue.farewell?.length) return onClose();
                setParting(true);
                say(dialogue.farewell);
              }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={advance}
      accessibilityRole="button"
      accessibilityLabel={`${speaker ? `${speaker}: ` : ''}${line}`}
      accessibilityHint={
        last ? (questions.length > 0 ? 'Shows what you can ask' : 'Closes the conversation') : 'Next line'
      }>
      <View style={[styles.window, styles.row, place]}>
        {sprite && <Portrait sprite={sprite} lift={lift && !typed} />}
        <View style={styles.words}>
          {speaker && <Text style={styles.speaker}>{speaker}</Text>}
          <TypewriterText
            key={`${round}-${index}`}
            text={line}
            instant={skip}
            style={styles.text}
            onDone={onTyped}
            onLetter={onLetter}
            ticks={false}
          />
        </View>
        {typed && <Text style={styles.more}>{last && questions.length === 0 && choices.length === 0 ? '■' : '▼'}</Text>}
      </View>
    </Pressable>
  );
}

/** One thing to say, with the heart cursor from the tab bar beside it while pressed. */
function Choice({
  label,
  onPress,
  locked,
  icon,
}: {
  label: string;
  onPress: () => void;
  locked?: string;
  icon?: SFSymbol;
}) {
  const mark = icon && (
    <SymbolView name={icon} size={14} tintColor={locked ? colors.textFaint : colors.accent} style={styles.icon} />
  );
  if (locked)
    return (
      <View
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={`${label}. Locked: needs ${locked}`}
        style={styles.choice}>
        <Text style={[styles.cursor, styles.cursorIdle]}>🔒</Text>
        {mark}
        <Text style={[styles.text, styles.choiceLocked]}>
          {label} <Text style={styles.lockNeed}>({locked})</Text>
        </Text>
      </View>
    );
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4} style={styles.choice}>
      {({ pressed }) => (
        <>
          <Text style={[styles.cursor, !pressed && styles.cursorIdle]}>♥</Text>
          {mark}
          <Text style={[styles.text, pressed && styles.choicePressed]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  window: {
    ...windowStyle,
    position: 'absolute',
    minHeight: 96,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  words: { flex: 1, gap: spacing.xs },
  speaker: { color: colors.accent, fontFamily: fonts.bold, fontSize: 20 },
  text: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  cursor: { color: colors.accent, fontSize: 14, width: 16 },
  cursorIdle: { color: colors.textFaint },
  choicePressed: { color: colors.accent },
  icon: { width: 14, height: 14 },
  choiceLocked: { color: colors.textFaint, flexShrink: 1 },
  lockNeed: { color: colors.textFaint, fontSize: 13 },
  more: { position: 'absolute', right: spacing.md, bottom: spacing.sm, color: colors.accent, fontSize: 12 },
});
