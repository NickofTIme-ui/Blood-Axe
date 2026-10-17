# Level 5 (The Iron Gates): art still missing (17 Oct 2026)

Nick: "can you get the art going for the 5th level".

Level order: Burning Village, Gallows Wood, Hollow Mountain, Shattered Ascent, **The Iron
Gates** (`src/data/stageGates.js`). Checked by loading every section in the game.

Already painted at the current quality: sky, far (the Black Keep), mid, the wall, the ground
(the Magnific pass), the gatehouse, winch room, granary, inner wall and keep road set pieces,
the winch, Vincent, his cage and the Gate Scorpion, the Gate Twins, Malgor, the townsfolk,
barrels, crates, bodies.

## What's off

| # | Item | Where you see it | Why it looks wrong | Fix |
|---|---|---|---|---|
| 1 | The gatehouse stair and guardroom landing | THE GATEHOUSE, the whole climb | flat grey code boxes, the only unpainted ground you stand on in the level | prompts A and B |
| 2 | The rotten floor over the oubliette | THE GATEHOUSE, between stair and landing | code-drawn brown planks | prompt C |
| 3 | The ram on the road | THE KILLING GROUND, the first thing you jump | a grey code box | prompt D |
| 4 | The overturned cart | THE LOWER TOWN | a grey code box | **done**: it uses the village's painted burnt cart now (no new art) |
| 5 | Lamp posts | all through the level (12) | the green-lit wooden lantern post from the wood and the mine; this is an iron fortress | prompt E |

## How to use

- New chat **BA · Level 5 · Iron Gates** (or the existing one). Start every prompt with
  the **style block** from `docs/art-direction.md`:
  > Painted dark-fantasy 16-bit arcade art, matching the attached pictures: chunky readable
  > shapes, soft painted shading, limited palette, light from the upper left plus warm
  > firelight from below. Seen from the game's low three-quarter camera. No text, no
  > watermark, no frame, no border, no people unless asked.
- In the first message attach `assets/env/gates/wall.png`, `assets/env/gates/ground.png`
  and `assets/env/village/prop_cart.png` (match their stone, soot and finish).
- Save each result at the path in its heading. The game picks every one up by itself, no
  code needed; until a file exists the game keeps what it has now.
- Reject and redo if: text or signatures, magenta inside the art, a visible seam when two
  copies are put side by side (tiles), a front face painted along the edge of a top tile, a
  different camera angle from the cart.

---

### A. `assets/env/gates/surf_rock_top.png` (opaque tile): the stair and landing, from above
```
[style block] A seamless tile of the flat top of a fortress stair landing, seen from above at a low angle: big dressed grey stone slabs, worn smooth in the middle where feet go, soot in the joints, a few scattered straws and a dropped arrow, warm torchlight on it. It must read as the LIGHTEST surface in the scene, lighter than the yard's flagstones. ONLY the top surface: no front edge, no lip, no step face along any side. Tiles seamlessly on all four sides. 2:1, about 1774 x 887. No text.
```

### B. `assets/env/gates/surf_rock_front.png` (opaque tile): the stair's front, side on
```
[style block] A seamless tile of the front face of a fortress stair seen straight on: courses of big soot-blackened grey stone blocks, mortar lines, an iron ring or two, scorch marks, darker toward the bottom. Darker than the stone top it sits under. Tiles seamlessly left and right. 2:1, about 1774 x 887. No text.
```

### C. `assets/env/gates/surf_plank.png` (opaque tile): the guardroom's rotten floor
```
[style block] A seamless tile of a rotten guardroom floor seen from above at a low angle: old dark oak planks running left to right, split and sagging, black gaps between them with a faint cold draught of darkness below, rusted iron nails, a few planks cracked through. It should look like it will give way. Tiles seamlessly on all sides. 2:1, about 1774 x 887. No text.
```

### D. `assets/env/gates/prop_ram.png`: the burned-out battering ram
```
[style block] One object for a side-scrolling brawler, seen side on from the game's low three-quarter camera: a wrecked siege battering ram lying on a stone road. A heavy wheeled timber frame with a peaked roof of charred planks and torn hides, its roof half burned away, one wheel broken, the great iron-capped log still slung inside on chains. Still smouldering in places, a few embers, no big flames. Low and long: about twice as wide as it is tall, waist high on a man, so a fighter can jump on top of it. The bottom of the wheels sits on the bottom edge of the picture. FLAT PURE MAGENTA (#FF00FF) background everywhere around it, nothing magenta in the art. About 1774 x 887. No people, no text.
```

### E. `assets/env/gates/brazier.png`: an iron brazier stand
```
[style block] One object for a side-scrolling brawler: a tall black iron brazier on a three-legged stand, as tall as a man, a deep iron fire basket on top full of burning coals and bright orange flame, a little smoke, soot on the iron, a chain hanging from one side. It stands upright and fills the picture's height, the fire at the top centre, the feet at the bottom centre. FLAT PURE MAGENTA (#FF00FF) background everywhere around it, nothing magenta in the art. Portrait, about 512 x 1024. No people, no text.
```

---

## Wiring (already in the code)

- A, B, C: `surfaces` in the gates' entry of `src/data/levelArt.js`; drawn on every stone
  block and the crumbling floor by `view/TerrainView.js` (`surface()`).
- D: `props.ram` in the same entry (texture `prop-ram`); the road block has `look: 'ram'` in
  `data/stageGates.js`, drawn by `TerrainView.drawPaintedBlock` like the village's carts.
- The town's cart: `look: 'cart'` (the village's `prop_cart.png`), same function.
- E: loaded in `BootScene` as `gates-brazier-src`; `TerrainView.drawLanterns` stands one at
  each of the level's `lanterns`, `TORCH_H` tall, with a flickering glow at the top.

## Not on the list

- The great gate itself (the iron block held by the winch) is still drawn in code, but you
  see it side on as a thin wall of bars for a few seconds; a painting would need new code to
  show it. Say if you want it.
