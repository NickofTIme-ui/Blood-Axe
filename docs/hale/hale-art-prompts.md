# Hale the smith: painted sheet (2026-11-02)

Nick: "the npc just standing there in the beginning needs good solid animation and movement,
he looks copy and pasted". Hale stood on the villager sheet, the same man Varek kills.

Made in ChatGPT (desktop app on Nick's PC) with assets/sprites/npc/villager.png attached as
the style reference. Saved as Downloads\hale-smith\hale-v1.png, re-laid one pose per cell
with `python3 relay.py hale-v1.png ../../assets/sprites/npc/hale.png`.

Prompt (one go, first try):

> Create image: a sprite sheet in EXACTLY the same painted art style, lighting and level of
> detail as the attached sheet (dark gritty hand-painted medieval fantasy, side view, plain
> pure black background). It must be a DIFFERENT character: Hale, a village blacksmith in his
> 50s. Big, broad-shouldered and barrel-chested, much heavier build than the attached man. Bald
> head with a thick grey-streaked short beard, soot on his face and forearms, bare muscular
> forearms, rolled-up dark red-brown linen shirt, a long scorched brown leather smith's apron
> down to his shins, heavy leather gloves tucked in his belt, dark trousers, heavy boots. He
> carries a smith's forging hammer (a work tool). Exactly 8 full-body poses of this SAME man,
> in ONE single horizontal row, evenly spaced, all facing RIGHT, all the same size and scale,
> all with feet on the same ground line, nothing overlapping, nothing cut off: 1) standing
> tired and wary, hammer hanging in his right hand, chest heaving; 2) the same standing pose
> but head turned back over his shoulder looking behind him worriedly; 3) beckoning, his free
> arm raised high waving someone over; 4) walking, left foot forward; 5) walking, legs
> passing; 6) walking, right foot forward; 7) pointing ahead firmly with his free arm
> outstretched, showing the way; 8) wiping sweat and soot from his brow with his forearm,
> exhausted. Keep his face, clothes, colours and proportions identical in every pose. No text,
> no labels, no ground shadow, no background scenery.

Cells (view/NpcView.js CELLS.hale): stand, look, wave, walk x3, point, wipe.
His behaviour: stage/SmithLife.js.
