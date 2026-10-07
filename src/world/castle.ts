import type { Dimension } from '@/game';
import type { CharacterId } from '@/story/companions';

// Kaldor's castle (author, Oct 4, 2026), at the end of the north road: soldiers drilling on the
// grounds (one of them down), a guard post, and a drawbridge over the moat that won't come down
// until you talk, push, pay or argue your way past the gate guards. Inside, an empty hall: straight
// on to the throne room, or up the winding stair to the king's floor, where his wives gossip about
// him. In the throne room Kaldor and Felix watch his shadow soldiers try to stop you.

/** Set once the gate guards let you through: the drawbridge is down for good. */
export const GATE_FLAG = 'castle-gate';
/** The captain of the gate, at the guard post. */
export const GATE_GUARD = 'gate-captain';
/** The level, on that answer's Path, it takes to talk (or shove, or pay) your way past. */
export const GATE_LEVEL = 8;

export type GateAnswer = {
  label: string;
  /** The Path and level it takes (null: anyone can say it, and it mostly gets you nowhere). */
  path: Dimension | null;
  /** Said when you do it yourself, walking as that Path's hero. */
  lines: string[];
  /**
   * Said when a party member of that Path steps out and does the talking for you (author, Oct 4,
   * 2026), in their own voice; anyone without lines of their own steps up and says the plain ones.
   */
  by?: Partial<Record<CharacterId, string[]>>;
  /** Anyone's answer that sometimes works anyway: the chance, and what's said when it does. */
  luck?: { chance: number; lines: string[] };
  /** Kind or mean (honor.ts). */
  deed?: 'good' | 'bad';
};

/** The captain, before you've said anything. */
export const GATE_OPEN = [
  'CAPTAIN ORSK: Halt. Nobody crosses. King says.',
  'CAPTAIN ORSK: Not merchants. Not priests. Not his own mother, and she asked very nicely.',
  'CAPTAIN ORSK: So. What makes you special?',
];

/**
 * A way past the gate guards for each of the core eight's Paths (Lv 8, greyed out with its icon until
 * then), picked from the "Leave it to..." list (hero-pick.ts, author Oct 4, 2026), and two anyone can
 * say: the polite one and the mean one.
 */
