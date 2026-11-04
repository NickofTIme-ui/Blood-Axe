// skills.js — The skill trees. One per hero: RURIK's is whole (four branches: his fire,
// THE KING'S WRATH, is the fourth); ORYN's has its first
// branch (THE STORMCALLER), the other two are shown as planned (Stage 4 of the campaign
// plan); VEXA's is whole (four branches, 2026-11-04: the fourth, THE NIGHTBLADE, ends in
// her ultimate).
//
// A branch with `planned: true` is a placeholder: its nodes are listed (so the tree reads
// whole) but can't be taken (Progress.blocker says 'planned') and do nothing.
//
// A tree is three or four BRANCHES (columns) of three TIERS (rows). A node:
//   id, name, cost (skill points), tier (1..3), req (node ids needed first),
//   excl (nodes it can't be taken with — the choice at the top of the tree),
//   kind  'upgrade' | 'behaviour' | 'active' | 'passive' | 'mobility' | 'major'
//   text  what it does, in a line the player reads in the tree (and sees in a fight)
//   apply(stats)  changes the hero's stats (a copy: never the shared data). Behaviours
//         that are not numbers set a flag in stats.skills and combat/Skills.js does them.
//
// Nothing here is needed to finish a level: WIND STEP opens optional routes only.

// the cuts a sword makes (Keen Edge): not the boot, not the fire
const SWORD_CUTS = ['slash', 'chop', 'pierce'];

import { STORM } from '../combat/Storm.js';

