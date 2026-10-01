import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { ballAcceleration, DEFAULT_BALL_PHYSICS, dragFactorOf } from './ball-physics';

describe('ball physics', () => {
  it('folds quadratic drag into ½·ρ·Cd·A/m', () => {
    const factor = dragFactorOf(0.27, 0.105, 0.47, 1.225);
    expect(factor).toBeCloseTo((0.5 * 1.225 * 0.47 * Math.PI * 0.105 ** 2) / 0.27, 12);
  });

  it('accelerates a still ball by gravity alone', () => {
    expect(ballAcceleration(Vec3.ZERO, DEFAULT_BALL_PHYSICS)).toEqual(
      Vec3.create(0, -DEFAULT_BALL_PHYSICS.gravity, 0),
    );
  });

  it('applies drag against the motion, growing with the square of the speed', () => {
    const physics = { ...DEFAULT_BALL_PHYSICS, gravity: 0 };
    const slow = ballAcceleration(Vec3.create(5, 0, 0), physics);
    const fast = ballAcceleration(Vec3.create(10, 0, 0), physics);
    expect(slow.x).toBeLessThan(0);
    expect(fast.x / slow.x).toBeCloseTo(4);
  });

  it('balances drag and gravity at terminal speed', () => {
    const terminalSpeed = Math.sqrt(DEFAULT_BALL_PHYSICS.gravity / DEFAULT_BALL_PHYSICS.dragFactor);
    const falling = ballAcceleration(Vec3.create(0, -terminalSpeed, 0), DEFAULT_BALL_PHYSICS);
    expect(Vec3.length(falling)).toBeCloseTo(0, 9);
  });
});
