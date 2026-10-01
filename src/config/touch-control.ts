// The player's one-thumb touch gesture: press, drag to aim, release to touch the ball.
// All values are initial tuning.

/** Drag length that means full force, as a fraction of the screen's shorter side. */
export const CONTROL_FULL_DRAG_SCREEN_RATIO = 0.35;

/** Drags shorter than this fraction of the full drag count as a plain tap: ideal aim. */
export const CONTROL_DEADZONE_RATIO = 0.12;

/** Drag angle away from straight up that means full lateral aim, in rad. */
export const CONTROL_MAX_AIM_ANGLE_RAD = Math.PI / 4;

/** Release within this much of the ideal moment to see "Perfeito!", in s. */
export const FEEDBACK_PERFECT_TIMING_S = 0.04;

/** How long a touch feedback message stays on screen, in s. */
export const FEEDBACK_VISIBLE_S = 0.9;