export const SKILL_TREES = {
  warrior: {
    hero: 'Rurik',
    branches: [
      {
        id: 'butcher', name: 'THE BUTCHER', color: 0xd0302a, blurb: 'Bigger, crueller swings',
        nodes: [
          {
            id: 'keenEdge', name: 'Keen Edge', cost: 2, tier: 1, req: [], kind: 'upgrade',
            text: 'Every blow of your sword hits 25% harder (the combo, the cleave, the air cut, the thrust).',
            apply(s) {
              for (const m of Object.values(s.moves)) if (SWORD_CUTS.includes(m.cut)) m.damage *= 1.25;
            },
          },
          {
            id: 'executionersArc', name: "Executioner's Arc", cost: 4, tier: 2, req: ['keenEdge'], kind: 'active',
            text: 'NEW MOVE — D-pad DOWN (H): the WHIRLWIND CLEAVE. One full turn of the blade: it cuts the men in front, then the men behind. Also out of your combo.',
            apply(s) {
              const h = s.moves.heavy;
              s.moves.spin = {
                cut: 'slash', fx: 'spin', spin: true,
                startup: 9, active: 12, recovery: 16,
                damage: h.damage * 0.9, hitstun: 30, hitstop: 9, shake: 6,
                knockback: { x: 260, y: 140 }, guardDamage: 40, staminaCost: 22, lunge: 0,
                // the blade's reach, one side at a time (combat/Skills.js turns it round)
                hitbox: { x: -6, y: 6, w: 104, h: 92 },
                smear: { arc: [-180, 180], r: 92, cx: 0, cy: 62, w: 42, heavy: true },
              };
              for (const k of ['light1', 'light2', 'light3']) {
                for (const win of s.moves[k]?.cancels ?? []) if (!win.into.includes('spin')) win.into.push('spin');
              }
            },
          },
          {
            id: 'berserk', name: 'Berserk', cost: 6, tier: 3, req: ['executionersArc'], excl: ['oathOfFury'], kind: 'major',
            text: 'No more blocking. Every blow hits 30% harder and gives back 6 stamina.',
            apply(s) { s.meleeMult *= 1.3; s.skills.berserk = true; },
          },
        ],
      },
      {
        id: 'oathguard', name: 'THE OATHGUARD', color: 0xd8b04a, blurb: 'Outlast them',
        nodes: [
          {
            id: 'bloodrush', name: 'Bloodrush', cost: 2, tier: 1, req: [], kind: 'passive',
            text: 'Every kill gives back 20 stamina and 6 health.',
            apply(s) { s.skills.bloodrush = { stamina: 20, health: 6 }; },
          },
          {
            id: 'ironWall', name: 'Iron Wall', cost: 4, tier: 2, req: ['bloodrush'], kind: 'behaviour',
            text: 'A parry hits back: 25 damage, and his guard is broken.',
            apply(s) { s.skills.ironWall = { damage: 25 }; },
          },
          {
            id: 'oathOfFury', name: 'Oath of Fury', cost: 6, tier: 3, req: ['ironWall'], excl: ['berserk'], kind: 'major',
            text: 'Under a third of your health: blows no longer stagger you, and 20% of the damage you deal heals you.',
            apply(s) { s.skills.fury = { below: 0.34, leech: 0.2 }; },
          },
        ],
      },
      {
        id: 'skybreaker', name: 'THE SKYBREAKER', color: 0x6ab0ff, blurb: 'Own the air',
        nodes: [
          {
            id: 'windStep', name: 'Wind Step', cost: 2, tier: 1, req: [], kind: 'mobility',
            text: 'A second jump in the air, and you steer twice as well. (Some high ledges hide things.)',
            apply(s) { s.airJumps = 1; s.airControl = Math.max(s.airControl, 0.3); },
          },
          {
            id: 'leapSmash', name: 'Leap Smash', cost: 4, tier: 2, req: ['windStep'], kind: 'active',
            text: 'NEW: heavy in the air drives your blade straight down into the ground; the landing knocks down everyone close. It needs a moment to come back.',
            apply(s) { s.states = { ...(s.states ?? {}), airHeavy: 'plunge' }; s.kit = { ...(s.kit ?? {}), plunge: { speed: 1100, radius: 110, depth: 46, damage: 26, launch: 0, bounce: 0, minHeight: 30, hang: 7, cooldown: 90 } }; },
          },
          {
            id: 'skyfall', name: 'Skyfall', cost: 6, tier: 3, req: ['leapSmash'], kind: 'major',
            text: 'Leap Smash lands 60% wider, throws them into the air, and bounces you back up to smash again.',
            apply(s) { Object.assign(s.kit.plunge, { radius: 176, launch: 520, bounce: 560 }); },
          },
        ],
      },
      {
        // His fire is the hearth-fire in Oathkeeper (data/oathkeeper.js), and his anger. The
        // logic is combat/Wrath.js and combat/Skills.js, the look effects/WrathFX.js.
        // (needs: shut until Oathkeeper is his, the end of level 1: data/characters.js birthright)
        id: 'kingswrath', name: "THE KING'S WRATH", color: 0xff7a1a, blurb: 'Let the fire out', needs: 'oathkeeper',
        nodes: [
          {
            id: 'oathkeeperWakes', name: 'Oathkeeper Wakes', cost: 2, tier: 1, req: [], kind: 'upgrade',
            text: 'The Firebolt becomes a HEARTHFIRE BOLT: half again as big and fast, it burns clean through the first man into the next, hits twice as hard, and costs less (20). More mana (60), and it comes back faster. A man it kills is blown apart.',
            apply(s) {
              s.maxMana = Math.max(s.maxMana, 60);
              s.magicMult = Math.max(s.magicMult, 1);
              s.manaRegen = Math.max(s.manaRegen, 2.5);
              const sp = s.spell;
              sp.name = 'Hearthfire Bolt';
              sp.cost = 20;
              Object.assign(sp.projectile, {
                look: 'hearthfire', damage: 34, speed: 760, w: 64, h: 40, pierce: true,
                hitstop: 11, shake: 7, knockback: { x: 380, y: 360 }, fatality: 'explode',
              });
            },
          },
          {
            id: 'kingsfire', name: 'Kingsfire', cost: 4, tier: 2, req: ['oathkeeperWakes'], kind: 'active',
            text: 'NEW: HOLD the spell button (U / LB). He drives Oathkeeper into the ground and a road of fire erupts ahead of him, pillar after pillar: every man in it is thrown up burning, and a man it kills blows up. 40 mana; a tap still throws the bolt. Every sword kill gives back 5 mana.',
            apply(s) {
              s.states = { ...(s.states ?? {}), cast: 'kingcast' };
              s.skills.kingsfire = true;
              s.skills.swordMana = 5;
            },
          },
          {
            id: 'kingsWrath', name: "The King's Wrath", cost: 6, tier: 3, req: ['kingsfire'], kind: 'major',
            text: 'Kingsfire becomes his WRATH (50 mana): he roars and nothing touches him, fire bursts out of him in a ring, then the road runs both ways, twice as far. Every man the fire kills goes up like a powder keg and sets off the men around him.',
            apply(s) { s.skills.wrathChain = true; s.maxMana = Math.max(s.maxMana, 70); },
          },
        ],
      },
    ],
  },
};

