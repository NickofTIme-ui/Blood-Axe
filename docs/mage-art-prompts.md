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
