# ChatGPT prompts: enemy parts sheets

One image per enemy. In the same chat, attach that enemy's concept sheet as a reference.
Save each result as `assets/enemies/<id>-parts.png`, then run
`http://localhost:8123/tools/parts.html?file=assets/enemies/<id>-parts.png` to get the numbers
for `src/data/enemyParts.js`.

## Shared instructions (paste first, then the enemy block)

> Make a **game character parts sheet** (a paper-doll cut-out sheet for 2D skeletal animation),
> in the same gritty, bloody pixel-art style as the attached reference.
> **Side view, facing RIGHT.** Every part drawn **separately with wide empty gaps between them —
> nothing touching or overlapping.** Background: **flat pure magenta #FF00FF**, no gradient,
> no shadows, no ground, no text, no labels, no frames.
> Lay the parts out in two rows:
> Row 1: the **head** (facing right, with a short neck stub, no body), the **torso** (chest to hips
> only — no head, no arms, no legs), the **cloth/loincloth** that hangs from the belt (on its own),
> the **weapon** standing straight UP (handle at the bottom).
> Row 2: ONE **arm hanging straight down** (shoulder at the top, closed fist at the bottom,
> no weapon in the hand), ONE **thigh** standing vertical (hip at top, knee at bottom), ONE
> **lower leg** vertical with its boot (knee at top, toe pointing right), then the off-hand item.
> All parts the same scale as if the character were assembled. Clean dark outlines.

## Enemy blocks

**Gorrak the Flayer (`butcher`)** — wild long dark hair and beard, tongue out, bloodied bare
chest, leather straps, bloody leather apron. Weapon: huge bloody butcher's cleaver.
Off-hand item: rusty meat hook on a short chain.

**Sliv the Hollow (`stalker`)** — ragged olive-green hooded cloak (face in shadow, snarling),
leather straps and skull charms. Weapon: long bloody dagger. Off-hand item: a second dagger.
Also draw a small chain-sickle blade on its own.

**The Iron Penitent (`penitent`)** — hulking brute, riveted rusty iron bucket mask with spikes,
heavy chains across a bare chest, spiked rusty pauldron and bracers. Weapon: short flail handle
(no chain). Off-hand item: a big rusty spiked iron ball on its own (the flail head).

**Vorn Skullsplitter (`berserker`)** — shaved sides, tall black mohawk and ponytail, blood across
the face, skull belt, leather straps, fur. Weapon: huge bloody cleaver-axe on a long haft.
Off-hand item: none (draw the skull pauldron on its own instead).

**Grubb Rotchain (`ghoul`)** — gaunt ghoul in a tattered olive hood and cloak, rotten teeth,
spiked bracers. Weapon: short flail handle (no chain). Off-hand item: a rusty knife.
Also draw a small spiked ball on its own (the flail head).

**Pitlord Kragg (`gladiator`)** — muscular gladiator, spiked iron helmet with a face grille,
spiked iron pauldrons, red bloody loincloth. Weapon: spiked mace. Off-hand item: round wooden
shield with iron rim and spikes, seen from the front.