SKILL_TREES.mage = {
  hero: 'Oryn',
  branches: [
    {
      id: 'stormcaller', name: 'THE STORMCALLER', color: 0x8ab8ff, blurb: 'Lightning through the crowd',
      nodes: [
        {
          id: 'forkedBolt', name: 'Forked Bolt', cost: 2, tier: 1, req: [], kind: 'upgrade',
          text: 'Chain lightning forks once more from every body it strikes, and leaps two more times.',
          apply(s) { s.kit.bolt.branches += 1; s.kit.bolt.maxJumps += 2; },
        },
        {
          id: 'staticCharge', name: 'Static Charge', cost: 4, tier: 2, req: ['forkedBolt'], kind: 'behaviour',
          text: 'The 3rd strike of your lightning combo leaves a crackling field where it hit: whoever walks in is shocked.',
          apply(s) { s.skills.staticCharge = { ...STORM.field }; },
        },
        {
          id: 'thunderhead', name: 'Thunderhead', cost: 6, tier: 3, req: ['staticCharge'], kind: 'major',
          text: 'A fully overcharged bolt calls a thunderbolt down on its first man: everyone close by is struck and thrown down.',
          apply(s) { s.skills.thunderhead = { ...STORM.thunder }; },
        },
      ],
    },
    {
      id: 'earthshaper', name: 'THE EARTHSHAPER', color: 0xb08a5a, blurb: 'Planned (Stage 4)', planned: true,
      nodes: [
        { id: 'secondWall', name: 'Second Wall', cost: 2, tier: 1, req: [], kind: 'upgrade', text: 'PLANNED: two barriers at once.' },
        { id: 'shatter', name: 'Shatter', cost: 4, tier: 2, req: ['secondWall'], kind: 'behaviour', text: 'PLANNED: a wall that falls throws its slabs outward.' },
        { id: 'livingRock', name: 'Living Rock', cost: 6, tier: 3, req: ['shatter'], kind: 'major', text: 'PLANNED: the wall walks forward, shoving them back.' },
      ],
    },
    {
      id: 'waywalker', name: 'THE WAYWALKER', color: 0xb070ff, blurb: 'Planned (Stage 4)', planned: true,
      nodes: [
        { id: 'blinkStrike', name: 'Blink Strike', cost: 2, tier: 1, req: [], kind: 'behaviour', text: 'PLANNED: blinking through a man hits him.' },
        { id: 'longStep', name: 'Long Step', cost: 4, tier: 2, req: ['blinkStrike'], kind: 'mobility', text: 'PLANNED: the blink goes 30% further.' },
        { id: 'phaseWalk', name: 'Phase Walk', cost: 6, tier: 3, req: ['longStep'], kind: 'major', text: 'PLANNED: two blinks before you land.' },
      ],
    },
  ],
};

