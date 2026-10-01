// Indoor court floor: hard and lively compared to sand. All values are tuning, to be
// calibrated by feel.

/** Fraction of vertical speed kept after a bounce (coefficient of restitution), 0–1. */
export const COURT_FLOOR_RESTITUTION = 0.7;

/** Fraction of horizontal speed kept after a bounce, 0–1. */
export const COURT_FLOOR_TANGENTIAL_RETENTION = 0.85;

/** Below this rebound speed the ball stops bouncing and settles on the floor, in m/s. */
export const COURT_FLOOR_REST_SPEED_MPS = 0.3;

/** Deceleration of a ball rolling on the court floor, in m/s². */
export const COURT_FLOOR_ROLLING_DECELERATION_MPS2 = 0.5;
