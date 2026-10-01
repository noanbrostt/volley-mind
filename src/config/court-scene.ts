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
