import { ATHLETE_STEP_REACH_M } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import { maxSpeedOf } from '@domain/athlete/move-athlete';
import type { BallPhysics } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { type BallCrossing, predictCrossing } from '@domain/ball/predict-crossing';
import type { Action } from './action';
import type { Technique } from './technique';

/** Why a ball is bad (Noan): low, far from the body, or out of time. A strong ball is not. */
export type BadBallReason = 'low' | 'far' | 'late';

export interface TouchPlan {
  readonly technique: Technique;
  /** Where and when the ball meets the athlete's contact point. */
  readonly contact: BallCrossing;
  /** Where the athlete must stand (feet) for the contact point to meet the ball, in m. */
  readonly standPosition: Vec3;
  /** Empty for a good ball. */
  readonly badBallReasons: readonly BadBallReason[];
}

interface Assessment {
  readonly contact: BallCrossing;
  readonly standPosition: Vec3;
  readonly reasons: readonly BadBallReason[];
}

/**
 * How the athlete will play the coming ball in the attack-defense drill (Noan's rules):
 * overhead first for digs and sets, bump when the ball is bad; spike for a good attack ball,
 * roll shot to the partner when it is bad. Null when the ball cannot be played at all.
 */
export function planTouch(
  athlete: AthleteState,
  action: Action,
  ball: BallState,
  physics: BallPhysics,
  stepSeconds: number,
): TouchPlan | null {
  const preferred: Technique = action === 'attack' ? 'spike' : 'overhead';
  const fallback: Technique = action === 'attack' ? 'roll-shot' : 'bump';
  const heightOf = (technique: Technique): number => contactPoint(athlete, technique).y;
  const check = (technique: Technique, height: number): Assessment | null =>
    assess(athlete, technique, height, ball, physics, stepSeconds);

  const ideal = check(preferred, heightOf(preferred));
  if (ideal && ideal.reasons.length === 0) {
    return { technique: preferred, ...ideal, badBallReasons: [] };
  }

  // The roll shot is taken from the spike position (Noan), so a far or late attack ball is
  // met right there. A ball that never rises to spike height is taken at overhead height
  // (assumption, to confirm with Noan). Digs and sets fall back to the bump.
  const played =
    action === 'attack'
      ? (ideal ?? check(fallback, heightOf('overhead')))
      : check(fallback, heightOf(fallback));
  if (!played) {
    return null;
  }
  const idealReasons: readonly BadBallReason[] = ideal ? ideal.reasons : ['low'];
  return {
    technique: fallback,
    contact: played.contact,
    standPosition: played.standPosition,
    badBallReasons: [...new Set([...idealReasons, ...played.reasons])],
  };
}

/** Feet position that puts this technique's contact point right under/over the ball. */
export function standPositionFor(
  athlete: AthleteState,
  technique: Technique,
  ballPoint: Vec3,
): Vec3 {
  const offset = contactPoint({ ...athlete, position: Vec3.ZERO }, technique);
  return Vec3.create(ballPoint.x - offset.x, 0, ballPoint.z - offset.z);
}

function assess(
  athlete: AthleteState,
  technique: Technique,
  contactHeight: number,
  ball: BallState,
  physics: BallPhysics,
  stepSeconds: number,
): Assessment | null {
  const contact = predictCrossing(ball, physics, stepSeconds, contactHeight);
  if (!contact) {
    return null;
  }
  const standPosition = standPositionFor(athlete, technique, contact.point);
  const reasons: BadBallReason[] = [];
  if (Vec3.distance(standPosition, athlete.basePosition) > ATHLETE_STEP_REACH_M) {
    reasons.push('far');
  }
  const travelSeconds = Vec3.distance(standPosition, athlete.position) / maxSpeedOf(athlete);
  if (travelSeconds > contact.secondsFromNow) {
    reasons.push('late');
  }
  return { contact, standPosition, reasons };
}
