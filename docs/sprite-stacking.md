# Sprite stacking: notes for Blood-Axe

Source: SpriteCook, "Sprite stacking for fake 3D pixel art cars and props" (2026-11-14),
https://www.spritecook.ai/blog/sprite-stacking-pixel-art  (read 2026-11-27)

## How it works
- Cut an object into flat horizontal slices, one per pixel of height (their car: 15 slices of 24x43 px).
- Draw the ground slice first, each next slice 1 px higher. At 1 px apart they read as one solid object.
- To turn it: rotate every slice by the same angle around its centre, then lift it. One sheet = every angle.
- Lower camera: squash each slice vertically (0.75) before lifting; shows more side, less roof.
- Making slices: normally a voxel editor (MagicaVoxel exports layers). Shortcut for boxy objects:
  four orthographic views (top, side, front, back) -> a pixel exists where all views agree; each row
  of the side view becomes one slice. Top colour from the top view, the 2 px edge from the side views.
  Their Python script (views_to_slices.py, Pillow + numpy) does this; also a free browser generator.
- Prompt layout for the AI image: 2x2 grid, TOP (pointing down), SIDE (pointing left), FRONT, BACK,
  strictly orthographic, same scale, 1 px dark outline, flat fills, no shadows/ground/text.
- Phaser: loop over slice images with nearest filtering, rotate each around its centre, scale height
  by squash, offset up by index.

## Pitfalls they list
- Jitter when turning small sprites (nearest-neighbour jumps) -> draw big.
- Soft/painted edges smear when slices overlap and rotate -> needs bold outline + flat colour.
- Holes and overhangs (arches, wagon beds) come out solid from 4 views -> fix by hand.
- Depth-sort whole stacks by ground point, never slice-vs-slice across objects.
- Outline the finished stack once, not each slice.
- One draw per slice: fine for a few objects; bake static ones to a plain sprite.

## Fit for Blood-Axe (honest take)
Blood-Axe is a side-view brawler with large painted (non-pixel) ChatGPT art. Sprite stacking is built
for top-down, pixel-art, *rotating* objects, so it does not fit the main fights or characters: painted
soft edges are exactly what the article says smears, and nothing in a side-on arena turns on its
vertical axis. Don't restyle existing art for it.

Places it could actually earn its keep (all optional experiments):
1. War map between levels (CutawayScene 'warmap' marker walk). The map is viewed from above, so a
   small stacked token (Rurik's warband banner, a horse, the convoy wagon, a siege tower) could turn to
   face the road as it walks, instead of a flat marker. Best fit: top-down, small, few objects.
2. Spinning pickups / loot (an axe, a shield, a chest) on the map or a menu: a slow-turning stacked
   object looks 3D for very little art.
3. Title or pause-menu flourish: a turning Blood Axe emblem.
4. Pre-baked rotation sheets: use stacking offline (Python) to render 8/16 angles of a prop, then
   ship those as normal frames. Avoids live cost, but for side-view props the gain is small.

Not worth it: arena characters, enemies, painted backdrops, thrown barrels (they spin in the screen
plane, which a normal sprite already does).

Recommended trial if Nick wants one: a stacked warband token on the war map, made from a 4-view
ChatGPT sheet using the article's prompt layout, drawn in Phaser with a small loop (no engine changes).

## In the game (27 Nov 2026)
The war map's Oath Keepers token is now a sprite-stacked war wagon (Nick said go).
- Art: ChatGPT four-view sheet, art/war-wagon/wagon-4-views-raw.png.
- Slices: `python tools/stack-slices.py art/war-wagon/wagon-4-views-raw.png assets/cinematics/war-wagon-stack.png --width 48 --shade 0.25`
  gives 66 slices of 48 x 81 (BootScene loads 'war-wagon-stack' as a spritesheet with that frame size;
  change both together).
- Drawing: CutawayScene `token()`. Slices sit in a container scaled (0.55, 0.55 x 0.6 squash); each
  slice is lifted by z / squash so the lift isn't squashed. `tok.face(angle, ease)` turns every slice;
  the march eases it toward the heading two road points ahead so it swings into bends.
- Without the texture it falls back to the old drawn coin.
