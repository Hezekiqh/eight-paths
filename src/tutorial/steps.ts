export type Rect = { x: number; y: number; width: number; height: number };

export type TourStep = {
  /** What the Keeper says. */
  line: string;
  /** The tour target to point at (see useTourTarget); none, or not on screen, centres the box. */
  target?: string;
};

/**
 * The Keeper's walk through the app, shown once on the Today screen. Tabs are
 * targeted by their label (`tab:<label>`).
 */
export const TOUR_STEPS: TourStep[] = [
  { line: 'Ah, there you are. Let me show you how things work around here.' },
  { target: 'radar', line: 'This is you. Eight Paths, one for every part of a life. Each grows as you do.' },
  {
    target: 'first-quest',
    line: "These are your quests: real things you do. When you've done one, tap it, and its Path grows stronger.",
  },
  { target: 'add-quest', line: 'Want to build a new habit? Add it here. Every quest strengthens a Path.' },
  {
    target: 'tab:Profile and collection',
    line: 'Every few levels on a Path, a cocoon hatches and someone new joins you. Watch the ones with fewer stars.',
  },
  { target: 'tab:Social', line: 'No one walks alone for long. Share your friend code and see how others are doing.' },
  {
    target: 'tab:Journey',
    line: "Your Journey remembers every day you've walked, so you can see how far you've come.",
  },
  {
    target: 'tab:World',
    line: 'Out there is the World. The stronger your habits make you, the farther you can go. Your objectives wait on the quest board inside.',
  },
  { line: "The rest you'll find on your own. Go on. I'll be watching." },
];

/** Room kept around a target inside its frame. */
export const HOLE_PAD = 8;
/** The arrow's height, and the gap either side of it. */
export const ARROW_H = 34;
export const GAP = 6;
/** Keeps things off the screen's edges. */
export const EDGE = 16;

export type TourLayout = {
  /** The framed, undimmed window onto the target. */
  hole: Rect;
  /** Where the arrow's tip points from, and which way it points. */
  arrow: { x: number; y: number; dir: 'up' | 'down' };
  /** The dialogue box sits below the arrow (`top`) or above it (`bottom`, from the screen's bottom). */
  box: { top: number } | { bottom: number };
};

/**
 * Where the frame, arrow and dialogue box go for a target. A target in the top
 * half gets the box beneath it with the arrow pointing up; one in the bottom
 * half gets the box above it with the arrow pointing down. A target running off
 * the screen is framed only where it shows.
 */
export function placeTour(target: Rect, screen: { width: number; height: number }): TourLayout {
  const x = Math.max(EDGE / 2, target.x - HOLE_PAD);
  const y = Math.max(EDGE / 2, target.y - HOLE_PAD);
  const right = Math.min(screen.width - EDGE / 2, target.x + target.width + HOLE_PAD);
  const bottom = Math.min(screen.height - EDGE / 2, target.y + target.height + HOLE_PAD);
  const hole = { x, y, width: right - x, height: bottom - y };
  const cx = Math.min(screen.width - EDGE * 2, Math.max(EDGE * 2, x + hole.width / 2));
  if (y + hole.height / 2 < screen.height / 2) {
    const arrowTop = bottom + GAP;
    return { hole, arrow: { x: cx, y: arrowTop, dir: 'up' }, box: { top: arrowTop + ARROW_H + GAP } };
  }
  const arrowBottom = y - GAP;
  return {
    hole,
    arrow: { x: cx, y: arrowBottom - ARROW_H, dir: 'down' },
    box: { bottom: screen.height - arrowBottom + ARROW_H + GAP },
  };
}
