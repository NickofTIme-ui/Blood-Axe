// stageVillage.js — THE CAMPAIGN, LEVEL 1: THE BURNING VILLAGE (docs/campaign/plan.md).
// The Oath Keepers come home from the ford to find their village burning. Graybox: the
// backdrop, the houses, the villagers and the props are drawn in code (view/VillageView.js,
// view/NpcView.js); the painted replacements are listed in docs/cloud-handoff.md.
//
// Same format as data/stageGallows.js (terrain, rests, lanterns, section spawns), plus the
// campaign's: story beats and villagers (stage/Story.js), section.fightAt, falling burning
// beams (hazard 'beam'), wreckage props that pin people in, and the exit (stage/Stage.js).
//
// It is an introductory level, built for the weakest jumper (Rurik: a held jump rises 122
// px and carries 118 on the flat; a tap is a 54 px hop), walking, no upgrades: steps up
// of 85 at most, gaps of 60 at most, and every gap over a burning cellar is taught first
// over ground that can't hurt you. A test walks it with every hero.
//
// THE ROUTE
//   I   THE ASHEN ROAD     arrival; the others split off to search; Hale the smith; looters
//   II  THE MARKET SQUARE  a mother and her son held at the well (defend); burning carts; a shrine
//   III THE BURNING ROOFS  up onto the roofs, along a fallen beam, charred boards over the
//                          cellars; a beam crashing down (taught alone); two men waiting on
//                          the second roof; optional: a boy on a high roof
//   IV  THE MILL YARD      a brawl round the mill floor; the barn pinned shut by a burning beam
//                          (break it); then the rear guard, Brother Cinder, walks in
//   V   THE STABLES        a fight round the burning stables; smash the gate bar and the
//                          horses stampede across the yard, trampling both sides
//   VI  THE LONGHALL       a shrine; Varek the Ash Captain; at half health the hall's beams fall
//   VII THE NORTH GATE     the saved gather; the elder; the vow; out of the gate

const FULL = { z0: 282, z1: 520 };

