import {
  AIM_FORCE_SPAN,
  AIM_IDEAL_FORCE,
  AIM_MAX_LATERAL_M,
  TOUCH_FALLBACK_RISE_M,
  TOUCH_MAX_RISE_ERROR_M,
  TOUCH_MAX_SPEED_ERROR_RATIO,
  TOUCH_MAX_TARGET_ERROR_M,
} from '@config/touch';
import { nextFloat, type RngState } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { type AthleteState, rightOf } from '@domain/athlete/athlete-state';
import type { BallPhysics } from '@domain/ball/ball-physics';
import { solveLaunchByApex, solveLaunchBySpeed } from '@domain/ball/solve-launch';
import type { Action } from './action';
import type { Technique } from './technique';
import type { TouchAim } from './touch-aim';
import { type Trajectory, touchTargetFor } from './touch-target';

/** Keeps a scattered arc above its endpoints, so the launch always has a solution, in m. */
const MIN_ARC_RISE_M = 0.1;

export interface TouchContext {
  /** Ball center at the moment of contact, in m. */
  readonly contactPosition: Vec3;
  readonly toucher: AthleteState;
  readonly receiver: AthleteState;
  readonly action: Action;
  readonly technique: Technique;
  readonly aim: TouchAim;
  /** 0–1, from touchQuality. */
  readonly quality: number;
  readonly physics: BallPhysics;
  readonly stepSeconds: number;
  readonly rng: RngState;
}

export interface TouchResolution {
  /** Ball velocity right after the touch, in m/s. */
  readonly velocity: Vec3;
  readonly rng: RngState;
}

/**
 * Turns a touch into the ball's new velocity. Touches are rules, not collisions: start from
 * the ideal target, shift it by the aim, scatter it by (1 − quality) with the seeded RNG,
 * then solve the launch that gets the ball there.
 */
export function resolveTouch(context: TouchContext): TouchResolution {
  const ideal = touchTargetFor(context.action, context.technique, context.receiver);
  const forceScale = 1 + (context.aim.force - AIM_IDEAL_FORCE) * AIM_FORCE_SPAN;
  const aimedPoint = aimPoint(context, ideal.point, ideal.trajectory, forceScale);

  // Always draw the same numbers, so the RNG sequence never depends on the outcome.
  const miss = 1 - Math.min(1, Math.max(0, context.quality));
  const angle = nextFloat(context.rng);
  const radius = nextFloat(angle.next);
  const trajectoryNoise = nextFloat(radius.next);

  const errorRadius = miss * TOUCH_MAX_TARGET_ERROR_M * Math.sqrt(radius.value);
  const errorAngle = angle.value * 2 * Math.PI;
  const target = Vec3.add(
    aimedPoint,
    Vec3.create(Math.cos(errorAngle) * errorRadius, 0, Math.sin(errorAngle) * errorRadius),
  );
  const signedNoise = trajectoryNoise.value * 2 - 1;
  const trajectory = scatterTrajectory(ideal.trajectory, miss * signedNoise);
  const launch = launchToward(context, target, trajectory);

  // A driven ball keeps its launch direction and the force scales its speed: smooth as the
  // aim changes, where re-solving at a lower speed could flip to a lob (Noan saw jumps).
  return {
    velocity: trajectory.kind === 'drive' ? Vec3.scale(launch, forceScale) : launch,
    rng: trajectoryNoise.next,
  };
}

/**
 * Lateral drag moves the target sideways. Force moves an arc's target nearer or farther; a
 * driven ball keeps its target and changes speed instead (see resolveTouch).
 */
function aimPoint(
  context: TouchContext,
  idealPoint: Vec3,
  trajectory: Trajectory,
  forceScale: number,
): Vec3 {
  const sideways = Vec3.scale(
    rightOf(context.toucher.facing),
    context.aim.lateral * AIM_MAX_LATERAL_M,
  );
  const from = Vec3.create(context.contactPosition.x, idealPoint.y, context.contactPosition.z);
  const reach = Vec3.sub(idealPoint, from);
  const distanceScale = trajectory.kind === 'drive' ? 1 : forceScale;
  return Vec3.add(Vec3.add(from, Vec3.scale(reach, distanceScale)), sideways);
}

/** Quality noise changes arc heights and driven speeds. */
function scatterTrajectory(trajectory: Trajectory, noise: number): Trajectory {
  if (trajectory.kind === 'arc') {
    const rise = trajectory.rise + noise * TOUCH_MAX_RISE_ERROR_M;
    return { kind: 'arc', rise: Math.max(MIN_ARC_RISE_M, rise) };
  }
  return {
    kind: 'drive',
    speed: trajectory.speed * (1 + noise * TOUCH_MAX_SPEED_ERROR_RATIO),
  };
}

function launchToward(context: TouchContext, target: Vec3, trajectory: Trajectory): Vec3 {
  const { contactPosition, physics, stepSeconds } = context;
  if (trajectory.kind === 'drive') {
    const driven = solveLaunchBySpeed(
      contactPosition,
      target,
      trajectory.speed,
      physics,
      stepSeconds,
    );
    if (driven) {
      return driven;
    }
  }
  const rise = trajectory.kind === 'arc' ? trajectory.rise : TOUCH_FALLBACK_RISE_M;
  const apex = Math.max(contactPosition.y, target.y) + rise;
  // Null only if the solver cannot converge; the ball then just drops, a failed touch.
  return solveLaunchByApex(contactPosition, target, apex, physics, stepSeconds) ?? Vec3.ZERO;
}
