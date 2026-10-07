import type { Trigger } from './keeper-talk';

// The Keeper's reactions in the Archive, the lines about your real habits,
// and the last seal of Season 1. Drafted from LORE.md and KEEPER-LINES.md,
// approved by the author. {placeholders} are filled from your record (memory.ts).

export const KEEPER_TALK: {
  moments: { id: string; when: Trigger; lines: string[] }[];
  habits: Record<string, string[]>;
  ambient: string[];
} = {
  moments: [
    {
      id: 'back-from-road-1',
      when: 'first-back-from-road',
      lines: [
        "You're back. And in one piece, which is more than I'd have bet on your first morning. I didn't bet. Much.",
        "No, don't tell me yet. Sit. The road is always longest when it's new.",
        "I kept the candles lit while you were out. Habit. I've had a lot of practice.",
      ],
    },
    {
      id: 'back-from-road-2',
      when: 'first-back-from-road',
      lines: [
        'Well. The door let you out, and it let you back in. I did wonder.',
        "You've got road dust on your boots. The Archive hasn't seen road dust in a very long time.",
        "Leave it. I think I've missed it.",
      ],
    },
    {
      id: 'plush-won',
      when: 'plush-won',
      lines: [
        'Baron Plush. On his feet, and travelling with you. The Baron. Of the cushions.',
        "Five hundred years is a long nap, even for him. Don't ask me how I'd know that.",
        "Comfort makes a very kind jailer. You talked someone out of it. That's no small thing.",
      ],
    },
    {
      id: 'kaldor-allowed',
      when: 'kaldor-allowed',
      lines: [
        'So Kaldor keeps his chair, and you keep the leash. I did not think anyone could put one on him.',
        'A wall keeps the worst days out. It keeps everyone else in, too. Both are true. They usually are.',
        "I won't tell you it was right or wrong. I'll write it down, in the good ink, and we'll see what it grows into.",
      ],
    },
    {
      id: 'kaldor-allowed-2',
      when: 'kaldor-allowed',
      lines: [
        'Mercy for a man like Kaldor. That takes a steadier hand than a sword does.',
        "I've known people who'd call that wisdom, and people who'd call it a cage. I was fond of them all.",
        'Keep an eye on that border, though. Armies that wait tend to get bored.',
      ],
    },
    {
      id: 'kaldor-dethroned',
      when: 'kaldor-dethroned',
      lines: [
        "King Brannoc. I'll need a fresh page for that. Possibly two.",
        "He ran from that throne once. Now he's sitting on it. The roads people take home are rarely straight.",
        "Nobody tells that kingdom what to do now. It's frightening, and it's theirs. Choosing usually is both.",
      ],
    },
    {
      id: 'kaldor-dethroned-2',
      when: 'kaldor-dethroned',
      lines: [
        "The horde's scattered, I hear, and the Kaloseum's just an arena again. Children will be climbing the walls by spring.",
        "You gave them back the right to get things wrong. It's a heavy gift. It's the only kind worth giving.",
        "Tell Brannoc the crown suits him. He won't believe you. Tell him anyway.",
      ],
    },
    {
      id: 'you-crowned',
      when: 'you-crowned',
      lines: [
        'You took the throne yourself. I shall need a fresh page for that. Perhaps a fresh book.',
        'Brannoc tells me you sit on it as if it might bite. Good. It might.',
        'A crown is mostly a promise to keep turning up. You know a little about that already.',
      ],
    },
    {
      id: 'first-fall',
      when: 'first-fall',
      lines: [
        'You took a tumble out there. I heard the door rattle.',
        "Falling's allowed. I've watched a great many people fall. The ones worth watching are the ones who got up.",
        'And here you are, up. The fight will keep. They always do.',
      ],
    },
    {
      id: 'first-heart-piece',
      when: 'first-heart-piece',
      lines: [
        "Is that a piece of heart? Where did you... no. Don't tell me. I like not knowing things. It's a rare treat.",
        "Find three more and they'll make a whole one. Hearts are like that. They mend in pieces.",
      ],
    },
    {
      id: 'whole-heart',
      when: 'whole-heart',
      lines: [
        'Four pieces, and they fit. A whole new heart.',
        "You'll take one more knock before you fall. Worth the hunting. Hearts usually are.",
        "Mind you don't give it away too easily. People will try.",
      ],
    },
    {
      id: 'first-candle',
      when: 'first-candle',
      lines: [
        'You rested by a candle out there. I noticed. The Archive gets a touch warmer when someone does.',
        "If you fall, you'll wake beside it. It's the least a candle can do after all this time.",
        'Who keeps them lit? Oh, somebody careful, I expect. Pass the kettle.',
      ],
    },
    {
      id: 'dessa-letter',
      when: 'dessa-letter',
      lines: [
        'A running boot on the seal. Quickstep. Fastest feet in the whole army, that name belonged to.',
        "Don't open it. Not because I say so. Because a courier never reads the post, and neither should her friends.",
        'Some letters take a long time to arrive. This one can wait a little longer in your Satchel. Keep it moving.',
      ],
    },
    {
      id: 'season-done',
      when: 'season-done',
      lines: [
        "You went to the old portal. I can tell. You've got banner-field grass on your boots.",
        "Something came back to you out there, didn't it. No, keep it. Memories are better unshared for a while.",
        "Sit. Have tea. Whatever's beyond that seal has waited this long. It can wait for the kettle.",
      ],
    },
    {
      // Draft (KINGDOM-EXPANSION.md): what the banners were, after coming home through the portal.
      id: 'season-done-banners',
      when: 'season-done',
      lines: [
        "Hundreds of banners, and not one of them ever saw a battle. Did Orrin tell you? 'Nobody came. Strange quiet. Ate lunch.'",
        'His family always did write things down properly.',
        "Every army in the world was meant to meet on that field. Then a king died in his own bed, and the war simply… didn't happen.",
        "People call that luck. I've lived a long time. I've never once met luck. I have met people who wanted something to look like luck.",
      ],
    },
    {
      id: 'season-done-2',
      when: 'season-done',
      lines: [
        "The seal's loosening. I felt it from here. Old stone doesn't stir for just anyone.",
        "I'd tell you what's past it, but you'd only remind me I promised not to. You always did hold me to things.",
        "Rest a while. The road isn't going anywhere. Roads are very patient. So am I.",
      ],
    },
  ],
  habits: {
    comeback: [
      '{gap} days away, and back in {month}. I wrote it in the ledger, in the good ink.',
      'You came back in {month}. {gap} days is nothing to me. I once waited five hundred years for someone. Worth it.',
      'Coming back is the hardest step there is, and you took it in {month}. The rest is only walking.',
    ],
    streak: [
      "{n} days in a row. I've taken to leaving the lantern out for you. Not that you need it.",
      "{n} days running. The party has started a wager on how far you'll go. I bet high.",
      '{n} days. I keep the count in the margins, and the margins are filling up nicely.',
    ],
    best: [
      "{n} days. That matches your best ever. Tomorrow, it's new ground.",
      "I checked the ledger twice. {n} days is the furthest you've gone. You're standing right at the edge of it.",
      "Your best was {n} days. You're level with it now. I've left the next page blank, just in case.",
    ],
    strongest: [
      'Your {path} Path stands at level {level}. Strongest of the eight. It shows in how you stand.',
      "Level {level} {path}. I've known a few who got that far. You carry it better than most did.",
      'Your {path} is out ahead at level {level}. The other Paths will catch up. They usually want to.',
    ],
    shownUp: [
      "{days} days shown up. I've set aside a whole page for it.",
      "{days} days. Not in a row, just shown up. That's the number I like best.",
      "You've come back {days} times now. Every one is written down. I don't lose pages.",
    ],
    newcomer: [
      "Early days. Everything's strange, including me. That's allowed.",
      "Still finding your feet? Small steps. The Paths are long, but they're in no hurry.",
      'A few days in. The first ones are the strangest. They get friendlier, I promise.',
    ],
  },
  ambient: [
    "The kettle's on. It's always on. I'm not sure it remembers how to be off.",
    "I dusted your cocoon this morning. Force of habit. You're not even in it.",
    "The scrolls get restless when someone's been out walking. They like the news.",
    "I've reshelved that pile by the south wall. In my head. The real pile is still there.",
    "Tamsin says she'll fix the wobbly shelf later. She's said that for a while. I've grown fond of the wobble.",
    'Nothing new? Good. Some days are for sitting still. Not too long, mind.',
    "The high window lets in a little sky. I don't need it. I look anyway.",
    'Every line in that ledger is in my hand. Well. Mostly my hand.',
    "I don't sleep, as such. I close my eyes and count the candles. I always get the same number. It's restful.",
    "You walk differently than the day you woke. More like yourself. Don't ask how I'd know.",
    "Out there it's been a few days. In here, it's been about a cup of tea.",
    "If you're after a lecture, I'm clean out. Try the owl in the field. He has plenty.",
    "Somewhere out there, someone's asleep and waiting. There's no rush. There's never been a rush.",
    "The great door creaks less these days. I think it's getting used to you.",
  ],
};

