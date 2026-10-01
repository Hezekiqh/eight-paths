import { DIMENSIONS } from '@/game';

import {
  HOW_ASK,
  PARTY_ASK,
  habitLine,
  keeperQuestions,
  partyLines,
  strongestLine,
  weakestLine,
  type KeeperFacts,
  type KeeperHero,
} from '../keeper-advice';

const none = { done: 0, due: 0, rate: null };
const hero = (name: string, level: number, i = 0): KeeperHero => ({
  name,
  level,
  path: `Path${i}`,
  dimension: DIMENSIONS[i],
});

const facts = (over: Partial<KeeperFacts> = {}): KeeperFacts => ({
  today: '2026-10-01',
  name: 'Ash',
  streak: 0,
  best: 0,
  week: { current: none, previous: none },
  party: DIMENSIONS.map((_, i) => hero(`H${i}`, 1, i)),
  bench: [],
  dusty: null,
  ...over,
});

const filled = (line: string) => expect(line).not.toMatch(/[{}]/);

describe('the Keeper\'s advice', () => {
  it('counts a long streak', () => {
    const line = habitLine(facts({ streak: 9 }));
    expect(line).toContain('9');
    filled(line);
  });

  it('reminds you of your best run once a streak breaks, without shaming', () => {
    expect(habitLine(facts({ streak: 1, best: 12 }))).toContain('12 days');
  });

  it('compares this week to the last', () => {
    const up = facts({ week: { current: { done: 6, due: 10, rate: 0.6 }, previous: { done: 3, due: 10, rate: 0.3 } } });
    expect(habitLine(up)).toMatch(/Better than last week/);
  });

  it('names the strongest party member only when someone is ahead', () => {
    expect(strongestLine(facts())).toBeNull();
    const party = DIMENSIONS.map((_, i) => hero(`H${i}`, i === 2 ? 6 : 1, i));
    const line = strongestLine(facts({ party }))!;
    expect(line).toContain('H2');
    filled(line);
  });

  it('points at a dusty Path before the lowest level', () => {
    const line = weakestLine(facts({ dusty: { path: 'Mage', hero: 'Quill' } }))!;
    expect(line).toContain('Mage');
    expect(line).toContain('Quill');
  });

  it('suggests a bench hero who outlevels their Path walker', () => {
    const lines = partyLines(facts({ bench: [hero('Bo', 4, 0)] }));
    expect(lines.join(' ')).toContain('Bo');
    expect(lines.join(' ')).toContain('H0');
    lines.forEach(filled);
  });

  it('still has fun advice for a bench hero with no levels', () => {
    const lines = partyLines(facts({ bench: [hero('Plush', 1, 3)] }));
    expect(lines[0]).toContain('Plush');
    lines.forEach(filled);
  });

  it('offers his two questions', () => {
    expect(keeperQuestions(facts()).map((q) => q.ask)).toEqual([HOW_ASK, PARTY_ASK]);
  });

  it('gives the same answers all day', () => {
    const f = facts({ streak: 20, bench: [hero('Bo', 1, 0)], dusty: { path: 'Mage', hero: 'Quill' } });
    expect(keeperQuestions(f)).toEqual(keeperQuestions({ ...f }));
  });
});
