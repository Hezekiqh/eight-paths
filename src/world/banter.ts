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

  // ---- the Cull Road (author, Oct 7, 2026): the road the unfit children are walked down at twelve.
  // Pip and Moss on the children, Ysolde on the ledger of it, and Brannoc, for once, says very little.
  'cull-road:heights': [
    {
      who: 'pip',
      with: 'moss',
      lines: [
        'PIP: Hal, twelve and a half. He made them write the half.',
        'MOSS: They measured them like calves at market.',
        "PIP: …I'm writing Hal a song. A tall one.",
        'MOSS: Tuft was the runt of his litter. I kept him anyway.',
      ],
    },
    {
      who: 'pip',
      lines: ["PIP: Hal, twelve and a half. He made them write the half. I'm writing Hal a song. A tall one."],
    },
    {
      who: 'moss',
      lines: ['MOSS: They measured them like calves at market.', 'MOSS: Tuft was the runt. I kept him anyway.'],
    },
  ],
  'cull-road:mile-post': [{ who: 'brannoc', lines: ['BRANNOC: …Let us walk on.'] }],
  'cull-road:orders': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Fed, housed, family moved to the city. Against it: no rations, no coin, no coming back.',
        "YSOLDE: That isn't a law. It's a ledger. Strong children in one column, everyone else written off.",
        "YSOLDE: I've seen smugglers keep kinder books.",
      ],
    },
  ],

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
        'DAME OTTILIE: The city.',
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
  // ---- the castle's new rooms (author, Oct 7, 2026)
  'queens-room:dorrit': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: ...',
        'BRANNOC: There were always roses in here. Fresh ones, every morning, whether anyone was here to see them or not.',
        'BRANNOC: I used to hide under that desk. I was found every single time. I was not, it turns out, very good at hiding.',
        'BRANNOC: Forgive me. The dust. It gets in the eyes.',
      ],
    },
  ],
  'kings-bedchamber:ledger': [
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: No columns. No dates. No totals. Just a number, and then a bigger number.',
        'YSOLDE: I have never been so offended by a book.',
        "YSOLDE: ...Those barrels. Do you think he'd notice one missing?",
        "YSOLDE: I'm joking. I'm mostly joking. I'd leave a receipt.",
      ],
    },
  ],
  'kings-bedchamber:pellam': [
    { who: 'pip', lines: ["PIP: Eleven thousand times packed and never gone. That's not a trunk, that's a ballad."] },
  ],
  'mess-hall:bruno': [
    {
      who: 'pip',
      lines: [
        "PIP: Nine years champion! What's the secret?",
        'BRUNO: Mmf.',
        'PIP: "Mmf." Mmf! That\'s a chorus. That\'s a whole chorus.',
        "PIP: Verse one: he ate. Verse two: he ate. Bridge: he's still eating.",
        'PIP: Rule four says no singing. Rule four has never heard me hum.',
      ],
    },
  ],
  'mess-hall:dunt': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Arm-wrestling! I was champion of this very hall, as a boy.',
        "BRANNOC: ...Of the little table. In the corner. Against the cook's daughter.",
        'BRANNOC: She was very strong.',
      ],
    },
    {
      who: 'tamsin',
      lines: [
        'TAMSIN: Give me ten minutes and I could build a machine that settles this.',
        'SERGEANT DUNT: NO MACHINES.',
        'CORPORAL THANE: NO MACHINES.',
        'TAMSIN: ...Wednesday it is, then.',
      ],
    },
  ],
  'royal-dungeon:rackwarden': [
    { who: 'wren', lines: ['WREN: Rows and rows of them. And nobody has said the words over a single one.'] },
  ],
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
  // ---- the bakery by the Kaloseum (author, Oct 7, 2026): the Warden came down through its roof. Brannoc swung,
  // asleep, and remembers none of it; he has a feeling. Pip has a song. Ysolde has questions about the roof.
  'warrior-city:ambrose': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: A man, out of the sky, from the Kaloseum? How very strange.',
        'BRANNOC: …I have the oddest feeling I owe these people a roof.',
        'BRANNOC: I cannot think why. I was asleep the whole time.',
      ],
    },
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Are you insured?',
        'MASTER AMBROSE: Against what?',
        'YSOLDE: Acts of the king. Acts of the Kaloseum. Very large men, from a height.',
        "MASTER AMBROSE: We're insured against fire.",
        'YSOLDE: Pity.',
      ],
    },
  ],
  'warrior-city:hettie': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Madam, I am… very sorry about your roof.',
        'MISTRESS HETTIE: Why? Did you do it?',
        'BRANNOC: No! No. I was asleep. …I am almost certain I was asleep.',
      ],
    },
    {
      who: 'ysolde',
      lines: [
        "YSOLDE: The Kaloseum threw him, so the Kaloseum pays for the roof. That isn't the law. That's arithmetic.",
        'MISTRESS HETTIE: They wrote back STRENGTH ABOVE EVERYTHING.',
        "YSOLDE: Then send them a bill that's stronger. I'll word it for you. No charge. Well. A bun.",
      ],
    },
  ],
  'warrior-city:dot': [
    {
      who: 'pip',
      lines: [
        "PIP: A big man, ever so high up, going AAAAAAA. Dot, that's a song. I'm putting you in the chorus.",
        'LITTLE DOT: What rhymes with roof?',
        'PIP: Oof. Everything rhymes with roof, if you fall far enough.',
      ],
    },
    {
      who: 'brannoc',
      lines: ['BRANNOC: Out of the sky, onto your house. …Did he say anything? On the way down? A name, perhaps?'],
    },
  ],
  'warrior-city:bakery-sign': [
    {
      who: 'pip',
      lines: [
        "PIP: 'Open. Roof closed.' Oh, that's the last line. The Ballad of the Bakery Roof.",
        "PIP: Verse one, he goes up. Verse two, he comes down. There isn't a verse three. That's what makes it sad.",
      ],
    },
    {
      who: 'ysolde',
      lines: ['YSOLDE: Ambrose and Daughter. Two names on the sign, and not one on a policy. I asked.'],
    },
  ],
  'wc-bakery:bryony': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Shall I sweep? I feel very strongly that I ought to sweep.',
        'BRYONY: Why?',
        'BRANNOC: I cannot say. Give me the broom.',
      ],
    },
  ],
  'wc-bakery:tile:w': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Arms out. Legs out. As if somebody hit him very, very hard, once.',
        'BRANNOC: …Who could hit a man that hard? Not I. I am almost sure. I have never been sure of anything less.',
      ],
    },
    { who: 'pip', lines: ["PIP: He landed like a star. Oh, that's lovely. That's the bit everyone will cry at."] },
    {
      who: 'ysolde',
      lines: [
        'YSOLDE: Roof, rafters, floor, stock and a till. Somebody owes somebody a great deal of money.',
        "YSOLDE: And nobody's going to pay it. I can always tell. The air goes a certain way.",
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
  // ---- the Graveyard of Kings, behind the chapel (author, Oct 7, 2026). Brannoc never says whose stone it is.
  'graveyard:lost-prince': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: Lost in the woods. Never found.',
        'BRANNOC: …Perhaps he was simply very good at hiding. Some people are. It is a skill.',
        'BRANNOC: They have kept it very tidy. That is… kind of them. I should like to stand somewhere else now.',
      ],
    },
  ],
  'graveyard:empty-grave': [
    {
      who: 'wren',
      lines: [
        'WREN: Dug from the inside. Every one of them.',
        "WREN: I've said the rites over a great many graves. They're meant to stay shut afterwards. That's rather the point.",
      ],
    },
  ],
  'graveyard:wardens-grave': [
    {
      who: 'moss',
      lines: [
        'MOSS: Chain snapped outwards. Whatever was in there pulled.',
        "MOSS: Grass hasn't grown back over it. Grass grows back over everything. It doesn't want to, here.",
      ],
    },
  ],
  // ---- the Royal Forest and the Painters' School (author, Oct 7, 2026): where Brannoc ran. He remembers
  // bits, never the whole; Moss reads the trees. "tile:<letter>" is a tile you examine; a memory's id plays
  // once the memory closes (memories.ts).
  'royal-forest:forest-woodcutter': [
    {
      who: 'brannoc',
      lines: [
        'BRANNOC: A prince ran in there? Poor fellow. I would have run the other way. I am very good at the other way.',
      ],
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
    {
      who: 'brannoc',
      lines: ['BRANNOC: The legs are wrong. I would have fixed the legs. …Why would I have fixed the legs?'],
    },
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
      lines: ["BRANNOC: That's where it stops. Every time I try to think past it, there's just… grass."],
    },
    { who: 'moss', lines: ["MOSS: Nothing's grown in that ring since. The ground's still holding its breath."] },
  ],
  'painters-school:tile:S': [
    {
      who: 'brannoc',
      lines: ["BRANNOC: One arm's longer than the other. …I think that arm was mine. I did the arms."],
    },
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
      lines: ['OREN: He meant it.', 'BRANNOC: Meant what?', 'OREN: Ask me in a year.'],
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
