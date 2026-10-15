// oathkeeper.js — Rurik's sword: its name, its story, and its colours. The look is Nick's
// pick from the ChatGPT mock-ups (docs/art-refs/oathkeeper_ref.png; the painting itself is
// assets/ui/oathkeeper.png): silver steel, a white-gold light in the fuller, a gold guard of
// two open hands round a sun, a crimson grip, a gold sun pommel.
//
// Shown on the skill screen's OATHKEEPER page (scenes/SkillScene.js, O / RB) and on the
// hero select. Its fire is THE KING'S WRATH branch of his tree (data/skills.js), and his
// Firebolt: neither is his until Elder Brann gives him the blade at the end of level 1
// (data/characters.js birthright). Before that he fights with his old soldier's sword.

export const OATHKEEPER = {
  name: 'OATHKEEPER',
  title: 'The Blade of His Blood',
  // one line, for the select screen
  tagline: 'Handed down his bloodline since the first fire. In any other hand it is only steel.',
  // the lore page, a paragraph a block (told in full at the end of level 1, data/stageVillage.js 'elder')
  lore: [
    'Oathkeeper was forged in the first fire the valley ever lit, by the first of Rurik\'s line, who swore that his blood would stand for every hearth that came after.',
    'It has passed from parent to child ever since, further back than any song remembers. It goes to the heir only when the one who carries it dies.',
    'In any other hand it is only steel. In the hand of that blood, the fire in its fuller wakes, and every one who carried it before stands with the one who carries it now.',
    'Rurik\'s father Hakon held the north gate with it the night the Ashen came, alone, until the last child was through. Dying, he put it in Elder Brann\'s hands: "Give it to my son."',
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