// VEXA (Nick, 2026-11-04: the Assassin is quick, in and out, fast). Four branches like
// Rurik's: her mines, her mark, the air, and THE NIGHTBLADE, whose top is her ultimate.
// The behaviours live in combat/Mine.js, combat/CombatSystem.js (the mark),
// combat/RogueMoves.js and combat/Rogue.js (Falling Star).
SKILL_TREES.rogue = {
  hero: 'Vexa',
  branches: [
    {
      id: 'widowmaker', name: 'THE WIDOWMAKER', color: 0x9a48ff, blurb: 'Mine the field',
      nodes: [
        {
          id: 'thirdMine', name: 'Third Mine', cost: 2, tier: 1, req: [], kind: 'upgrade',
          text: 'Three Widow Mines out at once instead of two, and they cost less mana (16).',
          apply(s) { s.kit.mine.maxActive = 3; s.spell.cost = 16; },
        },
        {
          id: 'shrapnel', name: 'Shrapnel', cost: 4, tier: 2, req: ['thirdMine'], kind: 'behaviour',
          text: 'Every mine that goes off throws eight blades out all round it.',
          apply(s) {
            s.kit.mine.shrapnel = {
              count: 8,
              projectile: {
                cut: 'pierce', look: 'shuriken', fx: 'shuriken', count: 1, speed: 620, lifetime: 22, y: 0, w: 14, h: 14,
                damage: 7, hitstun: 20, hitstop: 2, shake: 0, knockback: { x: 70, y: 0 }, guardDamage: 8, pierce: false, color: 0xbfc6d0,
              },
            };
          },
        },
        {
          id: 'chainReaction', name: 'Chain Reaction', cost: 6, tier: 3, req: ['shrapnel'], kind: 'major',
          text: 'A mine going off sets off every other mine of yours near it, one after another. Mines hit 20% harder.',
          apply(s) { s.kit.mine.chain = true; s.kit.mine.damage *= 1.2; },
        },
      ],
    },
    {
      id: 'deathmark', name: 'THE DEATHMARK', color: 0xd8203c, blurb: 'Mark them, end them',
      nodes: [
        {
          id: 'longMark', name: 'Long Mark', cost: 2, tier: 1, req: [], kind: 'upgrade',
          text: 'Exposed lasts half again as long, and your own hits on a marked man do +40% instead of +25%.',
          apply(s) { s.kit.expose.duration = Math.round(s.kit.expose.duration * 1.5); s.kit.expose.bonus = 0.4; },
        },
        {
          id: 'spreadingMark', name: 'Spreading Mark', cost: 4, tier: 2, req: ['longMark'], kind: 'behaviour',
          text: 'When a man you marked dies, the mark jumps to the nearest man to him.',
          apply(s) { s.skills.spreadMark = { range: 260 }; },
        },
        {
          id: 'executionersMark', name: "Executioner's Mark", cost: 6, tier: 3, req: ['spreadingMark'], kind: 'major',
          text: 'A marked man brought under a third of his health dies to the blow. (Not bosses.)',
          apply(s) { s.kit.expose.execute = 0.33; },
        },
      ],
    },
    {
      id: 'skydancer', name: 'THE SKYDANCER', color: 0x72c4ff, blurb: 'Never touch the ground',
      nodes: [
        {
          id: 'fanOfSteel', name: 'Fan of Steel', cost: 2, tier: 1, req: [], kind: 'upgrade',
          text: 'The Shuriken Fan throws three more stars, and Death From Above six more.',
          apply(s) { s.kit.fan.count += 3; s.kit.fan.dfaCount += 6; },
        },
        {
          id: 'skullStep', name: 'Skull Step', cost: 4, tier: 2, req: ['fanOfSteel'], kind: 'mobility',
          text: 'A third jump in the air. Taken over a man\'s head, you spring off it and he staggers.',
          apply(s) { s.airJumps = 2; s.skills.skullStep = { stagger: 40 }; },
        },
        {
          id: 'fallingStar', name: 'Falling Star', cost: 6, tier: 3, req: ['skullStep'], kind: 'major',
          text: 'A Falling Viper that kills throws you straight back up into the air, ready to dive again. It dives from lower too.',
          apply(s) { s.skills.fallingStar = true; s.kit.dive.minHeight = 8; s.kit.dive.starBounce = 780; },
        },
      ],
    },
    {
      id: 'nightblade', name: 'THE NIGHTBLADE', color: 0x7a6ae0, blurb: 'Be the dark',
      nodes: [
        {
          id: 'killingRhythm', name: 'Killing Rhythm', cost: 2, tier: 1, req: [], kind: 'passive',
          text: 'Every kill gives back 15 stamina and 8 mana. More mana (80).',
          apply(s) { s.skills.rhythm = { stamina: 15, mana: 8 }; s.maxMana = Math.max(s.maxMana, 80); },
        },
        {
          id: 'smokeBomb', name: 'Smoke Bomb', cost: 4, tier: 2, req: ['killingRhythm'], kind: 'active',
          text: 'NEW MOVE: D-pad DOWN (H). Smoke cracks at your feet: every man in it reels blind, blows pass through you for a moment, and your first cut out of it EXPOSES him. 25 mana. Also out of your combo.',
          apply(s) {
            s.skills.smoke = true;
            for (const k of ['light1', 'light2', 'light3', 'light4', 'viper', 'kick']) {
              const m = k === 'viper' ? s.moves.heavy : s.moves[k];
              for (const win of m?.cancels ?? []) if (!win.into.includes('spin')) win.into.push('spin');
            }
          },
        },
        {
          id: 'nightFalls', name: 'Night Falls', cost: 6, tier: 3, req: ['smokeBomb'], kind: 'major',
          text: 'With 60 mana, D-pad DOWN is NIGHT FALLS: the light goes out and you are behind six men in turn, one killing cut each, then back where you stood. Nothing touches you while it lasts. It cashes in your mark.',
          apply(s) { s.skills.nightfall = true; s.maxMana = Math.max(s.maxMana, 80); },
        },
      ],
    },
  ],
};

// Every node of a tree, by id.
export function nodesOf(heroId) {
  const t = SKILL_TREES[heroId];
  return t ? t.branches.flatMap((b) => b.nodes.map((n) => ({ ...n, branch: b.id, planned: !!b.planned, needs: n.needs ?? b.needs }))) : [];
}
