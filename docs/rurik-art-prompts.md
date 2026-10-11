# Rurik, the People's King: ChatGPT prompt pack

Nick (11 October 2026): Rurik "isn't giving off the I'm the true king of the people vibe,
hero vibe", and his sword "does not feel special at all ... needs lore and a redesign of
the weapon to give it some weight".

The code side is done (see `docs/cloud-handoff.md`, 11 October): the sword is
**OATHKEEPER, the Hearthfire Blade** (`src/data/oathkeeper.js`, lore page on the skill
screen), his swings are drawn in its silver-and-gold colours, and his fire is the new
fourth branch of his tree, THE KING'S WRATH. What code can't do is repaint him. These
prompts do.

## The design in one paragraph (use it everywhere)

**Approved (11 October 2026):** Nick picked sword 1 of the ChatGPT sheet
`docs/art-refs/oathkeeper_mockups.png`; the crop is `docs/art-refs/oathkeeper_ref.png` and
the cut-out the game shows on his lore page is `assets/ui/oathkeeper.png`. Attach
`oathkeeper_ref.png` whenever Oathkeeper is in a prompt.

Oathkeeper is a broad, heavy greatsword that reads as WEIGHT and as LIGHT from across the
screen: a wide, faceted silver blade with a white-gold glow running down its fuller,
brightest from the guard to the point. The cross-guard is aged gold shaped like two open
hands reaching up round a glowing golden sun boss. A crimson grip wrapped in a diamond
pattern with gold bands. A round gold sun pommel with a glowing heart. No skulls, no
spikes, no blood caked on it: it is the people's sword, a hero's sword, not a butcher's.

Rurik himself stays Rurik (attach `assets/ui/hero-warrior.png` every time): long dark hair,
beard, scarred face, dark plate with bronze trim, crimson cape. What changes is how he
carries himself: upright, chest open, chin level, a protector rather than a reaver. Less
blood on him, the cape whole and heavy rather than shredded, and on his tabard and cape a
simple HEARTH sigil in aged gold (a flame rising from an open hand) instead of the cross.
He wears **no crown** (King Vaurath wears the crown; Rurik is chosen, not crowned). A plain
dark iron circlet at most, and only if it looks right.

## How to use

1. In the "Bloody Axe" ChatGPT project, open a new chat **BA · Hero · Rurik King** and send
   every prompt from that one chat, in order.
2. Attach `assets/ui/hero-warrior.png` to prompts 1 and 2. For the strips, attach the old
   strip being repainted AND the approved Oathkeeper sheet from prompt 1.
3. Save results to `assets/incoming/rurik/` first (never straight over live files), then
   replace the live file once it looks right in the game. The file names and sizes below
   are what the game loads: same names, same sizes, and nothing else needs to change in code.

## Rules (written into each strip prompt)

- Same painted 16-bit dark-fantasy pixel-art look as his current strips.
- One row, **plain black background** like his current strips, wide gaps, every figure
  facing RIGHT, feet on one baseline, same scale in every cell, no text, no motion lines.
- **2172 x 724** (3:1), the same pose count and order as the strip being replaced.
- Oathkeeper is the same length in every cell. It's a big blade: about as long as from his
  boots to his belt.

---

## 1. Oathkeeper concept sheet: DONE

Approved and saved as `docs/art-refs/oathkeeper_ref.png` (full sheet:
`oathkeeper_mockups.png`). Prompts 2 to 4 attach it as "the Oathkeeper sheet".

## 2. Rurik, the People's King (attach `hero-warrior.png` and the Oathkeeper sheet)

> Repaint this character as the PEOPLE'S KING: the same man (same face, hair, beard,
> scars, the same dark plate with bronze trim, the same build), now carrying OATHKEEPER
> from the second image. He stands upright and protective, chest open, chin level, the
> sword planted point-down in front of him with both hands resting on the pommel, the
> light in the blade lighting his face from below. His crimson cape is whole and heavy,
> falling in deep folds. On his tabard and cape a simple sigil in aged gold: a flame
> rising out of an open hand. Far less blood on him than the reference; a few dents and
> scratches in the armour. He wears no crown. Full body, front three-quarter view, on a
> pure black background, the same framing and size as the reference. No text.

If Nick likes it, it replaces the select-screen portrait `assets/ui/hero-warrior.png`
(same size and background as the old one) and becomes the reference for every
strip below. Save the approved one as `docs/art-refs/rurik_king_ref.png` too.

## 3. Repaint his strips with Oathkeeper (one prompt per strip)

Send this once per strip, attaching the old strip and the two approved references:

> The first image is an animation strip of RURIK. Repaint it pose for pose: exactly the
> same number of poses, in the same order, the same positions, the same size, the same
> feet on the same baseline, on the same plain black background, all facing right. Change
> only two things. 1) His sword becomes OATHKEEPER from the second image: the broad, heavy
> silver blade with the white-gold light in its fuller, the gold open-hands guard round the
> glowing sun, the crimson grip and the gold sun pommel, the same length in every pose; because it's heavier, let the arms and shoulders
> show the effort a little more on the big swings. 2) He matches the third image: the
> gold hearth sigil on his tabard and cape, the cape whole, less blood on him. 2172 x 724.

Do them in this order (the ones seen most first). File name: same as the old one.

1. `assets/sprites/strips/ulric_combo1.png`, `ulric_combo2.png`, `ulric_combo3.png` (the combo)
2. `ulric_cleave.png` (the heavy; also Leap Smash and Kingsfire)
3. `ulric_slash.png`, `ulric_thrust.png`, `ulric_charge.png`, `ulric_chargewalk.png`
4. `ulric_walk2.png`, `ulric_walkU.png`, `ulric_walkD.png`, `ulric_walkUD.png`, `ulric_walkDD.png`, `ulric_sprint.png`
5. `ulric_kick.png`, `ulric_kick2.png`, the four `ulric_roll_*.png`
6. `ulric_finimpale.png`, `ulric_finthroat.png`
7. The main sheet `assets/sprites/ulric.png` (idle, block, jump, hit, knockdown, cast) last:
   it is a grid, not a strip, so tell ChatGPT to keep the grid and every cell's position.

## 4. NEW strip: the King's Wrath (attach the approved references)

> A new animation strip of RURIK (match the second image's style and size exactly),
> carrying OATHKEEPER. Six poses in one row, all facing right, feet on one baseline, plain
> black background, wide gaps, 2172 x 724, no text:
> 1. Ready: feet planted wide, Oathkeeper held two-handed low in front.
> 2. He lifts it two-handed straight up over his head, point to the sky, the light in the
>    blade blazing.
> 3. The top: head thrown back in a ROAR, fire beginning to wreath the raised blade.
> 4. Driving it down point-first, his whole body behind it.
> 5. The blade buried a third of its length in the ground in front of his feet, both
>    hands on the grip, kneeling on one knee, fire bursting up around the blade.
> 6. Wrenching it free, standing, the blade trailing embers.

Save as `assets/sprites/strips/ulric_wrath.png`. It is not wired in yet: Kingsfire borrows
the cleave's poses (`SpriteFighterView`, state `kingsfire`). Once it exists, the cloud adds
it to `src/data/spriteStrips.js` and keys poses 2-3 to the gathering and 4-6 to the release.