export const GATE_ANSWERS: GateAnswer[] = [
  {
    label: '"Captain. Has anyone told you that you have a hero\'s jaw?"',
    path: 'social',
    lines: [
      'CAPTAIN ORSK: ...A what?',
      'You tell him. The jaw. The shoulders. The way the torchlight finds him. A statue, you say. A tapestry, at the very least.',
      'CAPTAIN ORSK: Nobody has ever mentioned my jaw.',
      'CAPTAIN ORSK: LOWER THE BRIDGE. For the jaw.',
    ],
    by: {
      pip: [
        "PIP: Captain! Has anyone ever told you that you have a hero's jaw?",
        'CAPTAIN ORSK: ...A what?',
        "PIP: A jaw for the ages! I'm putting it in a song. Verse one: the jaw. Verse two: also the jaw.",
        'Pip strums. By the second chorus, the guards are humming along.',
        'CAPTAIN ORSK: Nobody has ever written a song about my jaw. LOWER THE BRIDGE. For the jaw.',
      ],
    },
  },
  {
    label: '"Move."',
    path: 'physical',
    lines: [
      'You take hold of the gate chain and pull. The winch groans. Then the winch gives up.',
      'Four guards watch the chain run out through your hands.',
      'CAPTAIN ORSK: ...We could stop you.',
      'GUARD: Could we, though.',
      'CAPTAIN ORSK: No. No, we could not. Mind the gap.',
    ],
    by: {
      brannoc: [
        'BRANNOC: Stand aside, good sirs. I shall... I shall open it myself.',
        'Brannoc takes hold of the gate chain, shuts his eyes very tight, and pulls. The winch groans. Then the winch gives up.',
        'BRANNOC: Oh! Oh, I did that. Did you see? I did that.',
        'CAPTAIN ORSK: ...We could stop you.',
        'GUARD: Could we, though.',
        'CAPTAIN ORSK: No. No, we could not. Mind the gap.',
      ],
    },
  },
  {
    label: '"How much does the king pay you?"',
    path: 'financial',
    deed: 'good',
    lines: [
      'CAPTAIN ORSK: Pay us?',
      'The guards look at one another.',
      "GUARD: We don't get paid. Nobody gets paid.",
      'You press a coin into each of their hands. One of them starts to cry.',
      'CAPTAIN ORSK: ...Lower the bridge. And never tell the king it was this easy.',
    ],
    by: {
      ysolde: [
        'YSOLDE: Captain. What does the king pay you?',
        'CAPTAIN ORSK: Pay us?',
        "GUARD: We don't get paid. Nobody gets paid.",
        'YSOLDE: Unacceptable. One coin each, and a receipt each. Keep the receipts.',
        'One of the guards starts to cry. He has never had a receipt.',
        'CAPTAIN ORSK: ...Lower the bridge. And never tell the king it was this easy.',
      ],
    },
  },
  {
    label: '"Read the old law to them."',
    path: 'intellectual',
    lines: [
      'You recite the old law, carved in the heart of the hedge maze: any warrior may challenge the crown in single combat, and the court must bear witness.',
      "You point out that the court is inside, the challenger is out here, and he is standing in between. Legally speaking, he's in the way of the law.",
      'CAPTAIN ORSK: ...That is a real law. LOWER THE BRIDGE.',
    ],
    by: {
      quill: [
        'QUILL: Ahem. The old law, carved in the heart of the hedge maze: any warrior may challenge the crown in single combat, and the court must bear witness.',
        'QUILL: The court is in there. The challenger is out here. And you, Captain, are in between. Legally speaking, you are in the way of the law.',
        "QUILL: Footnote: I've brought the full text. Footnote to the footnote: I'll read all of it. Aloud.",
        'CAPTAIN ORSK: ...LOWER THE BRIDGE.',
      ],
    },
  },
  {
    label: '"Captain. When did you last sleep?"',
    path: 'spiritual',
    lines: [
      'You ask the captain how he is. Really ask. He opens his mouth to say "fine," and five hundred years of night shifts come out instead.',
      'CAPTAIN ORSK: ...Nobody asks. Nobody ever asks.',
      'CAPTAIN ORSK: Lower the bridge. I need a minute.',
    ],
    by: {
      wren: [
        'SISTER WREN: Captain. When did you last sleep?',
        'Her lantern brightens. Orsk opens his mouth to say "fine," and five hundred years of night shifts come out instead. Wren listens to all of it.',
        'CAPTAIN ORSK: ...Nobody asks. Nobody ever asks.',
        'CAPTAIN ORSK: Lower the bridge. I need a minute.',
      ],
    },
  },
  {
    label: '(Sit down and wait.)',
    path: 'emotional',
    lines: [
      'You sit down in front of the gate and wait. You do not blink. An hour passes. Then another.',
      'CAPTAIN ORSK: ...Are you going to do that all day?',
      "CAPTAIN ORSK: Fine. FINE. Lower the bridge. It's unsettling.",
    ],
    by: {
      oren: [
        'Oren sits down cross-legged in front of the gate, closes her eyes, and does not move.',
        'An hour passes. A bird lands on her head. She does not move.',
        'CAPTAIN ORSK: ...Is she going to do that all day?',
        'OREN: Yes.',
        "CAPTAIN ORSK: Lower the bridge. LOWER IT. It's unsettling.",
      ],
    },
  },
  {
    label: '"That winch is about to snap."',
    path: 'occupational',
    lines: [
      'You point out the winch: three cracked teeth, one rusted pin, and a chain held on with string.',
      'CAPTAIN ORSK: ...It does make a noise.',
      'You fix it. It stops making the noise.',
      "CAPTAIN ORSK: Now it'll actually come down. Go on, then.",
    ],
    by: {
      tamsin: [
        'TAMSIN: That winch is about to snap. Three teeth cracked, and is that... string?',
        'CAPTAIN ORSK: ...It does make a noise.',
        "TAMSIN: Hold this. Don't touch that. Don't touch anything.",
        "Tamsin's arm whirs. Sparks. A clank. The winch purrs like it's new.",
        "CAPTAIN ORSK: It's never sounded like that. Lower the bridge. Let's see it go.",
      ],
    },
  },
  {
    label: '(Whistle to the moat.)',
    path: 'environmental',
    lines: [
      'You whistle low over the moat. Something large and green surfaces, looks at you, and swims over to the chain.',
      'It bites the chain. The drawbridge shudders.',
      "CAPTAIN ORSK: Is that Gerald? Nobody's seen Gerald in years.",
      'CAPTAIN ORSK: ...Lower it before he eats the gate.',
    ],
    by: {
      moss: [
        'Moss crouches at the edge of the moat and whistles, low and friendly.',
        'MOSS: Hello, old thing. Long winter? Mm. Mm. I know.',
        'Something large and green surfaces and rests its chin on the bank. Moss scratches it.',
        "CAPTAIN ORSK: Is that Gerald? Nobody's seen Gerald in years.",
        "MOSS: He says your chain's been keeping him awake.",
        'CAPTAIN ORSK: ...Lower the bridge. For Gerald.',
      ],
    },
  },
  {
    // the default: anyone can say it; mostly it's a no, but now and then Orsk is in a good mood
    label: '"Please let me in?"',
    path: null,
    deed: 'good',
    lines: ['CAPTAIN ORSK: No.', 'CAPTAIN ORSK: Lovely manners, though. Still no.'],
    luck: {
      chance: 0.15,
      lines: [
        'CAPTAIN ORSK: No.',
        'CAPTAIN ORSK: ...',
        'CAPTAIN ORSK: You know what? Five hundred years, and nobody has ever said please. LOWER THE BRIDGE.',
        'GUARD: Are we allowed to do that?',
        'CAPTAIN ORSK: We are now.',
      ],
    },
  },
  {
    // the mean one (honor.ts): every menu has one
    label: '"Out of my way, you overgrown doorstop."',
    path: null,
    deed: 'bad',
    lines: [
      'CAPTAIN ORSK: ...Doorstop.',
      "GUARD: He's sensitive about the doorstop thing. His mum used to prop the kitchen door open with him.",
      'CAPTAIN ORSK: The bridge stays up. For the doorstop.',
    ],
  },
];

