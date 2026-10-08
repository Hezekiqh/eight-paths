import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PixelIcon } from '@/components/pixel-icon';
import { HpBar } from '@/components/player-card';
import { REGULATOR_COLOR } from '@/components/regulator-row';
import { TypewriterText } from '@/components/typewriter-text';
import { addDays } from '@/game';
import {
  BUILT_IN_STIMULI,
  CUSTOM_NOTE,
  MAX_HP,
  DEFAULT_STIMULI,
  PHONE_CHECK,
  STIMULUS_NOTES,
  stimulusCost,
  type RegulatorMode,
  type Stimulus,
} from '@/game/regulator';
import { haptics } from '@/haptics';
import { MODE_HINTS } from '@/regulator/modes';
import { allStimuli, useRegulator } from '@/regulator/store';
import { usePlayer, useToday } from '@/store/hooks';
import { FRAME, colors, fonts, radius, spacing, windowStyle } from '@/theme';

type Step = 'keeper' | 'ranking' | 'select' | 'confirm' | 'summary' | 'mode';

/** The Keeper's introduction: your Dopamine Baseline, what a spike does to it, and how the Regulator keeps it steady. */
const KEEPER_LINES = [
  'Ah, {name}. You found the Regulator. Few do. Let me tell you how it works.',
  'Each of us has a Dopamine Baseline: the steady level beneath the whole day. It is what lets ordinary things feel good.',
  'Some pleasures lift you far above it, all at once. I call them super stimuli. Afterwards, your baseline settles a little lower while it recovers.',
  'Think of your Dopamine Baseline as your health and energy in the real world. Your HP bar shows where it sits, and the Regulator helps you keep it steady.',
  'Each morning, tell me what spiked yesterday. Every habit you keep lifts it again. It all stays here, on this phone.',
];

const close = () => (router.canGoBack() ? router.back() : router.replace('/regulator'));

/**
 * Switching on the Dopamine Regulator: the Keeper explains, the super stimuli
 * are ranked by strength, the player picks
 * their super stimuli (and names their own), checks the list, learns what
 * each one does, picks a mode, and answers the first check-in. Opened with
 * `start=select`, it just changes the list.
 */
export default function RegulatorIntro() {
  const params = useLocalSearchParams<{ start?: string }>();
  const editing = params.start === 'select';
  const today = useToday();
  const player = usePlayer();
  const selected = useRegulator((s) => s.selected);
  const custom = useRegulator((s) => s.custom);
  const mode = useRegulator((s) => s.mode);
  const { setSelected, addCustom, removeCustom, setMode, finishOnboarding } = useRegulator.getState();
  const [step, setStep] = useState<Step>(editing ? 'select' : 'keeper');
  // Padded by hand: SafeAreaView reads no insets inside this full-screen modal.
  const insets = useSafeAreaInsets();

  const picked = allStimuli(custom).filter((s) => selected.includes(s.id));

  const finish = () => {
    haptics.success();
    if (editing) return close();
    // Counting starts now; the first check-in is about yesterday.
    finishOnboarding(addDays(today, -1));
    router.replace('/regulator-survey');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
          <Text style={styles.cancel}>{editing ? 'Cancel' : 'Not now'}</Text>
        </Pressable>
      </View>
      {step === 'keeper' && <KeeperIntro name={player?.name ?? 'traveller'} onDone={() => setStep('ranking')} />}
      {step === 'ranking' && <RankingStep onNext={() => setStep('select')} />}
      {step === 'select' && (
        <SelectStep
          selected={selected}
          custom={custom}
          onToggle={(id) => {
            haptics.select();
            setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
          }}
          onAdd={addCustom}
          onRemove={removeCustom}
          onNext={() => setStep('confirm')}
        />
      )}
      {step === 'confirm' && (
        <ConfirmStep picked={picked} onYes={() => setStep('summary')} onBack={() => setStep('select')} />
      )}
      {step === 'summary' && (
        <SummaryStep picked={picked} last={editing} onNext={editing ? finish : () => setStep('mode')} />
      )}
      {step === 'mode' && <ModeStep mode={mode} onChange={setMode} onNext={finish} />}
    </View>
  );
}

