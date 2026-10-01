import { Vec3 } from '@core/vec3';
import { type BallPhysics, ballAcceleration } from './ball-physics';
import { type BallState, groundPointUnder, isBallResting } from './ball-state';

export interface BallBounce {
  /** Where the ball touched the sand (y = 0), in m. */
  readonly groundPoint: Vec3;
  /** Velocity right before the impact, in m/s. */
  readonly impactVelocity: Vec3;
  /** When, inside this step, the impact happened: 0 = start, 1 = end. */
  readonly stepFraction: number;
}

export interface BallStep {
  readonly ball: BallState;
  readonly bounce?: BallBounce;
}

/** Advances the ball by one simulation step: flight, bounce on the sand or rolling. */
export function stepBall(ball: BallState, physics: BallPhysics, dt: number): BallStep {
  if (isBallResting(ball, physics.radius)) {
    return { ball: roll(ball, physics, dt) };
  }

  const flown = fly(ball, physics, dt);
  if (flown.position.y > physics.radius) {
    return { ball: flown };
  }

  // The ball crossed the ground inside this step: find the moment of contact, bounce there,
  // then spend the rest of the step after the bounce so no simulated time is lost.
  const stepFraction = contactFraction(ball.position.y, flown.position.y, physics.radius);
  const contactPosition = Vec3.lerp(ball.position, flown.position, stepFraction);
  const impactVelocity = Vec3.lerp(ball.velocity, flown.velocity, stepFraction);
  const rebound = bounce(
    {
      position: Vec3.create(contactPosition.x, physics.radius, contactPosition.z),
      velocity: impactVelocity,
    },
    physics,
  );
  const remaining = (1 - stepFraction) * dt;
  const after = isBallResting(rebound, physics.radius)
    ? roll(rebound, physics, remaining)
    : fly(rebound, physics, remaining);

  return {
    ball: after,
    bounce: { groundPoint: groundPointUnder(contactPosition), impactVelocity, stepFraction },
  };
}

/** Heun's method: second order, exact for gravity alone and accurate with drag at 60 Hz. */
function fly(ball: BallState, physics: BallPhysics, dt: number): BallState {
  const startAcceleration = ballAcceleration(ball.velocity, physics);
  const predictedVelocity = Vec3.add(ball.velocity, Vec3.scale(startAcceleration, dt));
  const endAcceleration = ballAcceleration(predictedVelocity, physics);
  const velocity = Vec3.add(
    ball.velocity,
    Vec3.scale(Vec3.add(startAcceleration, endAcceleration), dt / 2),
  );
  const position = Vec3.add(ball.position, Vec3.scale(Vec3.add(ball.velocity, velocity), dt / 2));
  return { position, velocity };
}

/** Fraction of the step at which the ball's bottom reached the sand. */
function contactFraction(startHeight: number, endHeight: number, radius: number): number {
  const drop = startHeight - endHeight;
  if (drop <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (startHeight - radius) / drop));
}

/** Sand absorbs most of the impact; a weak rebound settles the ball instead of bouncing. */
function bounce(contact: BallState, physics: BallPhysics): BallState {
  const reboundSpeed = Math.abs(contact.velocity.y) * physics.restitution;
  const verticalSpeed = reboundSpeed < physics.restSpeed ? 0 : reboundSpeed;
  const velocity = Vec3.create(
    contact.velocity.x * physics.tangentialRetention,
    verticalSpeed,
    contact.velocity.z * physics.tangentialRetention,
  );
  return { position: contact.position, velocity };
}

/** Rolling on sand: constant deceleration until the ball stops. */
function roll(ball: BallState, physics: BallPhysics, dt: number): BallState {
  const horizontal = Vec3.create(ball.velocity.x, 0, ball.velocity.z);
  const speed = Vec3.length(horizontal);
  const onSand = Vec3.create(ball.position.x, physics.radius, ball.position.z);
  if (speed === 0) {
    return { position: onSand, velocity: Vec3.ZERO };
  }

  const movingTime = Math.min(dt, speed / physics.rollingDeceleration);
  const endSpeed = speed - physics.rollingDeceleration * movingTime;
  const distance = ((speed + endSpeed) / 2) * movingTime;
  const direction = Vec3.scale(horizontal, 1 / speed);

  return {
    position: Vec3.add(onSand, Vec3.scale(direction, distance)),
    velocity: Vec3.scale(direction, endSpeed),
  };
}
