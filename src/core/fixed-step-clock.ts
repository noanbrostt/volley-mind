/**
 * Fixed-step accumulator: converts variable frame times into a whole number of fixed
 * simulation steps plus an interpolation factor for the renderer. Pure: the caller keeps
 * the returned clock and passes it back on the next frame.
 */
export interface FixedStepClockSettings {
  /** Duration of one simulation step, in seconds (1/60 for 60 Hz). */
  readonly stepSeconds: number;
  /** Cap on steps per frame, so a long pause or a slow device cannot freeze the game. */
  readonly maxStepsPerFrame: number;
}

export interface FixedStepClock {
  /** Elapsed time not yet consumed by a step, in seconds. Always in [0, stepSeconds). */
  readonly accumulatorSeconds: number;
}

export interface ClockAdvance {
  readonly clock: FixedStepClock;
  /** How many fixed steps the simulation must run this frame. */
  readonly steps: number;
  /** Interpolation factor in [0, 1) between the previous and the current simulation state. */
  readonly alpha: number;
  /** Time discarded because of the step cap, in seconds. Zero in normal frames. */
  readonly droppedSeconds: number;
}

// Frame times that are exact multiples of the step can land a hair below the boundary in
// floating point (0.05 / (1/60) = 2.9999...). This slack, far below one step, absorbs that.
const BOUNDARY_SLACK_SECONDS = 1e-9;

export function createFixedStepClock(): FixedStepClock {
  return { accumulatorSeconds: 0 };
}

export function advanceClock(
  clock: FixedStepClock,
  settings: FixedStepClockSettings,
  frameSeconds: number,
): ClockAdvance {
  const { stepSeconds, maxStepsPerFrame } = settings;
  // A hidden tab or a clock hiccup can report negative or non-finite deltas; treat them as no time.
  const safeFrame = Number.isFinite(frameSeconds) && frameSeconds > 0 ? frameSeconds : 0;
  const accumulated = clock.accumulatorSeconds + safeFrame;

  const dueSteps = Math.floor((accumulated + BOUNDARY_SLACK_SECONDS) / stepSeconds);
  const partialStep = Math.max(0, accumulated - dueSteps * stepSeconds);
  // When capped, the backlog of whole steps is dropped; the partial step is kept so motion stays smooth.
  const steps = Math.min(dueSteps, maxStepsPerFrame);

  return {
    clock: { accumulatorSeconds: partialStep },
    steps,
    alpha: partialStep / stepSeconds,
    droppedSeconds: (dueSteps - steps) * stepSeconds,
  };
}
