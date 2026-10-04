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
// a full jump rises 89 px and carries 107 px on the flat. So every step up the route is
// <= 40 px, every gap at one height <= 64 px, every gap with a step up <= 55 px.
// Enemies hop ledges up to ~60 px (stage/Terrain.js, entities/Enemy.js terrainSteer).
// The ROOST (the secret) is 120 px over the ledge below it: Vexa's double jump, Oryn's
// higher levitation (jump against its face and he rises over it) or Rurik with WIND STEP
// (his skill tree) reach it; Rurik's own jump falls 30 px short. Nobody needs it.

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
      hint: 'Tap jump for a hop, hold it to leap higher',
      waves: [],
      props: [{ kind: 'crate', x: 900, z: 470, drop: 'meat' }],
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
      objective: 'Ride the cage across',
      hint: 'Rotten planks give way: keep moving',
      waves: [],
      props: [
        // the ROOST's prize (a secret: a relic and a skill point)
        { kind: 'crate', x: 3480, z: 305, drop: 'relic', secret: true },
        { kind: 'barrel', x: 3600, z: 480, drop: 'mana' },
      ],
      hazards: [],
    },
    {
      id: 'walk', name: 'THE BROKEN WALK', x0: 3700, x1: 4700,
      spawn: { x: 3750, z: 415 },
      objective: 'Kick them into the dark',
      hint: 'A kick sends a man off the end of the walk',
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
      spawn: { x: 4740, z: 415 },
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
    // ---- 1 THE HANGMAN'S STAIR: low steps, one forgiving gap (fall in: you're on a low step)
    { kind: 'block', x0: 380, x1: 560, ...FULL, top: 32 },
    { kind: 'block', x0: 560, x1: 720, ...FULL, top: 64 },
    { kind: 'block', x0: 720, x1: 780, ...FULL, top: 32 },   // the gap's floor: a step, not a pit
    { kind: 'block', x0: 780, x1: 1000, ...FULL, top: 64 },
    { kind: 'block', x0: 1000, x1: 1150, ...FULL, top: 32 },

    // ---- 3 THE ROTTEN CLIMB: a ledge, a pit and the gibbet cage that carries you over it
    { kind: 'block', x0: 2480, x1: 2605, ...FULL, top: 40 },
    { kind: 'pit', x0: 2600, x1: 2860, ...FULL },
    // (the cage meets each ledge flush at the ends of its run: no crack to fall through)
    { kind: 'lift', x0: 2600, x1: 2700, z0: 360, z1: 470, top: 40, move: { axis: 'x', range: 150, period: 300, phase: 0 } },
    { kind: 'block', x0: 2845, x1: 3000, ...FULL, top: 40 },
    // ...then rotten planks over the second pit, a little higher each
    { kind: 'pit', x0: 3000, x1: 3280, ...FULL },
    { kind: 'crumble', x0: 3040, x1: 3120, z0: 340, z1: 480, top: 52, fall: 36, back: 200 },
    { kind: 'crumble', x0: 3165, x1: 3245, z0: 340, z1: 480, top: 64, fall: 36, back: 200 },
    { kind: 'block', x0: 3280, x1: 3820, ...FULL, top: 64 },
    // the ROOST: a crow-cage ledge high at the back (optional: double jump / air blink / WIND STEP)
    { kind: 'block', x0: 3400, x1: 3560, z0: 282, z1: 335, top: 184 },

    // ---- 4 THE BROKEN WALK: three pieces of walkway over the dark, gaps between
    { kind: 'pit', x0: 3820, x1: 4560, ...FULL },
    { kind: 'block', x0: 3820, x1: 4070, z0: 375, z1: 455, top: 64 },
    { kind: 'block', x0: 4120, x1: 4350, z0: 375, z1: 455, top: 64 },   // gaps of 50: a hero clears them easily,
    { kind: 'block', x0: 4400, x1: 4560, z0: 375, z1: 455, top: 64 },   // a grunt just about
    { kind: 'block', x0: 4560, x1: 4700, ...FULL, top: 64 },

    // ---- 5 THE BLADE GALLERY: down to the floor; a balcony along the back
    { kind: 'block', x0: 4700, x1: 4780, ...FULL, top: 32 },
    { kind: 'block', x0: 4890, x1: 4960, z0: 282, z1: 350, top: 36 },
    { kind: 'block', x0: 4960, x1: 5460, z0: 282, z1: 350, top: 72 },

    // ---- 6 THE GALLOWS: the scaffold, its trapdoor over a drop, and the hoist beside it
    { kind: 'block', x0: 5990, x1: 6050, z0: 300, z1: 420, top: 35 },
    { kind: 'block', x0: 6050, x1: 6180, z0: 300, z1: 420, top: 70 },
    { kind: 'crumble', x0: 6180, x1: 6260, z0: 300, z1: 420, top: 70, fall: 28, back: 300 },
    { kind: 'pit', x0: 6180, x1: 6260, z0: 300, z1: 420 },
    { kind: 'block', x0: 6260, x1: 6400, z0: 300, z1: 420, top: 70 },
    { kind: 'lift', x0: 6420, x1: 6500, z0: 300, z1: 400, top: 0, move: { axis: 'top', range: 110, period: 280, phase: 0 } },
    { kind: 'block', x0: 6500, x1: 6640, z0: 282, z1: 340, top: 110 },
  ],

  lanterns: [
    { x: 560, z: 290 }, { x: 780, z: 290 }, { x: 1400, z: 290 },
    { x: 2480, z: 290 }, { x: 2860, z: 290 }, { x: 3280, z: 290 },
    { x: 3820, z: 380 }, { x: 4560, z: 380 }, { x: 4960, z: 290 }, { x: 5990, z: 300 }, { x: 6400, z: 300 },
  ],
};
