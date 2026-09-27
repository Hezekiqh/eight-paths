import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestView } from '@/store/selectors';
import { colors, radius, spacing } from '@/theme';

type Props = {
  view: QuestView;
  onPress: () => void;
  pinned?: boolean;
};

export function QuestCard({ view, onPress, pinned }: Props) {
  const { quest, info, done, streak } = view;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pinned && { borderColor: info.color, borderWidth: 1.5 },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={[styles.check, { borderColor: info.color }, done && { backgroundColor: info.color }]}>
        {done && <SymbolView name="checkmark" tintColor={colors.background} size={16} weight="bold" />}
      </View>
      <View style={styles.body}>
        {pinned && <Text style={[styles.pinned, { color: info.color }]}>PINNED QUEST</Text>}
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
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  pinned: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { color: colors.textMuted, fontSize: 13 },
});
