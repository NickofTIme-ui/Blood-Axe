// speakers.js — Everyone who speaks a story line (stage/Story.js beats, the king's
// cutaways, a boss's sentence): the name the dialogue box shows (view/DialogueBox.js) and
// their portrait.
//
// The key is the `who` of a line (and stays what it was: view/SpeakerMarker.js finds the
// speaker on screen by it). `name` is what the box prints. A portrait is loaded from
// assets/ui/portraits/<id>.png (id: `portrait`, default the key in lower case); until
// that file is painted the box draws a stand-in (a hooded bust and the initial).
// Prompts for the portraits still to paint: docs/portrait-art-prompts.md.
//
// A key not listed here still speaks: its own word, capitalised, with a stand-in.
// NARRATION keys (a horn, a cry from somewhere off screen) get no name and no portrait.

export const NARRATION = new Set(['VOICE']);

// DIALOGUE BOX RULES (Nick, 2026-10-23): the box (and a portrait) is for the heroes, the
// king and his men, and the people who carry the story. The minor villagers below never get
// one: their lines float over their heads as shout-outs (view/NpcView.js), held scene or not,
// so play keeps moving. Irvolino the miller (MILLER) is the other way round: whenever he
// speaks, in a scene or in passing, it's the full box with his portrait.
export const MINOR = new Set(['HALE', 'MIRA', 'TAM', 'ELSBETH', 'JOREN', 'WENNA', 'ANSEL', 'PIP', 'TOBIN', 'WREN', "TANNER'S BOY"]);
export const ALWAYS_BOXED = new Set(['MILLER']);

export const SPEAKERS = {
  ELSBETH:{name:'Elsbeth',portrait:'elsbeth'},
  // the Oath Keepers
  RURIK: { name: 'Rurik' },
  ORYN: { name: 'Oryn' },
  VEXA: { name: 'Vexa' },
  // the Ashen and the king's men
  VAURATH: { name: 'King Vaurath' },
  MALGOR: { name: 'Malgor' },
  VAREK: { name: 'Varek' },
  CINDER: { name: 'Cinder' },
  HRUK: { name: 'Hruk' },
  HOUNDMASTER: { name: 'The Houndmaster' },
  WARDEN: { name: 'The Chain Warden' },
  OVERSEER: { name: 'The Overseer' },
  ORSK: { name: 'Orsk' },
  HASK: { name: 'Hask' },
  HROLF: { name: 'Hrolf' },
  MESSENGER: { name: 'Messenger' },
  EXECUTIONER: { name: 'The Executioner' },
  FORGEMASTER: { name: 'The Forgemaster' },
  CAPTAIN: { name: 'Captain' },
  // the people
  HALE: { name: 'Hale' },
  MIRA: { name: 'Mira' },
  TAM: { name: 'Tam' },
  BRANN: { name: 'Brann' },
  HAKON: { name: 'Hakon' },
  JOREN: { name: 'Joren' },
  WENNA: { name: 'Wenna' },
  ANSEL: { name: 'Ansel' },
  PIP: { name: 'Pip' },
  TOBIN: { name: 'Tobin' },
  HILDE: { name: 'Hilde' },
  BRAM: { name: 'Bram' },
  WREN: { name: 'Wren' },
  ILSE: { name: 'Ilse' }, // Hale the smith's daughter, taken north (the Black Keep's cells)
  "TANNER'S BOY": { name: "The Tanner's Boy", portrait: 'tanners-boy' },
  // (named by Nick: the voices that had only a trade)
  MINER: { name: 'Daniel', portrait: 'daniel' },     // the miners' foreman (Hollow Mountain on)
  PRISONER: { name: 'Alex', portrait: 'alex' },      // off the Keep convoy (Gallows Wood)
  REEVE: { name: 'Aldric', portrait: 'aldric' },     // the reeve of the lower town (Iron Gates)
  TOWNSMAN: { name: 'Mathew', portrait: 'mathew' },  // a townsman (Iron Gates)
  MILLER: { name: 'Irvolino', portrait: 'irvolino' }, // the miller, shut in the barn (Burning Village)
  PILGRIM: { name: 'Nicholas', portrait: 'nicholas' }, // (the wood road's pilgrim speaks as NICHOLAS now)
  // Nick in the game: the mountain guide. The pilgrim on the wood road (Gallows Wood); he
  // leads the heroes up the Shattered Ascent and dies there (docs/nicholas-art-prompts.md)
  NICHOLAS: { name: 'Nicholas', portrait: 'nicholas' },
  // Nick's friend Vincent: the Gatewright, who built the Iron Gates (data/stageGates.js)
  VINCENT: { name: 'Vincent' },
};

const cap = (w) => w.charAt(0) + w.slice(1).toLowerCase();

// { name, portrait } for a line's `who` (null: narration, nobody's face)
export function speakerInfo(who = '') {
  if (NARRATION.has(who)) return null;
  const s = SPEAKERS[who];
  return { name: s?.name ?? cap(who), portrait: s?.portrait ?? who.toLowerCase() };
}

// every portrait file the game looks for
export const PORTRAIT_IDS = [...new Set(Object.entries(SPEAKERS).map(([k, s]) => s.portrait ?? k.toLowerCase()))];
