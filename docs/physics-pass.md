# Physics and dynamic cuts — first pass

Only the separate Codex copy was edited.

- Whole ragdolls have a rotation-speed limit that preserves their thrown momentum.
- Repeated launches add less head torque; pose settling no longer injects momentum.
- Bodies can settle on hips and heels; quiet severed ragdolls sleep.
- Loose blades have a rotation limit and small floor impacts stop bouncing.
- Broken-prop chips bounce, slide and linger, with separate wood, stone and pottery responses. Blood still splatters.
- Sprite cuts vary within anatomical bands, using the visible frame's height. Chopping and slicing blows bias the cut angle differently.
- Lying-body cuts run across the body rather than across a standing character's fixed-height row.
- Pieces retain the actual sprite position, rotation and mirrored scale at separation.
- Waist halves keep their cut artwork instead of changing to fixed bands of a different lying pose. This trades articulated bending of those halves for consistent cut faces and proportions.

## Checks

Run `npm test`: existing combat suite, physics checks and cut checks.
The new checks cover repeated launches, torso settling, preserved throw momentum, debris persistence/bouncing/cleanup, anatomical cut variation, both facings, rotated poses, and complementary pixel masks.

## Playtest next

Launch this copy's `start-game.bat`. Try a three-hit sword combo, repeated air launches, waist kills while leaning or facing either direction, kills on a downed enemy, and smashing barrels/urns/walls. Compare normal kills against heavier finishers.

The preview browser could not access the local game server in this session, so these changes have automated verification but still need an in-game visual playtest. Enemy decision-making, cross-object debris collisions, arbitrary mesh slicing, and full environment structural destruction are not implemented by this pass. The existing head/limb/gut systems remain; this pass is a foundation for further tuning, not a replacement physics engine.
