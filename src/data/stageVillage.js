// stageVillage.js — THE CAMPAIGN, LEVEL 1: THE BURNING VILLAGE (docs/campaign/plan.md).
// The Oath Keepers come home from the ford to find their village burning. Graybox: the
// backdrop, the houses, the villagers and the props are drawn in code (view/VillageView.js,
// view/NpcView.js); the painted replacements are listed in docs/cloud-handoff.md.
//
// Same format as data/stageGallows.js (terrain, rests, lanterns, section spawns), plus the
// campaign's: story beats and villagers (stage/Story.js), section.fightAt, Ashen arrow volleys
// (hazard 'bombard' `look: 'arrows'`) from archer posts you can wreck (prop 'archers'),
// wreckage props that pin people in, and the exit (stage/Stage.js).
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
//                          cellars; arrows start falling from the archers by the mill
//                          ahead; two men waiting on the second roof; optional: a boy on a
//                          high ridge, three jumps up
//   IV  THE MILL YARD      a brawl round the mill floor; wreck the archers' posts either
//                          side of the mill (the arrows stop); the barn pinned shut by a burning beam
//                          (break it); then the rear guard, Brother Cinder, walks in
//   V   THE STABLES        a fight round the burning stables; smash the gate bar and the
//                          horses stampede across the yard, trampling both sides
//   VI  THE LONGHALL       a shrine; Varek the Ash Captain; at half health his archers loose
//                          on the hall from their post at the far end: wreck it
//   VII THE NORTH GATE     the saved gather; the elder gives Rurik Oathkeeper, his father's
//                          sword, and its fire wakes; stragglers to burn; the vow; out

const FULL = { z0: 282, z1: 520 };
// the stables' double gate (view/VillageView.js draws it open once the horses are freed):
// where the stampede comes out, on its threshold at the back of the yard
const STABLE_DOOR = { x: 6370, z: 216 };

