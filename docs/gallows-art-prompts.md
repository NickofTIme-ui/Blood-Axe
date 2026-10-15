# Art to paint: THE GALLOWS ASCENT

The night climb (`src/data/stageGallows.js`) is still drawn in code. Its backdrop, cliff
wall, floor and ledge surfaces now load painted art by file name from
`assets/env/gallows/` (`src/data/levelArt.js` `gallows`, drawn by `view/TerrainView.js`).
Each file plugs in alone, no code change. The rest of the list in
`docs/gallows-art-needed.md` (the cage lift, scaffold, bell, roost, blood altar) still
needs code before painting it would show.

**How to paint:** one ChatGPT chat, "BA · Level · Gallows Ascent". In its first message
attach `assets/env/wood/far.png`, `assets/env/ascent/wall.png`,
`assets/enemies/strips/grunt_walk.png` and a screenshot of the level. Palette: night
mist-blue and rust. Rock is cold grey-blue, wood rotten brown, iron dark steel with rust,
lanterns warm amber. No red-and-gold glow.

### 1. `assets/env/gallows/sky.png` (opaque)
> In the painted dark-fantasy 16-bit arcade style of the attached pictures: a very wide
> seamless night sky, deep blue-black, a hazy pale moon high on the right, thin mist
> drifting across it, a few cold stars. NO land. Left and right edges join seamlessly.
> 3:1 or wider (for example 3072 x 1024). No text, no frame.

### 2. `assets/env/gallows/far.png` (magenta above the skyline)
> Same style. A very wide seamless strip of far cliffs at night, cold blue-grey and hazy,
> with gibbets standing on the ridges and small iron cages hanging from them, mist pooled
> in the valleys. Everything sits in the lower three quarters; everything above the
> skyline is FLAT PURE MAGENTA (#FF00FF), with nothing magenta in the art itself. Left and
> right edges join seamlessly. 3:1 or wider. No text.

### 3. `assets/env/gallows/mid.png` (magenta above the skyline)
> Same style. A very wide seamless strip of nearer crags, darker and sharper than a
> distant layer, a few dead trees and a leaning gallows post, a band of mist along their
> feet. The bottom 20% is solid. Everything above the crags is FLAT PURE MAGENTA
> (#FF00FF). Left and right edges join seamlessly. 3:1 or wider. No text.

### 4. `assets/env/gallows/wall.png` (the cliff face behind the lane)
> Same style. A very wide seamless strip of a cliff face seen straight on: cold
> blue-grey rock, deep cracks, wet streaks, a few rusted iron spikes and old ropes
> hanging down it. The rock fills the bottom 80% of the picture with a rough top edge;
> above it is FLAT PURE MAGENTA (#FF00FF). Left and right edges join seamlessly. 3:1 or
> wider. No people, no text.

### 5. `assets/env/gallows/ground.png` (opaque)
> Same style. A very wide seamless picture of wet slate ground on a night mountain path,
> seen from a low three-quarter angle like a stage floor (far edge at the top, near edge
> at the bottom): mist-blue slate slabs, puddles catching moonlight, grit, a few small
> stones. Nothing taller than a stone, no people. Left and right edges join seamlessly.
> 3:1, about 2172 x 724. No text.

### 6. `assets/env/gallows/surf_rock_top.png` (opaque tile)
> Same style. A seamless square tile of the flat top of a rock ledge seen from above at a
> low angle: worn grey flagstones, lighter than everything around them, a bright worn lip
> along the near edge. Tiles seamlessly on all sides. 2:1, about 1774 x 887. No text.

### 7. `assets/env/gallows/surf_rock_front.png` (opaque tile)
> Same style. A seamless tile of the dark front face of a rock ledge seen straight on:
> cold blue-grey rock, cracks and strata, darker toward the bottom. Tiles seamlessly left
> and right. 2:1, about 1774 x 887. No text.

### 8. `assets/env/gallows/surf_plank.png` (opaque tile)
> Same style. A seamless tile of old rotten wooden planks seen from above at a low angle,
> running left to right, dark brown and wet, rusted nails, gaps between boards. Tiles
> seamlessly on all sides. 2:1, about 1774 x 887. No text.
