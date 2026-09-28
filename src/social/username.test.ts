import { founderLabel, usernameProblem } from './username';

describe('usernameProblem', () => {
  it('accepts ordinary names', () => {
    expect(usernameProblem('hezekiah')).toBeNull();
    expect(usernameProblem('Pip_Fan_82')).toBeNull();
    expect(usernameProblem('  moss  ')).toBeNull();
  });

  it('rejects names that are too short or too long', () => {
    expect(usernameProblem('ab')).toMatch(/At least/);
    expect(usernameProblem('a'.repeat(17))).toMatch(/At most/);
  });

  it('rejects spaces and symbols', () => {
    expect(usernameProblem('pip larkspur')).toMatch(/Letters/);
    expect(usernameProblem('moss!')).toMatch(/Letters/);
    expect(usernameProblem('émile')).toMatch(/Letters/);
  });

  it('rejects reserved names anywhere in the name, in any case', () => {
    expect(usernameProblem('TheKeeper')).toMatch(/reserved/);
    expect(usernameProblem('Real_OFFICIAL')).toMatch(/reserved/);
  });
});

describe('founderLabel', () => {
  it('pads to three digits', () => {
    expect(founderLabel(7)).toBe('#007');
    expect(founderLabel(100)).toBe('#100');
  });
});
