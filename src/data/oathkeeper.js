// oathkeeper.js — Rurik's sword: its name, its story, and how it is drawn in code until
// the painted redesign exists (prompts: docs/rurik-art-prompts.md).
//
// Shown on the skill screen's OATHKEEPER page (scenes/SkillScene.js, O / RB) and on the
// hero select. Its fire is THE KING'S WRATH branch of his tree (data/skills.js).

export const OATHKEEPER = {
  name: 'OATHKEEPER',
  title: 'The Hearthfire Blade',
  // one line, for the select screen
  tagline: 'Forged from every hearth in the valley. The ember in it has never gone out.',
  // the lore page, a paragraph a block
  lore: [
    'Before the Ashen Crown, the valley had no king. It had an oath: every hearth would stand for every other.',
    'When the first Ashen men came over the pass, the smiths asked each house for iron. Ploughshares, hinges, cookpots, a child\'s first knife, the bell from the longhall. All of it went into one blade, and it was quenched in the fire of every home in the valley, one after another, through a whole night.',
    'An ember caught in the fuller and has never gone out. When the people it was made from are in danger, it burns.',
    'Oathkeeper is not handed down from father to son. It goes to the one the valley chooses. King Vaurath wears a crown. Rurik carries the hearths of his people.',
  ],
  // the blade's look, for the code that draws it (smears, the ember in the fuller)
  colors: {
    steel: 0xd8dce4,
    ember: 0xff8a2a,
    heart: 0xfff0c0,
    gold: 0xd8b04a,
    shadow: 0x3a0a06,
  },
};

// Rurik's epithet, shown with his name (select screen, skill screen).
export const RURIK_TITLE = "THE PEOPLE'S KING";
