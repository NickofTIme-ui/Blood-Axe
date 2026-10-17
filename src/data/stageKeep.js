// stageKeep.js — THE CAMPAIGN, LEVEL 6: THE BLACK KEEP, the finale (docs/campaign/plan.md;
// the full design: project files final-level/black-keep-final-level.md). In through the
// front, down into the forge under the Keep, then all the way up the burning central tower
// to the throne. Black stone, violet torchlight, forge orange, grey ash; the Kings' Root the
// one pale place. Everything here is drawn in code (view/KeepView.js) until it's painted.
//
// Same format as data/stageGates.js. New here (stage/Stage.js, see its top):
//   hazard 'drift'      the ash gale on the causeway and the Crown Walk (gusts: shelter behind
//                       the parapet), the Ash Mill's turning stone (the back of the lane drifts
//                       one way, the front the other), the hoist tilting in the Burning Spire
//   block `carry`       the Crucible Line: buckets on a chain running back toward the furnace
//   spawns `drop`       the Spire: men leaping onto the hoist from the floors it passes
//   boss.duel           King Vaurath's first phase: a duel of parries; he takes little of a
//                       blow until his composure breaks, and answers a blow into his guard
//   phases ward / hold / release / squeeze   his other three: the Keep's conduits ward him;
//                       the colossus holds him out of reach until its crown is broken; the
//                       last ground closes in
// Built for the weakest jumper, walking, no upgrades (ups of 85 at most, gaps of 60 at
// most); a test walks it with every hero.
//
// THE ROUTE
//   I    THE ASH CAUSEWAY      the long causeway on its piers, the ash gale; a shield line
//   II   THE MUSTER HALL       every man he has left, in ranks; crossbows and drums on the
//                              balcony, chandeliers on their chains. A shrine
//   III  THE BURNING CELLS     up the five tiers of the prison wing as it burns from the
//                              bottom: open the cells (the village's people)
//   IV   THE HEADSMAN'S SCAFFOLD  the King's Executioner on the roof of the wing; then the
//                              roof gives way and everyone falls through into the forge
//   V    THE CRUCIBLE LINE     a shrine on the slag; the buckets over the furnace mouth
//   VI   THE ASH MILL          the turning millstone; the Forgemaster on its hub
//   VII  THE KINGS' ROOT       quiet: the old kings' tombs; the tomb guards. A shrine
//   VIII THE BURNING SPIRE     the ore hoist up the burning tower; men from every floor
//   IX   THE CROWN WALK        the battlements in the wind; the Crown Guard
//   X    THE FALLING SPAN      the bridge to the Crown, coming down behind you. A shrine
//   XI   THE ASHEN THRONE      KING VAURATH: the duel; the Keep obeys; the Ashen Colossus;
//                              the last ground. Then his sentence

const FULL = { z0: 282, z1: 520 };

// the King's four phases, at these shares of his health
const KING_AT = { keep: 0.75, colossus: 0.5, last: 0.25 };
const THRONE = { x0: 15900, x1: 17400 };

