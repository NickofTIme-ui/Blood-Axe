# Enemy art upgrade — progress

Replacing the code-drawn enemy body parts with ChatGPT-made parts sheets.
ChatGPT chat: project "Bloody Axe" → "Create warrior sprite" (it has the two concept sheets).

| Enemy | id | Sheet | Wired into game |
|---|---|---|---|
| Gorrak the Flayer | butcher | assets/enemies/butcher-parts.png | yes |
| Sliv the Hollow | stalker | assets/enemies/stalker-parts.png | yes |
| The Iron Penitent | penitent | assets/enemies/penitent-parts.png | yes |
| Vorn Skullsplitter | berserker | assets/enemies/berserker-parts.png (the "no blood, no skulls" prompt got past the filter) | yes |
| Grubb Rotchain | ghoul | assets/enemies/ghoul-parts.png | yes |
| Pitlord Kragg | gladiator | assets/enemies/gladiator-parts.png | yes |

All six done.

## Ulric's new animation strips (ChatGPT chat "Create Pixel Art Sprite Strip")
walk (lumbering, legs cross), roll up, roll down, Sparta kick, wide sword sweep (light 1),
two-handed downward cleave (heavy). Files: assets/sprites/strips/, listed in
src/data/spriteStrips.js — the game cuts them into frames at boot (src/view/stripImporter.js),
no Python needed. Firebolt art: assets/fx/firebolt-strip.png (from Codex, 2026-09-29). To redo one, generate a new sheet, overwrite its PNG, and re-check its rects/pivots
with tools/parts.html (the layout may shift between generations).

## How to finish one
1. In that chat, ask for a parts sheet (see PROMPTS.md). Keep blood/gore words out of the prompt.
2. Save the image as `assets/enemies/<id>-parts.png`.
3. Open `http://localhost:8123/tools/parts.html?file=assets/enemies/<id>-parts.png` to get rects.
4. Add an entry to `src/data/enemyParts.js` (copy an existing one; set pivots for neck, hips,
   shoulder/fist, hip/knee, knee/ankle, weapon grip). `size` fine-tunes a part's scale,
   `flipY` flips a part drawn upside down, `hookRot: 90` for a thrown item drawn ring-at-bottom.
5. Press 1–6 in game to spawn and check it.