/** The bridge, coming down. */
export const BRIDGE_LOWERS = [
  'Chains rattle. Something enormous groans.',
  'The drawbridge tips forward, and falls, and lands across the moat with a BOOM the soldiers feel in their teeth.',
];

/**
 * King Brannoc (author, Oct 4, 2026): if he takes the throne he stays to rule, so he's out of your
 * party, until he catches you up on the road to the end of the season (the Broken Watch). He's left
 * a royal advisor in charge with two rules, and he's working remotely.
 */
export const BRANNOC_KING = 'brannoc-king';
export const BRANNOC_REJOINED = 'brannoc-rejoined';
/** Ruling, not walking with you: crowned and not yet caught up. */
export const brannocAway = (flags: string[]) => flags.includes(BRANNOC_KING) && !flags.includes(BRANNOC_REJOINED);
/** Where he catches you up. */
export const REJOIN_MAP = 'broken-watch';
export const BRANNOC_REJOINS = [
  'BRANNOC: WAIT! WAIT FOR ME!',
  'Brannoc comes pounding down the road, crown jammed on over his helmet, a scroll flapping in one hand.',
  'BRANNOC: I have appointed a royal advisor. I gave him two rules. Do not go to war. Do not cause problems.',
  "BRANNOC: Everything else, he sends by raven. I am... what is the Keeper's word for it... working remotely.",
  'BRANNOC: I have set my banner to "Away". I shall attend the royal council by candle. I have learned to say "you are on mute." I know not what it means. It is very powerful.',
  'BRANNOC: And I have written an out-of-office scroll. Behold.',
  'The scroll reads: THE KING IS AWAY FROM HIS THRONE. FOR URGENT MATTERS, CONTACT THE ROYAL ADVISOR. FOR WAR, THE ANSWER IS NO.',
  'BRANNOC: Kingship is easy, it turns out. You simply leave.',
  'Brannoc rejoins your party.',
];

/** A Path's answer you have the level for, but nobody of that Path with you to say it. */
export const needsSomeone = (className: string) => `a ${className} with you`;

/** Coming back once the bridge is down. */
export const GATE_AFTER = ['CAPTAIN ORSK: Go on, then. Before I change my mind. I will not change my mind.'];

/** The captain turning you away, kindly-ish, when none of your answers will work yet. */
export const GATE_NOT_YET = `(Lv ${GATE_LEVEL} on a companion's Path, with them in your party, and the gate is yours. Every habit counts.)`;

/** The king's wives, in their parlour upstairs: talk to any of them and they all pile in. */
export const WIVES_GOSSIP = [
  "QUEEN BRUNHILT: Oh! A visitor. Sit, sit. You've come about him, haven't you. Everyone comes about him.",
  "QUEEN SIGNY: He's been off lately. Talking to the walls. Answering them.",
  'QUEEN ASTRA: He asked the chandelier for its opinion on the war. Then he agreed with it.',
  "QUEEN HELKA: Five hundred years of 'tomorrow we march'. I have heard 'tomorrow' more than I have heard my own name.",
  'QUEEN MAREN: That is my loving husband you are talking about.',
  'QUEEN HELKA: She only says that because she is the favourite.',
  'QUEEN MAREN: I am not the favourite.',
  'QUEEN BRUNHILT: You have the good room.',
  'QUEEN MAREN: ...I have the good room.',
  'QUEEN SIGNY: He thinks he cannot die, you know. He keeps saying so. At dinner. Loudly.',
  'QUEEN ASTRA: Between us? If somebody were to knock him down a peg, the five of us would not be heartbroken.',
  'QUEEN MAREN: I would be a little heartbroken.',
  'QUEEN HELKA: The favourite.',
];
