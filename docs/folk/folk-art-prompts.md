# Freed villagers: ChatGPT art prompts

Nick (2026-11-20): the people you save run away badly and are always the same few. Sixteen new villagers (data/folk.js), each on one sheet. Paint them in ChatGPT on Nick's PC (Bloody axe project). Attach the **pose guide** (/mnt/project-files/folk-villagers/run-pose-guide.png, also docs/folk/run-pose-guide.png) to every prompt, and after the first one is good, attach that finished sheet as the style reference for the rest.

Save each as assets/sprites/npc/folk/<name>.png (name = id without folk-), run python tools/bake-folk-sheet.py <in> <out>, add the id to FOLK_PAINTED in src/data/folk.js.

Lessons from Rurik's walk: all ten poses must come from ONE painting (never mix sheets); ask for torso twist and arm swing, or ChatGPT paints a toy soldier.

## Base prompt (paste, then the person line)

> Dark medieval fantasy pixel-painted game sprite sheet, same painterly style as the attached reference (gritty, muted earth colours, crisp dark outline, soft rim light). Pure flat black background. ONE character, full body, side view facing RIGHT in every pose, the same size, the same clothes and face in every pose, no text, no labels, no grid lines, no shadows on the ground.
> Two rows on a wide canvas, poses evenly spaced with clear black gaps between them:
> ROW 1 (4 poses): (1) standing, frightened, shoulders hunched, looking around; (2) cowering, crouched low, arms over head; (3) grateful, standing, one hand raised in thanks toward the viewer's right; (4) running flat out but twisting to look back over the shoulder in fear.
> ROW 2 (6 poses): a full RUN CYCLE, fleeing for their life, body leaning forward, arms pumping opposite to the legs. Follow the attached pose guide exactly for the legs: the NEAR leg is the light one, the FAR leg the dark one, painted darker and slightly behind. (1) near foot strikes the ground ahead, far leg back; (2) near foot under the body, far knee swinging forward; (3) pushing off the near foot, far knee high, both feet off the ground; (4) far foot strikes ahead, near leg back; (5) far foot under the body, near knee swinging forward; (6) pushing off the far foot, near knee high, both feet off the ground. The legs MUST visibly swap sides from pose 1 to pose 4. Hair and loose clothing trail behind and move from pose to pose.
> The character: PERSON.

For the two old people (hobble) replace ROW 2 with: a hurried, limping hobble-run, bent over, short uneven steps, still following the guide's leg order but with knees barely lifting.

## The sixteen

| id | who | gait |
|---|---|---|
| folk-farmer | a broad bearded farmer, bald with a brown fringe, rust-red tunic, rope belt, brown hose | run |
| folk-maid | a young woman, long blonde braid, moss-green dress, off-white apron, bare forearms | run |
| folk-granny | a small bent old woman, grey hair in a bun, black wool shawl, plum skirt | hobble |
| folk-boy | a boy of ten, red felt cap, oversized cream shirt, patched brown breeches | run |
| folk-girl | a girl of eight, dark pigtails, faded blue smock, bare feet | run |
| folk-redhead | a lanky young man, curly copper-red hair, freckles, patched ochre-yellow tunic | run |
| folk-goodwife | a stout woman of forty, faded red headscarf, mustard skirt, clutching a cloth bundle | run |
| folk-greybeard | an old man, long white beard, brown hooded robe, gripping a walking staff | hobble |
| folk-lass | a girl of sixteen, loose black hair, charcoal-grey hooded wool cloak over a white shift | run |
| folk-apprentice | a smith's apprentice, dark brown skin, shaved head, scorched leather apron over a bare chest | run |
| folk-mother | a young mother, maroon hooded cloak, a swaddled baby held to her chest | run |
| folk-miller | a round-bellied miller, straw-blond hair, flour-dusted white smock and cap | run |
| folk-shepherd | a shepherd, long dark hair tied back, short beard, sheepskin vest over a blue-grey shirt | run |
| folk-weaver | a woman of thirty, auburn hair pinned up, teal laced bodice, rolled sleeves, brown skirt | run |
| folk-oneeye | a grizzled man of sixty, grey stubble, leather eyepatch, faded blue hood and cape | run |
| folk-lad | a boy of twelve, blond bowl-cut hair, barefoot, sleeveless brown jerkin, short trousers | run |

## Convoy wagon (optional, if the bigger wagon still looks thin)

The current painted wagon (assets/env/wood/convoy_wagon.png: whole + wrecked side by side, magenta background) is now drawn 1.5x bigger. If Nick wants a better break: ask ChatGPT for the same wagon in THREE states side by side on magenta, same size and angle: intact; battered (planks split, one window bar bent out, door hanging by one hinge); wrecked (bed collapsed on a broken back wheel, back door torn off, bars burst outward). Wire the middle one in as convoy_wagon cracked stage.
