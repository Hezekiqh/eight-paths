import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DAILY,
  STARTING_REST_TOKENS,
  daysShownUp,
  milestoneCrossed,
  showUpStreak,
  TUTORIAL_QUEST_ID,
  TUTORIAL_QUEST_TITLE,
  describeXpGain,
  settleRestDays,
  toDateKey,
  toggleCompletion,
  xpByDimension,
  FIRST_CLIMB_LEVEL,
  overallLevelFromXp,
  totalXp,
  addDays,
  dailyObjectives,
  isObjectiveDone,
  weeklyObjectives,
  type Boost,
  type Completion,
  type Dimension,
  type Goal,
  type XpGrant,
  type Player,
  type Quest,
  type RestDay,
  type XpGain,
} from '@/game';

import { COMPANIONS, DEFAULT_PARTY, SHARDS_TO_UNLOCK, isUnlocked, type CharacterId } from '@/story/companions';

import { currentTier } from '@/premium/store';

import { newId } from './ids';
import { GOAL_XP, applyReward, type RewardResult } from './rewards';
import { reconcileDraws as reconcile, redoDrop as redo, type Owned } from './draws';
import { SAVE_VERSION, migrateSave, sanitizeSave } from './migrations';

export type GameData = {
  player: Player | null;
  quests: Quest[];
  completions: Completion[];
  restDays: RestDay[];
  lastSettledDate: string | null;
  /** Who stands on each Path. Only they earn character XP there. */
  party: Record<Dimension, CharacterId>;
  /** XP from objective drops and finished goals. */
  xpGrants: XpGrant[];
  /** Double-XP days won from objectives. */
  boosts: Boost[];
  /** Shards found for locked characters. */
  shards: Partial<Record<CharacterId, number>>;
  /** Objectives whose reward has been claimed (recent ones only). */
  claimed: string[];
  goals: Goal[];
  /**
   * Characters whose reveal cutscene has played. Null until first filled in:
   * saves from before reveals existed count everyone already unlocked as met.
   */
  revealed: CharacterId[] | null;
  /** Copies of each character the player has. Null on an old save until reconcileDraws fills it in. */
  owned: Owned | null;
  /** The Path level at which each Path's next random character arrives. */
  nextDraw: Partial<Record<Dimension, number>>;
  /** Arrivals waiting for their hatch, oldest first (a repeat is an extra copy). */
  drops: CharacterId[];
  /** Waiting arrivals that came from a Premium redo, so they can't be redone again. */
  redrawn: CharacterId[];
  /**
   * The player's own order for Today's quests, by id. Null until they drag one:
   * Today then follows the order they usually do their quests in.
   */
  questOrder: string[] | null;
};

export type GoalDraft = Pick<Goal, 'title' | 'dimension' | 'dueDate'>;

export type QuestDraft = Pick<Quest, 'title' | 'dimension' | 'repeatDays'>;

export type StartGameInput = {
  name: string;
  classDimension: Dimension;
  quests: { title: string; dimension: Dimension }[];
};

/** Something worth celebrating beyond the XP bar. */
export type Milestone = { title: string; detail: string };

export type ToggleOutcome =
  | {
      kind: 'completed';
      completionId: string;
      dimension: Dimension;
      gain: XpGain;
      milestone: Milestone | null;
      /** The party member on this Path reached a new level. */
      characterLeveledUp: boolean;
      /** Who levelled up and the level they reached, for the level-up moment. */
      characterLevelUp: { characterId: CharacterId; level: number } | null;
      /** The overall level just reached, if this task crossed one. */
      overallLevelUp: number | null;
    }
  | { kind: 'undone' }
  | { kind: 'ignored' };

export type ImportResult = { ok: true } | { ok: false; error: string };

