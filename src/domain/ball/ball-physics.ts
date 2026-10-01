import { BALL_DRAG_COEFFICIENT, BALL_MASS_KG, BALL_RADIUS_M } from '@config/ball';
import {
  COURT_FLOOR_REST_SPEED_MPS,
  COURT_FLOOR_RESTITUTION,
  COURT_FLOOR_ROLLING_DECELERATION_MPS2,
  COURT_FLOOR_TANGENTIAL_RETENTION,
} from '@config/court-floor';
import { AIR_DENSITY_KG_PER_M3, GRAVITY_MPS2 } from '@config/physics';
import { Vec3 } from '@core/vec3';

/** Everything the ball simulation needs, already combined into the form the formulas use. */
export interface BallPhysics {
  /** In m/s². */
  readonly gravity: number;
  /** Drag acceleration per squared speed, in 1/m: |a_drag| = dragFactor · |v|². */
  readonly dragFactor: number;
  /** In m. */
  readonly radius: number;
  readonly restitution: number;
  readonly tangentialRetention: number;
  /** In m/s. */
  readonly restSpeed: number;
  /** In m/s². */
  readonly rollingDeceleration: number;
}

/** Quadratic drag folded into one factor: ½ · ρ · Cd · A / m. */
export function dragFactorOf(
  massKg: number,
  radiusM: number,
  dragCoefficient: number,
  airDensity: number,
): number {
  const crossSectionArea = Math.PI * radiusM * radiusM;
  return (0.5 * airDensity * dragCoefficient * crossSectionArea) / massKg;
}

export const DEFAULT_BALL_PHYSICS: BallPhysics = Object.freeze({
  gravity: GRAVITY_MPS2,
  dragFactor: dragFactorOf(
    BALL_MASS_KG,
    BALL_RADIUS_M,
    BALL_DRAG_COEFFICIENT,
    AIR_DENSITY_KG_PER_M3,
  ),
  radius: BALL_RADIUS_M,
  restitution: COURT_FLOOR_RESTITUTION,
  tangentialRetention: COURT_FLOOR_TANGENTIAL_RETENTION,
  restSpeed: COURT_FLOOR_REST_SPEED_MPS,
  rollingDeceleration: COURT_FLOOR_ROLLING_DECELERATION_MPS2,
});

/**
 * Acceleration of the ball in flight, as a sum of independent contributions.
 * Spin (Magnus effect) will enter as one more term here.
 */
export function ballAcceleration(velocity: Vec3, physics: BallPhysics): Vec3 {
  const gravity = Vec3.create(0, -physics.gravity, 0);
  const drag = Vec3.scale(velocity, -physics.dragFactor * Vec3.length(velocity));
  return Vec3.add(gravity, drag);
}
