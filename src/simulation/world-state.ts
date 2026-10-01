import { DRILL_FIRST_TOSS_DELAY_S, DRILL_PARTNER_DISTANCE_M } from '@config/attack-defense-drill';
import { SIMULATION_STEP_S } from '@config/simulation';
import { createRng, type RngState } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import {
  type AthleteId,
  type AthleteState,
  createAthlete,
  facingToward,
} from '@domain/athlete/athlete-state';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import type { TouchAim } from '@domain/contact/touch-aim';
import type { AttackDefenseDrill } from '@domain/drills/attack-defense/drill-state';

export const ATHLETE_A_ID: AthleteId = 'a';
export const ATHLETE_B_ID: AthleteId = 'b';

/** A touch the AI has decided and will release at `tick`, like a player lifting a finger. */
export interface AiRelease {
  readonly athleteId: AthleteId;
  readonly tick: number;
  readonly aim: TouchAim;
}

/** Everything that exists in the game world, as plain serializable data. */
export interface WorldState {
  /** Number of fixed steps simulated so far: the simulation's own clock. */
  readonly tick: number;
  readonly ball: BallState;
  readonly athletes: readonly AthleteState[];
  readonly drill: AttackDefenseDrill;
  readonly rng: RngState;
  /** Athletes driven by the AI; everyone else waits for player commands. */
  readonly aiAthleteIds: readonly AthleteId[];
  readonly aiReleases: readonly AiRelease[];
}

export interface WorldSetup {
  readonly seed: number;
  readonly aiAthleteIds: readonly AthleteId[];
}

/**
 * The attack-defense drill setup: A and B face each other across the drill distance, the
 * ball rests at A's feet, and A opens with a self-toss shortly after the start.
 */
export function createWorld({ seed, aiAthleteIds }: WorldSetup): WorldState {
  const baseA = Vec3.create(0, 0, -DRILL_PARTNER_DISTANCE_M / 2);
  const baseB = Vec3.create(0, 0, DRILL_PARTNER_DISTANCE_M / 2);
  const athleteA = createAthlete({
    id: ATHLETE_A_ID,
    basePosition: baseA,
    facing: facingToward(baseA, baseB),
  });
  return {
    tick: 0,
    ball: {
      position: Vec3.create(baseA.x, DEFAULT_BALL_PHYSICS.radius, baseA.z),
      velocity: Vec3.ZERO,
    },
    athletes: [
      athleteA,
      createAthlete({ id: ATHLETE_B_ID, basePosition: baseB, facing: facingToward(baseB, baseA) }),
    ],
    drill: {
      phase: 'broken',
      restart: {
        athleteId: athleteA.id,
        tick: Math.round(DRILL_FIRST_TOSS_DELAY_S / SIMULATION_STEP_S),
      },
    },
    rng: createRng(seed),
    aiAthleteIds,
    aiReleases: [],
  };
}

export function findAthlete(world: WorldState, id: AthleteId): AthleteState | undefined {
  return world.athletes.find((athlete) => athlete.id === id);
}
