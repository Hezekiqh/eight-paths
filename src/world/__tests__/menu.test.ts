import { ANSWERS, DRINKS } from '../felix-maze';
import { MENU_ROWS, shownQuestions } from '../menu';

const qs = ['a', 'b', 'c', 'd', 'e'].map((ask) => ({ ask }));
const asks = (shown: { ask: string }[]) => shown.map((q) => q.ask);

describe('shownQuestions', () => {
  it('leaves a row for Goodbye', () => {
    expect(asks(shownQuestions(qs, []))).toEqual(['a', 'b', 'c']);
  });

  it('brings the next unasked question forward once one is asked', () => {
    expect(asks(shownQuestions(qs, ['b']))).toEqual(['a', 'c', 'd']);
    expect(asks(shownQuestions(qs, ['a', 'b', 'c']))).toEqual(['d', 'e', 'a']);
  });

  it('shows everything when there are three or fewer', () => {
    expect(asks(shownQuestions(qs.slice(0, 2), ['a']))).toEqual(['b', 'a']);
  });
});

describe('the mean one', () => {
  it('always keeps its row, last, however many questions there are', () => {
    const many = [...qs, { ask: 'rude', deed: 'bad' }];
    expect(asks(shownQuestions(many, []))).toEqual(['a', 'b', 'rude']);
    expect(asks(shownQuestions(many, ['a', 'b']))).toEqual(['c', 'd', 'rude']);
    expect(asks(shownQuestions([{ ask: 'x' }, { ask: 'rude', deed: 'bad' }], []))).toEqual(['x', 'rude']);
  });
});

describe("Sir Himothy's answers", () => {
  it('fit one menu: two clever ones, two anyone can say', () => {
    expect(ANSWERS.length).toBeLessThanOrEqual(MENU_ROWS);
    expect(ANSWERS.filter((a) => a.path)).toHaveLength(2);
    expect(ANSWERS.filter((a) => !a.path)).toHaveLength(2);
  });
  it('has one mean answer, and it knocks you out', () => {
    const mean = ANSWERS.filter((a) => a.deed === 'bad');
    expect(mean).toHaveLength(1);
    expect(mean[0].knockout && mean[0].jailed).toBe(true);
  });
  it('lands you in the cells whatever you say (the drink by way of the Candle Inn)', () => {
    for (const a of ANSWERS) expect(a.jailed || a.drinks).toBe(true);
  });
  it('has four drinks at the bar, every one named for the king', () => {
    expect(DRINKS.menu.length).toBeLessThanOrEqual(MENU_ROWS);
    for (const d of DRINKS.menu) expect(d.label).toContain('Kaldor');
    expect(DRINKS.noMoney.join(' ')).toContain('{them}');
  });
});
