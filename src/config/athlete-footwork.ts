// Volleyball footwork, generated in code: each foot stays planted until the body moves away
// from it, then steps along the real direction of travel. So the steps come out lateral,
// frontal or anything in between, as each ball asks (Noan). Initial values, to calibrate.

/** Feet apart, from the body's center line to each ankle, in m: a wide, low base. */
export const STANCE_HALF_WIDTH_M = 0.22;
/**
 * One foot sits ahead of the other (Noan: "uma perna sempre fica mais pra frente"), by this
 * much, in m: the dominant-side foot, except to attack, when the other foot leads (the drill
 * attacks standing, "um pé à frente do outro"; as in a throw).
 */
export const STANCE_STAGGER_M = 0.16;

// Efficient steps (Noan): each one lands where the body will be, so a move takes few, purposeful
// steps; small adjusting steps are still fine.
/** A planted foot steps once its home spot has moved this far away, in m. */
export const STEP_TRIGGER_M = 0.16;
/** How long a step takes in the air when barely moving, in s of game time... */
export const STEP_DURATION_S = 0.26;
/** ...and at a fast move, in s: the cadence quickens with the speed. */
export const STEP_FAST_DURATION_S = 0.17;
/** Body speed at which steps are quickest, in m/s. */
export const STEP_FAST_SPEED_MPS = 2.5;
/** How high the foot lifts mid-step, in m. */
export const STEP_HEIGHT_M = 0.08;
/** A step lands this far ahead of where the body will be on landing, in s of travel. */
export const STEP_LEAD_S = 0.08;

/** How far the knees point outward from straight ahead, as a share of the forward pull. */
export const KNEE_OUTWARD_SHARE = 0.25;
/** With footwork, the body turns only this share of the way toward where it moves. */
export const FOOTWORK_TURN_SHARE = 0.25;
/** How quickly the legs hand over between footwork and the running clips, in s. */
export const FOOTWORK_SMOOTHING_S = 0.15;

// Looking at the ball: always (Noan), but the eyes do part of it, so the head turns less
// than the ball moves, and lazily, never stuck to it like a magnet.
/** The head turns at most this far from the chest's front, in rad. */
export const HEAD_LOOK_MAX_RAD = (75 * Math.PI) / 180;
/** Share of the turn done by the neck; the head does the rest. */
export const NECK_LOOK_SHARE = 0.4;
/** The eyes cover this much on their own: the head only turns for what lies beyond, in rad. */
export const EYES_LOOK_RANGE_RAD = (25 * Math.PI) / 180;
/** Past the eyes' range the head eases in over this much angle, so it never jumps, in rad. */
export const HEAD_LOOK_EASE_IN_RAD = (10 * Math.PI) / 180;
/** How lazily the head follows the ball, in s. */
export const HEAD_LOOK_SMOOTHING_S = 0.22;

/** Footwork while moving up to this ground speed; the running clips take over above. */
export const FOOTWORK_FULL_BELOW_MPS = 2.8;
export const FOOTWORK_NONE_ABOVE_MPS = 3.6;
