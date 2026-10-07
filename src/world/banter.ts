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
  // ---- the Bank of Warrior City (author, Oct 7, 2026): Ysolde has an opinion on every ledger
  'wc-bank:coyne': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: Charming. I'd like to see the books.",
        'MASTER COYNE: The books are not for customers.',
        "YSOLDE: I'm not a customer. I'm an auditor. I've just decided.",
      ],
    },
    {
      who: 'brannoc',
      lines: ['BRANNOC: When I was a boy the treasury was one room and a man called Gilbert. I miss Gilbert.'],
    },
  ],
  'wc-bank:grimsby': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: Steel, three dials, and a guard who doesn't know the numbers. Oh, that's lovely. That's a proper vault.",
        "YSOLDE: Don't look at me. I'm having a moment.",
      ],
    },
    { who: 'pip', lines: ['PIP: Three dials. That rhymes with nothing. I hate it already.'] },
  ],
  'wc-bank:dimmock': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: Rations by the strength of a child. That isn't balancing a book. That's tipping people off the edge of it.",
      ],
    },
    {
      who: 'wren',
      lines: ['WREN: He writes them in red so he never has to write them again. I shall pray for him. Loudly.'],
    },
  ],
  'wc-bank:pennywhistle': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: 'Paid as goddesses.' I've read the column. For goddesses, it's frankly underpaid. I'd ask for a review.",
      ],
    },
  ],
  'wc-bank:tallis': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: Five hundred soldiers, one day, and they're still carrying it forward. That isn't a ledger. That's a trophy cabinet.",
      ],
    },
    {
      who: 'quill',
      lines: ["QUILL: One casualty. Tripped. I'd like to read his file. Nobody ever reads the tripping ones."],
    },
  ],
  'wc-bank:hulda': [
    {
      who: 'ysolde',
      lines: ["YSOLDE: Three carriages, and she'd swap the lot. First sensible thing anyone's said in here."],
    },
    { who: 'oren', lines: ['OREN: Her son is across town. In a bed. Go and see him, if you can.'] },
  ],
  'wc-bank:rask': [
    { who: 'brannoc', lines: ['BRANNOC: A bow with every stipend. Nobody bows to me. I should like a bow.'] },
    {
      who: 'ysolde',
      lines: ["YSOLDE: 'They'd never cheat a champion.' Of course not. They just stop paying him."],
    },
  ],
  'wc-bank:ferrant': [
    { who: 'ysolde', lines: ['YSOLDE: Old money, all of two years old. You can tell. It still squeaks.'] },
  ],
  'wc-bank:agna': [
    {
      who: 'ysolde',
      lines: ["YSOLDE: Since the spring. I'd have lent it to her by now, and I'm famously horrible."],
    },
    { who: 'wren', lines: ['WREN: Nine, and trying. Bless him. Bless the lot of them.'] },
  ],
  'wc-bank:rates': [
    {
      who: 'brannoc',
      with: 'ysolde',
      lines: ['BRANNOC: Is forty a lot?', 'YSOLDE: Yes.', 'BRANNOC: ...In the hundred?', 'YSOLDE: Monthly, Brannoc.'],
    },
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Forty. In the hundred. Monthly.',
        "YSOLDE: I have collected debts from dukes, and I have never once charged forty. That isn't interest. That's a mugging with a receipt.",
      ],
    },
  ],
  'wc-vault:war-chest': [
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: I have never seen so much money in one room, and been so sure it'll be spent badly.",
        "YSOLDE: ...Don't touch the boxes. Touch the little chest. That one isn't anybody's.",
      ],
    },
    {
      who: 'brannoc',
      lines: ['BRANNOC: For the march. Everyone in this city says it as if it were the weather.'],
    },
    {
      who: 'tamsin',
      lines: ["TAMSIN: All that gold, and they've stacked it on the floor. Somebody give me a week and some shelving."],
    },
  ],
  // ---- the hospital (author, Oct 7, 2026): the strong, once
  'wc-hospital:wc-healer': [
    {
      who: 'wren',
      lines: ["WREN: Sit down, Maud. I'll do the next one. No, sit. That's a blessing, not a suggestion."],
    },
    { who: 'oren', lines: ['OREN: She has not eaten. I will bring soup. Then she will be grumpy and fed.'] },
  ],
  'wc-hospital:champion-bruck': [
    {
      who: 'brannoc',
      lines: [
        "BRANNOC: Ah. The arm's broken and he's standing as if it isn't. I know that one.",
        'BRANNOC: ...Not the arm. The standing.',
      ],
    },
    { who: 'wren', lines: ["WREN: Bent is not a kind of strong. Bent is a kind of splint. I'll fetch one."] },
    { who: 'oren', lines: ['OREN: Being hurt is not losing. Tell him. He will not listen. Tell him anyway.'] },
  ],
  'wc-hospital:soldier-tam': [
    { who: 'wren', lines: ['WREN: It will set. Clean breaks do. The stipend is the bit that never mends.'] },
  ],
  'wc-hospital:soldier-hett': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Twenty years, and struck off by the afternoon. That is not how you treat a soldier. That is not how you treat a horse.',
      ],
    },
    { who: 'oren', lines: ['OREN: Breathe, Brannoc. ...Good. Now be angry. Slowly.'] },
  ],
  'wc-hospital:soldier-sigi': [
    {
      who: 'oren',
      with: 'wren',
      lines: [
        'OREN: Seventeen.',
        'WREN: I know.',
        'OREN: ...I will sit with him a while.',
        "WREN: I'll sit with his mum.",
      ],
    },
    { who: 'wren', lines: ["WREN: Seventeen. I'll say one for him. Then I'll say one for whoever made the rules."] },
  ],
  'wc-hospital:soldier-osk': [
    { who: 'brannoc', lines: ["BRANNOC: Walls do fall over. I've fallen over a great deal. It's very survivable."] },
  ],
  'wc-hospital:soldier-corran': [
    { who: 'oren', lines: ['OREN: Thirty-nine good years. He remembers the one bad one. People do.'] },
    {
      who: 'wren',
      lines: ["WREN: If she comes north, the camp will have her. They're kind there. Kinder than here, anyway."],
    },
  ],
  'wc-hospital:mother-ilse': [
    { who: 'wren', lines: ['WREN: Knit fast, love. I shall pray fast. Between us we might beat the bank.'] },
    {
      who: 'brannoc',
      lines: ['BRANNOC: My mother would have liked her. She would have shouted at the bank with her.'],
    },
  ],
  'wc-hospital:kids-bench': [
    {
      who: 'brannoc',
      lines: ['BRANNOC: Your father is a very good wall. I can tell from here. Solid. Excellent mortar.'],
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
