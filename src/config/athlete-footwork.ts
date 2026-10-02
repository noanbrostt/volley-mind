// Volleyball footwork, generated in code: each foot stays planted until the body moves away
// from it, then steps along the real direction of travel. So the steps come out lateral,
// frontal or anything in between, as each ball asks (Noan). Initial values, to calibrate.

/** Feet apart, from the body's center line to each ankle, in m: a wide, low base. */
export const STANCE_HALF_WIDTH_M = 0.22;
/**
 * One foot sits ahead of the other (Noan: "uma perna sempre fica mais pra frente"); the
 * dominant-side foot leads by this much, in m.
 */
export const STANCE_STAGGER_M = 0.16;

/** A planted foot steps once its home spot has moved this far away, in m. */
export const STEP_TRIGGER_M = 0.1;
/** How long a step takes in the air, in s of game time. */
export const STEP_DURATION_S = 0.17;
/** How high the foot lifts mid-step, in m. */
export const STEP_HEIGHT_M = 0.07;
/** A step lands where the home spot will be this long from now, so the feet lead the body, in s. */
export const STEP_LEAD_S = 0.1;

/** How far the knees point outward from straight ahead, as a share of the forward pull. */
export const KNEE_OUTWARD_SHARE = 0.25;
/** With footwork, the body turns only this share of the way toward where it moves. */
export const FOOTWORK_TURN_SHARE = 0.25;
/** How quickly the legs hand over between footwork and the running clips, in s. */
export const FOOTWORK_SMOOTHING_S = 0.15;

// Looking at the ball: the head and neck turn toward it, always (Noan).
/** The head turns at most this far from the chest's front, in rad. */
export const HEAD_LOOK_MAX_RAD = (75 * Math.PI) / 180;
/** Share of the turn done by the neck; the head does the rest. */
export const NECK_LOOK_SHARE = 0.4;
/** How quickly the gaze follows the ball, in s: smooth, even when the ball changes course. */
export const HEAD_LOOK_SMOOTHING_S = 0.08;

/** Footwork while moving up to this ground speed; the running clips take over above. */
export const FOOTWORK_FULL_BELOW_MPS = 2.8;
export const FOOTWORK_NONE_ABOVE_MPS = 3.6;
