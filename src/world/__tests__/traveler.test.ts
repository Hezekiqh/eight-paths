import { MAPS } from '../maps';
import { TRAVELER_DIRECTIONS, TRAVELER_FRIEND, isTraveler, travelerTalk } from '../traveler';

describe('the Traveler', () => {
  const placed = Object.values(MAPS).flatMap((m) => m.npcs.filter(isTraveler).map((n) => ({ map: m.id, n })));

  it('stands in Warrior City and every place after, with directions for each, until Kaldor is beaten', () => {
    expect(placed.map((p) => p.map).sort()).toEqual(['deserters-camp', 'kingdom-town', 'warrior-city']);
    for (const { map, n } of placed) {
      expect(TRAVELER_DIRECTIONS[map]?.length).toBeGreaterThan(0);
      expect(n.goneAfter).toBe('kaldor-beaten');
    }
  });

  it('gives directions only if you are nice to him, and remembers it', () => {
    let next: ReturnType<typeof travelerTalk> | null = null;
    let friend = false;
    const hello = travelerTalk('warrior-city', [], () => (friend = true), (d) => (next = d));
    expect(hello.questions).toBeUndefined();
    hello.choices!.find((c) => c.deed === 'bad')!.then();
    expect(friend).toBe(false);
    expect(next!.questions).toBeUndefined();
    hello.choices!.find((c) => c.deed === 'good')!.then();
    expect(friend).toBe(true);
    expect(next!.questions!.map((q) => q.ask)).toEqual(['Where am I?', 'Who are you?', 'Where should I go?']);
    expect(next!.questions![0].answer).toEqual(['Virth.']);
    expect(next!.farewell).toEqual(["I'll see you around!"]);
    expect(travelerTalk('warrior-city', [TRAVELER_FRIEND], () => {}, () => {}).questions).toHaveLength(3);
  });
});
