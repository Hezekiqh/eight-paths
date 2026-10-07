import type { MapId } from './maps';
import {
  describeRequirement,
  EXITS,
  FOREST_LEVEL,
  KING_LEVEL,
  levelPart,
  NORTH_ROAD_LEVEL,
  standing,
  type Exit,
  type Standing,
  type XpTotals,
} from './progress';

// The level gates (author, Oct 7, 2026): a guard stands beside each one and says why you can't pass,
// in the kingdom's voice (strength is everything). Walk into a gate while it's shut, or press A on it
// or on him, and he says his piece with what it needs underneath; then you're nudged back. Once you're
// strong enough (or have Premium), he says "On you go." and the way is open. He stands beside the road,
// never on it.

export type LevelGate = {
  /** The exit it guards (progress.ts EXITS). */
  exit: string;
  map: MapId;
  /** The guard's NPC id on that map. */
  guard: string;
  /** What's behind it, for the Premium sheet: "The forest opens at Lv 10." */
  place: string;
  /** Why not, while you're under the level. */
  lines: string[];
  /** Strong enough, but the story isn't done yet (the castle road): his line before the usual hint. */
  notYet?: string;
};

export const LEVEL_GATES: LevelGate[] = [
  {
    exit: 'city-north',
    map: 'warrior-city',
    guard: 'gate-guard-north',
    place: 'The road north',
    lines: [`Nobody goes north under Lv ${NORTH_ROAD_LEVEL}. King's orders. The road eats the weak.`],
  },
  {
    exit: 'south-forest',
    map: 'south-road',
    guard: 'gate-guard-forest',
    place: 'The forest',
    lines: [`Nobody goes in those woods under Lv ${FOREST_LEVEL}. Things happen in there. I don't ask what.`],
  },
  {
    exit: 'town-keep',
    map: 'kingdom-town',
    guard: 'gate-guard-castle',
    place: 'The castle',
    lines: [`The king receives the strong. Lv ${KING_LEVEL}, or you can admire the gate from here.`],
    notYet: "Strong enough. That's not all the king asks, mind.",
  },
];

/** What a guard says once you may pass. */
export const ON_YOU_GO = 'On you go.';

export const gateForExit = (exitId: string) => LEVEL_GATES.find((g) => g.exit === exitId);
export const gateForGuard = (map: string, npcId: string) => LEVEL_GATES.find((g) => g.map === map && g.guard === npcId);
export const gatesOn = (map: string) => LEVEL_GATES.filter((g) => g.map === map);
export const exitOf = (gate: LevelGate): Exit => EXITS.find((e) => e.id === gate.exit)!;

/**
 * Where you stand at a gate: open; shut by the level (whatever else it needs); or strong enough but
 * shut by the story (the castle road's flags). `level` is your standing against its level alone.
 */
export type GateBlock = {
  kind: 'open' | 'level' | 'flags';
  level: Standing;
  all: Standing;
  /** The story still bars the way, whatever your level (Premium wouldn't get you through yet). */
  story: boolean;
};

export function gateBlock(gate: LevelGate, xp: XpTotals): GateBlock {
  const needs = exitOf(gate).needs;
  const all = standing(needs, xp);
  const part = levelPart(needs);
  const level = part ? standing(part, xp) : all;
  // with every level lifted (as Premium does), what's left is the story
  const story = !standing(needs, { ...xp, unlocked: true }).met;
  if (all.met) return { kind: 'open', level, all, story };
  return { kind: level.met ? 'flags' : 'level', level, all, story };
}

/** "It needs Overall Lv 10. You're Lv 8. Finish about 4 more habits." */
export function requirementLine(gate: LevelGate, s: Standing): string {
  const part = levelPart(exitOf(gate).needs);
  const plural = s.habitsLeft === 1 ? '' : 's';
  return `It needs ${part ? describeRequirement(part) : `Lv ${s.need}`}. You're Lv ${s.have}. Finish about ${s.habitsLeft} more habit${plural}.`;
}

/**
 * What the guard says. While the level's short: his reason, then what it needs (narration, under his
 * face). Strong enough but not done with the story: his `notYet` and the hint. Open: "On you go."
 */
export function guardLines(gate: LevelGate, block: GateBlock): string[] {
  if (block.kind === 'open') return [ON_YOU_GO];
  if (block.kind === 'flags') return [gate.notYet ?? ON_YOU_GO, ...(block.all.hint ? [`* ${block.all.hint}`] : [])];
  return [...gate.lines, `* ${requirementLine(gate, block.level)}`];
}

/**
 * The Premium sheet's text, for a gate shut by its level (author, Oct 7, 2026): "The forest opens at Lv 10.
 * You're Lv 8: about 4 more habits. Or go anywhere now with Premium." Where the story still bars the way
 * too (the castle road), Premium only lifts the level, and it says so.
 */
export function gatePrompt(gate: LevelGate, block: GateBlock): string {
  const s = block.level;
  const plural = s.habitsLeft === 1 ? '' : 's';
  return (
    `${gate.place} opens at Lv ${s.need}. You're Lv ${s.have}: about ${s.habitsLeft} more habit${plural}. ` +
    (block.story ? 'Or lift every level barrier now with Premium.' : 'Or go anywhere now with Premium.')
  );
}

/** A Premium sheet shown at a gate: which, and on what day (YYYY-MM-DD). */
export type GateOffer = { gate: string; day: string };

/**
 * Whether to show the Premium sheet as a guard's lines close (author, Oct 7, 2026): only to a free player, only
 * where Premium is on sale, only for a gate shut by its level (never one shut by the story alone), never in the
 * middle of a scene, a cutscene, a boss fight or a phone call; once per gate ever, and at most once a day.
 */
export function shouldOfferPremium(o: {
  gate: string;
  block: GateBlock['kind'];
  history: GateOffer[];
  today: string;
  premium: boolean;
  enabled: boolean;
  busy: boolean;
}): boolean {
  if (!o.enabled || o.premium || o.busy || o.block !== 'level') return false;
  return !o.history.some((h) => h.gate === o.gate || h.day === o.today);
}
