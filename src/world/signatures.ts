import type { CharacterId } from '@/story/companions';

// Each core companion's own move: what their charged attack becomes from
// Path Lv 10, in place of the charged blow and their Path's shared special.
// fight.ts does the hitting; this is who does what (and, for Ysolde, what she says).

export type SignatureKind = 'sweetheart' | 'tab' | 'footnotes' | 'vigil' | 'breath' | 'encore' | 'holdthis' | 'barrage';

export type Signature = {
  kind: SignatureKind;
  name: string;
  /** What it does, for the character sheet. */
  does: string;
  /** What they say as it goes off, if anything: most do it in silence (only Ysolde can't resist). */
  shout?: string;
};

/** The Path level a signature unlocks at: the same hold-and-let-go as the charged blow. */
export const SIGNATURE_LEVEL = 10;

export const SIGNATURES: Partial<Record<CharacterId, Signature>> = {
  brannoc: {
    kind: 'sweetheart',
    name: 'Sweetheart Swing',
    does: 'spins Sweetheart all round him, then hops well back',
  },
  ysolde: {
    kind: 'tab',
    name: 'Collect the Tab',
    does: 'everyone near freezes and falls into debt, losing a heart until it’s paid',
    shout: 'YOU OWE ME.',
  },
  quill: {
    kind: 'footnotes',
    name: 'Footnote Barrage',
    does: 'five fire bolts in a fan',
  },
  wren: {
    kind: 'vigil',
    name: 'Lantern Vigil',
    does: 'a heart back, once a fight; her lantern flares, freezing everyone close, and throws light all round',
  },
  oren: {
    kind: 'breath',
    name: 'One Breath',
    does: 'a still breath nothing can touch, then a palm that sends them flying',
  },
  pip: {
    kind: 'encore',
    name: 'Encore',
    does: 'the shockwave plays twice',
  },
  tamsin: {
    kind: 'holdthis',
    name: 'Hold This',
    does: 'a comically huge wrench that plows through everyone, out and back twice',
  },
  moss: {
    kind: 'barrage',
    name: 'Arrow Barrage',
    does: 'arrows rain down on everyone in range, twice. Once a day, after a real habit',
  },
};

export function signatureOf(id: string): Signature | null {
  return SIGNATURES[id as CharacterId] ?? null;
}
