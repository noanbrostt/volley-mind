import { ATHLETE_STEP_REACH_M, DIVE_REACH_RATIO } from '@config/athlete';
import { TOUCH_POSITION_TOLERANCE_M } from '@config/touch';

/** How far from the base an athlete can stand and still touch: one or two steps, then the arms, in m. */
export const TOUCH_REACH_M = ATHLETE_STEP_REACH_M + TOUCH_POSITION_TOLERANCE_M;

/**
 * How far past the feet a diving athlete stretches, in m: enough for a dive to reach
 * DIVE_REACH_RATIO times the normal touch reach from the base.
 */
export const DIVE_EXTENSION_M = TOUCH_REACH_M * (DIVE_REACH_RATIO - 1);
