import { DRILL_PARTNER_DISTANCE_M } from '@config/attack-defense-drill';
import { BALL_SPAWN_HEIGHT_M } from '@config/ball-launch';
import { Vec3 } from '@core/vec3';
import {
  type AthleteId,
  type AthleteState,
  createAthlete,
  facingToward,
} from '@domain/athlete/athlete-state';
import type { BallState } from '@domain/ball/ball-state';

export const ATHLETE_A_ID: AthleteId = 'a';
export const ATHLETE_B_ID: AthleteId = 'b';

/** Everything that exists in the game world, as plain serializable data. */
export interface WorldState {
  /** Number of fixed steps simulated so far: the simulation's own clock. */
  readonly tick: number;
  readonly ball: BallState;
  readonly athletes: readonly AthleteState[];
}

/** The attack-defense drill setup: A and B face each other across the drill distance. */
export function createWorld(): WorldState {
  const baseA = Vec3.create(0, 0, -DRILL_PARTNER_DISTANCE_M / 2);
  const baseB = Vec3.create(0, 0, DRILL_PARTNER_DISTANCE_M / 2);
  return {
    tick: 0,
    ball: { position: Vec3.create(0, BALL_SPAWN_HEIGHT_M, 0), velocity: Vec3.ZERO },
    athletes: [
      createAthlete({ id: ATHLETE_A_ID, basePosition: baseA, facing: facingToward(baseA, baseB) }),
      createAthlete({ id: ATHLETE_B_ID, basePosition: baseB, facing: facingToward(baseB, baseA) }),
    ],
  };
}

export function findAthlete(world: WorldState, id: AthleteId): AthleteState | undefined {
  return world.athletes.find((athlete) => athlete.id === id);
}
