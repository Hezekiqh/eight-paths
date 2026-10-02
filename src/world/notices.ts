import { CLASSES, type Dimension } from '@/game';
import { COMPANIONS, type CharacterId } from '@/story/companions';

import { ATTACKS, damageFor } from './combat';
import { CHARGE_LEVEL, SPECIALS, SPECIAL_LEVEL } from './fight';
import { SIGNATURE_LEVEL, signatureOf } from './signatures';
import { walkersFor, type HeroId } from './hero';
import { JOBS } from './jobs';
import { MAPS, isMapId, type MapId } from './maps';
import { EXITS, describeRequirement, howToProgress, standing, type XpTotals } from './progress';

// Things the player has run into and couldn't do yet: a door that won't open,
// a job only another Path can do, a fight lost. Each is remembered by id and
// listed on the pause screen, with what it needs and who can do it, until it's
// done. Ids: exit:<id>, job:<map>:<tile>, npc:<map>:<npc id>, fight:<map>.

export type Notice = { id: string; map: MapId; place: string; title: string; hint: string };

export type NoticeContext = {
  xp: XpTotals;
  party: Record<Dimension, CharacterId>;
  /** A character's real level (their Path's XP), for how hard they hit. */
  levelOf: (id: HeroId) => number;
  hero: HeroId;
};

export const exitNotice = (id: string) => `exit:${id}`;
export const jobNotice = (map: MapId, tile: string) => `job:${map}:${tile}`;
export const npcNotice = (map: MapId, npc: string) => `npc:${map}:${npc}`;
export const fightNotice = (map: MapId) => `fight:${map}`;

/** "A Warrior can do this: walk as Brannoc (pause, then Walking as)." */
export function whoCan(path: Dimension, party: Record<Dimension, CharacterId>): string {
  const walker = walkersFor(party).find((h) => COMPANIONS[h].dimension === path)!;
  const { className } = CLASSES[path];
  const article = /^[AEIOU]/.test(className) ? 'An' : 'A';
  return `${article} ${className} can do this: walk as ${COMPANIONS[walker].name} (pause, then Walking as).`;
}

/** How to beat what's in a room: each boss's tell, and what to do about it. */
const TELLS: Partial<Record<MapId, string>> = {
  'the-pit': 'The pit fighters crouch and flash red before they lunge. Roll aside, then strike while they get up.',
  'war-doors':
    'Aurek flashes red before he slams the ground. Roll away from the ring, then hit him while he rises. Blades glance off his hide; bolts and arrows find the stitches.',
  'war-hall':
    'Your blows glance off Kaldor while he casts no shadow. Roll aside when he charges: when a torch gutters and his shadow comes back, strike.',
};

/**
 * Why a fight was lost, and how to win it: the boss's tell, if it has one,
 * then the walking character's real level (which sets their damage, and at
 * Lv 10 and 20 unlocks their charged blow and special).
 */
export function fightHint(hero: HeroId, level: number, map?: MapId): string {
  const c = COMPANIONS[hero];
  const damage = damageFor(ATTACKS[c.dimension], level);
  const next = (Math.floor(level / 10) + 1) * 10;
  const signature = signatureOf(hero);
  const unlock =
    signature && next === SIGNATURE_LEVEL
      ? `learn ${signature.name} (hold, then let go)`
      : signature && next > SIGNATURE_LEVEL
        ? 'hit harder'
        : next === CHARGE_LEVEL
          ? 'can charge a blow (hold, then let go)'
          : next === SPECIAL_LEVEL
            ? `learn ${SPECIALS[c.dimension].name}`
            : 'hit harder';
  const tell = map && TELLS[map] ? `${TELLS[map]} ` : '';
  return `${tell}${c.name} is Lv ${level} and hits for ${damage}. At Lv ${next} they ${unlock}: finish ${CLASSES[c.dimension].className} habits, or walk as a stronger party member.`;
}

/** What one remembered thing is, and how to get past it; null once it's done (or unknown). */
export function describeNotice(id: string, ctx: NoticeContext): Notice | null {
  const flags = ctx.xp.flags ?? [];
  const [kind, a, b] = id.split(':');
  if (kind === 'exit') {
    const exit = EXITS.find((e) => e.id === a);
    if (!exit) return null;
    const s = standing(exit.needs, ctx.xp);
    if (s.met) return null;
    const hint = s.hint ?? `Needs ${describeRequirement(exit.needs)}; you're Lv ${s.have}. ${howToProgress(s)}`;
    return { id, map: exit.from, place: MAPS[exit.from].name, title: exit.label, hint };
  }
  if (!isMapId(a)) return null;
  const place = MAPS[a].name;
  if (kind === 'job') {
    const job = JOBS.find((j) => j.map === a && j.tile === b);
    if (!job || flags.includes(job.flag)) return null;
    const hint = job.path ? whoCan(job.path, ctx.party) : (job.cant?.at(-1) ?? '');
    return { id, map: a, place, title: job.label, hint };
  }
  if (kind === 'npc') {
    const npc = MAPS[a].npcs.find((n) => n.id === b);
    if (!npc?.job || flags.includes(npc.job.flag)) return null;
    const path = npc.job.path in CLASSES ? (npc.job.path as Dimension) : null;
    const hint = path ? whoCan(path, ctx.party) : (npc.job.cant.at(-1) ?? '');
    return { id, map: a, place, title: npc.name, hint };
  }
  if (kind === 'fight') {
    const boss = MAPS[a].boss;
    if (!boss || flags.includes(boss.flag)) return null;
    const who = MAPS[a].npcs.find((n) => n.after?.flag === boss.flag)?.name;
    return {
      id,
      map: a,
      place,
      title: who ? `The fight with ${who}` : `The fight in ${place}`,
      hint: fightHint(ctx.hero, ctx.levelOf(ctx.hero), a),
    };
  }
  return null;
}

/** Everything still waiting, most recent first. */
export function openNotices(ids: string[], ctx: NoticeContext): Notice[] {
  return [...ids]
    .reverse()
    .map((id) => describeNotice(id, ctx))
    .filter((n): n is Notice => n !== null);
}