type Actions = {
  startGame: (input: StartGameInput, today?: string) => void;
  /** Toggles `questId` for today. Past days are final. */
  toggleQuest: (questId: string, today?: string) => ToggleOutcome;
  addQuest: (draft: QuestDraft) => void;
  updateQuest: (id: string, draft: QuestDraft) => void;
  archiveQuest: (id: string) => void;
  /** Picks a set reminder time, which turns off "at my usual time". */
  setNotificationTime: (time: string) => void;
  setSmartReminders: (on: boolean) => void;
  setHapticsEnabled: (on: boolean) => void;
  /** Today's quests in the player's own order, or null to go back to their usual order. */
  setQuestOrder: (ids: string[] | null) => void;
  setObjectivesLandscape: (on: boolean) => void;
  changeClass: (dimension: Dimension) => void;
  /** Puts an unlocked character in their Path's party slot. False if they're still locked. */
  swapCharacter: (id: CharacterId) => boolean;
  /** Claims a finished objective's reward. Null if it isn't done or was already claimed. */
  claimObjective: (id: string, today?: string) => RewardResult | null;
  addGoal: (draft: GoalDraft) => void;
  updateGoal: (id: string, draft: GoalDraft) => void;
  deleteGoal: (id: string) => void;
  /** Marks a goal done (earning its XP) or not done (returning it). */
  toggleGoal: (id: string, today?: string) => void;
  /** Records that `ids` have been revealed (their cutscene played, or they predate reveals). */
  markRevealed: (ids: CharacterId[]) => void;
  /** Unlocks characters as a gift (a friend joined): gives each a full set of shards. */
  giftCharacters: (ids: CharacterId[]) => void;
  /** Hands out any characters now due: new arrivals every 3–5 Path levels, full shard sets. */
  reconcileDraws: (random?: () => number) => void;
  /** The hatch for the first waiting arrival of `id` has played. */
  finishDrop: (id: CharacterId) => void;
  /** Premium: swaps the waiting arrival `id` for another draw. Returns who came instead, or null. */
  redoDrop: (id: CharacterId, random?: () => number) => CharacterId | null;
  completeTutorial: () => void;
  settle: (today?: string) => void;
  resetGame: () => void;
  exportSave: () => string;
  importSave: (text: string) => ImportResult;
};

export type GameState = GameData & Actions;

export const initialData: GameData = {
  player: null,
  quests: [],
  completions: [],
  restDays: [],
  lastSettledDate: null,
  party: DEFAULT_PARTY,
  xpGrants: [],
  boosts: [],
  shards: {},
  claimed: [],
  goals: [],
  revealed: null,
  owned: null,
  nextDraw: {},
  drops: [],
  redrawn: [],
  questOrder: null,
};

/** Every saved field, for persisting and backups. */
export function pickData(s: GameData): GameData {
  const {
    player,
    quests,
    completions,
    restDays,
    lastSettledDate,
    party,
    xpGrants,
    boosts,
    shards,
    claimed,
    goals,
    revealed,
    owned,
    nextDraw,
    drops,
    redrawn,
    questOrder,
  } = s;
  return {
    player,
    quests,
    completions,
    restDays,
    lastSettledDate,
    party,
    xpGrants,
    boosts,
    shards,
    claimed,
    goals,
    revealed,
    owned,
    nextDraw,
    drops,
    redrawn,
    questOrder,
  };
}

/** `list` without its first `item`. */
function withoutOne<T>(list: T[], item: T): T[] {
  const i = list.indexOf(item);
  return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
}

const todayKey = () => toDateKey(new Date());

const BACKUP_APP = 'eight-paths';

/** Every tenth overall level is a milestone; level 100 ends the first climb. */
function describeLevelMilestone(level: number | null): Milestone | null {
  if (level === null || level % 10 !== 0) return null;
  if (level === FIRST_CLIMB_LEVEL) {
    return { title: 'Level 100', detail: 'The first climb is done. From here, every level asks a little more.' };
  }
  return level < FIRST_CLIMB_LEVEL
    ? { title: `Level ${level}`, detail: `${FIRST_CLIMB_LEVEL - level} levels to go to 100.` }
    : { title: `Level ${level}`, detail: 'Still climbing. Every one of these was earned.' };
}

function describeMilestone(
  data: Pick<GameData, 'completions' | 'restDays'>,
  after: Completion[],
  start: string,
  today: string,
): Milestone | null {
  const days = milestoneCrossed(daysShownUp(data.completions), daysShownUp(after));
  if (days !== null) {
    return days === 1
      ? { title: 'Day one', detail: 'You showed up. Every journey starts exactly like this.' }
      : { title: `${days} days shown up`, detail: 'Every one of them counted.' };
  }
  const before = showUpStreak(data.completions, data.restDays, start, today);
  const now = showUpStreak(after, data.restDays, start, today);
  if (now.best > before.best && now.best >= 3 && before.best > 0) {
    return { title: `New record: ${now.best}-day streak`, detail: `Your best ever run of showing up.` };
  }
  return null;
}

function cleanDraft({ title, dimension, dueDate }: GoalDraft): GoalDraft {
  return { title: title.trim(), dimension, dueDate };
}

