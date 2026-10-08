// stageAscent.js — THE CAMPAIGN, LEVEL 4: THE SHATTERED ASCENT (docs/campaign/plan.md). Out
// of the mountain on its far face, the Oath Keepers take the old road up the cliffs toward
// the Iron Gates, with the Black Keep in full view across the gorge. The King has sent his
// Siege Commander to destroy the route: catapults on the heights shell the road, the stair
// is broken, the bridge half gone. Grey rock, wind, the castle close. Everything here is
// drawn in code (view/AscentView.js); the painted art is requested in
// docs/campaign/art-levels-1-2.md.
//
// Same format as data/stageMine.js. New here: the bombardment (hazard 'bombard': catapult
// stones aimed at the heroes, each one's landing spot shown on the ground first; `silence`:
// it fires one stone fewer for every catapult with that tag smashed, and stops when they are
// all gone), catapults (prop 'catapult'), and a section that holds until every prop with a
// tag is broken (`needs`: the battery). Built for the weakest jumper, walking, no upgrades
// (ups of 85 at most, gaps of 60 at most); a test walks it with every hero.
//
// THE ROUTE
//   I   THE CLIFF ROAD     the old road along the cliff; the others take the high paths; loose
//                          rock (taught alone); a horn above; the first Ashen on the road
//   II  THE BROKEN STAIR   steps cut in the cliff, a ledge that gives way over the drop, men
//                          waiting on the landing; up at the back, a goatherd girl (optional).
//                          A shrine
//   III THE SHELTER        the miners freed in the mountain went up the road ahead and are
//                          pinned under an overhang by Ashen men and the first stones: defend them
//   IV  THE BOMBARDMENT    the crossing: open road under the catapults, the half-gone bridge
//                          over the gorge, men on the far side. Keep moving
//   V   THE BATTERY        up onto the heights: smash the three catapults (each one gone, one
//                          stone fewer); a captive made to haul the stones (Bram)
//   VI  THE SIEGE CAMP     a shrine; SIEGE COMMANDER ORSK. At two thirds he has the Keep fire
//                          on his own camp; at one third he goes berserk
//   VII THE HIGH PASS      horns from the Keep: the Ashen pull back to the Iron Gates; the
//                          saved gather; on

const FULL = { z0: 282, z1: 520 };

