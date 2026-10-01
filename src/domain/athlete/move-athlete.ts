import { ATHLETE_MAX_SPEED_MPS, ATHLETE_MIN_SPEED_MPS } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from './athlete-state';
import { attributeFraction } from './attributes';

/** Top running speed for this athlete, from the speed attribute, in m/s. */
export function maxSpeedOf(athlete: AthleteState): number {
  const fraction = attributeFraction(athlete.attributes.speed);
  return ATHLETE_MIN_SPEED_MPS + (ATHLETE_MAX_SPEED_MPS - ATHLETE_MIN_SPEED_MPS) * fraction;
}

/**
 * Moves the athlete along the floor toward `target`, at most their top speed, and stops
 * exactly on it. Facing is left to the caller: in the drill athletes keep facing each other.
 */
export function moveAthleteToward(athlete: AthleteState, target: Vec3, dt: number): AthleteState {
  const goal = Vec3.create(target.x, 0, target.z);
  const toGoal = Vec3.sub(goal, athlete.position);
  const distance = Vec3.length(toGoal);
  const maxStep = maxSpeedOf(athlete) * dt;

  if (distance <= maxStep) {
    return distance === 0 ? athlete : { ...athlete, position: goal };
  }
  return {
    ...athlete,
    position: Vec3.add(athlete.position, Vec3.scale(toGoal, maxStep / distance)),
  };
}
