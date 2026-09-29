import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TypewriterText } from '@/components/typewriter-text';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import type { Question } from '@/world/maps';

export type Dialogue = {
  speaker?: string;
  lines: string[];
  questions?: Question[];
  /** Runs once the conversation closes (e.g. stepping through a door). */
  then?: () => void;
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
 * each answer plays, then the menu comes back until you say Goodbye.
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
  const line = lines[index];
  const last = index === lines.length - 1;
  const questions = dialogue.questions ?? [];

  const advance = () => {
    if (!typed) {
      setSkip(true);
      return;
    }
    haptics.select();
    if (last) {
      if (questions.length > 0) setAsking(true);
      else onClose();
      return;
    }
    setIndex((i) => i + 1);
    setTyped(false);
    setSkip(false);
  };

  const ask = (question: Question) => {
    haptics.select();
    onAsk?.(question);
    setLines(question.answer);
    setRound((r) => r + 1);
    setIndex(0);
    setTyped(false);
    setSkip(false);
    setAsking(false);
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
          {dialogue.speaker && <Text style={styles.speaker}>{dialogue.speaker}</Text>}
          {questions.map((q) => (
            <Choice key={q.ask} label={q.ask} onPress={() => ask(q)} />
          ))}
          <Choice
            label="Goodbye."
            onPress={() => {
              haptics.select();
              onClose();
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={advance}
      accessibilityRole="button"
      accessibilityLabel={`${dialogue.speaker ? `${dialogue.speaker}: ` : ''}${line}`}
      accessibilityHint={
        last ? (questions.length > 0 ? 'Shows what you can ask' : 'Closes the conversation') : 'Next line'
      }>
      <View style={[styles.window, place]}>
        {dialogue.speaker && <Text style={styles.speaker}>{dialogue.speaker}</Text>}
        <TypewriterText
          key={`${round}-${index}`}
          text={line}
          instant={skip}
          style={styles.text}
          onDone={() => setTyped(true)}
        />
        {typed && <Text style={styles.more}>{last && questions.length === 0 ? '■' : '▼'}</Text>}
      </View>
    </Pressable>
  );
}

/** One thing to say, with the heart cursor from the tab bar beside it while pressed. */
function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4} style={styles.choice}>
      {({ pressed }) => (
        <>
          <Text style={[styles.cursor, !pressed && styles.cursorIdle]}>♥</Text>
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
  speaker: { color: colors.accent, fontFamily: fonts.bold, fontSize: 20 },
  text: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  cursor: { color: colors.accent, fontSize: 14, width: 16 },
  cursorIdle: { color: colors.textFaint },
  choicePressed: { color: colors.accent },
  more: { position: 'absolute', right: spacing.md, bottom: spacing.sm, color: colors.accent, fontSize: 12 },
});
