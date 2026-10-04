# Art to paint: enemies jumping and hopping down, Rurik's Whirlwind Cleave

The code is in and waiting for these. Until they exist the game bends each enemy's own walk
frames into the shapes (`view/SpriteEnemyView.js` `ledgePose`), and Rurik's spin turns his
Cleave poses round (`view/SpriteFighterView.js`). Each strip plugs in by its file name alone.

Same rules as every other enemy strip: **one row on black, facing right, the same size and
style as that enemy's `_walk.png` and `_react.png` (attach both as the reference), feet on
one baseline, no text, no ground drawn.** Seven enemies: grunt, butcher, stalker, penitent,
berserker, ghoul, gladiator (the Warlord never jumps).

## `assets/enemies/strips/<enemy>_jump.png` — 4 poses

Prompt (fill in the enemy):

> A 4-pose sprite strip of [ENEMY — e.g. "the Ashen Grunt, the same armour, weapon and
> colours as the attached sheets"], one row on a plain black background, facing right,
> side view, matching the attached sprite sheets exactly in size, style and detail.
> Pose 1: a deep crouch, knees bent, weight low, weapon pulled in, about to spring up.
> Pose 2: pushing off — legs extending, body stretched upward and leaning forward, rising.
> Pose 3: at the top of the jump — knees tucked up, weapon held high, airborne.
> Pose 4: landing — knees absorbing the impact, crouched, one hand down for balance.
> Evenly spaced, nothing touching, no shadows on the ground, no text.

## `assets/enemies/strips/<enemy>_drop.png` — 3 poses

> A 3-pose sprite strip of [ENEMY], one row on a plain black background, facing right,
> side view, matching the attached sprite sheets exactly in size, style and detail.
> Pose 1: stepping off a ledge — one foot forward into empty air, leaning out, looking down.
> Pose 2: dropping — both legs reaching down for the ground, arms out for balance, airborne.
> Pose 3: landing from the drop — knees bent hard, crouched low, weapon braced.
> Evenly spaced, nothing touching, no shadows, no text.

## `assets/sprites/strips/ulric_spin.png` — Rurik's Whirlwind Cleave, 6 poses

> A 6-pose sprite strip of Rurik (attach his reference and his cleave strip), one row on a
> plain black background, matching them exactly. A full 360-degree spinning sword cleave:
> 1 coiled, sword held low behind him; 2 turning, the blade sweeping out in front;
> 3 seen from behind mid-turn, blade level and extended; 4 facing away, cape flaring;
> 5 coming back round, blade still sweeping; 6 follow-through, sword low across the body,
> feet planted. No motion trails, no text.

(The spin strip still needs one line of wiring in `src/data/heroStrips.js` once it exists;
the enemy strips need none.)
