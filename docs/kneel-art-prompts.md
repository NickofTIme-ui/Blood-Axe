# Art to paint: the bosses on their knees (THE SENTENCE)

Every beaten boss now kneels, hears his crimes and is executed by the hero who beat him
(`src/stage/Sentence.js`). The code is in and works without new art: until a boss has his
kneel strip, his standing pose is sunk to the knee and cropped there
(`view/SpriteEnemyView.js`), which reads as kneeling from a distance but shows no bent legs.
The strip plugs in by its file name alone, no code change.

Same rules as every other enemy strip: **one row, facing right, the same size and style as
that enemy's `_walk.png` and `_react.png` (attach both as the reference), knees on one
baseline, no text, no ground drawn.** Black background, except the Warlord (Malgor): his
strips are on magenta (#FF00FF) because his cape is black.

The bosses who kneel, by sheet: gladiator (Varek, the Gate Twins), penitent (Brother
Cinder), stalker (the Houndmaster), ghoul (the Chain Warden), berserker (Orsk, Hruk),
warlord (Malgor). The Ore Crusher is a machine and never kneels.

## `assets/enemies/strips/<enemy>_kneel.png` — 3 poses

Prompt (fill in the enemy):

> A 3-pose sprite strip of [ENEMY, e.g. "the Gladiator, the same spiked helmet, armour,
> shield, mace and colours as the attached sheets"], one row on a plain black background,
> facing right, side view, matching the attached sprite sheets exactly in size, style and
> detail. He has been beaten in battle and is about to be executed.
> Pose 1: dropping to one knee, his front knee hitting the ground, the other foot still
> planted, his weapon arm hanging, the weapon's point on the ground, head sinking.
> Pose 2: kneeling on both knees, upright from the knees up, shoulders slumped, head bowed
> low so the back of his neck shows, weapon and shield lying on the ground beside him.
> Pose 3: the same kneel, but his head raised and turned up to the right, defiant, glaring
> at the man about to execute him.
> Battered, bloodied, armour dented. Evenly spaced, nothing touching, no shadows on the
> ground, no text, no motion lines.

(Pose 1 shows while he drops, pose 2 while the charges are read, pose 3 while he says his
last words.)
