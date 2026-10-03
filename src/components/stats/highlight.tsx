import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CLASSES, type Dimension } from '@/game';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Props = {
  /** "MOST IMPROVED" */
  title: string;
  icon: SFSymbol;
  /** The Path it's about, or null when there's nothing to say yet. */
  dimension: Dimension | null;
  /** The figure, e.g. "+32 pts". */
  figure?: string;
  /** One line under it. */
  detail: string;
};

/** One thing worth pointing out about the player's Paths, in that Path's colour. */
export function Highlight({ title, icon, dimension, figure, detail }: Props) {
  const info = dimension ? CLASSES[dimension] : null;
  const color = info?.color ?? colors.textFaint;
  return (
    <View style={[styles.card, { borderLeftColor: color }]} accessible accessibilityLabel={`${title}: ${info ? info.className : ''} ${figure ?? ''}. ${detail}`}>
      <View style={styles.top}>
        <SymbolView name={icon} tintColor={color} size={14} />
        <Text style={[styles.title, { color }]}>{title}</Text>
      </View>
      <View style={styles.middle}>
        {info ? (
          <>
            <SymbolView name={info.symbol} tintColor={info.color} size={20} />
            <Text style={styles.name}>{info.className}</Text>
            <Text style={styles.path}>{info.dimensionLabel}</Text>
          </>
        ) : (
          <Text style={styles.waiting}>Not yet</Text>
        )}
        {figure ? <Text style={[styles.figure, { color }]}>{figure}</Text> : null}
      </View>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...windowStyle, borderLeftWidth: 6, padding: spacing.md, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1 },
  middle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  path: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  waiting: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 18 },
  figure: { marginLeft: 'auto', fontFamily: fonts.bold, fontSize: 22, fontVariant: ['tabular-nums'] },
  detail: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
