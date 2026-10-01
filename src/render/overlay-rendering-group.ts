/**
 * Babylon draws rendering groups in order and clears depth between them, so meshes in this
 * group always appear on top of the scene: the player's aids (timing ring, aiming arc).
 */
export const OVERLAY_RENDERING_GROUP = 1;
