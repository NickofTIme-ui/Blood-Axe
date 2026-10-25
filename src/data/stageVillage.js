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
//                          side of the mill (the arrows stop); the barn nailed shut: smash the
//                          barricades, a tally of who's out; then the rear guard, Brother Cinder, walks in
//   V   THE STABLES        a fight round the burning stables; smash the gate bar and the
//                          horses stampede across the yard, trampling both sides
//   VI  THE LONGHALL       a shrine; Varek the Ash Captain; at half health his archers loose
//                          on the hall from their post at the far end: wreck it
//   VII THE NORTH GATE     the saved gather; the elder gives Rurik Oathkeeper, his father's
//                          sword, and its fire wakes; stragglers to burn; the vow; out

// The lane runs back to the foot of the painted house fronts (`laneTop`): at the usual 282
// a band of street showed behind it that nobody could walk on (Nick, 2026-10-17: invisible walls)
const LANE_TOP = 248;
const FULL = { z0: LANE_TOP, z1: 520 };
const BACK = (d) => ({ z0: LANE_TOP, z1: LANE_TOP + d }); // (against the back of the lane, d deep)
// the stables' double gate (view/VillageView.js draws it open once the horses are freed):
// where the stampede comes out, on its threshold at the back of the yard
const STABLE_DOOR = { x: 6370, z: 216 };
// The oath shrines stand at the back of the lane, out of the walk-path, each on a solid
// footprint nobody walks through or jumps onto (Nick, 2026-10-23: you could walk through
// them and stand on top). Kneel in front of one: a hero stopped against its footprint is
// still well inside its reach (stage/Stage.js REST).
const SHRINE_SQUARE = { x: 2640, z: LANE_TOP + 12, kind: 'oath', solid: true };
const SHRINE_HALL = { x: 7230, z: LANE_TOP + 12, kind: 'oath', solid: true };
// The market square's well and everything painted with it (the burning stall on its left,
// the crates and barrels on its right) stand on one solid footprint, from the back of the
// lane to just short of the painting's foot (a man stopped against it still stands in front
// of it, and so does the family held there): you could walk straight through it (Nick, 2026-10-23).
// The painting is 320 wide centred on x (its opaque part spans x - 155 .. x + 157) and stands on z.
const WELL = { x: 2250, z: 292 };
const wellFootprint = (w) => ({ kind: 'block', x0: w.x - 154, x1: w.x + 154, z0: LANE_TOP, z1: w.z - 2, top: 400, hideArt: true });
const shrineFootprint = (r) => ({ kind: 'block', x0: r.x - 52, x1: r.x + 52, z0: LANE_TOP, z1: r.z + 6, top: 400, hideArt: true });
// the barn's two sheds, either side of its doors (x 5500): each nailed shut, people inside
const BARN_WEST = 5450; // (the three groups crowd the one barred door: all freed by tag 'barn')
const BARN_EAST = 5550;

