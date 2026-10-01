// Official volleyball: 260–280 g, 65–67 cm circumference. We use the middle of both ranges.

/** Ball mass, in kg. */
export const BALL_MASS_KG = 0.27;

/** Ball radius, in m (66 cm circumference). */
export const BALL_RADIUS_M = 0.66 / (2 * Math.PI);

/**
 * Aerodynamic drag coefficient (dimensionless). A smooth sphere sits near 0.47 at these
 * speeds; real volleyballs vary with speed and panel layout, so this is a tuning value.
 */
export const BALL_DRAG_COEFFICIENT = 0.47;
