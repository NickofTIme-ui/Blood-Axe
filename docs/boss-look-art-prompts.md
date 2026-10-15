# Art to paint: Orsk and the Gate Twins in their own looks, and Rurik's Rising Cleave

Orsk (Shattered Ascent) fights with the Berserker's moves and the Gate Twins, Hask and Hrolf
(Iron Gates), with the Gladiator's, and until now they also wore those enemies' sprites.
Each boss's stage entry now names his own look (`look: 'orsk'` / `look: 'twin'`), and the game
switches him over the moment all six of his main strips are in `assets/enemies/strips/`
(`src/data/enemyStrips.js`). No code change is needed. Check them with
`tools/strip-check.html?id=orsk` / `?id=twin`.

**How to paint them:** one ChatGPT chat per boss ("BA · Boss · Orsk", "BA · Boss · Gate
Twins"). In the first message attach the kind's `_walk.png` and `_react.png`
(`berserker_*` for Orsk, `gladiator_*` for the Twins) so the size, style and pose layout
match, plus the boss's portrait (`assets/ui/portraits/`) if one exists. Same rules as every
strip: one row, plain black background, facing right, side view, feet on one baseline,
wide gaps so nothing touches, no text, no motion lines, no ground drawn.

## The look

- **Orsk**, Siege Commander: a big, battle-scarred siege commander in heavy dented plate
  over a soot-black gambeson, a wild red beard, a torn black-and-ash war cloak, a huge
  two-handed axe. Torchlight orange on his armour. Bigger and better armoured than the
  Berserker, but the same build and the same moves.
- **The Gate Twins**: two identical brothers, the gatehouse's keepers. Heavy black iron
  half-helms with nose guards, iron scale over leather, a round riveted iron shield, a
  flanged iron mace, soot-grey cloaks. Same build and moves as the Gladiator. (One set is
  drawn and both brothers wear it.)

## The strips (fill in the boss and his kind)

Save each as `assets/enemies/strips/<orsk|twin>_<strip>.png`.

1. **`_walk.png`**, 8 poses: "An 8-pose walk cycle of [BOSS], matching the attached
   [KIND]'s walk sheet pose for pose, in his own look described above."
2. **`_react.png`**, 6 poses: 0 ready stance, 1 breathing in, 2 blocking, 3 hit (reeling),
   4 knocked flying (horizontal in the air), 5 dead on the ground.
3. **`_atk1.png`**, 5 poses: 0 ready, 1 wind-up, 2 strike, 3 follow-through, 4 recover.
   Match the attached [KIND]'s `_atk1`.
4. **`_atk2.png`**, 5 poses, same layout: match the [KIND]'s `_atk2`.
5. **`_heavy.png`**, 6 poses: 0 ready, 1 wind-up, 2 full wind-up, 3 strike, 4 impact,
   5 recover.
6. **`_special.png`**, 6 poses:
   - Orsk, the Berserk Rush: 0 ready, 1 crouch, 2-4 charging run, 5 shoulder impact.
   - The Twins, the Shield Rush: 0 ready, 1 shield up in a crouch, 2-4 charging behind the
     shield, 5 the shield bash.

Optional, same prompts as the other enemies (each plugs in alone):
- **`_kneel.png`**, 3 poses: `docs/kneel-art-prompts.md`.
- **`_jump.png`** (4) and **`_drop.png`** (3): `docs/enemy-jump-art-prompts.md`.

---

## Rurik: `assets/sprites/strips/ulric_launcher.png` (the Rising Cleave, J, J, K)

In "BA · Hero · Rurik King" (attach `ulric_combo2.png` and the Oathkeeper reference):

> A new animation strip of RURIK carrying OATHKEEPER (match the attached sheets' style
> and size exactly). Five poses in one row, all facing right, feet on one baseline, plain
> black background, wide gaps, 2172 x 724, no text:
> 1. Ready stance, Oathkeeper held low in both hands (like the attached sheet's first pose).
> 2. Sinking low, knees bent, the blade dropped behind and below his back hip.
> 3. Exploding upward: the blade ripping up in a rising arc in front of him, both hands on
>    the grip, his back leg driving him onto his toes.
> 4. The follow-through: Oathkeeper high over his head, point to the sky, up on his toes,
>    cape lifting.
> 5. Recovering into the ready stance.

The game picks it up by its file name (`src/data/spriteStrips.js` `launcher`); until then
the Rising Cleave borrows the second combo strike.
