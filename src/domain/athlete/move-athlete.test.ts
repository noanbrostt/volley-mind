import {
  ATHLETE_ACCELERATION_MPS2,
  ATHLETE_MAX_SPEED_MPS,
  ATHLETE_MIN_SPEED_MPS,
} from '@config/athlete';
import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type AthleteState, createAthlete } from './athlete-state';
import { uniformAttributes } from './attributes';
import { maxSpeedOf, moveAthleteToward, stoppingPoint, timeToReach } from './move-athlete';

const DT = 1 / 60;
const athlete = createAthlete({ id: 'a', basePosition: Vec3.create(0, 0, -3), facing: 0 });

function withSpeed(speed: number): AthleteState {
  return { ...athlete, attributes: { ...uniformAttributes(50), speed } };
}

/** Moves toward `target` until settled; returns every intermediate state. */
function walk(start: AthleteState, target: Vec3, maxSteps = 600): AthleteState[] {
  const states = [start];
  let current = start;
  for (let i = 0; i < maxSteps; i++) {
    current = moveAthleteToward(current, target, DT);
    states.push(current);
    if (
      Vec3.lengthSquared(current.velocity) === 0 &&
      Vec3.distance(current.position, target) === 0
    ) {
      break;
    }
  }
  return states;
}

describe('maxSpeedOf', () => {
  it('grows with the speed attribute between the configured limits', () => {
    expect(maxSpeedOf(withSpeed(0))).toBe(ATHLETE_MIN_SPEED_MPS);
    expect(maxSpeedOf(withSpeed(100))).toBe(ATHLETE_MAX_SPEED_MPS);
    expect(maxSpeedOf(withSpeed(80))).toBeGreaterThan(maxSpeedOf(withSpeed(20)));
  });
});

describe('moveAthleteToward', () => {
  const target = Vec3.create(3, 0, -3);

  it('starts gently instead of jumping to full speed', () => {
    const first = moveAthleteToward(athlete, target, DT);
    expect(Vec3.length(first.velocity)).toBeCloseTo(ATHLETE_ACCELERATION_MPS2 * DT, 12);
  });

  it('never exceeds the top speed nor the acceleration', () => {
    const states = walk(athlete, target);
    for (let i = 1; i < states.length; i++) {
      const before = states[i - 1];
      const after = states[i];
      if (!before || !after) {
        continue;
      }
      expect(Vec3.length(after.velocity)).toBeLessThanOrEqual(maxSpeedOf(athlete) + 1e-9);
      const change = Vec3.length(Vec3.sub(after.velocity, before.velocity));
      // The last step settles on the goal, dropping the little speed left.
      if (Vec3.lengthSquared(after.velocity) > 0) {
        expect(change).toBeLessThanOrEqual(ATHLETE_ACCELERATION_MPS2 * DT + 1e-9);
      }
    }
  });

  it('brakes into the target, stops on it without overshooting, and stays', () => {
    const states = walk(athlete, target);
    const last = states[states.length - 1];
    expect(last?.position).toEqual(target);
    expect(last?.velocity).toEqual(Vec3.ZERO);
    for (const state of states) {
      expect(state.position.x).toBeLessThanOrEqual(target.x + 1e-9);
    }
    if (last) {
      expect(moveAthleteToward(last, target, DT)).toBe(last);
    }
  });

  it('takes about as long as timeToReach predicts', () => {
    for (const distance of [0.4, 1, 3]) {
      const states = walk(athlete, Vec3.add(athlete.position, Vec3.create(distance, 0, 0)));
      const seconds = (states.length - 1) * DT;
      expect(Math.abs(seconds - timeToReach(athlete, distance))).toBeLessThan(0.1);
    }
  });

  it('walks on the floor even when the target is in the air', () => {
    const moved = moveAthleteToward(athlete, Vec3.create(0, 2.5, -2.9), DT);
    expect(moved.position.y).toBe(0);
  });

  it('keeps the facing untouched', () => {
    expect(moveAthleteToward(athlete, target, DT).facing).toBe(athlete.facing);
  });
});

describe('stoppingPoint', () => {
  it('lets a moving athlete brake to a halt ahead, without turning back', () => {
    const running: AthleteState = { ...athlete, velocity: Vec3.create(3, 0, 0) };
    const stop = stoppingPoint(running);
    expect(stop.x).toBeCloseTo(3 ** 2 / (2 * ATHLETE_ACCELERATION_MPS2), 12);
    const states = walk(running, stop);
    for (const state of states) {
      expect(state.velocity.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('is the athlete’s own position when standing still', () => {
    expect(stoppingPoint(athlete)).toEqual(athlete.position);
  });
});

describe('timeToReach', () => {
  it('grows with distance and shrinks with speed', () => {
    expect(timeToReach(athlete, 2)).toBeGreaterThan(timeToReach(athlete, 1));
    expect(timeToReach(withSpeed(100), 3)).toBeLessThan(timeToReach(withSpeed(0), 3));
    expect(timeToReach(athlete, 0)).toBe(0);
  });
});
