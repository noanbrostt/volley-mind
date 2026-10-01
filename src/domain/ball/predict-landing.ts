import { LANDING_PREDICTION_HORIZON_S } from '@config/landing-prediction';
import type { Vec3 } from '@core/vec3';
import type { BallPhysics } from './ball-physics';
import { type BallState, isBallResting } from './ball-state';
import { stepBall } from './step-ball';

export interface LandingPrediction {
  /** Where the ball will first touch the floor (y = 0), in m. */
  readonly groundPoint: Vec3;
  /** In s, counted from the given state. */
  readonly secondsFromNow: number;
}

/**
 * Where and when the ball will first touch the floor. It replays the exact same fixed steps
 * the simulation will run, so the answer matches what will happen, down to the sub-step
 * moment of impact. Returns null for a resting ball or one that stays up past the horizon.
 */
export function predictLanding(
  ball: BallState,
  physics: BallPhysics,
  stepSeconds: number,
  horizonSeconds: number = LANDING_PREDICTION_HORIZON_S,
): LandingPrediction | null {
  if (isBallResting(ball, physics.radius)) {
    return null;
  }

  const maxSteps = Math.ceil(horizonSeconds / stepSeconds);
  let current = ball;
  for (let step = 0; step < maxSteps; step++) {
    const result = stepBall(current, physics, stepSeconds);
    if (result.bounce) {
      return {
        groundPoint: result.bounce.groundPoint,
        secondsFromNow: (step + result.bounce.stepFraction) * stepSeconds,
      };
    }
    current = result.ball;
  }
  return null;
}
