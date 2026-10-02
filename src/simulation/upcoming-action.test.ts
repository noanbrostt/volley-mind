import type { Action } from '@domain/contact/action';
import { describe, expect, it } from 'vitest';
import { upcomingAction } from './upcoming-action';
import { ATHLETE_A_ID, ATHLETE_B_ID, createWorld, type WorldState } from './world-state';

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
        contactTick: 100,
        arrivalLeadS: 0,
        release: null,
        holdStartTick: null,
        spent: false,
      },
    },
  };
}

describe('upcomingAction', () => {
  it('is the coming touch for the athlete who plays it', () => {
    expect(upcomingAction(rallyWith(ATHLETE_A_ID, 'set'), ATHLETE_A_ID)).toBe('set');
  });

  it('follows the partner action for the other athlete', () => {
    expect(upcomingAction(rallyWith(ATHLETE_B_ID, 'attack'), ATHLETE_A_ID)).toBe('dig');
    expect(upcomingAction(rallyWith(ATHLETE_B_ID, 'dig'), ATHLETE_A_ID)).toBe('set');
    expect(upcomingAction(rallyWith(ATHLETE_B_ID, 'set'), ATHLETE_A_ID)).toBe('attack');
  });

  it('is nothing while the drill restarts', () => {
    expect(upcomingAction(createWorld({ seed: 1, aiAthleteIds: [] }), ATHLETE_A_ID)).toBeNull();
  });
});
