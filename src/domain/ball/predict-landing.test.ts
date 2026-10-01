import { createRng, nextRange, type RngState } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type BallPhysics, DEFAULT_BALL_PHYSICS } from './ball-physics';
import type { BallState } from './ball-state';
import { predictLanding } from './predict-landing';
import { stepBall } from './step-ball';

const DT = 1 / 60;
const physics = DEFAULT_BALL_PHYSICS;

interface ObservedLanding {
  readonly groundPoint: Vec3;
  readonly seconds: number;
}

/** Runs the simulation step by step, as the game loop will, until the first bounce. */
function simulateUntilLanding(ball: BallState, params: BallPhysics, dt: number): ObservedLanding {
  let current = ball;
  for (let step = 0; step < 1_000_000; step++) {
    const result = stepBall(current, params, dt);
    if (result.bounce) {
      return {
        groundPoint: result.bounce.groundPoint,
        seconds: (step + result.bounce.stepFraction) * dt,
      };
    }
    current = result.ball;
  }
  throw new Error('ball never landed');
}

/** Varied launches: gentle sets, floating balls, hard downward attacks. */
function randomLaunches(seed: number, count: number): BallState[] {
  let rng: RngState = createRng(seed);
  const draw = (min: number, max: number): number => {
    const result = nextRange(rng, min, max);
    rng = result.next;
    return result.value;
  };
  return Array.from({ length: count }, () => ({
    position: Vec3.create(draw(-4, 4), draw(0.5, 3.5), draw(-4, 4)),
    velocity: Vec3.create(draw(-15, 15), draw(-12, 12), draw(-15, 15)),
  }));
}

describe('predictLanding', () => {
  const launches = randomLaunches(2024, 200);

  it('matches the step-by-step simulation of the same launch', () => {
    for (const ball of launches) {
      const predicted = predictLanding(ball, physics, DT);
      const observed = simulateUntilLanding(ball, physics, DT);

      expect(predicted).not.toBeNull();
      expect(predicted?.secondsFromNow).toBeCloseTo(observed.seconds, 9);
      expect(Vec3.distance(predicted?.groundPoint ?? Vec3.ZERO, observed.groundPoint)).toBeLessThan(
        1e-9,
      );
    }
  });

  it('stays within 1 cm and 1 ms of a 100× finer simulation', () => {
    for (const ball of launches) {
      const predicted = predictLanding(ball, physics, DT);
      const reference = simulateUntilLanding(ball, physics, DT / 100);

      expect(Math.abs((predicted?.secondsFromNow ?? 0) - reference.seconds)).toBeLessThan(1e-3);
      expect(
        Vec3.distance(predicted?.groundPoint ?? Vec3.ZERO, reference.groundPoint),
      ).toBeLessThan(0.01);
    }
  });

  it('agrees with the closed-form parabola when there is no drag', () => {
    const noDrag: BallPhysics = { ...physics, dragFactor: 0 };
    const ball: BallState = { position: Vec3.create(0, 2.5, 1), velocity: Vec3.create(6, 7, -2) };
    const fall = 2.5 - noDrag.radius;
    const t = (7 + Math.sqrt(7 * 7 + 2 * noDrag.gravity * fall)) / noDrag.gravity;

    const predicted = predictLanding(ball, noDrag, DT);

    expect(predicted?.secondsFromNow).toBeCloseTo(t, 3);
    expect(predicted?.groundPoint.x).toBeCloseTo(6 * t, 2);
    expect(predicted?.groundPoint.y).toBe(0);
    expect(predicted?.groundPoint.z).toBeCloseTo(1 - 2 * t, 2);
  });

  it('returns null for a ball resting on the floor', () => {
    const resting: BallState = {
      position: Vec3.create(0, physics.radius, 0),
      velocity: Vec3.create(1, 0, 0),
    };
    expect(predictLanding(resting, physics, DT)).toBeNull();
  });

  it('returns null when the ball stays up longer than the horizon', () => {
    const high: BallState = { position: Vec3.create(0, 3, 0), velocity: Vec3.create(0, 10, 0) };
    expect(predictLanding(high, physics, DT, 0.5)).toBeNull();
  });
});
