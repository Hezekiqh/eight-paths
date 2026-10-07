import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { ObjectivesPanel } from '@/components/world/objectives-panel';
import { haptics } from '@/haptics';
import { CLASSES } from '@/game';
import { COMPANIONS } from '@/story/companions';
import type { HeroId } from '@/world/hero';
import type { MapId } from '@/world/maps';
import type { ControlScheme } from '@/world/store';
import { PIECES_PER_HEART } from '@/world/items';
import { SPEED_HINTS, SPEEDS, type GameSpeed } from '@/world/speed';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** The two ways to walk, shared with the World menu's Settings. */
export const SCHEMES = [
  { value: 'joystick', label: 'Joystick' },
  { value: 'touchpad', label: 'Touch pad' },
] as const;

export const HINTS: Record<ControlScheme, string> = {
  joystick: 'Drag the stick at bottom left to walk. A talks and examines.',
  touchpad: 'Put your thumb down anywhere and drag to walk. Tap, or press A, to talk and examine.',
};

type Props = {
  map: MapId;
  mapName: string;
  controls: ControlScheme;
  onControls: (controls: ControlScheme) => void;
  /** How fast dialogue types and cutscenes play (speed.ts). */
  speed: GameSpeed;
  onSpeed: (speed: GameSpeed) => void;
  onResume: () => void;
  onOpenMap: () => void;
  onOpenBoard: () => void;
  /** The upright World menu: lore, objectives, what's coming. */
  onMenu: () => void;
  onLeave: () => void;
  /** Your party members who can walk the World, the one walking now, and swapping. */
  party: HeroId[];
  hero: HeroId;
  onSwap: (hero: HeroId) => void;
  /** The Satchel: heart pieces toward the next heart, hearts now, and key items (read one with onRead). */
  pieces: number;
  hearts: number;
  items: { id: string; name: string }[];
  onRead: (id: string) => void;
  /** Dev only: whether the fight bot plays, and switching it. */
  autopilot?: { on: boolean; toggle: () => void };
  /** Test builds only (world/test-tools.ts). */
  testTools?: { levels: boolean; walk: boolean; toggleLevels: () => void; toggleWalk: () => void };
};

type Tab = 'goals' | 'party' | 'settings';

const TABS: { value: Tab; label: string }[] = [
  { value: 'goals', label: 'Goals' },
  { value: 'party', label: 'Party' },
  { value: 'settings', label: 'Settings' },
];

/**
 * The World's pause menu. Left: one page at a time (what it takes to go on,
 * then the party and satchel, then controls and game speed), so the goals get the room. Right,
 * always in view: resume, the map, the Other World menu, and back to habits.
 */