/** The Keeper speaks, a line at a time. Tap to hurry a line, then to go on. */
function KeeperIntro({ name, onDone }: { name: string; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(false);
  const [instant, setInstant] = useState(false);
  const line = KEEPER_LINES[index].replace('{name}', name);
  const last = index === KEEPER_LINES.length - 1;

  const onTap = () => {
    if (!typed) return setInstant(true);
    haptics.select();
    if (last) return onDone();
    setIndex(index + 1);
    setTyped(false);
    setInstant(false);
  };

  return (
    <Pressable
      style={styles.keeperWrap}
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={`${line} Tap to continue.`}>
      {/* What he's describing, above him: the baseline as an HP bar. */}
      <View style={styles.scene}>
        <PixelIcon name="potion" color={REGULATOR_COLOR} size={96} />
        <Text style={styles.sceneTitle}>DOPAMINE REGULATOR</Text>
        <View style={styles.sceneBar}>
          <HpBar hp={MAX_HP} height={14} />
          <Text style={styles.sceneCaption}>Your Dopamine Baseline</Text>
        </View>
      </View>
      <View style={styles.dialogue}>
        <Text style={styles.speaker}>THE KEEPER</Text>
        <TypewriterText
          key={index}
          text={line}
          letterMs={28}
          instant={instant}
          onDone={() => setTyped(true)}
          style={styles.line}
        />
        <Text style={[styles.more, !typed && styles.hidden]}>
          {last ? 'Tap to begin  ▶' : `${index + 1}/${KEEPER_LINES.length}  ▼`}
        </Text>
      </View>
    </Pressable>
  );
}

/** Every built-in super stimulus, strongest first, before the player picks their own. */
function RankingStep({ onNext }: { onNext: () => void }) {
  const ranked = [...BUILT_IN_STIMULI].sort((a, b) => b.severity - a.severity);
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>The super stimuli, ranked</Text>
        <Text style={styles.hint}>
          Strongest first: how far each one lifts you above your Dopamine Baseline, and the HP it takes while your
          baseline settles back.
        </Text>
        <View style={styles.list}>
          {ranked.map((s, i) => (
            <View
              key={s.id}
              style={styles.rankRow}
              accessible
              accessibilityLabel={`${i + 1}. ${s.name}, strength ${s.severity} of 10, ${stimulusCost(s.severity)} HP`}>
              <Text style={styles.rankNumber}>{i + 1}</Text>
              <View style={styles.rankText}>
                <Text style={styles.listName}>{s.name}</Text>
                <View style={styles.strength}>
                  {Array.from({ length: 10 }, (_, n) => (
                    <View
                      key={n}
                      style={[styles.strengthCell, n < s.severity && { backgroundColor: REGULATOR_COLOR }]}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.listCost}>−{stimulusCost(s.severity)} HP</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Pick mine" color={REGULATOR_COLOR} onPress={onNext} />
      </View>
    </View>
  );
}

function SelectStep({
  selected,
  custom,
  onToggle,
  onAdd,
  onRemove,
  onNext,
}: {
  selected: string[];
  custom: Stimulus[];
  onToggle: (id: string) => void;
  onAdd: (name: string, severity: number) => Stimulus;
  onRemove: (id: string) => void;
  onNext: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState(5);

  const add = () => {
    if (!name.trim()) return;
    haptics.success();
    onAdd(name, severity);
    setName('');
    setSeverity(5);
    setAdding(false);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Select your super stimuli</Text>
        <Text style={styles.hint}>Pick every one that pulls at you. You can change these later.</Text>
        <View style={styles.chips}>
          {[...DEFAULT_STIMULI, ...custom].map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              on={selected.includes(s.id)}
              onPress={() => onToggle(s.id)}
              onLongPress={s.custom ? () => onRemove(s.id) : undefined}
            />
          ))}
          <Chip label="+ Add custom" on={false} dashed onPress={() => setAdding(true)} />
        </View>
        {custom.length > 0 && <Text style={styles.hint}>Hold one of your own to remove it.</Text>}

        <Text style={styles.subheading}>Also worth a check</Text>
        <View style={styles.chips}>
          <Chip
            label={PHONE_CHECK.name}
            on={selected.includes(PHONE_CHECK.id)}
            onPress={() => onToggle(PHONE_CHECK.id)}
          />
        </View>

        {adding && (
          <View style={styles.addCard}>
            <Text style={styles.label}>NAME IT</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Online shopping"
              placeholderTextColor={colors.textFaint}
              maxLength={40}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={add}
              style={styles.input}
            />
            <Text style={styles.label}>HOW STRONG IS ITS PULL? {severity} / 10</Text>
            <View style={styles.scale}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`Strength ${n}`}
                  accessibilityState={{ selected: n === severity }}
                  onPress={() => {
                    haptics.select();
                    setSeverity(n);
                  }}
                  style={[styles.scaleCell, n <= severity && { backgroundColor: REGULATOR_COLOR }]}>
                  <Text style={[styles.scaleText, n <= severity && { color: colors.background }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>Costs {stimulusCost(severity)} HP when it comes up.</Text>
            <View style={styles.addButtons}>
              <View style={styles.flex}>
                <Button title="Cancel" variant="ghost" color={colors.textMuted} onPress={() => setAdding(false)} />
              </View>
              <View style={styles.flex}>
                <Button title="Add" color={REGULATOR_COLOR} disabled={!name.trim()} onPress={add} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Next" color={REGULATOR_COLOR} disabled={selected.length === 0} onPress={onNext} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  on,
  dashed,
  onPress,
  onLongPress,
}: {
  label: string;
  on: boolean;
  dashed?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        on && { backgroundColor: REGULATOR_COLOR, borderColor: REGULATOR_COLOR },
        dashed && styles.chipDashed,
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={[styles.chipText, on && { color: colors.background }]}>
        {on ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

function ConfirmStep({ picked, onYes, onBack }: { picked: Stimulus[]; onYes: () => void; onBack: () => void }) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Are these all of them?</Text>
        <Text style={styles.hint}>Be honest with yourself. Nobody else will ever see this list.</Text>
        <View style={styles.list}>
          {picked.map((s) => (
            <View key={s.id} style={styles.listRow}>
              <Text style={styles.listName}>{s.name}</Text>
              <Text style={styles.listCost}>−{stimulusCost(s.severity)} HP</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, styles.footerStack]}>
        <Button title="Yes, that's all" color={REGULATOR_COLOR} onPress={onYes} />
        <Button title="Add more" variant="ghost" color={REGULATOR_COLOR} onPress={onBack} />
      </View>
    </View>
  );
}

function SummaryStep({ picked, last, onNext }: { picked: Stimulus[]; last: boolean; onNext: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>How each one affects you</Text>
        <Text style={styles.hint}>Tap one to learn more.</Text>
        {picked.map((s) => {
          const note = STIMULUS_NOTES[s.id] ?? CUSTOM_NOTE;
          const expanded = open === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => {
                haptics.select();
                setOpen(expanded ? null : s.id);
              }}
              style={styles.noteCard}>
              <View style={styles.noteTop}>
                <Text style={styles.noteName}>{s.name}</Text>
                <Text style={styles.listCost}>−{stimulusCost(s.severity)} HP</Text>
                <Text style={styles.caret}>{expanded ? '▲' : '▼'}</Text>
              </View>
              <Text style={styles.noteShort}>{note.short}</Text>
              {expanded && <Text style={styles.noteMore}>{note.more}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Button title={last ? 'Save' : 'Next'} color={REGULATOR_COLOR} onPress={onNext} />
      </View>
    </View>
  );
}

function ModeStep({
  mode,
  onChange,
  onNext,
}: {
  mode: RegulatorMode;
  onChange: (m: RegulatorMode) => void;
  onNext: () => void;
}) {
  const options: { value: RegulatorMode; title: string }[] = [
    { value: 'easy', title: 'Easy mode' },
    { value: 'hard', title: 'Hard mode' },
  ];
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Pick a mode</Text>
        <Text style={styles.hint}>You can switch any time.</Text>
        {options.map((o) => {
          const on = mode === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.select();
                onChange(o.value);
              }}
              style={[styles.modeCard, on && { borderColor: REGULATOR_COLOR }]}>
              <Text style={[styles.noteName, on && { color: REGULATOR_COLOR }]}>
                {on ? '▶︎ ' : ''}
                {o.title}
              </Text>
              <Text style={styles.noteShort}>{MODE_HINTS[o.value]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Start my first check-in" color={REGULATOR_COLOR} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'flex-start' },
  cancel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 17 },
  content: { padding: spacing.lg, gap: spacing.md },
  footer: { padding: spacing.lg },
  footerStack: { gap: spacing.md },
  heading: { color: colors.text, fontFamily: fonts.bold, fontSize: 32 },
  subheading: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1.2,
    marginTop: spacing.sm,
  },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  keeperWrap: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  sceneTitle: { color: REGULATOR_COLOR, fontFamily: fonts.bold, fontSize: 24, letterSpacing: 2 },
  sceneBar: { alignSelf: 'stretch', gap: spacing.xs, paddingHorizontal: spacing.lg },
  sceneCaption: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, textAlign: 'center' },
  dialogue: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#07060B',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  speaker: { color: '#FFD27A', fontFamily: fonts.bold, fontSize: 18, letterSpacing: 2 },
  line: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 26 },
  more: { color: '#8A86A0', fontFamily: fonts.regular, fontSize: 12, textAlign: 'right' },
  hidden: { opacity: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: FRAME - 1,
    borderColor: colors.frame,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipDashed: { borderStyle: 'dashed', borderColor: REGULATOR_COLOR },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  addCard: { ...windowStyle, padding: spacing.lg, gap: spacing.sm },
  input: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 17,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  scale: { flexDirection: 'row', gap: 3 },
  scaleCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderRadius: 2,
  },
  scaleText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
  addButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  list: { ...windowStyle, paddingVertical: spacing.sm },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rankNumber: {
    width: 22,
    color: REGULATOR_COLOR,
    fontFamily: fonts.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  rankText: { flex: 1, gap: 4 },
  strength: { flexDirection: 'row', gap: 2 },
  strengthCell: { flex: 1, maxWidth: 14, height: 6, backgroundColor: colors.cardRaised },
  listRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  listName: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 17 },
  listCost: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  noteCard: { ...windowStyle, padding: spacing.lg, gap: spacing.xs },
  noteTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noteName: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  caret: { color: colors.textMuted, fontSize: 13 },
  noteShort: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  noteMore: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  modeCard: { ...windowStyle, padding: spacing.lg, gap: spacing.xs },
});
