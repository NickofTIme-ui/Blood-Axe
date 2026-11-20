# War hound art: the missing strips (ChatGPT)

Made 2026-11-20 for "Bring the hounds to life". The code already uses each strip the moment it
is in the game (view/HoundView.js); until then it borrows the nearest painted pose.

**Every prompt:** attach `assets/enemies/strips/hound_walk.png` (and `hound_atk1.png`) as the
reference so it is the SAME dog: a huge black-brown mastiff, rusted spiked iron shoulder plate
and spiked collar, leather straps and buckles, ragged cloth under the belly, pale eyes, long
thin tail. Painted pixel-art look matching the reference. Side view, facing RIGHT. One row of
poses, evenly spaced, each pose whole (no cropping of tail or paws), on PLAIN BLACK. Same scale
as the reference walk: the dog standing is the same height in every strip. No ground, no
shadow, no text.

Save to `assets/enemies/strips/` with the name given, then add a line for it in
`src/data/levelArt.js` SPRITE_SHEETS next to `hound-walk` (frames as listed, height 120).
If ChatGPT spaces the poses unevenly, re-pack into equal cells (as done for the first strips).

1. **hound_run.png** (8 poses): a full-speed GALLOP, one complete stride: hind legs driving
   under the body, body stretched long with front legs reaching far forward, all four feet off
   the ground (suspension), front feet landing, body bunched with legs gathered underneath,
   and back to driving. Ears flat, jaws slightly open, tail streaming out behind.
2. **hound_idle.png** (4 poses): standing four-square, head low and forward, panting: flanks
   rising and falling, jaw opening and closing a little, tongue showing, a slow menacing breath.
3. **hound_bark.png** (3 poses): 1 braced low on stiff front legs, lips curled, snarling;
   2 head snapped forward mid-bark, jaws wide open; 3 head jerking back after the bark, jaws
   half open.
4. **hound_howl.png** (3 poses): 1 standing, head starting to lift; 2 and 3 head thrown
   straight back, muzzle pointing at the sky, mouth open in a long howl (on all four feet,
   NOT rearing up).
5. **hound_sniff.png** (4 poses): nose down at the ground, walking slowly, head swinging a
   little left and right, tail low, casting for a scent.
6. **hound_flinch.png** (3 poses): struck: 1 head ducked and body twisted away, eyes shut,
   yelping; 2 hind end dropped, cringing low; 3 recovering, snarling again.
7. **hound_grabbed.png** (4 poses): held up off the ground by the scruff of its neck by an
   unseen hand (show nothing of the person): front legs pawing at the air, hind legs kicking
   and dangling, body twisting, jaws snapping back over its shoulder.
8. (optional) **hound_knockdown.png** (3 poses): 1 knocked onto its side, legs out; 2 rolling
   onto its chest; 3 scrambling back up.

Order of value: run, idle, bark, flinch, howl, grabbed, sniff, knockdown.
