import { ATHLETE_STEP_REACH_M, DIVE_CONTACT_HEIGHT_M } from '@config/athlete';
import { TOUCH_POSITION_TOLERANCE_M } from '@config/touch';
import { Vec3 } from '@core/vec3';
import { type AthleteState, createAthlete } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { solveLaunchByApex, solveLaunchBySpeed } from '@domain/ball/solve-launch';
import { describe, expect, it } from 'vitest';
import { planTouch, standPositionFor } from './plan-touch';

const DT = 1 / 60;
const physics = DEFAULT_BALL_PHYSICS;
const athlete = createAthlete({ id: 'a', basePosition: Vec3.create(0, 0, -3), facing: 0 });
const FROM_PARTNER = Vec3.create(0, 1.9, 3);

/** A ball leaving the partner that comes down through `target` after rising to `apex`. */
function ballTo(target: Vec3, apex: number, from: Vec3 = FROM_PARTNER): BallState {
  const velocity = solveLaunchByApex(from, target, apex, physics, DT);
  if (!velocity) {
    throw new Error('test ball has no launch');
  }
  return { position: from, velocity };
}

describe('planTouch for digs and sets', () => {
  it('plays a good ball overhead, right at the base', () => {
    const plan = planTouch(
      athlete,
      'set',
      ballTo(contactPoint(athlete, 'overhead'), 4),
      physics,
      DT,
    );
    expect(plan?.technique).toBe('overhead');
    expect(plan?.badBallReasons).toEqual([]);
    expect(Vec3.distance(plan?.standPosition ?? Vec3.ZERO, athlete.basePosition)).toBeLessThan(
      0.02,
    );
  });

  it('bumps a low ball that never rises to overhead height', () => {
    const lowBall = ballTo(contactPoint(athlete, 'bump'), 1.6, Vec3.create(0, 1.2, 3));
    const plan = planTouch(athlete, 'dig', lowBall, physics, DT);
    expect(plan?.technique).toBe('bump');
    expect(plan?.badBallReasons).toContain('low');
  });

  it('digs a well-aimed attack with a bump, without counting it as hard', () => {
    const attack = solveLaunchBySpeed(
      Vec3.create(0.25, 2.46, 2.85),
      contactPoint(athlete, 'bump'),
      12,
      physics,
      DT,
    );
    if (!attack) {
      throw new Error('test attack has no launch');
    }
    const plan = planTouch(
      athlete,
      'dig',
      { position: Vec3.create(0.25, 2.46, 2.85), velocity: attack },
      physics,
      DT,
    );
    expect(plan?.technique).toBe('bump');
    expect(plan?.badBallReasons.length).toBeGreaterThan(0);
    expect(plan?.hardReasons).toEqual([]);
  });

  it('bumps a set that lands far from the body (sets never dive)', () => {
    const wide = Vec3.add(contactPoint(athlete, 'overhead'), Vec3.create(2.2, 0, 0));
    const plan = planTouch(athlete, 'set', ballTo(wide, 4), physics, DT);
    expect(plan?.technique).toBe('bump');
    expect(plan?.badBallReasons).toContain('far');
  });

  it('bumps a ball the athlete cannot reach in time', () => {
    const outOfPlace: AthleteState = { ...athlete, position: Vec3.create(1.5, 0, -3) };
    const overhead = contactPoint(athlete, 'overhead');
    const dropping: BallState = {
      position: Vec3.add(overhead, Vec3.create(0, 0.4, 0)),
      velocity: Vec3.create(0, -2, 0),
    };
    const plan = planTouch(outOfPlace, 'set', dropping, physics, DT);
    expect(plan?.technique).toBe('bump');
    expect(plan?.badBallReasons).toContain('late');
  });

  it('gives up on a ball already on the floor', () => {
    const rolling: BallState = {
      position: Vec3.create(0, physics.radius, -2),
      velocity: Vec3.create(0, 0, -1),
    };
    expect(planTouch(athlete, 'dig', rolling, physics, DT)).toBeNull();
  });
});

describe('planTouch: the dive (digs only)', () => {
  const farDig = (): BallState => {
    const wide = Vec3.add(athlete.basePosition, Vec3.create(2.8, DIVE_CONTACT_HEIGHT_M, 0.3));
    return ballTo(wide, 3.5);
  };

  it('dives for a dig beyond one or two steps, low near the floor', () => {
    const plan = planTouch(athlete, 'dig', farDig(), physics, DT);
    expect(plan?.technique).toBe('dive');
    expect(plan?.contact.point.y).toBeCloseTo(DIVE_CONTACT_HEIGHT_M, 6);
    expect(plan?.badBallReasons).toContain('far');
    // The feet stay within the steps; the stretch does the rest.
    const feetFromBase = Vec3.distance(plan?.standPosition ?? Vec3.ZERO, athlete.basePosition);
    expect(feetFromBase).toBeLessThanOrEqual(ATHLETE_STEP_REACH_M + TOUCH_POSITION_TOLERANCE_M);
  });

  it('never dives for a set', () => {
    expect(planTouch(athlete, 'set', farDig(), physics, DT)?.technique).not.toBe('dive');
  });

  it('cannot dive farther than steps plus the stretch', () => {
    const tooFar = Vec3.add(athlete.basePosition, Vec3.create(5, DIVE_CONTACT_HEIGHT_M, 0));
    expect(planTouch(athlete, 'dig', ballTo(tooFar, 3.5), physics, DT)?.technique).not.toBe('dive');
  });
});

describe('planTouch for attacks', () => {
  it('spikes a good set', () => {
    const plan = planTouch(
      athlete,
      'attack',
      ballTo(contactPoint(athlete, 'spike'), 4.1),
      physics,
      DT,
    );
    expect(plan?.technique).toBe('spike');
    expect(plan?.badBallReasons).toEqual([]);
  });

  it('plays a far set as a roll shot from the spike position', () => {
    const wide = Vec3.add(contactPoint(athlete, 'spike'), Vec3.create(2.2, 0, 0));
    const plan = planTouch(athlete, 'attack', ballTo(wide, 4.1), physics, DT);
    expect(plan?.technique).toBe('roll-shot');
    expect(plan?.badBallReasons).toContain('far');
    expect(plan?.contact.point.y).toBeCloseTo(contactPoint(athlete, 'spike').y, 6);
  });

  it('plays a set that never reaches spike height as a roll shot at overhead height', () => {
    const lowSet = ballTo(contactPoint(athlete, 'overhead'), 2.3, Vec3.create(0, 1.5, 3));
    const plan = planTouch(athlete, 'attack', lowSet, physics, DT);
    expect(plan?.technique).toBe('roll-shot');
    expect(plan?.badBallReasons).toContain('low');
    expect(plan?.contact.point.y).toBeCloseTo(contactPoint(athlete, 'overhead').y, 6);
  });
});

describe('standPositionFor', () => {
  it('puts the technique’s contact point right on the ball', () => {
    const ballPoint = Vec3.create(0.7, 2, -2.1);
    for (const technique of ['overhead', 'bump', 'spike'] as const) {
      const stand = standPositionFor(athlete, technique, ballPoint);
      const contact = contactPoint({ ...athlete, position: stand }, technique);
      expect(contact.x).toBeCloseTo(ballPoint.x, 12);
      expect(contact.z).toBeCloseTo(ballPoint.z, 12);
      expect(stand.y).toBe(0);
    }
  });
});