export const STAGE_ASCENT = {
  id: 'shatteredAscent',
  name: 'THE SHATTERED ASCENT',
  chapter: 'IV',
  next: { id: 'ironGates', name: 'THE IRON GATES', chapter: 'V' },
  doneTitle: 'THE ASCENT IS TAKEN',
  width: 9800,
  theme: 'ascent',
  tall: true,
  castle: { x: 1250, scale: 0.6, detail: 0.85 }, // close now: it fills the sky across the gorge (x: see view/AscentView.js HORIZON)
  companions: { leaveAfter: 'opening', meet: 9200, farewell: 'gates' },

  sections: [
    {
      id: 'road', name: 'THE CLIFF ROAD', x0: 0, x1: 1400,
      spawn: { x: 150, z: 440 },
      objective: 'Climb the old road',
      hint: 'Loose rock: watch the ground for its shadow',
      fightAt: 1020,
      waves: [['grunt', 'grunt', 'stalker'], ['butcher', 'grunt']],
      props: [
        { kind: 'barrel', x: 420, z: 300, drop: null },
        { kind: 'crate', x: 1300, z: 480, drop: 'meat' },
      ],
      hazards: [
        // loose rock, taught alone on the open road before the first fight
        { type: 'beam', look: 'rock', x: 820, z: 420, w: 80, d: 80, period: 200, warn: 80, phase: 0 },
      ],
    },
    {
      id: 'stair', name: 'THE BROKEN STAIR', x0: 1400, x1: 3000,
      spawn: { x: 1460, z: 440 },
      objective: 'Up the broken stair',
      hint: 'The ledge will not hold you long: keep moving',
      fightAt: 2320,
      // the men waiting on the landing
      spawns: [[{ x: 2340, z: 380, inPlace: true }, { x: 2540, z: 440, inPlace: true }, { x: 2560, z: 370, inPlace: true }], [{ x: 2560, z: 380 }, { x: 2560, z: 470 }]],
      waves: [['grunt', 'stalker', 'grunt'], ['butcher', 'grunt']],
      props: [{ kind: 'crate', x: 2900, z: 480, drop: 'mana' }],
      hazards: [
        { type: 'beam', look: 'rock', x: 1760, z: 440, w: 80, d: 80, period: 230, warn: 80, phase: 90 },
      ],
      rest: { x: 2900, z: 320, kind: 'oath' },
    },
    {
      id: 'shelter', name: 'THE SHELTER', x0: 3000, x1: 4500,
      spawn: { x: 3060, z: 440 },
      objective: 'Defend the miners under the rock',
      hint: 'A stone is coming where its shadow grows',
      fightAt: 3620,
      waves: [['grunt', 'grunt', 'butcher'], ['stalker', 'grunt', 'grunt']],
      props: [{ kind: 'barrel', x: 4400, z: 490, drop: 'wine' }],
      hazards: [
        // the first stones: one at a time, slow (they teach the shadow)
        { type: 'bombard', period: 260, warn: 90, shots: 1, silence: 'battery' },
      ],
    },
    {
      id: 'bombardment', name: 'THE BOMBARDMENT', x0: 4500, x1: 6200,
      spawn: { x: 4560, z: 440 },
      objective: 'Cross under the catapults',
      hint: 'Keep moving. Do not stop on the bridge',
      fightAt: 5720,
      waves: [['grunt', 'stalker', 'grunt'], ['penitent', 'grunt']],
      props: [{ kind: 'crate', x: 6100, z: 480, drop: 'meat' }],
      hazards: [
        { type: 'bombard', period: 190, warn: 75, shots: 2, silence: 'battery' },
        { type: 'beam', look: 'rock', x: 5620, z: 360, w: 80, d: 80, period: 220, warn: 80, phase: 30 },
      ],
    },
    {
      id: 'battery', name: 'THE BATTERY', x0: 6200, x1: 7600,
      spawn: { x: 6260, z: 440 },
      objective: 'Smash the catapults',
      hint: 'Every catapult smashed is one stone fewer',
      fightAt: 6700,
      needs: 'battery', // (the way on stays shut until every catapult is wrecked)
      spawns: [[{ x: 7420, z: 340 }, { x: 7440, z: 460 }], [{ x: 7420, z: 380 }, { x: 7440, z: 470 }], [{ x: 6600, z: 330 }, { x: 7440, z: 420 }]],
      waves: [['grunt', 'grunt', 'stalker'], ['butcher', 'grunt', 'grunt'], ['ghoul', 'stalker']],
      props: [
        // the battery: three catapults on the heights (each smashed, one stone fewer)
        { kind: 'catapult', tag: 'battery', x: 6820, z: 310, drop: null },
        { kind: 'catapult', tag: 'battery', x: 7060, z: 330, drop: 'meat' },
        { kind: 'catapult', tag: 'battery', x: 7320, z: 310, drop: null },
        // Bram, chained to the stone pile and made to haul for them
        { kind: 'shackle', tag: 'bram', x: 7190, z: 300, drop: null },
      ],
      hazards: [
        { type: 'bombard', period: 200, warn: 75, shots: 2, silence: 'battery' },
      ],
    },
    {
      id: 'camp', name: 'THE SIEGE CAMP', x0: 7600, x1: 9000,
      spawn: { x: 7660, z: 440 },
      objective: 'Kill Siege Commander Orsk',
      hint: 'When the Keep fires on the camp, watch the shadows',
      fightAt: 7980,
      waves: [['grunt', 'stalker', 'grunt']],
      props: [
        { kind: 'barrel', x: 8200, z: 300, drop: null },
        { kind: 'crate', x: 8900, z: 480, drop: 'meat' },
      ],
      hazards: [
        // at two thirds he signals the Keep to fire on his own camp (it hits his men too)
        { type: 'bombard', when: 'phase:barrage', period: 170, warn: 70, shots: 2, damage: 18 },
      ],
      rest: { x: 7680, z: 320, kind: 'oath' },
      // the King's Siege Commander: the Berserker's kind, in a commander's plate
      boss: {
        type: 'berserker', name: 'Siege Commander Orsk', health: 3.0, damage: 1.15, escort: ['grunt', 'grunt'],
        entrance: { from: 160, to: 360, speed: 70, stepEvery: 28, awe: 30 },
        phases: [
          { id: 'barrage', at: 0.66, adds: ['grunt', 'stalker'] },
          { id: 'berserk', at: 0.33, rage: true, adds: ['butcher'], damage: 1.25, speed: 1.2, ai: { attackCooldown: [20, 50] } },
        ],
      },
    },
    {
      id: 'pass', name: 'THE HIGH PASS', x0: 9000, x1: 9800,
      spawn: { x: 9060, z: 440 },
      objective: 'On to the Iron Gates',
      hint: '',
      waves: [],
      props: [],
      hazards: [],
    },
  ],

  // down toward the Iron Gates once the last words are said
  exit: { x: 9600, after: 'gates' },

  terrain: [
    // ---- I THE CLIFF ROAD: a fallen boulder on the road to hop (or walk round)
    { kind: 'block', x0: 560, x1: 650, z0: 390, z1: 470, top: 40 },

    // ---- II THE BROKEN STAIR: steps cut in the cliff, a ledge that gives way, the landing
    { kind: 'block', x0: 1650, x1: 1850, ...FULL, top: 70 },              // +70
    { kind: 'block', x0: 1850, x1: 2050, ...FULL, top: 140 },             // +70
    { kind: 'pit', x0: 2050, x1: 2260, ...FULL },                        // the drop
    { kind: 'crumble', x0: 2090, x1: 2150, z0: 350, z1: 480, top: 140, fall: 40, back: 200 }, // gap 40
    { kind: 'crumble', x0: 2195, x1: 2260, z0: 350, z1: 480, top: 140, fall: 40, back: 200 }, // gap 45
    { kind: 'block', x0: 2260, x1: 2600, ...FULL, top: 140 },             // the landing
    { kind: 'block', x0: 2600, x1: 2750, ...FULL, top: 70 },              // down
    // (up at the back of the landing: a goat path where a girl is stranded; optional. Over
    // the landing only, so the step down from it is clear at every depth and the men below
    // can climb back up)
    { kind: 'block', x0: 2380, x1: 2520, z0: 282, z1: 340, top: 220 },

    // ---- IV THE BOMBARDMENT: the half-gone bridge over the gorge
    { kind: 'pit', x0: 5100, x1: 5400, ...FULL },
    { kind: 'crumble', x0: 5140, x1: 5200, z0: 350, z1: 480, top: 0, fall: 30, back: 160 }, // gap 40
    { kind: 'crumble', x0: 5245, x1: 5305, z0: 350, z1: 480, top: 0, fall: 30, back: 160 }, // gap 45
    { kind: 'crumble', x0: 5350, x1: 5400, z0: 350, z1: 480, top: 0, fall: 30, back: 160 }, // gap 45

    // ---- V THE BATTERY: up onto the heights where the catapults stand
    { kind: 'block', x0: 6400, x1: 6560, ...FULL, top: 70 },              // +70
    { kind: 'block', x0: 6560, x1: 7500, ...FULL, top: 140 },             // the heights
    { kind: 'block', x0: 7500, x1: 7600, ...FULL, top: 70 },              // down to the camp
  ],

  // signal braziers along the road
  lanterns: [
    { x: 500, z: 290 }, { x: 1600, z: 290 }, { x: 2900, z: 290 }, { x: 3500, z: 290 }, { x: 4600, z: 290 },
    { x: 5600, z: 290 }, { x: 7700, z: 290 }, { x: 9100, z: 290 },
  ],

  // the dead (view only): miners caught by the stones on the road up
  bodies: [{ x: 1200, z: 480, pose: 1 }, { x: 3300, z: 490, pose: 0 }, { x: 4800, z: 470, pose: 2 }, { x: 5900, z: 340, pose: 1 }],

  npcs: [
    // (optional: a goatherd stranded on the goat path above the landing; reach her)
    { id: 'wren', name: 'Wren', x: 2450, z: 310, pose: 'child', rescue: 'reach', flee: null, gather: { x: 9300, z: 330 } },
    // the miners from the mountain, pinned under the overhang
    {
      id: 'shelter', name: 'the miners under the rock', x: 3960, z: 310, pose: 'group', rescue: 'defend',
      flee: { x: 3200, z: 330 }, gather: { x: 9220, z: 480 },
    },
    // Hilde's brother, chained at the battery and made to haul the stones
    {
      id: 'bram', name: 'Bram', x: 7190, z: 312, pose: 'chained', rescue: 'wreckage', tag: 'bram',
      flee: { x: 6300, z: 480 }, gather: { x: 9380, z: 420 },
    },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        ['VEXA', 'The old road. Cut into the cliff, all the way up to their gates.'],
        ['ORYN', 'And the Keep, right there across the gorge. Close enough to count its towers.'],
        ['RURIK', 'Take the high paths, both of you. I keep to the road. If they want to stop us, they come to me.'],
      ],
    },
    { id: 'horn', at: 420, lines: [['VOICE', '(a horn, high on the cliffs) The Oath Keepers! On the ascent! To the road!']] },
    { id: 'rocks', at: 640, lines: [['ORYN', '(from above) Loose rock! Watch the ground for its shadow.']] },
    { id: 'stair', at: 1500, calm: true, lines: [['VEXA', '(from the cliff) The stair is broken higher up. The ledge will not hold you long. Keep moving.']] },
    { id: 'wren', on: 'rescued:wren', lines: [['WREN', 'My goats ran when the stones came. I know the back path down. Thank you!']] },
    { id: 'shelterCry', at: 3200, lines: [['VOICE', 'Help! Up here, under the rock! They have us pinned!']] },
    { id: 'stones', at: 3320, lines: [['ORYN', '(from above) Catapults on the heights. A stone lands where its shadow grows. Move!']] },
    { id: 'shelter', on: 'rescued:shelter', lines: [['MINER', 'We went up the road ahead of you and walked into their catapults. We will hold here.']] },
    {
      id: 'hilde', on: 'rescued:shelter', if: 'saved:hilde',
      lines: [['HILDE', 'You came for us again. My brother is up there at the catapults. They make him haul the stones.']],
    },
    { id: 'bridge', at: 4900, lines: [['VEXA', '(from the far side) The bridge is half gone. Do not stop on it!']] },
    { id: 'battery', on: 'enter:battery', lines: [['ORYN', '(from above) There, the battery! Smash the catapults and the hillside goes quiet.']] },
    { id: 'silenced', on: 'broken:battery', lines: [['RURIK', 'That is the last of them.']] },
    {
      id: 'bram', on: 'rescued:bram', if: 'saved:hilde',
      lines: [['BRAM', 'Hilde is alive? Then I am going to find her. Go on. Finish this.']],
    },
    {
      id: 'bramAlone', on: 'rescued:bram', unless: 'saved:hilde',
      lines: [['BRAM', 'They worked me like a mule. No more. Go on, I will find my own way down.']],
    },
    { id: 'camp', at: 7700, calm: true, lines: [['VEXA', '(from the cliff) Their commander is in the camp ahead. Orsk. He burned the road behind us himself.']] },
    { id: 'orsk', on: 'boss:camp', lines: [['ORSK', 'So these are the Oath Keepers. The King sent me to bury you on this mountain.']] },
    { id: 'barrage', on: 'phase:camp:barrage', lines: [['ORSK', 'Signal the Keep! Fire on my position! Bring it all down on them!']] },
    { id: 'berserk', on: 'phase:camp:berserk', lines: [['ORSK', 'Enough! I will break you with my own hands!']] },
    {
      id: 'retreat', on: 'clear:camp', calm: true,
      lines: [['VOICE', '(horns from the Keep, long and low, again and again)'], ['RURIK', 'They are sounding the retreat.']],
    },
    { id: 'gathered', at: 9150, calm: true, if: 'rescued:shelter', lines: [['MINER', 'We will hold the pass behind you. Nobody comes up this road again.']] },
    {
      id: 'gates', at: 9300, calm: true, hold: true,
      lines: [
        ['VEXA', 'Look at them. Every man on the mountain running back to the Iron Gates.'],
        ['ORYN', 'He is pulling his army in behind his walls. That is not confidence.'],
        ['RURIK', 'No. It is fear. The gates next. Then the Keep.'],
      ],
    },
  ],

  // the fourth castle cutaway, after the level (scenes/CutawayScene.js)
  cutaway: 'retreat',
};
