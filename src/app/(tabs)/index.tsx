import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/theme';

export default function TodayScreen() {
  return (
    <Screen title="Today">
      <Text style={styles.placeholder}>Radar and today&apos;s quests arrive in milestone 4.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: { color: colors.textMuted, fontSize: 15 },
});
