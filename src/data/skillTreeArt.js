// skillTreeArt.js — the painted skill tree (scenes/SkillScene.js), from ChatGPT (2026-11-03).
// Cut by tools/cut-skilltree-art.py from the originals in project files skill-tree-art/originals/.
//
//   st-bg              the candlelit war shrine behind the whole screen
//   st-plate-*         a skill's plaque: dormant (not taken), awake (taken), major (the tier III)
//   st-banner-cloth    the hanging banner's cloth, pale, dyed in the branch's colour in game
//   st-banner-trim     ...its gold border, tassels and iron pole, drawn over the cloth
//   st-desk            the carved panel the chosen skill is read out on (nine-sliced)
//   st-icon-<skill id> each skill's painted medallion
import { SKILL_TREES } from './skills.js';

const DIR = 'assets/ui/skilltree';

// where things sit on a plaque, as fractions of its width / height (measured off the art)
export const PLATE = {
  socket: { x: 0.142, y: 0.508, r: 0.072 },   // the round socket the icon sits in
  majorBodyY: 0.509,                           // the major plaque's body centre (its horns rise above)
  text: { x0: 0.25, x1: 0.91 },                // the dark panel the name is written on
};

export function skillIconIds() {
  const ids = [];
  for (const tree of Object.values(SKILL_TREES)) for (const br of tree.branches) for (const n of br.nodes) ids.push(n.id);
  return ids;
}

export function preloadSkillTreeArt(scene) {
  scene.load.image('st-bg', `${DIR}/bg.jpg`);
  for (const p of ['dormant', 'awake', 'major']) scene.load.image(`st-plate-${p}`, `${DIR}/plate-${p}.png`);
  scene.load.image('st-banner-cloth', `${DIR}/banner-cloth.png`);
  scene.load.image('st-banner-trim', `${DIR}/banner-trim.png`);
  scene.load.image('st-desk', `${DIR}/desk.png`);
  for (const id of skillIconIds()) scene.load.image(`st-icon-${id}`, `${DIR}/icons/${id}.png`);
}
