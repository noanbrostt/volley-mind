import { ATHLETE_DEFAULT_ATTRIBUTE, ATHLETE_DEFAULT_HEIGHT_M } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { createAthlete, facingToward, forwardOf, rightOf } from './athlete-state';

describe('createAthlete', () => {
  it('stands on the base position with the default body and attributes', () => {
    const base = Vec3.create(0, 0, -3);
    const athlete = createAthlete({ id: 'a', basePosition: base, facing: 0 });
    expect(athlete.position).toEqual(base);
    expect(athlete.basePosition).toEqual(base);
    expect(athlete.heightM).toBe(ATHLETE_DEFAULT_HEIGHT_M);
    expect(athlete.dominantArm).toBe('right');
    expect(athlete.attributes.dig).toBe(ATHLETE_DEFAULT_ATTRIBUTE);
  });

  it('is plain data that survives JSON', () => {
    const athlete = createAthlete({ id: 'b', basePosition: Vec3.create(0, 0, 3), facing: Math.PI });
    expect(JSON.parse(JSON.stringify(athlete))).toEqual(athlete);
  });
});

describe('facing helpers', () => {
  it('looks toward +z with +x on the right at facing 0', () => {
    // Compared by distance: -Math.sin(0) is -0, which toEqual tells apart from 0.
    expect(Vec3.distance(forwardOf(0), Vec3.create(0, 0, 1))).toBe(0);
    expect(Vec3.distance(rightOf(0), Vec3.create(1, 0, 0))).toBe(0);
  });

  it('keeps forward and right perpendicular for any facing', () => {
    for (const facing of [0.3, 1.7, -2.4, Math.PI]) {
      expect(Vec3.dot(forwardOf(facing), rightOf(facing))).toBeCloseTo(0, 12);
      expect(Vec3.length(forwardOf(facing))).toBeCloseTo(1, 12);
    }
  });

  it('turns an athlete to look at a point', () => {
    const from = Vec3.create(0, 0, -3);
    const to = Vec3.create(0, 0, 3);
    expect(facingToward(from, to)).toBeCloseTo(0, 12);
    expect(Math.abs(facingToward(to, from))).toBeCloseTo(Math.PI, 12);
    const forward = forwardOf(facingToward(Vec3.ZERO, Vec3.create(2, 5, 2)));
    expect(forward.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(forward.z).toBeCloseTo(Math.SQRT1_2, 12);
  });
});
