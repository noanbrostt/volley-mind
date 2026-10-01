import { ATHLETE_DEFAULT_ATTRIBUTE, ATHLETE_DEFAULT_HEIGHT_M } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import { type AthleteAttributes, uniformAttributes } from './attributes';

export type AthleteId = string;
export type DominantArm = 'right' | 'left';

/** After a dive the athlete lies on the floor for a while before moving again. */
export interface AthleteRecovery {
  /** Simulation tick at which the athlete can move again. */
  readonly untilTick: number;
  /** Unit vector of the dive, along the floor: which way the athlete lies. */
  readonly direction: Vec3;
}

/**
 * Athlete as plain, serializable data. World axes: y up; an athlete with facing 0 looks
 * toward +z and has +x on their right.
 */
export interface AthleteState {
  readonly id: AthleteId;
  /** Point between the feet, on the floor, in m. */
  readonly position: Vec3;
  /** Along the floor, in m/s: athletes speed up and brake instead of jumping to full speed. */
  readonly velocity: Vec3;
  /** Yaw around the up axis, in rad. 0 looks toward +z. */
  readonly facing: number;
  /** Where the athlete stands when nothing is happening, in m. */
  readonly basePosition: Vec3;
  readonly heightM: number;
  readonly dominantArm: DominantArm;
  readonly attributes: AthleteAttributes;
  /** Set while getting up after a dive; null otherwise. */
  readonly recovery: AthleteRecovery | null;
}

export interface NewAthlete {
  readonly id: AthleteId;
  readonly basePosition: Vec3;
  readonly facing: number;
}

/** An athlete with default body and attributes, standing on their base position. */
export function createAthlete({ id, basePosition, facing }: NewAthlete): AthleteState {
  return {
    id,
    position: basePosition,
    velocity: Vec3.ZERO,
    facing,
    basePosition,
    heightM: ATHLETE_DEFAULT_HEIGHT_M,
    dominantArm: 'right',
    attributes: uniformAttributes(ATHLETE_DEFAULT_ATTRIBUTE),
    recovery: null,
  };
}

/** Unit vector the athlete is looking along, on the floor plane. */
export function forwardOf(facing: number): Vec3 {
  return Vec3.create(Math.sin(facing), 0, Math.cos(facing));
}

/** Unit vector to the athlete's right, on the floor plane. */
export function rightOf(facing: number): Vec3 {
  return Vec3.create(Math.cos(facing), 0, -Math.sin(facing));
}

/** Yaw that makes an athlete at `from` look at `to`, ignoring height. */
export function facingToward(from: Vec3, to: Vec3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}
