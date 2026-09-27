// Generates a believable five-week save for App Store screenshots and prints
// the persisted store JSON (the value Zustand writes under 'eight-paths').
// Usage: node scripts/demo-state.mjs > demo.json
// Deterministic: the same date always produces the same save.

const DAY = 86_400_000;
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
today.setHours(12, 0, 0, 0);
const dayOffset = (n) => new Date(today.getTime() + n * DAY);

let seed = 42;
const rand = () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
  return seed / 2 ** 31;
};

const CLASS = 'intellectual';
const DAILY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

// [id, title, dimension, repeatDays, chance per scheduled day, last active day offset]
const QUESTS = [
  ['q-read', 'Read 20 min', 'intellectual', DAILY, 0.85, 0],
  ['q-lang', 'Language practice', 'intellectual', WEEKDAYS, 0.7, 0],
  ['q-move', 'Move 30 min', 'physical', DAILY, 0.75, 0],
  ['q-water', 'Drink water', 'physical', DAILY, 0.8, 0],
  ['q-journal', 'Journal feelings', 'emotional', DAILY, 0.65, 0],
  ['q-grat', 'Gratitude list', 'emotional', [0, 3, 6], 0.7, -1],
  ['q-spend', "Log today's spending", 'financial', DAILY, 0.5, -1],
  ['q-friend', 'Message a friend', 'social', [2, 5], 0.8, -1],
  ['q-deep', 'Deep work block', 'occupational', WEEKDAYS, 0.45, -1],
  ['q-quiet', 'Quiet time', 'spiritual', [0], 0.9, -2],
  ['q-out', 'Time outdoors', 'environmental', [0, 6], 0.7, -4],
];

const START = -34;
const quests = [
  {
    id: 'tutorial',
    title: 'Begin your journey',
    dimension: CLASS,
    repeatDays: [],
    active: false,
    createdAt: dayOffset(START).toISOString(),
  },
  ...QUESTS.map(([id, title, dimension, repeatDays]) => ({
    id,
    title,
    dimension,
    repeatDays,
    active: true,
    createdAt: dayOffset(START).toISOString(),
  })),
];

const completions = [
  { id: 'c-tutorial', questId: 'tutorial', dimension: CLASS, date: key(dayOffset(START)), xp: 10 },
];

// Today: leave a few quests open so the Today list shows both states.
const OPEN_TODAY = new Set(['q-lang', 'q-journal']);

for (let offset = START; offset <= 0; offset += 1) {
  const date = dayOffset(offset);
  // The last seven days run hotter than the week before, so the ghost shows.
  const boost = offset > -7 ? 0.15 : offset > -14 ? -0.15 : 0;
  for (const [id, , dimension, repeatDays, chance, lastActive] of QUESTS) {
    if (!repeatDays.includes(date.getDay())) continue;
    if (offset > lastActive) continue;
    if (offset === 0 && OPEN_TODAY.has(id)) continue;
    if (offset !== lastActive && rand() > chance + boost) continue;
    completions.push({
      id: `c-${id}-${offset}`,
      questId: id,
      dimension,
      date: key(date),
      xp: 10,
      // Dessa joined the Warriors ten days ago; everything before was Brannoc's.
      characterId: dimension === 'physical' && offset > -10 ? 'dessa' : undefined,
    });
  }
}

const state = {
  player: {
    name: 'Ada',
    classDimension: CLASS,
    restTokens: 2,
    onboardedAt: key(dayOffset(START)),
    tutorialComplete: true,
    notificationTime: '20:00',
    hapticsEnabled: true,
  },
  quests,
  completions,
  restDays: [],
  lastSettledDate: key(dayOffset(-1)),
  // Dessa (a recruit) leads the Warriors, to show off swapping and the collection.
  party: {
    physical: 'dessa',
    financial: 'ysolde',
    intellectual: 'quill',
    spiritual: 'wren',
    emotional: 'oren',
    social: 'pip',
    occupational: 'tamsin',
    environmental: 'moss',
  },
  xpGrants: [],
  boosts: [],
  shards: { hollis: 2, fern: 1 },
  claimed: [],
  goals: [
    { id: 'g-5k', title: 'Run a 5K', dimension: 'physical', dueDate: key(dayOffset(40)), createdAt: key(dayOffset(-20)) },
    { id: 'g-book', title: 'Finish a book this month', dimension: 'intellectual', createdAt: key(dayOffset(-10)) },
    { id: 'g-call', title: 'Call Grandma', createdAt: key(dayOffset(-3)), completedAt: key(dayOffset(-1)) },
  ],
};

process.stdout.write(JSON.stringify({ state, version: 4 }));
