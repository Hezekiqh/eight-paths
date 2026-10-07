import { DEFAULT_PARTY } from '@/story/companions';

import { chattersWithYou, partyWithYou } from '../hero';

// The character you walk as is silent, like Frisk or a Pokémon trainer (author, Oct 7, 2026).
describe('the silent hero', () => {
  it('never joins in the banter: everyone with you talks, except you', () => {
    const everyone = Object.values(DEFAULT_PARTY).map((id) => `met:${id}`);
    const party = partyWithYou(DEFAULT_PARTY, undefined, everyone);
    for (const walking of party) {
      const talk = chattersWithYou(DEFAULT_PARTY, undefined, everyone, walking);
      expect(talk).not.toContain(walking);
      expect(talk).toHaveLength(party.length - 1);
    }
  });
});
