# Sprite pipeline (AI strips -> game sprite sheet)

1. **Generate** one animation per image in ChatGPT as a horizontal strip, using the reference
   image of the character: side view facing right, plain black background, a wide empty gap
   between frames, and no effects, ground or blood.
2. **Save** each strip in `art-source/` as `ulric_strip_<animation>.png`.
3. **Run** `runall.sh`. For each strip it:
   - cuts out the frames and removes the background,
   - scales him to a 112px standing height,
   - lines up the feet,
   - locks every frame to one shared colour palette (`palette.png`),
   - packs everything into `assets/sprites/ulric.png` + `ulric.json`.

`anims.txt` lists each strip: `name  frameCount  [scaleRef]  [air]`. Add `air` to keep leaps off the ground (e.g. the leaping chop). `scaleRef` is either the index of
a standing frame or an explicit head-to-feet height in source pixels. Use it when a strip comes
out too big or too small (raised arms confuse the automatic size check).

`build_sheet.py` decides which frames play for each animation and move phase.

Older versions of redone strips are kept in `art-source/v1/`.