export const STAGE_VILLAGE = {
  millRescue:{type:'executioner'},
  id: 'village',
  name: 'THE BURNING VILLAGE',
  chapter: 'I',
  next: { id: 'gallowsWood', name: 'GALLOWS WOOD' },
  doneTitle: 'THE PURSUIT BEGINS', // (the tally's title)
  width: 9400,
  theme: 'village',
  tall: true,
  laneTop: LANE_TOP,
  fireBed: 1, // the whole village is burning: its crackle plays low throughout (core/FireAmbience.js)
  openingFormation: true,
  // the castle on the horizon: where it stands on the far backdrop and how big (it grows
  // level by level, docs/campaign/plan.md)
  castle: { x: 830, scale: 0.42, detail: 0.3 },
  well: WELL, // the market square's well (drawn by view/VillageView.js; solid: terrain below)
  church: { x:8775, z:302, width:700, height:420, door:{x:8880,z:279} },
  gateTalk: {
    elsbeth:{who:'ELSBETH',before:'Irvolino is gone. Your father got us into the church. Let me help him now.',after:'Hale and I will carry him. He won’t be left alone.'},
    hale:{who:'HALE',before:"He held the church door while we brought the children in. He's been asking for you.",after:"We'll lay him by the altar. No one will leave him alone."},
    mira:{who:'MIRA',before:"He wouldn't come inside until the last child was safe.",after:"I'll light a candle for him. My son will know his name."},
    tam:{who:'TAM',before:"He told me to stay behind the altar. Is he going to be all right?",after:"I'll stay with the others. You don't have to worry about us."},
    barn:{who:'MILLER',before:"Go on, Rurik. Your father needs you more than we do.",after:"He was a good man, Rurik. We all knew it."},
  },

  sections: [
    {
      id: 'road', name: 'THE ASHEN ROAD', x0: 0, x1: 1400,
      spawn: { x: 150, z: 440 },
      objective: 'Find who still lives',
      hint: 'Break their formation. Then find the survivors',
      fightAt: 1080, // (the looters are at the end of the road: talk to Hale first)
      waves: [['grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'grunt'], ['grunt', 'stalker']],
      props: [
        { kind: 'crate', x: 1250, z: 480, drop: 'health' },
        { kind: 'barrel', x: 600, z: 300, drop: null },
        { kind: 'chest', x: 920, z: 510, drop: 'health' },
        // a secret: tucked behind the heap of burnt timbers at the back of the road
        { kind: 'urn', x: 806, z: 262, drop: 'rune', secret: true },
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
        { kind: 'barrel', x: 1640, z: 305, drop: 'health' },
        { kind: 'crate', x: 2560, z: 500, drop: 'mana' },
        { kind: 'chest', x: 2450, z: 300, drop: 'mana' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 1900, z: 470, w: 110, d: 60, phase: 0 },
        { type: 'fire', look: 'cart', x: 2520, z: 380, w: 110, d: 60, phase: 105 },
      ],
      // (at the back of the lane, out of the walk-path, and solid: data/stageVillage.js terrain)
      rest: SHRINE_SQUARE,
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
      props: [
        { kind: 'barrel', x: 4240, z: 470, drop: 'health' },
        // a secret: up on the chimney, the first step to the boy (Rurik's father's ring)
        { kind: 'urn', x: 3524, z: LANE_TOP + 16, drop: 'ring', secret: true },
      ],
      hazards: [
        // the Ashen archers by the mill ahead: their volleys fall on you from here
        // to the mill yard, until you get up there and wreck their posts (`silence`)
        { type: 'bombard', look: 'arrows', silence: 'millArchers', upto: 'mill', period: 170, warn: 60, shots: 2, damage: 10, radius: 56, depth: 40 },
      ],
    },
    {
      id: 'mill', name: 'THE MILL YARD', x0: 4300, x1: 5700,
      spawn: { x: 4360, z: 440 },
      objective: 'Stop the execution. Break the rear guard',
      hint: 'Kill the hangman! Strike Irvolino’s bonds before the trapdoor falls',
      // who's still shut in the barn: counted on screen till they're all out (scenes/HUDScene.js)
      tally: { label: 'VILLAGERS SAVED', npcs: ['mill-villagers', 'barn-west', 'barn-east'] },
      fightAt: 4520,
      waves: [['grunt', 'grunt', 'ghoul', 'grunt'], ['stalker', 'grunt', 'butcher']],
      props: [
        // the barn, nailed shut with the miller's people inside: one barricade across its doors,
        // and smashing it lets all nine out (Nick, 2026-10-23: one spot, not three; the tally below)
        // (it stands on the ground across the doors, not `lift`ed onto the painted doorway,
        // where it floated: Nick, 2026-10-24; and it's solid till smashed, the block
        // 'barnBoards' below, so nobody walks through it)
        { kind: 'barricade', tag: 'barn', x: 5500, z: 264, y: 0, opens: 'barnBoards', drop: null },
        { kind: 'crate', x: 5560, z: 470, drop: 'health' },
        // the archers shooting at you since the roofs: two posts either side of the mill (the
        // right one stands clear of the gallows, the barn past it: Nick, 2026-10-23)
        { kind: 'archers', tag: 'millArchers', x: 4560, z: 300, drop: null },
        { kind: 'archers', tag: 'millArchers', x: 5280, z: 300, drop: 'mana' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 4620, z: 490, w: 100, d: 50, phase: 60 },
      ],
      // Cinder is a named regular enemy: ordinary death, no boss event or sentence.
      regular: { type: 'penitent', name: 'Brother Cinder', health: 1.6, size: 1.3,
        escort: ['grunt', 'grunt'], beat: 'cinder' },
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
        { kind: 'wreckage', tag: 'stables', x: 6380, z: 300, size: 1.7, drop: null }, // (sized up to the stable gate: Nick, 2026-10-17)
        { kind: 'barrel', x: 5820, z: 500, drop: 'health' },
        { kind: 'crate', x: 7000, z: 470, drop: 'health' },
      ],
      hazards: [
        { type: 'fire', look: 'cart', x: 6720, z: 330, w: 100, d: 50, phase: 30 },
        // the stampede (stage/Stage.js updateStampede): every horse comes out of the stable
        // door (its threshold, under the painted gate), slants down the yard and turns along
        // its lane, the lanes in turn and the herd turning a different way each time: the
        // path lights up first, then they come. A beat after the bar breaks for the gate to
        // swing open (phase), so whoever smashed it has the whole warning to get clear.
        // Each run sends a handful of Ashen men down its lane from the far side, straight
        // into the herd: they get smashed in heaps (Nick, 2026-10-23: more runs, more men).
        { type: 'stampede', when: 'freed:horses', door: STABLE_DOOR, x0: 5760, x1: 7140, z: 330, dir: 1, d: 64, period: 330, count: 5, runs: 5, phase: 40, fodder: ['thrall', 'grunt', 'thrall'] },
        { type: 'stampede', when: 'freed:horses', door: STABLE_DOOR, x0: 5760, x1: 7140, z: 430, dir: -1, d: 64, period: 330, count: 6, runs: 5, phase: 150, fodder: ['grunt', 'thrall', 'thrall', 'grunt'] },
        { type: 'stampede', when: 'freed:horses', door: STABLE_DOOR, x0: 5760, x1: 7140, z: 500, dir: 1, d: 64, period: 330, count: 5, runs: 5, phase: 260, fodder: ['thrall', 'grunt', 'thrall'] },
      ],
    },
    {
      id: 'hall', name: 'THE LONGHALL', x0: 7100, x1: 8400,
      spawn: { x: 7160, z: 440 },
      objective: 'Kill the Ash Captain',
      hint: 'His archers are firing: wreck their post',
      fightAt: 7400,
      waves: [],
      props: [
        { kind: 'barrel', x: 8280, z: 480, drop: 'health' },
        // his archers' post at the far end of the hall
        { kind: 'archers', tag: 'hallArchers', x: 8250, z: 300, drop: null },
      ],
      hazards: [
        // His archers join the fight immediately; wrecking their post stops them.
        { type: 'bombard', look: 'arrows', when: 'boss', silence: 'hallArchers', period: 150, warn: 60, shots: 2, damage: 12, radius: 56, depth: 40 },
      ],
      rest: SHRINE_HALL,
      // the man who directed the attack: Pitlord Kragg's kind (mace and spiked shield), a captain
      boss: { type: 'gladiator', name: 'Varek, the Ash Captain', health: 3.4, damage: 1.15, size: 1.75,
        escort: ['grunt', 'stalker', 'grunt', 'berserker'],
        adds: [], // these are his last men; no fresh army at half health
        phases: [{id:'desperate',at:0.5,damage:1.12,ai:{attackCooldown:[24,42]},rage:true}],
        entrance: { from: 140, to: 320, speed: 58, stepEvery: 34, awe: 30 },
        sentence: {
          speaker: 'VAREK',
          crimes: [
            'You led the Ashen to our gates at dusk.',
            'You put our homes to the torch, and you laughed while they burned.',
            'You chained our people and drove them north to the Keep.',
          ],
          last: 'Swing, then. The King will hang you all from his walls.',
        } },
    },
    {
      id: 'gate', name: 'THE NORTH GATE', x0: 8400, x1: 9400,
      spawn: { x: 8460, z: 440 },
      objective: 'The road north',
      hint: '',
      // Finish the protected farewell before opening the road north.
      fightAfter: 'elder',
      waves: [], // the farewell and sword reveal are safe; no epilogue ambush
      props: [],
      hazards: [],
    },
  ],

  // walk out of the north gate once the vow is made: the pursuit begins
  exit: { x: 9280, after: 'churchFarewell' },

  terrain: [
    // ---- I THE ASHEN ROAD: a cart to hop (or walk round), a heap of burnt timbers at
    // the back of the road (look: painted, view/TerrainView.js drawPaintedBlock). (It was a
    // line right across the road: the same timbers stamped eight times read as fake.)
    // All three keep to the edges of the street, the middle of the road left open: in the
    // middle they were in the way of the first fight (Nick, 2026-10-23). The cart is at the
    // back of the road, the two heaps one at the back and one at the front edge.
    { kind: 'block', x0: 390, x1: 480, z0: LANE_TOP, z1: 318, top: 40, look: 'cart' }, // (clear of the pikes)
    { kind: 'block', x0: 780, x1: 830, z0: 276, z1: 292, top: 42, look: 'wreckage' }, // (the secret urn still behind it)
    { kind: 'block', x0: 816, x1: 846, z0: 478, z1: 494, top: 42, look: 'wreckage', artFlip: true },

    // ---- II THE MARKET SQUARE and VI THE LONGHALL: the well's and the shrines' footprints (drawn by view/TerrainView.js drawRests)
    wellFootprint(WELL),
    shrineFootprint(SHRINE_SQUARE),
    shrineFootprint(SHRINE_HALL),

    // ---- III THE BURNING ROOFS
    // Behind the cart, up against the end wall of the first house, a heap of burnt timbers
    // too high to climb: the way up is the cart. (Walking up the back of the lane to the
    // house you stood at its foot drawn over its roof, as if walking up the wall; Nick, 2026-10-23.)
    // The duplicated burning timbers and carts at this street crossing were removed; keep
    // the roof route clear and let the painted house frontage read cleanly.
    { kind: 'block', x0: 2990, x1: 3330, ...FULL, top: 120 },           // +75: a held jump onto the first roof
    { kind: 'pit', x0: 3330, x1: 3480, ...FULL },                      // the burning cellar under the beam
    { kind: 'block', x0: 3330, x1: 3480, z0: 385, z1: 440, top: 120 },  // the fallen roof beam: walk it
    { kind: 'block', x0: 3480, x1: 3680, ...FULL, top: 120 },           // the second roof: level with the beam
    // (it was a +20 hop up: a step nobody could read, so walking off the beam you bumped
    // into it; flat across now, Nick 2026-10-24)
    // OPTIONAL: the boy, up at the back of the second roof: three jumps of +45, side by side
    // (a chimney stack, a dormer, the ridge he clings to). Each stands on the roof, so its
    // front is only as tall as the step (view/TerrainView.js supportTop); each is shallow
    // (34 deep, against the back of the lane: hold up and you're lined up), so it shows as a
    // ledge with a lit top, not a tall pale wall
    // (all three painted chimney stacks now, rising like stairs, so it's plain what to climb:
    // the third was a timbered roof block that read as a house wall; Nick, 2026-10-24)
    { kind: 'block', x0: 3500, x1: 3548, ...BACK(34), top: 165, look: 'chimney', art: 1 },
    { kind: 'block', x0: 3564, x1: 3612, ...BACK(34), top: 210, look: 'chimney', art: 2 },
    { kind: 'block', x0: 3628, x1: 3680, ...BACK(34), top: 255, look: 'chimney', art: 3 },
    { kind: 'pit', x0: 3680, x1: 3980, ...FULL },                      // the cellars, burning
    { kind: 'crumble', x0: 3740, x1: 3810, z0: 350, z1: 470, top: 130, fall: 40, back: 200 }, // gap 60
    { kind: 'crumble', x0: 3870, x1: 3940, z0: 350, z1: 470, top: 130, fall: 40, back: 200 }, // gap 60
    { kind: 'block', x0: 3980, x1: 4180, ...FULL, top: 120 },           // gap 40, down
    { kind: 'block', x0: 4180, x1: 4260, ...FULL, top: 60 },            // and down to the yard

    // ---- IV THE MILL YARD: the mill's raised floor at the back
    { kind: 'block', x0: 4700, x1: 5090, ...BACK(110), top: 70, look: 'mill' },
    // the barn's barricade (props, above): solid across the doors till it's smashed (Stage.openWay)
    { kind: 'block', tag: 'barnBoards', x0: 5452, x1: 5548, z0: LANE_TOP, z1: 274, top: 400, hideArt: true },
  ],

  // smoke dimming the backdrop behind the roofs, so the roofs you jump on stand out from the
  // houses behind them (view/TerrainView.js drawVeils)
  veils: [{ x0: 2800, x1: 4380, alpha: 0.45 }],

  // torches marking the way (lanterns: view/TerrainView.js)
  // (none on the roofs' edges: one stood where the cart climb meets the first roof and one
  // in front of the boy's chimney steps; Nick, 2026-10-23. They flank the roofs from the
  // street now: one at the foot of the climb, one in the yard below the last roof)
  lanterns: [
    { x: 2800, z: 290 }, { x: 4080, z: 290 }, { x: 4310, z: 290 }, { x: 4720, z: 290 }, { x: 8400, z: 290 },
  ],

  // the dead (view only): some were beyond saving before the Oath Keepers came home
  bodies: [
    { x: 380, z: 470, pose: 0 }, { x: 990, z: 500, pose: 1 }, { x: 1520, z: 330, pose: 2 },
    { x: 2050, z: 490, pose: 0 }, { x: 4450, z: 320, pose: 1 }, { x: 7600, z: 500, pose: 2 }, { x: 8600, z: 470, pose: 0 },
  ],

  // heads on pikes (view only: view/VillageView.js drawPikes): the raiders' warning at the
  // road in, the square, the way to the stables and the gate out. n: how many in the cluster
  // (none in front of a painted building: the mill yard's stood in the mill's doorway; Nick,
  // 2026-10-24. It stands on the bare street between the barn and the stables now)
  pikes: [{ x: 560, z: 292, n: 3 }, { x: 1480, z: 290, n: 2 }, { x: 6030, z: 292, n: 3 }, { x: 8560, z: 294, n: 4 }],

  // street clutter along the back of the lane (view only: view/VillageView.js drawDecor),
  // painted pieces `decor_<kind>`; one not painted yet is skipped. w: drawn width
  decor: [
    { kind: 'debris', x: 300, z: 286, w: 150 },
    { kind: 'signpost', x: 1330, z: 284, w: 70 },
    { kind: 'lantern', x: 1760, z: 283, w: 60 },
    { kind: 'debris2', x: 2120, z: 287, w: 150 },
    { kind: 'lantern', x: 2560, z: 283, w: 60 },
    { kind: 'signpost', x: 4380, z: 284, w: 70 },
    { kind: 'debris', x: 5620, z: 287, w: 140, flip: true },
    { kind: 'lantern', x: 5900, z: 283, w: 60 },
    { kind: 'debris2', x: 6850, z: 287, w: 150, flip: true },
    { kind: 'lantern', x: 7150, z: 283, w: 60 },
    { kind: 'debris', x: 8350, z: 287, w: 140 },
    { kind: 'signpost', x: 8900, z: 284, w: 70, flip: true },
  ],

  // the villagers (stage/Story.js; drawn by view/NpcView.js)
  npcs: [
    { id: 'hale', name: 'Hale the smith', x: 960, z: 296, talk: 'hale' }, // (on his feet, so he's seen: Nick, 2026-10-16)
    {
      id: 'mira', name: 'Mira and her son', x: 2300, z: 300, pose: 'family', rescue: 'defend', section: 'square', wave: 1,
      flee: { x: 1500, z: 300 }, gather: { x: 8740, z: 300 },
    },
    {
      id: 'tam', name: 'Tam', x: 3656, z: LANE_TOP + 16, pose: 'child', rescue: 'reach', flee: null, gather: { x: 8800, z: 312 },
      freeFor: 120, // (time to see him relieved, then climb down the back: view/NpcView.js drawStranded)
    },
    {
      id: 'barn', name: 'Irvolino', x: 4860, z: 296, pose: 'irvolino', art:'irvolino', rescue: 'execution', section:'mill',
      freeFor: 360, sprint: 72,
      flee: { x: 4400, z: 510 }, gather: { x: 8660, z: 330 },
    },
    {id:'elsbeth',name:'Elsbeth',x:5330,z:296,pose:'elsbeth',art:'elsbeth',gather:{x:8660,z:330}},
    // (crowd: each of the nine has his own painted look, no two the same: Nick, 2026-10-23)
    {id:'mill-villagers',crowd:['villager','prisoner-hilde','elder'],name:'The mill villagers',x:5500,z:296,pose:'group',people:3,rescue:'wreckage',tag:'barn',savedAs:'All nine villagers',flee:{x:5620,z:510}},
    {id:'barn-west',crowd:['prisoner-a','prisoner-tobin','prisoner-bram'],name:'The barn families',x:BARN_WEST,z:300,pose:'group',people:3,rescue:'wreckage',tag:'barn',savedAs:'All nine villagers',flee:{x:5410,z:500}},
    {id:'barn-east',crowd:['prisoner-c','captive','prisoner-b'],name:'The barn hands',x:BARN_EAST,z:300,pose:'group',people:3,rescue:'wreckage',tag:'barn',savedAs:'All nine villagers',flee:{x:5680,z:480}},
    { id: 'horses', name: 'the horses', x: 6380, z: 294, pose: 'horses', rescue: 'wreckage', tag: 'stables', flee: null },
    { id: 'stable-master', name: 'Stable master', x: 6130, z: 350, stableMaster: true, warningAt: 5860 },
    // on his knees at Varek's feet in the opening (stage/VillageOpening.js): struck down
    { id: 'captive', name: 'Captive villager', x: 790, z: 436, pose: 'captive-kneel', art: 'villager' },
    { id: 'hakon', name: 'Hakon', x: 8880, z: 330, pose: 'wounded', art: 'hakon', talk: null },
  ],

  // who says what (stage/Story.js). The three Oath Keepers speak whoever is played: the
  // other two are with the hero at the start and at the gate (view/NpcView.js).
  story: [
    {
      // THE STANDOFF (Nick, 2026-10-23; stage/VillageOpening.js): they skid to a stop facing
      // the Ashen line; the silent third line is Varek's mace coming down on the villager
      id: 'opening', on: 'start', hold: true, delay: 150, // (after the section's title card)
      lines: [
        ['RURIK', 'Stand down! Your slaughter ends here!'],
        ['VAREK', "Oathkeepers... You're too late to save anyone."],
        ['VAREK', '', { moment: 'openingStrike', minFrames: 84, autoAdvance: true }],
        ['VAREK', 'Cut them down!'],
      ],
    },
    {
      id: 'hale', calm: true, // (fired by talking to him)
      lines: [
        ['HALE', 'Oath Keepers? They said the ford took you.'],
        ['HALE', 'Ashen men, at dusk. Their captain laughed while the roofs burned.'],
        ['HALE', 'Some are still in the square. Go.'],
      ],
    },
    { id: 'cry', at: 1560, lines: [['MIRA', 'Not the boy! He\'s a child!']] },
    {
      id: 'mira', on: 'rescued:mira', calm: true,
      lines: [
        ['MIRA', 'They took my husband. Chained him with the others and drove them north like cattle.'],
        ['MIRA', 'To the castle. We\'ll wait at the north gate.'],
      ],
    },
    { id: 'roofs', at: 2880, calm: true, lines: [['VEXA', '(from across the village) Square\'s clear! Take the roofs, the lanes are burning!']] },
    { id: 'arrows', at: 2960, lines: [['RURIK', 'Archers, by the mill. Keep moving. We\'ll pay them a visit.']] },
    { id: 'tamCry', at: 3300, lines: [['TAM', 'Up here! The ladder burned!']] },
    { id: 'tam', on: 'rescued:tam', lines: [['TAM', 'I told them you\'d come. I can climb down the back. Go!']] },
    { id: 'millSilenced', on: 'broken:millArchers', lines: [['RURIK', 'No more arrows from the mill.']] },
    { id: 'barnCry', at: 4900, lines: [['VOICE', 'The barn! They\'ve barred us in!']] },
    // Irvolino's lines (Nick's QA, 2026-10-24: rewritten again, in ChatGPT)
    { id: 'millLastWords', on: 'millLastWords', lines: [['MILLER', 'Tell your king the miller didn’t beg.']] },
    { id: 'barn', on: 'rescued:barn', npcTalkFor: 'barn', lines: [['MILLER', 'Rurik! I owe you my neck. I’m heading to the church.']] },
    { id: 'cinder', lines: [['CINDER', 'You broke the ranks. You will not break me.']] },
    { id: 'shrine', at: 7190, calm: true, lines: [['ORYN', '(from across the village) Their captain\'s in the longhall. Kneel at the shrine. Then end him.']] },
    {
      id: 'captain', on: 'boss:hall',
      lines: [
        ['VAREK', 'Archers! Fill the hall. I don\'t care who you hit.'],
        ['VAREK', 'Cinder. The rear guard. All of them...'],
        ['VAREK', 'You four. Shields forward. We hold here.'],
        ['VAREK', 'You want my head? Come and earn it.'],
      ],
    },
    {id:'varekDesperate',on:'phase:hall:desperate',lines:[['VAREK','No retreat! I am still standing. Fight!']]},
    { id: 'hallSilenced', on: 'broken:hallArchers', lines: [['RURIK', 'No more arrows. Just you and me.']] },
    { id: 'gathered', at: 8580, calm: true, if: 'rescued:mira', lines: [['MIRA', 'You came back. Every soul at this gate owes you a life.']] },
    // HIS BIRTHRIGHT: Hakon gives his son the sword before dying. Grief, then a promise.
    // The legacy beat id stays for campaign save compatibility.
    {
      id: 'elder', at: 8720, calm: true, hold: true,
      lines: [
        // (Nick's pass, 2026-10-23)
        ['RURIK', "Father, I'm here. The children in the church... they are safe.", {moment:'fatherFound',minFrames:150}],
        ['HAKON', "Good. Take the sword. I can't hold it.", {flag:'oathkeeper',moment:'swordOffered',minFrames:150}],
        ['RURIK', "Then I'll hold it for both of us.", {minFrames:150}],
        ['HAKON', 'It was forged in the first fire. Any other hand, it is only steel.', {minFrames:180}],
        ['HAKON', 'In ours, it burns. Our blood wakes it. Call, and the fire will answer.', {minFrames:180}],
        ['RURIK', "I don't know how.", {minFrames:120}],
        ['HAKON', 'You will. Let it burn for them, never for yourself.', {minFrames:180}],
        ['HAKON', 'Let me look at you.', {minFrames:180}],
        ['RURIK', 'Father?', {moment:'fatherDies',minFrames:240}],
        ['VOICE', '', {moment:'mourning',minFrames:300,autoAdvance:true}],
        ['RURIK', 'I should have been here.', {minFrames:180}],
        ['ORYN', 'We can wait.', {minFrames:150}],
        ['MIRA', 'He put himself between them and my son.', {if:'rescued:mira',minFrames:150}],
        ['MILLER', "Let us carry him, Rurik. You've carried enough tonight.", {if:'rescued:barn',minFrames:180}],
        ['ELSBETH', "He won't be left here. Hale and I will carry him.", {if:'rescued:elsbeth',minFrames:180}],
        ['RURIK', 'Give me a moment.', {minFrames:180}],
        ['VOICE', '', {minFrames:180,autoAdvance:true}],
        ['RURIK', "I'll carry it, Father.", {moment:'swordRaised',minFrames:210}],
        ['VOICE', '', {moment:'fatherRest',minFrames:300,autoAdvance:true}],
      ],
    },
    {
      id: 'vow', at: 8900, after: 'elder', calm: true, hold: true,
      lines: [
        ['HALE', "We'll carry him into the church. We'll look after him.", {minFrames:150}],
        ['RURIK', 'Thank you.', {minFrames:120}],
        ['VEXA', 'We leave when you say.', {minFrames:150}],
      ],
    },
  ],

  // the first castle cutaway, after the level (scenes/CutawayScene.js)
  cutaway: 'learns',
  // no stage-clear fanfare at the end of this level: its farewell stays quiet (Nick, 2026-10-23)
  clearTune: false,
};