export const FINALE: {
  seal: string[];
  record: string[];
  allowed: string[];
  dethroned: string[];
  /** The same, walking as Brannoc: it's your throne, and you're the one working remotely. */
  dethronedAsBrannoc: string[];
  crowned: string[];
  memory: string[];
  keepsake: { name: string; text: string[] };
  end: string[];
} = {
  seal: [
    'You stand before the old portal. The field is quiet. Your party hangs back a step, and lets you go first. Somehow that feels right.',
    "You lay your hand on the stone. It's warm, like something that has been waiting a very long time.",
    'The last seal shivers. A hairline of light runs through it, and through the light: water, falling coins, someone counting.',
    "It doesn't break. It loosens, like a knot someone has finally started to untie.",
    "Behind you, every banner in the field lifts at once, in a wind you can't feel.",
  ],
  record: [
    'Out there, in your own life, you kept {habits} habits. Every one of them walked you here.',
    '{days} days, you showed up. Your longest run was {best} days. None of that happened in the Other World. All of it was you.',
    "And in {month}, after {gap} days away, you came back. That may be the strongest thing you've done yet.",
  ],
  allowed: [
    'Far behind you, Kaldor sits his throne, on your terms. His horde stands on the border, facing outward, and goes no further. The cages are open.',
    'You put a wall between that kingdom and its worst days. Somewhere, someone would call that wisdom.',
    "It's a fearsome peace. But it's a peace, and you chose it.",
  ],
  dethroned: [
    "Far behind you, a royal advisor sits beside Brannoc's empty throne, under a sign in the king's own hand: DON'T GO TO WAR. DON'T CAUSE PROBLEMS.",
    'Beside you, King Brannoc checks the sky for ravens. He is working remotely.',
    "The horde is gone. Nobody guards the streets, and nobody asks permission. It's frightening. It's theirs.",
    'You chose to let them choose. Somewhere, someone would call that reckless.',
  ],
  dethronedAsBrannoc: [
    "Far behind you, a royal advisor sits beside your empty throne, under a sign in your own hand: DON'T GO TO WAR. DON'T CAUSE PROBLEMS.",
    'Now and then, you check the sky for ravens. You are working remotely.',
    "The horde is gone. Nobody guards the streets, and nobody asks permission. It's frightening. It's theirs.",
    'You chose to let them choose. Somewhere, someone would call that reckless.',
  ],
  crowned: [
    'Far behind you, there is an empty throne with your name on it, and a captain who faints keeping it warm.',
    "The horde is gone. The cages are open. Nobody is quite sure what a kingdom does next, and they're asking you.",
    'You chose to carry it yourself. Somewhere, someone would call that brave.',
  ],
  memory: [
    'The hum of the seal fills your head, and the field changes around you.',
    'Summer grass. A wooden post for a target. A boy with a sword far too big for him, trying very hard not to drop it.',
    '"Feet apart," someone says. The voice is yours. It\'s older than you expected, and kinder.',
    'You fix his grip, finger by finger. He looks up at you as if you hung the sky. You pretend not to notice.',
    '"Again." He swings, and misses, and laughs. So do you. You\'d forgotten you could laugh like that.',
    "Then it's gone. Your hand is closed around a knot of frayed red cord. Aurelio. You taught him. You have held a sword before.",
  ],
  keepsake: {
    name: 'Frayed sword knot',
    text: [
      "A knot of red cord, frayed, tied the way a teacher ties one for a student: tight, so the blade can't slip.",
      'Holding it, you smell summer grass. A boy is trying very hard not to drop his sword.',
      '"Feet apart," says a voice. Yours.',
      "Aurelio. You taught him. The rest hasn't come back yet.",
    ],
  },
  end: [
    'You have finished Season 1 of the Eight Paths. The last seal is loosening. It will open when the next story is ready.',
    'Until then, keep walking your Paths. Every habit you keep out there still makes you stronger in here.',
    "And the Keeper has the kettle on. Go and tell him everything. Or nothing. He'll be glad either way.",
  ],
};
