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
| 1 | Roast meat (the "chicken"), wine, mana potion, relic | dropped by every barrel and crate | cut from the first prop sheet (`assets/env/props.png`, older pixel style) | **done**: meat and wine removed, health is a green jar (Nick); new art, prompt A |
| 2 | Boss trophy | dropped by Brother Cinder and Varek | a stand-in drawn in code (a yellow box with a red dot) | prompt A (same sheet) |
| 2b | Secret treasures (new) | level 1: an urn behind the road's burnt timbers, an urn on the chimney up to Tam | new | prompt A (same sheet) |
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

### A. `assets/env/pickups-hd.png`: the pickups (health jar, mana jar, trophy, three secret treasures)
Nick, 17 Oct: no more roast meat or wine. Health is a green magic jar, mana the blue one, the
boss trophy repainted, and three secret treasures (the Oath Chalice, Hakon's signet ring, a
runestone of the first fire).
```
[style block] A sheet of six small pickup items for a side-scrolling brawler, laid out in a grid of 3 columns and 2 rows on a PLAIN PURE BLACK background, each item centred in its own cell, well apart, nothing touching each other or the edge. Same painted finish, detail and lighting as the attached barrel, crate and urn. Top row, left to right: 1) a round-bellied glass magic jar full of glowing swirling EMERALD GREEN liquid with tiny sparkles, a short neck with a cork bound in leather and gold wire, a small gold heart-shaped charm hanging on a cord (health); 2) the SAME jar, same shape and size, full of glowing swirling SAPPHIRE BLUE liquid, a small silver star charm (mana); 3) a war trophy: a small iron-bound reliquary chest with a peaked lid, gilded corners, a blood-red gem set in the front, a torn scrap of red Ashen banner tied to it. Bottom row: 4) the Oath Chalice: an ancient gold chalice set with red and blue stones, a sword engraved on its bowl; 5) Hakon's signet ring: a heavy gold ring with a red stone carved with a sword, lying on its side so the stone faces the viewer, drawn LARGE so it fills its cell like the others; 6) a runestone of the first fire: a palm-sized dark stone tablet carved with glowing orange runes, cracks of fire light in it. Each item upright, seen from the same low three-quarter angle, no shadows on the ground, no glow or light rays drawn around them (the game adds the glow). 3:2, about 1536 x 1024. No text.
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
