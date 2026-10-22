# Stable warning, farewell and painted fragments

All new raster art was made with the built-in image-generation tool. Runtime assets are saved in the working copy and included in the playable build.

## Saved assets

- `assets/npcs/stable-master.png`: source performance sheet. `stable-master-frames.png` is the game-ready atlas; importer separates whole figures to preserve pointing hands.
- `assets/cinematics/hakon-mourned.png`: dead Hakon, kneeling Rurik, mourning villagers, Irvolino and the companions. Used during the silent mourning beat and again after the raised-sword image.
- `assets/cinematics/hakon-dead.png`: dead Hakon's reclining body for the level itself. Empty folded hands and closed eyes; no sword left in his hands.
- `assets/fx/gore-painted-atlas.png`: twelve painted fragments. Loose meat, organs, bone, armored limbs and cloth fragments use the new art. Approved blood jets and splashes are preserved.

## Stable-worker prompt

Game sprite animation sheet, EXACTLY EIGHT full-body figures in 4 equal columns x 2 equal rows, 1536x1024 canvas. Transparent background, no text, no borders, no shadows, no scenery. Grim dark medieval graphic-novel painted ink aesthetic, rich textured cloth, strong believable human anatomy, game-ready clean silhouettes. Same distinctive STABLE MASTER in every cell: stocky older man with broad nose, thick sandy-gray mustache, short thinning gray hair, rolled-up faded teal sleeves, long split brown leather farrier apron, rope belt with horseshoe and pliers, patched dark trousers, heavy work boots, burgundy neckerchief. No armor, no cape, no weapons, no existing heroic character. Emotion panicked angry scream, mouth visibly open, looking toward RIGHT. Character body height about 360px in each 384x512 cell, boots on same baseline y450 within cell, full figure wholly inside own cell including raised hands. Every figure same body size and consistent centered hips. Reading order: 1 standing alarmed both hands near chest looking right; 2 crouched knees bent preparing to jump, right arm beginning point toward right; 3 JUMP screaming pointing emphatically right with one arm fully extended, other hand raised near head, BOTH FEET visibly airborne 45px above the same ground baseline, knees slightly bent, keep head in frame; 4 landing weight-down still yelling and pointing right; 5 running urgently LEFT, left foot forward right foot back, arms pumping, head facing left; 6 running LEFT passing pose, airborne back foot passes supporting leg, apron flaps; 7 running LEFT opposite step RIGHT foot forward toward left screen and left foot behind, natural anatomy; 8 running LEFT opposite passing pose. Each pose anatomically distinct. Keep apron split so legs can be read. Do not duplicate the same running leg. Dynamic panic performance, not a stiff static portrait. Transparent genuine alpha.

Final correction: remove the background into genuine alpha, keep eight separate full-body poses, preserve the pointing hand, and retain consistent figure proportions. The game's figure importer then separates and aligns the poses.

## Mourning artwork prompt

Continue the existing Hakon last-breath painting in the same dark medieval graphic-novel style. Hakon is dead, eyes closed, empty hands folded across his chest, reclined on his red cloak at the dwelling door. Rurik kneels with Oathkeeper beside him, head bowed. The villagers huddle around the body, including a mother holding her child, a boy, an old smith, and Irvolino kneeling by Hakon's feet. Use Irvolino's existing portrait as likeness reference. Companions stand quietly behind. Keep the whole father visible, with restrained firelight, no triumph, no smiling and no text.

## Dead-Hakon sprite prompt

Use the existing Hakon painting as exact clothing and face reference. Full reclining body, head left and boots right, closed eyes, empty hands folded over the chest, engraved steel armor and worn red cloak. Dignified, naturally resting corpse; no sword, no active grip, no scenery, genuine transparent alpha and generous margins.

## Painted-fragment prompt

Dark medieval painted graphic-novel VFX atlas, twelve isolated items in four columns and three rows, genuine transparency and no spray/puddles. Reading order: bracer forearm, sleeved arm, greave/boot, damaged helmet, meat, organ, intestine loop, sinew, bone shard, skull fragments, eyeball, chainmail/leather scrap. Detailed torn cloth, chipped steel, flesh fibers and ivory bone; crisp silhouettes and no cartoon shapes. No blood-art redesign.

## Behavior and verification

The stable warning is a world-space shout, not a dialogue box. Its worker performs once and flees. Horses directly kill ordinary enemies and emit the painted fragmentation reaction, while the existing player hazard rules remain.

Saved villagers keep the same NPC objects and walk into the gate huddle rather than teleporting into new positions. Irvolino remains the leader of the rescued barn group. After the father dies they kneel/cower in solace and remain there. Rescue-dependent reactions only play for people actually saved. The farewell includes protected silent holds, and the ending does not resume battle music.

Automated combat/story checks, stable-worker tests, mourning continuity tests and real-asset atlas import checks passed. This does not replace an in-game playthrough of the new staging.
