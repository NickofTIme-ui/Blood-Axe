# Painting animation strips that move well

Notes for whoever paints sprite strips in ChatGPT (villagers, hounds, the Ore Crusher,
anything later). The code already does the in-between work: it eases the timing inside
each move (the first and last pose of a wind-up or a recovery hold longest, the middle
flies), squashes and stretches the body on jumps, landings and hits, and blends lean and
shove between states (view/animFeel.js). So the paintings only need **strong key poses**,
not lots of frames.

## Rules for every strip

- **Keep the slot counts in docs/campaign/art-levels-1-2.md.** The code expects them.
- **Same size, same baseline, every cell.** Feet on the same line, same height, same
  scale. A body that drifts or grows between cells reads as jitter, however good each
  pose is.
- **Silhouette first.** Each pose should read as a black shape: arms and weapons clear of
  the body, the action obvious without the detail.
- **Push the extremes.** Wind-ups lower and further back, strikes longer and further
  forward than feels natural. The game is fast; subtle poses vanish.
- **Facing right, one row, plain black (or magenta where the doc says).**

## What each kind of strip needs

| Strip | Poses that matter |
|---|---|
| Attack (4 cells) | 1 **wind-up**: coiled, weight back (held through the startup). 2 **strike**: fully extended, the frame the hit happens. 3 **follow-through**: past the target, off balance. 4 **recover**: back toward stance. |
| Heavy attack (5 cells) | 1 ready, 2 hauling up, 3 **top of the wind-up** (held longest: the warning), 4 **the slam**, 5 resting after it. |
| Run (3 cells) | 1 **contact**: front heel down, legs widest. 2 **passing**: legs crossing under the body, body highest. 3 **contact** on the other leg. The game plays them 1-2-3-2 and drops the body on each footfall. |
| Walk / prowl (6 cells) | contact, down (knees bent, lowest), passing, up (highest), contact, down, on alternate legs. |
| Hit reaction (3 cells) | 1 **snap back** at impact (head and chest thrown away from the hit), 2 off balance, 3 recovering. |
| Jump / pounce | 1 crouch (squashed, low), 2 launch (stretched long), 3 top, 4 landing (squashed). |
| Death (4-5 cells) | 1 the hit, 2-3 buckling, 4-5 down and still. The last cell must lie flat on the baseline. |

## Villagers (assets/sprites/npc/)

- **Standing scared**: shoulders up, weight on the back foot, looking toward danger.
- **Cowering**: arms over the head, knees bent, as small a shape as possible.
- **Waving for help**: one arm high above the head (the game reads this one from far
  away: make the arm the highest thing in the frame).
- **Running (3)**: contact / passing / contact as above, leaning forward, arms pumping
  opposite to the legs.
- **Sitting wounded / kneeling**: a low, wide shape that sits on the same baseline.

Mother and boy use the same poses; the elder's "pointing north" should point up and to
the right with the whole arm straight.
