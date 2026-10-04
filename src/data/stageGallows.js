// stageGallows.js — THE GALLOWS ASCENT: the first playable slice of the platforming
// update. A night climb up the hangman's cliff to the gallows, mist-blue and rust,
// lanterns marking the way. Same format as data/stage.js, plus:
//
//   width      the stage's length in px (the camera and backdrop use it)
//   theme      'gallows': the backdrop and colours (view/TerrainView.js)
//   tall       the camera follows the heroes up and down (ledges reach above the screen)
//   terrain    ledges, pits, lifts and rotten planks (stage/Terrain.js)
//   lanterns   { x, z, y } landmarks along the route (view only)
//   rests      { x, z, y? } rest shrines: healed, a checkpoint, and the skill tree
//   section.spawn    where the heroes stand when they start (or restart) the section
//   section.spawns   where its men come from (inPlace: already standing there)
//   section.hint     a line under the objective teaching what the section is about
//
// THE MAIN ROUTE is built for the weakest jumper, Rurik (walking, no sprint, no upgrades):
// a full jump rises 122 px and carries 118 px on the flat (101 px while climbing 60); a
// TAPPED hop rises only 54. So the route asks for real jumps: steps of 80-90 that only a
// held jump clears, gaps of 60-80 over pits that need a jump taken late off the edge,
// planks that drop under you, and a cage you have to time. Every serious jump is over a
// pit: a fall costs a fifth of your health and puts you back a few seconds.
// Enemies hop ledges up to ~85 px and gaps up to ~70 (stage/Terrain.js, entities/Enemy.js).
// The ROOST (the secret) is 150 px over the ledge below it: Vexa's double jump, Oryn's
// higher levitation (jump against its face and he rises over it) or Rurik with WIND STEP
// (his skill tree) reach it; Rurik's own jump falls short. Nobody needs it.

const FULL = { z0: 282, z1: 520 }; // the whole depth of the lane

