// snaredArt.js — Painted poses of a man caught by one ankle in a Gallows Wood snare (ChatGPT,
// 2026-11-16; assets/env/wood/snared_<type>_<n>.png). Per enemy type, its poses: the knot
// round his ankle as a fraction of the picture (ax, ay), and how far below the knot he
// reaches (len, picture px: scaled to his body's length in game). Used by view/SnareHang.js;
// a type with no poses here hangs as his own sprite turned upside down.
//   1 swinging, arms thrown out   2 curled up, grabbing at his caught leg   3 hanging limp
export const SNARED_ART = {
  grunt: [
    { key: 'snared_grunt_1', ax: 0.568, ay: 0.185, len: 323 },
    { key: 'snared_grunt_2', ax: 0.424, ay: 0.203, len: 316 },
    { key: 'snared_grunt_3', ax: 0.52, ay: 0.172, len: 328 },
  ],
  // round 3 (2026-11-18, cut by tools/cut-wood-art.py; knots measured where the rope meets
  // the noose, as the grunt's were by hand)
  stalker: [
    { key: 'snared_stalker_1', ax: 0.569, ay: 0.178, len: 326 },
    { key: 'snared_stalker_2', ax: 0.432, ay: 0.193, len: 320 },
    { key: 'snared_stalker_3', ax: 0.527, ay: 0.168, len: 330 },
  ],
  butcher: [
    { key: 'snared_butcher_1', ax: 0.556, ay: 0.153, len: 336 },
    { key: 'snared_butcher_2', ax: 0.44, ay: 0.168, len: 330 },
    { key: 'snared_butcher_3', ax: 0.552, ay: 0.153, len: 336 },
  ],
  // the hound hangs by a hind leg: its length, knot to snout, is about its body's length,
  // not a man's height (reach: against the height it's drawn at, view/HoundView.js)
  hound: [
    { key: 'snared_hound_1', ax: 0.547, ay: 0.16, len: 333, reach: 2.1 },
    { key: 'snared_hound_2', ax: 0.491, ay: 0.206, len: 315, reach: 2.1 },
    { key: 'snared_hound_3', ax: 0.602, ay: 0.16, len: 333, reach: 2.1 },
  ],
};
