import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
};

export function Button({ title, onPress, color = colors.grid, disabled, variant = 'solid' }: Props) {
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        solid ? { backgroundColor: color } : { borderColor: color, borderWidth: 1.5 },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
      ]}>
      <Text style={[styles.label, { color: solid ? colors.background : color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  label: { fontSize: 17, fontWeight: '700' },
});
