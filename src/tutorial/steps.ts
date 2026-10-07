export type Rect = { x: number; y: number; width: number; height: number };

/** The screens the tour walks through: the tabs, and the habit creator. */
export type TourRoute = '/' | '/collection' | '/social-tab' | '/journey' | '/world' | '/quest-editor';

export type TourStep = {
  /** What the Keeper says. `{name}` is the player's name; `{hero}` the first hero to wake. */
  line: string;
  /** The screen to be on. */
  route: TourRoute;
  /** Where to go to get there, when it isn't just `route` (the habit creator opens for the tour). */
  href?: string;
  /** The tour target to point at (see useTourTarget); none, or not on screen, centres the box. */
  target?: string;
  /**
   * The player does it: tapping completes the first habit, and the tour waits,
   * hidden, while it lands and the first hero hatches, then carries on.
   */
  complete?: 'first-quest';
};

/**
 * The Keeper's walk through the game, straight after the player gives their
 * name. A habit is made (the habit creator, where the eight Paths are
 * explained), the graph is shown, the first habit is completed together (its
 * hero hatches), then each tab, ending at the Other World's door. The player
 * steps outside when they're ready.
 */
export const TOUR_STEPS: TourStep[] = [
  { route: '/', line: 'Ah, {name}. There you are. Let me show you how things work around here.' },
  {
    route: '/',
    target: 'add-quest',
    line: 'Everything here begins with a habit: something real that you do. New ones are made here. Let me show you.',
  },
  {
    route: '/quest-editor',
    href: '/quest-editor?tour=1',
    target: 'paths',
    line: 'Every habit walks one of eight Paths, the eight parts of a whole life. Neglect one, and the others feel it.',
  },
  {
    route: '/quest-editor',
    href: '/quest-editor?tour=1',
    target: 'paths',
    line: 'The Warrior is your body: sleep, movement, what you eat. The Noble is your money. The Mage is your mind, and everything it is still curious about.',
  },
  {
    route: '/quest-editor',
    href: '/quest-editor?tour=1',
    target: 'paths',
    line: 'The Cleric is meaning: faith, values, quiet. The Monk is your heart, and how kindly you treat yourself. The Bard is your people, the ones you call.',
  },
  {
    route: '/quest-editor',
    href: '/quest-editor?tour=1',
    target: 'paths',
    line: 'The Artificer is your work and your craft. The Ranger is the world around you: fresh air, and the places you live. Make habits here whenever you like.',
  },
  {
    route: '/',
    target: 'radar',
    line: 'This is a reflection of you. As time goes on, you will see which habits you put first, and you may want to adjust.',
  },
  {
    route: '/',
    target: 'first-quest',
    complete: 'first-quest',
    line: "Here you'll find your habits. Let's complete this first one together. Tap it.",
  },
  {
    route: '/',
    line: 'Congratulations. {hero} is awake, and joins you. Only {left} heroes to go.',
  },
  {
    route: '/journey',
    target: 'journey',
    line: 'Here are your stats: your level, what is improving, what needs tending, and when you do best. Health data is coming soon.',
  },
  {
    route: '/journey',
    target: 'regulator',
    line: 'And for seasoned travellers, the Dopamine Regulator: it shows how super stimuli wear down your Health Points, and how your habits bring them back.',
  },
  {
    route: '/journey',
    target: 'regulator',
    line: 'It is part of Premium, and stays off unless you choose it. When you are ready, turn it on right here, in Stats.',
  },
  {
    route: '/social-tab',
    target: 'social',
    line: 'In Social you can search for friends, look through their collections, and add them to your leaderboard.',
  },
  {
    route: '/collection',
    target: 'collection',
    line: "Here are the heroes you've collected. The more stars, the rarer they are: five-star heroes are the rarest of all.",
  },
  {
    route: '/world',
    target: 'step-outside',
    line: 'And lastly, the Other World. The habits you keep in your life strengthen your party here.',
  },
  {
    route: '/world',
    target: 'step-outside',
    line: "Step in whenever you're ready. I have been waiting for you for a long time.",
  },
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
