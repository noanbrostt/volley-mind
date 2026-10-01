import { ATHLETE_STEP_REACH_M } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import type { AthleteId, AthleteState } from '@domain/athlete/athlete-state';
import type { Action } from '@domain/contact/action';
import type { IncomingTouch } from '@domain/contact/incoming-touch';

/**
 * The attack-defense drill (docs/design/attack-defense-drill.md): in a rally the touches
 * alternate between the two athletes; once the ball cannot be continued the loop is broken
 * and the athlete nearest the ball restarts it.
 */
export type AttackDefenseDrill =
  | { readonly phase: 'rally'; readonly incoming: IncomingTouch }
  | { readonly phase: 'broken'; readonly restart: DrillRestart };

export interface DrillRestart {
  readonly athleteId: AthleteId;
  /** Simulation tick at which the self-toss happens. */
  readonly tick: number;
}

/** Each athlete cycles attack → set → dig; across the pair, attack → dig → set. */
export function nextActionAfter(action: Action): Action {
  switch (action) {
    case 'attack':
      return 'dig';
    case 'dig':
      return 'set';
    case 'set':
      return 'attack';
  }
}

export function partnerOf(
  athletes: readonly AthleteState[],
  id: AthleteId,
): AthleteState | undefined {
  return athletes.find((athlete) => athlete.id !== id);
}

/**
 * In this drill an athlete only takes "one or two steps" from the base to reach a ball;
 * anything farther stays out of reach (a dive comes later).
 */
export function reachableSpot(athlete: AthleteState, spot: Vec3): Vec3 {
  const fromBase = Vec3.sub(Vec3.create(spot.x, 0, spot.z), athlete.basePosition);
  const distance = Vec3.length(fromBase);
  if (distance <= ATHLETE_STEP_REACH_M) {
    return Vec3.add(athlete.basePosition, fromBase);
  }
  return Vec3.add(athlete.basePosition, Vec3.scale(fromBase, ATHLETE_STEP_REACH_M / distance));
}

/** Who picks up the ball to restart: whoever is nearest to it on the floor. */
export function nearestAthleteTo(
  athletes: readonly AthleteState[],
  point: Vec3,
): AthleteState | undefined {
  const onFloor = Vec3.create(point.x, 0, point.z);
  let nearest: AthleteState | undefined;
  for (const athlete of athletes) {
    if (
      !nearest ||
      Vec3.distance(athlete.position, onFloor) < Vec3.distance(nearest.position, onFloor)
    ) {
      nearest = athlete;
    }
  }
  return nearest;
}
