import { DEFAULT_PARTY } from '@/story/companions';

import { BRANNOC_KING, BRANNOC_REJOINED, brannocAway } from '../castle';
import { walkersFor } from '../hero';
import { withRoster } from '../hero-rooms';
import { MAPS } from '../maps';
import { winScene } from '../scenes';

const everyone = Object.values(DEFAULT_PARTY).map((id) => `met:${id}`);

describe('King Brannoc, working remotely', () => {
  it('stays to rule when he takes the throne, and is out of your party until he catches you up', () => {
    const crowned = [...everyone, BRANNOC_KING];
    expect(brannocAway(crowned)).toBe(true);
    expect(walkersFor(DEFAULT_PARTY, undefined, crowned, crowned)).not.toContain('brannoc');
    const back = [...crowned, BRANNOC_REJOINED];
    expect(brannocAway(back)).toBe(false);
    expect(walkersFor(DEFAULT_PARTY, undefined, back, back)).toContain('brannoc');
  });

  it('is in neither his room nor the Archive hall while he rules', () => {
    const crowned = [...everyone, BRANNOC_KING];
    const room = withRoster(MAPS['room-brannoc'], 0, crowned);
    expect(room.npcs.some((n) => n.character === 'brannoc')).toBe(false);
  });

  it('walking as Brannoc, you leave at once: nobody has to catch you up', () => {
    const scene = winScene('war-hall', 'kaldor-beaten', true, true, true)!;
    const crown = scene.choices!.find((c) => c.outcome.flags.includes(BRANNOC_KING))!;
    expect(crown.outcome.flags).toContain(BRANNOC_REJOINED);
    const other = winScene('war-hall', 'kaldor-beaten', true, true, false)!;
    expect(other.choices!.find((c) => c.outcome.flags.includes(BRANNOC_KING))!.outcome.flags).not.toContain(
      BRANNOC_REJOINED,
    );
  });
});
