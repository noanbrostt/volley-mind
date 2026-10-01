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

/** Orbit camera, looking at the play area from the side and slightly above. */
export const CAMERA_ORBIT_ANGLE_RAD = -Math.PI / 2;
export const CAMERA_TILT_FROM_VERTICAL_RAD = 1.2;
export const CAMERA_DISTANCE_M = 10;
export const CAMERA_TARGET_HEIGHT_M = 1.8;
