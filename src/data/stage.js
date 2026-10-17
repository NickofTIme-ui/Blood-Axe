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
//   5 THRONE OF THE OATHBREAKER   the boss: Warlord Malgor, the Oathbreaker (Pitlord Kragg comes when he rages)
//
// Positions are in world px. z = depth on the floor (282 back .. 520 front: SETTINGS.world).
// waves: line-ups spawned one after another (the next when the last is dead).
//        (each line-up is written twice over: the fights were too easy at single strength)
// props: breakables — kind: barrel | crate | urn | wall (secret wall) ; drop: health (the
//        green jar), mana (the blue jar), and the secret treasures relic | ring | rune (score)
// hazards: fire (x, z, w, d, phase) | blade (x, z = its lane, swing: px each side, phase)

export const STAGE = {
  name: 'THE OATH ROAD',
  sections: [
    {
      id: 'gate', name: 'THE BURNING GATE', x0: 0, x1: 1150, ground: 'village', fireBed: 1,
      light: 0xffa060, mood: 0.12,
      objective: 'Cut through the gate guard',
      waves: [['grunt', 'grunt', 'grunt', 'grunt'], ['grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'grunt']],
      props: [
        { kind: 'barrel', x: 420, z: 320, drop: null },
        { kind: 'crate', x: 470, z: 310, drop: 'health' },
        { kind: 'barrel', x: 860, z: 489, drop: 'health' },
        { kind: 'crate', x: 1040, z: 307, drop: 'health' },
      ],
      hazards: [],
    },
    {
      id: 'bridge', name: 'THE CHARNEL BRIDGE', x0: 1150, x1: 2350, ground: 'castle',
      light: 0xff7030, mood: 0.2,
      objective: 'Cross the bridge — mind the grates',
      waves: [['grunt', 'butcher', 'grunt', 'butcher'], ['grunt', 'grunt', 'stalker', 'grunt', 'grunt', 'stalker']],
      props: [
        { kind: 'crate', x: 1320, z: 495, drop: 'mana' },
        { kind: 'barrel', x: 2200, z: 307, drop: 'health' },
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
      waves: [['penitent', 'grunt', 'penitent', 'grunt'], ['stalker', 'ghoul', 'grunt', 'stalker', 'ghoul', 'grunt']],
      props: [
        { kind: 'urn', x: 2560, z: 501, drop: null },
        { kind: 'urn', x: 2600, z: 510, drop: 'health' },
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
      waves: [['berserker', 'grunt', 'grunt', 'berserker', 'grunt', 'grunt'], ['ghoul', 'penitent', 'butcher', 'ghoul', 'penitent', 'butcher']],
      props: [
        { kind: 'urn', x: 3700, z: 295, drop: null },
        { kind: 'urn', x: 3735, z: 301, drop: null },
        { kind: 'urn', x: 3770, z: 292, drop: 'relic', secret: true },
        { kind: 'crate', x: 4480, z: 495, drop: 'health' },
        { kind: 'crate', x: 4130, z: 305, drop: 'relic' },
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
      objective: 'Kill Warlord Malgor',
      // he walks in slowly, the ground shaking, the heroes frozen (Stage.spawnBoss);
      // at half health he calls Pitlord Kragg and his dogs (adds)
      boss: { type: 'warlord', name: 'Warlord Malgor, the Oathbreaker', health: 6, damage: 1.15, adds: ['gladiator', 'grunt', 'grunt', 'stalker', 'gladiator', 'grunt', 'grunt', 'stalker'],
        entrance: { from: 140, to: 300, speed: 58, stepEvery: 34, awe: 30 },
        // beaten: his crimes and his sentence (stage/Sentence.js)
        sentence: {
          speaker: 'MALGOR',
          crimes: [
            'You broke the oath you swore to our people.',
            'You burned the villages you were sworn to guard.',
          ],
          last: 'An oath is only words. Words burn.',
        } },
      waves: [],
      props: [{ kind: 'barrel', x: 4780, z: 501, drop: 'health' }],
      hazards: [],
    },
  ],
};

// What each pickup does. heal/mana are shares of the maximum.
export const PICKUPS = {
// (Nick, 2026-10-17: the roast meat and the wine are gone; health is a green magic jar, the
// twin of the blue mana jar)
  health: { heal: 0.45, label: 'HEALTH', color: 0x3aff7a },
  mana: { mana: 1, label: 'MANA', color: 0x3a6aff },
  // secret treasures (score): found in hidden places, one of them each
  relic: { score: 1, label: 'THE OATH CHALICE', color: 0xffd060 },
  ring: { score: 1, label: 'HAKON\'S SIGNET', color: 0xffd060 },
  rune: { score: 1, label: 'A RUNESTONE OF THE FIRST FIRE', color: 0x7ad8ff },
  shrine: { heal: 1, mana: 1, score: 1, label: 'BLOOD SHRINE', color: 0xff3a2a },
  trophy: { trophy: true, label: 'TROPHY', color: 0xffb030 }, // boss loot (data/trophies.js): dropped by bosses and elites
};

// Breakable props: hits to break, size.
export const PROPS = {
  barrel: { hp: 2, w: 34, h: 46 },
  crate: { hp: 2, w: 42, h: 40 },
  urn: { hp: 1, w: 24, h: 36 },
  chest: { hp: 3, w: 46, h: 38 }, // iron-bound: takes a beating, always holds something good
  wall: { hp: 5, w: 90, h: 130 }, // a cracked section of the back wall
  bell: { hp: 1, w: 34, h: 70 }, // an iron bell on a post: ring it to call an optional fight (stage.challenge)
  wreckage: { hp: 4, w: 84, h: 56 }, // a burning beam pinning a door shut: smash it and whoever is inside gets out
  shackle: { hp: 3, w: 30, h: 84 }, // (the mine) a post a captive is chained to: break it and he's free
  counterweight: { hp: 5, w: 70, h: 120 }, // (the mine) the stone that holds a gate down: break its chain and the gate rises (`opens`)
  rubble: { hp: 6, w: 110, h: 90 }, // (the mine) loose fall in a passage: dig it out (`opens`: the rock wall behind it)
  catapult: { hp: 7, w: 130, h: 120 }, // (the Shattered Ascent) a siege catapult on the heights: wreck it and the bombardment thins (hazard 'bombard', `silence`)
  archers: { hp: 6, w: 180, h: 190 }, // an archer post: a timber hoarding, its bowmen behind the mantlet: wreck it and their volleys stop (hazard 'bombard' `look: 'arrows'`, `silence`)
  winch: { hp: 6, w: 110, h: 150 }, // (the Iron Gates) a drum and chain that holds the gate down: break both and it rises (`opens` + `tag`)
  wagon: { hp: 16, w: 200, h: 110 }, // the convoy's prisoner wagon: rolls away (`roll`); wreck it and they're out
  // (the Black Keep, data/stageKeep.js)
  pin: { hp: 4, w: 52, h: 96 }, // the Ash Mill's drive pins: break all three and the stone stops (`tag` + section.needs)
  conduit: { hp: 6, w: 54, h: 180 }, // an ember conduit: forge fire fed up to the King; while one stands he's warded (boss phase `ward`)
  spire: { hp: 5, w: 64, h: 150 }, // a spire of the colossus's crown: break all three and its heart opens (boss phase `hold`)
};
