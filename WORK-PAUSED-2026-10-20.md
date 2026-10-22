# Work paused at Nick's request — October 20, 2026

Do not resume work automatically. Nick explicitly asked to pause and save.

## Working locations

- Edit only this working copy. Original C:/Users/nickr/Documents/blood-axe must remain untouched.
- Accessible launcher: C:/Users/nickr/Documents/Codex/Blood Axe Builds/Play Blood Axe.cmd
- Latest completed playable build: build-2026-10-20-123253/game, with matching Latest ZIP. Prior dated builds retained.

## Completed in the latest build

- Painted iron/bronze/crimson pause frame, Cinzel headings/buttons and Source Sans 3 controls. Fonts and licenses bundled locally in assets/fonts. Source: src/view/PauseMenu.js, assets/ui/pause-frame.png. Both menu pages visually rendered and inspected; navigation/settings/resume checked. Review renders: art/pause-menu/main.png and controls.png. Image generated with built-in image tool; prompt retained in art/pause-menu/prompt.txt.
- Enemy sword unsheathing variations now ONLY queued for fighters with entering=true. Opening formation and stationed troops stay silent. Focused check passed.
- Layered bow volleys capped at four layers; group throttle and visible enemy entrance playback checked.
- Stone jump sound on takeoff; landing remains separate. Stone chain single step used for movement-driven footstep cadence. Four-second preview: art/mill-rescue/running-footsteps-preview.wav.
- Added supplied sword sheath, doors/gates/chests and unlock audio assets. Sheath helper is available but not arbitrarily triggered. Not all supplied effects have matching game actions yet.
- Openable chests use E / D-pad Up, preserve painted open state, and drop loot once. Two added in first level. Repeated interaction and later attacks cannot duplicate loot. Existing destructive chests remain breakable before opening.
- All 20 existing game tests passed after initial audio/chest changes; focused checks passed after later opening-audio and pause-menu changes. No claim of full manual playthrough.

## Main-character artwork — NOT integrated

User approved higher-quality versions of the SAME three heroes. Oryn is electrical. User repeatedly asked to complete all three; do not stop at another partial preview when resuming this work.

- Approved masters: art/approved-oathkeepers/{rurik,oryn,vexa}.png.
- Production catalog: art/hero-refresh/production/catalog.json (99 sheets). Numerous painted sheets saved there; count on resume, do not assume complete.
- Initial movement previews: art/hero-refresh/review.html and comparison GIFs.
- Playable game still uses old hero artwork. HD loader and integration have NOT been implemented.
- Rurik X X X must be rebuilt as wide cross, wide return, overhead downward strike. Preserve combat timing/hit data. Smear must track the actual sword. Old stiff/poking choreography should not be copied.
- Raised sword grip must be anatomically correct; no missing legs or detached hands. Specific finImpale repair and new combo generations may exist in generated_images; inspect before use.
- Roll sound request for Rurik/Vexa from the provided AudioElk stair-carpet WAV remains unfinished unless verified otherwise.

## Irvolino mill execution scene — NOT integrated

Agreed design:

- Irvolino bound at gallows on the raised mill platform in level one. Soldiers guard him and a killable executioner operates a lever.
- A rescue can FAIL if player delays. Clear warning stages; countdown starts at encounter, not at level load.
- Killing executioner stops hanging; player must strike bonds to free Irvolino.
- If rescued, Irvolino returns at father's farewell and helps carry Hakon into church.
- If killed, he stays dead; a distinctly designed replacement NPC assumes his later encounters, with loss-aware dialogue.
- Preserve the father/sword scene's important dialogue and pacing. Avoid duplicating Irvolino in the barn group.

Saved art: art/mill-rescue/{gallows-structure,gallows-mechanisms,executioner-actions,executioner-combat,irvolino-rescue,replacement-villager}.png. Replacement art depicts a solemn dark-braided woman in slate work clothes. Exact generated prompts: prompts.json. Preview gallery: review.html.

Image tool rejected captive/hanging sheets. Nick explicitly wants an actual visible hanging animation assembled from separate rope/body pieces, not an implied off-screen death.

Layered animation prototype now exists:

- src/view/MillHangingArt.js exports hangingPose(seconds) and drawMillHanging(ctx,images,seconds).
- tools/render-mill-hanging.mjs creates 96 frames in art/mill-rescue/hanging-frames.
- art/mill-rescue/irvolino-hanging-preview.gif shows lever preparation, trapdoor drop, rope catch, segmented body/head/leg sway and settling. Uses extracted Irvolino rescue pose as bound figure. Prototype is NOT connected to playable level.
- executioner-actions-clean.png removes a stray neighboring axe fragment for this preview.

LATEST USER FEEDBACK: "the executioner looks like hes swinging at nothing, looks ai".

Agreed correction, NOT implemented: executioner must REACH, GRIP, BRACE, PULL the actual lever. Hand stays attached to handle throughout motion; trapdoor releases at the end. Axe stays lowered in other hand. Current preview is rejected in this respect; do not call it finished.

## Constraints for resuming

- Original game untouched; preserve approved blood and guts balance.
- Open builds only in default external browser, never in-app browser.
- Keep build launcher accessible and retain older dated builds.
- Do not claim artwork is in game until actually integrated and verified.
- This checkpoint records outstanding work; no further changes were authorized after the pause request.
