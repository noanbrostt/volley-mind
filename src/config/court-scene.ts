/** Side of the square floor area shown around the play area, in m. */
export const COURT_FLOOR_AREA_SIZE_M = 24;

export const COURT_FLOOR_COLOR_HEX = '#d9803f';
/** Gym background behind the court; also the PWA theme and splash color. */
export const GYM_BACKGROUND_COLOR_HEX = '#2c3440';
export const BALL_COLOR_HEX = '#f5d33b';

/** Sphere tessellation; low enough for weak phones, high enough to look round. */
export const BALL_MESH_SEGMENTS = 20;

/** Brightness of the gym ceiling light, 0–1+. */
export const CEILING_LIGHT_INTENSITY = 0.95;

// Over-the-shoulder camera behind the player's athlete, looking at the partner.
/** Distance behind the athlete, in m. */
export const CAMERA_BEHIND_M = 3.5;
/** Height above the floor, in m. */
export const CAMERA_HEIGHT_M = 2.4;
/** Offset to the athlete's right, so the view clears their head, in m. */
export const CAMERA_SHOULDER_OFFSET_M = 0.6;
/** Height on the partner the camera looks at, in m. */
export const CAMERA_LOOK_HEIGHT_M = 1.3;

/** One color per athlete, in world order (A, then B). */
export const ATHLETE_COLORS_HEX: readonly string[] = ['#3d7be0', '#e05a4f'];
/** Torso thickness, in m. */
export const ATHLETE_BODY_RADIUS_M = 0.22;
/** Head size, in m. */
export const ATHLETE_HEAD_RADIUS_M = 0.12;
/** Mesh detail for athletes; kept low for weak phones. */
export const ATHLETE_MESH_TESSELLATION = 12;

// Timing cue: a ring at the player's contact point that shrinks onto the ball at the ideal
// release moment (a visual aid, not a volleyball rule).
export const CONTACT_CUE_COLOR_HEX = '#ffffff';
/** The ring starts shrinking this long before the ideal moment, in s. */
export const CONTACT_CUE_SHRINK_S = 0.8;
/** Ring diameter at the start of the shrink, in m; it ends at the ball's diameter. */
export const CONTACT_CUE_START_DIAMETER_M = 1.2;
/** Ring tube thickness, in m. */
export const CONTACT_CUE_THICKNESS_M = 0.025;

// Aiming aid: the predicted arc of the ball while the player aims.
export const AIM_PATH_COLOR_HEX = '#ffe36e';
/** Points used to draw the arc (fixed, so the line updates in place). */
export const AIM_PATH_POINTS = 40;
/** Opacity of the stretch of the arc hidden behind someone (drawn faintly on top), 0–1. */
export const AIM_PATH_HIDDEN_ALPHA = 0.25;

// Aim target: a ring where the partner would meet the ball.
export const AIM_TARGET_DIAMETER_M = 0.45;
export const AIM_TARGET_THICKNESS_M = 0.03;
export const AIM_TARGET_REACHABLE_COLOR_HEX = '#7dff9b';
export const AIM_TARGET_UNREACHABLE_COLOR_HEX = '#ff6b5e';
