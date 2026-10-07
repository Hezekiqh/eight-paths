import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Button } from '@/components/button';
import { HpBar } from '@/components/player-card';
import { REGULATOR_COLOR, REGULATOR_PITCH } from '@/components/regulator-row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { SettingsRow } from '@/components/settings-row';
import { addDays } from '@/game';
import {
  CLEAN_DAY_BONUS,
  DAILY_DRAIN_CAP,
  DAILY_RESTORE_CAP,
  HP_PER_HABIT,
  MAX_HP,
  POTION_BELOW,
  POTION_TO,
  REGEN_PER_HOUR,
  stimulusCost,
} from '@/game/regulator';
import { haptics } from '@/haptics';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { useHp, useSurveyDue, useTrackedStimuli } from '@/regulator/hooks';
import { MODES, MODE_HINTS } from '@/regulator/modes';
import { useRegulator } from '@/regulator/store';
import { useToday } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** The Dopamine Regulator's own screen, pushed from Stats. Everything here stays on this phone. */
export default function DopamineRegulatorScreen() {
  const today = useToday();
  const premium = usePremium((s) => s.premium);
  const enabled = useRegulator((s) => s.enabled);
  const onboarded = useRegulator((s) => s.onboarded);
  const mode = useRegulator((s) => s.mode);
  const reports = useRegulator((s) => s.reports);
  const setEnabled = useRegulator((s) => s.setEnabled);
  const setMode = useRegulator((s) => s.setMode);
  const reset = useRegulator((s) => s.reset);
  const stimuli = useTrackedStimuli();
  const { hp, todayRestore, streaks } = useHp(today);
  const due = useSurveyDue(today);
  const [mathOpen, setMathOpen] = useState(false);

  const yesterday = addDays(today, -1);

  const confirmErase = () => {
    haptics.tap();
    Alert.alert(
      'Erase the Regulator?',
      "Your super stimuli, check-ins and Health Points are erased from this phone, and it's switched off. Your habits and the rest of the game are untouched. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase', style: 'destructive', onPress: reset },
      ],
    );
  };

  if (!premium) {
    return (
      <Screen>
        <BackHeader title="Dopamine Regulator" back="Stats" color={REGULATOR_COLOR} />
        <View style={styles.card}>
          <Text style={styles.body}>{REGULATOR_PITCH}</Text>
        </View>
        {premiumEnabled && (
          <Button title="See Premium" color={REGULATOR_COLOR} onPress={() => router.push('/paywall')} />
        )}
      </Screen>
    );
  }

  if (!onboarded) {
    return (
      <Screen>
        <BackHeader title="Dopamine Regulator" back="Stats" color={REGULATOR_COLOR} />
        <View style={styles.card}>
          <Text style={styles.label}>OFF</Text>
          <Text style={styles.body}>
            Track the super stimuli that pull at you, and watch what they cost in Health Points. Keep your habits to win
            them back. Awareness, not shame: a slip is data, not a verdict.
          </Text>
          <Text style={styles.small}>
            Everything you enter stays on this phone. It is never backed up or sent anywhere.
          </Text>
        </View>
        <Button title="Turn it on" color={REGULATOR_COLOR} onPress={() => router.push('/regulator-intro')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Dopamine Regulator" back="Stats" color={REGULATOR_COLOR} />

      <View style={styles.list}>
        <SettingsRow
          icon="potion"
          iconColor={REGULATOR_COLOR}
          title={enabled ? 'On' : 'Off'}
          subtitle={
            enabled ? 'Health Points show on Today and Stats' : 'Paused. Nothing is lost; turn it back on any time.'
          }
          accessory={
            <Switch
              value={enabled}
              onValueChange={(on) => {
                haptics.select();
                setEnabled(on);
              }}
              trackColor={{ true: REGULATOR_COLOR }}
            />
          }
        />
      </View>

      {enabled && (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>HEALTH POINTS</Text>
            <Text style={styles.big}>
              {hp}
              <Text style={styles.bigOf}> / {MAX_HP}</Text>
            </Text>
            <HpBar hp={hp} height={14} />
            <Text style={styles.small}>
              {todayRestore > 0
                ? `+${todayRestore} HP from habits today${todayRestore >= DAILY_RESTORE_CAP ? ' (the most a day gives)' : ''}.`
                : `Each habit you keep today gives back ${HP_PER_HABIT} HP.`}{' '}
              {hp < MAX_HP ? `Climbing ${REGEN_PER_HOUR} HP an hour, even while you sleep.` : ''}
            </Text>
            <Text style={styles.small}>
              Clean-day streak: {streaks.current} {streaks.current === 1 ? 'day' : 'days'} · best {streaks.best}
            </Text>
          </View>

          {due ? (
            <Button title="Morning check-in" color={REGULATOR_COLOR} onPress={() => router.push('/regulator-survey')} />
          ) : (
            <View style={styles.list}>
              <SettingsRow
                icon="script"
                iconColor={REGULATOR_COLOR}
                title={reports[yesterday] ? "Yesterday's check-in is done" : 'Next check-in tomorrow morning'}
                subtitle={reports[yesterday] ? 'Tap to change your answer' : 'It asks about today, once today is over'}
                onPress={
                  reports[yesterday]
                    ? () => router.push({ pathname: '/regulator-survey', params: { date: yesterday } })
                    : undefined
                }
              />
            </View>
          )}
        </>
      )}

      <Text style={styles.section}>MODE</Text>
      <View style={[styles.card, styles.tight]}>
        <Segmented options={MODES} value={mode} onChange={setMode} color={REGULATOR_COLOR} />
        <Text style={styles.small}>{MODE_HINTS[mode]}</Text>
      </View>

      <Text style={styles.section}>YOUR SUPER STIMULI</Text>
      <View style={styles.list}>
        {stimuli.length === 0 && <Text style={[styles.small, styles.pad]}>None picked yet.</Text>}
        {stimuli.map((s) => (
          <View key={s.id} style={styles.stimulus}>
            <Text style={styles.stimulusName}>{s.name}</Text>
            <Text style={styles.stimulusCost}>−{stimulusCost(s.severity)} HP</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <SettingsRow
          icon="repeat"
          iconColor={REGULATOR_COLOR}
          title="Change super stimuli"
          onPress={() => router.push({ pathname: '/regulator-intro', params: { start: 'select' } })}
        />
      </View>

      <View style={styles.list}>
        <SettingsRow
          icon="calendar"
          iconColor={REGULATOR_COLOR}
          title="Slip calendar"
          subtitle="Clean days, slip days and streaks, month by month"
          onPress={() => router.push('/journey/slip-calendar')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: mathOpen }}
        onPress={() => {
          haptics.select();
          setMathOpen((o) => !o);
        }}
        style={styles.card}>
        <Text style={styles.label}>HOW THE BAR WORKS {mathOpen ? '▲' : '▼'}</Text>
        {mathOpen && (
          <Text style={styles.body}>
            {`You start at ${MAX_HP}. Each super stimulus costs its strength × 2 in Health Points${mode === 'hard' ? ', for every time' : ''}, taken when you check in. A single day never costs more than ${DAILY_DRAIN_CAP}.\n\nThe bar climbs back ${REGEN_PER_HOUR} HP every hour on its own, sleep included: a night's rest is worth 16 or more. Every habit you keep gives back ${HP_PER_HABIT}, up to ${DAILY_RESTORE_CAP} a day, and a clean day adds ${CLEAN_DAY_BONUS}.\n\nIf you ever fall below ${POTION_BELOW}, the Keeper hands you a potion that brings you back to ${POTION_TO}.`}
          </Text>
        )}
      </Pressable>

      <View style={styles.list}>
        <SettingsRow
          icon="trash"
          iconColor={colors.danger}
          title="Erase Regulator data"
          subtitle="Only what's here. Your habits and game stay."
          onPress={confirmErase}
        />
      </View>
      <Text style={styles.privacy}>
        Your Dopamine Regulator stays on this phone. It is never backed up, synced or sent anywhere.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...windowStyle, padding: spacing.lg, gap: spacing.sm },
  tight: { padding: spacing.md },
  list: { ...windowStyle, overflow: 'hidden' },
  pad: { padding: spacing.lg },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1 },
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.sm },
  big: { color: colors.text, fontFamily: fonts.bold, fontSize: 52, fontVariant: ['tabular-nums'] },
  bigOf: { color: colors.textMuted, fontSize: 26 },
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  small: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  stimulus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stimulusName: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, flex: 1 },
  stimulusCost: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 17, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  privacy: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
});
