import {
  ATHLETE_ACCELERATION_MPS2,
  ATHLETE_MAX_SPEED_MPS,
  ATHLETE_MIN_SPEED_MPS,
} from '@config/athlete';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from './athlete-state';
import { attributeFraction } from './attributes';

/** Top running speed for this athlete, from the speed attribute, in m/s. */
export function maxSpeedOf(athlete: AthleteState): number {
  const fraction = attributeFraction(athlete.attributes.speed);
  return ATHLETE_MIN_SPEED_MPS + (ATHLETE_MAX_SPEED_MPS - ATHLETE_MIN_SPEED_MPS) * fraction;
}

/**
 * Seconds to cover `distance` starting and ending at rest: speed up, cruise if there is
 * room, brake. Used to tell whether a ball can still be reached in time.
 */
export function timeToReach(athlete: AthleteState, distance: number): number {
  const top = maxSpeedOf(athlete);
  const accelerationDistance = (top * top) / ATHLETE_ACCELERATION_MPS2;
  if (distance <= accelerationDistance) {
    return 2 * Math.sqrt(distance / ATHLETE_ACCELERATION_MPS2);
  }
  return (2 * top) / ATHLETE_ACCELERATION_MPS2 + (distance - accelerationDistance) / top;
}

/** Where the athlete comes to rest if they start braking now. */
export function stoppingPoint(athlete: AthleteState): Vec3 {
  const speed = Vec3.length(athlete.velocity);
  return Vec3.add(
    athlete.position,
    Vec3.scale(athlete.velocity, speed / (2 * ATHLETE_ACCELERATION_MPS2)),
  );
}

/**
 * Moves the athlete along the floor toward `target`, speeding up and braking smoothly, never
 * past their top speed, and stops on it. To halt, aim at stoppingPoint(athlete).
 * Facing is left to the caller: in the drill athletes keep facing each other.
 */
export function moveAthleteToward(athlete: AthleteState, target: Vec3, dt: number): AthleteState {
  const goal = Vec3.create(target.x, 0, target.z);
  const toGoal = Vec3.sub(goal, athlete.position);
  const distance = Vec3.length(toGoal);
  if (distance === 0 && Vec3.lengthSquared(athlete.velocity) === 0) {
    return athlete;
  }

  // Fastest speed from which the athlete can still brake to a stop right on the goal.
  const brakingSpeed = Math.sqrt(2 * ATHLETE_ACCELERATION_MPS2 * distance);
  const desiredSpeed = Math.min(maxSpeedOf(athlete), brakingSpeed);
  const desired = distance > 0 ? Vec3.scale(toGoal, desiredSpeed / distance) : Vec3.ZERO;

  const change = Vec3.sub(desired, athlete.velocity);
  const maxChange = ATHLETE_ACCELERATION_MPS2 * dt;
  const changeLength = Vec3.length(change);
  const velocity =
    changeLength > maxChange
      ? Vec3.add(athlete.velocity, Vec3.scale(change, maxChange / changeLength))
      : desired;

  const step = Vec3.scale(velocity, dt);
  if (Vec3.length(step) >= distance && Vec3.dot(step, toGoal) >= 0) {
    // Arriving this step: settle exactly on the goal.
    return { ...athlete, position: goal, velocity: Vec3.ZERO };
  }
  return { ...athlete, position: Vec3.add(athlete.position, step), velocity };
}
