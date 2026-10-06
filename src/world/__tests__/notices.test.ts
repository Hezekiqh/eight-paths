import { DEFAULT_PARTY } from '@/story/companions';

import type { HeroId } from '../hero';

import {
  describeNotice,
  exitNotice,
  fightNotice,
  jobNotice,
  npcNotice,
  openNotices,
  type NoticeContext,
} from '../notices';

const byPath = {
  physical: 0,
  financial: 0,
  intellectual: 0,
  spiritual: 0,
  emotional: 0,
  social: 0,
  occupational: 0,
  environmental: 0,
};
const ctx = (flags: string[] = []): NoticeContext => ({
  xp: { total: 0, byPath, flags },
  party: DEFAULT_PARTY,
  levelOf: () => 12,
  hero: DEFAULT_PARTY.intellectual as HeroId,
});

describe('notices', () => {
  it('says which Path can do a job, and who will step up, until it is done', () => {
    // in this run of the story, only once you've met him (he's in your collection either way)
    expect(describeNotice(jobNotice('barracks-armoury', 'C'), ctx())!.hint).toBe(
      "A Warrior can do this. You haven't met one yet.",
    );
    const wall = describeNotice(jobNotice('barracks-armoury', 'C'), ctx(['met:brannoc']))!;
    expect(wall.title).toBe('The cracked wall');
    expect(wall.hint).toBe('A Warrior can do this: Brannoc will step up.');
    expect(describeNotice(jobNotice('barracks-armoury', 'C'), ctx(['armoury-wall']))).toBeNull();
  });

  it("names someone's job by them, and the Path it needs", () => {
    const n = describeNotice(npcNotice('warrior-city', 'barnaby'), ctx(['met:pip']))!;
    expect(n.hint).toMatch(/^A Bard can do this: \w+ will step up\.$/);
  });

  it('has nothing to say about a road: no road is locked behind a level', () => {
    expect(describeNotice(exitNotice('city-north'), ctx())).toBeNull();
  });

  it("explains a lost boss fight by its tell and the walking character's level", () => {
    const n = describeNotice(fightNotice('war-hall'), ctx())!;
    expect(n.hint).toBe(
      'The shadows chase; Aurek flashes red before he slams the ground. Roll away from the ring, then hit him while he rises. The stronger you are, the faster the shadows break: every habit counts. Quill is Lv 12 and hits for 3. At Lv 20 they hit harder: finish Mage habits, or walk as a stronger party member.',
    );
    expect(describeNotice(fightNotice('war-hall'), ctx(['kaldor-beaten']))).toBeNull();
  });

  it('lists the most recent first and drops what is done', () => {
    const ids = [jobNotice('forge', 'V'), jobNotice('chapel', '4')];
    expect(openNotices(ids, ctx(['forge-fixed'])).map((n) => n.id)).toEqual([jobNotice('chapel', '4')]);
  });
});
