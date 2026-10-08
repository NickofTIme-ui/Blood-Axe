# Progression and skill trees

Code: `src/progression/Progress.js` (the rules, saving), `src/data/skills.js` (the trees),
`src/combat/Skills.js` (what the behaviours do in a fight), `src/scenes/SkillScene.js` (the screen).

## The rules

- **Blood is experience, and it's shared.** Every kill feeds one pool whoever you play
  (a grunt ~12, a brute ~25, an elite ~3x its health share). Every 160 blood is a level;
  every level is a skill point.
- **Milestones pay once:** the first clear of each fight on a stage +1, each secret +1,
  each optional challenge (the bell) +1. You start with 2 points to spend at the first shrine (300 blood a level).
- **Skill points are shared; picks are per hero.** Each hero spends the whole pool on
  their own tree, so switching from Rurik to Vexa never means grinding again.
- **Pace:** a full run of the Gallows Ascent earns about 7-8 points (4 fights, 1 secret,
  1 challenge, a level, the starting two). Skills cost 2 / 4 / 6 by tier; a whole tree costs 36. You choose: two
  branches to their middle, or one to the top and a taste of another.
- **Respec is free** at any rest shrine (R / Y in the tree).
- **No level scaling.** Enemy health and damage never grow with your level: an upgrade
  that hits harder always shows.
- **Traversal never needs a skill.** Every main route is built for every hero with no
  upgrades (a test plays it). Mobility skills (Wind Step) open optional ledges only.
- **Online co-op has no progression yet** (both machines would have to agree on every pick):
  online heroes play with their base kits.
- Saved in the browser (`localStorage`, key `bloodaxe.progress.v1`).

## How you spend points

Rest shrines (the blood altars) heal you whole when you reach them with no fight on.
Stand still at one for about a second and you kneel: the tree opens and the fight holds
still. Arrows / D-pad move, J / A takes a skill, R / Y respecs, Esc / B goes back.

## Rurik's tree (built)

| | THE BUTCHER (bigger, crueller swings) | THE OATHGUARD (outlast them) | THE SKYBREAKER (own the air) |
|---|---|---|---|
| 1 pt | **Keen Edge** — every sword blow +25% damage (upgrade) | **Bloodrush** — each kill: +20 stamina, +6 health (passive) | **Wind Step** — a second jump, double air control; reaches the roost (mobility) |
| 2 pts | **Executioner's Arc** — NEW MOVE on D-pad Down / H: the Whirlwind Cleave, a full 360 turn that cuts the men in front, then behind; also out of the combo (active, area) | **Iron Wall** — a parry hits back for 25 and breaks his guard (defensive behaviour) | **Leap Smash** — NEW: heavy in the air plunges down; the landing floors everyone close (active) |
| 3 pts | **Berserk** — no block; +30% damage; every blow gives 6 stamina (major, risk) | **Oath of Fury** — under 1/3 health: blows don't stagger you, 20% of your damage heals you (major, risk) | **Skyfall** — Leap Smash 60% wider, launches them, bounces you back up to smash again (major) |

Berserk and Oath of Fury shut each other out: the choice at the top of the tree. Skyfall
can go with either.

Builds that work: *Executioner* (Butcher to the top + Bloodrush: wade in, cleave all
round, never block), *Iron Saint* (Oathguard to the top + Keen Edge: parry everything,
fight best when nearly dead), *Skybreaker* (Skyfall + Bloodrush: a crater, a bounce, a
second crater).

## Planned trees (not built yet)

**Oryn (Mage)** — STORMCALLER (lightning): *Forked Bolt* (each chain jump forks once more),
*Static Charge* (a 3rd combo strike leaves a field that shocks whoever walks in), major
*Thunderhead* (overcharge calls a strike from above). EARTHSHAPER (walls): *Second Wall*
(two barriers at once), *Shatter* (a wall's death throws its slabs outward), major *Living
Rock* (the wall walks forward). WAYWALKER (blink): *Blink Strike* (blinking through a man
hits him), *Long Step* (+30% blink), major *Phase Walk* (two blinks before you land).

**Vexa (Rogue)** — WIDOWMAKER (mines): *Third Mine*, *Shrapnel* (mines throw blades), major
*Chain Reaction* (a mine sets off the others). DEATHMARK: *Spreading Mark* (the mark jumps to
the nearest man on a kill), *Long Mark* (+50%), major *Executioner's Mark* (a marked man under
30% health dies to any hit). SKYDANCER: *Wall Kick* (kick off a ledge face for a third jump),
*Fan of Steel* (+3 shuriken), major *Falling Star* (Falling Viper from any height chains into
another dive on a kill).
