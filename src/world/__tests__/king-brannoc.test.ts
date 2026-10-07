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

describe('the throne (author, Oct 7, 2026)', () => {
  const scene = (opts: { mean?: boolean; name?: string; cellsEmpty?: boolean; felix?: boolean } = {}) =>
    winScene('war-hall', 'kaldor-beaten', true, opts.felix ?? false, false, opts.cellsEmpty ?? false, {
      mean: opts.mean ?? false,
      name: opts.name,
    })!;
  const said = (s: ReturnType<typeof scene>, label: string) =>
    s.choices!.find((c) => c.label === label)!.lines.join(' ');

  it('takes his shadows from him, and sends him to his own cells whatever you choose', () => {
    const s = scene();
    expect(s.shadows).toBe(true);
    expect(s.after!.join(' ')).toContain('an old man');
    expect(s.choices!.map((c) => c.label)).toEqual(['Brannoc takes the throne.', 'Take the throne yourself.']);
    for (const c of s.choices!)
      expect(c.outcome.flags).toEqual(expect.arrayContaining(['kaldor-jailed', 'kaldor-dethroned']));
  });
  it("has Gary see it only if he's still down there", () => {
    expect(scene().after!.join(' ')).toContain('GARY:');
    expect(scene({ cellsEmpty: true }).after!.join(' ')).not.toContain('GARY');
  });
  it('has Brannoc ask what now, and Felix fade, if he was there', () => {
    expect(scene().after).toContain('BRANNOC: What do we do?');
    expect(scene({ felix: true }).after).toContain('FELIX: This is turning out better than I expected.');
    expect(scene().after!.join(' ')).not.toContain('FELIX');
  });
  it('changes how you put it when you have been more mean than kind, and Brannoc asks your name', () => {
    expect(said(scene(), 'Brannoc takes the throne.')).toContain('face his fears');
    const forced = said(scene({ mean: true, name: 'Hez' }), 'Brannoc takes the throne.');
    expect(forced).toContain('listen to my orders');
    expect(forced).toContain('BRANNOC: OK, Hez. As you command.');
    expect(said(scene(), 'Take the throne yourself.')).toContain('champion');
    expect(said(scene({ mean: true }), 'Take the throne yourself.')).toContain('my liege');
    expect(scene({ mean: true }).choices![0].outcome.flags).toContain('throne-mean');
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
