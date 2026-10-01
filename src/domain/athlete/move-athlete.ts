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

/**
 * Cruise speed that covers `distance` in exactly `seconds` (speeding up and braking at the
 * athlete's rate): how an athlete with time to spare paces themselves instead of sprinting.
 * Top speed when there is no time to spare.
 */
export function paceSpeed(athlete: AthleteState, distance: number, seconds: number): number {
  const top = maxSpeedOf(athlete);
  if (distance <= 0) {
    return 0;
  }
  const a = ATHLETE_ACCELERATION_MPS2;
  // Rest-to-rest trapezoid: distance = v·t − v²/a, solved for the slower cruise speed v.
  const discriminant = a * a * seconds * seconds - 4 * a * distance;
  if (seconds <= 0 || discriminant < 0) {
    return top;
  }
  return Math.min(top, (a * seconds - Math.sqrt(discriminant)) / 2);
}

/**
 * Moves the athlete along the floor toward `target`, speeding up and braking smoothly, never
 * past `speedLimit` (their top speed by default), and stops on it. Facing is left to the
 * caller: in the drill athletes keep facing each other.
 */
export function moveAthleteToward(
  athlete: AthleteState,
  target: Vec3,
  dt: number,
  speedLimit: number = maxSpeedOf(athlete),
): AthleteState {
  const goal = Vec3.create(target.x, 0, target.z);
  const toGoal = Vec3.sub(goal, athlete.position);
  const distance = Vec3.length(toGoal);
  if (distance === 0 && Vec3.lengthSquared(athlete.velocity) === 0) {
    return athlete;
  }

  // Fastest speed from which the athlete can still brake to a stop right on the goal.
  const brakingSpeed = Math.sqrt(2 * ATHLETE_ACCELERATION_MPS2 * distance);
  const desiredSpeed = Math.min(speedLimit, maxSpeedOf(athlete), brakingSpeed);
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
