import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type BallPhysics, DEFAULT_BALL_PHYSICS } from './ball-physics';
import { type BallState, isBallResting } from './ball-state';
import { type BallBounce, stepBall } from './step-ball';

const DT = 1 / 60;
const physics = DEFAULT_BALL_PHYSICS;
const noDrag: BallPhysics = { ...physics, dragFactor: 0 };

function ballAt(position: Vec3, velocity: Vec3): BallState {
  return { position, velocity };
}

describe('stepBall in flight', () => {
  it('follows the exact parabola when there is no drag', () => {
    const start = ballAt(Vec3.create(0, 2, 0), Vec3.create(3, 8, -1));
    let ball = start;
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      ball = stepBall(ball, noDrag, DT).ball;
    }
    const t = steps * DT;
    expect(ball.position.x).toBeCloseTo(3 * t, 10);
    expect(ball.position.y).toBeCloseTo(2 + 8 * t - 0.5 * noDrag.gravity * t * t, 10);
    expect(ball.position.z).toBeCloseTo(-t, 10);
    expect(ball.velocity.y).toBeCloseTo(8 - noDrag.gravity * t, 10);
  });

  it('loses horizontal speed to air drag', () => {
    const start = ballAt(Vec3.create(0, 3, 0), Vec3.create(20, 0, 0));
    const after = stepBall(start, physics, DT).ball;
    expect(after.velocity.x).toBeLessThan(20);
    expect(after.velocity.x).toBeGreaterThan(19);
  });

  it('does not mutate the input state', () => {
    const start = ballAt(Vec3.create(0, 3, 0), Vec3.create(1, 2, 3));
    const snapshot = JSON.stringify(start);
    stepBall(start, physics, DT);
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe('stepBall on the floor', () => {
  it('bounces with the speed kept by the floor, reporting where and when it hit', () => {
    const start = ballAt(Vec3.create(1, 2, -1), Vec3.create(4, 0, 0));
    let ball = start;
    let bounce: BallBounce | undefined;
    while (!bounce) {
      const result = stepBall(ball, noDrag, DT);
      bounce = result.bounce;
      ball = result.ball;
    }

    const impactSpeed = Math.sqrt(2 * noDrag.gravity * (2 - noDrag.radius));
    expect(bounce.impactVelocity.y).toBeCloseTo(-impactSpeed, 2);
    expect(bounce.groundPoint.y).toBe(0);
    expect(bounce.stepFraction).toBeGreaterThanOrEqual(0);
    expect(bounce.stepFraction).toBeLessThanOrEqual(1);
    // Right after the bounce the ball rises with the retained speed (minus the rest of the step).
    expect(ball.velocity.y).toBeGreaterThan(0);
    expect(ball.velocity.y).toBeLessThanOrEqual(impactSpeed * noDrag.restitution);
    expect(ball.velocity.x).toBeCloseTo(4 * noDrag.tangentialRetention, 10);
  });

  it('eventually settles and stops rolling, never sinking into the floor', () => {
    let ball = ballAt(Vec3.create(0, 3, 0), Vec3.create(6, 5, 2));
    for (let i = 0; i < 60 * 20; i++) {
      ball = stepBall(ball, physics, DT).ball;
      expect(ball.position.y).toBeGreaterThanOrEqual(physics.radius - 1e-12);
    }
    expect(isBallResting(ball, physics.radius)).toBe(true);
    expect(ball.velocity).toEqual(Vec3.ZERO);
  });

  it('rolls a resting ball with constant deceleration until it stops', () => {
    const rolling = ballAt(Vec3.create(0, physics.radius, 0), Vec3.create(1.5, 0, 0));
    const once = stepBall(rolling, physics, DT).ball;
    expect(once.velocity.x).toBeCloseTo(1.5 - physics.rollingDeceleration * DT, 10);

    // Run past the stop time, whatever the floor's deceleration is tuned to.
    const stepsUntilStopped = Math.ceil(1.5 / physics.rollingDeceleration / DT) + 10;
    let ball = rolling;
    for (let i = 0; i < stepsUntilStopped; i++) {
      ball = stepBall(ball, physics, DT).ball;
    }
    const stopDistance = 1.5 ** 2 / (2 * physics.rollingDeceleration);
    expect(ball.velocity).toEqual(Vec3.ZERO);
    expect(ball.position.x).toBeCloseTo(stopDistance, 10);
  });

  it('leaves a still ball on the floor untouched', () => {
    const still = ballAt(Vec3.create(2, physics.radius, 3), Vec3.ZERO);
    const result = stepBall(still, physics, DT);
    expect(result.ball).toEqual(still);
    expect(result.bounce).toBeUndefined();
  });

  it('bounces lower each time', () => {
    let ball = ballAt(Vec3.create(0, 4, 0), Vec3.ZERO);
    const impactSpeeds: number[] = [];
    for (let i = 0; i < 60 * 10; i++) {
      const result = stepBall(ball, physics, DT);
      if (result.bounce) {
        impactSpeeds.push(Math.abs(result.bounce.impactVelocity.y));
      }
      ball = result.ball;
    }
    expect(impactSpeeds.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < impactSpeeds.length; i++) {
      expect(impactSpeeds[i]).toBeLessThan(impactSpeeds[i - 1] ?? 0);
    }
  });
});
