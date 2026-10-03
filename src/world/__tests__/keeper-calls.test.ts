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
