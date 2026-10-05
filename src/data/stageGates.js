// stageGates.js — THE CAMPAIGN, LEVEL 5: THE IRON GATES (docs/campaign/plan.md). Down from
// the high pass to the wall across the valley: the King has pulled his whole army in
// behind its iron gates, and shut them on the men who didn't run fast enough. The Oath
// Keepers get in through the sally port, climb the gatehouse, kill the twins who keep its
// winch and raise the gate from inside; the people they saved on the road here come
// through it to fight beside them. Then the lower town the King is burning to slow them
// down, and Malgor, the Iron Marshal, the King's champion, in the yard before the Keep.
// Iron, smoke, siege fire. Everything here is drawn in code (view/GatesView.js); the
// painted art is requested in docs/campaign/art-levels-1-2.md (items 41-47).
//
// Same format as data/stageAscent.js. New here: the twins (boss.twin: two bosses at once;
// when one falls the other takes his place and fights harder), a gate held by two winch
// chains (props with the same `tag` and `opens`: the way opens when both are broken), the
// rescued coming back (hazard `if: 'saved:<id>'`, villagers with `if`): the miners'
// slings from the wall (a `friendly` bombardment: it only hits the Ashen, never a boss),
// and who stands at the Keep road at the end depends on who was saved on the way.
// Built for the weakest jumper, walking, no upgrades (ups of 85 at most, gaps of 60 at
// most); a test walks it with every hero.
//
// THE ROUTE
//   I   THE KILLING GROUND  the road to the shut gates under the wall's stones; the men the
//                           King locked out (thralls in chains) thrown at you as a horde
//   II  THE GATEHOUSE       in by the sally port: pitch through the murder holes, the stair
//                           up inside the wall, the rotten floor over the oubliette, the
//                           guardroom landing. A shrine
//   III THE WINCH ROOM      the twins, Hask and Hrolf, keep the winch: kill them, break both
//                           chains, and the gate goes up
//   IV  THE GATE YARD       they come to take the gate back (a horde); through it behind you
//                           come the people you saved, and the miners' slings from the wall
//   V   THE LOWER TOWN      the King is burning his own town to slow you: the townsfolk in
//                           the square, a family barred in the burning granary. A shrine
//   VI  THE MARSHAL'S YARD  MALGOR, THE IRON MARSHAL. At two thirds the archers on the inner
//                           wall loose on everyone; at one third he will not fall
//   VII THE KEEP ROAD       quiet; the saved gather; the Black Keep, and nothing between

const FULL = { z0: 282, z1: 520 };

