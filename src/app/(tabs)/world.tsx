import { router, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';

import { DialogueBox, type Dialogue } from '@/components/world/dialogue-box';
import { PauseMenu } from '@/components/world/pause-menu';
import { WorldMapView } from '@/components/world/world-map';
import { WorldControls } from '@/components/world/world-controls';
import { WorldView, npcFeet, useWorldSim, type WorldSim } from '@/components/world/world-view';
import { useGameStore } from '@/store';
import { useObjectives, useToday, useXpTotals } from '@/store/hooks';
import { DOWN, LEFT, RIGHT, UP, tileAhead } from '@/world/engine';
import { COMPANIONS } from '@/story/companions';
import { FACINGS, MAPS, TILE, objectAt, tileAt, withoutCharacter, type MapId, type WorldMap } from '@/world/maps';
import { EXITS, describeRequirement, howToProgress, standing, type XpTotals } from '@/world/progress';
import { characterQuestions } from '@/world/talk';
import { useWorldHydrated, useWorldStore, type WorldPosition } from '@/world/store';
import { worldHero } from '@/world/hero';
import type { WalkerId } from '@/world/walkers';

/**
 * Set just before opening a screen over the World (the quest board), so the
 * phone stays sideways instead of flipping upright for a moment.
 */
let keepSideways = false;

/** Turns the phone sideways while the World is open, and back upright on leaving it. */
function useSideways() {
  useFocusEffect(
    useCallback(() => {
      keepSideways = false;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        if (!keepSideways) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, []),
  );
}

export default function WorldScreen() {
  useSideways();
  const hydrated = useWorldHydrated();
  const [hero] = useParty();
  const { width, height } = useWindowDimensions();
  // Wait for the save and for the phone to finish turning sideways.
  if (!hydrated || width < height) return <View style={styles.root} />;
  // A new World character means a fresh room: they step out of the crowd, the last one steps back in.
  return <World key={hero} hero={hero} width={width} height={height} />;
}

/**
 * One character walks the World: the party member picked from their sheet on
 * the Today screen (worldHero falls back to your class's companion).
 */
function useParty(): WalkerId[] {
  const picked = useWorldStore((s) => s.hero);
  const party = useGameStore((s) => s.party);
  const classDimension = useGameStore((s) => s.player?.classDimension ?? 'physical');
  return useMemo(() => [worldHero(picked, party, classDimension)], [picked, party, classDimension]);
}

/** Where to start: the saved spot, unless someone now stands there (then the map's spawn). */
function startFor(
  saved: WorldPosition | null,
  hero: WalkerId,
): {
  map: WorldMap;
  x: number;
  y: number;
  facing: WorldPosition['facing'];
} {
  if (saved) {
    const map = withoutCharacter(MAPS[saved.map], hero);
    const tile = Math.floor((saved.y - 1) / TILE) * map.width + Math.floor(saved.x / TILE);
    if (!map.solid[tile]) return { ...saved, map };
  }
  const map = withoutCharacter(MAPS.archive, hero);
  const [x, y] = npcFeet(map.spawn);
  return { map, x, y, facing: map.spawn.facing };
}

function World({ hero, width, height }: { hero: WalkerId; width: number; height: number }) {
  const controls = useWorldStore((s) => s.controls);
  const setControls = useWorldStore((s) => s.setControls);
  const savePosition = useWorldStore((s) => s.savePosition);
  const [start] = useState(() => startFor(useWorldStore.getState().position, hero));
  const map = start.map;
  const party = useMemo(() => [hero], [hero]);
  const sim = useWorldSim(start, map.npcs);
  const today = useToday();
  const { unclaimed } = useObjectives(today);

  const [focused, setFocused] = useState(true);
  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [you, setYou] = useState({ x: 0, y: 0 });
  const discovered = useWorldStore((s) => s.discovered);
  const discover = useWorldStore((s) => s.discover);
  const xp = useXpTotals();
  const xpRef = useRef(xp);
  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);

  // Setting foot somewhere puts it on the World map.
  useEffect(() => {
    discover(map.id as MapId);
  }, [map, discover]);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  // Points per art pixel: about eight and a half tiles top to bottom, in whole steps so pixels stay sharp.
  const scale = Math.min(4, Math.max(2, Math.round(height / (TILE * 8.5))));

  const save = useCallback(() => {
    savePosition({
      map: map.id as WorldPosition['map'],
      x: sim.x.get(),
      y: sim.y.get(),
      facing: FACINGS[sim.facing.get()],
    });
  }, [map, sim, savePosition]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        save();
      };
    }, [save]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && save());
    return () => sub.remove();
  }, [save]);

  const frozen = paused || dialogue !== null;
  useEffect(() => {
    sim.frozen.set(frozen);
  }, [frozen, sim]);

  const openBoard = useCallback(() => {
    save();
    keepSideways = true;
    router.push('/quest-board');
  }, [save]);

  const act = useAct(map, sim, setDialogue, save, xpRef);
  const board = map.objects.find((o) => o.type === 'board');

  return (
    <View style={styles.root}>
      <WorldView
        map={map}
        party={party}
        sim={sim}
        width={width}
        height={height}
        scale={scale}
        active={focused}
        marks={unclaimed > 0 && board ? [board] : []}
      />
      {!frozen && (
        <WorldControls
          scheme={controls}
          sim={sim}
          onAct={act}
          onPause={() => {
            save();
            setPaused(true);
          }}
        />
      )}
      {dialogue && <DialogueBox dialogue={dialogue} onClose={() => setDialogue(null)} />}
      {paused && (
        <PauseMenu
          map={map.id as MapId}
          mapName={map.name}
          controls={controls}
          onControls={setControls}
          onResume={() => setPaused(false)}
          onOpenMap={() => {
            setYou({ x: sim.x.get(), y: sim.y.get() });
            setMapOpen(true);
          }}
          onOpenBoard={openBoard}
          onLeave={() => {
            setPaused(false);
            router.navigate('/');
          }}
        />
      )}
      {mapOpen && (
        <WorldMapView
          map={map}
          you={you}
          discovered={discovered}
          width={width}
          height={height}
          onClose={() => setMapOpen(false)}
        />
      )}
    </View>
  );
}

