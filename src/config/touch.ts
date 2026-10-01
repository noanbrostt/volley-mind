// How touches are judged and where they send the ball. All values are initial tuning, to
// be calibrated with Noan.

// --- Quality ---

/** Releasing this far from the ideal moment, early or late, is a missed touch, in s. */
export const TOUCH_TIMING_WINDOW_S = 0.2;

/**
 * How long the ball may rest in the hands while the toucher chooses the aim, in game
 * seconds (the player sees it in slow motion). Past it, the ball leaves with the ideal aim.
 */
export const AIM_HOLD_MAX_S = 0.425;

/** Distance from the ideal standing spot at which positioning adds nothing, in m. */
export const TOUCH_POSITION_TOLERANCE_M = 0.6;

/** Share of quality kept by an athlete with skill 0 (skill 100 keeps all of it), 0–1. */
export const TOUCH_SKILL_FLOOR = 0.4;

/** Quality multiplier when the ball arrives bad (low, far or out of time), 0–1. */
export const BAD_BALL_QUALITY_FACTOR = 0.75;

/** How much aiming away from the ideal direction and force costs in quality, 0–1+. */
export const AIM_QUALITY_PENALTY = 0.5;

// --- Aim (the player's drag) ---

/** Force that sends the ball exactly to the target, on the 0–1 drag scale. */
export const AIM_IDEAL_FORCE = 0.5;

/** Sideways shift of the target at full lateral drag, in m. */
export const AIM_MAX_LATERAL_M = 2.5;

/** Distance (or speed) change between no force and full force, as a fraction of ideal. */
export const AIM_FORCE_SPAN = 0.8;

// --- Error from imperfect quality (scaled by 1 − quality) ---

/** Radius of the random target miss at quality 0, in m. */
export const TOUCH_MAX_TARGET_ERROR_M = 2.5;

/** Random change of the arc height at quality 0, ± in m. */
export const TOUCH_MAX_RISE_ERROR_M = 1.2;

/** Random change of a driven ball's speed at quality 0, ± as a fraction. */
export const TOUCH_MAX_SPEED_ERROR_RATIO = 0.3;

// --- Trajectories per action (heights above the higher of contact and target) ---

/** Set: high, so the attacker meets it with the arm stretched up, in m. */
export const SET_RISE_M = 1.6;

/** Dig: high, giving the setter time to think and move, in m. */
export const DIG_RISE_M = 2.2;

/** Roll shot: a soft arc that still reaches the partner, in m. */
export const ROLL_SHOT_RISE_M = 0.6;

/** Controlled attack: less force for more precision, in m/s. */
export const ATTACK_CONTROLLED_SPEED_MPS = 12;

/** Arc used when a driven ball cannot reach its target at the drawn speed, in m. */
export const TOUCH_FALLBACK_RISE_M = 1;

/** Quality multiplier for a dive (Noan: same target, much lower quality), 0–1. */
export const DIVE_QUALITY_FACTOR = 0.6;
