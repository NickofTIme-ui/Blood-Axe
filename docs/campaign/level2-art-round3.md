# Gallows Wood art, round 3 (18 Nov 2026): what was made and how

Made in ChatGPT on Nick's PC (Chrome), project "Bloody axe". Chats:
- "Create Wagonmaster Sprite Strip" 6afd0d44-1dec-83ea-afd6-708bbc8117a4 (the Wagonmaster)
- "Create Character Sprites" 6afd0f28-3874-83ea-97c5-d78f2954eedc (the Houndmaster, snared men, hound drag,
  horses, villagers). Its first message accidentally carries two prompts; the second message corrects it.

Method for enemy looks: attach the kind's own strip and ask for "this EXACT strip, same poses, same size,
positions and spacing", redrawn as the new man. The layouts then match ENEMY_ANIMS of the kind (LOOKS in
data/enemyStrips.js), so no new animation tables were needed.

| File | From | What |
|---|---|---|
| `assets/enemies/strips/wagonmaster_{walk,react,atk1,atk2,heavy,special}.png` | butcher's strips | slate-blue oilskin greatcoat, dripping hat, grey beard; atk1 whip crack, atk2 cudgel backhand, heavy two-handed cudgel slam, special whip lasso throw and haul (the Butcher's hook move) |
| `assets/enemies/strips/houndmaster_{walk,react,atk1,atk2,heavy,special,kneel}.png` | stalker's strips | grey wolf-pelt hood and mantle, charcoal leather, chains round his left arm, bone whistle; atk1 knife thrust, atk2 chain lash, heavy pounce, special hooked chain throw and haul, kneel for his sentence |
| `assets/env/wood/snared_{stalker,butcher,hound}_{1,2,3}.png` | `tools/cut-wood-art.py` from the raw `snared_<kind>.png` (magenta) | upside down by one ankle (the hound by a hind leg): swinging, grabbing the leg, limp |
| `assets/enemies/strips/hound_drag.png` | hound strips | 5 poses: the grab, then braced and hauling back, worrying |
| `assets/fx/horse_pull.png` | the stampede horse | grey draught horse in collar harness: 0-5 plodding haul, 6 standing, 7 rearing |
| `assets/sprites/npc/villager_{woman,tanner,burner}.png` | villager.png | the villager's 8 poses as a woodcutter woman (moss shawl), a tanner's apprentice, a charcoal burner |

Raw downloads are in the PC's `assets/incoming/level2r3/` (git-ignored).

Wiring (all view-only, no sim change):
- `data/enemyStrips.js`: `wagonmaster` and `houndmaster` sets, `LOOKS` maps them to butcher / stalker.
- `scenes/ArenaScene.js makeView`: a 'butcher:driver' wears `wagonmaster`; on `bossSpawn` a boss whose
  `look` loaded gets his view remade (his view was made before Stage.makeBoss set the look, so Orsk and the
  Gate Twins never showed their own strips either; they should now).
- `data/stageWood.js`: the Houndmaster boss has `look: 'houndmaster'`.
- `data/snaredArt.js` + `view/SnareHang.js` (per-pose `reach`, the hound hangs by its body length).
- `view/HoundView.js`: the drag poses while `f.latchOn` is set; scale and origin reset each frame so a
  painted hanging pose can't leave the hound the wrong size.
- `view/StageView.js horses()`: two horses ahead of the rolling wagon, traces to its front; they rear
  when it's halted, bolt (gallop frames) when it's wrecked, vanish when it escapes. Tuning: `HORSE`.
- `view/NpcView.js WOOD_LOOKS`: the tanner's boys' third is the apprentice; the convoy's prisoners lead
  with the charcoal burner and the woodcutter woman.
