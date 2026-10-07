import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  color: string;
};

export function Segmented<T extends string>({ options, value, onChange, color }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.select();
              onChange(o.value);
            }}
            style={styles.segment}>
            <View style={styles.labelRow}>
              {selected && <SymbolView name="heart.fill" tintColor={color} size={11} />}
              <Text style={[styles.label, selected && { color }]} numberOfLines={1} adjustsFontSizeToFit>{o.label.toUpperCase()}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    ...windowStyle,
    padding: 3,
  },
  segment: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: colors.textMuted, fontSize: 18, fontFamily: fonts.bold, letterSpacing: 1 },
});
