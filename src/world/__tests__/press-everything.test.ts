import { CLASSES, DIMENSIONS } from '@/game';
import { COMPANIONS, DEFAULT_PARTY } from '@/story/companions';

import { banterFor } from '../banter';
import { EXITS, describeRequirement, howToProgress, standing } from '../progress';
import { ITEMS, chestFlag, foundLines, isCandle } from '../items';
import { jobAt } from '../jobs';
import { MAPS, objectAt, tileAt, type MapId } from '../maps';
import { isShouted, rumblesIn } from '../rumbles';
import { portraitFor, splitSpeaker, voiceFor } from '../portraits';
import { characterQuestions } from '../talk';
import { winScene } from '../scenes';
import { WALKER_ROWS } from '../walkers';

// Press A on everything in the Other World: every person, sign, chest, door,
// candle and examinable tile in every map, as every party member. Every line
// that comes back goes through what the dialogue box does with it (who's
// speaking, their face and voice, loud words), so nothing a player can press
// can hand the game something it chokes on.

const PARTY = DIMENSIONS.map((d) => DEFAULT_PARTY[d]);
const NO_XP = { total: 0, byPath: Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as never, flags: [] };

/** Everything the dialogue box does with a line, the way it does it. */
function show(where: string, speaker: string | undefined, lines: unknown) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error(`${where}: no lines`);
  for (const line of lines) {
    if (typeof line !== 'string' || line.trim() === '') throw new Error(`${where}: empty or non-text line`);
    const said = splitSpeaker(line);
    const who = said.speaker ?? speaker;
    voiceFor(who, said.sprite ?? portraitFor(speaker));
    rumblesIn(said.text);
    isShouted(said.text);
  }
}

describe('pressing A on everything', () => {
  for (const id of Object.keys(MAPS) as MapId[]) {
    const map = MAPS[id];

    it(`${id}: every person, sign and chest answers`, () => {
      for (const o of map.objects) {
        const where = `${id}:${o.id ?? o.type}`;
        const banter = 'id' in o ? banterFor(id, o.id, PARTY) : [];
        if (o.type === 'npc') {
          expect([where, o.sprite in WALKER_ROWS]).toEqual([where, true]);
          show(where, o.name, [...o.lines, ...banter]);
          if (o.after) show(`${where} after`, o.name, o.after.lines);
          if (o.job) {
            show(`${where} job done`, o.name, o.job.done.map((l) => l.replace('{name}', 'Brannoc')));
            show(`${where} job cant`, o.name, [...o.lines, ...o.job.cant]);
            if (o.job.path !== 'any') expect([where, o.job.path in CLASSES]).toEqual([where, true]);
          }
          const questions = o.questions ?? (o.character ? characterQuestions(COMPANIONS[o.character]) : []);
          for (const q of questions) {
            show(`${where} asks "${q.ask}"`, o.name, q.answer);
            if (q.then) show(`${where} then`, undefined, q.then);
          }
        } else if (o.type === 'sign') {
          show(where, undefined, [...o.lines, ...banter]);
        } else if (o.type === 'chest') {
          expect([where, o.item === 'heart-piece' || o.item in ITEMS]).toEqual([where, true]);
          show(where, undefined, [...o.lines, ...foundLines(o.item, [chestFlag(o.id)])]);
        }
      }
    });

    it(`${id}: every tile you can face says something sensible, or nothing`, () => {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (objectAt(map, x, y)) continue;
          const tile = tileAt(map, x, y);
          const where = `${id} (${x},${y}) '${tile}'`;
          if (isCandle(map, x, y) && map.examine[tile]) show(where, undefined, map.examine[tile]);
          const job = jobAt(id, tile);
          if (job) {
            show(`${where} job`, undefined, job.done.map((l) => l.replace('{name}', 'Brannoc')));
            show(`${where} job already`, undefined, job.already);
            if (job.cant) show(`${where} job cant`, undefined, job.cant);
          }
          const exit = EXITS.find((e) => e.from === id && e.tile === tile);
          if (exit) {
            const s = standing(exit.needs, NO_XP);
            describeRequirement(exit.needs);
            show(`${where} exit`, undefined, [exit.label, s.hint ?? howToProgress(s)]);
            if (exit.to) expect([where, exit.to.map in MAPS]).toEqual([where, true]);
          }
          if (map.examine[tile]) show(where, undefined, map.examine[tile]);
        }
      }
    });

    if (map.boss) {
      it(`${id}: the fight has an intro and a way to win`, () => {
        if (map.boss!.intro) show(`${id} intro`, map.boss!.intro.speaker ?? undefined, map.boss!.intro.lines);
        for (const brannoc of [true, false]) {
          const scene = winScene(id, map.boss!.flag, brannoc);
          expect(scene).toBeTruthy();
          show(`${id} win`, undefined, scene!.lines);
          for (const c of scene!.choices ?? []) show(`${id} choice ${c.label}`, undefined, c.lines);
        }
      });
    }
  }

  it('no exit tile letter in one map means two different ways out', () => {
    for (const id of Object.keys(MAPS) as MapId[]) {
      const letters = EXITS.filter((e) => e.from === id).map((e) => e.tile);
      expect([id, new Set(letters).size]).toEqual([id, letters.length]);
    }
  });
});
