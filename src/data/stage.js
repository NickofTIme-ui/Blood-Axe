// stage.js — The stage: THE OATH ROAD, five sections from the burning gate to the throne.
//
// The camera locks to a section until its fights are won, then "GO →" opens the way to
// the next. Each section starts at a checkpoint (die and you rise there). Ideas come in
// one at a time and are combined later:
//
//   1 THE BURNING GATE      grunts; barrels and crates that hide food    (combos, breakables)
//   2 THE CHARNEL BRIDGE    fire grates: they glow, then erupt — burn anyone standing on
//                           them, enemies too (kick them in)              (hazard 1)
//   3 THE BLOODY NAVE       swinging pendulum blades over their lanes;  (hazard 2)
//                           maim-and-execute runners; a cracked wall hides a shrine (secret)
//   4 THE OSSUARY           fire AND blades, elites; urns hide a relic   (combination)
//   5 THRONE OF THE OATHBREAKER   the boss: Pitlord Kragg, the Oathbreaker
//
// Positions are in world px. z = depth on the floor (282 back .. 520 front: SETTINGS.world).
// waves: line-ups spawned one after another (the next when the last is dead).
// props: breakables — kind: barrel | crate | urn | wall (secret wall) ; drop: meat (health),
//        wine (half health), mana, relic (secret, score)
// hazards: fire (x, z, w, d, phase) | blade (x, z = its lane, swing: px each side, phase)

export const STAGE = {
  name: 'THE OATH ROAD',
  sections: [
    {
      id: 'gate', name: 'THE BURNING GATE', x0: 0, x1: 1150, ground: 'village',
      light: 0xffa060, mood: 0.12,
      objective: 'Cut through the gate guard',
      waves: [['grunt', 'grunt'], ['grunt', 'grunt', 'grunt']],
      props: [
        { kind: 'barrel', x: 420, z: 320, drop: null },
        { kind: 'crate', x: 470, z: 310, drop: 'meat' },
        { kind: 'barrel', x: 860, z: 489, drop: 'wine' },
        { kind: 'chest', x: 1040, z: 307, drop: 'meat' },
      ],
      hazards: [],
    },
    {
      id: 'bridge', name: 'THE CHARNEL BRIDGE', x0: 1150, x1: 2350, ground: 'castle',
      light: 0xff7030, mood: 0.2,
      objective: 'Cross the bridge — mind the grates',
      waves: [['grunt', 'butcher'], ['grunt', 'grunt', 'stalker']],
      props: [
        { kind: 'crate', x: 1320, z: 495, drop: 'mana' },
        { kind: 'barrel', x: 2200, z: 307, drop: 'meat' },
      ],
      hazards: [
        { type: 'fire', x: 1560, z: 395, w: 120, d: 75, phase: 0 },
        { type: 'fire', x: 1900, z: 457, w: 120, d: 75, phase: 100 },
        { type: 'fire', x: 1980, z: 320, w: 120, d: 63, phase: 40 },
      ],
    },
    {
      id: 'nave', name: 'THE BLOODY NAVE', x0: 2350, x1: 3550, ground: 'cathedral',
      light: 0x9ab0ff, mood: 0.28,
      objective: 'Break them — then finish them',
      waves: [['penitent', 'grunt'], ['stalker', 'ghoul', 'grunt']],
      props: [
        { kind: 'wall', x: 3050, z: 290, drop: 'shrine', secret: true },
        { kind: 'urn', x: 2560, z: 501, drop: null },
        { kind: 'urn', x: 2600, z: 510, drop: 'wine' },
      ],
      hazards: [
        { type: 'blade', x: 2780, z: 407, swing: 90, phase: 0 },
        { type: 'blade', x: 3300, z: 457, swing: 90, phase: 60 },
      ],
    },
    {
      id: 'ossuary', name: 'THE OSSUARY', x0: 3550, x1: 4600, ground: 'cathedral',
      light: 0x80ff9a, mood: 0.38,
      objective: 'Survive the bone-pits',
      waves: [['berserker', 'grunt', 'grunt'], ['ghoul', 'penitent', 'butcher']],
      props: [
        { kind: 'urn', x: 3700, z: 295, drop: null },
        { kind: 'urn', x: 3735, z: 301, drop: null },
        { kind: 'urn', x: 3770, z: 292, drop: 'relic', secret: true },
        { kind: 'crate', x: 4480, z: 495, drop: 'meat' },
        { kind: 'chest', x: 4130, z: 305, drop: 'relic' },
        { kind: 'barrel', x: 4530, z: 320, drop: 'mana' },
      ],
      hazards: [
        { type: 'fire', x: 3950, z: 407, w: 130, d: 88, phase: 0 },
        { type: 'blade', x: 4200, z: 345, swing: 90, phase: 30 },
        { type: 'fire', x: 4380, z: 470, w: 120, d: 75, phase: 80 },
      ],
    },
    {
      id: 'throne', name: 'THRONE OF THE OATHBREAKER', x0: 4600, x1: 5600, ground: 'cathedral',
      light: 0xff3030, mood: 0.32,
      objective: 'Kill Pitlord Kragg',
      boss: { type: 'gladiator', name: 'Pitlord Kragg, the Oathbreaker', health: 4, damage: 1.25, adds: ['grunt', 'grunt', 'stalker'] },
      waves: [],
      props: [{ kind: 'barrel', x: 4780, z: 501, drop: 'meat' }],
      hazards: [],
    },
  ],
};

// What each pickup does. heal/mana are shares of the maximum.
export const PICKUPS = {
  meat: { heal: 0.45, label: 'ROAST MEAT', color: 0xc86a3a },
  wine: { heal: 0.25, label: 'WINE', color: 0x8a1a3a },
  mana: { mana: 1, label: 'MANA', color: 0x3a6aff },
  relic: { score: 1, label: 'RELIC', color: 0xffd060 },
  shrine: { heal: 1, mana: 1, score: 1, label: 'BLOOD SHRINE', color: 0xff3a2a },
};

// Breakable props: hits to break, size.
export const PROPS = {
  barrel: { hp: 2, w: 34, h: 46 },
  crate: { hp: 2, w: 42, h: 40 },
  urn: { hp: 1, w: 24, h: 36 },
  chest: { hp: 3, w: 46, h: 38 }, // iron-bound: takes a beating, always holds something good
  wall: { hp: 5, w: 90, h: 130 }, // a cracked section of the back wall
};
