# Nicholas, the mountain guide (Nick in the game): ChatGPT prompt pack

Nick (12 October 2026): "I also want to be incorporated into the game. I need a really cool
role one of the good guys an npc", then "Have me guide the heroes through one of the levels
that doesn't have much going on maybe one of the later levels but I'll die in the end and
give them some heroic words to take with them".

**The role.** Nicholas is a mountain guide. He's the wounded "pilgrim" at the end of Gallows
Wood who tells the heroes the carts went into the old mine and says he'll find them on the far
side. On the Shattered Ascent he's waiting for them. He walks the old cliff road a little ahead
of the heroes, calls out the loose rock, the broken stair, the catapults and the half-gone
bridge, waits short of every fight, and keeps back behind the heroes while one is on. In Orsk's
camp the Keep's stones come down on him. When the fight is over he gives Rurik his last words
(a held scene), and then he's gone. Rurik says "For Nicholas" at the high pass. Code:
`stage/Story.js` (`guide`), `data/stageAscent.js`, `data/stageWood.js`, `view/NpcView.js`
(`drawGuide`).

**His likeness** comes from Nick's photo (project files `nick-npc/nick-photo.jpeg`; attach it
to both prompts). It isn't in the repo, so it stays private. Keep these from the photo: a
fully shaved bald head, heavy dark straight eyebrows, dark brown heavy-lidded eyes, a strong
straight nose, a full thick black beard with a moustache (fuller on the chin, a little grey at
the chin), a broad build and a round, strong face. He's in his thirties. Make him a hardy
mountain man, not a soft one: weathered skin and a steady, calm look.

**His outfit** (both images): a dark brown leather coat with a grey wolf-fur collar, worn over
a faded brick-red wool tunic (a nod to the red shirt in the photo), a coil of rope over one
shoulder, a wide leather belt with a hatchet and a horn, wrapped fur boots, and a long
iron-shod ash walking staff.

## 1. The portrait: `assets/ui/portraits/nicholas.png`

Square. It goes in the dialogue box like the others (`docs/portrait-art-prompts.md`, same
style line). If the portrait thread is already in a ChatGPT chat for portraits, send it there
so the style matches the rest.

> Square bust portrait for a dark-fantasy pixel-art game's dialogue box. Head and
> shoulders, three-quarter view, facing right, looking toward the viewer. Detailed 16-bit
> style pixel art like a modern SNES-inspired RPG, painterly shading, strong rim light,
> rich but grim colours. Plain very dark background (near black, slight navy), no frame,
> no text, no border. Medieval world burned by a tyrant king; everyone looks tired, dirty
> and hard-worn.
>
> Nicholas, a mountain guide in his thirties, drawn as the man in the attached photo: the
> same face. A fully shaved bald head, heavy dark straight eyebrows, dark brown
> heavy-lidded eyes, a strong straight nose, a full thick black beard and moustache with a
> touch of grey at the chin, a broad round strong face, weathered by wind. A dark brown
> leather coat with a grey wolf-fur collar over a faded brick-red wool tunic, a coil of
> rope over one shoulder. Calm, steady and brave: the look of a man who knows the mountain
> and isn't afraid of it.

## 2. The sprite sheet: `assets/sprites/npc/nicholas.png`

One row of **9 poses on plain black**, facing right, nothing touching, in the same painted style
and size as `assets/sprites/npc/villager.png` (attach it, and the photo). The game cuts the row by
the gaps between the poses and scales it by the tallest one, so the poses can be slightly
different sizes. The order matters: the first eight are the villager sheet's order, so he
walks on the villager sheet until his own is in.

1. standing, staff in hand, looking ahead
2. braced, staff held across his body in both hands (while a fight is on)
3. standing, one arm out, pointing the way on up the road
4. walking (one foot down)
5. walking (legs passing)
6. walking (the other foot down)
7. sitting slumped against a rock, struck down, one hand pressed to his side, the staff beside him
8. kneeling on one knee, leaning on the staff
9. lying dead on his back, staff fallen beside him, eyes closed (drawn lying flat, feet to the left)

> A sprite strip, one row of 9 poses on plain black, facing right, the same painted style
> and size as the attached villager strip. Nicholas, a mountain guide in his thirties, with
> the face of the man in the attached photo: a fully shaved bald head, heavy dark eyebrows,
> a full thick black beard and moustache, a broad strong build. A dark brown leather coat
> with a grey wolf-fur collar over a faded brick-red wool tunic, a coil of rope over one
> shoulder, a wide belt with a hatchet and a horn, wrapped fur boots, a long iron-shod ash
> walking staff. Poses: 1 standing, staff in hand, looking ahead; 2 braced, staff across
> his body in both hands; 3 standing, one arm out, pointing the way ahead; 4-6 a steady
> walk (three frames); 7 sitting slumped against a rock, wounded, one hand pressed to his
> side; 8 kneeling on one knee, leaning on the staff; 9 lying dead on his back, the staff
> fallen beside him. No text, nothing touching, no ground line.

## How to use

1. Use the "Bloody Axe" ChatGPT project. Do the portrait in the portraits chat, and the sheet in
   a new chat called **BA · Nicholas**, with the photo and `villager.png` attached.
2. Save each one with the file name above it, put it in the folder, and commit it. The game picks
   up both files on the next load (`data/speakers.js`, `data/levelArt.js` `SPRITE_SHEETS.nicholas`).
