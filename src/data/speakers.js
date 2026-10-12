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

export const SPEAKERS = {
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
  CAPTAIN: { name: 'Captain' },
  // the people
  HALE: { name: 'Hale' },
  MIRA: { name: 'Mira' },
  TAM: { name: 'Tam' },
  BRANN: { name: 'Brann' },
  JOREN: { name: 'Joren' },
  WENNA: { name: 'Wenna' },
  ANSEL: { name: 'Ansel' },
  PIP: { name: 'Pip' },
  TOBIN: { name: 'Tobin' },
  HILDE: { name: 'Hilde' },
  BRAM: { name: 'Bram' },
  WREN: { name: 'Wren' },
  "TANNER'S BOY": { name: "The Tanner's Boy", portrait: 'tanners-boy' },
  // (named by Nick: the voices that had only a trade)
  MINER: { name: 'Daniel', portrait: 'daniel' },     // the miners' foreman (Hollow Mountain on)
  PRISONER: { name: 'Alex', portrait: 'alex' },      // off the Keep convoy (Gallows Wood)
  REEVE: { name: 'Aldric', portrait: 'aldric' },     // the reeve of the lower town (Iron Gates)
  TOWNSMAN: { name: 'Mathew', portrait: 'mathew' },  // a townsman (Iron Gates)
  MILLER: { name: 'Irvolino', portrait: 'irvolino' }, // the miller, shut in the barn (Burning Village)
  PILGRIM: { name: 'Nicholas', portrait: 'nicholas' }, // the pilgrim on the wood road (Gallows Wood)
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
