// skills.js — The skill trees. One per hero: RURIK's is whole; ORYN's has its first
// branch (THE STORMCALLER), the other two are shown as planned (Stage 4 of the campaign
// plan); VEXA's is still to come (all three are sketched in docs/progression.md).
//
// A branch with `planned: true` is a placeholder: its nodes are listed (so the tree reads
// whole) but can't be taken (Progress.blocker says 'planned') and do nothing.
//
// A tree is three BRANCHES (columns) of three TIERS (rows). A node:
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
            id: 'keenEdge', name: 'Keen Edge', cost: 1, tier: 1, req: [], kind: 'upgrade',
            text: 'Every blow of your sword hits 25% harder (the combo, the cleave, the air cut, the thrust).',
            apply(s) {
              for (const m of Object.values(s.moves)) if (SWORD_CUTS.includes(m.cut)) m.damage *= 1.25;
            },
          },
          {
            id: 'executionersArc', name: "Executioner's Arc", cost: 2, tier: 2, req: ['keenEdge'], kind: 'active',
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
            id: 'berserk', name: 'Berserk', cost: 3, tier: 3, req: ['executionersArc'], excl: ['oathOfFury'], kind: 'major',
            text: 'No more blocking. Every blow hits 30% harder and gives back 6 stamina.',
            apply(s) { s.meleeMult *= 1.3; s.skills.berserk = true; },
          },
        ],
      },
      {
        id: 'oathguard', name: 'THE OATHGUARD', color: 0xd8b04a, blurb: 'Outlast them',
        nodes: [
          {
            id: 'bloodrush', name: 'Bloodrush', cost: 1, tier: 1, req: [], kind: 'passive',
            text: 'Every kill gives back 20 stamina and 6 health.',
            apply(s) { s.skills.bloodrush = { stamina: 20, health: 6 }; },
          },
          {
            id: 'ironWall', name: 'Iron Wall', cost: 2, tier: 2, req: ['bloodrush'], kind: 'behaviour',
            text: 'A parry hits back: 25 damage, and his guard is broken.',
            apply(s) { s.skills.ironWall = { damage: 25 }; },
          },
          {
            id: 'oathOfFury', name: 'Oath of Fury', cost: 3, tier: 3, req: ['ironWall'], excl: ['berserk'], kind: 'major',
            text: 'Under a third of your health: blows no longer stagger you, and 20% of the damage you deal heals you.',
            apply(s) { s.skills.fury = { below: 0.34, leech: 0.2 }; },
          },
        ],
      },
      {
        id: 'skybreaker', name: 'THE SKYBREAKER', color: 0x6ab0ff, blurb: 'Own the air',
        nodes: [
          {
            id: 'windStep', name: 'Wind Step', cost: 1, tier: 1, req: [], kind: 'mobility',
            text: 'A second jump in the air, and you steer twice as well. (Some high ledges hide things.)',
            apply(s) { s.airJumps = 1; s.airControl = Math.max(s.airControl, 0.3); },
          },
          {
            id: 'leapSmash', name: 'Leap Smash', cost: 2, tier: 2, req: ['windStep'], kind: 'active',
            text: 'NEW: heavy in the air drives your blade straight down into the ground; the landing knocks down everyone close. It needs a moment to come back.',
            apply(s) { s.states = { ...(s.states ?? {}), airHeavy: 'plunge' }; s.kit = { ...(s.kit ?? {}), plunge: { speed: 1100, radius: 110, depth: 46, damage: 26, launch: 0, bounce: 0, minHeight: 30, hang: 7, cooldown: 90 } }; },
          },
          {
            id: 'skyfall', name: 'Skyfall', cost: 3, tier: 3, req: ['leapSmash'], kind: 'major',
            text: 'Leap Smash lands 60% wider, throws them into the air, and bounces you back up to smash again.',
            apply(s) { Object.assign(s.kit.plunge, { radius: 176, launch: 520, bounce: 560 }); },
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
          id: 'forkedBolt', name: 'Forked Bolt', cost: 1, tier: 1, req: [], kind: 'upgrade',
          text: 'Chain lightning forks once more from every body it strikes, and leaps two more times.',
          apply(s) { s.kit.bolt.branches += 1; s.kit.bolt.maxJumps += 2; },
        },
        {
          id: 'staticCharge', name: 'Static Charge', cost: 2, tier: 2, req: ['forkedBolt'], kind: 'behaviour',
          text: 'The 3rd strike of your lightning combo leaves a crackling field where it hit: whoever walks in is shocked.',
          apply(s) { s.skills.staticCharge = { ...STORM.field }; },
        },
        {
          id: 'thunderhead', name: 'Thunderhead', cost: 3, tier: 3, req: ['staticCharge'], kind: 'major',
          text: 'A fully overcharged bolt calls a thunderbolt down on its first man: everyone close by is struck and thrown down.',
          apply(s) { s.skills.thunderhead = { ...STORM.thunder }; },
        },
      ],
    },
    {
      id: 'earthshaper', name: 'THE EARTHSHAPER', color: 0xb08a5a, blurb: 'Planned (Stage 4)', planned: true,
      nodes: [
        { id: 'secondWall', name: 'Second Wall', cost: 1, tier: 1, req: [], kind: 'upgrade', text: 'PLANNED: two barriers at once.' },
        { id: 'shatter', name: 'Shatter', cost: 2, tier: 2, req: ['secondWall'], kind: 'behaviour', text: 'PLANNED: a wall that falls throws its slabs outward.' },
        { id: 'livingRock', name: 'Living Rock', cost: 3, tier: 3, req: ['shatter'], kind: 'major', text: 'PLANNED: the wall walks forward, shoving them back.' },
      ],
    },
    {
      id: 'waywalker', name: 'THE WAYWALKER', color: 0xb070ff, blurb: 'Planned (Stage 4)', planned: true,
      nodes: [
        { id: 'blinkStrike', name: 'Blink Strike', cost: 1, tier: 1, req: [], kind: 'behaviour', text: 'PLANNED: blinking through a man hits him.' },
        { id: 'longStep', name: 'Long Step', cost: 2, tier: 2, req: ['blinkStrike'], kind: 'mobility', text: 'PLANNED: the blink goes 30% further.' },
        { id: 'phaseWalk', name: 'Phase Walk', cost: 3, tier: 3, req: ['longStep'], kind: 'major', text: 'PLANNED: two blinks before you land.' },
      ],
    },
  ],
};

// Every node of a tree, by id.
export function nodesOf(heroId) {
  const t = SKILL_TREES[heroId];
  return t ? t.branches.flatMap((b) => b.nodes.map((n) => ({ ...n, branch: b.id, planned: !!b.planned }))) : [];
}
