import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClassGrid } from '@/components/class-grid';
import { ModalHeader } from '@/components/modal-header';
import { CLASSES, type Dimension } from '@/game';
import { useGameStore } from '@/store';
import { usePlayer } from '@/store/hooks';
import { colors, spacing } from '@/theme';

export default function ChangeClass() {
  const player = usePlayer();
  const changeClass = useGameStore((s) => s.changeClass);
  const [selected, setSelected] = useState<Dimension | null>(player?.classDimension ?? null);

  if (!player) return null;
  const color = selected ? CLASSES[selected].color : colors.grid;

  const save = () => {
    if (selected) changeClass(selected);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ModalHeader
        title="Change class"
        actionLabel="Save"
        onAction={save}
        actionDisabled={!selected || selected === player.classDimension}
        color={color}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          Your new class earns +25% XP from now on. Past XP, levels and streaks stay exactly as they are.
        </Text>
        <ClassGrid selected={selected} onSelect={setSelected} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
});
