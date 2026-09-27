import { defaultSelection, starterQuestsFrom, useOnboardingDraft } from '../onboarding';

beforeEach(() => useOnboardingDraft.getState().reset());

describe('onboarding starter quests', () => {
  it("starts with three: the class's first quest plus two quick wins", () => {
    expect(defaultSelection('intellectual')).toEqual(['intellectual:0', 'physical:2', 'emotional:1']);
    expect(starterQuestsFrom(defaultSelection('intellectual')).map((q) => q.title)).toEqual([
      'Drink water',
      'Read 20 min',
      'Gratitude list',
    ]);
  });

  it("never doubles up on the class's own Path", () => {
    expect(defaultSelection('physical')).toEqual(['physical:0', 'emotional:1', 'social:0']);
    expect(defaultSelection('emotional')).toEqual(['emotional:0', 'physical:2', 'social:0']);
  });

  it('follows the class until the player picks their own quests', () => {
    const draft = useOnboardingDraft.getState();
    draft.setClass('social');
    expect(useOnboardingDraft.getState().selected).toEqual(['social:0', 'physical:2', 'emotional:1']);
    useOnboardingDraft.getState().toggleStarter('financial:0');
    useOnboardingDraft.getState().setClass('spiritual');
    expect(useOnboardingDraft.getState().selected).toContain('financial:0');
    expect(useOnboardingDraft.getState().selected).toContain('social:0');
  });
});
