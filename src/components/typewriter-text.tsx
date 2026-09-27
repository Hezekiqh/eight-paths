import { useEffect, useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { haptics } from '@/haptics';

/** Milliseconds per letter, and the extra beat after punctuation. */
const LETTER_MS = 28;
const PAUSES: Record<string, number> = { '.': 260, '!': 260, '?': 260, ',': 120, ':': 160, ';': 160 };

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Hold at zero letters until this turns true, to chain one line after another. */
  start?: boolean;
  /** Show everything at once (the player tapped to skip). */
  instant?: boolean;
  onDone?: () => void;
};

/**
 * Types `text` out a letter at a time, pausing on punctuation, like an RPG
 * dialogue box. The untyped rest is laid out but transparent, so the box never
 * grows and words never jump lines mid-type. Reduce Motion shows it all at once.
 */
export function TypewriterText({ text, style, start = true, instant = false, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const all = instant || reduceMotion;
  const count = all ? text.length : shown;
  const done = count >= text.length;

  useEffect(() => {
    if (all || !start || shown >= text.length) return;
    const delay = LETTER_MS + (PAUSES[text[shown - 1]] ?? 0);
    const id = setTimeout(() => {
      // A tiny click per letter, like a dialogue blip; spaces stay silent for rhythm.
      if (text[shown].trim()) haptics.tick();
      setShown((n) => n + 1);
    }, shown === 0 ? 0 : delay);
    return () => clearTimeout(id);
  }, [all, start, shown, text]);

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  return (
    <Text style={style} accessibilityLabel={text}>
      {text.slice(0, count)}
      <Text style={styles.untyped}>{text.slice(count)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  untyped: { color: 'transparent' },
});
