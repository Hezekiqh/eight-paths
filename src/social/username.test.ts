import { extractFriendCode, founderLabel, searchTerm, usernameProblem } from './username';

describe('searchTerm', () => {
  it('cleans up what was typed into a search', () => {
    expect(searchTerm(' @Moss_Fan ')).toBe('moss_fan');
    expect(searchTerm('pi')).toBe('pi');
  });

  it('waits for two characters, and ignores what no username could contain', () => {
    expect(searchTerm('p')).toBeNull();
    expect(searchTerm('@')).toBeNull();
    expect(searchTerm('pip larkspur')).toBeNull();
    expect(searchTerm('8P-7KQ2-XM4D')).toBeNull();
  });
});

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

describe('extractFriendCode', () => {
  it('accepts a code in any case, with or without dashes', () => {
    expect(extractFriendCode('8P-PD74-ZWRD')).toBe('8P-PD74-ZWRD');
    expect(extractFriendCode('8p-pd74-zwrd')).toBe('8P-PD74-ZWRD');
    expect(extractFriendCode(' 8ppd74zwrd ')).toBe('8P-PD74-ZWRD');
  });

  it('finds the code inside a pasted share message or link', () => {
    const message =
      'Walk the Eight Paths with me. Join with my friend code 8P-PD74-ZWRD and we both wake a hero.\neightpaths://friend/8P-PD74-ZWRD';
    expect(extractFriendCode(message)).toBe('8P-PD74-ZWRD');
    expect(extractFriendCode('eightpaths://friend/8P-AB23-CD45')).toBe('8P-AB23-CD45');
  });

  it('rejects incomplete or too-long codes', () => {
    expect(extractFriendCode('8P-PD74-ZWR')).toBeNull();
    expect(extractFriendCode('8P-PD74-ZWR8P-')).toBeNull();
    expect(extractFriendCode('hello')).toBeNull();
  });
});
