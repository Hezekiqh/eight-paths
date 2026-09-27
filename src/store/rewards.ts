import {
  BOOST_MULTIPLIER,
  CLASSES,
  DIMENSIONS,
  MAX_REST_TOKENS,
  seededRoll,
  xpByDimension,
  type Dimension,
  type ObjectiveReward,
} from '@/game';
import { ROSTER, SHARDS_TO_UNLOCK, isUnlocked } from '@/story/companions';

import type { GameData } from './index';

/** Bonus XP from a drop, or from a grace day when the player's tokens are full. */
export const DROP_XP = 20;
/** XP for finishing a personal goal that belongs to a Path. */
export const GOAL_XP = 25;

type Changes = Partial<GameData>;
export type RewardResult = { changes: Changes; title: string; detail: string };

const pick = <T>(items: readonly T[], seed: string) => items[Math.floor(seededRoll(seed) * items.length)];

function grantXp(data: GameData, id: string, dimension: Dimension, today: string, xp = DROP_XP): Changes {
  return {
    xpGrants: [...data.xpGrants, { id, date: today, dimension, xp, characterId: data.party[dimension], source: 'drop' }],
  };
}

function xpReward(data: GameData, id: string, dimension: Dimension, today: string, why = ''): RewardResult {
  return {
    changes: grantXp(data, id, dimension, today),
    title: `+${DROP_XP} ${CLASSES[dimension].className} XP`,
    detail: `${why}${CLASSES[dimension].className} XP for your ${CLASSES[dimension].dimensionLabel} Path.`,
  };
}

function graceReward(data: GameData, id: string, today: string): RewardResult {
  const player = data.player!;
  if (player.restTokens >= MAX_REST_TOKENS) {
    return xpReward(data, id, player.classDimension, today, 'Your grace days are full, so you get bonus ');
  }
  return {
    changes: { player: { ...player, restTokens: player.restTokens + 1 } },
    title: 'Grace Day',
    detail: '+1 rest token. It protects your streaks on a day off.',
  };
}

/**
 * What a drop holds, decided by the objective's id so it can't be rerolled:
 * a shard of a locked character, bonus XP, or a grace day.
 */
function dropReward(data: GameData, id: string, today: string): RewardResult {
  const roll = seededRoll(`drop:${id}`);
  const pathXp = xpByDimension([...data.completions, ...data.xpGrants]);
  const locked = ROSTER.filter((c) => !isUnlocked(c, pathXp[c.dimension], data.shards[c.id]));
  if (roll < 0.4 && locked.length) {
    const found = pick(locked, `shard:${id}`);
    const shards = (data.shards[found.id] ?? 0) + 1;
    const joined = shards >= SHARDS_TO_UNLOCK;
    return {
      changes: { shards: { ...data.shards, [found.id]: shards } },
      title: joined ? `${found.name} joins your collection!` : `Shard of ${found.name}`,
      detail: joined
        ? `You gathered every shard. ${found.name} is ready to swap into your party.`
        : `${shards} of ${SHARDS_TO_UNLOCK} shards. Collect them all to unlock ${found.name} early.`,
    };
  }
  if (roll < 0.85 || !locked.length) {
    const live = DIMENSIONS.filter((d) => data.quests.some((q) => q.active && q.dimension === d));
    return xpReward(data, id, pick(live.length ? live : DIMENSIONS, `xp:${id}`), today);
  }
  return graceReward(data, id, today);
}

export function applyReward(data: GameData, id: string, reward: ObjectiveReward, today: string): RewardResult {
  if (reward.kind === 'grace') return graceReward(data, id, today);
  if (reward.kind === 'boost') {
    const info = CLASSES[reward.dimension];
    return {
      changes: { boosts: [...data.boosts.filter((b) => b.date >= today), { date: today, dimension: reward.dimension }] },
      title: `${BOOST_MULTIPLIER}× ${info.className} XP`,
      detail: `Every ${info.className} quest earns ${BOOST_MULTIPLIER}× XP for the rest of today.`,
    };
  }
  return dropReward(data, id, today);
}

/** How an objective's reward reads before it's claimed. */
export function describeReward(reward: ObjectiveReward): string {
  if (reward.kind === 'grace') return 'Grace Day';
  if (reward.kind === 'boost') return `${BOOST_MULTIPLIER}× ${CLASSES[reward.dimension].className} XP today`;
  return 'Random drop';
}
