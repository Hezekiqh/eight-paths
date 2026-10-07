import type { CharacterId } from '@/story/companions';

// Party banter: when you talk to someone or read a sign, they say their own
// piece first (that always plays, party or not), then party members can chime
// in. Only members you actually have speak (see partyWithYou): someone still
// waiting down the road (Oren, before the Candle Inn) stays quiet. Each spot
// lists who might speak, in order; everyone listed who's with you has their
// say, once each, so a full party can pile in. An entry `with` a second member
// only plays when both came (two of them bickering), and then stands in for
// either one's solo line.
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
        'BRANNOC: Half a stick? I will have you know I am— Oren, tell her.',
        'OREN: She could.',
        'BRANNOC: …My thanks, Oren.',
      ],
    },
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: A duel? Ha! Stand aside, I shall see to this.',
        'BRANNOC: …You go first, though. I shall see to the second half.',
      ],
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
    {
      who: 'ysolde',
      lines: ['YSOLDE: How much is the soup?', 'HESPER: Two coppers.', "YSOLDE: …I'll want a receipt."],
    },
  ],
  'millbrook:iron-notice': [
    { who: 'brannoc', lines: ['BRANNOC: All iron? Not Sweetheart. Sweetheart is… mostly for show. Do not tell her.'] },
    {
      who: 'tamsin',
      lines: ["TAMSIN: Turnips may be kept. Good. I've been meaning to build something out of turnips."],
    },
  ],
  'millbrook:oriel': [
    { who: 'brannoc', lines: ['BRANNOC: I am tall! Is it me? Am I Gerald?', 'MADAME ORIEL: No, dear.'] },
    {
      who: 'quill',
      lines: ["QUILL: Statistically, someone named Gerald walks past here eventually. It's a very safe prophecy."],
    },
  ],
  'millbrook:wenna': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Arm-wrestle? Oh, I would. I would crush you. It is only that my arm is… resting.',
        'OLD WENNA: Soft.',
      ],
    },
  ],
  'millbrook:jory': [{ who: 'moss', lines: ['MOSS: Tuft likes it here. Tuft likes anywhere with turnips.'] }],
  'millbrook:hoot': [{ who: 'oren', lines: ["OREN: He's right.", 'OREN: …Drink some water.'] }],

  // ---- the Deserters' Camp and the Buried Barracks
  'deserters-camp:holt': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: That is what I always say!', 'BRANNOC: …That is, I have heard it said. By cowards. Ha.'],
    },
  ],
  'deserters-camp:fen': [
    {
      who: 'brannoc',
      with: 'oren',
      lines: [
        'BRANNOC: Haunted? Wonderful. Splendid. You first.',
        'OREN: Breathe.',
        'BRANNOC: I AM breathing.',
        'OREN: Slower.',
      ],
    },
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Haunted? The fort we are about to walk into? That fort?',
        'BRANNOC: Wonderful. Splendid. You first.',
      ],
    },
    { who: 'wren', lines: ["WREN: Then someone ought to listen to them. I'll bring the lantern."] },
  ],
  'barracks-hall:dunn': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Ha! A lazy prince. Hiding in a hedge maze somewhere, no doubt.',
        '…',
        'BRANNOC: What? Why do you look at me so?',
      ],
    },
  ],
  'barracks-armoury:bellwether': [
    {
      who: 'tamsin',
      lines: ["TAMSIN: Left knee's missing a rivet. Poor thing's been standing on it for five hundred years."],
    },
  ],
  'lower-barracks:quartermaster': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Finally. Someone who understands paperwork.',
        'YSOLDE: Might I see your ledger? Purely for pleasure.',
      ],
    },
    {
      who: 'brannoc',
      lines: ['BRANNOC: Spoons are very easily lost. Anyone might lose a spoon.', 'BRANNOC: …Shall we be off?'],
    },
  ],
  'pit-below:sergeant': [
    { who: 'brannoc', lines: ['BRANNOC: Yes, sergeant! Forgive me, sergeant!', 'BRANNOC: …Why did I say that?'] },
  ],
  'sleeping-keep:plush': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Is that a sofa? That is a very fine sofa.',
        'BRANNOC: No. No! Steel yourself.',
        'BRANNOC: …It does look soft, though.',
      ],
    },
  ],

  // ---- the March Road
  'march-road:bo': [
    {
      who: 'plush',
      lines: [
        "PLUSH: Young man, sit down. You're making me tired just looking at you.",
        "BO: Can't! Won't! Four thousand and ten!",
      ],
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
        'BRANNOC: And what of me? Am I double?',
        "GRASK: You're big. Triple.",
      ],
    },
    {
      who: 'ysolde',
      lines: ['YSOLDE: Everything I have? Show me the toll schedule.', 'GRASK: The what?', 'YSOLDE: Thought so.'],
    },
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
    {
      who: 'brannoc',
      lines: ['BRANNOC: Strength in service. I know the rest of that oath.', 'BRANNOC: …I know not how I know that.'],
    },
  ],
  'kingdom-town:street-sign': [
    {
      who: 'quill',
      lines: [
        "QUILL: Both arms say Kaldor Street. So technically, we can't get lost.",
        "QUILL: Technically, we can't get found either.",
      ],
    },
  ],
  'kingdom-town:crier-board': [
    {
      who: 'quill',
      lines: ['QUILL: See previous notice… see previous notice… Oh no. It goes on forever.', 'QUILL: I love it.'],
    },
  ],
  'kingdom-town:playpen-sign': [
    { who: 'moss', lines: ['MOSS: What day is it?', 'MOSS: …Tuft wants to know. No reason.'] },
  ],
  'kingdom-town:brunna': [
    { who: 'brannoc', lines: ['BRANNOC: Ha! She has you! Fear not, I shall protect y—', 'BRANNOC: OW. She has me.'] },
  ],
  'kingdom-town:kett': [{ who: 'brannoc', lines: ['BRANNOC: …That is, in truth, very good counsel.'] }],
  'kingdom-town:tessa': [
    {
      who: 'pip',
      lines: [
        "PIP: Bread that tastes of nothing? That's the saddest thing I've ever heard. I'm writing a song about it.",
        "TESSA: Please don't. It's illegal.",
      ],
    },
  ],
  'warrior-city:barnaby': [
    { who: 'pip', lines: ['PIP: The same victory for three hundred years? Have you tried a key change?'] },
  ],
  'kingdom-town:pim': [{ who: 'ysolde', lines: ['YSOLDE: A penny a rumour. And a false one?', 'PIM: Two pennies!'] }],
  'kingdom-town:guard': [
    {
      who: 'pip',
      lines: [
        "PIP: I'm a wonderful cheerer! Score me!",
        'THE CAGE GUARD: Two.',
        'PIP: …Two out of three?',
        'THE CAGE GUARD: Out of ten.',
      ],
    },
    { who: 'brannoc', lines: ['BRANNOC: And me? A great lad like me?', 'THE CAGE GUARD: Four. Pity marks.'] },
  ],
  'kingdom-town:varga': [
    { who: 'brannoc', lines: ['BRANNOC: A spine. Yes. I have one of those. It is in here somewhere.'] },
  ],
  'candle-inn:nana': [
    {
      who: 'brannoc',
      with: 'oren',
      lines: [
        'BRANNOC: Thin? I? Look upon these arms!',
        "NANA BIRCH: I'm looking. Eat.",
        "OREN: He's had three bowls.",
        'NANA BIRCH: Then he can have a fourth. You too. Sit.',
      ],
    },
    { who: 'plush', lines: ['PLUSH: Is there a sofa?', "NANA BIRCH: There's a chair.", "PLUSH: …I'll manage."] },
    { who: 'brannoc', lines: ['BRANNOC: Thin? I? Look upon these arms!', "NANA BIRCH: I'm looking. Eat."] },
  ],
  'candle-inn:cellar-door': [
    { who: 'oren', lines: ['OREN: People are hiding down there.', "OREN: …We didn't see anything."] },
  ],
  'hedge-maze:hugo': [{ who: 'moss', lines: ["MOSS: They do have feelings. That one's sulking."] }],
  'the-pit:fight-card': [
    { who: 'pip', lines: ["PIP: Compulsory cheering? I've been training my whole life for this."] },
  ],
  'the-pit:maelis': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: A prince, eh? I hope he was worth it.',
        'SERGEANT MAELIS: Family says he ran.',
        'BRANNOC: …He sounds a coward.',
      ],
    },
  ],
  'field-of-banners:hoot-field': [
    { who: 'pip', lines: ["PIP: He's right, you know. Go on. I'll hum while you drink."] },
  ],
  // ---- Kaldor's castle (author, Oct 4, 2026): the party chimes in from the text box; only the big
  // beats (moments.ts) bring someone out beside you
  'castle-grounds:drill-sergeant': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: I drilled in this very yard, as a boy. It was greener then. There were fewer skulls.'],
    },
    { who: 'tamsin', lines: ["TAMSIN: Sixteen hours a day and nobody's mended that fence. Priorities."] },
  ],
  'castle-grounds:medic': [
    { who: 'brannoc', lines: ['BRANNOC: Poor fellow. I have been that fellow. Many times.'] },
    { who: 'oren', lines: ['OREN: Let him breathe. ...He is breathing. Good. Leave the bird.'] },
  ],
  'castle-grounds:gate-guard': [
    {
      who: 'ysolde',
      lines: ["YSOLDE: An army that doesn't pay its soldiers. I'd love to see the books. I'd hate to see the books."],
    },
  ],
  'castle-upper:queen-brunhilt': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: Five queens. My father had but the one, and he said she was quite enough.'],
    },
    { who: 'pip', lines: ['PIP: Five queens and a chandelier with opinions. I smell a ballad.'] },
  ],
  'castle-upper:queen-maren': [{ who: 'wren', lines: ['WREN: She does love him. Somebody ought to.'] }],
  // ---- the Royal Forest and the Painters' School (author, Oct 7, 2026): where Brannoc ran. He remembers
  // bits, never the whole; Moss reads the trees. "tile:<letter>" is a tile you examine; a memory's id plays
  // once the memory closes (memories.ts).
  'royal-forest:forest-woodcutter': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: A prince ran in there? Poor fellow. I would have run the other way. I am very good at the other way.'],
    },
    { who: 'moss', lines: ["MOSS: He's right not to. The trees in there are listening. Not to us."] },
  ],
  'royal-forest:tile:1': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: Everybody draws sparrows. …I used to sign mine like that. Small, in the corner. Funny.'],
    },
    {
      who: 'moss',
      lines: ["MOSS: The bark's grown over the cuts. Five hundred rings, near enough. Somebody careful, in a hurry."],
    },
  ],
  'royal-forest:tile:2': [
    { who: 'brannoc', lines: ['BRANNOC: The legs are wrong. I would have fixed the legs. …Why would I have fixed the legs?'] },
  ],
  'royal-forest:tile:3': [
    { who: 'moss', lines: ['MOSS: Cut with something small and sharp. A palette knife, maybe. Not a sword.'] },
  ],
  'royal-forest:tile:4': [
    { who: 'brannoc', lines: ["BRANNOC: I don't like this one. Can we go north? We should go north."] },
    { who: 'moss', lines: ['MOSS: The tree remembers being cut. It flinched.'] },
  ],
  'royal-forest:tile:5': [{ who: 'brannoc', lines: ["BRANNOC: …He didn't finish it."] }],
  'royal-forest:brannoc-forest': [
    {
      who: 'brannoc',
      lines: [
        "BRANNOC: That's where it stops. Every time I try to think past it, there's just… grass.",
      ],
    },
    { who: 'moss', lines: ["MOSS: Nothing's grown in that ring since. The ground's still holding its breath."] },
  ],
  'painters-school:tile:S': [
    { who: 'brannoc', lines: ["BRANNOC: One arm's longer than the other. …I think that arm was mine. I did the arms."] },
  ],
  'painters-school:tile:k': [
    {
      who: 'brannoc',
      with: 'wren',
      lines: [
        'BRANNOC: These are rather good. Whoever B was.',
        'WREN: B. …Brannoc?',
        'BRANNOC: Lots of people begin with B.',
      ],
    },
    { who: 'brannoc', lines: ['BRANNOC: These are rather good. Whoever B was.'] },
  ],
  'painters-school:brannoc-school': [
    {
      who: 'brannoc',
      lines: [
        "BRANNOC: I ran. That night. I didn't even go back for my sketchbook.",
        "BRANNOC: He said I was a great warrior. I still don't know what he meant. I think he did, though.",
      ],
    },
    {
      who: 'oren',
      lines: [
        'OREN: He meant it.',
        'BRANNOC: Meant what?',
        'OREN: Ask me in a year.',
      ],
    },
    {
      who: 'wren',
      lines: [
        'WREN: He sounds kind.',
        'BRANNOC: He was. He was the only one who never wanted anything from me. Except to look properly.',
      ],
    },
    {
      who: 'quill',
      lines: [
        'QUILL: "Yearning for battle doesn\'t make one a great warrior." I\'m writing that down.',
        'QUILL: …Sorry. Is now a bad time?',
        'BRANNOC: No. Write it down. Somebody should.',
      ],
    },
  ],
};

/**
 * What the party adds on this map at this object: every listed entry whose
 * speakers are all with you (`party`: members you have, see partyWithYou),
 * in order, each member speaking at most once. Nothing if none of them came.
 */
export function banterFor(mapId: string, objectId: string, party: readonly CharacterId[]): string[] {
  const spoken = new Set<CharacterId>();
  const lines: string[] = [];
  for (const b of BANTER[`${mapId}:${objectId}`] ?? []) {
    const speakers = b.with ? [b.who, b.with] : [b.who];
    if (!speakers.every((id) => party.includes(id) && !spoken.has(id))) continue;
    for (const id of speakers) spoken.add(id);
    lines.push(...b.lines);
  }
  return lines;
}
