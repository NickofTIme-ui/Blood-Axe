# Level 1 (The Burning Village): art that doesn't match the rest (17 Oct 2026)

Nick: "theres items that have very low res art that needs to be fixed, the chicken, magic
potions all items that dont have the same quality art thats in the latest build".

Checked by walking the whole level in the game. Everything else in level 1 (street, house
fronts, sky, barn, stables, longhall, gate, pikes, roofs, carts, wreckage, archer posts,
barrels, crates, oath shrine, bodies, villagers, heroes, enemies) is already painted at the
current quality. The well and the burning beam are another thread's, so they're not here.

## What's off

| # | Item | Where you see it | Why it looks wrong | Fix |
|---|---|---|---|---|
| 1 | Roast meat (the "chicken"), wine, mana potion, relic | dropped by every barrel and crate | cut from the first prop sheet (`assets/env/props.png`, older pixel style) at the size it's drawn and blown up blocky | **code, done**: now cut at 4x and smoothed. **Art**: repaint, prompt A |
| 2 | Boss trophy | dropped by Brother Cinder and Varek | a stand-in drawn in code (a yellow box with a red dot) | prompt A (same sheet) |
| 3 | Torch posts | 5 along the roofs, the mill yard and the north gate | drawn in code: a black stick and a glow | prompt B |
| 4 | The mill's raised floor | middle of the Mill Yard | drawn in code as a slab of roof with a house front under it, so it reads as a house sitting in the yard | prompt C |

## How to use

- New chat **BA · Level · Burning Village** (or the existing one). Start every prompt with
  the **style block** from `docs/art-direction.md`:
  > Painted dark-fantasy 16-bit arcade art, matching the attached pictures: chunky readable
  > shapes, soft painted shading, limited palette, light from the upper left plus warm
  > firelight from below. Seen from the game's low three-quarter camera. No text, no
  > watermark, no frame, no border, no people unless asked.
- Attach `assets/env/props-hd.png` (the repainted barrel, crate and urn: match their finish
  and detail) and the level-1 screenshot from the project files
  (`level-one/pickups-now.png`).
- Save each result at the path in its heading. The game picks every one up by itself, no
  code needed; until a file exists the game keeps what it has now.
- Reject and redo if: text or signatures, magenta inside the art, objects touching each
  other or the edge, a different camera angle from the barrel and crate.

---

### A. `assets/env/pickups-hd.png`: the pickups (meat, wine, mana, relic, trophy)
```
[style block] A sheet of five small pickup items for a side-scrolling brawler, laid out in a grid of 3 columns and 2 rows on a PLAIN PURE BLACK background, each item centred in its own cell, well apart, nothing touching, the last cell (bottom right) left empty. Same painted finish, detail and lighting as the attached barrel and crate. Top row, left to right: 1) a big roasted meat leg, a whole roast chicken drumstick, golden-brown crackling skin, the bone end sticking out, glistening; 2) a dark green glass wine bottle in a woven wicker sleeve, cork and red wax seal; 3) a round glass potion flask full of glowing swirling blue liquid with tiny sparkles, a gold stopper. Bottom row: 4) a jewelled gold chalice with red and blue stones; 5) a small gilded reliquary box with a peaked lid and one large blood-red gem on its front. Each item seen from the same low three-quarter angle, upright, no shadows on the ground, no glow drawn around them (the game adds the glow). 3:2, about 1536 x 1024. No text.
```

### B. `assets/env/village/torch.png`: a torch post
```
[style block] One object for a side-scrolling brawler: a tall rough timber post driven into muddy ground, an iron bracket near the top holding a burning pitch torch, bright orange flame, a little smoke, soot on the wood, a rag tied round the post. It stands upright and fills the picture's height, the flame at the top centre, the foot of the post at the bottom centre. FLAT PURE MAGENTA (#FF00FF) background everywhere around it, nothing magenta in the art. Portrait, about 512 x 1024. No people, no text.
```

### C. `assets/env/village/mill_floor.png`: the mill's raised floor
```
[style block] One object for a side-scrolling brawler, seen from the game's low three-quarter camera: a long, low raised timber platform outside a burning watermill, about knee-to-waist high on a man, so a fighter can jump up and fight on top of it. Its deck of heavy planks is seen from slightly above (the back edge higher in the picture than the front edge), sacks of grain and a millstone leaning on one end, a short ladder at the front. The front face is heavy squared beams on stone footings, scorched, a few embers. The deck takes the upper half of the picture and the front face the lower half. Wide and low: about 2.4 times as wide as it is tall. FLAT PURE MAGENTA (#FF00FF) background everywhere around it, nothing magenta in the art. About 1774 x 740. No people, no text.
```

---

## Wiring (already in the code)

- A: `view/propSheet.js` `PICKUP_PAINTED` (3 x 2 grid), loaded in `BootScene` as
  `pickups-hd-src`. Until it exists the pickups are cut from `props.png` at 4x
  (`PICKUP_HD`) and the trophy stays the code drawing.
- B: `view/TerrainView.js drawLanterns`, `TORCH_H` (its height on screen).
- C: `view/TerrainView.js drawMillFloor` (the block's `look: 'mill'` in
  `data/stageVillage.js`), fitted to the block's width, standing on its front edge.
