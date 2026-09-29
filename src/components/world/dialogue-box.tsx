import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TypewriterText } from '@/components/typewriter-text';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

export type Dialogue = { speaker?: string; lines: string[] };

type Props = {
  dialogue: Dialogue;
  onClose: () => void;
};

/**
 * An RPG dialogue window along the bottom of the World. Tap anywhere to finish
 * the line being typed, then again for the next; the last tap closes it.
 */
export function DialogueBox({ dialogue, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const [skip, setSkip] = useState(false);
  const line = dialogue.lines[index];
  const last = index === dialogue.lines.length - 1;

  const advance = () => {
    if (!typed) {
      setSkip(true);
      return;
    }
    haptics.select();
    if (last) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
    setTyped(false);
    setSkip(false);
  };

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={advance}
      accessibilityRole="button"
      accessibilityLabel={`${dialogue.speaker ? `${dialogue.speaker}: ` : ''}${line}`}
      accessibilityHint={last ? 'Closes the conversation' : 'Next line'}>
      <View
        style={[
          styles.window,
          {
            left: Math.max(insets.left, spacing.xl) + 120,
            right: Math.max(insets.right, spacing.xl) + 120,
            bottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}>
        {dialogue.speaker && <Text style={styles.speaker}>{dialogue.speaker}</Text>}
        <TypewriterText key={index} text={line} instant={skip} style={styles.text} onDone={() => setTyped(true)} />
        {typed && <Text style={styles.more}>{last ? '■' : '▼'}</Text>}
      </View>
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
  more: { position: 'absolute', right: spacing.md, bottom: spacing.sm, color: colors.accent, fontSize: 12 },
});
