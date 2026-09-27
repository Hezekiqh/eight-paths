import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Props = {
  value: Dimension | undefined;
  onChange: (dimension: Dimension | undefined) => void;
  /** Tapping the picked class again clears it. */
  optional?: boolean;
};

/** The eight classes as wrapping chips, for picking a quest's or goal's Path. */
export function ClassChips({ value, onChange, optional = false }: Props) {
  return (
    <View style={styles.chips}>
      {DIMENSIONS.map((d) => {
        const c = CLASSES[d];
        const selected = d === value;
        return (
          <Pressable
            key={d}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              haptics.select();
              onChange(selected && optional ? undefined : d);
            }}
            style={[styles.chip, selected && { borderColor: c.color, backgroundColor: colors.cardRaised }]}>
            <SymbolView name={c.symbol} tintColor={c.color} size={18} />
            <Text style={[styles.chipText, selected && { color: c.color }]}>{c.className}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...windowStyle,
  },
  chipText: { color: colors.text, fontSize: 20, fontFamily: fonts.semibold },
});
