import { MAX_SIMULATION_STEPS_PER_FRAME, SIMULATION_STEP_S } from '@config/simulation';
import { IDEAL_AIM } from '@domain/contact/touch-aim';
import { describe, expect, it } from 'vitest';
import { advanceSimulation, createSimulationRunner } from './simulation-runner';
import { stepWorld } from './step-world';
import type { WorldCommand } from './world-command';
import { ATHLETE_A_ID, ATHLETE_B_ID, createWorld as createDrillWorld } from './world-state';

const STEP = SIMULATION_STEP_S;
const TOUCH: WorldCommand = { type: 'touch', athleteId: ATHLETE_A_ID, aim: IDEAL_AIM };

function createWorld() {
  return createDrillWorld({ seed: 1, aiAthleteIds: [ATHLETE_A_ID, ATHLETE_B_ID] });
}

describe('simulation runner', () => {
  it('starts with both states equal to the initial world', () => {
    const world = createWorld();
    const runner = createSimulationRunner(world);
    expect(runner.previous).toBe(world);
    expect(runner.current).toBe(world);
  });

  it('runs as many fixed steps as the frame time allows', () => {
    const { runner } = advanceSimulation(createSimulationRunner(createWorld()), STEP * 3, []);
    expect(runner.current.tick).toBe(3);
    expect(runner.previous.tick).toBe(2);
  });

  it('keeps the last two states for interpolation and exposes alpha', () => {
    const first = advanceSimulation(createSimulationRunner(createWorld()), STEP * 1.25, []);
    expect(first.runner.current.tick).toBe(1);
    expect(first.runner.alpha).toBeCloseTo(0.25);

    const second = advanceSimulation(first.runner, STEP * 0.5, []);
    expect(second.runner.current).toBe(first.runner.current);
    expect(second.runner.alpha).toBeCloseTo(0.75);
  });

  it('caps the steps of a huge frame', () => {
    const { runner } = advanceSimulation(createSimulationRunner(createWorld()), 30, []);
    expect(runner.current.tick).toBe(MAX_SIMULATION_STEPS_PER_FRAME);
  });

  it('keeps commands from frames without a step and applies them on the next step', () => {
    const quiet = advanceSimulation(createSimulationRunner(createWorld()), STEP * 0.3, [TOUCH]);
    expect(quiet.runner.current.tick).toBe(0);
    expect(quiet.runner.pendingCommands).toEqual([TOUCH]);

    const next = advanceSimulation(quiet.runner, STEP * 0.8, []);
    expect(next.runner.current.tick).toBe(1);
    expect(next.runner.pendingCommands).toEqual([]);
    expect(next.runner.current).toEqual(stepWorld(createWorld(), [TOUCH], STEP).world);
  });

  it('applies commands once, on the first step of the frame', () => {
    const { runner } = advanceSimulation(createSimulationRunner(createWorld()), STEP * 2, [TOUCH]);
    const firstStep = stepWorld(createWorld(), [TOUCH], STEP).world;
    const secondStep = stepWorld(firstStep, [], STEP).world;
    expect(runner.current).toEqual(secondStep);
  });

  it('collects the events of every step in the frame', () => {
    let runner = createSimulationRunner(createWorld());
    let events = 0;
    for (let frame = 0; frame < 120; frame++) {
      const result = advanceSimulation(runner, STEP * 2, []);
      events += result.events.length;
      runner = result.runner;
    }
    expect(events).toBeGreaterThan(0);
  });
});
