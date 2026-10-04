// The app has no Node types; jest runs in Node, so take just what's needed (as trade.test.ts does).
declare const __dirname: string;
const { readFileSync, existsSync } = jest.requireActual('fs') as {
  readFileSync: (file: string, encoding: 'utf8') => string;
  existsSync: (file: string) => boolean;
};
const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };

// The World's frame loop runs on the UI thread: everything it calls must be a worklet, or it throws
// ("Tried to synchronously call a Remote Function") and the frame stops short. That stalled every
// march's end on device (startTrail, Oct 4, 2026), and jest can't see it, so check it here.

const ROOT = join(__dirname, '../../..');
const VIEW = readFileSync(join(ROOT, 'src/components/world/world-view.tsx'), 'utf8');

function frameBody(): string {
  const a = VIEW.indexOf('const frame = useFrameCallback');
  const b = VIEW.indexOf('reportFrameError', a);
  return VIEW.slice(a, b);
}

/** Imported names from our own modules, and where they come from. */
function imports(): Map<string, { name: string; file: string }> {
  const out = new Map<string, { name: string; file: string }>();
  for (const m of VIEW.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(@\/[^']+)'/g)) {
    for (const part of m[1].split(',')) {
      const p = part.trim();
      if (!p || p.startsWith('type ')) continue;
      const [orig, alias] = p.split(/\s+as\s+/);
      const base = join(ROOT, m[2].replace('@/', 'src/'));
      const file = ['.ts', '.tsx', '/index.ts'].map((e) => base + e).find(existsSync);
      if (file) out.set((alias ?? orig).trim(), { name: orig.trim(), file });
    }
  }
  return out;
}

it('only calls worklets from the frame loop', () => {
  const body = frameBody();
  const called = new Set([...body.matchAll(/\b([A-Za-z_]\w*)\(/g)].map((m) => m[1]));
  const notWorklets: string[] = [];
  for (const [local, { name, file }] of imports()) {
    if (!called.has(local)) continue;
    const src = readFileSync(file, 'utf8');
    const at = src.indexOf(`export function ${name}(`);
    if (at < 0) continue; // a constant or a component, not a function call we can check
    // the body starts after the closing parenthesis of the parameters, at the first "{" then newline
    const open = src.indexOf('{\n', src.indexOf(')', at));
    const first = src
      .slice(open + 2, open + 400)
      .split('\n')
      .find((l) => l.trim() && !l.trim().startsWith('//'));
    if (!first?.includes("'worklet'")) notWorklets.push(`${name} (${file.replace(ROOT + '/', '')})`);
  }
  expect(notWorklets).toEqual([]);
});
