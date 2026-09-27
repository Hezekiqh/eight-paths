import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

type Props = {
  title: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  color: string;
};

/** Cancel · title · action, for screens presented as modals. */
export function ModalHeader({ title, actionLabel, onAction, actionDisabled, color }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: actionDisabled }}
        disabled={actionDisabled}
        onPress={onAction}
        hitSlop={12}>
        <Text style={[styles.action, { color }, actionDisabled && styles.disabled]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 17 },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.bold },
  action: { fontSize: 22, fontFamily: fonts.bold },
  disabled: { opacity: 0.35 },
});
