import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestView } from '@/store/selectors';
import { FRAME, colors, fonts, radius, spacing, windowStyle } from '@/theme';

type Props = {
  view: QuestView;
  onPress: () => void;
  pinned?: boolean;
  /** Name the quest's Path on the card, for lists that aren't grouped by Path. */
  showPath?: boolean;
};

export function QuestCard({ view, onPress, pinned, showPath }: Props) {
  const { quest, info, done, streak } = view;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pinned && { borderColor: info.color },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={[styles.check, { borderColor: info.color }, done && { backgroundColor: info.color }]}>
        {done && <SymbolView name="heart.fill" tintColor={colors.background} size={15} />}
      </View>
      <View style={styles.body}>
        {pinned && <Text style={[styles.pinned, { color: info.color }]}>PINNED QUEST</Text>}
        {showPath && !pinned && <Text style={[styles.path, { color: info.color }]}>{info.className.toUpperCase()}</Text>}
        <Text style={[styles.title, done && styles.done]}>{quest.title}</Text>
        {(pinned || streak > 0) && (
          <Text style={styles.meta}>
            {[pinned && info.className, streak > 0 && `${streak}-day streak`].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <SymbolView name={info.symbol} tintColor={info.color} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...windowStyle,
    padding: spacing.lg,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: FRAME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  path: { fontSize: 13, fontFamily: fonts.bold, letterSpacing: 1.2 },
  pinned: { fontSize: 14, fontFamily: fonts.bold, letterSpacing: 1 },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.semibold },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
});
