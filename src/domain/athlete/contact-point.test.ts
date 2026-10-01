import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type AthleteState, createAthlete } from './athlete-state';
import { contactPoint } from './contact-point';

const athlete = createAthlete({ id: 'a', basePosition: Vec3.create(1, 0, -3), facing: 0 });
const height = athlete.heightM;

describe('contactPoint', () => {
  it('meets an overhead ball a little above the forehead, in front of the athlete', () => {
    const point = contactPoint(athlete, 'overhead');
    expect(point.y).toBeGreaterThan(height * 0.95);
    expect(point.y).toBeLessThan(height * 1.1);
    expect(point.z).toBeGreaterThan(athlete.position.z);
    expect(point.x).toBeCloseTo(athlete.position.x, 12);
  });

  it('meets a bump between the waist and the hips, arms in front', () => {
    const point = contactPoint(athlete, 'bump');
    expect(point.y).toBeGreaterThan(height * 0.45);
    expect(point.y).toBeLessThan(height * 0.65);
    expect(point.z).toBeGreaterThan(athlete.position.z);
  });

  it('meets a spike with the arm stretched up, toward the dominant arm', () => {
    const spike = contactPoint(athlete, 'spike');
    expect(spike.y).toBeGreaterThan(contactPoint(athlete, 'overhead').y);
    expect(spike.x).toBeGreaterThan(athlete.position.x);

    const leftHanded: AthleteState = { ...athlete, dominantArm: 'left' };
    expect(contactPoint(leftHanded, 'spike').x).toBeLessThan(athlete.position.x);
  });

  it('turns with the athlete', () => {
    const facingBack: AthleteState = { ...athlete, facing: Math.PI };
    const point = contactPoint(facingBack, 'overhead');
    expect(point.z).toBeLessThan(athlete.position.z);
    expect(point.y).toBeCloseTo(contactPoint(athlete, 'overhead').y, 12);
  });
});
