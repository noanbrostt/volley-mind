/** Side of the square sand area, in m. */
export const SAND_AREA_SIZE_M = 24;

export const SAND_COLOR_HEX = '#e6cf9c';
export const SKY_COLOR_HEX = '#8fc9ec';
export const BALL_COLOR_HEX = '#f5d33b';

/** Sphere tessellation; low enough for weak phones, high enough to look round. */
export const BALL_MESH_SEGMENTS = 20;

/** Brightness of the sky light, 0–1+. */
export const SKY_LIGHT_INTENSITY = 0.95;

/** Orbit camera, looking at the play area from the side and slightly above. */
export const CAMERA_ORBIT_ANGLE_RAD = -Math.PI / 2;
export const CAMERA_TILT_FROM_VERTICAL_RAD = 1.2;
export const CAMERA_DISTANCE_M = 10;
export const CAMERA_TARGET_HEIGHT_M = 1.8;
