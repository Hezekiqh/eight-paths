/**
 * Loud moments in dialogue, found from the words themselves, so a line that
 * says the crowd roars makes the phone roar too, right as the word is typed.
 * No line needs tagging: write "screams" and it screams.
 */
export type Rumble =
  | 'roar'
  | 'scream'
  | 'crash'
  | 'rumble'
  // The little ones, for whoever's paying attention:
  | 'knock'
  | 'heartbeat'
  | 'snore'
  | 'laugh'
  | 'sneeze'
  | 'hug'
  | 'bell'
  | 'drum'
  | 'whistle'
  | 'hiccup';

const WORDS: [Rumble, RegExp][] = [
  ['roar', /\b(roar(s|ed|ing)?|cheer(s|ed|ing)?|applau(d|ds|ded|se)|r+a{3,}h+)\b/gi],
  ['scream', /\b(scream(s|ed|ing)?|shriek(s|ed|ing)?|wail(s|ed|ing)?|yell(s|ed|ing)?|a{3,}h+)\b/gi],
  ['crash', /\b(crash(es|ed|ing)?|slam(s|med|ming)?|smash(es|ed|ing)?|thud(s|ded)?|boom(s|ed|ing)?|bang(s|ed)?|explod(e|es|ed|ing)|explosion)\b/gi],
  ['rumble', /\b(rumbl(e|es|ed|ing)|quak(e|es|ed|ing)|thunder(s|ed|ing|ous)?)\b/gi],
  ['knock', /\b(knock(s|ed|ing)?)\b(?! (back|out|over|down|off|into|him|her|them|you))/gi],
  ['heartbeat', /\b(heartbeats?|heart (pounds|pounding|thumps|thumping|races|racing))\b/gi],
  ['snore', /\b(snor(e|es|ed|ing)|z{3,})\b/gi],
  ['laugh', /\b(laugh(s|ed|ing)?|giggl(e|es|ed|ing)|cackl(e|es|ed|ing)|chuckl(e|es|ed|ing)|ha(ha)+|he(he)+)\b/gi],
  ['sneeze', /\b(sneez(e|es|ed|ing)|a+h*-?choo+)\b/gi],
  ['hug', /\b(hug(s|ged|ging)?|embrac(e|es|ed))\b/gi],
  ['bell', /\b(bells? (ring|rings|rang|tolls|tolled)|(ring|rings|rang|toll|tolls|tolled) the \w*\s?bell|ding|dong|gong)\b/gi],
  ['drum', /\b(drum(s|ming|roll)?|march(es|ed|ing)?)\b/gi],
  ['whistle', /\b(whistl(e|es|ed|ing))\b/gi],
  ['hiccup', /\b(hiccup(s|ped|ping)?|hic|burp(s|ed)?|belch(es|ed)?)\b/gi],
];

/** Where each loud word starts in `text`, in order. One per kind, so a line can't rattle on. */
export function rumblesIn(text: string): { at: number; kind: Rumble }[] {
  const found: { at: number; kind: Rumble }[] = [];
  for (const [kind, re] of WORDS) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) found.push({ at: m.index, kind });
  }
  return found.sort((a, b) => a.at - b.at);
}

/** A line said at the top of someone's lungs: mostly capitals, or ending in "!". */
export function isShouted(text: string): boolean {
  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length >= 3 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6) return true;
  return /!["'’”)]*\s*$/.test(text);
}
