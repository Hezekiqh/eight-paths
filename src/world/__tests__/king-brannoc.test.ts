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

describe('the cells ending', () => {
  const cells = (cellsEmpty: boolean) =>
    winScene('war-hall', 'kaldor-beaten', true, false, false, cellsEmpty)!
      .choices!.find((c) => c.outcome.flags.includes('kaldor-jailed'))!
      .lines.join(' ');

  it("has Gary see it only if he's still down there", () => {
    expect(cells(false)).toContain('GARY:');
    expect(cells(true)).not.toContain('GARY');
  });
});

describe("Captain Orsk's gate", () => {
  it('fits four rows: "Leave it to...", the polite one and the mean one, and a way past for each Path', () => {
    const { GATE_ANSWERS } = jest.requireActual('../castle') as typeof import('../castle');
    const anyone = GATE_ANSWERS.filter((a) => !a.path);
    expect(1 + anyone.length).toBeLessThanOrEqual(4);
    expect(anyone.filter((a) => a.deed === 'bad')).toHaveLength(1);
    expect(new Set(GATE_ANSWERS.flatMap((a) => (a.path ? [a.path] : []))).size).toBe(8);
  });
});
