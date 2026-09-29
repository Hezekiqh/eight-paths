import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Rect } from './steps';

type Tour = {
  /** The Keeper has walked the player through the app (or they skipped it). */
  done: boolean;
  /** The saved `done` has loaded, so the tour won't flash up for someone who's seen it. */
  ready: boolean;
  finish: () => void;
  replay: () => void;
};

/**
 * Kept apart from the game save: it's about this phone's player having seen
 * the tour, not about their progress, so it needs no save migration and a
 * restored backup doesn't replay it.
 */
export const useTour = create<Tour>()(
  persist(
    (set) => ({
      done: false,
      ready: false,
      finish: () => set({ done: true }),
      replay: () => set({ done: false }),
    }),
    {
      name: 'eight-paths-tour',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ done }) => ({ done }),
      onRehydrateStorage: () => () => useTour.setState({ ready: true }),
    },
  ),
);

/** A scrolling screen the tour can move to bring a target into view. */
export type TourScroller = {
  ref: React.RefObject<ScrollView | null>;
  offset: React.RefObject<number>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/** The things on screen the Keeper can point at, by name. */
const targets = new Map<string, { view: React.RefObject<View | null>; scroller?: TourScroller }>();

/** For a scrolling screen whose targets may be out of view: pass `ref` and `onScroll` to its ScrollView. */
export function useTourScroller(): TourScroller {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);
  return useMemo(() => ({ ref, offset, onScroll }), [onScroll]);
}

/**
 * Marks a view as something the tour can point at. Put the returned ref on a
 * View (with `collapsable={false}`, so it isn't flattened away). Pass the
 * screen's scroller if it can scroll out of view.
 */
export function useTourTarget(key: string, scroller?: TourScroller) {
  const view = useRef<View>(null);
  useEffect(() => {
    const entry = { view, scroller };
    targets.set(key, entry);
    return () => {
      if (targets.get(key) === entry) targets.delete(key);
    };
  }, [key, scroller]);
  return view;
}

const measure = (view: View) =>
  new Promise<Rect | null>((resolve) =>
    view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null)),
  );

/** How often to check a scrolling target, and the longest to wait for it to stop. */
const POLL_MS = 60;
const SETTLE_MS = 1200;

/**
 * Where a target sits on screen, or null if it isn't showing. A target on a
 * scrolling screen that falls outside the visible band (`top` to `bottom`) is
 * scrolled into it first.
 */
export async function measureTarget(key: string, band: { top: number; bottom: number }): Promise<Rect | null> {
  const entry = targets.get(key);
  const view = entry?.view.current;
  if (!entry || !view) return null;
  const rect = await measure(view);
  const scroll = entry.scroller?.ref.current;
  if (!rect || !scroll || (rect.y >= band.top && rect.y + rect.height <= band.bottom)) return rect;
  // Centre it in the band, or line its top up if it's too tall to fit.
  const room = band.bottom - band.top;
  const want = rect.height > room ? band.top : band.top + (room - rect.height) / 2;
  const to = Math.max(0, entry.scroller!.offset.current + rect.y - want);
  scroll.scrollTo({ y: to, animated: true });
  // Wait for the scroll to settle: the target stops moving.
  let last = rect;
  for (let waited = 0; waited < SETTLE_MS; waited += POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const now = await measure(view);
    if (!now) return null;
    if (waited >= POLL_MS && now.y === last.y) return now;
    last = now;
  }
  return last;
}