export const STAGE_GATES = {
  id: 'ironGates',
  name: 'THE IRON GATES',
  chapter: 'V',
  next: { id: 'blackKeep', name: 'THE BLACK KEEP', chapter: 'VI' }, // (not built yet: Stage 3 of the plan)
  doneTitle: 'THE GATES HAVE FALLEN',
  width: 10400,
  theme: 'gates',
  tall: true,
  castle: { x: 1150, scale: 0.95, detail: 1 }, // it fills the sky now (x: see view/GatesView.js HORIZON)
  companions: { leaveAfter: 'opening', meet: 9600, farewell: 'keep' },

  sections: [
    {
      id: 'field', name: 'THE KILLING GROUND', x0: 0, x1: 1500,
      spawn: { x: 150, z: 440 },
      objective: 'Reach the gates',
      hint: 'Stones from the wall: watch the ground for the shadow',
      fightAt: 980,
      // the men the King shut outside: thralls in chains, thrown at you as a horde
      waves: [['thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall'], ['grunt', 'stalker', 'butcher']],
      props: [
        { kind: 'barrel', x: 460, z: 300, drop: null },
        { kind: 'crate', x: 1400, z: 480, drop: 'meat' },
      ],
      hazards: [
        // stones dropped from the wall: one at a time, slow (they teach the shadow again)
        { type: 'bombard', period: 250, warn: 90, shots: 1, damage: 16 },
      ],
    },
    {
      id: 'gatehouse', name: 'THE GATEHOUSE', x0: 1500, x1: 3200,
      spawn: { x: 1560, z: 440 },
      objective: 'Climb the gatehouse',
      hint: 'Pitch through the murder holes: go round the grates when they glow',
      fightAt: 2500,
      // the guardroom on the landing
      spawns: [[{ x: 2580, z: 380, inPlace: true }, { x: 2640, z: 440, inPlace: true }, { x: 2660, z: 370, inPlace: true }], [{ x: 2660, z: 380 }, { x: 2660, z: 470 }]],
      waves: [['grunt', 'stalker', 'grunt'], ['butcher', 'penitent']],
      props: [
        { kind: 'crate', x: 3000, z: 480, drop: 'mana' },
        { kind: 'barrel', x: 1720, z: 300, drop: 'wine' },
      ],
      hazards: [
        // the sally port passage: burning pitch poured through the murder holes onto the
        // grates (two, out of step: there is always a way past)
        { type: 'fire', x: 1640, z: 330, w: 80, d: 90, phase: 0 },
        { type: 'fire', x: 1640, z: 460, w: 80, d: 90, phase: 105 },
        // a stone dropped through a hole in the stair's roof
        { type: 'beam', look: 'rock', x: 1900, z: 440, w: 80, d: 80, period: 230, warn: 80, phase: 90 },
      ],
      rest: { x: 3060, z: 320, kind: 'oath' },
    },
    {
      id: 'winch', name: 'THE WINCH ROOM', x0: 3200, x1: 4800,
      spawn: { x: 3260, z: 440 },
      objective: 'Kill the twins. Break the winch',
      hint: 'Both chains hold the gate: break them both',
      fightAt: 3640,
      needs: 'winch', // (the way on stays shut until both chains are broken)
      waves: [['grunt', 'grunt', 'stalker'], ['butcher', 'grunt']],
      props: [
        // the winch: two drums, a chain on each, holding the great gate down
        { kind: 'winch', tag: 'winch', x: 4380, z: 300, opens: 'gate', drop: null },
        { kind: 'winch', tag: 'winch', x: 4600, z: 300, opens: 'gate', drop: 'meat' },
        { kind: 'barrel', x: 3500, z: 490, drop: null },
      ],
      hazards: [],
      // the Gate Twins: the Gladiator's kind, two of them, the keepers of the winch
      boss: {
        type: 'gladiator', name: 'Hask of the Gate', health: 1.8, damage: 1.1,
        twin: { type: 'gladiator', name: 'Hrolf of the Gate', health: 1.8, damage: 1.1 },
        grief: { damage: 1.3, speed: 1.2 },
        phases: [], // (no phases: the twins have each other)
      },
    },
    {
      id: 'yard', name: 'THE GATE YARD', x0: 4800, x1: 6400,
      spawn: { x: 4900, z: 440 },
      objective: 'Hold the gate',
      hint: 'They want the gate back. Do not let them have it',
      fightAt: 5300,
      waves: [
        ['thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall'],
        ['grunt', 'butcher', 'stalker', 'grunt'],
        ['gladiator', 'grunt', 'penitent'],
      ],
      props: [
        { kind: 'crate', x: 5100, z: 300, drop: 'meat' },
        { kind: 'barrel', x: 6300, z: 480, drop: 'wine' },
      ],
      hazards: [
        // the people you saved, on the wall behind you: the miners' slings (saved on the
        // ascent), the convoy's prisoners with stones (saved in the wood)
        { type: 'bombard', friendly: true, if: 'saved:shelter', period: 150, warn: 50, shots: 2, damage: 22, radius: 52 },
        { type: 'bombard', friendly: true, if: 'saved:convoy', period: 210, warn: 50, shots: 1, damage: 22, radius: 52, phase: 70 },
      ],
    },
    {
      id: 'town', name: 'THE LOWER TOWN', x0: 6400, x1: 7900,
      spawn: { x: 6460, z: 440 },
      objective: 'Save the townsfolk',
      hint: 'Break the bar on the granary door',
      fightAt: 6900,
      waves: [['grunt', 'butcher', 'stalker'], ['penitent', 'grunt', 'grunt']],
      props: [
        // the granary: barred from outside, burning, a family inside
        { kind: 'wreckage', tag: 'granary', x: 7380, z: 300, drop: null },
        { kind: 'crate', x: 7800, z: 480, drop: 'mana' },
      ],
      hazards: [
        // the burning houses shed their beams
        { type: 'beam', x: 7000, z: 360, w: 90, d: 80, period: 240, warn: 80, phase: 40 },
        { type: 'beam', x: 7560, z: 450, w: 90, d: 80, period: 260, warn: 80, phase: 150 },
      ],
      rest: { x: 7820, z: 320, kind: 'oath' },
    },
    {
      id: 'marshal', name: 'THE MARSHAL\'S YARD', x0: 7900, x1: 9400,
      spawn: { x: 7960, z: 440 },
      objective: 'Kill Malgor, the Iron Marshal',
      hint: 'When the archers loose, watch the shadows. Jump his Earthbreaker',
      fightAt: 8260,
      waves: [['grunt', 'stalker', 'grunt']],
      props: [
        { kind: 'barrel', x: 8100, z: 300, drop: 'meat' },
        { kind: 'crate', x: 9300, z: 490, drop: 'meat' },
      ],
      hazards: [
        // at two thirds the archers on the inner wall loose on the yard: on everyone, his own
        // men too (he stands in it)
        { type: 'bombard', when: 'phase:walls', period: 180, warn: 70, shots: 2, damage: 16 },
        // and the miners on the wall behind you answer them, at his men
        { type: 'bombard', friendly: true, if: 'saved:shelter', when: 'phase:walls', period: 160, warn: 50, shots: 1, damage: 22, radius: 52 },
      ],
      // the King's champion: Warlord Malgor's own strips and Earthbreaker
      boss: {
        type: 'warlord', name: 'Malgor, the Iron Marshal', health: 4.0, damage: 1.1, escort: ['grunt', 'grunt'],
        entrance: { from: 160, to: 340, speed: 58, stepEvery: 34, awe: 30 },
        phases: [
          { id: 'walls', at: 0.66, adds: ['thrall', 'thrall', 'thrall', 'thrall'], callout: 'ARCHERS ON THE WALLS!' },
          { id: 'iron', at: 0.33, rage: true, adds: ['gladiator'], damage: 1.2, speed: 1.15, callout: 'HE WILL NOT FALL!', ai: { attackCooldown: [25, 55], specialEvery: 18 } },
        ],
      },
    },
    {
      id: 'keep', name: 'THE KEEP ROAD', x0: 9400, x1: 10400,
      spawn: { x: 9460, z: 440 },
      objective: 'On to the Black Keep',
      hint: '',
      waves: [],
      props: [],
      hazards: [],
    },
  ],

  // up the road to the Keep once the last words are said
  exit: { x: 10200, after: 'keep' },

  terrain: [
    // ---- I THE KILLING GROUND: a burned-out ram on the road to hop (or walk round)
    { kind: 'block', x0: 640, x1: 760, z0: 380, z1: 470, top: 40 },

    // ---- II THE GATEHOUSE: the stair up inside the wall, the rotten floor over the
    // oubliette, the guardroom landing, down to the winch room's door
    { kind: 'block', x0: 1750, x1: 1950, ...FULL, top: 70 },              // +70
    { kind: 'block', x0: 1950, x1: 2150, ...FULL, top: 140 },             // +70
    { kind: 'pit', x0: 2150, x1: 2360, ...FULL },                        // the oubliette
    { kind: 'crumble', x0: 2190, x1: 2250, z0: 350, z1: 480, top: 140, fall: 40, back: 200 }, // gap 40
    { kind: 'crumble', x0: 2295, x1: 2360, z0: 350, z1: 480, top: 140, fall: 40, back: 200 }, // gap 45
    { kind: 'block', x0: 2360, x1: 2700, ...FULL, top: 140 },             // the guardroom landing
    { kind: 'block', x0: 2700, x1: 2850, ...FULL, top: 70 },              // down

    // ---- III / IV: the great gate, iron, held down by the winch (gone once both chains break)
    { kind: 'block', tag: 'gate', mat: 'iron', x0: 4740, x1: 4775, ...FULL, top: 300 },

    // ---- V THE LOWER TOWN: a cart overturned in the street
    { kind: 'block', x0: 6640, x1: 6740, z0: 400, z1: 480, top: 40 },
  ],

  // braziers and siege fires
  lanterns: [
    { x: 400, z: 290 }, { x: 1300, z: 290 }, { x: 1600, z: 290 }, { x: 3000, z: 290 }, { x: 3400, z: 290 },
    { x: 4300, z: 290 }, { x: 5000, z: 290 }, { x: 6000, z: 290 }, { x: 7100, z: 290 }, { x: 8000, z: 290 },
    { x: 9200, z: 290 }, { x: 9800, z: 290 },
  ],

  // the dead (view only): the men shut outside, the town's people
  bodies: [{ x: 300, z: 480, pose: 1 }, { x: 860, z: 470, pose: 0 }, { x: 1180, z: 330, pose: 2 }, { x: 5600, z: 480, pose: 1 }, { x: 6600, z: 330, pose: 0 }, { x: 7200, z: 490, pose: 2 }],

  npcs: [
    // the townsfolk in the square, the Ashen driving them into the fire
    {
      id: 'townsfolk', name: 'the townsfolk', x: 7100, z: 320, pose: 'group', rescue: 'defend', section: 'town', wave: 1,
      flee: { x: 6500, z: 330 }, gather: { x: 10060, z: 330 },
    },
    // barred in the burning granary
    {
      id: 'granary', name: 'the reeve\'s family', x: 7380, z: 296, pose: 'family', rescue: 'wreckage', tag: 'granary',
      flee: { x: 6500, z: 470 }, gather: { x: 10120, z: 460 },
    },
    // the people saved on the way here, come through the gate to stand with you (each only
    // if he was saved)
    { id: 'minersBack', name: 'the miners', x: 9720, z: 330, pose: 'group', if: 'saved:shelter' },
    { id: 'bramBack', name: 'Bram', x: 9880, z: 470, if: 'saved:bram' },
    { id: 'hildeBack', name: 'Hilde', x: 9920, z: 450, if: 'saved:hilde' },
    { id: 'jorenBack', name: 'Joren', x: 9580, z: 470, if: 'saved:joren' },
    { id: 'convoyBack', name: 'the convoy\'s prisoners', x: 9960, z: 340, pose: 'group', if: 'saved:convoy' },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        ['ORYN', 'The Iron Gates. Shut. And every bow in his army on that wall.'],
        ['VEXA', 'He shut them on his own men. Listen to them out there, hammering to be let in.'],
        ['RURIK', 'Then they will fight like men with nothing left. There is a sally port under the east tower. Find it. I will clear the road.'],
      ],
    },
    { id: 'stones', at: 420, lines: [['ORYN', '(from the ditch) Stones from the wall! Watch for the shadow!']] },
    { id: 'thralls', at: 900, lines: [['VOICE', '(at the gates) Open up! Open up, they are coming! OPEN THE GATES!']] },
    { id: 'shut', on: 'clear:field', calm: true, lines: [['VEXA', '(from the tower\'s foot) He left them out here to die slowing us down. The sally port is open. In!']] },
    { id: 'pitch', at: 1580, lines: [['ORYN', '(from inside the wall) Murder holes! Pitch on the grates. Go round when they glow.']] },
    { id: 'floor', at: 2100, calm: true, lines: [['VEXA', '(from below) The guardroom floor is rotten, over the oubliette. Do not stand on it.']] },
    { id: 'winchRoom', on: 'enter:winch', lines: [['ORYN', '(from the stair) The winch room. Break the chains on the drums and the gate goes up.']] },
    {
      id: 'twins', on: 'boss:winch',
      lines: [['HASK', 'The Oath Keepers. The Marshal said you would come up the stair.'], ['HROLF', 'Nobody touches the winch, brother. Nobody.']],
    },
    { id: 'grief', on: 'twin:winch', lines: [['VOICE', '(a roar, the twin over his brother) BROTHER! I will tear you apart!']] },
    { id: 'gateUp', on: 'broken:winch', lines: [['VOICE', '(iron grinding, chains running, the great gate rising)'], ['RURIK', 'The gate is up! Down to the yard!']] },
    // the rescued come back: who answers depends on who was saved
    { id: 'answer', at: 5000, lines: [['VOICE', '(behind you, through the open gate) OATH KEEPERS!']] },
    { id: 'miners', at: 5060, if: 'saved:shelter', lines: [['MINER', 'We followed you down from the pass! Up on the wall, lads! Slings!']] },
    { id: 'convoy', at: 5120, if: 'saved:convoy', lines: [['PRISONER', 'You broke our wagon open on the wood road. We kept the stones!']] },
    { id: 'joren', at: 5180, if: 'saved:joren', lines: [['JOREN', 'Mira sent me after you. I was not going to sit this out.']] },
    { id: 'alone', at: 5060, unless: 'saved:shelter', lines: [['RURIK', 'Nobody behind us. Then we hold it ourselves.']] },
    { id: 'retake', on: 'enter:yard', lines: [['VOICE', '(drums from the town) Take back the gate! Take it back!']] },
    { id: 'held', on: 'clear:yard', calm: true, lines: [['RURIK', 'The gate is ours. The town next.']] },
    { id: 'fires', at: 6560, lines: [['ORYN', '(from the rooftops) He is burning his own town. To slow us down.']] },
    { id: 'granaryCry', at: 6900, lines: [['VOICE', 'The granary! They barred the door! My children are in there!']] },
    { id: 'townsfolk', on: 'rescued:townsfolk', lines: [['TOWNSMAN', 'You are the ones he warned us of... and you stopped for us?']] },
    { id: 'granary', on: 'rescued:granary', lines: [['REEVE', 'We are his people. He burned us anyway. Go. End him.']] },
    {
      id: 'oath', on: 'clear:town', calm: true, unless: 'lost:townsfolk',
      lines: [['RURIK', 'His people or ours. Whoever brings harm to them answers to us.']],
    },
    { id: 'shrine', at: 7700, calm: true, lines: [['VEXA', '(from the wall) The Marshal is in the yard ahead. Alone. He sent his men away. Kneel first.']] },
    {
      id: 'malgor', on: 'boss:marshal',
      lines: [
        ['MALGOR', 'Three times I asked him for your heads. Three times he said no.'],
        ['MALGOR', 'Today he gave me the gates. Come, Oath Keepers. Nothing passes me.'],
      ],
    },
    { id: 'walls', on: 'phase:marshal:walls', lines: [['MALGOR', 'Archers! Loose on the yard! On all of us! I will stand in it!']] },
    { id: 'slings', on: 'phase:marshal:walls', if: 'saved:shelter', lines: [['MINER', '(from the outer wall) Their archers! Slings on the inner wall!']] },
    { id: 'iron', on: 'phase:marshal:iron', lines: [['MALGOR', 'I have never lost a fight under this banner. Not one!']] },
    {
      id: 'fallen', on: 'clear:marshal', calm: true,
      lines: [
        ['RURIK', 'The best man he had. Dead guarding a door for a king who never once rode out.'],
        ['VEXA', '(from the wall) Listen. No drums. No horns. Nothing.'],
      ],
    },
    { id: 'returned', at: 9560, calm: true, if: 'saved:shelter', lines: [['MINER', 'The gate stays open behind you. Nobody shuts it again. We will see to that.']] },
    { id: 'bramHilde', at: 9800, calm: true, if: 'saved:bram', lines: [['BRAM', 'Hilde and I hold the gatehouse. Go. Bring the rest of them home.']] },
    { id: 'reeve', at: 9900, calm: true, if: 'rescued:granary', lines: [['REEVE', 'There is a prison wing on the Keep\'s east side. Our sons are in there too.']] },
    {
      id: 'keep', at: 10000, calm: true, hold: true,
      lines: [
        ['ORYN', 'There it is. The Black Keep. And nothing between us and him now.'],
        ['VEXA', 'He has nobody left to send. Only the walls.'],
        ['RURIK', 'Then we go through the walls. For the ones still in there. Now we finish it.'],
      ],
    },
  ],

  // the fifth castle cutaway, after the level (scenes/CutawayScene.js)
  cutaway: 'fear',
};