export const STAGE_VILLAGE = {
  id: 'village',
  name: 'THE BURNING VILLAGE',
  chapter: 'I',
  next: { id: 'gallowsWood', name: 'GALLOWS WOOD' },
  doneTitle: 'THE PURSUIT BEGINS', // (the tally's title)
  width: 9400,
  theme: 'village',
  tall: true,
  // the castle on the horizon: where it stands on the far backdrop and how big (it grows
  // level by level, docs/campaign/plan.md)
  castle: { x: 830, scale: 0.42, detail: 0.3 },
  well: { x: 2250, z: 292 }, // the market square's well (view only)

  sections: [
    {
      id: 'road', name: 'THE ASHEN ROAD', x0: 0, x1: 1400,
      spawn: { x: 150, z: 440 },
      objective: 'Find who still lives',
      hint: 'Tap jump to hop the wreckage',
      fightAt: 1080, // (the looters are at the end of the road: talk to Hale first)
      waves: [['grunt', 'grunt', 'grunt'], ['grunt', 'stalker']],
      props: [
        { kind: 'crate', x: 1250, z: 480, drop: 'meat' },
        { kind: 'barrel', x: 600, z: 300, drop: null },
      ],
      hazards: [],
    },
    {
      id: 'square', name: 'THE MARKET SQUARE', x0: 1400, x1: 2700,
      spawn: { x: 1460, z: 440 },
      objective: 'Save the family at the well',
      hint: 'The burning carts flare up: watch for the glow',
      // they're at the well with the mother and her boy when you come into the square
      // ...and then the HORDE: a pack of thralls from both ends of the square (one against many)
      waves: [['grunt', 'butcher', 'grunt', 'grunt'], ['stalker', 'grunt', 'grunt'], [...Array(9).fill('thrall'), 'butcher']],
      spawns: [
        [{ x: 2230, z: 340, inPlace: true }, { x: 2330, z: 380, inPlace: true }, { x: 2400, z: 320, inPlace: true }, { x: 2300, z: 470, inPlace: true }],
        [],
      ],
      props: [
        { kind: 'barrel', x: 1640, z: 305, drop: 'wine' },
        { kind: 'crate', x: 2560, z: 500, drop: 'mana' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 1900, z: 470, w: 110, d: 60, phase: 0 },
        { type: 'fire', look: 'cart', x: 2520, z: 380, w: 110, d: 60, phase: 105 },
      ],
      rest: { x: 2640, z: 320, kind: 'oath' },
    },
    {
      id: 'roofs', name: 'THE BURNING ROOFS', x0: 2700, x1: 4300,
      spawn: { x: 2760, z: 440 },
      objective: 'Over the roofs',
      hint: 'Charred boards give way: keep moving',
      // two of them waiting up on the second roof: a fight on a ledge over the fire
      fightAt: 3420,
      waves: [['stalker', 'grunt']],
      spawns: [[{ x: 3640, z: 380, inPlace: true }, { x: 3600, z: 460, inPlace: true }]],
      props: [{ kind: 'barrel', x: 4240, z: 470, drop: 'meat' }],
      hazards: [
        // taught alone, on the wide roof: the shadow grows, the beam comes down
        { type: 'beam', x: 3160, z: 410, w: 74, d: 90, period: 200, warn: 80, phase: 0 },
      ],
    },
    {
      id: 'mill', name: 'THE MILL YARD', x0: 4300, x1: 5700,
      spawn: { x: 4360, z: 440 },
      objective: 'Break their rear guard',
      hint: 'Smash the burning beam off the barn door',
      fightAt: 4520,
      waves: [['grunt', 'grunt', 'ghoul', 'grunt'], ['stalker', 'grunt', 'butcher']],
      props: [
        // the barn door, pinned shut by a fallen burning beam: people inside
        { kind: 'wreckage', tag: 'barn', x: 5330, z: 300, drop: null },
        { kind: 'crate', x: 5560, z: 470, drop: 'meat' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 4620, z: 490, w: 100, d: 50, phase: 60 },
        { type: 'beam', x: 5120, z: 470, w: 74, d: 80, period: 260, warn: 80, phase: 90 },
      ],
      // the rear guard: the Iron Penitent's kind, grown into a sub-boss. He walks in from
      // the north road without freezing anyone
      boss: { type: 'penitent', name: 'Brother Cinder, the Rear Guard', health: 2.4, damage: 1, size: 1.3, adds: ['grunt', 'grunt'],
        entrance: { from: 140, to: 330, speed: 70, stepEvery: 30, awe: 0, freeze: false } },
    },
    {
      // the stables burning at the back of the yard, the horses screaming inside: smash the
      // bar off the gate and they bolt, three lanes of them in turn, trampling whoever
      // stands in their way (Ashen men or Oath Keepers). The fight goes on through it.
      id: 'stables', name: 'THE BURNING STABLES', x0: 5700, x1: 7100,
      spawn: { x: 5760, z: 440 },
      objective: 'Free the horses',
      hint: 'Smash the bar off the stable gate. Then mind the stampede',
      fightAt: 5980,
      waves: [['grunt', 'butcher', 'grunt'], ['berserker', 'grunt', 'stalker'], ['grunt', 'butcher', 'grunt', 'ghoul']],
      props: [
        { kind: 'wreckage', tag: 'stables', x: 6380, z: 300, drop: null },
        { kind: 'barrel', x: 5820, z: 500, drop: 'wine' },
        { kind: 'crate', x: 7000, z: 470, drop: 'meat' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 6720, z: 330, w: 100, d: 50, phase: 30 },
        // the stampede (stage/Stage.js updateStampede): out of the stable door, right across
        // the yard; each lane in turn, a warning of dust and hooves first
        { type: 'stampede', when: 'freed:horses', x0: 6200, x1: 7140, z: 330, d: 64, period: 330, warn: 80, count: 3, runs: 3, phase: 0 },
        { type: 'stampede', when: 'freed:horses', x0: 6200, x1: 7140, z: 420, d: 64, period: 330, warn: 80, count: 4, runs: 3, phase: 110 },
        { type: 'stampede', when: 'freed:horses', x0: 6200, x1: 7140, z: 500, d: 64, period: 330, warn: 80, count: 3, runs: 3, phase: 220 },
      ],
    },
    {
      id: 'hall', name: 'THE LONGHALL', x0: 7100, x1: 8400,
      spawn: { x: 7160, z: 440 },
      objective: 'Kill the Ash Captain',
      hint: 'When the hall burns, watch the ground for falling beams',
      fightAt: 7400,
      waves: [],
      props: [{ kind: 'barrel', x: 8280, z: 300, drop: 'meat' }],
      hazards: [
        // the burning longhall comes down once he rages: on him and his men as well
        { type: 'beam', when: 'rage', x: 7550, z: 330, w: 80, d: 70, period: 210, warn: 80, phase: 30 },
        { type: 'beam', when: 'rage', x: 7820, z: 470, w: 80, d: 70, period: 210, warn: 80, phase: 100 },
        { type: 'beam', when: 'rage', x: 8080, z: 360, w: 80, d: 70, period: 210, warn: 80, phase: 170 },
        { type: 'beam', when: 'rage', x: 7700, z: 420, w: 80, d: 70, period: 300, warn: 90, phase: 230 },
      ],
      rest: { x: 7230, z: 330, kind: 'oath' },
      // the man who directed the attack: Pitlord Kragg's kind (mace and spiked shield), a captain
      boss: { type: 'gladiator', name: 'Varek, the Ash Captain', health: 3.4, damage: 1.15,
        adds: ['grunt', 'stalker', 'grunt', 'berserker'],
        entrance: { from: 140, to: 320, speed: 58, stepEvery: 34, awe: 30 } },
    },
    {
      id: 'gate', name: 'THE NORTH GATE', x0: 8400, x1: 9400,
      spawn: { x: 8460, z: 440 },
      objective: 'The road north',
      hint: '',
      waves: [],
      props: [],
      hazards: [],
    },
  ],

  // walk out of the north gate once the vow is made: the pursuit begins
  exit: { x: 9280, after: 'vow' },

  terrain: [
    // ---- I THE ASHEN ROAD: a cart to hop (or walk round), a fallen beam across the road
    { kind: 'block', x0: 470, x1: 560, z0: 390, z1: 470, top: 40 },
    { kind: 'block', x0: 780, x1: 815, ...FULL, top: 42 },

    // ---- III THE BURNING ROOFS
    { kind: 'block', x0: 2900, x1: 2990, z0: 330, z1: 520, top: 45 },   // a cart against the house: a hop
    { kind: 'block', x0: 2990, x1: 3330, ...FULL, top: 120 },           // +75: a held jump onto the first roof
    { kind: 'pit', x0: 3330, x1: 3480, ...FULL },                      // the burning cellar under the beam
    { kind: 'block', x0: 3330, x1: 3480, z0: 385, z1: 440, top: 120 },  // the fallen roof beam: walk it
    { kind: 'block', x0: 3480, x1: 3680, ...FULL, top: 140 },           // the second roof: a hop up
    { kind: 'block', x0: 3540, x1: 3640, z0: 282, z1: 340, top: 225 },  // OPTIONAL: the high roof (+85), the boy
    { kind: 'pit', x0: 3680, x1: 3980, ...FULL },                      // the cellars, burning
    { kind: 'crumble', x0: 3740, x1: 3810, z0: 350, z1: 470, top: 150, fall: 40, back: 200 }, // gap 60
    { kind: 'crumble', x0: 3870, x1: 3940, z0: 350, z1: 470, top: 150, fall: 40, back: 200 }, // gap 60
    { kind: 'block', x0: 3980, x1: 4180, ...FULL, top: 120 },           // gap 40, down
    { kind: 'block', x0: 4180, x1: 4260, ...FULL, top: 60 },            // and down to the yard

    // ---- IV THE MILL YARD: the mill's raised floor at the back
    { kind: 'block', x0: 4720, x1: 5010, z0: 282, z1: 360, top: 70 },
  ],

  // torches marking the way (lanterns: view/TerrainView.js)
  lanterns: [
    { x: 2990, z: 290 }, { x: 3480, z: 290 }, { x: 3980, z: 290 }, { x: 4720, z: 290 }, { x: 8400, z: 290 },
  ],

  // the dead (view only): some were beyond saving before the Oath Keepers came home
  bodies: [
    { x: 380, z: 470, pose: 0 }, { x: 990, z: 500, pose: 1 }, { x: 1520, z: 330, pose: 2 },
    { x: 2050, z: 490, pose: 0 }, { x: 4450, z: 320, pose: 1 }, { x: 7600, z: 500, pose: 2 }, { x: 8600, z: 470, pose: 0 },
  ],

  // heads on pikes (view only: view/VillageView.js drawPikes): the raiders' warning at the
  // road in, the square, and the gate out. n: how many in the cluster
  pikes: [{ x: 560, z: 292, n: 3 }, { x: 1480, z: 290, n: 2 }, { x: 5080, z: 292, n: 3 }, { x: 8560, z: 294, n: 4 }],

  // the villagers (stage/Story.js; drawn by view/NpcView.js)
  npcs: [
    { id: 'hale', name: 'Hale the smith', x: 960, z: 296, pose: 'wounded', talk: 'hale' },
    {
      id: 'mira', name: 'Mira and her son', x: 2300, z: 300, pose: 'family', rescue: 'defend', section: 'square', wave: 1,
      flee: { x: 1500, z: 300 }, gather: { x: 8740, z: 300 },
    },
    {
      id: 'tam', name: 'Tam', x: 3600, z: 312, pose: 'child', rescue: 'reach', flee: null, gather: { x: 8800, z: 312 },
    },
    {
      id: 'barn', name: 'the miller\'s people', x: 5330, z: 296, pose: 'group', rescue: 'wreckage', tag: 'barn',
      flee: { x: 4400, z: 510 }, gather: { x: 8660, z: 330 },
    },
    { id: 'horses', name: 'the horses', x: 6380, z: 294, pose: 'horses', rescue: 'wreckage', tag: 'stables', flee: null },
    { id: 'brann', name: 'Elder Brann', x: 8880, z: 330, pose: 'wounded', art: 'elder', talk: null },
  ],

  // who says what (stage/Story.js). The three Oath Keepers speak whoever is played: the
  // other two are with the hero at the start and at the gate (view/NpcView.js).
  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150, // (after the section's title card)
      lines: [
        ['RURIK', 'Smoke. Over the village... no.'],
        ['VEXA', 'They thought we died at the ford. They thought no one was left to stop them.'],
        ['ORYN', 'Then they were wrong. Split up. Find whoever still lives.'],
      ],
    },
    {
      id: 'hale', calm: true, // (fired by talking to him)
      lines: [
        ['HALE', 'The Oath Keepers... They told us you were dead at the ford.'],
        ['HALE', 'They came at dusk. Ashen men, and a captain who laughed while the roofs burned.'],
        ['HALE', 'Some of them are still at the square. Go!'],
      ],
    },
    { id: 'cry', at: 1560, lines: [['MIRA', 'Leave him! He is only a boy!']] },
    {
      id: 'mira', on: 'rescued:mira', calm: true,
      lines: [
        ['MIRA', 'They took my husband with the others. Chained them and drove them north.'],
        ['MIRA', 'Toward the castle. We will hide by the north gate.'],
      ],
    },
    { id: 'roofs', at: 2880, calm: true, lines: [['VEXA', '(from across the village) The square is clear! Go over the roofs, the lanes are burning!']] },
    { id: 'tamCry', at: 3300, lines: [['TAM', 'Up here! The ladder burned!']] },
    { id: 'tam', on: 'rescued:tam', lines: [['TAM', 'I knew you would come back. I will climb down the back. Go!']] },
    { id: 'barnCry', at: 4900, lines: [['VOICE', 'The barn! We are inside! The door won\'t move!']] },
    { id: 'barn', on: 'rescued:barn', lines: [['MILLER', 'Air... Thank the old gods. We will run for the north gate.']] },
    { id: 'cinder', on: 'boss:mill', lines: [['CINDER', 'Turn back, or burn with them. The rear holds.']] },
    { id: 'stablesCry', at: 5860, lines: [['VOICE', 'The stables! The horses are burning alive in there!']] },
    { id: 'horses', on: 'rescued:horses', lines: [['RURIK', 'Let them run! Stay out of their way and let them clear the yard!']] },
    { id: 'shrine', at: 7190, calm: true, lines: [['ORYN', '(from across the village) The captain is at the longhall. Kneel at the shrine first. Then end him.']] },
    {
      id: 'captain', on: 'boss:hall',
      lines: [
        ['VAREK', 'The Oath Keepers? The King said you rotted at the ford.'],
        ['VAREK', 'No matter. You can burn with your village.'],
      ],
    },
    { id: 'collapse', on: 'rage:hall', lines: [['VAREK', 'Bring it down! Bring the whole hall down on them!']] },
    { id: 'gathered', at: 8580, calm: true, if: 'rescued:mira', lines: [['MIRA', 'You came back for us. Every one of us here owes you their life.']] },
    {
      id: 'elder', at: 8720, calm: true,
      lines: [
        ['BRANN', 'They chained the young and the strong... and drove them up the north road.'],
        ['BRANN', 'To the Black Keep. To the king who ordered this.'],
        ['BRANN', 'Bring them home.'],
      ],
    },
    {
      id: 'vow', at: 8900, calm: true, hold: true,
      lines: [
        ['ORYN', 'The north road runs through the Gallows Wood. Their convoy cannot be far ahead.'],
        ['VEXA', 'They burned our home because they thought we were dead.'],
        ['RURIK', 'We stand for our people. We stand for our home.'],
        ['RURIK', 'Whoever brings harm to either will answer to us.'],
      ],
    },
  ],

  // the first castle cutaway, after the level (scenes/CutawayScene.js)
  cutaway: 'learns',
};
