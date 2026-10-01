import { ATHLETE_MAX_SPEED_MPS, ATHLETE_MIN_SPEED_MPS } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type AthleteState, createAthlete } from './athlete-state';
import { uniformAttributes } from './attributes';
import { maxSpeedOf, moveAthleteToward } from './move-athlete';

const DT = 1 / 60;
const athlete = createAthlete({ id: 'a', basePosition: Vec3.create(0, 0, -3), facing: 0 });

function withSpeed(speed: number): AthleteState {
  return { ...athlete, attributes: { ...uniformAttributes(50), speed } };
}

describe('maxSpeedOf', () => {
  it('grows with the speed attribute between the configured limits', () => {
    expect(maxSpeedOf(withSpeed(0))).toBe(ATHLETE_MIN_SPEED_MPS);
    expect(maxSpeedOf(withSpeed(100))).toBe(ATHLETE_MAX_SPEED_MPS);
    expect(maxSpeedOf(withSpeed(80))).toBeGreaterThan(maxSpeedOf(withSpeed(20)));
  });
});

describe('moveAthleteToward', () => {
  it('never moves faster than the top speed', () => {
    const target = Vec3.create(3, 0, -3);
    const moved = moveAthleteToward(athlete, target, DT);
    expect(Vec3.distance(moved.position, athlete.position)).toBeCloseTo(
      maxSpeedOf(athlete) * DT,
      12,
    );
  });

  it('arrives exactly on the target and stays there', () => {
    const target = Vec3.create(1, 0, -2);
    let current = athlete;
    for (let i = 0; i < 120; i++) {
      current = moveAthleteToward(current, target, DT);
    }
    expect(current.position).toEqual(target);
    expect(moveAthleteToward(current, target, DT)).toBe(current);
  });

  it('walks on the floor even when the target is in the air', () => {
    const moved = moveAthleteToward(athlete, Vec3.create(0, 2.5, -2.9), DT);
    expect(moved.position.y).toBe(0);
  });

  it('returns to the base position', () => {
    const away: AthleteState = { ...athlete, position: Vec3.create(1, 0, -2) };
    let current = away;
    for (let i = 0; i < 120; i++) {
      current = moveAthleteToward(current, current.basePosition, DT);
    }
    expect(current.position).toEqual(athlete.basePosition);
  });

  it('keeps the facing untouched', () => {
    const moved = moveAthleteToward(athlete, Vec3.create(2, 0, 0), DT);
    expect(moved.facing).toBe(athlete.facing);
  });
});
