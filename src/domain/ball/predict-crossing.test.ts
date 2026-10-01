import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type BallPhysics, DEFAULT_BALL_PHYSICS } from './ball-physics';
import type { BallState } from './ball-state';
import { predictCrossing } from './predict-crossing';
import { stepBall } from './step-ball';

const DT = 1 / 60;
const physics = DEFAULT_BALL_PHYSICS;

describe('predictCrossing', () => {
  it('finds the descending crossing, matching a step-by-step run', () => {
    const ball: BallState = { position: Vec3.create(0, 1, -3), velocity: Vec3.create(0, 7, 4) };
    const crossing = predictCrossing(ball, physics, DT, 1.9);
    if (!crossing) {
      throw new Error('expected a crossing');
    }
    expect(crossing.point.y).toBeCloseTo(1.9, 9);
    expect(crossing.velocity.y).toBeLessThan(0);

    // Step the same way and check the ball is right around that point at that time.
    let current = ball;
    const whole = Math.floor(crossing.secondsFromNow / DT);
    for (let i = 0; i < whole; i++) {
      current = stepBall(current, physics, DT).ball;
    }
    const after = stepBall(current, physics, DT).ball;
    expect(current.position.y).toBeGreaterThan(1.9);
    expect(after.position.y).toBeLessThanOrEqual(1.9);
  });

  it('ignores the way up and reports the way down', () => {
    const ball: BallState = { position: Vec3.create(0, 1, 0), velocity: Vec3.create(0, 6, 0) };
    const crossing = predictCrossing(ball, physics, DT, 2);
    expect(crossing?.velocity.y).toBeLessThan(0);
  });

  it('matches the closed form without drag', () => {
    const noDrag: BallPhysics = { ...physics, dragFactor: 0 };
    const ball: BallState = { position: Vec3.create(0, 2, 0), velocity: Vec3.create(3, 5, 0) };
    const height = 1;
    const t = (5 + Math.sqrt(25 + 2 * noDrag.gravity * (2 - height))) / noDrag.gravity;
    const crossing = predictCrossing(ball, noDrag, DT, height);
    expect(crossing?.secondsFromNow).toBeCloseTo(t, 3);
    expect(crossing?.point.x).toBeCloseTo(3 * t, 2);
  });

  it('returns null when the ball never gets down to that height before the floor', () => {
    const rolling: BallState = {
      position: Vec3.create(0, physics.radius, 0),
      velocity: Vec3.create(1, 0, 0),
    };
    expect(predictCrossing(rolling, physics, DT, 1)).toBeNull();
  });

  it('returns null when the ball never rises to that height', () => {
    const low: BallState = { position: Vec3.create(0, 1, 0), velocity: Vec3.create(0, 2, 0) };
    expect(predictCrossing(low, physics, DT, 3)).toBeNull();
  });
});
