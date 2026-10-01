// Sand swallows most of the ball's energy: low bounce, strong grip. All values are tuning.

/** Fraction of vertical speed kept after a bounce (coefficient of restitution), 0–1. */
export const SAND_RESTITUTION = 0.3;

/** Fraction of horizontal speed kept after a bounce, 0–1. */
export const SAND_TANGENTIAL_RETENTION = 0.6;

/** Below this rebound speed the ball stops bouncing and settles on the sand, in m/s. */
export const SAND_REST_SPEED_MPS = 0.3;

/** Deceleration of a ball rolling on sand, in m/s². */
export const SAND_ROLLING_DECELERATION_MPS2 = 3;
