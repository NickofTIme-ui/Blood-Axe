// stageMine.js — THE CAMPAIGN, LEVEL 3: HOLLOW MOUNTAIN (docs/campaign/plan.md). The pass
// is buried, so the Oath Keepers follow the convoy's tracks under the mountain, into the
// old mine where the Ashen King works his captives to death. Torchlit rock, cold blue
// water, iron. Everything here is drawn in code (view/MineView.js, view/CrusherView.js);
// the painted art is requested in docs/campaign/art-levels-1-2.md.
//
// Same format as data/stageWood.js. New here: terrain blocks with a `tag` that a prop's
// `opens` takes away (a portcullis raised by its counterweight, a fall of rock dug out:
// Stage.openWay), the collapse (hazard 'collapse': a front of falling rock that chases you),
// falling rocks (beam hazards with `look: 'rock'`) and a war machine boss (`crusher`).
// Built for the weakest jumper, walking, no upgrades (ups of 85 at most, gaps of 60 at
// most); a test walks it with every hero.
//
// THE ROUTE
//   I   THE MINE MOUTH        the old mine road; the others go ahead down a side gallery; the
//                             convoy's guards at the cart rails
//   II  THE WORKINGS          captives chained to posts at the ore face, their overseers:
//                             strike the shackles. A shrine
//   III THE LIFT SHAFT        up the old workings onto a gallery over the shaft, planks over the
//                             drop; a lift to a high ledge (optional: a boy left up there); down
//                             to a portcullis chained to its counterweight: break the chain
//   IV  THE UNDERGROUND RIVER stepping stones over cold black water, a log over the second
//                             channel; THE CHAIN WARDEN on the far bank
//   V   THE CRUSHER HALL      a shrine; THE ORE CRUSHER, the war machine: its furnace vents at
//                             two thirds, the roof starts coming down at one third
//   VI  THE COLLAPSE          the mine coming down behind you, a wall of rock spikes: run, over
//                             planks, over a spur of rock, under falling rock
//   VII THE BROKEN GALLERY    still running: up onto the old gallery and pillar to pillar over the
//                             drop, the rotten ones giving way
//   VIII THE LAST LEAP        through a rain of rock, over the chasm on planks that climb to the
//                             far bank; dig out the escape passage (the miners inside)
//   IX  THE FAR SIDE          daylight on the mountain's far face; the saved gather; on

const FULL = { z0: 282, z1: 520 };

