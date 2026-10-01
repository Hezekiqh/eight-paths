import { isShouted, rumblesIn } from '../rumbles';

describe('rumbles', () => {
  it('finds the loud words where they start', () => {
    const line = 'Then the crowd roars, the real roar, the one nobody told them to make.';
    expect(rumblesIn(line)).toEqual([{ at: line.indexOf('roars'), kind: 'roar' }]);
    expect(rumblesIn('She screams, and the door slams.').map((r) => r.kind)).toEqual(['scream', 'crash']);
    expect(rumblesIn('RAAAH.')).toEqual([{ at: 0, kind: 'roar' }]);
  });

  it('hides little ones in lines already written', () => {
    const kinds = (line: string) => rumblesIn(line).map((r) => r.kind);
    expect(kinds('You knock. From inside: "We\'re not buying!"')).toEqual(['knock']);
    expect(kinds('For a heartbeat the Kaldorium is silent.')).toEqual(['heartbeat']);
    expect(kinds('The last bearer slumps to the floor, snoring happily.')).toEqual(['snore']);
    expect(kinds('Zzz... hm? Ah.')).toEqual(['snore']);
    expect(kinds('Wim laughs so hard he has to sit down.')).toEqual(['laugh']);
    expect(kinds('Hug? Hug.')).toEqual(['hug']);
    expect(kinds('The bell rings once.')).toEqual(['bell']);
    expect(kinds('Cold air whistles through.')).toEqual(['whistle']);
    expect(kinds('Ah-CHOO!')).toEqual(['sneeze']);
  });

  it('leaves quiet words alone', () => {
    expect(rumblesIn('A strike knocks them back.')).toEqual([]);
    expect(rumblesIn('He gives the bellows a squeeze.')).toEqual([]);
    expect(rumblesIn('A town crier with a brass bell.')).toEqual([]);
    expect(rumblesIn('A round, cheerful monk throws a Boomerang at the bellows.')).toEqual([]);
  });

  it('hears shouting', () => {
    expect(isShouted("I didn't run!")).toBe(true);
    expect(isShouted('MOVE IT, RECRUIT.')).toBe(true);
    expect(isShouted('Go on, then.')).toBe(false);
    expect(isShouted('Ok.')).toBe(false);
  });
});
