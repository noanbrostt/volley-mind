import { BALL_PREDICTION_HORIZON_S } from '@config/ball-prediction';
import { Vec3 } from '@core/vec3';
import type { BallPhysics } from './ball-physics';
import type { BallState } from './ball-state';
import { stepBall } from './step-ball';

export interface BallCrossing {
  /** Ball center when it crosses the height, in m. */
  readonly point: Vec3;
  /** In m/s. */
  readonly velocity: Vec3;
  /** In s, counted from the given state. */
  readonly secondsFromNow: number;
}

/**
 * When and where the ball center first passes down through `height` — the moment an
 * athlete with a contact point at that height can meet it. Replays the same fixed steps the
 * simulation runs. Returns null if the ball reaches the floor first or stays up past the
 * horizon.
 */
export function predictCrossing(
  ball: BallState,
  physics: BallPhysics,
  stepSeconds: number,
  height: number,
  horizonSeconds: number = BALL_PREDICTION_HORIZON_S,
): BallCrossing | null {
  const maxSteps = Math.ceil(horizonSeconds / stepSeconds);
  let current = ball;
  for (let step = 0; step < maxSteps; step++) {
    const result = stepBall(current, physics, stepSeconds);
    if (result.bounce) {
      return null;
    }
    const next = result.ball;
    if (current.position.y > height && next.position.y <= height) {
      const fraction = (current.position.y - height) / (current.position.y - next.position.y);
      return {
        point: Vec3.lerp(current.position, next.position, fraction),
        velocity: Vec3.lerp(current.velocity, next.velocity, fraction),
        secondsFromNow: (step + fraction) * stepSeconds,
      };
    }
    current = next;
  }
  return null;
}