export const STAGE_MINE = {
  id: 'hollowMountain',
  name: 'HOLLOW MOUNTAIN',
  chapter: 'III',
  next: { id: 'shatteredAscent', name: 'THE SHATTERED ASCENT', chapter: 'IV' },
  doneTitle: 'OUT OF THE MOUNTAIN',
  width: 11700,
  theme: 'mine',
  tall: true,
  castle: { x: 760, scale: 0.8, detail: 0.6 }, // (seen only from the far side, at the end)
  music: 'caves', // (core/Music.js)
  companions: { leaveAfter: 'opening', meet: 11100, farewell: 'daylight' },

  sections: [
    {
      id: 'mouth', name: 'THE MINE MOUTH', x0: 0, x1: 1300,
      spawn: { x: 150, z: 440 },
      objective: 'Follow the tracks into the mountain',
      hint: 'Hop the ore cart',
      fightAt: 860,
      waves: [['grunt', 'grunt', 'stalker'], ['butcher', 'grunt']],
      props: [
        { kind: 'crate', x: 1180, z: 480, drop: 'health' },
        { kind: 'barrel', x: 420, z: 300, drop: null },
      ],
      hazards: [],
    },
    {
      id: 'workings', name: 'THE WORKINGS', x0: 1300, x1: 2800,
      spawn: { x: 1360, z: 440 },
      objective: 'Strike the shackles',
      hint: 'Break the posts they are chained to',
      fightAt: 1600,
      waves: [['grunt', 'butcher', 'grunt', 'grunt'], ['ghoul', 'grunt', 'stalker'], [...Array(10).fill('thrall'), 'ghoul']], // (the last: the HORDE)
      props: [
        { kind: 'shackle', tag: 'tobin', x: 1900, z: 300, drop: null },
        { kind: 'shackle', tag: 'hilde', x: 2160, z: 300, drop: null },
        { kind: 'shackle', tag: 'miners', x: 2440, z: 300, drop: null },
        { kind: 'barrel', x: 2620, z: 490, drop: 'health' },
      ],
      hazards: [],
      rest: { x: 2700, z: 320, kind: 'oath' },
    },
    {
      id: 'shaft', name: 'THE LIFT SHAFT', x0: 2800, x1: 4300,
      spawn: { x: 2860, z: 440 },
      objective: 'Raise the portcullis',
      hint: 'Break the counterweight\'s chain to raise the gate',
      fightAt: 3860,
      waves: [['grunt', 'stalker', 'grunt'], ['butcher', 'ghoul']],
      props: [
        // the counterweight: its chain holds the portcullis down (`opens` the terrain tagged
        // 'portcullis')
        { kind: 'counterweight', tag: 'counterweight', x: 4060, z: 320, opens: 'portcullis', drop: null },
        { kind: 'crate', x: 3900, z: 490, drop: 'mana' },
      ],
      hazards: [],
    },
    {
      id: 'river', name: 'THE UNDERGROUND RIVER', x0: 4300, x1: 5800,
      spawn: { x: 4360, z: 440 },
      objective: 'Kill the Chain Warden',
      hint: 'Stepping stones: tap jump from stone to stone',
      fightAt: 5260,
      waves: [['grunt', 'stalker', 'grunt']],
      props: [{ kind: 'barrel', x: 5700, z: 300, drop: 'health' }],
      hazards: [],
      // the keeper of the chains: the Ghoul's kind, grown into the mine's jailer
      boss: {
        type: 'ghoul', name: 'The Chain Warden', health: 2.6, damage: 1.1,
        entrance: { from: 140, to: 320, speed: 66, stepEvery: 30, awe: 20 },
        // beaten: his crimes and his sentence (stage/Sentence.js)
        sentence: {
          speaker: 'WARDEN',
          crimes: [
            'You chained our people in the dark and worked them for the King\'s iron.',
            'You whipped the old until they fell, and left them where they fell.',
          ],
          last: 'Every chain in this mountain is mine. Even now.',
          silent: true, // (asked for his last words, he says nothing)
        },
        phases: [
          { id: 'chains', at: 0.5, rage: true, adds: ['ghoul', 'grunt'], damage: 1.2, speed: 1.15 },
        ],
      },
    },
    {
      id: 'crusher', name: 'THE CRUSHER HALL', x0: 5800, x1: 7300,
      spawn: { x: 5860, z: 440 },
      objective: 'Wreck the Ore Crusher',
      hint: 'Iron does not flinch: hit it between its blows',
      fightAt: 6150,
      waves: [['grunt', 'grunt', 'stalker']],
      props: [{ kind: 'crate', x: 7200, z: 480, drop: 'health' }],
      hazards: [
        // its furnace vents from two thirds on; the roof starts coming down at one third
        { type: 'fire', when: 'phase:furnace', x: 6400, z: 340, w: 110, d: 60, phase: 0 },
        { type: 'fire', when: 'phase:furnace', x: 6850, z: 470, w: 110, d: 60, phase: 105 },
        { type: 'beam', look: 'rock', when: 'phase:overdrive', x: 6250, z: 450, w: 80, d: 70, period: 220, warn: 80, phase: 40 },
        { type: 'beam', look: 'rock', when: 'phase:overdrive', x: 6600, z: 330, w: 80, d: 70, period: 220, warn: 80, phase: 150 },
        { type: 'beam', look: 'rock', when: 'phase:overdrive', x: 7000, z: 420, w: 80, d: 70, period: 260, warn: 90, phase: 90 },
      ],
      rest: { x: 5900, z: 320, kind: 'oath' },
      boss: {
        type: 'crusher', name: 'The Ore Crusher', health: 1.3, damage: 1, escort: ['grunt'],
        entrance: { from: 160, to: 360, speed: 40, stepEvery: 40, awe: 40 },
        sentence: false, // (a machine answers for nothing: its overseer ran; stage/Sentence.js)
        phases: [
          { id: 'furnace', at: 0.66, adds: ['grunt', 'grunt'] },
          { id: 'overdrive', at: 0.33, rage: true, adds: ['stalker'], damage: 1.2, speed: 1.5, ai: { attackCooldown: [24, 60] } },
        ],
      },
    },
    // ---- THE CHASE (VI-VIII): the mine coming down behind you, a wall of rock spikes that
    // never stops. Three stretches, each a checkpoint and each faster than the last; the wall
    // picks up where it was when you run into the next one (Stage.updateCollapse), and it
    // lurches forward in surges. Planks that give way, a broken gallery of pillars over the
    // drop, a gauntlet of falling rock, and a last leap over the chasm to the passage.
    {
      id: 'collapse', name: 'THE COLLAPSE', x0: 7300, x1: 8600,
      spawn: { x: 7380, z: 440 },
      objective: 'Run! Outrun the falling mountain',
      hint: 'Do not stop. The rock will not',
      waves: [],
      props: [],
      hazards: [
        { type: 'collapse', x0: 7280, to: 8900, speed: 95, surge: { every: 300, for: 50, mult: 1.7 } },
        { type: 'beam', look: 'rock', x: 7560, z: 420, w: 80, d: 80, period: 170, warn: 70, phase: 60 },
        { type: 'beam', look: 'rock', x: 7980, z: 360, w: 80, d: 80, period: 150, warn: 60, phase: 120 },
        { type: 'beam', look: 'rock', x: 8230, z: 420, w: 90, d: 90, period: 140, warn: 60, phase: 10 },
        { type: 'beam', look: 'rock', x: 8460, z: 460, w: 80, d: 80, period: 160, warn: 60, phase: 90 },
      ],
    },
    {
      id: 'gallery', name: 'THE BROKEN GALLERY', x0: 8600, x1: 9900,
      spawn: { x: 8680, z: 440 },
      objective: 'Run! Leap the broken gallery',
      hint: 'Pillar to pillar. The rotten ones fall away under you',
      waves: [],
      props: [],
      hazards: [
        { type: 'collapse', x0: 8560, to: 9900, speed: 105, damage: 28, surge: { every: 260, for: 50, mult: 1.7 } },
        { type: 'beam', look: 'rock', x: 8820, z: 420, w: 90, d: 90, period: 150, warn: 60, phase: 30 },
        { type: 'beam', look: 'rock', x: 9700, z: 415, w: 90, d: 100, period: 130, warn: 55, phase: 70 },
        { type: 'beam', look: 'rock', x: 9840, z: 400, w: 90, d: 100, period: 140, warn: 60, phase: 0 },
      ],
    },
    {
      id: 'leap', name: 'THE LAST LEAP', x0: 9900, x1: 11000,
      spawn: { x: 9980, z: 440 },
      objective: 'Run! Over the chasm, dig out the passage',
      hint: 'Through the falling rock, over the chasm. Break the fallen rock at the end',
      waves: [],
      props: [
        // the escape passage, choked with fallen rock: the last miners are behind it
        { kind: 'rubble', tag: 'passage', x: 10820, z: 400, opens: 'passage', drop: null },
      ],
      hazards: [
        { type: 'collapse', x0: 9860, to: 10620, speed: 118, damage: 30, surge: { every: 220, for: 50, mult: 1.7 } },
        // the gauntlet: the roof coming down in a rain of rock
        { type: 'beam', look: 'rock', x: 10020, z: 340, w: 90, d: 90, period: 110, warn: 50, phase: 0 },
        { type: 'beam', look: 'rock', x: 10090, z: 450, w: 90, d: 90, period: 110, warn: 50, phase: 35 },
        { type: 'beam', look: 'rock', x: 10160, z: 380, w: 90, d: 90, period: 110, warn: 50, phase: 70 },
        { type: 'beam', look: 'rock', x: 10230, z: 470, w: 90, d: 90, period: 110, warn: 50, phase: 15 },
        // (and on whoever stops to dig at the passage)
        { type: 'beam', look: 'rock', x: 10780, z: 415, w: 80, d: 100, period: 120, warn: 55, phase: 50 },
      ],
    },
    {
      id: 'far', name: 'THE FAR SIDE', x0: 11000, x1: 11700,
      spawn: { x: 11060, z: 440 },
      objective: 'Out into the light',
      hint: '',
      waves: [],
      props: [],
      hazards: [],
    },
  ],

  // out onto the mountain's far face once the last words are said
  exit: { x: 11500, after: 'daylight' },

  terrain: [
    // ---- I THE MINE MOUTH: an ore cart on its rails to hop (or walk round)
    { kind: 'block', x0: 600, x1: 690, z0: 390, z1: 470, top: 40 },

    // ---- III THE LIFT SHAFT: up the old workings onto the gallery, planks over the shaft
    { kind: 'block', x0: 3000, x1: 3200, ...FULL, top: 70 },              // +70
    { kind: 'block', x0: 3200, x1: 3420, ...FULL, top: 140 },             // +70: the gallery
    { kind: 'pit', x0: 3420, x1: 3620, ...FULL },                        // the shaft
    { kind: 'crumble', x0: 3460, x1: 3520, z0: 350, z1: 470, top: 140, fall: 40, back: 200 }, // gap 40
    { kind: 'crumble', x0: 3565, x1: 3620, z0: 350, z1: 470, top: 140, fall: 40, back: 200 }, // gap 45
    { kind: 'block', x0: 3620, x1: 3760, ...FULL, top: 140 },             // the gallery goes on
    // (the lift up to the high ledge at the back: the optional rescue)
    { kind: 'lift', x0: 3650, x1: 3730, z0: 282, z1: 340, top: 140, move: { axis: 'top', range: 120, period: 300, phase: 0 } },
    { kind: 'block', x0: 3540, x1: 3650, z0: 282, z1: 330, top: 260 },    // the high ledge
    { kind: 'block', x0: 3760, x1: 3840, ...FULL, top: 70 },              // down
    // the portcullis: iron, chained to its counterweight (gone once that's broken)
    { kind: 'block', tag: 'portcullis', mat: 'iron', x0: 4160, x1: 4190, ...FULL, top: 300 },

    // ---- IV THE UNDERGROUND RIVER: stones over the first channel, a log over the second
    { kind: 'pit', x0: 4500, x1: 4760, ...FULL },
    { kind: 'block', x0: 4550, x1: 4600, z0: 360, z1: 480, top: 20 },    // gap 50
    { kind: 'block', x0: 4655, x1: 4705, z0: 360, z1: 480, top: 20 },    // gap 55, then 55 to the bank
    { kind: 'pit', x0: 5000, x1: 5180, ...FULL },
    { kind: 'block', x0: 4980, x1: 5200, z0: 380, z1: 470, top: 10, mat: 'log' },

    // ---- VI THE COLLAPSE: a chasm with planks over it, then up over a spur of rock and down
    { kind: 'pit', x0: 7700, x1: 7900, ...FULL },
    { kind: 'crumble', x0: 7740, x1: 7800, z0: 350, z1: 480, top: 0, fall: 30, back: 160 }, // gap 40
    { kind: 'crumble', x0: 7845, x1: 7900, z0: 350, z1: 480, top: 0, fall: 30, back: 160 }, // gap 45
    { kind: 'block', x0: 8100, x1: 8180, ...FULL, top: 60 },              // +60
    { kind: 'block', x0: 8180, x1: 8330, ...FULL, top: 130 },             // +70: the spur
    { kind: 'block', x0: 8330, x1: 8400, ...FULL, top: 60 },              // down

    // ---- VII THE BROKEN GALLERY: up onto the old gallery, then pillar to pillar over the drop
    { kind: 'block', x0: 8780, x1: 8870, ...FULL, top: 70 },              // +70
    { kind: 'block', x0: 8870, x1: 9000, ...FULL, top: 140 },             // +70: the gallery
    { kind: 'pit', x0: 9000, x1: 9520, ...FULL },                         // the drop
    { kind: 'block', x0: 9050, x1: 9110, z0: 350, z1: 480, top: 140 },    // gap 50
    { kind: 'crumble', x0: 9165, x1: 9220, z0: 350, z1: 480, top: 140, fall: 26, back: 180 }, // gap 55
    { kind: 'block', x0: 9275, x1: 9335, z0: 350, z1: 480, top: 140 },   // gap 55
    { kind: 'crumble', x0: 9390, x1: 9445, z0: 350, z1: 480, top: 140, fall: 26, back: 180 }, // gap 55
    { kind: 'block', x0: 9500, x1: 9640, ...FULL, top: 140 },             // gap 55: the far end
    { kind: 'block', x0: 9640, x1: 9740, ...FULL, top: 70 },              // down

    // ---- VIII THE LAST LEAP: the rain of rock, then the chasm on planks that climb to the far
    // bank, and the choked passage
    { kind: 'pit', x0: 10400, x1: 10660, ...FULL },
    { kind: 'crumble', x0: 10450, x1: 10505, z0: 350, z1: 480, top: 0, fall: 24, back: 160 },   // gap 50
    { kind: 'crumble', x0: 10560, x1: 10610, z0: 350, z1: 480, top: 40, fall: 24, back: 160 },  // gap 55, +40
    { kind: 'block', x0: 10660, x1: 10740, ...FULL, top: 40 },            // gap 50: the far bank
    { kind: 'block', tag: 'passage', mat: 'rubble', x0: 10880, x1: 10950, ...FULL, top: 320 },
  ],

  // torches on the walls marking the way
  lanterns: [
    { x: 500, z: 290 }, { x: 1500, z: 290 }, { x: 2700, z: 290 }, { x: 3200, z: 290 }, { x: 4140, z: 290 },
    { x: 4900, z: 290 }, { x: 5900, z: 290 }, { x: 7300, z: 290 }, { x: 8000, z: 290 }, { x: 8800, z: 290 },
    { x: 9700, z: 290 }, { x: 10360, z: 290 }, { x: 10780, z: 290 },
  ],

  // the dead (view only): worked to death and left where they fell
  bodies: [{ x: 1100, z: 480, pose: 1 }, { x: 2000, z: 500, pose: 0 }, { x: 3900, z: 330, pose: 2 }, { x: 5500, z: 480, pose: 1 }],

  npcs: [
    {
      id: 'tobin', name: 'Old Tobin', x: 1900, z: 312, pose: 'chained', rescue: 'wreckage', tag: 'tobin',
      flee: { x: 1400, z: 480 }, gather: { x: 11260, z: 470 },
    },
    {
      id: 'hilde', name: 'Hilde', x: 2160, z: 312, pose: 'chained', rescue: 'wreckage', tag: 'hilde',
      flee: { x: 1400, z: 400 }, gather: { x: 11340, z: 380 },
    },
    {
      id: 'miners', name: 'the chained miners', x: 2440, z: 312, pose: 'chained', group: true, rescue: 'wreckage', tag: 'miners',
      flee: { x: 1400, z: 330 }, gather: { x: 11200, z: 330 },
    },
    // (optional: left on the high ledge when the lift was cut; reach him)
    { id: 'pip', name: 'Pip', x: 3600, z: 300, pose: 'child', rescue: 'reach', flee: null, gather: { x: 11400, z: 330 } },
    // behind the fallen rock in the escape passage
    {
      id: 'passage', name: 'the miners in the passage', x: 10990, z: 400, pose: 'group', rescue: 'wreckage', tag: 'passage',
      flee: { x: 11280, z: 500 }, gather: { x: 11300, z: 500 },
    },
  ],

  story: [
    {
      id: 'opening', on: 'start', hold: true, delay: 150,
      lines: [
        ['ORYN', 'The old mine. The tracks go in, and nothing comes out.'],
        ['VEXA', 'There is a side gallery. Oryn and I will find another way through.'],
        ['RURIK', 'Then I follow the tracks. Whoever they chained down here, we bring out.'],
      ],
    },
    { id: 'hammers', at: 1440, lines: [['VOICE', '(hammers on rock, a whip cracking) Faster, you dogs! The King wants his iron!']] },
    { id: 'tobin', on: 'rescued:tobin', lines: [['TOBIN', 'Free... After forty days. Bless you, Oath Keeper.']] },
    { id: 'hilde', on: 'rescued:hilde', lines: [['HILDE', 'They took my brother deeper in. To the crusher. Please.']] },
    { id: 'miners', on: 'rescued:miners', lines: [['MINER', 'Out, lads! Back down the tunnel, toward the light!']] },
    { id: 'shaft', at: 2900, calm: true, lines: [['VEXA', '(echoing from far off) The gate below is chained to a counterweight. Break the chain!']] },
    { id: 'pip', on: 'rescued:pip', lines: [['PIP', 'They cut the lift and left me! I will climb down the ladder at the back. Go!']] },
    { id: 'river', at: 4400, calm: true, lines: [['ORYN', '(from the dark) Cold water runs under the mountain. Do not fall in: it will carry you away.']] },
    { id: 'warden', on: 'boss:river', lines: [['WARDEN', 'Every chain in this mountain is mine. I will find one for you.']] },
    { id: 'wardenChains', on: 'phase:river:chains', lines: [['WARDEN', 'Up, my ghouls! Drag them down to the water!']] },
    { id: 'hall', at: 5880, calm: true, lines: [['ORYN', '(from above) There is a machine in the next hall. Kneel at the shrine first. You will need it.']] },
    { id: 'crusher', on: 'boss:crusher', lines: [['OVERSEER', 'Feed the furnace! Let the Oath Keepers meet the Crusher!']] },
    { id: 'furnace', on: 'phase:crusher:furnace', lines: [['OVERSEER', 'Vent the furnace! Burn them where they stand!']] },
    { id: 'overdrive', on: 'phase:crusher:overdrive', lines: [['OVERSEER', 'Full steam! Bring the roof down, bring it all down!']] },
    {
      id: 'collapse', on: 'clear:crusher', calm: true,
      lines: [['RURIK', 'The roof is coming down. Run!']],
    },
    { id: 'gallery', at: 8720, lines: [['RURIK', 'The gallery is broken through! Jump, and do not look down!']] },
    { id: 'leap', at: 10000, lines: [['VOICE', '(the whole mountain groaning) It is all coming down! Faster!']] },
    { id: 'passageCry', at: 10300, lines: [['VOICE', 'Here! The passage, behind the rocks! We are trapped!']] },
    { id: 'passage', on: 'rescued:passage', lines: [['MINER', 'Light! I can see daylight through there! Go, go!']] },
    { id: 'gathered', at: 11160, calm: true, if: 'rescued:tobin', lines: [['TOBIN', 'Every one of us that walks out of that mountain owes it to you.']] },
    {
      id: 'daylight', at: 11300, calm: true, hold: true,
      lines: [
        ['VEXA', 'Daylight. And there, across the gorge... the Black Keep.'],
        ['ORYN', 'The convoy went up the old road. The cliffs are all that is left between us and the gates.'],
        ['RURIK', 'Then we climb. Their King has run out of mountain to hide behind.'],
      ],
    },
  ],

  // the third castle cutaway, after the level (scenes/CutawayScene.js)
  cutaway: 'collapse',
};
