import { MAX_SIMULATION_STEPS_PER_FRAME, SIMULATION_STEP_S } from '@config/simulation';
import { advanceClock, createFixedStepClock, type FixedStepClock } from '@core/fixed-step-clock';
import { stepWorld } from './step-world';
import type { WorldCommand } from './world-command';
import type { WorldEvent } from './world-event';
import type { WorldState } from './world-state';

const CLOCK_SETTINGS = Object.freeze({
  stepSeconds: SIMULATION_STEP_S,
  maxStepsPerFrame: MAX_SIMULATION_STEPS_PER_FRAME,
});

/**
 * Drives the world with real frame times. Keeps the last two world states so the renderer
 * can interpolate between them with `alpha`.
 */
export interface SimulationRunner {
  readonly clock: FixedStepClock;
  readonly previous: WorldState;
  readonly current: WorldState;
  /** Interpolation factor in [0, 1) from `previous` to `current`. */
  readonly alpha: number;
  /** Commands received in frames that ran no step yet; applied on the next step. */
  readonly pendingCommands: readonly WorldCommand[];
}

export interface RunnerAdvance {
  readonly runner: SimulationRunner;
  readonly events: readonly WorldEvent[];
}

export function createSimulationRunner(world: WorldState): SimulationRunner {
  return {
    clock: createFixedStepClock(),
    previous: world,
    current: world,
    alpha: 0,
    pendingCommands: [],
  };
}

export function advanceSimulation(
  runner: SimulationRunner,
  frameSeconds: number,
  commands: readonly WorldCommand[],
): RunnerAdvance {
  const advance = advanceClock(runner.clock, CLOCK_SETTINGS, frameSeconds);
  const pendingCommands =
    commands.length > 0 ? [...runner.pendingCommands, ...commands] : runner.pendingCommands;

  if (advance.steps === 0) {
    return {
      runner: { ...runner, clock: advance.clock, alpha: advance.alpha, pendingCommands },
      events: [],
    };
  }

  let previous = runner.current;
  let current = runner.current;
  const events: WorldEvent[] = [];
  for (let step = 0; step < advance.steps; step++) {
    // Commands land on the first step of the frame, so a tap acts as early as possible.
    const stepCommands = step === 0 ? pendingCommands : [];
    const result = stepWorld(current, stepCommands, SIMULATION_STEP_S);
    previous = current;
    current = result.world;
    events.push(...result.events);
  }

  return {
    runner: { clock: advance.clock, previous, current, alpha: advance.alpha, pendingCommands: [] },
    events,
  };
}
