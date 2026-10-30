# Rurik's side walk: rigged stride (2026-10-30)

Nick: the old walk was "just one leg stepping forward", and a second try with whole-body
ChatGPT walk frames was "still so bad" (every drawing comes out a little different, so it
wobbles). So the walk is now rigged: ChatGPT painted Rurik once in pieces, and code swings
the legs.

Art (ChatGPT desktop, Bloody axe project, magenta background):
- `parts-oathkeeper.png`, `parts-old-sword.png`: the upper body with no legs and only the
  sword arm, the free arm on its own (top right), then near thigh / shin / boot and far
  (darker) thigh / shin / boot, each straight up and down. The old-sword sheet is a repaint
  of the Oathkeeper one with the old outfit attached.
- Round 3 (Nick: "chicken legs", "upper body too stiff"): ChatGPT repainted the legs about
  50% wider and split off the free arm.

Build (Python 3 + Pillow + numpy + scipy):
1. `python3 parts.py parts-oathkeeper.png <dir> body,arm,nthigh,nshin,nboot,fthigh,fshin,fboot`:
   cuts the 8 pieces out. For the old sword, copy `old-sword-cfg.json` to `<dir>/cfg.json`
   (its body piece sits a few px differently).
2. `python3 bake.py <dir> <old walk2 HD sheet> <out HD sheet> <out strip>`: rigs and bakes
   12 poses into `assets/sprites/heroes-hd/rurik-<sheet>-walk2.png` (416x480 cells, 6
   columns, feet on y=459, 224 px tall like before). Run from this folder.

rig.py: hip/knee/foot keyframes (KF) for one leg, the other half a cycle behind. During
stance the hip angle is solved so the ankle moves back at a constant speed (planted foot),
and the body height follows the lowest sole (natural bob). Draw order: far leg, near leg,
then the body, so the skirt and tabard cover the hip joints. The free arm (behind the
body) swings opposite the far leg, the body rocks a degree or two each step, and the cape
and hair are warped so they trail and lag the bob.

bake.py prints `stride_world`: world px per full cycle. It is the walk anim's `stride`
in data/spriteStrips.js (92), which view/MarchCycle.js uses so the feet don't slide.

Not redone yet: the up/down and three-quarter walks (walkU/D/UD/DD).