export const STAGE_VILLAGE = {
  id: 'village',
  name: 'THE BURNING VILLAGE',
  chapter: 'I',
  next: { id: 'gallowsWood', name: 'GALLOWS WOOD' },
  doneTitle: 'THE PURSUIT BEGINS', // (the tally's title)
  width: 9400,
  theme: 'village',
  tall: true,
  fireBed: 1, // the whole village is burning: its crackle plays low throughout (core/FireAmbience.js)
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
      hint: 'Arrows land where the red rings show; charred boards give way',
      // two of them waiting up on the second roof: a fight on a ledge over the fire
      fightAt: 3420,
      waves: [['stalker', 'grunt']],
      spawns: [[{ x: 3640, z: 380, inPlace: true }, { x: 3600, z: 460, inPlace: true }]],
      props: [{ kind: 'barrel', x: 4240, z: 470, drop: 'meat' }],
      hazards: [
        // the Ashen archers by the mill ahead: their volleys fall on you from here
        // to the mill yard, until you get up there and wreck their posts (`silence`)
        { type: 'bombard', look: 'arrows', silence: 'millArchers', upto: 'mill', period: 170, warn: 60, shots: 2, damage: 10, radius: 56, depth: 40 },
      ],
    },
    {
      id: 'mill', name: 'THE MILL YARD', x0: 4300, x1: 5700,
      spawn: { x: 4360, z: 440 },
      objective: 'Break their rear guard',
      hint: 'Wreck the archer posts by the mill. Smash the beam off the barn door',
      fightAt: 4520,
      waves: [['grunt', 'grunt', 'ghoul', 'grunt'], ['stalker', 'grunt', 'butcher']],
      props: [
        // the barn door, pinned shut by a fallen burning beam: people inside
        { kind: 'wreckage', tag: 'barn', x: 5330, z: 300, drop: null },
        { kind: 'crate', x: 5560, z: 470, drop: 'meat' },
        // the archers shooting at you since the roofs: two posts either side of the mill
        { kind: 'archers', tag: 'millArchers', x: 4560, z: 300, drop: null },
        { kind: 'archers', tag: 'millArchers', x: 5150, z: 300, drop: 'mana' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 4620, z: 490, w: 100, d: 50, phase: 60 },
      ],
      // the rear guard: the Iron Penitent's kind, grown into a sub-boss. He walks in from
      // the north road without freezing anyone
      boss: { type: 'penitent', name: 'Brother Cinder, the Rear Guard', health: 2.4, damage: 1, size: 1.3, adds: ['grunt', 'grunt'],
        entrance: { from: 140, to: 330, speed: 70, stepEvery: 30, awe: 0, freeze: false },
        // beaten: his crimes and his sentence (stage/Sentence.js)
        sentence: {
          speaker: 'CINDER',
          crimes: [
            'You held the road while the village burned behind you.',
            'You drove the families who ran back into the flames.',
          ],
          last: 'The fire was a mercy. Your king will show you none.',
        } },
    },
    {
      // the stables burning at the back of the yard, the horses screaming inside: smash the
      // bar off the gate and they bolt out of it, down the yard and along three lanes in
      // turn, trampling whoever stands in their way (Ashen men or Oath Keepers). The fight
      // goes on through it.
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
        // the stampede (stage/Stage.js updateStampede): every horse comes out of the stable
        // door (its threshold, under the painted gate), slants down the yard and turns along
        // its lane, the lanes in turn and the herd turning a different way each time: the
        // path lights up first, then they come. A beat after the bar breaks for the gate to
        // swing open (phase), so whoever smashed it has the whole warning to get clear.
        { type: 'stampede', when: 'freed:horses', door: STABLE_DOOR, x0: 5760, x1: 7140, z: 330, dir: 1, d: 64, period: 330, count: 3, runs: 2, phase: 40 },
        { type: 'stampede', when: 'freed:horses', door: STABLE_DOOR, x0: 5760, x1: 7140, z: 430, dir: -1, d: 64, period: 330, count: 4, runs: 2, phase: 150 },
        { type: 'stampede', when: 'freed:horses', door: STABLE_DOOR, x0: 5760, x1: 7140, z: 500, dir: 1, d: 64, period: 330, count: 3, runs: 2, phase: 260 },
      ],
    },
    {
      id: 'hall', name: 'THE LONGHALL', x0: 7100, x1: 8400,
      spawn: { x: 7160, z: 440 },
      objective: 'Kill the Ash Captain',
      hint: 'When he rages his archers loose: wreck their post',
      fightAt: 7400,
      waves: [],
      props: [
        { kind: 'barrel', x: 8280, z: 480, drop: 'meat' },
        // his archers' post at the far end of the hall
        { kind: 'archers', tag: 'hallArchers', x: 8250, z: 300, drop: null },
      ],
      hazards: [
        // once he rages his archers loose on the hall: on him and his men as well, until
        // their post is wrecked
        { type: 'bombard', look: 'arrows', when: 'rage', silence: 'hallArchers', period: 150, warn: 60, shots: 2, damage: 12, radius: 56, depth: 40 },
      ],
      rest: { x: 7230, z: 330, kind: 'oath' },
      // the man who directed the attack: Pitlord Kragg's kind (mace and spiked shield), a captain
      boss: { type: 'gladiator', name: 'Varek, the Ash Captain', health: 3.4, damage: 1.15,
        adds: ['grunt', 'stalker', 'grunt', 'berserker'],
        entrance: { from: 140, to: 320, speed: 58, stepEvery: 34, awe: 30 },
        sentence: {
          speaker: 'VAREK',
          crimes: [
            'You led the Ashen to our gates at dusk.',
            'You put our homes to the torch, and you laughed while they burned.',
            'You chained our people and drove them north to the Keep.',
          ],
          last: 'Swing, then. My king will hang every one of you from his walls.',
        } },
    },
    {
      id: 'gate', name: 'THE NORTH GATE', x0: 8400, x1: 9400,
      spawn: { x: 8460, z: 440 },
      objective: 'The road north',
      hint: '',
      // the stragglers, once Oathkeeper is his: the first men his fire burns
      fightAfter: 'elder',
      waves: [['grunt', 'grunt', 'grunt'], ['stalker', 'grunt']],
      props: [],
      hazards: [],
    },
  ],

  // walk out of the north gate once the vow is made: the pursuit begins
  exit: { x: 9280, after: 'vow' },

  terrain: [
    // ---- I THE ASHEN ROAD: a cart to hop (or walk round), a heap of burnt timbers at
    // the back of the road (look: painted, view/TerrainView.js drawPaintedBlock). (It was a
    // line right across the road: the same timbers stamped eight times read as fake.)
    { kind: 'block', x0: 470, x1: 560, z0: 390, z1: 470, top: 40, look: 'cart' },
    { kind: 'block', x0: 780, x1: 830, z0: 290, z1: 380, top: 42, look: 'wreckage' },

    // ---- III THE BURNING ROOFS
    { kind: 'block', x0: 2900, x1: 2990, z0: 330, z1: 520, top: 45, look: 'cart' }, // a cart against the house: a hop
    { kind: 'block', x0: 2990, x1: 3330, ...FULL, top: 120 },           // +75: a held jump onto the first roof
    { kind: 'pit', x0: 3330, x1: 3480, ...FULL },                      // the burning cellar under the beam
    { kind: 'block', x0: 3330, x1: 3480, z0: 385, z1: 440, top: 120 },  // the fallen roof beam: walk it
    { kind: 'block', x0: 3480, x1: 3680, ...FULL, top: 140 },           // the second roof: a hop up
    // OPTIONAL: the boy, up at the back of the second roof: three jumps of +45, side by side
    // (a chimney stack, a dormer, the ridge he clings to). Each stands on the roof, so its
    // front is only as tall as the step (view/TerrainView.js supportTop); each is shallow
    // (34 deep, against the back of the lane: hold up and you're lined up), so it shows as a
    // ledge with a lit top, not a tall pale wall
    { kind: 'block', x0: 3500, x1: 3548, z0: 282, z1: 316, top: 185, look: 'chimney' },
    { kind: 'block', x0: 3564, x1: 3612, z0: 282, z1: 316, top: 230 },
    { kind: 'block', x0: 3628, x1: 3680, z0: 282, z1: 316, top: 275 },
    { kind: 'pit', x0: 3680, x1: 3980, ...FULL },                      // the cellars, burning
    { kind: 'crumble', x0: 3740, x1: 3810, z0: 350, z1: 470, top: 150, fall: 40, back: 200 }, // gap 60
    { kind: 'crumble', x0: 3870, x1: 3940, z0: 350, z1: 470, top: 150, fall: 40, back: 200 }, // gap 60
    { kind: 'block', x0: 3980, x1: 4180, ...FULL, top: 120 },           // gap 40, down
    { kind: 'block', x0: 4180, x1: 4260, ...FULL, top: 60 },            // and down to the yard

    // ---- IV THE MILL YARD: the mill's raised floor at the back
    { kind: 'block', x0: 4720, x1: 5010, z0: 282, z1: 360, top: 70 },
  ],

  // smoke dimming the backdrop behind the roofs, so the roofs you jump on stand out from the
  // houses behind them (view/TerrainView.js drawVeils)
  veils: [{ x0: 2800, x1: 4380, alpha: 0.45 }],

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
    { id: 'hale', name: 'Hale the smith', x: 960, z: 296, talk: 'hale' }, // (on his feet, so he's seen: Nick, 2026-10-16)
    {
      id: 'mira', name: 'Mira and her son', x: 2300, z: 300, pose: 'family', rescue: 'defend', section: 'square', wave: 1,
      flee: { x: 1500, z: 300 }, gather: { x: 8740, z: 300 },
    },
    {
      id: 'tam', name: 'Tam', x: 3656, z: 298, pose: 'child', rescue: 'reach', flee: null, gather: { x: 8800, z: 312 },
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
        ['ORYN', 'Then they were wrong.'],
        // (the pledge every boss's sentence pays off: stage/Sentence.js)
        ['RURIK', 'Every captain who led them here. Every one of them, up to the king who gave the order.'],
        ['RURIK', 'Swear it with me. Each of them kneels, hears his crimes, and pays for them.'],
        ['VEXA', 'On my blades.'],
        ['ORYN', 'On my staff. Now split up. Find whoever still lives.'],
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
    { id: 'arrows', at: 2960, lines: [['RURIK', 'Archers! Up by the mill. Keep moving, we will deal with them there.']] },
    { id: 'tamCry', at: 3300, lines: [['TAM', 'Up here! The ladder burned!']] },
    { id: 'tam', on: 'rescued:tam', lines: [['TAM', 'I knew you would come back. I will climb down the back. Go!']] },
    { id: 'millSilenced', on: 'broken:millArchers', lines: [['RURIK', 'That is their archers done.']] },
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
    { id: 'hallArchers', on: 'rage:hall', lines: [['VAREK', 'Archers! Fill the hall! I do not care who you hit!']] },
    { id: 'hallSilenced', on: 'broken:hallArchers', lines: [['RURIK', 'No more arrows. Now it is you and me.']] },
    { id: 'gathered', at: 8580, calm: true, if: 'rescued:mira', lines: [['MIRA', 'You came back for us. Every one of us here owes you their life.']] },
    // HIS BIRTHRIGHT: the elder gives Rurik his dead father's sword, Oathkeeper, and its fire
    // wakes in his hand (the cue sets the campaign flag: his look and his fire change on the
    // spot, scenes/ArenaScene.js oathkeeperGiven; data/characters.js birthright). Then the
    // Ashen stragglers come back for the elder, and he burns them (the gate's fightAfter).
    {
      id: 'elder', at: 8720, calm: true, hold: true,
      lines: [
        ['BRANN', 'They chained the young and the strong... and drove them up the north road.'],
        ['BRANN', 'To the Black Keep. To the king who ordered this.'],
        ['RURIK', 'Brann. Where is my father?'],
        ['BRANN', 'Hakon held this gate alone, so the children could get out behind him. He did not fall until the last of them was through.'],
        ['BRANN', 'He was still breathing when I reached him. He put this in my hands and said: give it to my son.'],
        ['BRANN', 'Oathkeeper. The blade of your blood, Rurik. Your father\'s, and his mother\'s, and back and back, further than any song remembers.'],
        ['BRANN', 'It was forged in the first fire this valley ever lit. In any other hand it is only steel. In the hand of your blood, it burns.'],
        ['RURIK', '...It is warm. As if he only just let go of it.', { flag: 'oathkeeper' }],
        ['BRANN', 'Do you feel them? Every one who carried it before you. They stand with you now.'],
        ['RURIK', 'Then they will stand with me all the way to the Black Keep.'],
        ['VEXA', 'Ashen! Their stragglers, coming back for the old man!'],
        ['RURIK', 'Get behind me, Brann. Let them see what my father left me.'],
      ],
    },
    {
      id: 'vow', at: 8900, calm: true, hold: true,
      lines: [
        ['ORYN', 'The north road runs through the Gallows Wood. Their convoy cannot be far ahead.'],
        ['VEXA', 'They burned our home because they thought we were dead.'],
        ['RURIK', 'We stand for our people. We stand for our home.'],
        ['RURIK', 'Whoever brings harm to either will answer to us.'],
        ['VEXA', 'Their captain knelt. The rest of them will kneel too.'],
      ],
    },
  ],

  // the first castle cutaway, after the level (scenes/CutawayScene.js)
  cutaway: 'learns',
};
