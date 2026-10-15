# Irvolino, the miller: ChatGPT prompt pack

Nick (15 October 2026), with a photo: "This is Irvolino he's an npc in the game fix his art to
represent him".

**The role.** Irvolino is the miller in THE BURNING VILLAGE (level 1). The Ashen shut him and
his people in the barn and fired it; the heroes clear the wreckage from the door, and he
gasps "Air... Thank the old gods. We will run for the north gate." (`data/stageVillage.js`,
npc `barn`; speaker `MILLER` in `data/speakers.js`). He's in two places: his portrait in the
dialogue box, and the front man of the three who come out of the barn (`view/NpcView.js`,
the `group` pose; the other two stay villagers).

**His likeness** comes from his photo (project files `irvolino-npc/irvolino-photo.jpeg`;
attach it to both prompts). It isn't in the repo, so it stays private. Keep these from the
photo: thick, short, dark brown-black hair, short at the sides and standing up messy on top,
the hairline a little high at the temples; heavy dark straight eyebrows; big round dark-brown
eyes, wide open; a broad, round, full face with heavy cheeks; ears that stand out a little; a
broad nose with a round tip; a full, thick, dark beard and moustache, trimmed fairly short and
fuller at the chin, with a warm reddish-brown tint around the mouth; a big, heavy-set build.
He's in his thirties. Keep his wide-eyed, startled look: he has just been pulled out of a
burning barn.

**His outfit** (both images): a miller's work clothes, a nod to the pale mint sweatshirt in
the photo: a loose faded pale sage-green linen shirt, sleeves pushed up, under a heavy canvas
apron white with flour, a rope belt, brown wool trousers, wrapped shins and worn boots. Flour
and soot on his face, hands and apron.

## 1. The portrait: `assets/ui/portraits/irvolino.png`

Square (cut to 256). It goes in the dialogue box like the others (`docs/portrait-art-prompts.md`,
same style line). If the portraits chat is already open in ChatGPT, send it there so the style
matches the rest.

> Square bust portrait for a dark-fantasy pixel-art game's dialogue box. Head and
> shoulders, three-quarter view, facing right, looking toward the viewer. Detailed 16-bit
> style pixel art like a modern SNES-inspired RPG, painterly shading, strong rim light,
> rich but grim colours. Plain very dark background (near black, slight navy), no frame,
> no text, no border. Medieval world burned by a tyrant king; everyone looks tired, dirty
> and hard-worn.
>
> Irvolino, the village miller, a heavy-set man in his thirties, drawn as the man in the
> attached photo: the same face. Thick short dark brown-black hair, short at the sides and
> standing up messy on top, a slightly high hairline at the temples; heavy dark straight
> eyebrows; big round dark-brown eyes, wide open; a broad round full face with heavy cheeks;
> ears that stand out a little; a broad nose with a round tip; a full thick dark beard and
> moustache, trimmed fairly short, fuller at the chin, warm reddish-brown around the mouth.
> A faded pale sage-green linen shirt under a canvas apron white with flour. Flour and soot
> on his face, red-rimmed eyes from the smoke. Wide-eyed and gasping with relief: he has just
> been dragged out of a burning barn.

## 2. The sprite sheet: `assets/sprites/npc/irvolino.png`

One row of **8 poses on plain black**, facing right, nothing touching, in the same painted
style, size and order as `assets/sprites/npc/villager.png` (attach it, and the photo). The
game cuts the row into 8 equal cells and scales it by the tallest pose
(`data/levelArt.js` `SPRITE_SHEETS.irvolino`, `view/NpcView.js` `CELLS.irvolino`).

> A sprite sheet for a dark-fantasy pixel-art brawler: one row of 8 poses of the same man,
> full body, side view facing right, on a plain black background, evenly spaced, nothing
> touching, no ground line, no text. Match the attached villager sheet exactly in painted
> pixel-art style, size, lighting and pose order.
>
> The man is Irvolino, the village miller, drawn as the man in the attached photo: the same
> face. A big heavy-set man in his thirties, thick short dark brown-black hair standing up
> messy on top, heavy dark eyebrows, big round wide-open dark eyes, a broad round full face,
> a full thick dark beard fuller at the chin. A loose faded pale sage-green linen shirt with
> the sleeves pushed up, a heavy canvas apron white with flour, a rope belt, brown wool
> trousers, wrapped shins, worn boots. Flour and soot all over him.
>
> Poses, left to right: 1 standing, startled and wary, hands half raised; 2 cowering, hunched,
> arms over his head; 3 waving one arm high to call for help; 4-6 running hard (three frames:
> one foot down, legs passing, the other foot down); 7 sitting on the ground, coughing, one
> hand on his chest; 8 kneeling on both knees, looking up, hands on his thighs.

## How to use

1. Use the "Bloody Axe" ChatGPT project. Do the portrait in the portraits chat, and the sheet
   in a new chat called **BA · Irvolino**, with the photo and `villager.png` attached.
2. Save each one with the file name above it. The sheet has to be one figure per equal cell,
   feet on one line, on black (re-pack it if ChatGPT spaces the figures unevenly). The game
   picks up both files on the next load; until the sheet exists he's drawn as the villager.
