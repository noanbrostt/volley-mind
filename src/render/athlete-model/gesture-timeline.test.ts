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
  type TorsoPose,
  torsoAt,
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
  const moment: GestureMoment = { name: 'overhead', ball: BALL, contactTick: 100 };

  it('is full at contact and nothing well before or after', () => {
    expect(gestureStrength(moment, 100, DT)).toBe(1);
    expect(gestureStrength(moment, 100 - GESTURES.overhead.prepareS / DT - 1, DT)).toBe(0);
    expect(gestureStrength(moment, 100 + GESTURE_RECOVER_S / DT + 1, DT)).toBe(0);
  });

  it('is already full at the first preparation pose of a gesture that has them', () => {
    const spike: GestureMoment = { name: 'spike', ball: BALL, contactTick: 100 };
    const firstPoseS = GESTURES.spike.windup[0]?.atS ?? 0;
    expect(gestureStrength(spike, 100 - firstPoseS / DT, DT)).toBeCloseTo(1);
  });

  it('rises before contact', () => {
    const early = gestureStrength(moment, 80, DT);
    const late = gestureStrength(moment, 95, DT);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early);
  });
});

function expectOffset(actual: MutableFrameOffset, expected: MutableFrameOffset): void {
  expect(actual.forward).toBeCloseTo(expected.forward);
  expect(actual.outward).toBeCloseTo(expected.outward);
  expect(actual.up).toBeCloseTo(expected.up);
}

describe('handOffsetAt', () => {
  const spike = GESTURES.spike;
  const [, dropped, cocked] = spike.windup;
  const out = (): MutableFrameOffset => ({ forward: 0, outward: 0, up: 0 });

  it('passes through each preparation pose, then meets the ball at contact', () => {
    if (!dropped?.dominantHand || !cocked?.dominantHand || !spike.dominantHand) {
      throw new Error('the spike prepares in three poses');
    }
    const hand = out();
    expect(handOffsetAt(spike, true, dropped.atS, hand)).toBe(true);
    expectOffset(hand, dropped.dominantHand);
    handOffsetAt(spike, true, cocked.atS, hand);
    expectOffset(hand, cocked.dominantHand);
    handOffsetAt(spike, true, 0, hand);
    expectOffset(hand, spike.dominantHand);
  });

  it('whips into the ball: slow at first, fastest at contact', () => {
    if (!cocked?.dominantHand || !spike.dominantHand) {
      throw new Error('the spike is cocked before contact');
    }
    const hand = out();
    handOffsetAt(spike, true, cocked.atS / 2, hand);
    const swing = spike.dominantHand.up - cocked.dominantHand.up;
    const covered = (hand.up - cocked.dominantHand.up) / swing;
    expect(covered).toBeLessThan(0.25);
  });

  it('lets the other arm of the spike go for the swing', () => {
    expect(handOffsetAt(spike, false, cocked ? cocked.atS + 0.01 : 1, out())).toBe(true);
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
  it('follows the preparation poses and ends on the contact pole', () => {
    const spike = GESTURES.spike;
    const pole: MutableFrameOffset = { forward: 0, outward: 0, up: 0 };
    elbowPoleAt(spike, 5, pole);
    expect(pole).toEqual(spike.windup[0]?.elbowPole);
    elbowPoleAt(spike, 0, pole);
    expect(pole).toEqual(spike.elbowPole);
  });
});

describe('torsoAt', () => {
  it('turns back while cocked and uncoils through the ball', () => {
    const spike = GESTURES.spike;
    const cocked = spike.windup[2];
    const torso: TorsoPose = { leanRad: 0, twistRad: 0 };
    torsoAt(spike, cocked?.atS ?? 0, torso);
    expect(torso.twistRad).toBeCloseTo(cocked?.torsoTwistRad ?? 0);
    torsoAt(spike, -GESTURE_RECOVER_S, torso);
    expect(torso.twistRad).toBeCloseTo(spike.followThroughTwistRad);
  });
});
