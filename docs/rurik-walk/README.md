# Rurik's side walk: rigged stride (2026-10-30)

Nick: the old walk was "just one leg stepping forward", and a second try with whole-body
ChatGPT walk frames was "still so bad" (every drawing comes out a little different, so it
wobbles). So the walk is now rigged: ChatGPT painted Rurik once in pieces, and code swings
the legs.

Art (ChatGPT desktop, Bloody axe project, magenta background):
- `parts-oathkeeper.png`, `parts-old-sword.png`: the torso with the cape (no head, no
  arms), the head with its hair, the sword arm holding the sword, the free arm, then near
  thigh / shin / boot and far (darker) thigh / shin / boot, each straight up and down. The
  old-sword sheet is a repaint of the Oathkeeper one with the old outfit attached.
- Round 3 (Nick: "chicken legs", "upper body too stiff"): ChatGPT repainted the legs about
  50% wider and split off the free arm.
- Round 4 (Nick: legs still a bit stiff; sword arm, head and shoulders don't move): head
  and sword arm split off too; looser knee and foot keys; 16 poses.

Build (Python 3 + Pillow + numpy + scipy):
1. `python3 parts.py parts-oathkeeper.png <dir> torso,head,sarm,arm,nthigh,nshin,nboot,fthigh,fshin,fboot`:
   cuts the 10 pieces out (both sheets share the same layout and pivots, CFG in rig.py).
2. `python3 bake.py <dir> <old walk2 HD sheet> <out HD sheet> <out strip> 16`: rigs and
   bakes 16 poses into `assets/sprites/heroes-hd/rurik-<sheet>-walk2.png` (416x480 cells, 8
   columns, feet on y=459, 224 px tall like before). Run from this folder.

rig.py: hip/knee/foot keyframes (KF) for one leg, the other half a cycle behind. During
stance the hip angle is solved so the ankle moves back at a constant speed (planted foot),
and the body height follows the lowest sole (natural bob). Draw order: far leg, near leg,
then the torso (so the skirt and tabard cover the hip joints), the head, and the sword
arm in front. The free arm (behind everything) swings with the near leg and the sword arm
a little against it; their shoulders shift forward/back opposite each other (shoulders
turning against the hips). The torso rocks a degree or two each step, the head stays
steadier with a small nod, and the cape and hair are warped so they trail and lag the bob.

bake.py prints `stride_world`: world px per full cycle. It is the walk anim's `stride`
in data/spriteStrips.js (80), which view/MarchCycle.js uses so the feet don't slide.

Not redone yet: the up/down and three-quarter walks (walkU/D/UD/DD).

Round 5 (Nick: "his head shrunk"): the painted legs were long, so sizing the whole figure
to his old height shrank the upper body. rig.py now draws the legs at 78% length / 92%
width, boots at 74% and the head at 122% (CFG leg_len, leg_w, boot_scale, head_scale).
