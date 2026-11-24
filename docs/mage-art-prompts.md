# Mage art: ChatGPT prompts

Paste these into a new chat called **BA · Mage · Strips** in the "Bloody Axe" ChatGPT
project. Attach the Mage reference image (the hooded blue sorcerer with the lantern staff)
to the **first** message. Keep every later strip in the same chat, so the style and scale
stay consistent.

Save each image as `assets/sprites/strips/mage_<name>.png`. Until a strip exists, the
game draws the Mage with the coded rig in `src/view/MageView.js`, so the strips can arrive
one at a time.

## Rules for every message (already included in each prompt below)

- One row, pure black background, WIDE gaps so no two figures touch.
- All figures face RIGHT, same character, same scale, same baseline.
- He HOVERS: his boots stay about a hand's width above the baseline in every pose
  except the knockdown poses. Draw the empty gap under him; no ground and no shadow.
- No text, no motion lines, no glow across the background. Magic stays small and close
  to the staff or hand. The game adds the big effects.
- Painted 16-bit arcade pixel art, the same detail as the reference.

---

## 1. Base: hover cycle (first message, with the reference attached)

> This is THE MAGE for my 16-bit dark-fantasy beat 'em up: an old, severe, good-hearted
> war sorcerer. Keep his design exactly: deep navy hooded robe with gold sun, moon and
> star embroidery, cream inner panel, brown leather belts with rolled scrolls and a
> strapped tome, gold charms and little red lanterns on chains, long white braided beard,
> armoured boots, and a twisted wooden staff wrapped in chain with a spiked iron lantern
> cage holding a glowing red-orange crystal.
>
> Draw a sprite strip: **8 poses in one row**, side view, all facing right, pure black
> background, wide gaps so nothing touches, same scale, no text. He does not walk: he
> **floats a hand's width above the ground** and glides forward. This is the hover-glide
> cycle. His torso leans slightly forward, the robe hem and cloak stream back and ripple
> differently in each pose, charms and scrolls sway, and his feet dangle with toes
> pointing down. The staff is in his right hand (the hand nearer the viewer), held upright
> and slightly forward. His height rises and falls a little across the 8 poses, and the
> last pose leads smoothly back into the first. Calm, controlled, effortless.

Save as `mage_hover.png`.

## 2. Idle

> Same character, same scale, same style as before. **6 poses in one row**, facing right,
> black background, wide gaps. Idle while hovering: slow breathing, his head turns a
> little and then back, the cloak and robe drift, the charms swing on their own, the
> staff is held upright and still, and his boots hang above the ground. Very subtle
> changes between poses. Pose 1 and pose 6 are almost the same.

Save as `mage_idle.png`.

## 3. Hover seen from behind and from the front

> Same character, same scale. **8 poses in one row**, black background, wide gaps. The
> same hover-glide cycle, but **seen from behind** as he floats away up the screen: hood,
> cloak back with the big gold sun embroidery, the staff's lantern over his right
> shoulder, and the hem streaming toward the viewer.

Save as `mage_hoverU.png`. Then send:

> Now the same 8-pose hover-glide **seen from the front**, floating toward the viewer:
> severe face under the hood, beard, belts and tome, and the hem streaming back.

Save as `mage_hoverD.png`.

## 4. Staff combo (3 strips, 5 poses each)

Pose 1 of each strip is his ready stance: the staff held in front, both hands on it.

> Same character, same scale. **5 poses in one row**, facing right, black background,
> wide gaps. He still hovers. Staff strike 1, a fast horizontal swing: (1) ready stance,
> staff in both hands; (2) wind-up, shoulders turned back and the staff drawn back past
> his rear hip; (3) contact, the staff level and fully extended forward at chest height
> with the body turned into it; (4) follow-through, the staff carried past the front and
> the robe swinging after it; (5) recovering to the ready stance. Hands stay on the
> staff the whole time and never swap.

Save as `mage_combo1.png`.

> Same, 5 poses. Strike 2, a **reverse backhand sweep** that continues from strike 1:
> (1) the end of strike 1, staff across the front; (2) the torso twists the opposite way
> and the staff head drops low in front; (3) contact, the staff sweeps up and back across
> at chest height; (4) follow-through, high behind; (5) ready stance.

Save as `mage_combo2.png`.