function makeQuest(draft: QuestDraft): Quest {
  return {
    id: newId(),
    title: draft.title.trim(),
    dimension: draft.dimension,
    repeatDays: [...draft.repeatDays].sort(),
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialData,

      startGame: ({ name, classDimension, quests }, today = todayKey()) => {
        const tutorial: Quest = {
          id: TUTORIAL_QUEST_ID,
          title: TUTORIAL_QUEST_TITLE,
          dimension: classDimension,
          repeatDays: [],
          active: true,
          createdAt: new Date().toISOString(),
        };
        set({
          ...initialData,
          player: {
            name: name.trim(),
            classDimension,
            restTokens: STARTING_REST_TOKENS,
            onboardedAt: today,
            tutorialComplete: false,
            notificationTime: '20:00',
            hapticsEnabled: true,
            objectivesLandscape: false,
            smartReminders: true,
          },
          quests: [tutorial, ...quests.map((q) => makeQuest({ ...q, repeatDays: DAILY }))],
          // The core eight are there from the start: no reveal needed.
          revealed: Object.values(DEFAULT_PARTY),
          owned: Object.fromEntries(Object.values(DEFAULT_PARTY).map((id) => [id, 1])),
          nextDraw: {},
          drops: [],
          redrawn: [],
          questOrder: null,
        });
      },

      toggleQuest: (questId, today = todayKey()) => {
        const { player, quests, completions, restDays, party, xpGrants, boosts } = get();
        const quest = quests.find((q) => q.id === questId);
        if (!player || !quest) return { kind: 'ignored' };

        const xpBefore = xpByDimension([...completions, ...xpGrants])[quest.dimension];
        const boosted = boosts.some((b) => b.date === today && b.dimension === quest.dimension);
        const result = toggleCompletion(completions, quest, today, newId(), { tier: currentTier(), boosted });
        if (result.kind !== 'completed') {
          set({ completions: result.completions });
          return { kind: result.kind };
        }
        const now = new Date();
        const completion = {
          ...result.completion,
          characterId: party[quest.dimension],
          // Only a completion made today, right now, says when the player plays.
          ...(toDateKey(now) === today ? { at: now.getHours() * 60 + now.getMinutes() } : {}),
        };
        set({ completions: result.completions.map((c) => (c === result.completion ? completion : c)) });
        const xpBeforeAll = totalXp([...completions, ...xpGrants]);
        const levelAfter = overallLevelFromXp(xpBeforeAll + completion.xp).level;
        const overallLevelUp = levelAfter > overallLevelFromXp(xpBeforeAll).level ? levelAfter : null;
        const characterXp = [...completions, ...xpGrants]
          .filter((c) => (c.characterId ?? DEFAULT_PARTY[c.dimension]) === completion.characterId)
          .reduce((sum, c) => sum + c.xp, 0);
        const characterGain = describeXpGain(characterXp, completion.xp);
        return {
          characterLeveledUp: characterGain.leveledUp,
          characterLevelUp: characterGain.leveledUp
            ? { characterId: completion.characterId, level: characterGain.after.level }
            : null,
          kind: 'completed',
          completionId: completion.id,
          dimension: quest.dimension,
          gain: describeXpGain(xpBefore, completion.xp),
          overallLevelUp,
          milestone:
            describeLevelMilestone(overallLevelUp) ??
            describeMilestone({ completions, restDays }, result.completions, player.onboardedAt, today),
        };
      },

      addQuest: (draft) => set((s) => ({ quests: [...s.quests, makeQuest(draft)] })),

      updateQuest: (id, draft) =>
        set((s) => ({
          quests: s.quests.map((q) =>
            q.id === id
              ? {
                  ...q,
                  title: draft.title.trim(),
                  dimension: draft.dimension,
                  repeatDays: [...draft.repeatDays].sort(),
                }
              : q,
          ),
        })),

      archiveQuest: (id) =>
        set((s) => ({
          quests: s.quests.map((q) => (q.id === id ? { ...q, active: false, archivedAt: todayKey() } : q)),
        })),

      setNotificationTime: (notificationTime) =>
        set((s) => (s.player ? { player: { ...s.player, notificationTime, smartReminders: false } } : s)),
      setSmartReminders: (smartReminders) =>
        set((s) => (s.player ? { player: { ...s.player, smartReminders } } : s)),

      setQuestOrder: (questOrder) => set({ questOrder }),
      setHapticsEnabled: (hapticsEnabled) => set((s) => (s.player ? { player: { ...s.player, hapticsEnabled } } : s)),

      setObjectivesLandscape: (objectivesLandscape) =>
        set((s) => (s.player ? { player: { ...s.player, objectivesLandscape } } : s)),

      changeClass: (classDimension) => set((s) => (s.player ? { player: { ...s.player, classDimension } } : s)),

      swapCharacter: (id) => {
        const { completions, xpGrants, shards, owned } = get();
        const companion = COMPANIONS[id];
        const pathXp = xpByDimension([...completions, ...xpGrants])[companion.dimension];
        const has = owned ? (owned[id] ?? 0) > 0 : isUnlocked(companion, pathXp, shards[id]);
        if (!has) return false;
        set((s) => ({ party: { ...s.party, [companion.dimension]: id } }));
        return true;
      },

      claimObjective: (id, today = todayKey()) => {
        const data = pickData(get());
        if (!data.player || data.claimed.includes(id)) return null;
        const objective = [
          ...dailyObjectives(data.quests, data.completions, today, data.player.classDimension),
          ...weeklyObjectives(data.quests, data.completions, today),
        ].find((o) => o.id === id);
        if (!objective || !isObjectiveDone(objective)) return null;
        const reward = applyReward(data, id, objective.reward, today);
        // Ids carry their day ('daily:2026-09-27:…'); two weeks covers any live week.
        const cutoff = addDays(today, -14);
        const claimed = [...data.claimed.filter((c) => (c.split(':')[1] ?? '') >= cutoff), id];
        set({ ...reward.changes, claimed });
        return reward;
      },

      addGoal: (draft) =>
        set((s) => ({ goals: [...s.goals, { ...cleanDraft(draft), id: newId(), createdAt: todayKey() }] })),

      updateGoal: (id, draft) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...cleanDraft(draft) } : g)) })),

      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id), xpGrants: s.xpGrants.filter((x) => x.id !== id) })),

      toggleGoal: (id, today = todayKey()) => {
        const { goals, xpGrants, party } = get();
        const goal = goals.find((g) => g.id === id);
        if (!goal) return;
        if (goal.completedAt) {
          set({
            goals: goals.map((g) => (g.id === id ? { ...g, completedAt: undefined } : g)),
            xpGrants: xpGrants.filter((x) => x.id !== id),
          });
          return;
        }
        set({
          goals: goals.map((g) => (g.id === id ? { ...g, completedAt: today } : g)),
          xpGrants: goal.dimension
            ? [
                ...xpGrants,
                {
                  id,
                  date: today,
                  dimension: goal.dimension,
                  xp: GOAL_XP,
                  characterId: party[goal.dimension],
                  source: 'goal',
                },
              ]
            : xpGrants,
        });
      },

      markRevealed: (ids) => set((s) => ({ revealed: [...new Set([...(s.revealed ?? []), ...ids])] })),

      giftCharacters: (ids) =>
        set((s) => {
          const shards = { ...s.shards };
          for (const id of ids) shards[id] = Math.max(shards[id] ?? 0, SHARDS_TO_UNLOCK);
          return { shards };
        }),

      reconcileDraws: (random) => {
        const s = get();
        const pathXp = xpByDimension([...s.completions, ...s.xpGrants]);
        const changes = reconcile(s, pathXp, random, currentTier());
        if (changes) set(changes);
      },

      finishDrop: (id) =>
        set((s) => ({
          drops: withoutOne(s.drops, id),
          redrawn: withoutOne(s.redrawn, id),
          revealed: [...new Set([...(s.revealed ?? []), id])],
        })),

      redoDrop: (id, random) => {
        if (currentTier() !== 'premium') return null;
        const result = redo(get(), id, random);
        if (!result) return null;
        set(result.changes);
        return result.pick;
      },

      completeTutorial: () =>
        set((s) =>
          s.player
            ? {
                player: { ...s.player, tutorialComplete: true },
                quests: s.quests.map((q) => (q.id === TUTORIAL_QUEST_ID ? { ...q, active: false } : q)),
              }
            : s,
        ),

      settle: (today = todayKey()) => {
        const { player, completions, restDays, lastSettledDate } = get();
        if (!player) return;
        const ledger = settleRestDays(
          { restTokens: player.restTokens, restDays, lastSettledDate },
          completions,
          player.onboardedAt,
          today,
        );
        if (ledger.lastSettledDate === lastSettledDate) return;
        set({
          player: { ...player, restTokens: ledger.restTokens },
          restDays: ledger.restDays,
          lastSettledDate: ledger.lastSettledDate,
        });
      },

      resetGame: () => set(initialData),

      exportSave: () => {
        return JSON.stringify({
          app: BACKUP_APP,
          version: SAVE_VERSION,
          exportedAt: new Date().toISOString(),
          data: pickData(get()),
        });
      },

      importSave: (text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text.trim());
        } catch {
          return { ok: false, error: "That doesn't look like an Eight Paths backup. Paste the whole thing." };
        }
        const backup = parsed as { app?: unknown; version?: unknown; data?: unknown } | null;
        if (!backup || backup.app !== BACKUP_APP || typeof backup.version !== 'number') {
          return { ok: false, error: "That doesn't look like an Eight Paths backup." };
        }
        const data = migrateSave(backup.data, backup.version);
        if (!data.player) return { ok: false, error: 'That backup has no character in it.' };
        set(data);
        return { ok: true };
      },
    }),
    {
      name: 'eight-paths',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      // Without `migrate`, a version bump would discard the whole save.
      migrate: (persisted, version) => migrateSave(persisted, version),
      // Repair every load, not just upgrades, so a damaged save still opens.
      merge: (persisted, current) => ({ ...current, ...sanitizeSave(persisted) }),
      partialize: (s) => pickData(s),
    },
  ),
);
