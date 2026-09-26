import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DAILY,
  STARTING_REST_TOKENS,
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

export type ToggleOutcome =
  | { kind: 'completed'; completionId: string; dimension: Dimension; gain: XpGain }
  | { kind: 'undone' }
  | { kind: 'ignored' };

type Actions = {
  startGame: (input: StartGameInput, today?: string) => void;
  toggleQuest: (questId: string, today?: string) => ToggleOutcome;
  addQuest: (draft: QuestDraft) => void;
  updateQuest: (id: string, draft: QuestDraft) => void;
  archiveQuest: (id: string) => void;
  setNotificationTime: (time: string) => void;
  changeClass: (dimension: Dimension) => void;
  completeTutorial: () => void;
  settle: (today?: string) => void;
  resetGame: () => void;
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

      toggleQuest: (questId, today = todayKey()) => {
        const { player, quests, completions } = get();
        const quest = quests.find((q) => q.id === questId);
        if (!player || !quest) return { kind: 'ignored' };

        const xpBefore = xpByDimension(completions)[quest.dimension];
        const result = toggleCompletion(completions, quest, player.classDimension, today, newId());
        set({ completions: result.completions });

        if (result.kind === 'completed') {
          return {
            kind: 'completed',
            completionId: result.completion.id,
            dimension: quest.dimension,
            gain: describeXpGain(xpBefore, result.completion.xp),
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
        set((s) => ({ quests: s.quests.map((q) => (q.id === id ? { ...q, active: false } : q)) })),

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
    }),
    {
      name: 'eight-paths',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
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
