import { BALL_PREDICTION_HORIZON_S } from '@config/ball-prediction';
import { Vec3 } from '@core/vec3';
import type { BallPhysics } from './ball-physics';
import type { BallState } from './ball-state';
import { stepBall } from './step-ball';

// Solver parameters (numerical method, not gameplay tuning).
/** Stop refining when the trajectory passes this close to the target, in m. */
const SOLVE_TOLERANCE_M = 0.002;
const MAX_APEX_ITERATIONS = 40;
const ANGLE_BISECTION_ITERATIONS = 48;
/** Elevation search range for speed launches: steeply down to a flat-ish lob, in rad. */
const MIN_ELEVATION_RAD = -1.2;
const MAX_ELEVATION_RAD = 0.7;

/**
 * Launch velocity that sends the ball from `start` up to `apexHeight` and down through
 * `target`, with air drag, on the simulation's own fixed steps. Null when the apex is not
 * above both points or the solver cannot converge.
 */
export function solveLaunchByApex(
  start: Vec3,
  target: Vec3,
  apexHeight: number,
  physics: BallPhysics,
  stepSeconds: number,
): Vec3 | null {
  if (apexHeight <= Math.max(start.y, target.y)) {
    return null;
  }
  const g = physics.gravity;
  const rise = apexHeight - start.y;
  const timeUp = Math.sqrt((2 * rise) / g);
  const timeDown = Math.sqrt((2 * (apexHeight - target.y)) / g);
  // Drag-free guess, then corrected with the real (dragged) flight.
  let vertical = g * timeUp;
  let horizontal = Vec3.scale(horizontalOf(Vec3.sub(target, start)), 1 / (timeUp + timeDown));

  for (let i = 0; i < MAX_APEX_ITERATIONS; i++) {
    const velocity = Vec3.add(horizontal, Vec3.create(0, vertical, 0));
    const flight = flyDownThrough(start, velocity, target.y, physics, stepSeconds);
    if (!flight) {
      return null;
    }
    const miss = horizontalOf(Vec3.sub(target, flight.crossing));
    const apexError = apexHeight - flight.apex;
    if (Vec3.length(miss) < SOLVE_TOLERANCE_M && Math.abs(apexError) < SOLVE_TOLERANCE_M) {
      return velocity;
    }
    horizontal = Vec3.add(horizontal, Vec3.scale(miss, 1 / flight.seconds));
    vertical *= Math.sqrt(rise / Math.max(flight.apex - start.y, SOLVE_TOLERANCE_M));
  }
  return null;
}

/**
 * Launch velocity of exactly `speed` that sends the ball from `start` through `target` on
 * the lower (more direct) of the two possible arcs. Null when the speed cannot reach it.
 */
export function solveLaunchBySpeed(
  start: Vec3,
  target: Vec3,
  speed: number,
  physics: BallPhysics,
  stepSeconds: number,
): Vec3 | null {
  const toTarget = horizontalOf(Vec3.sub(target, start));
  const distance = Vec3.length(toTarget);
  if (distance === 0) {
    return null;
  }
  const direction = Vec3.scale(toTarget, 1 / distance);
  const launch = (elevation: number): Vec3 =>
    Vec3.add(
      Vec3.scale(direction, speed * Math.cos(elevation)),
      Vec3.create(0, speed * Math.sin(elevation), 0),
    );
  const missAt = (elevation: number): number =>
    heightAtDistance(start, launch(elevation), direction, distance, physics, stepSeconds) -
    target.y;

  let low = MIN_ELEVATION_RAD;
  let high = MAX_ELEVATION_RAD;
  if (missAt(high) < 0 || missAt(low) > 0) {
    return null;
  }
  for (let i = 0; i < ANGLE_BISECTION_ITERATIONS; i++) {
    const middle = (low + high) / 2;
    if (missAt(middle) < 0) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return launch((low + high) / 2);
}

interface Flight {
  /** Ball center where it passes down through the target height, in m. */
  readonly crossing: Vec3;
  readonly seconds: number;
  /** Highest ball center height on the way, in m. */
  readonly apex: number;
}

function flyDownThrough(
  start: Vec3,
  velocity: Vec3,
  height: number,
  physics: BallPhysics,
  dt: number,
): Flight | null {
  let current: BallState = { position: start, velocity };
  let apex = start.y;
  const maxSteps = Math.ceil(BALL_PREDICTION_HORIZON_S / dt);
  for (let step = 0; step < maxSteps; step++) {
    const result = stepBall(current, physics, dt);
    if (result.bounce) {
      return null;
    }
    const next = result.ball;
    apex = Math.max(apex, next.position.y);
    if (next.velocity.y < 0 && current.position.y > height && next.position.y <= height) {
      const fraction = (current.position.y - height) / (current.position.y - next.position.y);
      return {
        crossing: Vec3.lerp(current.position, next.position, fraction),
        seconds: (step + fraction) * dt,
        apex,
      };
    }
    current = next;
  }
  return null;
}

/** Ball height once it has travelled `distance` along `direction`; -Infinity if it lands first. */
function heightAtDistance(
  start: Vec3,
  velocity: Vec3,
  direction: Vec3,
  distance: number,
  physics: BallPhysics,
  dt: number,
): number {
  let current: BallState = { position: start, velocity };
  const maxSteps = Math.ceil(BALL_PREDICTION_HORIZON_S / dt);
  for (let step = 0; step < maxSteps; step++) {
    const result = stepBall(current, physics, dt);
    if (result.bounce) {
      return Number.NEGATIVE_INFINITY;
    }
    const next = result.ball;
    const before = Vec3.dot(Vec3.sub(current.position, start), direction);
    const after = Vec3.dot(Vec3.sub(next.position, start), direction);
    if (after >= distance) {
      const fraction = (distance - before) / (after - before);
      return current.position.y + (next.position.y - current.position.y) * fraction;
    }
    current = next;
  }
  return Number.NEGATIVE_INFINITY;
}

function horizontalOf(v: Vec3): Vec3 {
  return Vec3.create(v.x, 0, v.z);
}
