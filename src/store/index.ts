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
  BOOST_MULTIPLIER,
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

import { COMPANIONS, DEFAULT_PARTY, isUnlocked, type CharacterId } from '@/story/companions';

import { newId } from './ids';
import { GOAL_XP, applyReward, type RewardResult } from './rewards';
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
  setNotificationTime: (time: string) => void;
  setHapticsEnabled: (on: boolean) => void;
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
};

/** Every saved field, for persisting and backups. */
export function pickData(s: GameData): GameData {
  const { player, quests, completions, restDays, lastSettledDate, party, xpGrants, boosts, shards, claimed, goals } = s;
  return { player, quests, completions, restDays, lastSettledDate, party, xpGrants, boosts, shards, claimed, goals };
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
          },
          quests: [tutorial, ...quests.map((q) => makeQuest({ ...q, repeatDays: DAILY }))],
        });
      },

      toggleQuest: (questId, today = todayKey()) => {
        const { player, quests, completions, restDays, party, xpGrants, boosts } = get();
        const quest = quests.find((q) => q.id === questId);
        if (!player || !quest) return { kind: 'ignored' };

        const xpBefore = xpByDimension([...completions, ...xpGrants])[quest.dimension];
        const result = toggleCompletion(completions, quest, today, newId());
        if (result.kind !== 'completed') {
          set({ completions: result.completions });
          return { kind: result.kind };
        }
        const boosted = boosts.some((b) => b.date === today && b.dimension === quest.dimension);
        const completion = {
          ...result.completion,
          xp: boosted ? result.completion.xp * BOOST_MULTIPLIER : result.completion.xp,
          characterId: party[quest.dimension],
        };
        set({ completions: result.completions.map((c) => (c === result.completion ? completion : c)) });
        const xpBeforeAll = totalXp([...completions, ...xpGrants]);
        const levelAfter = overallLevelFromXp(xpBeforeAll + completion.xp).level;
        const overallLevelUp = levelAfter > overallLevelFromXp(xpBeforeAll).level ? levelAfter : null;
        const characterXp = [...completions, ...xpGrants]
          .filter((c) => (c.characterId ?? DEFAULT_PARTY[c.dimension]) === completion.characterId)
          .reduce((sum, c) => sum + c.xp, 0);
        return {
          characterLeveledUp: describeXpGain(characterXp, completion.xp).leveledUp,
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
              ? { ...q, title: draft.title.trim(), dimension: draft.dimension, repeatDays: [...draft.repeatDays].sort() }
              : q,
          ),
        })),

      archiveQuest: (id) =>
        set((s) => ({
          quests: s.quests.map((q) => (q.id === id ? { ...q, active: false, archivedAt: todayKey() } : q)),
        })),

      setNotificationTime: (notificationTime) =>
        set((s) => (s.player ? { player: { ...s.player, notificationTime } } : s)),

      setHapticsEnabled: (hapticsEnabled) =>
        set((s) => (s.player ? { player: { ...s.player, hapticsEnabled } } : s)),

      changeClass: (classDimension) =>
        set((s) => (s.player ? { player: { ...s.player, classDimension } } : s)),

      swapCharacter: (id) => {
        const { completions, xpGrants, shards } = get();
        const companion = COMPANIONS[id];
        const pathXp = xpByDimension([...completions, ...xpGrants])[companion.dimension];
        if (!isUnlocked(companion, pathXp, shards[id])) return false;
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
                { id, date: today, dimension: goal.dimension, xp: GOAL_XP, characterId: party[goal.dimension], source: 'goal' },
              ]
            : xpGrants,
        });
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
