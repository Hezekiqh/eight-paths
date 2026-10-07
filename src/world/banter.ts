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
  // ---- the kingdom, filled in (author, Oct 7, 2026): strength above everything, and the people it makes.
  // Ysolde has views on the money; everyone has views on the ranking.
  'kingdom-town:gall': [
    {
      who: 'quill',
      lines: [
        "QUILL: Twenty-two laps of the square is about six miles a day. He could've walked to the next kingdom by now.",
        'QUILL: …Which is probably why they keep him on a loop.',
      ],
    },
  ],
  'kingdom-town:grell': [
    { who: 'brannoc', lines: ['BRANNOC: Fight? I? Gladly. Another day. My sword is… resting.'] },
    {
      who: 'oren',
      lines: ['OREN: He picks fights because nobody ever picked him.', 'OREN: …Carts, though. Carts are fair game.'],
    },
  ],
  'kingdom-town:ulm': [
    {
      who: 'wren',
      lines: ['WREN: Forty-one scars. I could have stitched half of those neater.', 'ULM: Neat is for cowards.'],
    },
  ],
  'kingdom-town:thole': [
    {
      who: 'tamsin',
      lines: [
        'TAMSIN: String stretches. I could make you a brass one.',
        "TAMSIN: It'll be fourteen inches too, mind. Brass doesn't lie.",
      ],
    },
  ],
  'kingdom-town:ennet': [
    {
      who: 'moss',
      lines: [
        "MOSS: Woods aren't dangerous. People in woods are dangerous.",
        "MOSS: …And the odd bear. And the odd thing that isn't a bear.",
      ],
    },
    {
      who: 'wren',
      lines: ["WREN: Graves dug from the inside. I'll say a prayer for whoever's under them.", 'WREN: …Or was.'],
    },
  ],
  'kingdom-town:tam': [
    { who: 'wren', lines: ['WREN: Twelve. They take them at twelve.', 'WREN: …Happy birthday, Tam.'] },
    { who: 'pip', lines: ["PIP: Twelve press-ups! Not in a row! That's the spirit. I'll write you a marching song."] },
  ],
  'castle-grounds:hobb': [
    { who: 'moss', lines: ["MOSS: The rabbit's fine, by the way. It thinks you're the slowest thing on the field."] },
  ],
  'castle-grounds:odo': [
    {
      who: 'oren',
      lines: [
        'OREN: Keep your elbow in. Breathe out when you are hit. It hurts less.',
        'RECRUIT ODO: Does it?',
        'OREN: No. But you will still be breathing.',
      ],
    },
  ],
  'castle-grounds:stent': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: 'The spoils of the island.' Somebody's been paying for all those spears.",
        'YSOLDE: It was the island.',
      ],
    },
  ],
  'warrior-city:kell': [
    {
      who: 'pip',
      lines: ["PIP: Two watchmen who never meet! It's a love story. Or a farce. I'll know by the second verse."],
    },
  ],
  'warrior-city:dorr': [
    {
      who: 'quill',
      lines: ['QUILL: Same speed, same loop, opposite sides. You will never meet. It is, mathematically, very sad.'],
    },
  ],
  'warrior-city:haldor': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: Shall I fight him? I shall fight him. …After lunch. One fights poorly hungry.'],
    },
  ],
  'warrior-city:mags': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: A copper a bicep, three to lie. Honest pricing for a dishonest service.',
        "YSOLDE: She's the only sound business in this city. I'd invest.",
      ],
    },
  ],
  'warrior-city:gilder': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Gold doorknobs, a gold bath, a dog in a gold coat. And not one ledger. I can hear the money crying.',
        "LORD GILDER: Money doesn't cry.",
        "YSOLDE: Yours does. It's been spent on a dog.",
      ],
    },
    {
      who: 'tamsin',
      lines: ["TAMSIN: A gold bath goes cold in about four minutes. I've done the sums. He's sitting in cold gold."],
    },
  ],
  'warrior-city:odessa': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: And where would I rank? I have very good shoulders.',
        'LADY ODESSA: Below the horse, dear.',
        'BRANNOC: …It is a very fine horse.',
      ],
    },
    {
      who: 'quill',
      lines: [
        'QUILL: Ranked by Kaloseum standing, then arms, then teeth. Her sample is one plaza. Her method is appalling.',
        'QUILL: …Lovely handwriting, though.',
      ],
    },
  ],
  'warrior-city:brisa': [
    {
      who: 'pip',
      lines: [
        "PIP: You've kept a pie for six weeks? That's not romance, that's an experiment.",
        "BRISA: It's a love pie.",
      ],
    },
  ],
  'warrior-city:fenna': [
    {
      who: 'wren',
      with: 'brannoc',
      lines: [
        "WREN: You don't need a champion to be carried about. You need friends with strong arms. Brannoc?",
        'BRANNOC: I— what? Why me?',
        'FENNA FAIRBROW: …Is he ranked?',
        'WREN: No.',
        'FENNA FAIRBROW: Then I shall walk, thank you.',
      ],
    },
    {
      who: 'moss',
      lines: ["MOSS: Four hours of hair, and a bird'll be nesting in it by noon.", "MOSS: I'd let it. Lovely spot."],
    },
  ],
  'warrior-city:nell': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: A boy, crying, in the forest? Somebody should— we should—',
        'BRANNOC: …I do not care for this story. I do not know why. Let us speak of something else.',
      ],
    },
    { who: 'moss', lines: ["MOSS: Trees don't cry. I've asked."] },
  ],
  'warrior-city:morda': [
    { who: 'oren', lines: ['OREN: She shouts so the Kaloseum will not have to.', 'OREN: …It still will.'] },
  ],
  'kaldorhold:gaudry': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Eleven gold spoons, and he hires back the butlers who robbed him.',
        "YSOLDE: That isn't wealth. That's a very slow bank with a beard.",
      ],
    },
    {
      who: 'pip',
      lines: [
        'PIP: A robe of fourteen beards! Who washes it?',
        'SIR GAUDRY PLUME: Nobody washes it.',
        "PIP: …I'll stand over here.",
      ],
    },
  ],
  'kaldorhold:vessant': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: A gold chair nobody can sit in comfortably. Paid for in sons.',
        "YSOLDE: …That's the whole kingdom's accounts, isn't it? On one chair.",
      ],
    },
    {
      who: 'wren',
      lines: ["WREN: Say the fifth one's name. In daylight. Out loud. It helps.", 'OLD VESSANT: …Not yet.'],
    },
  ],
  'kaldorhold:hulda': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Gold feet on a marble statue. Who insures those?',
        'DAME HULDA: The city.',
        'YSOLDE: Then the city has never met a thief. Feet walk off.',
      ],
    },
    { who: 'wren', lines: ['WREN: Three champions. She never says how many children.'] },
  ],
  'kaldorhold:primrose': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: See-through? I am not see-through. I am considerable.',
        'PRIMROSE VANE: Mm. Could you be considerable a bit to the left?',
      ],
    },
    {
      who: 'pip',
      lines: [
        "PIP: She's kept his sneeze. In a hankie. I've written songs about less.",
        "PIP: …No, I haven't. Nobody has.",
      ],
    },
  ],
  'kaldorhold:vorn': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: Nine children, a stipend for each, and a house by the king. He's not a champion. He's an asset.",
        "YSOLDE: …A poorly managed one. He can't count to nine.",
      ],
    },
    { who: 'oren', lines: ['OREN: Strong. Little Strong. Strong Two.', 'OREN: …Poor Strong Two.'] },
  ],
  'kaldorhold:krag': [
    {
      who: 'wren',
      lines: [
        'WREN: Loosen it. Now. I mean it.',
        '* Krag loosens it, very slightly, when he thinks nobody is looking.',
      ],
    },
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
