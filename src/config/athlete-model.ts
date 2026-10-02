// Athlete 3D models and their generic animations (Quaternius, CC0; see public/models).
// Speeds are initial tuning, to be calibrated by eye with Noan.

/** Model file per athlete, in world order: A is male, B is female (Noan's choice). */
export const ATHLETE_MODEL_FILES: readonly string[] = ['athlete-male.glb', 'athlete-female.glb'];
/** Generic clips (idle, walk, run...) shared by every model through retargeting. */
export const ATHLETE_ANIMATIONS_FILE = 'athlete-animations.glb';
/** Folder of the model files, relative to the app's base URL. */
export const ATHLETE_MODELS_FOLDER = 'models/';
/** Uniform material tinted with each athlete's color (named by scripts/dress-athlete.mjs). */
export const JERSEY_MATERIAL_NAME = 'Jersey';

/**
 * Locomotion clips, slowest first, with the ground speed each one shows when played at
 * normal speed, in m/s. The athlete plays the clip closest to their speed, sped up or
 * slowed down to match it, so the feet don't slide.
 */
export const LOCOMOTION_CLIPS: readonly LocomotionClip[] = [
  { name: 'Idle_Loop', speedMps: 0 },
  { name: 'Walk_Loop', speedMps: 1.4 },
  { name: 'Jog_Fwd_Loop', speedMps: 3.2 },
  { name: 'Sprint_Loop', speedMps: 5.5 },
];

export interface LocomotionClip {
  readonly name: string;
  readonly speedMps: number;
}

/** Below this ground speed the athlete counts as standing still, in m/s. */
export const LOCOMOTION_STANDING_SPEED_MPS = 0.15;
/** A moving clip plays between these multiples of its own speed, so it never looks absurd. */
export const LOCOMOTION_MIN_PLAYBACK_RATE = 0.6;
export const LOCOMOTION_MAX_PLAYBACK_RATE = 1.6;
/** Crossfade between clips, in s of game time: quick, but never a pop. */
export const ANIMATION_CROSSFADE_S = 0.15;

// Heading: athletes keep facing each other (a rule of the drill), but the body turns toward
// where it runs and squares up again for the touch. Visual only.
/** The body turns toward its running direction up to this angle from the facing, in rad. */
export const HEADING_MAX_TURN_RAD = (100 * Math.PI) / 180;
/** How quickly the body turns, in s of game time. */
export const HEADING_SMOOTHING_S = 0.12;