const OPPOSITE = [UP, DOWN, RIGHT, LEFT];

/** What A (or a tap) does: talk to whoever's in front, open the quest board, or examine the tile. */
function useAct(
  map: WorldMap,
  sim: WorldSim,
  setDialogue: (d: Dialogue) => void,
  save: () => void,
  xp: { current: XpTotals },
) {
  const busy = useRef(false);
  return useCallback(() => {
    if (busy.current) return;
    const facing = sim.facing.get();
    const [tx, ty] = tileAhead(sim.x.get(), sim.y.get(), facing);
    const thing = objectAt(map, tx, ty);
    if (thing?.type === 'npc') {
      // they turn to face you
      const i = map.npcs.indexOf(thing);
      const turned = [...sim.npcFacing.get()];
      turned[i] = OPPOSITE[facing];
      sim.npcFacing.set(turned);
      setDialogue({
        speaker: thing.name,
        lines: thing.lines,
        questions: thing.questions ?? (thing.character ? characterQuestions(COMPANIONS[thing.character]) : undefined),
      });
      return;
    }
    if (thing?.type === 'board') {
      save();
      keepSideways = true;
      busy.current = true;
      router.push('/quest-board');
      setTimeout(() => (busy.current = false), 600);
      return;
    }
    const tile = tileAt(map, tx, ty);
    // A way out says what it needs, in real habits.
    const exit = EXITS.find((e) => e.from === map.id && e.tile === tile);
    if (exit) {
      const s = standing(exit.needs, xp.current);
      setDialogue({
        lines: s.met
          ? [`${exit.label} gives a little under your hand.`, "Whatever lies beyond isn't ready for you yet."]
          : [
              `${exit.label}. It won't budge. Not yet.`,
              `It needs ${describeRequirement(exit.needs)}. You're Lv ${s.have}.`,
              howToProgress(s),
            ],
      });
      return;
    }
    const lines = map.examine[tile];
    if (lines) setDialogue({ lines });
  }, [map, sim, setDialogue, save, xp]);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0806' },
});
