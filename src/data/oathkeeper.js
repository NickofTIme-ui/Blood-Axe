// oathkeeper.js — Rurik's sword: its name, its story, and its colours. The look is Nick's
// pick from the ChatGPT mock-ups (docs/art-refs/oathkeeper_ref.png; the painting itself is
// assets/ui/oathkeeper.png): silver steel, a white-gold light in the fuller, a gold guard of
// two open hands round a sun, a crimson grip, a gold sun pommel.
//
// Shown on the skill screen's OATHKEEPER page (scenes/SkillScene.js, O / RB) and on the
// hero select. Its fire is THE KING'S WRATH branch of his tree (data/skills.js).

export const OATHKEEPER = {
  name: 'OATHKEEPER',
  title: 'The Hearthfire Blade',
  // one line, for the select screen
  tagline: 'Forged from every hearth in the valley. The light in it has never gone out.',
  // the lore page, a paragraph a block
  lore: [
    'Before the Ashen Crown, the valley had no king. It had an oath: every hearth would stand for every other.',
    'When the first Ashen men came over the pass, the smiths asked each house for iron. Ploughshares, hinges, cookpots, a child\'s first knife, the bell from the longhall. All of it went into one blade, and it was quenched in the fire of every home in the valley, one after another, through a whole night.',
    'A spark of every hearth caught in the fuller, and it has never gone out. When the people it was made from are in danger, it blazes white-gold.',
    'Oathkeeper is not handed down from father to son. It goes to the one the valley chooses. King Vaurath wears a crown. Rurik carries the hearths of his people.',
  ],
  // the blade's look, for the code that draws it (smears, sparks, the light in the fuller)
  colors: {
    steel: 0xe4e8f0,  // silver
    ember: 0xffc850,  // the light in the fuller
    heart: 0xfffbe8,  // its white-hot heart
    gold: 0xe0b450,   // guard and pommel
    grip: 0x8a1420,   // the crimson wrap
    shadow: 0x2a1a08,
  },
};

// Rurik's epithet, shown with his name (select screen, skill screen).
export const RURIK_TITLE = "THE PEOPLE'S KING";
