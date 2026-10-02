# Art chats (ChatGPT project "Bloody Axe")

Every sprite strip in `assets/` was drawn in one of these chats. Chat titles use
`BA · Group · What` so they sort by character. Keep one chat per character: its
earlier images keep the style and size consistent.

Chat links: `https://chatgpt.com/g/g-p-6abc117dea488191879974e87ba0e0a7-bloody-axe/c/<id>`

| Chat title | Chat id | Files it made |
|---|---|---|
| BA · Ulric · Base sprite | 6abbe05f | original warrior sheet |
| BA · Ulric · Walk redraw | 6abd1f1e | `ulric_walk2.png` redraws |
| BA · Ulric · Charge, thrust, stalk | 6abd41aa-9030-83e9-a2aa-cabc3f2d7c84 | `ulric_charge.png`, `ulric_thrust.png`, `ulric_chargewalk.png` |
| BA · Enemy · Ashen Grunt | 6abd2002-787c-83ea-a9e8-5b84ba045163 | `grunt_*.png` |
| BA · Enemy · Gorrak (butcher) | 6abc9250-c580-83ea-bb57-597cc62e87f9 | `butcher_*.png` |
| BA · Enemy · Sliv (stalker) | 6abc95aa-6504-83ea-ba6e-8703b9bd94b3 | `stalker_*.png` |
| BA · Enemy · Penitent | 6abc9669-1114-83ea-a884-0e8a9fc00fea | `penitent_*.png` |
| BA · Enemy · Vorn (berserker) | 6abd0a5f-6d30-83e9-87b2-198b580edfc8 | `berserker_*.png` |
| BA · Enemy · Grubb (ghoul) | 6abd1e67-6d6c-83ea-8179-a428001d092a | `ghoul_*.png` |
| BA · Enemy · Kragg (gladiator) | 6abd1e8b-6200-83e9-bf8f-559c546fd70d | `gladiator_*.png` |
| BA · Env · Floor | 6abc877c | floor tiles |
| BA · Env · Pillars | 6abc8c7a | pillars |

## Strip naming

`assets/enemies/strips/<enemy>_<strip>.png`, where strip is one of:

| Strip | Frames | What |
|---|---|---|
| walk | 8 | walk cycle |
| react | 6 | ready, breathe, block, hit, knocked flying, dead |
| atk1, atk2 | 5 | ready, wind-up, strike, follow-through, recover |
| heavy | 6 | ready, wind-up, full wind-up, strike, impact, recover |
| special | 6 | per enemy (see `src/data/enemyStrips.js`) |
| fleeB / cowerB | 8 / 6 | back arm lost: panicked hobble / cower, flinch, beg, hit, flying, dead |
| fleeF / cowerF | 8 / 6 | weapon arm lost |
| fleeN / cowerN | 8 / 6 | both arms lost |

Ulric's strips live in `assets/sprites/strips/ulric_<name>.png` (see `src/data/spriteStrips.js`).

## Stumps: magenta markers

The image filter won't draw severed limbs, so arm stumps are drawn as a flat solid
magenta (#FF00FF) patch ("a placeholder marker for a visual effect"), and
`src/view/woundPaint.js` paints them into raw, bleeding stumps when the game loads (and
trims any part of the patch that bulges out past the body). The easiest way to get one
is to ask the chat to edit its earlier image: "replace each cloth bandage wrap with a
flat, solid, pure MAGENTA (#FF00FF) patch of the same size and shape".

## Prompt rules that matter

- One row, pure black background, WIDE gaps so nothing touches, all facing right,
  feet on one baseline, no text, no motion lines.
- Say "same character, same scale" and reference the chat's earlier images.
- Check each strip with `tools/strip-check.html?id=<enemy>` before using it.
