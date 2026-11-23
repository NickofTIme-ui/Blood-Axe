// The common folk a hero frees: the barn's villagers, the townsfolk, the miners, the
// convoy's prisoners. Nick (2026-11-20): "they are always the same few people, need more
// variation", and their run looked bad (the old sheets' three run poses are one picture:
// the legs never swap, so they slid along). Each of these is a person of their own, painted
// in ChatGPT (docs/folk/folk-art-prompts.md) on one sheet of ten poses, black background:
//   row 1: stand (afraid), cower, thanks (a hand raised to the hero), a glance back over
//          the shoulder while running;
//   row 2: a six-pose run cycle, the legs swapping (right foot strikes, pushes off, flies;
//          left foot strikes, pushes off, flies), the far leg darker.
// tools/bake-folk-sheet.py lines the two rows up into the game's one-row strip.
//
// Every level deals its freed folk from this pool in turn, so nobody turns up twice in a
// level (view/NpcView.js folkFor). Someone whose sheet isn't painted yet is skipped, and
// with none painted the old looks (data/stage*.js `crowd`, view/NpcView.js WOOD_LOOKS) stay.
//   s: size (1 = a grown man as tall as the heroes); gait: 'run' | 'hobble' (an old one,
//   slower, falls behind the rest); lag: how far behind the group's front they end up (px)
export const FOLK = [
  { id: 'folk-farmer', s: 1.02, gait: 'run', lag: 30, look: 'a broad bearded farmer, bald with a brown fringe, rust-red tunic, rope belt, brown hose' },
  { id: 'folk-maid', s: 0.95, gait: 'run', lag: 10, look: 'a young woman, long blonde braid, moss-green dress, off-white apron, bare forearms' },
  { id: 'folk-granny', s: 0.86, gait: 'hobble', lag: 120, look: 'a small bent old woman, grey hair in a bun, black wool shawl, plum skirt' },
  { id: 'folk-boy', s: 0.74, gait: 'run', lag: -10, look: 'a boy of ten, red felt cap, oversized cream shirt, patched brown breeches' },
  { id: 'folk-girl', s: 0.7, gait: 'run', lag: 0, look: 'a girl of eight, dark pigtails, faded blue smock, bare feet' },
  { id: 'folk-redhead', s: 0.98, gait: 'run', lag: 20, look: 'a lanky young man, curly copper-red hair, freckles, patched ochre-yellow tunic' },
  { id: 'folk-goodwife', s: 0.94, gait: 'run', lag: 60, look: 'a stout woman of forty, faded red headscarf, mustard skirt, clutching a cloth bundle' },
  { id: 'folk-greybeard', s: 0.96, gait: 'hobble', lag: 140, look: 'an old man, long white beard, brown hooded robe, gripping a walking staff' },
  { id: 'folk-lass', s: 0.9, gait: 'run', lag: 15, look: 'a girl of sixteen, loose black hair, charcoal-grey hooded wool cloak over a white shift' },
  { id: 'folk-apprentice', s: 1, gait: 'run', lag: 25, look: "a smith's apprentice, dark brown skin, shaved head, scorched leather apron over a bare chest" },
  { id: 'folk-mother', s: 0.93, gait: 'run', lag: 50, look: 'a young mother, maroon hooded cloak, a swaddled baby held to her chest' },
  { id: 'folk-miller', s: 1.04, gait: 'run', lag: 70, look: 'a round-bellied miller, straw-blond hair, flour-dusted white smock and cap' },
  { id: 'folk-shepherd', s: 1.02, gait: 'run', lag: 20, look: 'a shepherd, long dark hair tied back, short beard, sheepskin vest over a blue-grey shirt' },
  { id: 'folk-weaver', s: 0.95, gait: 'run', lag: 35, look: 'a woman of thirty, auburn hair pinned up, teal laced bodice, rolled sleeves, brown skirt' },
  { id: 'folk-oneeye', s: 1, gait: 'run', lag: 45, look: 'a grizzled man of sixty, grey stubble, leather eyepatch, faded blue hood and cape' },
  { id: 'folk-lad', s: 0.78, gait: 'run', lag: 5, look: 'a boy of twelve, blond bowl-cut hair, barefoot, sleeveless brown jerkin, short trousers' },
];

// the cells of a folk sheet (view/NpcView.js CELLS)
export const FOLK_CELLS = { stand: 0, cower: 1, wave: 2, thanks: 2, look: 3, run: [4, 5, 6, 7, 8, 9], kneel: 1, sit: 1, bound: 1, grip: 1 };
export const FOLK_FRAMES = 10;

// the folk whose sheet is in the folder (assets/sprites/npc/folk/<id without "folk-">.png):
// only these are loaded (data/levelArt.js) and dealt out
export const FOLK_PAINTED = ['folk-farmer', 'folk-maid', 'folk-miller', 'folk-shepherd', 'folk-lad', 'folk-weaver', 'folk-oneeye'];
