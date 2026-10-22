# Rurik combo artwork, version 2

Six five-pose strips: horizontal cross-body slash, horizontal return slash, overhead chop; each with his starting sword and Oathkeeper. Created with the imagegen skill from the existing Rurik combo art. Full prompts are in prompts.json. Existing strips and generated originals were preserved.

Only light1/light2/light3 animation overrides use these strips. Idle, finishers and other attacks continue to use their established art. Attack startup, active time, recovery, hitstop, damage and combo windows were not changed.

Blade hilt/tip landmarks are recorded in src/data/rurikComboArt.js. The importer transforms them with the same offsets and scale as the actual art, retains them in its cache and supplies them to BladeTrail. Thin steel or gold ribbons follow those transformed landmarks, including facing, body lean and depth scaling. Their tails fade for four recovery ticks; lifting the sword during recovery does not draw a second attack arc.

Verification: imported all six assets through the real strip importer and inspected imported-review.png; all 30 blade landmarks remain inside their frames. Rurik combo tests lock existing timing and chain windows, verify mirrored/rotated tracking and ensure the bright trail edge reaches the sword tip. All existing automated tests pass. Live gameplay feel still needs review.