> Same, 5 poses. Strike 3, a **heavy spinning slam**: (1) ready stance; (2) he turns his
> back to the viewer mid-spin with the staff swung high overhead; (3) completing the spin
> with the staff raised overhead in both hands; (4) contact, the staff head slammed down
> to the floor in front of him (a small orange spark at the crystal only); (5) rising
> back to the ready stance.

Save as `mage_combo3.png`.

## 5. Chain Lightning cast

> Same character, same scale. **6 poses in one row**, facing right, black background,
> wide gaps. He casts lightning through the staff: (1) ready; (2) the staff raised high,
> the crystal glowing brighter; (3) holding it up and charging, sleeves lifting, a few
> small sparks around the crystal only; (4) the staff thrust straight forward and level,
> pointing at the target, his body leaning into it; (5) recoil from the release, the
> staff kicked up a little; (6) back to ready. Do NOT draw the bolt itself.

Save as `mage_bolt.png`.

## 6. Force Blast

> Same character, same scale. **5 poses in one row**, facing right, black background,
> wide gaps. A telekinetic shove with his free left hand (the staff stays in his right):
> (1) ready; (2) coiling back, left hand pulled to his chest, palm cupped; (3) the left
> arm thrust fully forward, palm open, fingers spread, the robe and beard blown BACK by
> the force; (4) holding the push; (5) back to ready. No blast drawn, only a faint
> orange rune ring around his palm in pose 3.

Save as `mage_force.png`.

## 7. Blink (teleport dodge)

> Same character, same scale. **6 poses in one row**, facing right, black background,
> wide gaps. He teleports: (1) ready; (2) his body starts to break apart into small
> orange sparks and blue smoke from the edges inward; (3) mostly gone, a dissolving
> silhouette of sparks; (4) re-forming from sparks, a faint outline; (5) solid again,
> landing in a slight crouch with the robe settling; (6) ready.

Save as `mage_blink.png`.

## 8. Arcane Barrier cast

> Same character, same scale. **6 poses in one row**, facing right, black background,
> wide gaps. He calls up a wall: (1) ready; (2) the staff lifted overhead in both hands;
> (3) at the top, his whole body stretched up and the crystal flaring; (4) the staff
> SLAMMED down vertically into the floor in front of him, body driven down with it;
> (5) holding the staff planted, his robe blown outward; (6) pulling the staff up, back
> to ready.

Save as `mage_ward.png`.

## 9. Reactions

> Same character, same scale. **8 poses in one row**, facing right, black background,
> wide gaps. (1) block: the staff braced diagonally across his body in both hands;
> (2) light hit: torso snapped back, robe flaring, he dips lower; (3) heavy hit: blown
> backward, feet swinging forward; (4) knocked flying: levitation broken, limbs loose;
> (5) lying flat on his back on the ground (this pose touches the ground); (6) getting
> up: rising vertically off the ground, still horizontal, robes hanging down; (7) tilting
> upright in the air; (8) back to the hover stance with the robes settling.

Save as `mage_react.png`.

## 10. Levitation rise (his jump)

> Same character, same scale. **4 poses in one row**, facing right, black background,
> wide gaps. A controlled levitation jump: (1) slight sink and gather; (2) rising, the
> robe hem lifted and spread, arms slightly out; (3) at the top, calm, the robe
> billowing; (4) descending, the robe trailing upward.

Save as `mage_levitate.png`.

## 11. Finishers (8 poses each; draw only him, no victim)

> Same character, same scale. **8 poses in one row**, facing right, black background,
> wide gaps. Finisher STORM JUDGMENT, drawn on an empty space where a victim would be:
> (1) ready; (2) he stops and plants himself in the air; (3) the staff raised high
> overhead with one hand; (4) the staff held up while lightning gathers on the crystal
> (small sparks only); (5) the staff brought down hard toward the victim's spot as the
> bolt falls; (6) holding that pose; (7) the staff lowering; (8) calm ready stance.

Save as `mage_finStorm.png`.

> Same, 8 poses. Finisher ARCANE RUPTURE: (1) ready; (2) the left hand extends toward the
> victim, palm out; (3) the fingers curl as he pulls; (4) the hand held out, open, as the
> victim hangs in the air; (5) the hand slowly closing; (6) almost a fist; (7) the fist
> clenched and jerked shut; (8) lowering his hand, calm.

Save as `mage_finRupture.png`.

