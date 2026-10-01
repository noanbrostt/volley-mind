// Athlete body and movement. All values are initial tuning, to be calibrated with Noan.

/** Height of a default athlete, in m. */
export const ATHLETE_DEFAULT_HEIGHT_M = 1.85;

/** Starting value for every attribute of a default athlete, on the 0–100 scale. */
export const ATHLETE_DEFAULT_ATTRIBUTE = 60;

/** Movement speed of an athlete with speed attribute 0 and 100, in m/s. */
export const ATHLETE_MIN_SPEED_MPS = 2;
export const ATHLETE_MAX_SPEED_MPS = 4;

/** How far "one or two steps" reach from the base position, in m. */
export const ATHLETE_STEP_REACH_M = 1.2;

// Contact points per technique, relative to the athlete: heights as fractions of the
// athlete's height, offsets in m along the facing direction and toward the dominant arm.

/** Overhead (toque): hands in a cup, a little above the forehead. */
export const OVERHEAD_CONTACT_HEIGHT_RATIO = 1.03;
export const OVERHEAD_CONTACT_FORWARD_M = 0.2;

/** Bump (manchete): forearms together, between the waist and the hips. */
export const BUMP_CONTACT_HEIGHT_RATIO = 0.55;
export const BUMP_CONTACT_FORWARD_M = 0.45;

/** Spike (cortada): arm stretched up, slightly forward and to the dominant-arm side. */
export const SPIKE_CONTACT_HEIGHT_RATIO = 1.33;
export const SPIKE_CONTACT_FORWARD_M = 0.15;
export const SPIKE_CONTACT_DOMINANT_SIDE_M = 0.25;
