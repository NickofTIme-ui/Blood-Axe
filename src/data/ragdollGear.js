// ragdollGear.js — What each enemy carries in his painted LYING pose (react strip, pose 5),
// so the ragdoll (view/Ragdoll.js) can lift it off the body and let it move on its own.
// Without these a sword lying along his leg would bend at his knee with the leg.
//
// Coordinates are frame px of the lying pose as BootScene cuts it (res 2: a 416 x 480
// frame, the floor line at y 460; the Warlord's frame is twice that). Re-measure them
// after redrawing a react strip: a weapon whose grip / ball centre is no longer on a
// painted pixel is simply left painted on the body.
//
//   flail  a weight on a chain from his hand: ball [x, y, r] (round: cut as a disc) or
//          end { poly, at } (any shape), chain [[x, y], ...] from the hand to it (its
//          painted links come off the body and are drawn swinging), hand [x, y].
//          drops: he lets go of it when he dies (else it's wound round his wrist).
//   blade  anything rigid: polys [[[x, y], ...], ...] (the outline(s) to lift off),
//          grip [x, y] (where it's held), tip [x, y]. Held while he's alive; it leaves
//          his hand when he dies, tumbles and lands on its own.

const ellipse = (cx, cy, rx, ry, n = 18) =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);

export const RAGDOLL_GEAR = {
  grunt: {
    'react:5': [
      { kind: 'blade', polys: [[[195, 447], [205, 436], [214, 437], [216, 442], [284, 455], [284, 459], [212, 454], [201, 457], [195, 453]]], grip: [199, 449], tip: [282, 457] },
    ],
  },
  butcher: {
    'react:5': [
      // the meat hook on its chain, and the cleaver
      { kind: 'flail', hand: [190, 441], chain: [[190, 441], [150, 443], [107, 445]], ball: [90, 447, 17], links: 9 },
      { kind: 'blade', polys: [[[205, 436], [218, 433], [272, 436], [274, 452], [270, 460], [247, 460], [216, 452], [214, 445], [205, 445]]], grip: [210, 440], tip: [270, 448] },
    ],
  },
  berserker: {
    'react:5': [
      { kind: 'blade', polys: [[[158, 424], [268, 421], [284, 421], [284, 440], [278, 458], [258, 461], [226, 455], [248, 441], [160, 436]]], grip: [172, 430], tip: [270, 442] },
    ],
  },
  orsk: {
    'react:5': [
      { kind: 'blade', polys: [[[150, 430], [245, 430], [262, 427], [285, 425], [287, 440], [278, 458], [260, 461], [222, 456], [245, 441], [150, 438]]], grip: [165, 434], tip: [270, 442] },
    ],
  },
  gladiator: {
    'react:5': [
      { kind: 'blade', polys: [[[215, 419], [228, 417], [235, 408], [248, 401], [262, 406], [278, 425], [278, 440], [268, 455], [248, 462], [230, 455], [222, 440], [215, 428]]], grip: [219, 424], tip: [248, 433] },
      { kind: 'blade', polys: [ellipse(118, 434, 60, 25)], grip: [118, 434], tip: [170, 434] }, // the spiked shield
    ],
  },
  twin: {
    'react:5': [
      { kind: 'blade', polys: [[[228, 420], [240, 418], [262, 410], [284, 425], [286, 440], [275, 458], [262, 462], [245, 457], [238, 440], [228, 432]]], grip: [232, 426], tip: [262, 437] },
      { kind: 'blade', polys: [ellipse(115, 432, 62, 26)], grip: [115, 432], tip: [170, 432] },
    ],
  },
  stalker: {
    'react:5': [
      { kind: 'blade', polys: [[[120, 445], [140, 441], [188, 456], [187, 461], [140, 456], [121, 452]]], grip: [130, 448], tip: [186, 459] },
      // the second blade, on the chain he throws it with
      { kind: 'flail', hand: [207, 428], chain: [[207, 428], [230, 438], [262, 441]], end: { poly: [[262, 437], [280, 436], [330, 445], [330, 451], [280, 449], [262, 446]], at: [272, 442] }, links: 7 },
    ],
  },
  penitent: {
    'react:5': [
      // the spiked ball, its chain wound round his fist
      { kind: 'flail', hand: [214, 410], chain: [[214, 410], [222, 414], [245, 423], [275, 428], [292, 429]], ball: [318, 432, 27], links: 9 },
    ],
  },
  ghoul: {
    'react:5': [
      { kind: 'blade', polys: [[[198, 424], [206, 423], [259, 446], [256, 451], [206, 440], [198, 440]]], grip: [201, 431], tip: [256, 448] },
      { kind: 'flail', hand: [248, 423], chain: [[248, 423], [285, 428], [322, 432]], ball: [345, 435, 22], links: 8, drops: true },
    ],
  },
  warlord: {
    'react:5': [
      { kind: 'blade', polys: [[[290, 898], [418, 895], [418, 913], [290, 913]], [[455, 885], [585, 872], [627, 885], [625, 905], [600, 915], [470, 918], [455, 912]]], grip: [300, 905], tip: [620, 895] },
    ],
  },
};
