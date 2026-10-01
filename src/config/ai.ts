// How imprecise the AI is. Errors shrink as the athlete's attributes grow and vanish at 100.
// All values are initial tuning.

/** Release timing error at reading 0, ± in s. Must stay inside TOUCH_TIMING_WINDOW_S. */
export const AI_MAX_TIMING_ERROR_S = 0.15;

/** Lateral aim error at action attribute 0, ± on the −1..1 aim scale. */
export const AI_MAX_LATERAL_AIM_ERROR = 0.4;

/** Force aim error at action attribute 0, ± on the 0..1 aim scale. */
export const AI_MAX_FORCE_AIM_ERROR = 0.25;
