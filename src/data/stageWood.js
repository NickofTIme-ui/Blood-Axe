// stageWood.js — THE CAMPAIGN, LEVEL 2: GALLOWS WOOD (docs/campaign/plan.md). The Oath
// Keepers follow the prisoner convoy up the north road through a wet black pine wood.
// GRAYBOX, built in Stage 2 to put the campaign's new systems to work: the level
// transition from the village, an execution, cages, an escort, and a boss with phases.
// Its painted art is requested in docs/campaign/art-levels-1-2.md. Everything here is drawn in code (view/WoodView.js, view/NpcView.js).
//
// Same format as data/stageVillage.js (a terrain block's `mat: 'log'` draws it as a fallen
// tree). Built for the weakest jumper (Rurik, walking, no
// upgrades): the streams are crossed on fallen logs (a 10 px step: walked onto) or on
// stepping stones (gaps of 60, ups of 30); a test walks it with every hero.
//
// THE ROUTE
//   I   THE WOOD ROAD      the others scout ahead; a stream; the convoy's rear guard
//   II  THE HANGING TREE   the hangmen's tree, its dead still on it. Joren, Mira's husband,
//                          slipped his noose and hangs from the bough, their hounds under him: pull
//                          them off him or kill them before his grip goes (treed). A shrine
//   III THE CAGE CARTS     the convoy's broken carts: stepping stones over a ravine stream;
//                          two cages to open once the guards are dead (cage)
//   IV  THE OLD FORD       Ansel the wheelwright, lame, walks out with you; an ambush on
//                          the road: keep them off him (escort)
//   V   THE CONVOY         the convoy's last wagon rolling away with prisoners in it: smash
//                          it before it gets up the road, through its guards
//   VI  THE KENNELS        a shrine; THE HOUNDMASTER and his war hounds (boss phases: his
//                          pack, then his frenzy)
//   VII THE BLOCKED ROAD   the pass buried by a rockslide; the convoy's tracks turn into the
//                          mountain. Out by the old mine road: on to Hollow Mountain

const FULL = { z0: 282, z1: 520 };
// A group of props set out together by their painted looks, as in data/stageVillage.js:
// [look, x, z, more]; `stack` in more: it stands on the one before it (x then its offset).
// Every group belongs to someone: the rear guard's camp, the hangmen's kit, the convoy's
// spilled loads, the river's wash, the kennels' feed. The middle of the road stays clear.
const KIND_OF = (look) => (/^(barrel|keg)/.test(look) ? 'barrel' : /^(crate|sack)/.test(look) ? 'crate' : look);
const group = (items) => items.map(([look, x, z, more = {}]) => (more.stack
  ? { kind: KIND_OF(look), look, dx: x, drop: null, ...more }
  : { kind: KIND_OF(look), look, x, z, drop: null, ...more }));
// The oath shrines stand at the back of the road on solid footprints, as in the village
// (nobody walks through them or stands on top: Nick, 2026-10-23); kneel in front of one.
const SHRINE_TREE = { x: 2800, z: 294, kind: 'oath', solid: true };
const SHRINE_KENNELS = { x: 7320, z: 294, kind: 'oath', solid: true };
const shrineFootprint = (r) => ({ kind: 'block', x0: r.x - 52, x1: r.x + 52, z0: 282, z1: r.z + 6, top: 400, hideArt: true });
// Joren on the hanging tree's bough, out at its tip past the dead: the hounds worry under him
const JOREN_BOUGH = { x: 2280, z: 300 };

