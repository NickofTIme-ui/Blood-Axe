# The Mine's chained prisoners: ChatGPT prompt pack

Nick (11 October 2026): "the chained NPCs in the Mine again look so small, low quality.
Can we have some variance to their looks and improve all of them."

The code side is done (`src/view/NpcView.js` `PRISONERS`, `drawChained`): the prisoners are
cut from the existing villager, captive and elder sheets at the heroes' height (they were
about a quarter smaller), each one has his own sheet, tint, size and pair of poses, and
each is held by a drawn iron chain from his ankle to the post. What code can't do is give
them different faces and bodies: today they are still the same peasant man three times
(and Hilde is a man). These prompts give each prisoner his own sheet. The game picks a
sheet up as soon as it is in `assets/sprites/npc/` (`data/levelArt.js` `SPRITE_SHEETS`);
anyone without one keeps the stand-in.

## Rules for every sheet

- One row of **7 poses on plain black**, facing right, nothing touching, the same painted
  style and size as `assets/sprites/npc/villager.png` (attach it every time; attach
  `assets/sprites/npc/captive.png` too for the clothing).
- Poses, in this order:
  1. on his knees, both hands on the iron chain at his ankle, pulling at it
  2. standing, one arm raised, pleading/calling for help
  3. cowering, arms over his head
  4. running (one foot down)
  5. running (legs passing)
  6. running (the other foot down)
  7. standing, exhausted, shoulders down
- An iron cuff on the LEFT ankle in every pose (the game draws the chain to it while he is
  chained). No chain in the picture.
- Miners worked to the bone in the Ashen King's mine: coal dust and rock dust on skin and
  clothes, torn sleeves, rag-wrapped hands, no weapons, no helmets, no tools.

## How to use

1. In the "Bloody Axe" ChatGPT project, open a new chat **BA · Mine prisoners** and send
   the prompts from that chat, in order, so the style stays matched.
2. Save each result as the file named above its prompt, then commit it. If a sheet comes
   out with the poses at different sizes, that's fine: the game scales by the tallest pose.

## The prompts

### `assets/sprites/npc/prisoner_tobin.png` (Old Tobin)
> A sprite strip, one row of 7 poses on plain black, facing right, the same painted style
> and size as the attached villager strip. Old Tobin: a wiry old miner in his sixties,
> bald on top with a ring of white hair and a short white beard, deep-set eyes, thin arms
> corded with muscle, a sleeveless leather jerkin over a grey shirt black with coal dust,
> a rope belt, patched wool trousers, rag-wrapped feet. An iron cuff on his left ankle.
> Poses: 1 kneeling, both hands on the chain at his ankle, pulling; 2 standing, one arm
> raised, calling for help; 3 cowering, arms over his head; 4-6 a slow, stiff run (three
> frames); 7 standing, exhausted. No text, no chain, nothing touching.

### `assets/sprites/npc/prisoner_hilde.png` (Hilde)
> The same strip and style. Hilde: a strong woman of about thirty, a miner's daughter, dark
> hair tied back under a torn headscarf, a smudged face, a cut on one cheek, a rough
> undyed linen dress hitched up and knotted at the knee over leggings, a leather apron
> scorched and torn, bare forearms with soot to the elbows, wrapped boots. Defiant, not
> helpless. An iron cuff on her left ankle. Same 7 poses in the same order.

### `assets/sprites/npc/prisoner_bram.png` (Bram, the Shattered Ascent)
> The same strip and style. Bram: a big, broad-shouldered blacksmith, shaved head, thick
> red-brown beard, a burn scar down one forearm, a heavy leather smith's apron over a
> bare chest, torn trousers, bare feet. An iron cuff on his left ankle. Same 7 poses.

### `assets/sprites/npc/prisoner_a.png` (chained miner 1)
> The same strip and style. A young miner of about twenty, gaunt, shaggy black hair over
> his eyes, a sleeveless dark-blue tunic in rags, ribs showing, arms streaked with coal.
> An iron cuff on his left ankle. Same 7 poses.

### `assets/sprites/npc/prisoner_b.png` (chained miner 2)
> The same strip and style. A heavy-set middle-aged miner, balding, a grey-streaked
> moustache, a padded faded-red gambeson split at the seams, a cloth wrapped round his
> head like a bandage. An iron cuff on his left ankle. Same 7 poses.

### `assets/sprites/npc/prisoner_c.png` (chained miner 3)
> The same strip and style. A lean, weathered miner woman in her forties, grey hair in a
> rough braid, a hooded grey-green cloak in tatters over a brown smock, rag-wrapped
> hands. An iron cuff on her left ankle. Same 7 poses.
