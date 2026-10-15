import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RadarCard } from '@/components/radar/radar-card';
import type { ClassInfo } from '@/game';
import { haptics } from '@/haptics';
import { useSession } from '@/store/session';
import { colors, fonts, spacing } from '@/theme';

import { CharacterPage } from './character-page';
import { LeaderboardPage } from './leaderboard-page';

const PAGES = ['You', 'Web', 'Ranking'] as const;

/** The page you left Today on, kept across launches like the theme (read once, synchronously, so it opens there). */
const PAGE_FILE = 'home-page.txt';

function readPage(): number {
  try {
    const file = new File(Paths.document, PAGE_FILE);
    if (file.exists) {
      const page = Number(file.textSync().trim());
      if (Number.isInteger(page) && page >= 0 && page < PAGES.length) return page;
    }
  } catch {
    // No file system (tests, web): start on You.
  }
  return 0;
}

function savePage(page: number) {
  try {
    new File(Paths.document, PAGE_FILE).write(String(page));
  } catch {
    // Not remembered this time; nothing else depends on it.
  }
}

/** The web chart's size: a little smaller than full width, so all three pages share one height. */
const RADAR_MAX = 320;
/** Room the web's filter and caption take around the chart. */
const RADAR_CHROME = 84;

type Props = { today: string; classInfo: ClassInfo };

/**
 * The top of Today, swiped sideways: your own mood, the eight-Path web, and
 * every habit ranked. Every page is the same height with its content centred,
 * so swiping never moves the party and quests below; it opens on the page you
 * last left it on.
 */
export function HomePager({ today, classInfo }: Props) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(readPage);
  // Where the pager opens, fixed after the first render: a moving start fights the tabs' scroll animation.
  const [startPage] = useState(page);
  const scroller = useRef<ScrollView>(null);
  const radarSize = Math.min(width, RADAR_MAX);
  const height = radarSize + RADAR_CHROME;

  // A level-up brings you back to your own page for the victory dance.
  useEffect(
    () =>
      useSession.subscribe((s, prev) => {
        if (s.victory && s.victory !== prev.victory) {
          scroller.current?.scrollTo({ x: 0, animated: true });
          setPage(0);
          savePage(0);
        }
      }),
    [],
  );

  const show = (i: number) => {
    setPage(i);
    savePage(i);
  };

  const goTo = (i: number) => {
    if (i === page) return;
    haptics.select();
    scroller.current?.scrollTo({ x: i * width, animated: true });
    show(i);
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {PAGES.map((label, i) => {
          const on = i === page;
          return (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => goTo(i)}
              hitSlop={6}
              style={styles.tab}>
              <Text style={[styles.tabText, on && { color: classInfo.color }]}>{label.toUpperCase()}</Text>
              <View style={[styles.dot, on && { backgroundColor: classInfo.color, width: 18 }]} />
            </Pressable>
          );
        })}
      </View>
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startPage * width, y: 0 }}
          style={{ height }}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== page) {
              haptics.select();
              show(i);
            }
          }}>
          <CharacterPage today={today} classInfo={classInfo} width={width} height={height} />
          <View style={[styles.center, { width, height }]}>
            <RadarCard today={today} classInfo={classInfo} size={radarSize} />
          </View>
          <LeaderboardPage width={width} height={height} />
        </ScrollView>
      ) : (
        <View style={{ height: RADAR_MAX + RADAR_CHROME }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.xs },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.xs },
  tab: { alignItems: 'center', gap: 4 },
  tabText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.2 },
  dot: { height: 4, width: 6, backgroundColor: colors.border, borderRadius: 1 },
  center: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
});
