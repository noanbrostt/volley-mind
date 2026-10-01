import { BALL_SPAWN_HEIGHT_M } from '@config/ball-launch';
import { Vec3 } from '@core/vec3';
import type { BallState } from '@domain/ball/ball-state';

/** Everything that exists in the game world, as plain serializable data. */
export interface WorldState {
  /** Number of fixed steps simulated so far: the simulation's own clock. */
  readonly tick: number;
  readonly ball: BallState;
}

export function createWorld(): WorldState {
  return {
    tick: 0,
    ball: { position: Vec3.create(0, BALL_SPAWN_HEIGHT_M, 0), velocity: Vec3.ZERO },
  };
}
