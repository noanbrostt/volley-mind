// Athlete body and movement. All values are initial tuning, to be calibrated with Noan.

/** Height of a default athlete, in m. */
export const ATHLETE_DEFAULT_HEIGHT_M = 1.85;

/** Starting value for every attribute of a default athlete, on the 0–100 scale. */
export const ATHLETE_DEFAULT_ATTRIBUTE = 60;

/** Movement speed of an athlete with speed attribute 0 and 100, in m/s. */
export const ATHLETE_MIN_SPEED_MPS = 2;
export const ATHLETE_MAX_SPEED_MPS = 4;

/** How quickly an athlete speeds up and brakes, in m/s². Short volleyball steps start sharp. */
export const ATHLETE_ACCELERATION_MPS2 = 10;

/**
 * With time to spare (a high ball) the athlete paces themselves to be under the ball this
 * long before contact, drawn anew for every ball so the timing never looks robotic, in s.
 */
export const ATHLETE_ARRIVAL_LEAD_MIN_S = 0.1;
export const ATHLETE_ARRIVAL_LEAD_MAX_S = 0.5;

/** Walking back to base after a touch: an unhurried walk, whatever the athlete's speed, in m/s. */
export const ATHLETE_RETURN_WALK_SPEED_MPS = 1.2;

/** How far "one or two steps" reach from the base position, in m. */
export const ATHLETE_STEP_REACH_M = 1.5;

// Contact points per technique, relative to the athlete: heights as fractions of the
// athlete's height, offsets in m along the facing direction and toward the dominant arm.

/** Overhead (toque): hands in a cup, slightly above the head (Noan: not right on it). */
export const OVERHEAD_CONTACT_HEIGHT_RATIO = 1.08;
export const OVERHEAD_CONTACT_FORWARD_M = 0.2;

/** Bump (manchete): forearms together, between the waist and the hips. */
export const BUMP_CONTACT_HEIGHT_RATIO = 0.55;
export const BUMP_CONTACT_FORWARD_M = 0.45;

/** Spike (cortada): arm stretched up, slightly forward and to the dominant-arm side. */
export const SPIKE_CONTACT_HEIGHT_RATIO = 1.33;
export const SPIKE_CONTACT_FORWARD_M = 0.15;
export const SPIKE_CONTACT_DOMINANT_SIDE_M = 0.25;

// Dive (peixinho): any action, when the ball is beyond one or two steps. Initial tuning.

/** Height of the ball center when a diving athlete meets it, in m: low, near the floor. */
export const DIVE_CONTACT_HEIGHT_M = 0.4;

/**
 * A dive reaches this many times as far from the base as a normal touch does (Noan: half
 * again — defending up to about 2 m means diving up to about 3 m).
 */
export const DIVE_REACH_RATIO = 1.5;

/** Time on the floor after a dive before the athlete can move again, in s (Noan: about 1). */
export const DIVE_RECOVERY_S = 1;
