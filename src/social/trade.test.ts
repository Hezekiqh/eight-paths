import { COMPANIONS, DEFAULT_PARTY, ROSTER, type CharacterId } from '@/story/companions';

import { countCopies, covers, describeSide, giveable, isExpired, listCopies, tradeProblem } from './trade';

// The app has no Node types; jest runs in Node, so take just what's needed.
declare const __dirname: string;
const fs = jest.requireActual('fs') as {
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};

const [a, b] = ROSTER.filter((c) => c.kind !== 'core').map((c) => c.id);

describe('trade helpers', () => {
  it('counts and lists copies', () => {
    expect(countCopies([a, b, a])).toEqual({ [a]: 2, [b]: 1 });
    expect(listCopies({ [b]: 1, [a]: 2 }).sort()).toEqual([a, a, b].sort());
  });

  it('checks a list is covered', () => {
    expect(covers({ [a]: 2 }, [a, a])).toBe(true);
    expect(covers({ [a]: 1 }, [a, a])).toBe(false);
    expect(covers({}, [b])).toBe(false);
  });

  it('keeps waiting hatches and the walking hero’s last copy off the table', () => {
    const local = { owned: { [a]: 2, [b]: 1 } as Partial<Record<CharacterId, number>>, drops: [a] as CharacterId[] };
    expect(giveable({ [a]: 2, [b]: 1 }, local, null)).toEqual({ [a]: 1, [b]: 1 });
    expect(giveable({ [a]: 2, [b]: 1 }, local, b)).toEqual({ [a]: 1 });
    // Never more than the server allows (recent trades are locked there).
    expect(giveable({ [a]: 1 }, { owned: { [a]: 3 }, drops: [] }, null)).toEqual({ [a]: 1 });
  });

  it('describes a side', () => {
    expect(describeSide([a, a, b])).toBe(`${COMPANIONS[a].name} ×2, ${COMPANIONS[b].name}`);
  });

  it('expires offers after 3 days', () => {
    const now = Date.parse('2026-10-04T12:00:00Z');
    expect(isExpired({ createdAt: '2026-10-01T11:00:00Z' }, now)).toBe(true);
    expect(isExpired({ createdAt: '2026-10-02T12:00:00Z' }, now)).toBe(false);
  });

  it('turns server codes into words', () => {
    expect(tradeProblem('ERROR: they_lack')).toMatch(/no longer have/);
    expect(tradeProblem('network down')).toBeNull();
  });

  it('agrees with the server about which heroes can never be traded', () => {
    const dir = `${__dirname}/../../supabase/migrations`;
    const sql = fs.readdirSync(dir).map((f) => fs.readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
    const list = sql.match(/core_heroes\(\)[\s\S]*?array\[([^\]]+)\]/)![1];
    const core = list.split(',').map((s) => s.trim().replace(/'/g, ''));
    expect(core.sort()).toEqual(Object.values(DEFAULT_PARTY).sort());
  });
});
