/**
 * Everything the Keeper says in notifications, exactly as approved in
 * KEEPER-LINES.md. Ids are stable: opens are counted per line (N5), so a
 * reworded line keeps its id and a new line gets a new one.
 */

export const KEEPER_TITLE = 'The Keeper';

export type KeeperGroup =
  /** At the usual time, plain. */
  | 'usual'
  /** At the usual time, about something real (N2). */
  | 'personal'
  /** 10:30 PM, a streak about to break (N2). */
  | 'lastCall'
  /** The day after a miss that a rest token covered. */
  | 'rested'
  /** The day after a miss that reset the streak. */
  | 'reset'
  /** Two to six days away, naming a hero. */
  | 'away'
  /** Five days away. */
  | 'cocoon'
  /** A week away. */
  | 'vigil'
  /** Story drops, in order, from ten days away. */
  | 'story'
  /** Once a week, forever. */
  | 'weekly';

export type KeeperLine = { id: string; group: KeeperGroup; text: string };

const lines = (group: KeeperGroup, entries: Record<string, string>): KeeperLine[] =>
  Object.entries(entries).map(([id, text]) => ({ id, group, text }));

export const KEEPER_LINES: KeeperLine[] = [
  ...lines('usual', {
    a1: "It's about your usual hour, {name}. The Archive is quiet. Shall we?",
    a2: "One small step today. That's all I've ever asked of you.",
    a3: "Your quests are laid out on the table. I didn't touch them. Much.",
    a4: "I've put the kettle on. Come walk a Path while it boils.",
    a5: 'The lantern is burning low and your quests are still waiting, {name}.',
    a6: 'Five hundred years of sleep. You can spare five minutes for a quest.',
    a7: 'You used to be very good at this. The habits, I mean. Obviously.',
    a8: "I've kept records for a very long time. Today's page is still blank.",
    a9: "The party is restless. They won't say it, but they're waiting on you.",
    a10: "No grand quest today. Just a small one. I'll be here.",
  }),
  ...lines('personal', {
    b1: "{streak} days. I've been counting. One quest keeps the count going.",
    b2: '{streak} days in a row. Few of the 200 could say that. Keep it?',
    b3: 'Your {streak}-day streak is safe until midnight. Only until midnight.',
    b4: "One quest from {path} level {level}. I'd like to see that before bed.",
    b5: '{quest} would lift your {path} to level {level}. Just saying.',
    b6: 'The {path} Path is one step from level {level}. So close I can hear it.',
    b7: 'Something is stirring in the {path} silk. One more level and it wakes.',
    b8: "A cocoon on the {path} Path is warm tonight. It won't hatch by itself.",
    b9: "I've heard tapping from the {path} cocoon. It's waiting for you.",
    b10: "{quest} is still waiting for you today. It's a patient quest, but still.",
    b11: '{n} quests left today: {quests}. Start with the easy one.',
    b12: "Just {quest} today. I'll mark it in the records myself.",
    b13: "{n} more days to {milestone} days shown up. I've set aside a page for it.",
    b14: 'Tomorrow would make {milestone} days. Today has to happen first.',
  }),
  ...lines('lastCall', {
    c1: "{streak} days. Don't let the lantern go out tonight.",
    c2: "It's late, {name}, and your {streak}-day streak ends at midnight. One quest.",
    c3: "I don't usually knock this late. {streak} days is worth knocking for.",
    c4: 'An hour and a half until midnight. Your {streak} days are still yours to keep.',
    c5: 'No rest tokens left, {name}. One quest before midnight keeps all {streak} days.',
    c6: 'The lantern is nearly out. So is today. {streak} days, one quest.',
  }),
  ...lines('rested', {
    d1: 'You rested yesterday. A rest token kept your streak. The party saved you a seat.',
    d2: "Yesterday slipped by. I spent a rest token for you. You're welcome.",
    d3: "Your streak survived the night on a rest token. Let's not make a habit of it.",
    d4: 'Everyone needs rest. Even you. Especially you. Your streak is safe. Come back?',
  }),
  ...lines('reset', {
    d5: 'Your streak reset last night. Nothing else did. Your levels and heroes are all still here.',
    d6: "A streak is just a number, {name}. I've watched numbers rise and fall for centuries. Start again with me?",
    d7: "Day one again. I've always liked day one. It has the most in front of it.",
  }),
  ...lines('away', {
    e1: "{hero} asked about you today. I told them you'd be back.",
    e2: "{hero} has been pacing the Archive. I think they miss the road.",
    e3: "{hero} sat by your quest board all afternoon. Won't say why.",
    e4: "Three days. {hero} thinks it's their fault. I told them it isn't. Come tell them yourself?",
    e5: "{hero} and {hero2} are arguing over which Path you'll walk next. Settle it?",
    e6: 'The Archive is too quiet without you. Even {hero} has stopped talking.',
  }),
  ...lines('cocoon', {
    f1: "Something is stirring in the silk. It won't wake without you.",
    f2: "One of the cocoons moved today. I haven't seen that in a hundred years.",
    f3: 'I heard a heartbeat in the {path} silk. Someone is close to waking.',
  }),
  ...lines('vigil', {
    g1: "A week. I haven't stopped waiting. The lantern stays lit.",
    g2: 'Seven days. I waited five hundred years for you to wake. I can wait a little longer.',
    g3: "I'll keep your quests dusted, {name}. However long it takes.",
  }),
  ...lines('story', {
    h1: '{sleeping} still sleep. Every one of them is waiting for someone. So am I.',
    h2: 'Found an old page in the Archive today. Your handwriting, I think. Strange.',
    h3: "Eight kings saved the world, they say. I was there. Come back and I'll tell you what they don't say.",
    h4: "I dreamed of an old friend last night. We were sharing a drink. Come back and I'll tell you the rest.",
    h5: "A name came back to me today. Not mine. Yours. I'll keep it until you're ready.",
    h6: "Someone in the silk said your name in their sleep. I'd like to know how they knew it.",
  }),
  ...lines('weekly', {
    i1: "Still here. Still waiting. The kettle's still warm.",
    i2: "Another week in the Archive. I've read every scroll twice. Come give me something new to write.",
    i3: "Your quests are right where you left them. I haven't moved a thing.",
    i4: "No lecture, no guilt. Just one quest, whenever you're ready.",
    i5: 'I kept watch for five hundred years. Weeks are nothing. But I do miss you.',
    i6: "{hero} still sleeps by your pack. They're sure you'll come back. So am I.",
    i7: "The world outside keeps turning. The Archive doesn't. It waits for you.",
    i8: "Some things take a long time to wake. I would know. Come back when you're ready.",
  }),
];

export type KeeperVars = Partial<Record<string, string | number>>;

/** The line with its blanks filled, or null when any blank has no value. */
export function fillLine(text: string, vars: KeeperVars): string | null {
  let missing = false;
  const body = text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    if (value === undefined || value === '') missing = true;
    return String(value ?? '');
  });
  return missing ? null : body;
}
