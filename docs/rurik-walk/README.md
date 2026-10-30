# Rurik's side walk: a real two-step stride (2026-10-30)

Nick: the old walk was "just one leg stepping forward". The old ChatGPT walk2 strips kept
the same leg in front in all 8 drawings, so no code timing could fix it.

New art: ChatGPT (desktop app, Bloody axe project), 4x2 sheets on magenta.
- `source-oathkeeper.png` (Oathkeeper look) — used in order 0..7
- `source-old-sword.png` (old sword, before Elder Brann hands him Oathkeeper) — used as
  0,1,2,4,4,5,6,7 because its pose 4 still has the gold knee in front
The near leg wears a gold knee-guard so the two legs read apart: gold leg in front
(poses 1-3, 8), far leg in front (4-5), gold leg swinging past (6-7).

Built into `assets/sprites/heroes-hd/rurik-<sheet>-walk2.png` (416x480 cells, feet on
y=459 like the old ones, same 224 px figure height) with
`python3 docs/rurik-walk/build.py <source> <hd out> <strip out> <old hd sheet> [order]`.
The same image is copied over `assets/sprites/strips/(oathkeeper/)ulric_walk2.png`
(transparent, the strip importer accepts it) so the fallback matches.

Prompts: an 8-pose walk with explicit left-then-right leg order failed (ChatGPT copied the
top row into the bottom row). What worked was the follow-up asking to mark the near leg
with a gold knee-guard and spelling out which leg is in front in each row. The old-sword
sheet was a repaint of the Oathkeeper sheet with the old outfit reference attached.

Not redone yet: the up/down and three-quarter walks (walkU/D/UD/DD).
