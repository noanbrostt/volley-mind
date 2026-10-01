import { ATHLETE_STEP_REACH_M, DIVE_CONTACT_HEIGHT_M, DIVE_EXTENSION_M } from '@config/athlete';
import { TOUCH_POSITION_TOLERANCE_M } from '@config/touch';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import { timeToReach } from '@domain/athlete/move-athlete';
import type { BallPhysics } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { type BallCrossing, predictCrossing } from '@domain/ball/predict-crossing';
import type { Action } from './action';
import type { Technique } from './technique';

/** Why a ball is bad (Noan): low, far from the body, or out of time. A strong ball is not. */
export type BadBallReason = 'low' | 'far' | 'late';

/** What makes the touch actually being played harder than ideal. */
export type HardReason = 'far' | 'late';

export interface TouchPlan {
  readonly technique: Technique;
  /** Where and when the ball meets the athlete's contact point. */
  readonly contact: BallCrossing;
  /** Where the athlete must stand (feet) for the contact point to meet the ball, in m. */
  readonly standPosition: Vec3;
  /** Why the preferred technique was dropped (Noan's bad ball); empty for a good ball. */
  readonly badBallReasons: readonly BadBallReason[];
  /**
   * Whether the technique being played is itself out of comfortable reach. Only this
   * lowers quality: a ball aimed at bump height is a normal bump, not a hard one.
   */
  readonly hardReasons: readonly HardReason[];
}

interface Assessment {
  readonly contact: BallCrossing;
  readonly standPosition: Vec3;
  readonly reasons: readonly HardReason[];
}

/**
 * How the athlete will play the coming ball in the attack-defense drill (Noan's rules):
 * overhead first for digs and sets, bump when the ball is bad, and a dive for a dig beyond
 * one or two steps; spike for a good attack ball, roll shot to the partner when it is bad.
 * Null when the ball cannot be played at all.
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
    return {
      technique: preferred,
      contact: ideal.contact,
      standPosition: ideal.standPosition,
      badBallReasons: [],
      hardReasons: [],
    };
  }

  // The roll shot is taken from the spike position (Noan), so a far or late attack ball is
  // met right there. A ball that never rises to spike height is taken at overhead height
  // (assumption, to confirm with Noan). Digs and sets fall back to the bump.
  const played =
    action === 'attack'
      ? (ideal ?? check(fallback, heightOf('overhead')))
      : check(fallback, heightOf(fallback));
  const idealReasons: readonly BadBallReason[] = ideal ? ideal.reasons : ['low'];

  // Noan: the dive is for digs only, when not even a bump can be reached with the steps.
  if (action === 'dig' && (!played || isBeyondSteps(athlete, played.standPosition))) {
    const dive = assessDive(athlete, ball, physics, stepSeconds);
    if (dive) {
      return {
        technique: 'dive',
        contact: dive.contact,
        standPosition: dive.standPosition,
        badBallReasons: [...new Set<BadBallReason>([...idealReasons, 'far'])],
        hardReasons: dive.reasons,
      };
    }
  }
  if (!played) {
    return null;
  }
  return {
    technique: fallback,
    contact: played.contact,
    standPosition: played.standPosition,
    badBallReasons: idealReasons,
    hardReasons: played.reasons,
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

/** Whether standing there is out of reach even after one or two steps from the base. */
function isBeyondSteps(athlete: AthleteState, standPosition: Vec3): boolean {
  return (
    Vec3.distance(standPosition, athlete.basePosition) >
    ATHLETE_STEP_REACH_M + TOUCH_POSITION_TOLERANCE_M
  );
}

/**
 * A dive: the athlete runs to the edge of their steps and stretches out toward the ball,
 * meeting it low near the floor. Null when even a dive cannot get there.
 */
function assessDive(
  athlete: AthleteState,
  ball: BallState,
  physics: BallPhysics,
  stepSeconds: number,
): Assessment | null {
  const contact = predictCrossing(ball, physics, stepSeconds, DIVE_CONTACT_HEIGHT_M);
  if (!contact) {
    return null;
  }
  const toBall = Vec3.create(
    contact.point.x - athlete.basePosition.x,
    0,
    contact.point.z - athlete.basePosition.z,
  );
  const direction = Vec3.normalize(toBall);
  const standPosition = Vec3.sub(
    Vec3.create(contact.point.x, 0, contact.point.z),
    Vec3.scale(direction, DIVE_EXTENSION_M),
  );
  if (isBeyondSteps(athlete, standPosition)) {
    return null;
  }
  const travelSeconds = timeToReach(athlete, Vec3.distance(standPosition, athlete.position));
  const reasons: HardReason[] = travelSeconds > contact.secondsFromNow ? ['late'] : [];
  return { contact, standPosition, reasons };
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
  const reasons: HardReason[] = [];
  if (Vec3.distance(standPosition, athlete.basePosition) > ATHLETE_STEP_REACH_M) {
    reasons.push('far');
  }
  const travelSeconds = timeToReach(athlete, Vec3.distance(standPosition, athlete.position));
  if (travelSeconds > contact.secondsFromNow) {
    reasons.push('late');
  }
  return { contact, standPosition, reasons };
}
