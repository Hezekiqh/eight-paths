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
  it('says which Path can do a job, and who to walk as, until it is done', () => {
    const wall = describeNotice(jobNotice('barracks-armoury', 'C'), ctx())!;
    expect(wall.title).toBe('The cracked wall');
    expect(wall.hint).toBe('A Warrior can do this: walk as Brannoc (pause, then Party).');
    expect(describeNotice(jobNotice('barracks-armoury', 'C'), ctx(['armoury-wall']))).toBeNull();
  });

  it("names someone's job by them, and the Path it needs", () => {
    const n = describeNotice(npcNotice('kingdom-town', 'barnaby'), ctx())!;
    expect(n.hint).toMatch(/^A Bard can do this: walk as /);
  });

  it('says what a locked door needs, in habits', () => {
    const n = describeNotice(exitNotice('camp-barracks'), ctx())!;
    expect(n.hint).toMatch(/Needs Overall Lv 9; you're Lv 5\. Finish about \d+ more habits\. Any habit counts\./);
  });

  it("explains a lost boss fight by its tell and the walking character's level", () => {
    const n = describeNotice(fightNotice('war-hall'), ctx())!;
    expect(n.hint).toBe(
      'Your blows glance off Kaldor while he casts no shadow. Roll aside when he charges: when a torch gutters and his shadow comes back, strike. Quill is Lv 12 and hits for 3. At Lv 20 they hit harder: finish Mage habits, or walk as a stronger party member.',
    );
    expect(describeNotice(fightNotice('war-hall'), ctx(['kaldor-beaten']))).toBeNull();
  });

  it('lists the most recent first and drops what is done', () => {
    const ids = [jobNotice('forge', 'V'), jobNotice('chapel', '4')];
    expect(openNotices(ids, ctx(['forge-fixed'])).map((n) => n.id)).toEqual([jobNotice('chapel', '4')]);
  });
});
