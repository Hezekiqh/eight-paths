import { KEEPER_CALLS, callDue, callFlag } from '../keeper-calls';

describe("the Keeper's telephone", () => {
  it('rings once Brannoc has joined you, and not again once answered', () => {
    expect(callDue([])).toBeNull();
    const call = callDue(['brannoc-joined'])!;
    expect(call.id).toBe('brannoc-joined');
    expect(call.lines[0]).toMatch(/Keeper/);
    expect(callDue(['brannoc-joined', callFlag(call)])).toBeNull();
  });

  it('keeps every call in his voice: never thee or thou', () => {
    for (const c of KEEPER_CALLS) expect(c.lines.join(' ')).not.toMatch(/\b(thee|thou|thy|thine)\b/i);
  });
});

describe('the first call, once everyone is found', () => {
  it('leaves out the lines about the ones still out there', () => {
    const { KEEPER_CALLS, callLines } = jest.requireActual('../keeper-calls') as typeof import('../keeper-calls');
    const lines = callLines(KEEPER_CALLS.find((c) => c.id === 'brannoc-joined')!, 0);
    expect(lines.join(' ')).toMatch(/all accounted for/);
    expect(lines.join(' ')).not.toMatch(/rather lost|set them free/);
    expect(callLines(KEEPER_CALLS.find((c) => c.id === 'brannoc-joined')!, 3).join(' ')).toMatch(/set them free/);
  });
});
