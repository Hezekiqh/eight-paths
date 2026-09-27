import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ClassLore } from '@/components/class-lore';
import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Props = {
  selected: Dimension | null;
  onSelect: (dimension: Dimension) => void;
};

/** 2 × 4 grid of class cards, with the chosen class's lore underneath. */
export function ClassGrid({ selected, onSelect }: Props) {
  return (
    <>
      <View style={styles.grid}>
        {DIMENSIONS.map((d) => {
          const info = CLASSES[d];
          const isSelected = selected === d;
          return (
            <Pressable
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                haptics.select();
                onSelect(d);
              }}
              style={[styles.card, isSelected && { borderColor: info.color, backgroundColor: colors.cardRaised }]}>
              <SymbolView name={info.symbol} tintColor={info.color} size={30} />
              <Text style={[styles.className, isSelected && { color: info.color }]}>{info.className}</Text>
              <Text style={styles.epithet}>{info.epithet}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected && (
        <View style={[styles.lore, { borderColor: CLASSES[selected].color }]}>
          <ClassLore info={CLASSES[selected]} compact />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  card: {
    width: '48%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    ...windowStyle,
  },
  className: { color: colors.text, fontSize: 22, fontFamily: fonts.bold, marginTop: spacing.xs },
  epithet: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  lore: {
    marginTop: spacing.sm,
    ...windowStyle,
    padding: spacing.lg,
  },
});
