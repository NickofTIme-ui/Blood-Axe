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
| 1 The Village | I · THE VILLAGE STANDS | confident: shows his power, waves of ash put out the torches | the king learns who they are; his own men start saying "Oath Keepers" |
| 2 Gallows Wood | II · THE CAGES ARE EMPTY | irritated: cracks the throne arm with his fist | the wood went quiet; every prisoner walked free |
| 3 Hollow Mountain | III · THE MOUNTAIN COULD NOT HOLD THEM | frustrated: throws the war map across the hall | even Malgor's men have started saying their names |
| 4 Shattered Ascent | IV · THE ARMY RUNS | uneasy: burns his own captain for saying they can't be killed | his army is running from them |
| 5 Iron Gates | V · NO ONE LEFT TO SEND | afraid: his fire gutters out; then the doors boom, he relights it: "Let them come." | they're at his door |

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

## Painted art (ChatGPT on Nick's PC, 23 Nov, all in)

- The war map `assets/cinematics/keep-war-map.jpg` (loaded as `keep-war-map`; the route's
  places sit on it at `PAINTED_AT` in CutawayScene.js). The code parchment is the fallback.
- The kneeling messenger `assets/enemies/strips/grunt_kneel.png` (3 poses: dropping, bowed,
  looking up to speak; `say()` switches 1 and 2 as the king and messenger talk).
- King Vaurath's acts `assets/enemies/king_vaurath_{rage,hurl,cast,defy}.png`, already facing
  left, swapped in by `kingPose()` (KING_POSES holds each one's body height, feet and the
  hand the fire goes to): rage = fist on the throne (II), hurl = the map thrown (III),
  cast = the captain burned (IV), defy = sword raised, "Let them come." (V).
- Malgor's fallen helm `assets/cinematics/malgor-helm.png` (scene V), rolls in and comes to
  rest on its side.

## Props in the hall (ChatGPT on Nick's PC, 27 Nov)

The last code-drawn pieces, now painted (keyed off magenta, trimmed, 560 px wide;
`assets/cinematics/`, loaded in BootScene): `keep-war-table` (scenes I-III, with the map and
markers on it), `keep-war-table-fallen` (it goes over in III and stays down in IV-V),
`keep-floor-map` (the map he throws, landing at `SPOT.floorMap`), `keep-captain-ash` (V).
Sizes in the hall: `PROP_W` in CutawayScene.js. The drawn shapes stay only as a fallback.