export const STAGE_KEEP = {
  id: 'blackKeep',
  name: 'THE BLACK KEEP',
  chapter: 'VI',
  next: null, // (the last level: after it, the end)
  doneTitle: 'THE OATH IS KEPT',
  width: 17400,
  theme: 'keep',
  tall: true,
  castle: { x: 900, scale: 1.25, detail: 1 },
  companions: { leaveAfter: 'opening', meet: 16400, farewell: 'oathKept' },

  sections: [
    {
      id: 'causeway', name: 'THE ASH CAUSEWAY', x0: 0, x1: 1900,
      spawn: { x: 150, z: 420 },
      objective: 'Cross the causeway',
      hint: 'When the gale howls, get behind the parapet',
      fightAt: 760,
      // a line of shields across the causeway, men behind it; then the men let out of the
      // gibbets and two coming up over the edge from the piers
      waves: [['gladiator', 'gladiator', 'gladiator', 'grunt', 'grunt'], ['thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall'], ['stalker', 'stalker', 'butcher']],
      props: [
        { kind: 'barrel', x: 520, z: 300, drop: null },
        { kind: 'crate', x: 1260, z: 310, drop: 'health' },
        { kind: 'crate', x: 1820, z: 470, drop: 'mana' },
      ],
      hazards: [
        // THE ASH GALE: a howl, an ash streak on the horizon, then the gust down the causeway
        // toward its open edge; behind the parapet (the back of the lane) you're out of it
        { type: 'drift', look: 'gale', x0: 200, x1: 1900, vz: 55, vx: 20, period: 460, warn: 100, for: 110, shelter: { z: 318 }, phase: 120 },
      ],
    },
    {
      id: 'muster', name: 'THE MUSTER HALL', x0: 1900, x1: 3700,
      spawn: { x: 1980, z: 440 },
      objective: 'Break the muster',
      hint: 'Wreck the crossbows on the balcony. Watch the chandeliers',
      fightAt: 2300,
      waves: [
        ['grunt', 'grunt', 'grunt', 'grunt', 'grunt'],
        ['gladiator', 'gladiator', 'penitent', 'penitent'],
        ['berserker', 'berserker', 'grunt', 'stalker'],
      ],
      props: [
        // the crossbows (and the drums behind them) on the balcony: wreck them and the bolts stop
        { kind: 'archers', tag: 'hallBows', x: 2600, z: 300, drop: 'health' },
        { kind: 'archers', tag: 'hallBows', x: 3240, z: 300, drop: null },
        { kind: 'barrel', x: 2200, z: 480, drop: null },
        { kind: 'crate', x: 3500, z: 470, drop: 'health' },
      ],
      hazards: [
        { type: 'bombard', look: 'arrows', silence: 'hallBows', period: 170, warn: 60, shots: 2, damage: 10 },
        // the chandeliers: iron rings of candles the size of cartwheels, on chains
        { type: 'beam', look: 'chandelier', x: 2450, z: 420, w: 140, d: 150, period: 330, warn: 100, phase: 40 },
        { type: 'beam', look: 'chandelier', x: 2950, z: 400, w: 140, d: 150, period: 330, warn: 100, phase: 150 },
        { type: 'beam', look: 'chandelier', x: 3400, z: 430, w: 140, d: 150, period: 330, warn: 100, phase: 260 },
      ],
      rest: { x: 3600, z: 320, kind: 'oath' },
    },
    {
      id: 'cells', name: 'THE BURNING CELLS', x0: 3700, x1: 5500,
      spawn: { x: 3760, z: 420 },
      objective: 'Open the cells. Climb',
      hint: 'Hold E at a cell door once the guards are down. The fire climbs',
      // small and close: two jailers on each tier, hounds on the stair
      spawns: [
        [{ x: 4150, z: 420, inPlace: true }, { x: 4220, z: 380, inPlace: true }],
        [{ x: 4560, z: 400 }, { x: 4600, z: 360 }, { x: 4640, z: 430 }],
        [{ x: 5000, z: 400 }, { x: 5060, z: 360 }],
        [{ x: 5380, z: 420 }, { x: 5420, z: 380 }],
      ],
      waves: [['grunt', 'grunt'], ['hound', 'hound', 'stalker'], ['butcher', 'grunt'], ['grunt', 'penitent']],
      props: [
        { kind: 'barrel', x: 4500, z: 440, drop: 'health' },
        { kind: 'crate', x: 5250, z: 440, drop: 'mana' },
      ],
      hazards: [
        // the bottom tier burning, the next one catching
        { type: 'fire', x: 3830, z: 360, w: 110, d: 100, phase: 0 },
        { type: 'fire', x: 3830, z: 470, w: 110, d: 100, phase: 100 },
        { type: 'fire', x: 4020, z: 470, w: 90, d: 80, y: 70, phase: 50 },
        { type: 'fire', x: 4380, z: 440, w: 80, d: 80, y: 140, phase: 150 },
        // a crossbow on the tier above you, whichever tier you're on
        { type: 'bombard', look: 'arrows', period: 230, warn: 70, shots: 1, damage: 9 },
      ],
    },
    {
      id: 'scaffold', name: 'THE HEADSMAN\'S SCAFFOLD', x0: 5500, x1: 6900,
      spawn: { x: 5580, z: 420 },
      objective: 'Kill the Executioner',
      hint: 'His overheads break the scaffold. Ring the bell to stun him',
      fightAt: 5800,
      waves: [['grunt', 'grunt']],
      props: [
        { kind: 'bell', x: 6450, z: 310, drop: null },
        { kind: 'barrel', x: 5640, z: 470, drop: 'health' },
      ],
      hazards: [
        // at half health he rings the bell: the jailers come, and the fire below breaks through
        { type: 'beam', look: 'rock', when: 'phase:bell', x: 6050, z: 420, w: 90, d: 90, period: 200, warn: 80 },
        { type: 'beam', look: 'rock', when: 'phase:bell', x: 6350, z: 380, w: 90, d: 90, period: 200, warn: 80, phase: 100 },
      ],
      boss: {
        type: 'butcher', look: 'executioner', name: 'The King\'s Executioner', health: 3.2, damage: 1.15, size: 1.15,
        entrance: { from: 160, to: 380, speed: 54, stepEvery: 34, awe: 30 },
        sentence: {
          speaker: 'EXECUTIONER',
          crimes: [
            'You took the heads of men who had done nothing but be taken.',
            'You were working down the line when we walked in.',
          ],
          last: 'Make it one stroke. I always did.',
        },
        phases: [
          { id: 'bell', at: 0.5, adds: ['grunt', 'grunt', 'grunt'], callout: 'THE BELL!' },
          { id: 'fury', at: 0.33, rage: true, damage: 1.15, speed: 1.15, callout: 'HE STOPS DEFENDING!', ai: { attackCooldown: [20, 45], blockChance: 0 } },
        ],
      },
    },
    {
      id: 'crucible', name: 'THE CRUCIBLE LINE', x0: 6900, x1: 8600,
      spawn: { x: 7000, z: 420 },
      objective: 'Cross the Crucible Line',
      hint: 'The buckets run back to the fire: keep moving',
      fightAt: 7600,
      spawns: [
        [{ x: 7760, z: 420 }, { x: 7840, z: 380 }, { x: 7880, z: 460 }],
        [{ x: 8480, z: 420 }, { x: 8520, z: 380 }, { x: 8540, z: 460 }],
      ],
      waves: [['grunt', 'stalker', 'grunt'], ['butcher', 'grunt', 'ghoul']],
      props: [
        { kind: 'crate', x: 7020, z: 320, drop: 'health' },
        { kind: 'shackle', tag: 'forge', x: 8460, z: 300, drop: null },
        { kind: 'barrel', x: 8560, z: 480, drop: 'health' },
      ],
      hazards: [
        // the furnace belches: flame up out of the mouth over the front of the buckets (ride at the back)
        { type: 'fire', x: 7430, z: 465, w: 90, d: 60, y: 30, phase: 30 },
        { type: 'fire', x: 8210, z: 465, w: 90, d: 60, y: 30, phase: 140 },
        // crossbows on the gantry across the cavern
        { type: 'bombard', look: 'arrows', period: 260, warn: 70, shots: 1, damage: 9 },
      ],
      rest: { x: 7060, z: 440, kind: 'oath' },
    },
    {
      id: 'mill', name: 'THE ASH MILL', x0: 8600, x1: 10000,
      spawn: { x: 8680, z: 420 },
      objective: 'Stop the mill. Kill the Forgemaster',
      hint: 'The back of the stone turns one way, the front the other. Break the drive pins',
      fightAt: 8900,
      needs: 'pins',
      waves: [['thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall', 'thrall'], ['butcher', 'ghoul', 'ghoul']],
      props: [
        // the hub's three drive pins: break them all and the stone stops
        { kind: 'pin', tag: 'pins', x: 9180, z: 300, drop: null },
        { kind: 'pin', tag: 'pins', x: 9300, z: 300, drop: 'health' },
        { kind: 'pin', tag: 'pins', x: 9420, z: 300, drop: null },
      ],
      hazards: [
        // THE TURNING STONE: the back half drifts left, the front half right; reversed when he
        // pulls the lever; faster when he throws it into overdrive; still once the pins break
        { type: 'drift', look: 'mill', x0: 8700, x1: 9900, ground: true, until: 'phase:reverse', bands: [{ z0: 0, z1: 400, vx: -55 }, { z0: 400, z1: 999, vx: 55 }], silence: 'pins' },
        { type: 'drift', look: 'mill', x0: 8700, x1: 9900, ground: true, when: 'phase:reverse', until: 'phase:overdrive', bands: [{ z0: 0, z1: 400, vx: 60 }, { z0: 400, z1: 999, vx: -60 }], silence: 'pins' },
        { type: 'drift', look: 'mill', x0: 8700, x1: 9900, ground: true, when: 'phase:overdrive', bands: [{ z0: 0, z1: 400, vx: -85 }, { z0: 400, z1: 999, vx: 85 }], silence: 'pins' },
        // the spokes sweeping across the stone
        { type: 'blade', x: 9000, z: 360, swing: 90, phase: 0 },
        { type: 'blade', x: 9600, z: 460, swing: 90, phase: 75 },
        // the crushers where the stone grinds the wall
        { type: 'fire', look: 'crusher', x: 8740, z: 400, w: 60, d: 230, phase: 0 },
        { type: 'fire', look: 'crusher', x: 9860, z: 400, w: 60, d: 230, phase: 105 },
      ],
      boss: {
        type: 'berserker', look: 'forgemaster', name: 'The Forgemaster', health: 3.0, damage: 1.1, size: 1.12,
        entrance: { from: 160, to: 360, speed: 56, stepEvery: 32, awe: 30 },
        sentence: {
          speaker: 'FORGEMASTER',
          crimes: [
            'You chained people to your wheel and ground their lungs to ash.',
            'Every Ashen man who burned our homes came out of your furnace.',
          ],
          last: 'The fire never asked who they were. Neither did I.',
        },
        phases: [
          { id: 'reverse', at: 0.66, adds: ['thrall', 'thrall', 'thrall'], callout: 'HE THROWS THE LEVER!' },
          { id: 'overdrive', at: 0.33, rage: true, speed: 1.15, callout: 'OVERDRIVE!' },
        ],
      },
    },
    {
      id: 'root', name: 'THE KINGS\' ROOT', x0: 10000, x1: 11700,
      spawn: { x: 10080, z: 420 },
      objective: 'Find the way up',
      hint: 'Mind the floor. The statues are watching',
      fightAt: 10600,
      // the tomb guards stand among the statues and don't move until you pass
      spawns: [[{ x: 10660, z: 400, inPlace: true }, { x: 10720, z: 450, inPlace: true }, { x: 10780, z: 380, inPlace: true }]],
      waves: [['penitent', 'penitent', 'penitent']],
      props: [
        // a cracked wall in the first crypt: a secret
        { kind: 'urn', x: 10560, z: 300, drop: 'relic', secret: true },
        { kind: 'crate', x: 11600, z: 420, drop: 'health' },
      ],
      hazards: [
        // tremors from the burning tower above: dust along a line of the ceiling, then a slab
        { type: 'beam', look: 'rock', x: 10300, z: 415, w: 80, d: 90, period: 240, warn: 90, phase: 0 },
        { type: 'beam', look: 'rock', x: 11320, z: 415, w: 80, d: 90, period: 200, warn: 80, phase: 70 },
        { type: 'beam', look: 'rock', x: 11500, z: 415, w: 80, d: 90, period: 220, warn: 80, phase: 140 },
      ],
      rest: { x: 10120, z: 400, kind: 'oath' },
      light: 0x8ab0d8, mood: 0.3,
    },
    {
      id: 'spire', name: 'THE BURNING SPIRE', x0: 11700, x1: 13200,
      spawn: { x: 11800, z: 420 },
      objective: 'Ride the hoist to the top',
      hint: 'They come from every floor you pass. Keep off the open edge',
      fightAt: 12100,
      // each floor the hoist passes: the armoury, the library, the barracks, the trophy gallery
      spawns: [
        [{ x: 12250, z: 340, drop: 380 }, { x: 12550, z: 470, drop: 380 }, { x: 12400, z: 400, drop: 420 }],
        [{ x: 12200, z: 360, drop: 380 }, { x: 12700, z: 440, drop: 380 }],
        [{ x: 12150, z: 340, drop: 380 }, { x: 12350, z: 470, drop: 400 }, { x: 12600, z: 380, drop: 380 }, { x: 12850, z: 440, drop: 420 }],
        [{ x: 12300, z: 400, drop: 380 }, { x: 12700, z: 400, drop: 380 }],
        [{ x: 12500, z: 420, drop: 440 }],
      ],
      waves: [
        ['gladiator', 'gladiator', 'grunt'],
        ['grunt', 'grunt'],
        ['butcher', 'grunt', 'stalker', 'grunt'],
        ['hound', 'hound'],
        ['berserker'],
      ],
      props: [
        { kind: 'crate', x: 11900, z: 320, drop: 'health' },
        { kind: 'barrel', x: 13050, z: 320, drop: 'mana' },
      ],
      hazards: [
        // debris coming down the shaft
        { type: 'beam', look: 'rock', x: 12300, z: 380, w: 90, d: 90, period: 190, warn: 70, phase: 40 },
        { type: 'beam', look: 'rock', x: 12750, z: 450, w: 90, d: 90, period: 210, warn: 70, phase: 130 },
        // THE TILT: a chain snaps and the hoist heels over toward its open front edge
        { type: 'drift', look: 'tilt', x0: 11750, x1: 13150, vz: 45, period: 620, warn: 90, for: 120, phase: 200 },
      ],
    },
    {
      id: 'crown', name: 'THE CROWN WALK', x0: 13200, x1: 14700,
      spawn: { x: 13280, z: 420 },
      objective: 'Cross the battlements. Kill the Crown Guard',
      hint: 'The gale again: behind the merlons',
      fightAt: 13800,
      waves: [['grunt', 'stalker', 'grunt']],
      props: [
        { kind: 'crate', x: 13400, z: 320, drop: 'health' },
        { kind: 'barrel', x: 14600, z: 330, drop: 'health' },
      ],
      hazards: [
        { type: 'drift', look: 'gale', x0: 13200, x1: 14700, vz: 55, vx: 20, period: 420, warn: 100, for: 110, shelter: { z: 318 }, phase: 200 },
        // archers on the far tower, across the gap
        { type: 'bombard', look: 'arrows', until: 'clear', period: 220, warn: 70, shots: 2, damage: 9 },
      ],
      // the King's last guard: three in the plan, two here (the twins' rule: when one falls the
      // other fights harder)
      boss: {
        type: 'gladiator', look: 'crownguard', name: 'Ser Aldous of the Crown', health: 1.9, damage: 1.1,
        twin: { type: 'gladiator', look: 'crownguard', name: 'Ser Berric of the Crown', health: 1.9, damage: 1.1 },
        grief: { damage: 1.25, speed: 1.15 },
        sentence: {
          crimes: [
            'You guarded the door of the man who burned our village.',
            'You stood on his wall and watched it burn.',
          ],
          last: 'We swore to him. You understand oaths.',
        },
        phases: [],
      },
    },
    {
      id: 'span', name: 'THE FALLING SPAN', x0: 14700, x1: 15900,
      spawn: { x: 14760, z: 420 },
      objective: 'Run!',
      hint: 'The bridge is falling behind you',
      waves: [],
      props: [],
      hazards: [
        { type: 'collapse', x0: 14560, to: 15960, speed: 100, damage: 26, surge: { every: 260, for: 50, mult: 1.7 } },
        { type: 'beam', look: 'rock', x: 15280, z: 400, w: 90, d: 90, period: 150, warn: 60, phase: 30 },
        { type: 'beam', look: 'rock', x: 15700, z: 430, w: 90, d: 90, period: 140, warn: 60, phase: 80 },
      ],
      rest: { x: 15820, z: 330, kind: 'oath' },
    },
    {
      id: 'throne', name: 'THE ASHEN THRONE', ...THRONE,
      spawn: { x: 15980, z: 420 },
      objective: 'King Vaurath',
      hint: 'Parry his blows. When he guards, wait',
      fightAt: 16250,
      waves: [],
      props: [
        // II: the Keep's ember conduits, feeding him the forge's fire
        { kind: 'conduit', tag: 'conduit', x: 16100, z: 300, drop: null },
        { kind: 'conduit', tag: 'conduit', x: 16540, z: 330, drop: 'health' },
        { kind: 'conduit', tag: 'conduit', x: 16900, z: 300, drop: null },
        { kind: 'conduit', tag: 'conduit', x: 17250, z: 300, drop: 'mana' },
        // III: the colossus's crown: three spires, up its arms and shoulders
        { kind: 'spire', tag: 'spire', x: 16260, z: 310, drop: null },
        { kind: 'spire', tag: 'spire', x: 16430, z: 310, drop: 'health' },
        { kind: 'spire', tag: 'spire', x: 17040, z: 310, drop: null },
      ],
      hazards: [
        // II, THE KEEP OBEYS: the floor heaves (pillars and slabs coming down), the ash rains
        // ember, the room tilts toward the drop
        { type: 'beam', look: 'pillar', when: 'phase:keep', until: 'phase:colossus', x: 16300, z: 400, w: 120, d: 120, period: 220, warn: 90, phase: 0 },
        { type: 'beam', look: 'pillar', when: 'phase:keep', until: 'phase:colossus', x: 16800, z: 440, w: 120, d: 120, period: 220, warn: 90, phase: 110 },
        { type: 'bombard', look: 'ember', when: 'phase:keep', until: 'phase:colossus', period: 200, warn: 70, shots: 2, damage: 12 },
        { type: 'drift', look: 'tilt', when: 'phase:keep', until: 'phase:colossus', x0: THRONE.x0, x1: THRONE.x1, vz: 55, period: 520, warn: 90, for: 120 },
        // III, THE ASHEN COLOSSUS: its hands slamming down, its ash breath across half the lap,
        // its crown's ember fire; the people you saved on the walls, hauling its chains and
        // throwing stones at the half-made men crawling out of its cracks
        // (its hands come down on the lap, never on the arms and shoulders: the way up stays open)
        { type: 'beam', look: 'hand', when: 'phase:colossus', until: 'phase:last', x: 16420, z: 445, w: 170, d: 120, period: 240, warn: 100, phase: 0 },
        { type: 'beam', look: 'hand', when: 'phase:colossus', until: 'phase:last', x: 16880, z: 445, w: 170, d: 120, period: 240, warn: 100, phase: 120 },
        { type: 'fire', look: 'breath', when: 'phase:colossus', until: 'phase:last', x: 16650, z: 460, w: 320, d: 110, phase: 60 },
        { type: 'bombard', look: 'ember', when: 'phase:colossus', until: 'phase:last', period: 230, warn: 70, shots: 1, damage: 12 },
        { type: 'bombard', friendly: true, if: 'saved:shelter', when: 'phase:colossus', until: 'phase:last', period: 150, warn: 50, shots: 2, damage: 22, radius: 52 },
        { type: 'bombard', friendly: true, if: 'saved:convoy', when: 'phase:colossus', until: 'phase:last', period: 210, warn: 50, shots: 1, damage: 22, radius: 52, phase: 70 },
        // IV, THE LAST GROUND: the Keep falling round you
        { type: 'beam', look: 'rock', when: 'phase:last', x: 16450, z: 380, w: 90, d: 90, period: 170, warn: 70, phase: 0 },
        { type: 'beam', look: 'rock', when: 'phase:last', x: 16750, z: 450, w: 90, d: 90, period: 170, warn: 70, phase: 85 },
      ],
      boss: {
        type: 'king', name: 'King Vaurath, the Ashen Crown', health: 4.2, damage: 1.1, size: 1.15,
        entrance: { from: 160, to: 420, speed: 46, stepEvery: 36, awe: 50 },
        // I, THE DUEL: little gets through his guard until his composure breaks (three parries
        // of his blows, or guards broken); then he staggers wide open
        duel: { composure: 3, ward: 0.3, open: 160, counter: { damage: 14, reach: 130 } },
        sentence: {
          speaker: 'VAURATH',
          crimes: [
            'For the burning of our village.',
            'For the murder of our people.',
            'For those you chained and carried away, and ground into your Ashen.',
          ],
          last: 'Kneel... I told you to kneel...',
        },
        phases: [
          { id: 'keep', at: KING_AT.keep, ward: { tag: 'conduit', mult: 0.35 }, callout: 'THE KEEP OBEYS HIM!', ai: { attackCooldown: [40, 80], specialEvery: 26 } },
          {
            id: 'colossus', at: KING_AT.colossus, callout: 'THE COLOSSUS WAKES!',
            // inside the colossus, high in its chest, until its crown is broken; then down in
            // its heart, open, stunned
            hold: { tag: 'spire', x: 16650, z: 296, heart: { x: 16650, z: 400 } },
            adds: ['thrall', 'thrall', 'ghoul'],
          },
          {
            id: 'last', at: KING_AT.last, release: true, rage: true, damage: 1.2, speed: 1.2, callout: 'THE LAST GROUND!',
            squeeze: { x0: 16300, x1: 17000 },
            ai: { attackCooldown: [20, 45], blockChance: 0.1, heavyChance: 0.45, specialEvery: 20 },
          },
        ],
      },
    },
  ],

  // out onto the Keep's last ledge once the sentence is passed and the last words said
  exit: { x: 16300, after: 'oathKept' },

  terrain: [
    // ---- I THE ASH CAUSEWAY: the parapet's merlons along the back (shelter from the gale),
    // and where it's broken, the open edge at the front over the chasm
    { kind: 'block', x0: 420, x1: 470, z0: 282, z1: 300, top: 50 },
    { kind: 'block', x0: 820, x1: 870, z0: 282, z1: 300, top: 50 },
    { kind: 'block', x0: 1220, x1: 1270, z0: 282, z1: 300, top: 50 },
    { kind: 'block', x0: 1620, x1: 1670, z0: 282, z1: 300, top: 50 },
    { kind: 'pit', x0: 640, x1: 980, z0: 492, z1: 520 },
    { kind: 'pit', x0: 1180, x1: 1460, z0: 486, z1: 520 },
    { kind: 'pit', x0: 1560, x1: 1880, z0: 480, z1: 520 },

    // ---- II THE MUSTER HALL: the lower balcony along the back, up two stairs
    { kind: 'block', x0: 2100, x1: 2160, z0: 282, z1: 360, top: 35 },
    { kind: 'block', x0: 2160, x1: 3440, z0: 282, z1: 340, top: 70 },
    { kind: 'block', x0: 3440, x1: 3500, z0: 282, z1: 360, top: 35 },

    // ---- III THE BURNING CELLS: up the tiers of the cell block (each a gallery round the well)
    { kind: 'block', x0: 3900, x1: 4260, z0: 320, z1: 490, top: 70 },
    { kind: 'block', x0: 4260, x1: 4380, z0: 300, z1: 480, top: 140 },
    { kind: 'block', x0: 4380, x1: 4490, z0: 300, z1: 480, top: 70 },   // (the tier below the broken section: a fall costs you one tier)
    { kind: 'crumble', x0: 4410, x1: 4460, z0: 330, z1: 470, top: 140, fall: 34, back: 220 }, // a gallery section half gone
    { kind: 'block', x0: 4490, x1: 4640, z0: 300, z1: 480, top: 140 },
    { kind: 'block', x0: 4640, x1: 4980, z0: 300, z1: 470, top: 210 },
    { kind: 'block', x0: 4980, x1: 6800, ...FULL, top: 280 },   // the top tier, out onto the roof

    // ---- IV THE HEADSMAN'S SCAFFOLD: the scaffold on the roof, and where the roof gives way
    { kind: 'block', x0: 5980, x1: 6420, z0: 330, z1: 470, top: 320 },
    { kind: 'crumble', x0: 6800, x1: 6860, ...FULL, top: 280, fall: 24, back: 400 },
    // (beyond it: the fall, all the way down into the forge)

    // ---- V THE CRUCIBLE LINE: the furnace mouth under the whole cavern, the buckets over it on
    // their chain (running back toward the fire), the gantry stop halfway
    { kind: 'pit', x0: 7180, x1: 8400, ...FULL },
    { kind: 'block', x0: 7230, x1: 7330, z0: 340, z1: 490, top: 30, carry: -40, look: 'crucible' },
    { kind: 'block', x0: 7380, x1: 7480, z0: 340, z1: 490, top: 30, carry: -40, look: 'crucible' },
    { kind: 'block', x0: 7530, x1: 7630, z0: 340, z1: 490, top: 30, carry: -40, look: 'crucible' },
    { kind: 'block', x0: 7680, x1: 7960, ...FULL, top: 30, look: 'gantry' },
    { kind: 'block', x0: 8010, x1: 8110, z0: 340, z1: 490, top: 30, carry: -50, look: 'crucible' },
    { kind: 'block', x0: 8160, x1: 8260, z0: 340, z1: 490, top: 30, carry: -50, look: 'crucible' },
    { kind: 'block', x0: 8310, x1: 8400, z0: 340, z1: 490, top: 30, carry: -50, look: 'crucible' },

    // ---- VI THE ASH MILL: the still hub in the middle of the turning stone
    { kind: 'block', x0: 9230, x1: 9370, z0: 360, z1: 400, top: 40, look: 'hub' },

    // ---- VII THE KINGS' ROOT: narrow tunnels between the tombs (two crypts open out), the
    // broken floor over the drop in the second
    { kind: 'block', x0: 10200, x1: 10500, z0: 282, z1: 360, top: 300, look: 'tomb' },
    { kind: 'block', x0: 10200, x1: 10500, z0: 470, z1: 520, top: 300, look: 'tomb' },
    { kind: 'block', x0: 10840, x1: 11000, z0: 282, z1: 360, top: 300, look: 'tomb' },
    { kind: 'block', x0: 10840, x1: 11000, z0: 470, z1: 520, top: 300, look: 'tomb' },
    { kind: 'pit', x0: 11060, x1: 11240, ...FULL },
    { kind: 'crumble', x0: 11100, x1: 11150, z0: 330, z1: 480, top: 0, fall: 40, back: 220 },
    { kind: 'crumble', x0: 11190, x1: 11240, z0: 330, z1: 480, top: 0, fall: 40, back: 220 },
    { kind: 'block', x0: 11400, x1: 11700, z0: 282, z1: 360, top: 300, look: 'tomb' },
    { kind: 'block', x0: 11400, x1: 11700, z0: 470, z1: 520, top: 300, look: 'tomb' },

    // ---- VIII THE BURNING SPIRE: the hoist's open front edge
    { kind: 'pit', x0: 11760, x1: 13140, z0: 504, z1: 520 },

    // ---- IX THE CROWN WALK: merlons along the back, the drop all along the front
    { kind: 'block', x0: 13400, x1: 13450, z0: 282, z1: 300, top: 50 },
    { kind: 'block', x0: 13800, x1: 13850, z0: 282, z1: 300, top: 50 },
    { kind: 'block', x0: 14200, x1: 14250, z0: 282, z1: 300, top: 50 },
    { kind: 'pit', x0: 13480, x1: 13760, z0: 482, z1: 520 },
    { kind: 'pit', x0: 13940, x1: 14160, z0: 486, z1: 520 },
    { kind: 'pit', x0: 14340, x1: 14560, z0: 482, z1: 520 },

    // ---- X THE FALLING SPAN: the bridge's broken stretches (planks over the gaps)
    { kind: 'pit', x0: 15000, x1: 15160, ...FULL },
    { kind: 'crumble', x0: 15040, x1: 15100, z0: 340, z1: 480, top: 0, fall: 40, back: 200 },
    { kind: 'pit', x0: 15420, x1: 15540, ...FULL },
    { kind: 'crumble', x0: 15460, x1: 15500, z0: 340, z1: 480, top: 0, fall: 40, back: 200 },

    // ---- XI THE ASHEN THRONE: the dais at the back; the colossus's arms and shoulders, the
    // way up to its crown (steps of stone along the back of the room)
    { kind: 'block', x0: 16200, x1: 16320, z0: 282, z1: 340, top: 60, look: 'arm' },
    { kind: 'block', x0: 16380, x1: 16480, z0: 282, z1: 340, top: 60, look: 'shoulder' },
    { kind: 'block', x0: 16590, x1: 16710, z0: 282, z1: 312, top: 200, look: 'chest' }, // (he's held up here, out of reach)
    { kind: 'block', x0: 16980, x1: 17100, z0: 282, z1: 340, top: 60, look: 'arm' },
  ],

  // violet torches all the way; the forge needs none
  lanterns: [
    { x: 300, z: 290 }, { x: 1000, z: 290 }, { x: 1700, z: 290 }, { x: 2000, z: 290 }, { x: 2800, z: 290 }, { x: 3600, z: 290 },
    { x: 3800, z: 290 }, { x: 5600, z: 290 }, { x: 6600, z: 290 }, { x: 10100, z: 290 }, { x: 11600, z: 290 },
    { x: 13300, z: 290 }, { x: 14100, z: 290 }, { x: 15000, z: 290 }, { x: 16000, z: 290 }, { x: 17300, z: 290 },
  ],

  // the dead (view only): the gibbets' leavings, the Executioner's line
  bodies: [{ x: 360, z: 470, pose: 1 }, { x: 1100, z: 330, pose: 0 }, { x: 6150, z: 460, pose: 2 }, { x: 6260, z: 450, pose: 0 }, { x: 9700, z: 330, pose: 1 }],

  npcs: [
    // THE BURNING CELLS: the village's people, taken north in level 1, a cell on each tier
    {
      id: 'cellsLow', name: 'the village\'s people', x: 4120, z: 336, pose: 'cage', group: true, rescue: 'cage', section: 'cells',
      lock: { x: 4120, z: 370 }, flee: null, gather: { x: 16560, z: 360 },
    },
    {
      id: 'cellsMid', name: 'the smith\'s apprentices', x: 4560, z: 316, pose: 'cage', group: true, rescue: 'cage', section: 'cells',
      lock: { x: 4560, z: 350 }, flee: null, gather: { x: 16620, z: 470 },
    },
    {
      id: 'ilse', name: 'Ilse', x: 5320, z: 300, pose: 'cage', rescue: 'cage', section: 'cells',
      lock: { x: 5320, z: 334 }, flee: null, gather: { x: 16700, z: 450 },
    },
    // THE HEADSMAN'S SCAFFOLD: the last of them, kneeling in a line at the block
    {
      id: 'theLine', name: 'the kneeling line', x: 6250, z: 300, pose: 'group', rescue: 'defend', section: 'scaffold', wave: 1,
      flee: null, gather: { x: 16780, z: 400 },
    },
    // THE CRUCIBLE LINE: the forge's chained workers, on the far landing
    {
      id: 'forge', name: 'the forge\'s chained', x: 8460, z: 296, pose: 'group', rescue: 'wreckage', tag: 'forge',
      flee: null, gather: { x: 16860, z: 360 },
    },
    // at the end: who you saved on the whole road, on the Keep's last ledge
    { id: 'vincentEnd', name: 'Vincent', x: 16900, z: 420, if: 'saved:vincent' },
    { id: 'minersEnd', name: 'the miners', x: 16940, z: 360, pose: 'group', if: 'saved:shelter' },
    { id: 'jorenEnd', name: 'Joren', x: 16960, z: 480, if: 'saved:joren' },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        ['ORYN', 'The Black Keep. It makes its own sky.'],
        ['VEXA', 'Look at its face. He had himself carved into it, sitting on his throne.'],
        ['RURIK', 'Every road we walked ends here. The causeway first. Oryn, the wall. Vexa, under it.'],
      ],
    },
    { id: 'gale', at: 300, lines: [['ORYN', '(from the wall walk) The wind off the chasm! When it howls, get behind the stones!']] },
    { id: 'postern', at: 600, if: 'saved:vincent', lines: [['VINCENT', '(from under the causeway) His doors are mine. I\'ll have the wicket open. Hold them on the bridge.']] },
    { id: 'shields', on: 'fight:causeway', lines: [['VOICE', '(drums, shields slamming together) HOLD THE CAUSEWAY!']] },
    { id: 'doors', on: 'clear:causeway', calm: true, lines: [['VEXA', 'No more running behind carts.'], ['ORYN', 'Then we go in the front.']] },
    { id: 'muster', at: 2050, lines: [['ORYN', 'That\'s every man he has left.'], ['RURIK', 'Then this is the last time we do this.']] },
    { id: 'bows', on: 'fight:muster', lines: [['VEXA', '(from the balcony stair) Crossbows on the balcony! Wreck them!']] },
    { id: 'smoke', on: 'clear:muster', calm: true, lines: [['VEXA', 'The cells are up those stairs. I can smell the smoke from here.']] },
    { id: 'cells', at: 3760, lines: [['RURIK', 'He\'s burning them in their cells. Climb!']] },
    { id: 'cellOpen', on: 'rescued:cellsLow', lines: [['VOICE', '(from the cell) Oath Keepers? You came all this way?'], ['RURIK', 'We said we would. Get down the far stair.']] },
    { id: 'ilse', on: 'rescued:ilse', lines: [['ILSE', 'Rurik! My father... is he alive?'], ['RURIK', 'Hale\'s alive. He\'s waiting for you.']] },
    { id: 'below', on: 'clear:cells', calm: true, lines: [['ILSE', 'They take people down. Below. Nobody comes back up the same.']] },
    { id: 'bell', at: 5600, lines: [['VOICE', '(a bell, slow, on the roof; then a blade coming down)']] },
    { id: 'headsman', on: 'boss:scaffold', lines: [['EXECUTIONER', 'Kneel in the line. It goes quicker.'], ['RURIK', 'Put it down.']] },
    { id: 'theLine', on: 'rescued:theLine', lines: [['VOICE', '(the kneeling line, running for the stair) Go! Go!']] },
    { id: 'fall', on: 'clear:scaffold', calm: true, lines: [['VEXA', 'The roof\'s going. The whole wing is going!'], ['RURIK', 'Then down. It\'s the one way he didn\'t want us to go.']] },
    {
      id: 'forge', at: 6960, calm: true, hold: true,
      lines: [
        ['ORYN', 'It goes down further than it goes up.'],
        ['VEXA', 'Look at them. Chained to the furnace. They breathe it in down here until they stop being people.'],
        ['RURIK', 'That\'s what they were taking ours for. The men who burned our homes were somebody\'s homes once.'],
      ],
    },
    { id: 'buckets', at: 7150, lines: [['ORYN', 'The buckets run back to the fire. Keep moving or you go in with the ore!']] },
    { id: 'chained', on: 'rescued:forge', lines: [['VOICE', '(the forge\'s chained, coughing) The mill... it grinds the ash. Stop the mill.']] },
    { id: 'mill', at: 8700, lines: [['VEXA', 'The whole floor\'s turning. Back half one way, front half the other!']] },
    { id: 'forgemaster', on: 'boss:mill', lines: [['FORGEMASTER', 'You\'ve put my fire out of breath. I\'ll feed you to it.']] },
    { id: 'reverse', on: 'phase:mill:reverse', lines: [['ORYN', 'He\'s turned it round! The other way!']] },
    { id: 'pins', on: 'broken:pins', lines: [['VOICE', '(iron shrieking; the mill grinding to a stop; fire roaring up every pipe)']] },
    { id: 'pipes', on: 'clear:mill', calm: true, lines: [['ORYN', 'That fire\'s going somewhere.'], ['VEXA', 'Up. Where he is.']] },
    {
      id: 'kings', at: 10180, calm: true,
      lines: [
        ['ORYN', 'Kings before him. All of them down here.'],
        ['RURIK', 'He\'ll not be buried with them.'],
      ],
    },
    { id: 'statues', at: 10560, lines: [['VEXA', '(very quiet) That statue just moved its eyes.']] },
    { id: 'shaft', on: 'clear:root', calm: true, lines: [['VEXA', '(looking up the shaft) Oh, no.'], ['RURIK', 'Get on.']] },
    { id: 'hoist', at: 11900, lines: [['ORYN', 'The ore hoist. It goes all the way to the top. So does the fire.']] },
    { id: 'floors', on: 'fight:spire', lines: [['VOICE', '(the hoist lurching, rising; the first floor coming down past it, full of men)']] },
    { id: 'banner', at: 12600, lines: [['RURIK', '(cutting a banner down as it passes) That one\'s ours. He keeps the banners of every town he burned.']] },
    { id: 'voice', on: 'clear:spire', calm: true, lines: [['VAURATH', '(from far above) You climb toward me as if it were a mercy.']] },
    { id: 'top', on: 'clear:spire', calm: true, lines: [['VOICE', '(the hoist slamming into its stops; wind; the whole valley below)'], ['ORYN', 'You can see home from here.']] },
    { id: 'guard', on: 'boss:crown', lines: [['VOICE', '(two knights in black and gold, drawing together) For the Crown.']] },
    { id: 'guardGrief', on: 'twin:crown', lines: [['VOICE', '(the last knight, alone) I\'ll hold this door alone, then.']] },
    { id: 'run', on: 'enter:span', lines: [['ORYN', 'It\'s all coming down!'], ['RURIK', 'Not before he does. RUN!']] },
    {
      id: 'doorsThrone', at: 15780, calm: true, hold: true,
      lines: [
        ['VEXA', 'Whatever\'s in there.'],
        ['ORYN', 'Together.'],
        ['RURIK', 'For our people. For our home.'],
      ],
    },
    {
      id: 'king', on: 'boss:throne',
      lines: [
        ['VAURATH', 'Three villagers. Do you know how many villages I have burned?'],
        ['RURIK', 'Ours was the last.'],
      ],
    },
    { id: 'parry', on: 'counter', lines: [['ORYN', 'He reads every swing. Wait for his, and parry!']] },
    { id: 'obeys', on: 'phase:throne:keep', lines: [['VAURATH', 'This Keep is mine. Every stone of it.'], ['VEXA', 'The pillars! Break the fire pillars!']] },
    { id: 'kneel', on: 'phase:throne:colossus', lines: [['VAURATH', '(from everywhere at once) KNEEL.'], ['ORYN', 'The statue... it\'s him. Up the arms! Break the crown!']] },
    { id: 'haul', on: 'phase:throne:colossus', if: 'saved:shelter', lines: [['MINER', '(from the walls) OATH KEEPERS! On the chains, lads! Pin its arms!']] },
    { id: 'heart', on: 'heart', lines: [['RURIK', 'The heart! He\'s in its heart! Now!']] },
    { id: 'last', on: 'phase:throne:last', lines: [['VOICE', '(the colossus coming apart; the Keep falling into its own forge)']] },
    {
      id: 'oathKept', on: 'clear:throne', calm: true, hold: true,
      lines: [
        ['VOICE', '(the Keep coming down behind them, into its own fire)'],
        ['ORYN', 'It\'s over.'],
        ['VEXA', 'Let\'s go home.'],
        ['RURIK', 'We stand for our people. We stand for our home. The oath is kept.'],
      ],
    },
  ],
};
