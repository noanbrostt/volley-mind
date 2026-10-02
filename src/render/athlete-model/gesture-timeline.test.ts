import { FOLLOW_THROUGH_SHARE, GESTURE_RECOVER_S, GESTURES } from '@config/athlete-gestures';
import { SIMULATION_STEP_S } from '@config/simulation';
import { Vec3 } from '@core/vec3';
import type { IncomingTouch } from '@domain/contact/incoming-touch';
import { ATHLETE_A_ID, ATHLETE_B_ID, createWorld, type WorldState } from '@simulation/world-state';
import { describe, expect, it } from 'vitest';
import {
  elbowPoleAt,
  type GestureMoment,
  gestureStrength,
  handOffsetAt,
  type MutableFrameOffset,
  trackGesture,
} from './gesture-timeline';

const DT = SIMULATION_STEP_S;
const BALL = Vec3.create(0, 1.9, 2.8);

function worldWithIncoming(overrides: Partial<IncomingTouch> = {}): WorldState {
  const world = createWorld({ seed: 1, aiAthleteIds: [] });
  const incoming: IncomingTouch = {
    athleteId: ATHLETE_B_ID,
    action: 'set',
    plan: {
      technique: 'overhead',
      contact: { point: BALL, velocity: Vec3.ZERO, secondsFromNow: 1 },
      standPosition: Vec3.create(0, 0, 3),
      badBallReasons: [],
      hardReasons: [],
    },
    contactTick: 100,
    arrivalLeadS: 0.2,
    release: null,
    holdStartTick: null,
    spent: false,
    ...overrides,
  };
  return { ...world, drill: { phase: 'rally', incoming } };
}

function athlete(world: WorldState, index: number) {
  const found = world.athletes[index];
  if (!found) {
    throw new Error('missing athlete');
  }
  return found;
}

describe('trackGesture', () => {
  it('prepares the coming touch of the incoming athlete', () => {
    const world = worldWithIncoming();
    expect(trackGesture(null, athlete(world, 1), world, 90, DT)).toEqual({
      name: 'overhead',
      ball: BALL,
      contactTick: 100,
    });
    expect(trackGesture(null, athlete(world, 0), world, 90, DT)).toBeNull();
  });

  it('keeps the contact at now while the ball rests in the hands', () => {
    const world = worldWithIncoming({ holdStartTick: 101 });
    expect(trackGesture(null, athlete(world, 1), world, 110, DT)?.contactTick).toBe(110);
  });

  it('finishes the last gesture, then lets go', () => {
    const world = createWorld({ seed: 1, aiAthleteIds: [] });
    const last: GestureMoment = { name: 'bump', ball: BALL, contactTick: 100 };
    const during = 100 + GESTURE_RECOVER_S / DT / 2;
    const after = 100 + GESTURE_RECOVER_S / DT + 1;
    const b = athlete(world, 1);
    expect(trackGesture(last, b, world, during, DT)).toBe(last);
    expect(trackGesture(last, b, world, after, DT)).toBeNull();
  });

  it('tosses to restart the drill', () => {
    const world = createWorld({ seed: 1, aiAthleteIds: [] });
    const a = athlete(world, 0);
    const moment = trackGesture(null, a, world, 0, DT);
    expect(moment?.name).toBe('self-toss');
    expect(world.drill.phase === 'broken' && world.drill.restart.athleteId).toBe(ATHLETE_A_ID);
  });
});

describe('gestureStrength', () => {
  const moment: GestureMoment = { name: 'spike', ball: BALL, contactTick: 100 };

  it('is full at contact and nothing well before or after', () => {
    expect(gestureStrength(moment, 100, DT)).toBe(1);
    expect(gestureStrength(moment, 100 - GESTURES.spike.prepareS / DT - 1, DT)).toBe(0);
    expect(gestureStrength(moment, 100 + GESTURE_RECOVER_S / DT + 1, DT)).toBe(0);
  });

  it('rises before contact', () => {
    const early = gestureStrength(moment, 80, DT);
    const late = gestureStrength(moment, 95, DT);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early);
  });
});

describe('handOffsetAt', () => {
  const spike = GESTURES.spike;
  const windup = spike.windup;
  const out = (): MutableFrameOffset => ({ forward: 0, outward: 0, up: 0 });

  it('holds the preparation, then swings onto the ball at contact', () => {
    if (!windup?.dominantHand || !spike.dominantHand) {
      throw new Error('the spike has a windup');
    }
    const prepared = out();
    expect(handOffsetAt(spike, true, windup.swingS * 2, prepared)).toBe(true);
    expect(prepared).toEqual(windup.dominantHand);
    const atContact = out();
    handOffsetAt(spike, true, 0, atContact);
    expect(atContact).toEqual(spike.dominantHand);
  });

  it('lets the other arm of the spike go for the swing', () => {
    expect(handOffsetAt(spike, false, windup ? windup.swingS * 2 : 1, out())).toBe(true);
    expect(handOffsetAt(spike, false, 0.01, out())).toBe(false);
  });

  it('follows through after contact', () => {
    const overhead = GESTURES.overhead;
    const followed = out();
    handOffsetAt(overhead, true, -GESTURE_RECOVER_S * FOLLOW_THROUGH_SHARE, followed);
    expect(followed.up).toBeCloseTo((overhead.dominantHand?.up ?? 0) + overhead.followThrough.up);
  });
});

describe('elbowPoleAt', () => {
  it('uses the preparation pole before the swing and the contact pole at contact', () => {
    const spike = GESTURES.spike;
    const pole: MutableFrameOffset = { forward: 0, outward: 0, up: 0 };
    elbowPoleAt(spike, 1, pole);
    expect(pole).toEqual(spike.windup?.elbowPole);
    elbowPoleAt(spike, 0, pole);
    expect(pole).toEqual(spike.elbowPole);
  });
});
