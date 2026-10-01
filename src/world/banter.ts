import type { CharacterId } from '@/story/companions';

// Party banter: when you talk to someone or read a sign, a party member chimes
// in. Each spot lists who might speak, in order; the first one in your party
// has their say, so swapping a recruit in (Plush, Bo) changes who talks. An
// entry `with` a second member only plays when both came (two of them bickering).
// Lines are "NAME: text" so the dialogue box shows their face and voice.
// Drafts until the author approves them. Spoiler rule (LORE.md): Brannoc can
// brush against his past (the prince, the old law), never name it.

type Banter = { who: CharacterId; with?: CharacterId; lines: string[] };

/** By "map:object id". */
export const BANTER: Record<string, Banter[]> = {
  // ---- the Courier Road, the Waystation and Millbrook
  'courier-road:nib': [
    {
      who: 'brannoc',
      with: 'oren',
      lines: [
        "BRANNOC: Half a stick? I'll have you know I'm— Oren, tell her.",
        'OREN: She could.',
        'BRANNOC: …Thank you, Oren.',
      ],
    },
    {
      who: 'brannoc',
      lines: ["BRANNOC: A duel? Ha! Stand aside, I'll handle this.", "BRANNOC: …You go first, though. I'll handle the second half."],
    },
    { who: 'pip', lines: ['PIP: Ooh, a duel! Can it be a dance duel? I am wonderful at those.'] },
  ],
  'waystation:pell': [
    { who: 'bo', lines: ['BO: Nine seconds? I can cartwheel there in eight!', 'PELL: …Teach me.'] },
    { who: 'pip', lines: ["PIP: Nine seconds! That's a whole verse. I'll write you a running song."] },
  ],
  'waystation:hesper': [
    {
      who: 'ysolde',
      with: 'tamsin',
      lines: [
        'YSOLDE: Two coppers for soup.',
        'TAMSIN: I could build you a better pot for one.',
        'YSOLDE: Then build it, and the soup is one copper.',
        'HESPER: …Are you two married?',
      ],
    },
    { who: 'ysolde', lines: ['YSOLDE: How much is the soup?', 'HESPER: Two coppers.', "YSOLDE: …I'll want a receipt."] },
  ],
  'millbrook:iron-notice': [
    { who: 'brannoc', lines: ["BRANNOC: All iron? Not Sweetheart. Sweetheart is… mostly decorative. Don't tell her."] },
    { who: 'tamsin', lines: ["TAMSIN: Turnips may be kept. Good. I've been meaning to build something out of turnips."] },
  ],
  'millbrook:oriel': [
    { who: 'brannoc', lines: ["BRANNOC: I'm tall! Is it me? Am I Gerald?", 'MADAME ORIEL: No, dear.'] },
    { who: 'quill', lines: ["QUILL: Statistically, someone named Gerald walks past here eventually. It's a very safe prophecy."] },
  ],
  'millbrook:wenna': [
    {
      who: 'brannoc',
      lines: ["BRANNOC: Arm-wrestle? Oh, I would. I'd crush you. It's just that my arm is… resting.", 'OLD WENNA: Soft.'],
    },
  ],
  'millbrook:jory': [{ who: 'moss', lines: ['MOSS: Tuft likes it here. Tuft likes anywhere with turnips.'] }],
  'millbrook:hoot': [{ who: 'oren', lines: ["OREN: He's right.", 'OREN: …Drink some water.'] }],

  // ---- the Deserters' Camp and the Buried Barracks
  'deserters-camp:holt': [
    { who: 'brannoc', lines: ["BRANNOC: That's what I always say!", "BRANNOC: …I mean, I've heard people say that. Cowards. Ha."] },
  ],
  'deserters-camp:fen': [
    {
      who: 'brannoc',
      with: 'oren',
      lines: [
        'BRANNOC: Haunted? Great. Love that. You first.',
        'OREN: Breathe.',
        'BRANNOC: I AM breathing.',
        'OREN: Slower.',
      ],
    },
    { who: 'brannoc', lines: ['BRANNOC: Haunted? The fort we are about to walk into? That fort?', 'BRANNOC: Great. Love that. You first.'] },
    { who: 'wren', lines: ["WREN: Then someone ought to listen to them. I'll bring the lantern."] },
  ],
  'barracks-hall:dunn': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: Ha! Lazy prince. Probably hiding in a hedge maze somewhere.', '…', 'BRANNOC: What? Why are you looking at me?'],
    },
  ],
  'barracks-armoury:bellwether': [
    { who: 'tamsin', lines: ["TAMSIN: Left knee's missing a rivet. Poor thing's been standing on it for five hundred years."] },
  ],
  'lower-barracks:quartermaster': [
    {
      who: 'ysolde',
      lines: ['YSOLDE: Finally. Someone who understands paperwork.', 'YSOLDE: Might I see your ledger? Purely for pleasure.'],
    },
    { who: 'brannoc', lines: ['BRANNOC: Spoons are very easy to lose. Anyone could lose a spoon.', 'BRANNOC: …Shall we go?'] },
  ],
  'pit-below:sergeant': [{ who: 'brannoc', lines: ['BRANNOC: Yes, sergeant! Sorry, sergeant!', 'BRANNOC: …Why did I say that?'] }],
  'sleeping-keep:plush': [
    {
      who: 'brannoc',
      lines: ["BRANNOC: Is that a sofa? That's a very good sofa.", 'BRANNOC: No. No! Stay focused.', 'BRANNOC: …It does look soft, though.'],
    },
  ],

  // ---- the March Road
  'march-road:bo': [
    {
      who: 'plush',
      lines: ["PLUSH: Young man, sit down. You're making me tired just looking at you.", "BO: Can't! Won't! Four thousand and ten!"],
    },
    { who: 'pip', lines: ['PIP: Can I count the next one? FOUR THOUSAND AND TEN!'] },
  ],
  'march-road:grask': [
    {
      who: 'ysolde',
      with: 'brannoc',
      lines: [
        'YSOLDE: Double? Show me the toll schedule.',
        'GRASK: The what?',
        'BRANNOC: And what about me? Am I double?',
        "GRASK: You're big. Triple.",
      ],
    },
    { who: 'ysolde', lines: ['YSOLDE: Everything I have? Show me the toll schedule.', 'GRASK: The what?', 'YSOLDE: Thought so.'] },
  ],
  'march-road:wim': [
    {
      who: 'quill',
      lines: [
        "QUILL: Horses sleep standing up because their legs lock. I doubt the king's legs lock.",
        "WIM: You don't know that.",
        "QUILL: …No. I don't.",
      ],
    },
  ],
  'march-road:tithe-notice': [{ who: 'wren', lines: ["WREN: Every mark is somebody's child."] }],

  // ---- the Berserker Kingdom
  'kingdom-town:gate-stone': [
    { who: 'brannoc', lines: ['BRANNOC: Strength in service. I know the rest of that one.', "BRANNOC: …I don't know how I know that."] },
  ],
  'kingdom-town:street-sign': [
    {
      who: 'quill',
      lines: ["QUILL: Both arms say Kaldor Street. So technically, we can't get lost.", "QUILL: Technically, we can't get found either."],
    },
  ],
  'kingdom-town:crier-board': [
    { who: 'quill', lines: ['QUILL: See previous notice… see previous notice… Oh no. It goes on forever.', 'QUILL: I love it.'] },
  ],
  'kingdom-town:playpen-sign': [{ who: 'moss', lines: ['MOSS: What day is it?', 'MOSS: …Tuft wants to know. No reason.'] }],
  'kingdom-town:brunna': [
    { who: 'brannoc', lines: ["BRANNOC: Ha! She got you! Don't worry, I'll protect y—", 'BRANNOC: OW. She got me.'] },
  ],
  'kingdom-town:kett': [{ who: 'brannoc', lines: ['BRANNOC: …That is actually very good advice.'] }],
  'kingdom-town:tessa': [
    {
      who: 'pip',
      lines: ["PIP: Bread that tastes of nothing? That's the saddest thing I've ever heard. I'm writing a song about it.", "TESSA: Please don't. It's illegal."],
    },
  ],
  'kingdom-town:barnaby': [{ who: 'pip', lines: ['PIP: The same victory for three hundred years? Have you tried a key change?'] }],
  'kingdom-town:pim': [{ who: 'ysolde', lines: ['YSOLDE: A penny a rumour. And a false one?', 'PIM: Two pennies!'] }],
  'kingdom-town:guard': [
    {
      who: 'pip',
      lines: ["PIP: I'm a wonderful cheerer! Score me!", 'THE CAGE GUARD: Two.', 'PIP: …Two out of three?', 'THE CAGE GUARD: Out of ten.'],
    },
    { who: 'brannoc', lines: ['BRANNOC: And me? Big lad like me?', 'THE CAGE GUARD: Four. Pity marks.'] },
  ],
  'kingdom-town:varga': [{ who: 'brannoc', lines: ["BRANNOC: A spine. Yes. I've got one of those. It's in here somewhere."] }],
  'candle-inn:nana': [
    {
      who: 'brannoc',
      with: 'oren',
      lines: [
        'BRANNOC: Thin? Me? Look at these arms!',
        "NANA BIRCH: I'm looking. Eat.",
        "OREN: He's had three bowls.",
        'NANA BIRCH: Then he can have a fourth. You too. Sit.',
      ],
    },
    { who: 'plush', lines: ['PLUSH: Is there a sofa?', "NANA BIRCH: There's a chair.", "PLUSH: …I'll manage."] },
    { who: 'brannoc', lines: ['BRANNOC: Thin? Me? Look at these arms!', "NANA BIRCH: I'm looking. Eat."] },
  ],
  'candle-inn:cellar-door': [{ who: 'oren', lines: ['OREN: People are hiding down there.', "OREN: …We didn't see anything."] }],
  'hedge-maze:hugo': [{ who: 'moss', lines: ["MOSS: They do have feelings. That one's sulking."] }],
  'the-pit:fight-card': [{ who: 'pip', lines: ["PIP: Compulsory cheering? I've been training my whole life for this."] }],
  'the-pit:maelis': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: A prince, eh? Hope he was worth it.', 'SERGEANT MAELIS: Family says he ran.', 'BRANNOC: …Sounds like a coward.'],
    },
  ],
  'field-of-banners:hoot-field': [{ who: 'pip', lines: ["PIP: He's right, you know. Go on. I'll hum while you drink."] }],
};

/** What a party member adds on this map at this object: the first listed one who's in the party (with their partner, if they need one), or nothing. */
export function banterFor(mapId: string, objectId: string, party: readonly CharacterId[]): string[] {
  return (
    BANTER[`${mapId}:${objectId}`]?.find((b) => party.includes(b.who) && (!b.with || party.includes(b.with)))?.lines ?? []
  );
}
