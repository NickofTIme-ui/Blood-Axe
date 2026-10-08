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
//   II  THE HANGING TREE   Joren, Mira's husband, on the rope: kill the hangmen before it's
//                          too late (execution). A shrine
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

export const STAGE_WOOD = {
  id: 'gallowsWood',
  name: 'GALLOWS WOOD',
  chapter: 'II',
  next: { id: 'hollowMountain', name: 'HOLLOW MOUNTAIN', chapter: 'III' },
  doneTitle: 'THE CONVOY IS BROKEN', // (the tally's title)
  width: 9200,
  theme: 'wood',
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
        { kind: 'crate', x: 1320, z: 470, drop: 'meat' },
        { kind: 'barrel', x: 420, z: 300, drop: null },
      ],
      hazards: [],
    },
    {
      id: 'tree', name: 'THE HANGING TREE', x0: 1500, x1: 2900,
      spawn: { x: 1560, z: 440 },
      objective: 'Cut Joren down: kill the hangmen',
      hint: 'The rope is tightening: be quick',
      fightAt: 1760,
      // the hangmen are at the tree when you come in sight of it
      waves: [['grunt', 'butcher', 'grunt', 'grunt'], ['stalker', 'grunt']],
      spawns: [
        [{ x: 2160, z: 330, inPlace: true }, { x: 2260, z: 400, inPlace: true }, { x: 2340, z: 320, inPlace: true }, { x: 2240, z: 480, inPlace: true }],
        [],
      ],
      props: [{ kind: 'barrel', x: 2700, z: 480, drop: 'wine' }],
      hazards: [],
      rest: { x: 2800, z: 320, kind: 'oath' },
    },
    {
      id: 'carts', name: 'THE CAGE CARTS', x0: 2900, x1: 4400,
      spawn: { x: 2960, z: 440 },
      objective: 'Open the cages',
      hint: 'Clear the guards, then hold E (D-pad up) at a lock',
      fightAt: 3560,
      waves: [['grunt', 'stalker', 'grunt'], ['berserker', 'grunt']],
      props: [{ kind: 'crate', x: 4300, z: 300, drop: 'mana' }],
      hazards: [],
    },
    {
      id: 'ford', name: 'THE OLD FORD', x0: 4400, x1: 5600,
      spawn: { x: 4460, z: 440 },
      objective: 'Get Ansel across the ford',
      hint: 'Keep them away from him: he freezes when they come close',
      fightAt: 4860,
      waves: [['stalker', 'grunt'], ['grunt', 'stalker', 'grunt']],
      props: [{ kind: 'barrel', x: 5520, z: 300, drop: 'meat' }],
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
      waves: [['grunt', 'butcher', 'grunt'], ['stalker', 'grunt', 'berserker'], ['grunt', 'butcher', 'stalker'], [...Array(10).fill('thrall'), 'berserker']], // (the last: the HORDE)
      props: [
        { kind: 'wagon', tag: 'convoy', x: 6080, z: 320, roll: { to: 7110, speed: 22 } },
        { kind: 'barrel', x: 5700, z: 480, drop: 'wine' },
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
      props: [{ kind: 'crate', x: 8300, z: 480, drop: 'meat' }],
      hazards: [],
      rest: { x: 7320, z: 320, kind: 'oath' },
      // THE HOUNDMASTER: the Stalker's kind, grown into the convoy's master, with his war
      // hounds (data/enemies.js `hound`). Two of them come in with him; he blows his horn
      // for the pack at two thirds, and at one third he goes into a frenzy with the last of
      // them. (His own painted strips: docs/campaign/art-levels-1-2.md; until then he wears
      // the Stalker's.)
      boss: {
        type: 'stalker', name: 'The Houndmaster', health: 3.6, damage: 1.1, escort: ['hound', 'hound'],
        entrance: { from: 140, to: 330, speed: 72, stepEvery: 28, awe: 30 },
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
    // ---- I THE WOOD ROAD: a fallen pine to hop, a stream with a log across it
    { kind: 'block', x0: 520, x1: 555, ...FULL, top: 40, mat: 'log' },
    { kind: 'pit', x0: 820, x1: 900, ...FULL },
    { kind: 'block', x0: 800, x1: 920, z0: 400, z1: 452, top: 10, mat: 'log' },

    // ---- III THE CAGE CARTS: a ravine stream crossed on stepping stones
    { kind: 'pit', x0: 3080, x1: 3380, ...FULL },
    { kind: 'block', x0: 3130, x1: 3200, z0: 360, z1: 480, top: 30 },
    { kind: 'block', x0: 3260, x1: 3330, z0: 360, z1: 480, top: 30 },
    { kind: 'block', x0: 3700, x1: 3800, z0: 282, z1: 330, top: 50 }, // a broken cart against the trees

    // ---- IV THE OLD FORD: a stream with a wide log bridge (Ansel walks it)
    { kind: 'pit', x0: 5160, x1: 5240, ...FULL },
    { kind: 'block', x0: 5140, x1: 5260, z0: 380, z1: 470, top: 10, mat: 'log' },

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
      id: 'joren', name: 'Joren', x: 2250, z: 302, pose: 'noose', rescue: 'execution', section: 'tree', wave: 1, time: 1500,
      flee: { x: 1600, z: 300 }, gather: { x: 8660, z: 300 },
    },
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
    { id: 'pilgrim', name: 'a pilgrim', x: 8550, z: 470, pose: 'wounded', talk: 'pilgrim', ask: true },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        ['VEXA', 'Cart tracks. Chains dragged in the mud. They came this way.'],
        ['ORYN', 'The wood is full of their men. Vexa and I will scout ahead.'],
        ['RURIK', 'Then I take the road. Find the convoy.'],
      ],
    },
    { id: 'rope', at: 1640, lines: [['JOREN', 'Help! Up here! They are hanging us one by one!']] },
    { id: 'joren', on: 'rescued:joren', calm: true, lines: [['JOREN', 'Mira... is she alive? Thank the old gods.'], ['JOREN', 'The cages went on up the road. Hurry.']] },
    { id: 'joren-lost', on: 'lost:joren', calm: true, lines: [['RURIK', 'Too late... I am sorry, Joren.']] },
    { id: 'carts', at: 3420, lines: [['VOICE', 'Here! In the cages! They left us when the wheels broke!']] },
    { id: 'locks', on: 'clear:carts', calm: true, lines: [['RURIK', 'The guards are dead. Now the locks.']] },
    { id: 'tanners', on: 'rescued:tanners', lines: [['TANNER\'S BOY', 'We can walk! We will go back down to the village.']] },
    { id: 'wenna', on: 'rescued:wenna', lines: [['WENNA', 'My old bones thank you, Oath Keeper.']] },
    { id: 'ansel', on: 'follow:ansel', lines: [['ANSEL', 'My leg is broken... Stay close. I cannot fight them.']] },
    { id: 'ansel-safe', on: 'rescued:ansel', lines: [['ANSEL', 'The far bank. I can hide here. Go on.']] },
    { id: 'ansel-lost', on: 'lost:ansel', lines: [['ANSEL', 'No... no, leave me... Run!']] },
    { id: 'wagonCry', at: 5720, lines: [['PRISONER', 'Help us! They are taking us to the Keep!']] },
    { id: 'wagon', on: 'rescued:convoy', lines: [['PRISONER', 'The wagon is broken! Out, all of you! Run!']] },
    { id: 'wagon-lost', on: 'lost:convoy', calm: true, lines: [['RURIK', 'Gone... We will find you at the Keep. I swear it.']] },
    { id: 'kennels', at: 7300, calm: true, lines: [['ORYN', '(from the trees) The Houndmaster runs the convoy. Kneel at the shrine, then end him.']] },
    { id: 'houndmaster', on: 'boss:kennels', lines: [['HOUNDMASTER', 'The Oath Keepers. My dogs have not eaten in days.']] },
    { id: 'pack', on: 'phase:kennels:pack', lines: [['HOUNDMASTER', 'Up, my pack! Up! Pull them down!']] },
    { id: 'frenzy', on: 'phase:kennels:frenzy', lines: [['HOUNDMASTER', 'Then I will feed you to them myself!']] },
    { id: 'gathered', at: 8580, calm: true, if: 'rescued:joren', lines: [['JOREN', 'We followed you. Where the Oath Keepers walk, the road is safe.']] },
    { id: 'pilgrim', calm: true, lines: [['PILGRIM', 'The rocks came down at dawn. Their own men did it, to close the pass behind them.'], ['PILGRIM', 'The carts went into the old mine. Under the mountain.']] },
    {
      id: 'turn', at: 8780, calm: true, hold: true,
      lines: [
        ['VEXA', 'The pass is buried. Their own men brought it down.'],
        ['ORYN', 'The tracks turn into the mountain. The old mine road.'],
        ['RURIK', 'Then we go under it.'],
      ],
    },
  ],

  cutaway: 'convoy',
};
