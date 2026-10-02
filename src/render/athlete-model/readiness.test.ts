import {
  READY_BY_ACTION,
  READY_LEAD_S,
  READY_RAMP_S,
  RELAXED_READINESS,
} from '@config/athlete-gestures';
import { SIMULATION_STEP_S } from '@config/simulation';
import type { Action } from '@domain/contact/action';
import { ATHLETE_A_ID, ATHLETE_B_ID, createWorld, type WorldState } from '@simulation/world-state';
import { describe, expect, it } from 'vitest';
import { readinessAt } from './readiness';

const DT = SIMULATION_STEP_S;
const CONTACT_TICK = 300;

function rallyWith(athleteId: string, action: Action): WorldState {
  const world = createWorld({ seed: 1, aiAthleteIds: [] });
  return {
    ...world,
    drill: {
      phase: 'rally',
      incoming: {
        athleteId,
        action,
        plan: null,
        contactTick: CONTACT_TICK,
        arrivalLeadS: 0,
        release: null,
        holdStartTick: null,
        spent: false,
      },
    },
  };
}

describe('readinessAt', () => {
  it('is as ready as their own coming touch asks for', () => {
    expect(readinessAt(ATHLETE_A_ID, rallyWith(ATHLETE_A_ID, 'dig'), 0, DT)).toBe(1);
    expect(readinessAt(ATHLETE_A_ID, rallyWith(ATHLETE_A_ID, 'set'), 0, DT)).toBe(
      READY_BY_ACTION.set,
    );
  });

  it('relaxes while the partner plays, far from their touch', () => {
    const far = CONTACT_TICK - (READY_LEAD_S + READY_RAMP_S + 1) / DT;
    expect(readinessAt(ATHLETE_A_ID, rallyWith(ATHLETE_B_ID, 'attack'), far, DT)).toBe(
      RELAXED_READINESS,
    );
  });

  it('settles in for a dig before the partner attacks, less before attacking', () => {
    const set = CONTACT_TICK - READY_LEAD_S / DT;
    expect(readinessAt(ATHLETE_A_ID, rallyWith(ATHLETE_B_ID, 'attack'), set, DT)).toBeCloseTo(
      READY_BY_ACTION.dig,
    );
    expect(readinessAt(ATHLETE_A_ID, rallyWith(ATHLETE_B_ID, 'set'), set, DT)).toBeCloseTo(
      READY_BY_ACTION.attack,
    );
  });

  it('is not ready while the drill restarts', () => {
    const world = createWorld({ seed: 1, aiAthleteIds: [] });
    expect(readinessAt(ATHLETE_A_ID, world, 0, DT)).toBe(0);
  });
});