> Same, 8 poses. Finisher GATE OF EMBERS: (1) dissolving into sparks (blinking away);
> (2) re-forming, facing the viewer's left now, in the runner's path; (3) solid, the staff
> raised; (4) slamming the staff butt straight down into the floor; (5) holding the staff
> planted, staring; (6) the robe and beard blown up by heat from below; (7) still;
> (8) turning slightly away, the staff lowering.

Save as `mage_finEmbers.png`.

---

When a strip is saved, check it with `tools/strip-check.html` like the Ulric strips. Then
tell a session to wire it in: it gets an entry in `CHARACTER_STRIPS.mage` in
`src/data/spriteStrips.js`, and `MageView` then uses the strip in place of the rig for
that move.

---

## 12. The Earthen Bulwark slabs: `assets/fx/earthwall-strip.png`

The wall is built from these slabs (`FX_STRIPS.earthwall`). The game makes each one burst
up out of a glowing crack, stacks them across the whole lane, cracks them as enemies batter
them, and crumbles them when the wall falls. Until the file exists, the slabs are code-drawn
rock shapes.

> For my 16-bit dark-fantasy beat 'em up (style of the attached Mage art): **6 separate
> tall slabs of magical rock in one row**, each standing upright, side by side with WIDE
> gaps, on a FLAT PURE MAGENTA (#FF00FF) background. Each slab is a different jagged shape:
> broken stone and packed earth with chunks of old masonry embedded, sharp splintered tops,
> and thin seams of glowing orange-gold magic running through the cracks. Dark grey-brown
> stone, lit warm from the front, heavy and physical. All roughly the same height, about
> three times taller than wide, bottoms flat and level on one baseline (they come out of
> the ground). No dust, no motion lines, no text, nothing magenta in the art itself.

---

## 10. The rework (4 November 2026): new moves and the spiked wall

These replace borrowed poses (data/heroStrips.js HERO_ANIMS.mage: jab, twirl, twirlEnd, shoulder,
thunder). Same chat, same rules as above. Once a strip is saved, add it to HERO_STRIPS.mage.strips
and point the anim at it.

> Same character, same scale. **6 poses in one row**, facing right, black background, wide gaps.
> The LANTERN JAB: (1) ready; (2) the staff drawn back along his side, the iron lantern cage at
> the front, both hands on the shaft like a spear; (3) the staff driven straight forward at chest
> height, fully extended, body leaning in; (4) holding it out; (5) pulling it back; (6) ready.

Save as `mage_jab.png`.

> Same, **6 poses**. The STAFF TWIRL: the staff spun in front of him like a wheel, held in the
> middle in both hands, shown at six angles of one turn, the robe swirling. A faint blue-violet
> glow at the lantern only.

Save as `mage_twirl.png`.

> Same, **6 poses**. The POLE-VAULT KICK: (1) running forward, staff held low; (2) the staff's
> foot planted ahead, him rising on it; (3) swung up off the ground, body horizontal, both boots
> forward; (4) both boots driven straight out (the kick); (5) dropping back down past the staff;
> (6) landed, ready.

Save as `mage_vault.png`.

Wall art (assets/fx/): `earthwall-spiked-strip.png`, the same slabs as `earthwall-strip.png` but
with jagged stone spikes jutting from BOTH faces, and no teal glow; a second copy with blood on
the spikes and streaked down the stone. On magenta. Today the spikes are drawn in code
(effects/MageFX.js EarthWallView).

## 13. The second set (15 November 2026): new moves, grab, block and death

These replace borrowed poses (data/heroStrips.js HERO_ANIMS.mage: updraft, skyfall, plunge,
spikes, tempest, grab, block, death, fin_spires). Same chat, same rules as above. Section 10
(jab, twirl, vault) is still to paint too.

> Same character, same scale. **6 poses in one row**, facing right, black background, wide gaps.
> The UPDRAFT: (1) ready; (2) crouched low, the staff swept down behind him near the floor;
> (3) the staff ripping up in front of him from the floor, both hands, body rising; (4) the staff
> high over his head, arms up, robe blown upward; (5) holding it up; (6) lowering to ready.

Save as `mage_updraft.png`.

> Same, **6 poses**. The SKYFALL BOLT and THE TEMPEST: (1) the staff thrust straight up at the
> sky in both hands, head tipped back; (2) the same, robe and beard whipped upward by wind;
> (3) the same with the lantern blazing white; (4) the staff swung down to point ahead; (5) the
> staff planted, head bowed; (6) ready.

Save as `mage_skyfall.png`.

> Same, **4 poses**. The METEOR DROP: (1) high in the air, staff raised over his head in both
> hands, robe flaring; (2) diving straight down, staff point first under him; (3) landed in a
> deep crouch, the staff driven into the floor; (4) rising out of the crouch.

Save as `mage_meteor.png`.

> Same, **8 poses**. GRAB AND THROW (as the knight's neck grip): (1) ready; (2) his free left
> hand clamped forward on the air at shoulder height, staff in the right; (3)-(6) four steps
> marching forward with the left arm held out, firm; (7) the left arm drawn back to shove;
> (8) the shove, arm fully out.

Save as `mage_grab.png`.

> Same, **8 poses**. BLOCK, HURT and DEATH: (1) the staff braced across his body in both hands
> (a guard); (2) the same, rocked back as a blow lands on it; (3) recovering; (4) hit in the
> body, doubled over; (5) hit in the head, snapped back; (6) falling backward; (7) lying dead
> on his back, staff beside him; (8) the same, the lantern's glow gone out.

Save as `mage_block.png`.

> Same, **8 poses**. IMPALING SPIRES (finisher, draw only him): (1) ready; (2) the staff raised
> overhead; (3) the staff slammed point down into the floor; (4)-(5) holding it planted, leaning
> on it, cold stare; (6) his free fist raised and clenched; (7) the fist pulled down; (8) turning
> away.

Save as `mage_finSpires.png`.

Skill-tree medallions for THE CATACLYSM (like the other icons, `assets/ui/skilltree/icons/`):
`liveWire.png` (a crackling blue-white spark wrapped round a staff), `stoneSpikes.png` (a row of
jagged stone spikes bursting from cracked earth), `tempest.png` (a black storm cloud with three
lightning bolts). Then take `noIcon: true` off those three nodes in `src/data/skills.js`.

---

## 14. Painted spell effects (24 November 2026): make his magic feel powerful

Nick: "need to get art for mages different lighting effects it needs to feel more powerful".
Until now almost every spell effect in `src/effects/MageFX.js` was drawn by code (thin
jagged lines, plain circles and rings). These sheets replace them. All are painted on
**pure black** so the game can draw them with additive blending (black = invisible, the
light adds onto the scene), except the stone spikes, which are solid and go on magenta.
Colours match Oryn: the white-hot core and amber-gold fire of his lantern, edged with the
deep violet-blue of his robes and staff sparks.

Rules for every message: one image, one row, frames evenly spaced with wide black gaps,
nothing touching the edges, no text, no ground, no characters, no frame borders, painted
16-bit dark-fantasy arcade pixel-art style with a rich glow.

**14a. Lightning bolts** `assets/fx/mage-bolts.png`
> Sprite sheet for a 16-bit dark-fantasy beat 'em up, painted pixel-art style. 6 separate
> VERTICAL lightning bolts in one row on a pure black background, wide black gaps between
> them, each bolt reaching from the very top of its column to the very bottom. Jagged,
> forking, violent magical lightning: a blinding white-hot core, a thick amber-gold glow
> around it, and a thin outer haze of electric violet-blue. Each bolt a different shape,
> with 2 to 4 small side forks. No ground, no sky, no text, nothing else in the image.

**14b. Lightning hit burst** `assets/fx/mage-zap-burst.png`
> Same style. An 8-frame animation in one row on pure black, wide gaps, every frame the
> same size and centred: a magical lightning impact exploding on a body. Frame 1 a tiny
> white-hot spark; 2-3 a blinding star burst with jagged arcs of white and amber-gold
> lightning shooting outward and violet-blue crackle; 4-5 the largest, ragged ring of
> sparks flying out; 6-8 it breaks into scattered fading embers and small blue arcs.
> No characters, no text.

**14c. Sky strike on the ground** `assets/fx/mage-thunder-ground.png`
> Same style. An 8-frame animation in one row on pure black, wide gaps, side view of a
> huge lightning bolt hitting the ground: the bottom of each frame is the ground line.
> 1 the bolt's tip touches down; 2-3 a blinding white-gold explosion of light bursting up
> and out along the ground, sparks and lightning arcs spraying sideways, rocks and dirt
> flung up; 4-5 a wide flattened dome of amber fire and violet-blue electricity; 6-7 it
> collapses into rising smoke and glowing embers; 8 faint embers. No bolt from the sky in
> frames 3-8 (the game draws the bolt). No ground plane drawn, no text.

**14d. Meteor Drop fire blast** `assets/fx/mage-meteor-blast.png`
> Same style. An 8-frame animation in one row on pure black, wide gaps, side view of an
> arcane meteor slamming into the ground; the bottom of each frame is the ground line.
> 1 a white-hot flash; 2-4 a wide eruption of roaring orange-gold fire and molten rock
> chunks blasting up and out, ringed with violet-blue magic runes; 5-6 a mushroom of fire
> and black smoke; 7-8 dying flames and embers. Wide and low, about twice as wide as
> tall. No characters, no text.

**14e. Force blast shockwave** `assets/fx/mage-force-wave.png`
> Same style. A 6-frame animation in one row on pure black, wide gaps, side view of a
> wave of pure magical force blasting to the RIGHT out of an open palm (no hand drawn):
> a cone of rippling, warped air with bright white-gold crescent edges, faint violet
> rune glyphs caught in it, and streaks of dust. Frame 1 small near the left edge of its
> cell, each frame wider and further right, 5-6 the widest, thinning and fading.
> No characters, no text.

**14f. Blink teleport** `assets/fx/mage-blink.png`
> Same style. A 6-frame animation in one row on pure black, wide gaps, each frame a tall
> narrow column the height of a man: a sorcerer vanishing in a teleport. 1 a tall violet-
> blue silhouette-shaped glow; 2-3 it splits into vertical shards of violet light and
> amber sparks; 4 a bright white-gold flash at the centre; 5-6 it implodes into a thin
> vertical line and a few drifting motes. No person drawn, only the light. No text.

**14g. Rune circles** `assets/fx/mage-runes.png`
> Same style. 4 separate glowing magic circles in one row on pure black, wide gaps.
> 1 and 2: a large arcane rune circle seen lying flat on the ground in low perspective
> (a wide flat ellipse, about 4 times wider than tall), double ring, glowing runes and
> sigils between the rings, crackling with small violet-blue and white lightning; 1 dim,
> 2 blazing. 3 and 4: an upright round ward shield of interlocking amber-gold runes seen
> from the side (a tall narrow ellipse, like a glowing disc turned edge-on), 3 calm,
> 4 flaring bright. No text, no characters.

**14h. Staff charge** `assets/fx/mage-charge.png`
> Same style. A 6-frame looping animation in one row on pure black, wide gaps, every frame
> the same size and centred: a ball of magic charging up (as on the tip of a sorcerer's
> staff). A white-hot core in an amber-gold flame, small violet-blue arcs of lightning
> crackling round it and sparks being sucked inward, a different arrangement each frame.
> Round, no staff drawn, no text.

**14i. Stone spikes** `assets/fx/mage-stone-spikes.png` (solid, not a glow)
> Same style. 6 separate jagged spikes of magical stone in one row on a FLAT PURE MAGENTA
> (#FF00FF) background, wide gaps, each pointing straight UP with its broken base flat on
> one baseline (they burst out of the ground). Dark grey-brown rock, sharp splintered
> points, thin seams of glowing orange-gold magic in the cracks, a few clods of earth at
> the base. Different heights and widths, each about 3 to 5 times taller than wide.
> No dust, no text, nothing magenta in the art itself.

**14j. Arcane Rupture prison (Y finisher)** `assets/fx/mage-cage-strip.png`
Nick (24 Nov): "get the mages Y finisher circle thing really good artwork".
> Same style, extremely detailed and spectacular. An 8-frame looping animation in one row
> on pure black, wide gaps, every frame the same size and centred: an ARCANE PRISON SPHERE,
> an upright oval cage of magic closed around a victim (inside empty, no person). Three or
> four interlocking rings of glowing amber-gold runes and sigils tilted like a gyroscope or
> armillary sphere, a thin violet-blue energy membrane between them, tiny orbiting rune
> glyphs, crackling violet lightning and gold sparks. Each frame the rings turn a little
> further so the 8 frames loop. About 1 wide to 1.5 tall. No text, no frame borders.

Cutting: `python tools/cut-mage-fx.py art/mage-fx/<sheet>.png assets/fx/<strip>.png <frames>
[glow|solid|magenta] [centre|left]`, then shrink the strip to about twice the height it is
drawn at (FX_STRIPS height) to keep the download small. Originals: art/mage-fx/ (and
project files mage-fx/originals/). A tiny Phaser page that plays each effect over a level
backdrop, with a before (code-drawn) mode, is in project files mage-fx/preview-harness/
(the full game OOMs in the cloud's headless browser).
