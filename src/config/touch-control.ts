// The player's one-thumb touch gesture: press, drag to aim, release to touch the ball.
// All values are initial tuning.

/** Drag length that means full force, as a fraction of the screen's shorter side. */
export const CONTROL_FULL_DRAG_SCREEN_RATIO = 0.35;

/**
 * Lifting the finger confirms the aim only after a real drag of at least this fraction of
 * the full drag: a quick tap never confirms (no free aim), the player can press and drag again.
 */
export const CONTROL_MIN_CONFIRM_DRAG_RATIO = 0.08;

/** Sideways drag that means full lateral aim, as a fraction of the full (force) drag. */
export const CONTROL_FULL_LATERAL_DRAG_RATIO = 0.6;

/**
 * Game speed while the player aims, after committing to the touch: a presentation-only
 * slow motion (the simulation itself keeps its fixed steps).
 */
export const AIM_SLOW_MOTION_SCALE = 0.2;

/** Release within this much of the ideal moment to see "Perfeito!", in s. */
export const FEEDBACK_PERFECT_TIMING_S = 0.04;

/** How long a touch feedback message stays on screen, in s: long enough to aim reading it. */
export const FEEDBACK_VISIBLE_S = 1.6;

/** How far ahead the aiming arc is drawn, in game s. */
export const PREVIEW_PATH_MAX_S = 2.5;

/** The aiming arc keeps one point every this many simulation steps. */
export const PREVIEW_SAMPLE_EVERY_STEPS = 3;

/**
 * The aiming arc glides to the finger's aim with this time constant, in s (real time):
 * fluid instead of stepping with each pointer event, short enough to feel immediate.
 */
export const AIM_DISPLAY_SMOOTHING_S = 0.06;

/** Below this change of the shown aim per frame the arc is not recomputed. */
export const AIM_DISPLAY_EPSILON = 0.002;
