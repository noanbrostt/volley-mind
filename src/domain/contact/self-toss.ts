import { SELF_TOSS_RISE_M } from '@config/attack-defense-drill';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import type { BallPhysics } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { solveLaunchByApex } from '@domain/ball/solve-launch';

/**
 * To restart the drill the athlete picks up the ball and tosses it up to themselves, so it
 * comes down onto their spike contact point. Returns the ball as it leaves the hands.
 */
export function selfToss(
  athlete: AthleteState,
  physics: BallPhysics,
  stepSeconds: number,
): BallState {
  const hands = contactPoint(athlete, 'bump');
  const strike = contactPoint(athlete, 'spike');
  const apex = strike.y + SELF_TOSS_RISE_M;
  const velocity = solveLaunchByApex(hands, strike, apex, physics, stepSeconds);
  // A toss this short always has a solution; straight up is a safe fallback all the same.
  const fallback = Vec3.create(0, Math.sqrt(2 * physics.gravity * (apex - hands.y)), 0);
  return { position: hands, velocity: velocity ?? fallback };
}
