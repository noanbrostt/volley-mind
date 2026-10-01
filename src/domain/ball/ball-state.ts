import { Vec3 } from '@core/vec3';

/** Ball as plain, serializable data. The ground is the plane y = 0. */
export interface BallState {
  /** Center of the ball, in m. */
  readonly position: Vec3;
  /** In m/s. */
  readonly velocity: Vec3;
}

/** A resting ball sits on the floor with no vertical motion; it may still roll. */
export function isBallResting(ball: BallState, radius: number): boolean {
  return ball.position.y <= radius && ball.velocity.y === 0;
}

/** Point on the floor right under the ball. */
export function groundPointUnder(position: Vec3): Vec3 {
  return Vec3.create(position.x, 0, position.z);
}