export function PauseMenu({
  map,
  mapName,
  controls,
  onControls,
  speed,
  onSpeed,
  onResume,
  onOpenMap,
  onOpenBoard,
  onMenu,
  onLeave,
  party,
  hero,
  onSwap,
  pieces,
  hearts,
  items,
  onRead,
  autopilot,
  testTools,
}: Props) {
  const [tab, setTab] = useState<Tab>('goals');
  return (
    <View style={styles.scrim}>
      <View style={styles.window} accessibilityViewIsModal>
        <View style={styles.main}>
          <View style={styles.heading}>
            <Text style={styles.title}>PAUSED</Text>
            <Text style={styles.place} numberOfLines={1}>
              {mapName}
            </Text>
          </View>
          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
              const on = t.value === tab;
              return (
                <Pressable
                  key={t.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    if (on) return;
                    haptics.select();
                    setTab(t.value);
                  }}
                  style={[styles.tab, on && styles.tabOn]}>
                  <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            {tab === 'goals' && <ObjectivesPanel map={map} hero={hero} onOpenBoard={onOpenBoard} />}
            {tab === 'party' && (
              <>
                <Text style={styles.section}>WALKING AS</Text>
                <View style={styles.chips}>
                  {party.map((id) => {
                    const c = COMPANIONS[id];
                    const on = id === hero;
                    const color = CLASSES[c.dimension].color;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${c.name}, ${CLASSES[c.dimension].className}`}
                        onPress={() => {
                          if (on) return;
                          haptics.select();
                          onSwap(id);
                        }}
                        style={[styles.chip, on && { borderColor: color }]}>
                        <Text style={[styles.chipName, on && { color }]}>{c.name}</Text>
                        <Text style={styles.chipClass}>{CLASSES[c.dimension].className}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.section}>SATCHEL</Text>
                <View
                  style={styles.hearts}
                  accessible
                  accessibilityLabel={`${hearts} hearts. ${pieces} of ${PIECES_PER_HEART} pieces toward the next.`}>
                  {Array.from({ length: hearts }, (_, i) => (
                    <SymbolView key={i} name="heart.fill" tintColor={colors.accent} size={16} />
                  ))}
                  <Text style={styles.hint}>{`  Heart pieces ${pieces}/${PIECES_PER_HEART}`}</Text>
                </View>
                {items.length > 0 ? (
                  <View style={styles.chips}>
                    {items.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Read ${item.name}`}
                        onPress={() => {
                          haptics.select();
                          onRead(item.id);
                        }}
                        style={styles.chip}>
                        <Text style={styles.chipName}>{item.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.hint}>Nothing yet. Keep an eye out for chests.</Text>
                )}
              </>
            )}
            {tab === 'settings' && (
              <>
                <Text style={styles.section}>CONTROLS</Text>
                <Segmented options={SCHEMES} value={controls} onChange={onControls} color={colors.accent} />
                <Text style={styles.hint}>{HINTS[controls]}</Text>
                <Text style={styles.section}>GAME SPEED</Text>
                <Segmented options={SPEEDS} value={speed} onChange={onSpeed} color={colors.accent} />
                <Text style={styles.hint}>{SPEED_HINTS[speed]}</Text>
                {testTools && (
                  <MenuItem
                    label={`Test levels (Lv 20): ${testTools.levels ? 'on' : 'off'}`}
                    onPress={testTools.toggleLevels}
                  />
                )}
                {testTools && (
                  <MenuItem
                    label={`Test: walk to goal: ${testTools.walk ? 'on' : 'off'}`}
                    onPress={testTools.toggleWalk}
                  />
                )}
                {autopilot && (
                  <MenuItem label={`Autopilot (dev): ${autopilot.on ? 'on' : 'off'}`} onPress={autopilot.toggle} />
                )}
              </>
            )}
          </ScrollView>
        </View>

        <View style={styles.rail}>
          <MenuItem label="Resume" onPress={onResume} primary />
          <MenuItem label="Map" onPress={onOpenMap} />
          <MenuItem label="Other World menu" onPress={onMenu} />
          <View style={styles.spacer} />
          <MenuItem label="Back to habits" onPress={onLeave} quiet />
        </View>
      </View>
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  primary,
  quiet,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  /** Leaving: smaller and set apart. */
  quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.item,
        primary && styles.itemPrimary,
        quiet && styles.itemQuiet,
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={[styles.itemLabel, primary && styles.itemLabelPrimary, quiet && styles.itemLabelQuiet]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 5, 10, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: {
    ...windowStyle,
    flexDirection: 'row',
    width: 760,
    maxWidth: '90%',
    height: '88%',
    padding: spacing.md,
    gap: spacing.lg,
  },
  main: { flex: 1, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  title: { color: colors.accent, fontFamily: fonts.bold, fontSize: 24, letterSpacing: 1 },
  place: { color: colors.textMuted, fontFamily: fonts.dialogue, fontSize: 15, flexShrink: 1 },
  tabs: { flexDirection: 'row', gap: spacing.xs, borderBottomWidth: 2, borderBottomColor: colors.border },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: -2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.accent },
  tabLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
  tabLabelOn: { color: colors.accent },
  page: { flex: 1 },
  pageContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipName: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  chipClass: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11 },
  rail: { width: 168, gap: spacing.sm },
  spacer: { flex: 1 },
  item: {
    borderWidth: 3,
    borderColor: colors.frame,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  itemPrimary: { backgroundColor: colors.accent },
  itemQuiet: { borderWidth: 2, borderColor: colors.border, paddingVertical: spacing.xs },
  itemLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1, textAlign: 'center' },
  itemLabelPrimary: { color: colors.background },
  itemLabelQuiet: { color: colors.textMuted, fontSize: 14 },
});
