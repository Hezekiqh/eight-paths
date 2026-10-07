import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Props = {
  /** What the gate needs and where you stand (gate-guards.ts gatePrompt). */
  text: string;
  onPremium: () => void;
  onClose: () => void;
};

/**
 * A short sheet after a guard turns you back at a level gate (author, Oct 7, 2026): how far off you are,
 * and that Premium lifts it. Drawn like the World's own windows (the dialogue box, the pause menu), at the
 * bottom, clear of the notch and the home bar whichever way the phone is turned.
 */
export function GateSheet({ text, onPremium, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    // Catches stray taps so they don't reach the World underneath.
    <View
      style={[
        styles.scrim,
        {
          paddingLeft: Math.max(insets.left, spacing.xl),
          paddingRight: Math.max(insets.right, spacing.xl),
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}
      onStartShouldSetResponder={() => true}>
      <View style={styles.window} accessibilityViewIsModal>
        <Text style={styles.text}>{text}</Text>
        <View style={styles.row}>
          <Item label="See Premium" primary onPress={onPremium} />
          <Item label="I'll do my habits" onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

function Item({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.item, primary && styles.itemPrimary, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.itemLabel, primary && styles.itemLabelPrimary]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 5, 10, 0.55)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  window: {
    ...windowStyle,
    width: '100%',
    maxWidth: 560,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  text: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  item: {
    flex: 1,
    borderWidth: 3,
    borderColor: colors.frame,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPrimary: { backgroundColor: colors.accent },
  itemLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1, textAlign: 'center' },
  itemLabelPrimary: { color: colors.background },
});
