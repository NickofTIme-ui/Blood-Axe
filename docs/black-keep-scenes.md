# The Black Keep scenes (King Vaurath's five scenes between the levels)

Nick, 23 Nov 2026: "The black keep scenes need to be drastically enhanced to their final
versions." "It is super important to keep these scenes cohesive, on point and delivering
what their purpose is. It's hyping up the Oathkeepers and slowly with each scene building
tension for the Oathkeepers to inevitably BUST through the Black Keep and deliver JUSTICE
and hold their OATH."

Code: `src/scenes/CutawayScene.js` (played by `ArenaScene.campaignLevelDone` after levels 1-5).

## What each scene is for

| After | Scene | The king | What it says about the Oath Keepers |
|---|---|---|---|
| 1 The Village | I · THE VILLAGE STANDS | confident: shows his power, waves of ash put out the torches | they get their name ("the men are calling them the Oath Keepers") |
| 2 Gallows Wood | II · THE CAGES ARE EMPTY | irritated: cracks the throne arm with his fist | the wood went quiet; every prisoner walked free |
| 3 Hollow Mountain | III · THE MOUNTAIN COULD NOT HOLD THEM | frustrated: throws the war map across the hall | even Malgor's men have started saying their names |
| 4 Shattered Ascent | IV · THE ARMY RUNS | uneasy: burns his own captain for saying they can't be killed | his army is running from them |
| 5 Iron Gates | V · THE GATES HAVE FALLEN | afraid: his fire gutters out; then the doors boom, he relights it: "Let them come." | they're at his door |

## The one shape every scene has

1. **The Keep from outside** (painted `assets/env/keep/sky.png` + `far.png`), lightning, the
   chapter numeral and name. Fires on the approach grow every scene; in V the town under the
   Keep burns red.
2. **The throne room**, with a camera that moves to whoever speaks. The hall remembers: the
   crack (II on), the thrown map and its markers on the floor (IV on), the captain's ash (V).
   The king's guard deserts: 6, 4, 3, 2, then none. The light dims and reddens; from IV a
   heartbeat runs under it.
3. **The war map insert**: the Oath Keepers' red token (three marks: the three) moves one
   place up the road and knocks down the king's black pennant. "FOUR ROADS TO THE BLACK
   KEEP" ... "ONE ROAD" ... "NO ROADS LEFT". Torn and burned from IV on (it was thrown).
4. **The oath**: a cut to black, Oryn, Vexa and Rurik slam in, and the oath so far with this
   scene's line added. In V it's whole and "THE OATH WILL BE KEPT" lands.
   1. By my father's blood, I swear it.
   2. Every soul he chains, we set free.
   3. Every wall he raises, we break.
   4. Every man he sends, we bury.
   5. And the king on his black throne answers for all of it.

The king's theme (`showdown`, the Keep's music) plays under all five, so the finale's music
is already his when the player gets there.

## Still code-drawn (paint in ChatGPT on Nick's PC)

Same style block as `docs/keep-art-prompts.md`. Each is a drop-in once its loader line is
added (noted per item).

1. **The war map** `assets/cinematics/keep-war-map.png`, 1536x864, opaque. Prompt: "A
   king's war map seen from straight above, filling the frame: old stained parchment pinned
   to a black wooden table, ink drawings of a road climbing from a small village (bottom
   left) through a dark forest, a mountain with a mine mouth, sheer cliffs with a stair, a
   great iron-barred gate, to a black castle on a crag (top right). Candle wax drips, a
   dagger stuck in one corner, soot, dried blood. No text, no labels, no people." Wiring:
   load it as `keep-war-map` in BootScene and draw it under the route in `map()`.
2. **The messenger kneeling** `assets/enemies/strips/grunt_kneel.png`, 3 poses, the prompt
   in `docs/kneel-art-prompts.md` with the Ashen grunt (attach `grunt_walk.png` and
   `grunt_react.png`): pose 1 dropping to one knee, 2 on one knee with head bowed, 3 head
   raised in fear. Wiring: allow `kneel` in the grunt's set (`src/data/enemyStrips.js`);
   `enter()` already uses `enemy-grunt-kneel` when it exists.
3. **King Vaurath's acts** `assets/enemies/king_vaurath_acts.png`, 5 poses, one row, same
   painting as `king_vaurath_stand.png` (attach it), facing right, black background: 1 one
   palm raised with fire in it, 2 fist brought down at his side, 3 arm swept wide (throwing),
   4 arm thrust forward (casting a bolt), 5 sword drawn and raised. Today he never moves:
   only the fire, his eyes and the camera do.
4. **Malgor's fallen helm** (scene V) `assets/cinematics/malgor-helm.png`, transparent: his
   spiked helm (attach `warlord_react.png`), dented and split, blood on it, on its side.
