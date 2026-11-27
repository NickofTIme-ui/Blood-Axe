# King Vaurath: fighting strips (ChatGPT prompts, level 6 round 2, 27 November 2026)

He is the last boss and still fights on the gladiator's recoloured doll. These strips give
him his own painted body, laid out like every other enemy strip (`src/data/enemyStrips.js`):
one row of poses, facing RIGHT, on a flat MAGENTA (#FF00FF) background (his black and
ember-red armour vanishes into black), wide even gaps so no two poses touch, the same scale
and the same feet line in every pose. Files: `assets/enemies/strips/king_<strip>.png`.

Reference pictures sent with every prompt (claude.ai artifact "Keep Art References"):
`#king-design` (his approved look: the five cutaway poses) and `#layout-<strip>` (the
gladiator's strip of the same name, for the layout only, never his look).

## The design line (start of every prompt)

> Blood Axe, a dark-fantasy side-scrolling brawler. KING VAURATH, THE ASHEN CROWN, exactly as
> in the attached design sheet: tall, gaunt, long grey-brown hair, a jagged black-iron crown,
> blackened plate armour chased with gold filigree, a gold lion's head on the left pauldron,
> a long tattered black-and-ember-red cloak, a long sword whose blade glows like cooling
> lava. Painted in the same rich, high-detail pixel-art game style as the design sheet.
> Side view, facing RIGHT. One horizontal row of separate poses on a flat pure magenta
> (#FF00FF) background, wide even gaps between poses, no pose touching another, the same
> size and the same ground line in every pose, no shadows, no ground, no text, no frame.
> Lay the row out like the attached gladiator strip (layout only; his look comes from the
> design sheet).

## The strips (one per message)

1. **walk (8):** a slow, regal stalking walk, sword held low in his right hand trailing its
   point, cloak swaying; a full looping cycle.
2. **react (6):** 0 standing ready, sword raised across his body; 1 breathing in, chin up;
   2 blocking, blade flat across his chest; 3 hit, recoiling back, teeth bared; 4 knocked
   off his feet, flying backward; 5 lying on his back, crown fallen beside him.
3. **atk1 (5), the first cut:** 0 ready; 1 sword drawn back low; 2 a rising diagonal slash,
   a streak of ember along the blade; 3 follow-through high; 4 recovering.
4. **atk2 (5), the backhand:** 0 ready; 1 sword wound back over his left shoulder;
   2 a flat backhand cut across; 3 follow-through; 4 recovering.
5. **heavy (6), the thrust:** 0 ready; 1 drawing the sword back to his hip, blade gleaming;
   2 coiled low; 3 a long lunging thrust, arm and blade straight out; 4 at full reach;
   5 recovering.
6. **special (6), the glide:** 0 ready; 1 dropping low; 2-4 gliding forward low over the
   floor, sword levelled ahead, cloak streaming back in ash; 5 the stab at the end.
7. **chop (5), the held-back third cut:** 0 ready; 1 both hands high over his head;
   2 held at the top (the tell); 3 the overhead chop down to the floor, embers bursting;
   4 recovering.
8. **cast (6), the King's sorcery:** 0 ready; 1 free left hand raised, palm up, ash
   gathering; 2 the hand clenched, ember light in it; 3 flinging the hand forward, ember
   bursting; 4 both arms spread wide, commanding (the Keep obeys); 5 lowering.
9. **kneel (3):** 0 dropping onto one knee, leaning on his sword; 1 on both knees, head
   bowed, crown askew; 2 on his knees, head raised in hatred (his last words).