export const STAGE_GALLOWS = {
  name: 'THE GALLOWS ASCENT',
  width: 6800,
  theme: 'gallows',
  tall: true,
  sections: [
    {
      id: 'stair', name: "THE HANGMAN'S STAIR", x0: 0, x1: 1400,
      spawn: { x: 140, z: 440 },
      objective: 'Climb the stair',
      hint: 'Tap jump for a hop — HOLD it to clear the tall steps',
      waves: [],
      props: [{ kind: 'crate', x: 880, z: 470, drop: 'meat' }],
      hazards: [],
    },
    {
      id: 'yard', name: 'THE GIBBET YARD', x0: 1400, x1: 2400,
      spawn: { x: 1500, z: 440 },
      objective: 'Hold the yard',
      hint: 'Open ground: keep them in front of you',
      // a crowd, then a mix that punishes standing still (the stalker darts, the berserker charges)
      waves: [['grunt', 'grunt', 'butcher'], ['stalker', 'grunt', 'berserker']],
      props: [
        { kind: 'crate', x: 1720, z: 300, drop: 'meat' },
        { kind: 'barrel', x: 2180, z: 505, drop: 'wine' },
        // the OPTIONAL fight: strike the iron bell and Pitlord Kragg answers. Beat him for a
        // skill point (stage.challenge; view: the bell)
        { kind: 'bell', x: 2240, z: 300, drop: null, challenge: ['gladiator'] },
      ],
      hazards: [],
      rest: { x: 2320, z: 400 },
    },
    {
      id: 'climb', name: 'THE ROTTEN CLIMB', x0: 2400, x1: 3700,
      spawn: { x: 2440, z: 440 },
      objective: 'Ride the cage, climb the planks',
      hint: 'Rotten planks drop under you: jump on, jump off',
      waves: [],
      props: [
        // the ROOST's prize (a secret: a relic and a skill point)
        { kind: 'crate', x: 3650, z: 305, drop: 'relic', secret: true },
        { kind: 'barrel', x: 3780, z: 480, drop: 'mana' },
      ],
      hazards: [],
    },
    {
      id: 'walk', name: 'THE BROKEN WALK', x0: 3700, x1: 4700,
      spawn: { x: 3760, z: 415 },
      objective: 'Kick them into the dark',
      hint: 'Jump the gaps; a kick sends a man off the end of the walk',
      // they stand on the walk's broken pieces: kick them into the gaps
      waves: [['grunt', 'grunt', 'grunt'], ['penitent', 'ghoul']],
      // they come along the walk from the far end, jumping the gaps (the Penitent is too
      // slow to clear one: he holds his piece of the walk until you come to him)
      spawns: [
        [{ x: 4660, z: 405 }, { x: 4660, z: 425 }, { x: 4660, z: 415 }],
        [{ x: 4660, z: 415 }, { x: 4660, z: 400 }],
      ],
      props: [],
      hazards: [],
    },
    {
      id: 'gallery', name: 'THE BLADE GALLERY', x0: 4700, x1: 5700,
      spawn: { x: 4900, z: 430 },
      objective: 'Clear the gallery',
      hint: 'Strike a blade and it swings for you',
      // stalkers drop on you from the balcony while the floor fills up; the blades cut both ways
      waves: [['stalker', 'stalker', 'grunt', 'grunt'], ['berserker', 'ghoul', 'grunt']],
      // the stalkers come along the balcony and drop on you; the rest up the floor
      spawns: [
        [{ x: 5450, z: 312 }, { x: 5450, z: 330 }, { x: 5820, z: 450 }, { x: 5820, z: 390 }],
        [{ x: 5820, z: 450 }, { x: 5820, z: 390 }, { x: 5820, z: 480 }],
      ],
      props: [{ kind: 'crate', x: 5000, z: 495, drop: 'meat' }],
      hazards: [
        { type: 'blade', x: 5150, z: 440, swing: 90, phase: 0 },
        { type: 'blade', x: 5420, z: 470, swing: 90, phase: 70 },
      ],
    },
    {
      id: 'gallows', name: 'THE GALLOWS', x0: 5700, x1: 6800,
      spawn: { x: 5760, z: 440 },
      objective: 'Cut down the Hangman',
      hint: 'The trapdoor gives way under anyone',
      waves: [['grunt', 'ghoul', 'stalker']],
      props: [{ kind: 'barrel', x: 6560, z: 300, drop: 'meat' }],
      hazards: [{ type: 'fire', x: 6300, z: 470, w: 120, d: 70, phase: 0 }],
      rest: { x: 5800, z: 330 },
      // the elite: a berserker grown huge on the gallows, his men come at half health
      boss: { type: 'berserker', name: 'Hruk the Hangman', health: 2.6, damage: 1.1, adds: ['stalker', 'grunt', 'grunt'] },
    },
  ],

  terrain: [
    // ---- 1 THE HANGMAN'S STAIR: teaches the HELD jump. Its gap falls onto a low step, not a pit.
    { kind: 'block', x0: 360, x1: 520, ...FULL, top: 50 },     // a hop gets you up
    { kind: 'block', x0: 520, x1: 680, ...FULL, top: 135 },    // +85: only a held jump
    { kind: 'block', x0: 680, x1: 770, ...FULL, top: 50 },     // the gap's floor: a step back down, not a pit
    { kind: 'block', x0: 770, x1: 960, ...FULL, top: 135 },    // a 90 px gap at the top: jump late
    { kind: 'block', x0: 960, x1: 1100, ...FULL, top: 70 },

    // ---- 3 THE ROTTEN CLIMB: the cage over a pit, then rotten planks climbing over a wide one
    { kind: 'block', x0: 2480, x1: 2605, ...FULL, top: 60 },
    { kind: 'pit', x0: 2605, x1: 2860, ...FULL },
    // (the cage meets each ledge flush at the ends of its run: no crack to fall through)
    { kind: 'lift', x0: 2600, x1: 2690, z0: 370, z1: 460, top: 60, move: { axis: 'x', range: 160, period: 240, phase: 0 } },
    { kind: 'block', x0: 2845, x1: 2980, ...FULL, top: 60 },
    { kind: 'pit', x0: 2980, x1: 3460, ...FULL },
    { kind: 'crumble', x0: 3040, x1: 3110, z0: 350, z1: 470, top: 120, fall: 30, back: 220 },  // +60 over a 60 gap
    { kind: 'crumble', x0: 3175, x1: 3260, z0: 350, z1: 470, top: 180, fall: 30, back: 220 },  // +60 over a 65 gap
    { kind: 'crumble', x0: 3340, x1: 3400, z0: 350, z1: 470, top: 210, fall: 30, back: 220 },  // +30 over an 80 gap
    { kind: 'block', x0: 3455, x1: 3820, ...FULL, top: 160 },                                  // down onto the ledge
    // the ROOST: a crow-cage ledge high at the back (optional: double jump / Oryn's rise / WIND STEP)
    { kind: 'block', x0: 3560, x1: 3740, z0: 282, z1: 335, top: 310 },

    // ---- 4 THE BROKEN WALK: pieces of walkway over the dark, gaps and steps between
    { kind: 'pit', x0: 3820, x1: 4560, ...FULL },
    { kind: 'block', x0: 3820, x1: 4060, z0: 375, z1: 455, top: 160 },
    { kind: 'block', x0: 4125, x1: 4340, z0: 375, z1: 455, top: 190 },   // gap 65, up 30
    { kind: 'block', x0: 4405, x1: 4560, z0: 375, z1: 455, top: 160 },   // gap 65, down 30
    { kind: 'block', x0: 4560, x1: 4700, ...FULL, top: 160 },

    // ---- 5 THE BLADE GALLERY: down to the floor; a balcony along the back
    { kind: 'block', x0: 4700, x1: 4780, ...FULL, top: 110 },
    { kind: 'block', x0: 4780, x1: 4850, ...FULL, top: 60 },
    { kind: 'block', x0: 4890, x1: 4960, z0: 282, z1: 350, top: 50 },
    { kind: 'block', x0: 4960, x1: 5460, z0: 282, z1: 350, top: 100 },

    // ---- 6 THE GALLOWS: the scaffold, its trapdoor over a drop, and the hoist beside it
    { kind: 'block', x0: 5990, x1: 6050, z0: 300, z1: 420, top: 50 },
    { kind: 'block', x0: 6050, x1: 6180, z0: 300, z1: 420, top: 100 },
    { kind: 'crumble', x0: 6180, x1: 6260, z0: 300, z1: 420, top: 100, fall: 26, back: 300 },
    { kind: 'pit', x0: 6180, x1: 6260, z0: 300, z1: 420 },
    { kind: 'block', x0: 6260, x1: 6400, z0: 300, z1: 420, top: 100 },
    { kind: 'lift', x0: 6420, x1: 6500, z0: 300, z1: 400, top: 0, move: { axis: 'top', range: 150, period: 280, phase: 0 } },
    { kind: 'block', x0: 6500, x1: 6640, z0: 282, z1: 340, top: 150 },
  ],

  lanterns: [
    { x: 520, z: 290 }, { x: 770, z: 290 }, { x: 1400, z: 290 },
    { x: 2480, z: 290 }, { x: 2845, z: 290 }, { x: 3455, z: 290 },
    { x: 3820, z: 380 }, { x: 4560, z: 380 }, { x: 4960, z: 290 }, { x: 5990, z: 300 }, { x: 6400, z: 300 },
  ],
};
