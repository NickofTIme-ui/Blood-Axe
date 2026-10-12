# Vincent, the Gatewright: ChatGPT prompt pack

Nick (12 October 2026): "Add vincent to the game as a character as well, if there's an npc
named vincent rename him. Give him the same treatment as Nicholas major role status. Does
something cool fully implemented".

**The role.** Vincent is the Gatewright, the young engineer who built the Iron Gates: the
gates, the winch and the Gate Scorpion (a great crossbow on a cart). When the King shut the
gates on his own men, Vincent unbarred the sally port for them ("live and let live", from his
photo's caption) and was caged on the guardroom landing to hang at dawn. In THE IRON GATES
(level 5):

- **The gatehouse:** he calls to the heroes from his cage. The gatehouse isn't won until a
  hero holds the lock open (E / D-pad up). Freed, he tells them who he is and how the winch
  works, and goes up to the gate tower.
- **The gate yard:** he rolls out the Gate Scorpion. In the fight it picks the lane with the
  most Ashen in it, rolls round to it while the lane glows on the ground (gold, then red), and
  looses a bolt the length of the yard that skewers every Ashen man in that lane. It never
  hits a hero or a boss.
- **The Marshal's yard:** when Malgor "will not fall" (his last third), Vincent puts one
  bolt through him. It knocks him flat and takes 15% of his health, but never the last of it,
  so the heroes still get the kill.
- **The Keep road:** he tells them about a postern into the Black Keep that he built, and
  says he'll be there to open it (the next level, not built yet).

He lives. (Nicholas dies on the Ascent; Vincent is the one who makes it.) The reeve who used
to be called Vincent is now **Aldric** (`data/speakers.js`, portrait `aldric.png`).

Code: `data/stageGates.js` (his npc, story beats, the `ballista` hazards), `stage/Stage.js`
(`updateBallista`, `section.frees`), `stage/Story.js` (`posts`), `view/VincentView.js` (him and
the scorpion), `view/NpcView.js` (`drawGatewright`). Tests: `tests/logic-test.js` "gates: Vincent".

**His likeness** comes from Vincent's photo (project files `vincent-npc/vincent-photo.png`, a
yearbook photo; attach it to both prompts). It isn't in the repo, so it stays private. Keep
these from the photo: short thick dark-brown hair swept up and back from the forehead, full
and neat; heavy, thick dark eyebrows; dark eyes; a strong straight nose; clean-shaven; a
narrow, youthful face with a defined jaw; a sly, easy half-smile. He's in his twenties. Keep
his look clever and cocky, not grim like everyone else: he's the one who still smiles.

**His outfit** (a nod to the suit and tie in the photo): a fitted charcoal-black wool coat
to the knee, open over a white linen shirt, a dark neckcloth with a small gold pattern, dark
trousers and boots, a leather tool belt with a mallet, a brass rule and a ring of keys, a
pair of brass-rimmed engineer's goggles pushed up on his forehead is optional (leave them off
if they hide the hair).

## 1. The portrait: `assets/ui/portraits/vincent.png`

Square. It goes in the dialogue box like the others (`docs/portrait-art-prompts.md`, same
style line). If the portraits chat is already open in ChatGPT, send it there so the style
matches the rest.

> Square bust portrait for a dark-fantasy pixel-art game's dialogue box. Head and
> shoulders, three-quarter view, facing right, looking toward the viewer. Detailed 16-bit
> style pixel art like a modern SNES-inspired RPG, painterly shading, strong rim light,
> rich but grim colours. Plain very dark background (near black, slight navy), no frame,
> no text, no border. Medieval world burned by a tyrant king; everyone looks tired, dirty
> and hard-worn.
>
> Vincent, the Gatewright, a young engineer in his twenties, drawn as the young man in the
> attached photo: the same face. Short thick dark-brown hair swept up and back from the
> forehead, heavy thick dark eyebrows, dark eyes, a strong straight nose, clean-shaven, a
> narrow youthful face with a defined jaw, a sly easy half-smile. A charcoal-black wool coat
> over a white linen shirt and a dark neckcloth with a small gold pattern, a smudge of soot on
> one cheek, a bruise under one eye from his cell. Clever, cocky and unafraid: the one man in
> this war who still smiles.

## 2. The sprite sheet: `assets/sprites/npc/vincent.png`

One row of **9 poses on plain black**, facing right, nothing touching, in the same painted
style and size as `assets/sprites/npc/villager.png` (attach it, and the photo). The game cuts
the row by the gaps between the poses and scales it by the tallest one, so the poses can be
slightly different sizes. The order matters (`view/VincentView.js` `VINCENT_CELLS`):

1. standing at ease, arms folded, a half-smile
2. gripping the bars of a cage in front of him with both hands (draw only him, no bars)
3. cranking a winch handle at waist height with one hand (draw only him and the handle)
4. crouched, aiming: leaning forward, one eye shut, sighting along something at chest height
5. loosing: leaning back, pulling a long trigger lever toward himself with both hands
6. walking (one foot down)
7. walking (legs passing)
8. walking (the other foot down)
9. one arm up, waving the heroes on, grinning

> A sprite strip, one row of 9 poses on plain black, facing right, the same painted style
> and size as the attached villager strip. Vincent, a young engineer in his twenties, with
> the face of the young man in the attached photo: short thick dark-brown hair swept up and
> back, heavy dark eyebrows, clean-shaven, a narrow youthful face, a sly half-smile. A
> charcoal-black wool coat to the knee, open over a white linen shirt and a dark patterned
> neckcloth, dark trousers and boots, a leather tool belt with a mallet, a brass rule and a
> ring of keys. Poses: 1 standing at ease, arms folded; 2 gripping cage bars in front of him
> with both hands (no bars drawn); 3 cranking a winch handle at waist height; 4 crouched,
> sighting along something at chest height, one eye shut; 5 leaning back, pulling a long
> trigger lever with both hands; 6-8 a confident walk (three frames); 9 one arm up, waving
> the others on, grinning. No text, nothing touching, no ground line.

## 3. (Optional) the Gate Scorpion: `assets/sprites/npc/scorpion.png`

The scorpion is drawn in code for now (`view/VincentView.js` `engine`). If Nick wants it
painted, this is the prompt; wiring it in is a small cloud job afterwards.

> A single game sprite on plain magenta (#FF00FF), side view facing right, same painted
> dark-fantasy pixel style as the attached villager strip: a medieval siege crossbow (a
> "scorpion") on a two-wheeled wooden cart. A long oak stock with a winch drum and handle at
> the back, two curved iron bow arms at the front, a taut string, a heavy iron-headed bolt in
> the groove, iron-shod spoked wheels, scratched and soot-stained. About as long as a man is
> tall. No text, no shadow, no ground line.

## How to use

1. Use the "Bloody Axe" ChatGPT project. Do the portrait in the portraits chat, and the sheet
   in a new chat called **BA · Vincent**, with the photo and `villager.png` attached.
2. Save each one with the file name above it, put it in the folder, and commit it. The game
   picks up both files on the next load (`data/speakers.js` finds `vincent.png` by his key;
   `data/levelArt.js` `SPRITE_SHEETS.vincent`). Until then he shows as a code-drawn stand-in
   and the dialogue box shows a hooded bust with a V.
