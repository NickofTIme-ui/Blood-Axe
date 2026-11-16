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
};
