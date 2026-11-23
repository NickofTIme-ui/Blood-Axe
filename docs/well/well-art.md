# The well's painted art (level 1 market square, stage/WellRescue.js)

Made in ChatGPT on Nick's PC, 2026-11-23 (chat "Create Sprite Sheet" in the Bloody axe project).
Originals: docs/well/painted/. Baked with `python tools/bake-pose-row.py <painted> <out> <N>`.

- **mira.png** (5 poses, from mother.png attached): standing frightened; crouched sobbing;
  lunging forward reaching, hood pulled back as if held; screaming, both arms reaching; shoving
  with both palms.
- **butcher_hold.png** (3 poses, from butcher_react.png attached): front arm straight out at
  shoulder height, fist closed "as if holding up a heavy sack by its neck"; the same, shaking it;
  arm lowered to chest height. (ChatGPT refused the butcher and the boy in one picture, so they
  are painted apart and put together in the game: view/NpcView.js drawWellHold, WELL_ART.)
- **boy_held.png** (3 poses, from boy.png attached, facing left): in mid-air as if hoisted by
  the back of his collar: flailing up, reaching down, hanging.
