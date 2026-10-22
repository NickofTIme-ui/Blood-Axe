# Hit-driven cuts and flexible remains

The killing contact height now reaches CutGeometry through Gore and SpriteCuts. Transverse cuts follow that contact within anatomical limits; neck and leg cuts stay in their regions. Lengthwise cuts retain their direction with a small contact-side offset. Blade fatality weights favor head cuts on high hits and leg cuts on low hits. Existing attacks, damage and timing are unchanged.

Both complementary textures use the same shallow irregular cut boundary, preserving exactly one copy of every source pixel. The wound color is painted inside the existing silhouette, without a separate rectangular overlay.

FlexibleCut divides each sufficiently large current-pose cut texture at retained neck, hip and knee landmarks. Small overlapping image bands articulate using a fixed-step FleshChain. Both halves keep their own joints and motion; they do not reconnect across the cut. Launch spin is bounded. Terrain contact uses both joint thickness and sampled opaque outlines so the art settles on the ground. Settled chains sleep and relaunches wake them. Neck and scripted kneeling executions retain their established special handling.

Large flexible remains persist for about 24 seconds, with a one-second fade. At most 64 are kept before older remains start fading. All child images and generated cut textures are destroyed during cleanup.

Validation: dynamic-slices-test checks contact-height placement, head/leg outcome biases, irregular edges, joint folding, segment length, ground contact, settling and relaunch. cuts-test still verifies complementary pixel ownership and mirrored/rotated placement. check-flexible-cuts imports the actual grunt artwork, simulates high, low and vertical cuts, checks that flexible pieces were created and verifies texture cleanup. Its image is dynamic-slices-review.png, initial cuts at left and remains after 180 ticks at right. The full existing test suite passes. This is still an approximation using painted sprite bands; arms embedded in a torso band do not each get separate anatomical rigs. Live gameplay remains the visual acceptance check.
