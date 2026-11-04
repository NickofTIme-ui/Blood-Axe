// stagePractice.js — THE PRACTICE YARD: the tutorial's own space (title menu: PRACTICE).
// One small walled yard with men to hit who don't hit back; a card at the top names the
// move to try and its buttons (data/tutorial.js, stage/Tutorial.js, view/TutorialCard.js).
//
// It is not a level: it's kept out of STAGES (no checkpoints, no campaign, no test-mode
// level skipping), earns no blood or skill points, and the hero fights with no skill-tree
// picks or trophies: just his base kit.

export const STAGE_PRACTICE = {
  id: 'practice',
  practice: true,
  name: 'THE PRACTICE YARD',
  width: 1500,
  sections: [
    {
      id: 'yard', name: 'THE PRACTICE YARD', x0: 0, x1: 1500, ground: 'castle',
      light: 0xffc890, mood: 0.1,
      objective: 'Try every move',
      // (its fight never starts, so the yard never "clears": stage/Tutorial.js brings the men)
      fightAt: Infinity,
      spawn: { x: 420, z: 420 },
      waves: [],
      // a crate and a barrel to kick down the lane
      props: [
        { kind: 'crate', x: 1180, z: 320, drop: null },
        { kind: 'barrel', x: 1240, z: 490, drop: null },
      ],
      hazards: [],
    },
  ],
};
