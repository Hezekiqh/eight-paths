import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DAILY,
  STARTING_REST_TOKENS,
  canLogDay,
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
  type Completion,
  type Dimension,
  type Player,
  type Quest,
  type RestDay,
  type XpGain,
} from '@/game';

import { newId } from './ids';
import { SAVE_VERSION, migrateSave, sanitizeSave } from './migrations';

export type GameData = {
  player: Player | null;
  quests: Quest[];
  completions: Completion[];
  restDays: RestDay[];
  lastSettledDate: string | null;
};

export type QuestDraft = Pick<Quest, 'title' | 'dimension' | 'repeatDays'>;

export type StartGameInput = {
  name: string;
  classDimension: Dimension;
  quests: { title: string; dimension: Dimension }[];
};

/** Something worth celebrating beyond the XP bar. */
export type Milestone = { title: string; detail: string };

export type ToggleOutcome =
  | { kind: 'completed'; completionId: string; dimension: Dimension; gain: XpGain; milestone: Milestone | null }
  | { kind: 'undone' }
  | { kind: 'ignored' };

export type ImportResult = { ok: true } | { ok: false; error: string };

type Actions = {
  startGame: (input: StartGameInput, today?: string) => void;
  /** Toggles `questId` on `day` (default today); yesterday is loggable until noon. */
  toggleQuest: (questId: string, today?: string, day?: string, now?: Date) => ToggleOutcome;
  addQuest: (draft: QuestDraft) => void;
  updateQuest: (id: string, draft: QuestDraft) => void;
  archiveQuest: (id: string) => void;
  setNotificationTime: (time: string) => void;
  changeClass: (dimension: Dimension) => void;
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
};

const todayKey = () => toDateKey(new Date());

const BACKUP_APP = 'eight-paths';

/** Rebuilds the rest ledger from scratch; it's fully determined by the completions. */
function rebuildLedger(player: Player, completions: Completion[], today: string) {
  return settleRestDays(
    { restTokens: STARTING_REST_TOKENS, restDays: [], lastSettledDate: null },
    completions,
    player.onboardedAt,
    today,
  );
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
          },
          quests: [tutorial, ...quests.map((q) => makeQuest({ ...q, repeatDays: DAILY }))],
        });
      },

      toggleQuest: (questId, today = todayKey(), day = today, now = new Date()) => {
        const { player, quests, completions, restDays } = get();
        const quest = quests.find((q) => q.id === questId);
        if (!player || !quest || !canLogDay(day, today, now)) return { kind: 'ignored' };

        const xpBefore = xpByDimension(completions)[quest.dimension];
        const result = toggleCompletion(completions, quest, player.classDimension, day, newId());
        if (day === today) {
          set({ completions: result.completions });
        } else {
          // A logged or undone past day can change whether a rest token was
          // spent (or earned) at midnight, so settle the ledger again.
          const ledger = rebuildLedger(player, result.completions, today);
          set({
            completions: result.completions,
            player: { ...player, restTokens: ledger.restTokens },
            restDays: ledger.restDays,
            lastSettledDate: ledger.lastSettledDate,
          });
        }

        if (result.kind === 'completed') {
          return {
            kind: 'completed',
            completionId: result.completion.id,
            dimension: quest.dimension,
            gain: describeXpGain(xpBefore, result.completion.xp),
            milestone: describeMilestone({ completions, restDays }, result.completions, player.onboardedAt, today),
          };
        }
        return { kind: result.kind };
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

      changeClass: (classDimension) =>
        set((s) => (s.player ? { player: { ...s.player, classDimension } } : s)),

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
        const { player, quests, completions, restDays, lastSettledDate } = get();
        return JSON.stringify({
          app: BACKUP_APP,
          version: SAVE_VERSION,
          exportedAt: new Date().toISOString(),
          data: { player, quests, completions, restDays, lastSettledDate },
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
      partialize: ({ player, quests, completions, restDays, lastSettledDate }) => ({
        player,
        quests,
        completions,
        restDays,
        lastSettledDate,
      }),
    },
  ),
);
