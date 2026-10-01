/** Duration of one fixed simulation step, in s (60 Hz). */
export const SIMULATION_STEP_S = 1 / 60;

/** Cap on simulation steps per rendered frame, so a pause or slow device cannot freeze the game. */
export const MAX_SIMULATION_STEPS_PER_FRAME = 5;