export const STAGE_WOOD = {
  id: 'gallowsWood',
  name: 'GALLOWS WOOD',
  chapter: 'II',
  next: { id: 'hollowMountain', name: 'HOLLOW MOUNTAIN', chapter: 'III' },
  doneTitle: 'THE CONVOY IS BROKEN', // (the tally's title)
  width: 9200,
  theme: 'wood',
  music: 'wilderness', // (core/Music.js)
  tall: true,
  castle: { x: 760, scale: 0.6, detail: 0.5 }, // nearer now: a silhouette over the wood
  // the other two Oath Keepers (view/NpcView.js): with you at the start, then scouting
  // ahead; they wait at the blocked road, and leave with you after the last words
  companions: { leaveAfter: 'opening', meet: 8500, farewell: 'turn' },

  sections: [
    {
      id: 'road', name: 'THE WOOD ROAD', x0: 0, x1: 1500,
      spawn: { x: 150, z: 440 },
      objective: 'Follow the convoy',
      hint: 'Walk the fallen log over the stream',
      fightAt: 1000,
      waves: [['stalker', 'grunt', 'grunt'], ['grunt', 'butcher', 'grunt']],
      props: [
        { kind: 'crate', x: 1320, z: 470, drop: 'health' },
        { kind: 'barrel', x: 420, z: 300, drop: null },
        // a sack cart's load tipped in the ditch where a wheel went (the near edge)
        ...group([['sack', 660, 502], ['sack', 700, 506], ['crate-v2', 748, 500]]),
        // the rear guard's camp at the road's end: their table, a crate and a jug on it, their
        // water and ale beside it, against the trees
        { kind: 'trestle', x: 1080, z: 300, drop: null },
        ...group([['crate-v5', -22, 0, { stack: true }], ['urn', 30, 0, { stack: true, drop: 'mana' }]]),
        ...group([['barrel-v3', 1160, 302], ['keg', 1206, 306]]),
        // a SECRET: a poacher's cache in the ferns at the back of the road, behind where you
        // come in (only found by turning back)
        { kind: 'urn', x: 64, z: 288, drop: 'charm', secret: true },
      ],
      hazards: [],
    },
    {
      id: 'tree', name: 'THE HANGING TREE', x0: 1500, x1: 2900,
      spawn: { x: 1560, z: 440 },
      objective: 'Get the hounds off Joren',
      hint: 'Pull the hounds off the tree or kill them: his grip is going',
      fightAt: 1760,
      // the hangmen between you and the tree; their two hounds under Joren on the bough,
      // leaping at him (`worry`), till a hero comes near or hurts one (entities/Enemy.js)
      waves: [['grunt', 'hound', 'butcher', 'hound', 'grunt'], ['stalker', 'grunt']],
      spawns: [
        [
          { x: 2060, z: 360, inPlace: true },
          { x: JOREN_BOUGH.x - 50, z: 330, inPlace: true, worry: JOREN_BOUGH },
          { x: 2160, z: 440, inPlace: true },
          { x: JOREN_BOUGH.x + 50, z: 350, inPlace: true, worry: JOREN_BOUGH },
          { x: 2120, z: 490, inPlace: true },
        ],
        [],
      ],
      props: [
        { kind: 'barrel', x: 2700, z: 480, drop: 'health' },
        // the hangmen's kit by the tree: a long crate of rope, a keg, and a sack
        ...group([['crate-long', 1960, 300], ['keg2', 2016, 304], ['sack', 2620, 300]]),
      ],
      hazards: [],
      rest: SHRINE_TREE,
    },
    {
      id: 'carts', name: 'THE CAGE CARTS', x0: 2900, x1: 4400,
      spawn: { x: 2960, z: 440 },
      objective: 'Open the cages',
      hint: 'Clear the guards, then hold E (D-pad up) at a lock',
      fightAt: 3560,
      waves: [['grunt', 'stalker', 'grunt'], ['berserker', 'grunt']],
      props: [
        { kind: 'crate', x: 4300, z: 300, drop: 'mana' },
        // the broken carts' loads spilled along the near edge of the road
        ...group([['crate-v6', 3560, 500], ['crate-v0', 0, 0, { stack: true }], ['sack', 3616, 504]]),
        // the convoy's strongbox, dropped when the axle went
        { kind: 'chest', x: 4230, z: 498, drop: 'health' },
        // a SECRET up on the high shelf at the back (terrain: the boulder and the shelf): Vexa's
        // double jump, Oryn's rise, or Rurik with WIND STEP; nobody needs it
        { kind: 'crate', x: 4060, z: 305, drop: 'relic', secret: true },
      ],
      hazards: [],
    },
    {
      id: 'ford', name: 'THE OLD FORD', x0: 4400, x1: 5600,
      spawn: { x: 4460, z: 440 },
      objective: 'Get Ansel across the ford',
      hint: 'Keep them away from him: he freezes when they come close',
      fightAt: 4860,
      waves: [['stalker', 'grunt'], ['grunt', 'stalker', 'grunt']],
      props: [
        { kind: 'barrel', x: 5520, z: 300, drop: 'health' },
        // barrels off the convoy, washed up on the near bank
        ...group([['barrel-grey', 4700, 500], ['barrel-v1', 4746, 504, { drop: 'mana' }]]),
      ],
      hazards: [],
    },
    {
      // the convoy's last wagon, still rolling: armoured, its prisoners inside, guards round
      // it. Smash it before it gets away up the road, or they're gone (Stage.updateRolling)
      id: 'convoy', name: 'THE CONVOY', x0: 5600, x1: 7200,
      spawn: { x: 5660, z: 440 },
      objective: 'Stop the prisoner wagon',
      hint: 'Smash the wagon before it gets away up the road',
      fightAt: 5860,
      // (the last: the kennel wagon's hounds let loose, with their handler. It was a horde of
      // thralls: the market square's, again; the wood's pack is its own)
      waves: [['grunt', 'butcher', 'grunt'], ['stalker', 'grunt', 'berserker'], ['grunt', 'butcher', 'stalker'], ['hound', 'hound', 'hound', 'hound', 'grunt']],
      props: [
        { kind: 'wagon', tag: 'convoy', x: 6080, z: 320, roll: { to: 7110, speed: 22 } },
        { kind: 'barrel', x: 5700, z: 480, drop: 'health' },
        // the convoy's supplies, dumped at the roadside to lighten the wagons
        ...group([['crate-v5', 5780, 300], ['crate-v1', 0, 0, { stack: true }], ['barrel-tar', 5840, 302]]),
      ],
      hazards: [],
    },
    {
      id: 'kennels', name: 'THE KENNELS', x0: 7200, x1: 8400,
      spawn: { x: 7260, z: 440 },
      objective: 'Kill the Houndmaster',
      hint: 'Kill the hounds fast: he calls more when he is hurt',
      fightAt: 7560,
      waves: [],
      props: [
        { kind: 'crate', x: 8300, z: 480, drop: 'health' },
        // the kennels' feed: barrels of offal either side of the pens
        ...group([['barrel-v6', 7470, 302], ['barrel-v2', 7516, 306]]),
        ...group([['barrel-v5', 8160, 302, { drop: 'mana' }], ['keg', 8206, 306]]),
      ],
      hazards: [],
      rest: SHRINE_KENNELS,
      // THE HOUNDMASTER: the Stalker's kind, grown into the convoy's master, with his war
      // hounds (data/enemies.js `hound`). Two of them come in with him; he blows his horn
      // for the pack at two thirds, and at one third he goes into a frenzy with the last of
      // them. (His own painted strips: docs/campaign/art-levels-1-2.md; until then he wears
      // the Stalker's.)
      boss: {
        type: 'stalker', name: 'The Houndmaster', health: 3.6, damage: 1.1, escort: ['hound', 'hound'],
        entrance: { from: 140, to: 330, speed: 72, stepEvery: 28, awe: 30 },
        // beaten: his crimes and his sentence (stage/Sentence.js)
        sentence: {
          speaker: 'HOUNDMASTER',
          crimes: [
            'You ran the convoy that dragged our people north in cages.',
            'You hanged them from the trees, one by one, to keep the rest afraid.',
            'You fed the ones who ran to your dogs.',
          ],
          last: 'My dogs will howl for me tonight. Let them find you.',
        },
        phases: [
          { id: 'pack', at: 0.66, adds: ['hound', 'hound', 'hound'], ai: { attackCooldown: [24, 56] } },
          { id: 'frenzy', at: 0.33, rage: true, adds: ['hound', 'hound', 'stalker'], damage: 1.25, speed: 1.2, ai: { attackCooldown: [16, 40], comboChance: 0.8 } },
        ],
      },
    },
    {
      id: 'pass', name: 'THE BLOCKED ROAD', x0: 8400, x1: 9200,
      spawn: { x: 8460, z: 440 },
      objective: 'The mine road',
      hint: '',
      waves: [],
      props: [],
      hazards: [],
    },
  ],

  // the pass is buried: the way on is the old mine road, once the last words are said
  exit: { x: 8940, after: 'turn' },

  terrain: [
    // ---- I THE WOOD ROAD: a stream with a log across it (the fallen pine that walled off
    // the road's start was taken out at Nick's ask, 2026-11-05)
    { kind: 'pit', x0: 820, x1: 900, ...FULL },
    { kind: 'block', x0: 800, x1: 920, z0: 400, z1: 452, top: 10, mat: 'log' },

    // ---- III THE CAGE CARTS: a ravine stream crossed on stepping stones
    { kind: 'pit', x0: 3080, x1: 3380, ...FULL },
    { kind: 'block', x0: 3130, x1: 3200, z0: 360, z1: 480, top: 30 },
    { kind: 'block', x0: 3260, x1: 3330, z0: 360, z1: 480, top: 30 },
    { kind: 'block', x0: 3700, x1: 3800, z0: 282, z1: 330, top: 50 }, // a broken cart against the trees
    // THE HIGH SHELF (optional): a mossy boulder at the back of the road (+70: a held jump),
    // and over it a rock shelf 150 higher, like the Gallows Ascent's roost: Vexa's double
    // jump, Oryn's rise, Rurik with WIND STEP. (Rock: the wood's painted rock tiles)
    { kind: 'block', x0: 3910, x1: 3990, z0: 282, z1: 336, top: 70 },
    { kind: 'block', x0: 3990, x1: 4130, z0: 282, z1: 330, top: 220 },

    // ---- IV THE OLD FORD: a stream with a wide log bridge (Ansel walks it)
    { kind: 'pit', x0: 5160, x1: 5240, ...FULL },
    { kind: 'block', x0: 5140, x1: 5260, z0: 380, z1: 470, top: 10, mat: 'log' },

    // ---- II and VI: the shrines' footprints
    shrineFootprint(SHRINE_TREE),
    shrineFootprint(SHRINE_KENNELS),

    // ---- VI THE BLOCKED ROAD: the rockslide across the pass (nobody climbs it)
    { kind: 'block', x0: 9040, x1: 9200, ...FULL, top: 320 },
  ],

  lanterns: [{ x: 780, z: 290 }, { x: 2050, z: 290 }, { x: 3080, z: 290 }, { x: 5140, z: 290 }, { x: 7400, z: 290 }, { x: 8600, z: 290 }],

  // the dead (view only): prisoners who fell on the road and were left there
  bodies: [{ x: 300, z: 480, pose: 1 }, { x: 1250, z: 330, pose: 0 }, { x: 3500, z: 500, pose: 2 }, { x: 7900, z: 480, pose: 1 }],

  // the convoy's broken carts (view only)
  carts: [{ x: 3750, z: 300 }, { x: 4140, z: 450 }],
  gallows: { x: 2250, z: 300 }, // the hanging tree (view only; Joren hangs from it)

  npcs: [
    {
      id: 'joren', name: 'Joren', x: JOREN_BOUGH.x, z: JOREN_BOUGH.z, pose: 'treed', rescue: 'treed', section: 'tree', wave: 1,
      freeFor: 60, hold: 96, // (time to drop down and get up; his hands on the painted bough)
      flee: { x: 1600, z: 300 }, gather: { x: 8660, z: 300 },
    },
    // the hangmen's dead, still on the tree (view only)
    { id: 'hanged-1', name: 'a hanged man', pose: 'hanged', x: 2160, z: 296, drop: 64 },
    { id: 'hanged-2', name: 'a hanged woman', pose: 'hanged', x: 2222, z: 296, drop: 84 },
    {
      id: 'tanners', name: 'the tanner\'s boys', x: 3750, z: 340, pose: 'cage', group: true, rescue: 'cage',
      lock: { x: 3750, z: 372 }, flee: { x: 3000, z: 500 }, gather: { x: 8720, z: 470 },
    },
    {
      id: 'wenna', name: 'Old Wenna', x: 4140, z: 450, pose: 'cage', rescue: 'cage',
      lock: { x: 4140, z: 482 }, flee: { x: 3000, z: 400 }, gather: { x: 8600, z: 380 },
    },
    {
      id: 'ansel', name: 'Ansel the wheelwright', x: 4560, z: 440, pose: 'lame', rescue: 'escort', section: 'ford',
      to: { x: 5440 }, flee: null, gather: { x: 8780, z: 340 },
    },
    {
      id: 'convoy', name: 'the prisoners in the wagon', x: 6080, z: 320, pose: 'convoy', rescue: 'convoy', tag: 'convoy',
      flee: { x: 5700, z: 500 }, gather: { x: 8520, z: 480 },
    },
    // (Nicholas, the mountain guide: he meets them again on the Shattered Ascent)
    { id: 'pilgrim', name: 'Nicholas', art: 'nicholas', x: 8550, z: 470, pose: 'wounded', talk: 'pilgrim', ask: true },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        ['VEXA', 'Cart ruts. Chain marks in the mud. They came this way.'],
        ['ORYN', 'The wood crawls with them. Vexa and I take the trees.'],
        ['RURIK', 'I\'ll take the road. Find that convoy.'],
      ],
    },
    { id: 'rope', at: 1640, lines: [['JOREN', 'Up here! The dogs! I can\'t hold on!']] },
    { id: 'joren', on: 'rescued:joren', calm: true, lines: [['JOREN', 'Mira? She lives? ...Thank the gods.'], ['JOREN', 'The cages went on up the road. Hurry.']] },
    { id: 'joren-lost', on: 'lost:joren', calm: true, lines: [['RURIK', 'Too late. Forgive me, Joren.']] },
    { id: 'carts', at: 3420, lines: [['VOICE', 'Here! The cages! They left us when the wheels broke!']] },
    { id: 'locks', on: 'clear:carts', calm: true, lines: [['RURIK', 'The guards are dead. Now the locks.']] },
    { id: 'tanners', on: 'rescued:tanners', lines: [['TANNER\'S BOY', 'We can walk. We\'re going home.']] },
    { id: 'wenna', on: 'rescued:wenna', lines: [['WENNA', 'My old bones thank you, Oath Keeper.']] },
    { id: 'ansel', on: 'follow:ansel', lines: [['ANSEL', 'My leg\'s broken. Stay close. I can\'t fight them.']] },
    { id: 'ansel-safe', on: 'rescued:ansel', lines: [['ANSEL', 'The far bank. I can hide here. Go on.']] },
    { id: 'ansel-lost', on: 'lost:ansel', lines: [['ANSEL', 'No... no, leave me... Run!']] },
    { id: 'kennelWagon', on: 'wave:convoy:4', lines: [['VOICE', 'Open the kennel wagon! Let the dogs run them down!']] },
    { id: 'wagonCry', at: 5720, lines: [['PRISONER', 'Help! They\'re taking us to the Keep!']] },
    { id: 'wagon', on: 'rescued:convoy', lines: [['PRISONER', 'Wheel\'s smashed! Out, all of you! Run!']] },
    { id: 'wagon-lost', on: 'lost:convoy', calm: true, lines: [['RURIK', 'Gone. We\'ll find you at the Keep. I swear it.']] },
    { id: 'kennels', at: 7300, calm: true, lines: [['ORYN', '(from the trees) The Houndmaster runs the convoy. Kneel at the shrine. Then put him down.']] },
    { id: 'houndmaster', on: 'boss:kennels', lines: [['HOUNDMASTER', 'Oath Keepers. Good. My dogs haven\'t eaten in days.']] },
    { id: 'pack', on: 'phase:kennels:pack', lines: [['HOUNDMASTER', 'Up, my beauties! Pull them down!']] },
    { id: 'frenzy', on: 'phase:kennels:frenzy', lines: [['HOUNDMASTER', 'Then I\'ll feed you to them by hand!']] },
    { id: 'gathered', at: 8580, calm: true, if: 'rescued:joren', lines: [['JOREN', 'We followed you. Where you walk, the road is safe.']] },
    // at the blocked road, each of the saved has a word, if you go and hear it
    { id: 'gate-tanners', at: 8580, calm: true, if: 'rescued:tanners', npcTalkFor: 'tanners', lines: [["TANNER'S BOY", 'Our father never came out of the tannery. We\'ll walk home and tell our mother.']] },
    { id: 'gate-wenna', at: 8580, calm: true, if: 'rescued:wenna', npcTalkFor: 'wenna', lines: [['WENNA', 'Seventy winters, and I never saw a mountain shut its door. Mind yourselves under it.']] },
    { id: 'gate-ansel', at: 8580, calm: true, if: 'rescued:ansel', npcTalkFor: 'ansel', lines: [['ANSEL', 'Give me a week and a good axle, and I\'ll build the village a cart that outruns their dogs.']] },
    { id: 'gate-convoy', at: 8580, calm: true, if: 'rescued:convoy', npcTalkFor: 'convoy', lines: [['PRISONER', 'They said the Keep was where the chained ones go in and the bones come out. Not us. Not now.']] },
    {
      id: 'pilgrim', calm: true,
      lines: [
        ['NICHOLAS', 'The pass came down at dawn. Their own men did it, to bar the road behind them.'],
        ['NICHOLAS', 'The carts went into the old mine. Under the mountain.'],
        ['NICHOLAS', 'Nicholas. Thirty years I\'ve guided folk over this mountain. Go under it. I\'ll meet you on the far side.'],
      ],
    },
    {
      id: 'turn', at: 8780, calm: true, hold: true,
      lines: [
        ['VEXA', 'Buried. They\'d sooner bury the road than face us.'],
        ['ORYN', 'The tracks turn into the mountain.'],
        ['RURIK', 'Then we go under it.'],
      ],
    },
  ],

  cutaway: 'convoy',
};
