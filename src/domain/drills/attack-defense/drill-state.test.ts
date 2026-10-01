import { ATHLETE_STEP_REACH_M } from '@config/athlete';
import { Vec3 } from '@core/vec3';
import { createAthlete } from '@domain/athlete/athlete-state';
import { describe, expect, it } from 'vitest';
import { nearestAthleteTo, nextActionAfter, partnerOf, reachableSpot } from './drill-state';

const a = createAthlete({ id: 'a', basePosition: Vec3.create(0, 0, -3), facing: 0 });
const b = createAthlete({ id: 'b', basePosition: Vec3.create(0, 0, 3), facing: Math.PI });

describe('attack-defense drill', () => {
  it('follows the sequence attack → dig → set → attack', () => {
    expect(nextActionAfter('attack')).toBe('dig');
    expect(nextActionAfter('dig')).toBe('set');
    expect(nextActionAfter('set')).toBe('attack');
  });

  it('gives each athlete the cycle attack → set → dig over six touches', () => {
    // A attacks, B digs, A sets, B attacks, A digs, B sets (attack-defense-drill.md).
    const touches: string[] = [];
    let action: 'attack' | 'dig' | 'set' = 'attack';
    let toucher = 'a';
    for (let i = 0; i < 6; i++) {
      touches.push(`${toucher}:${action}`);
      action = nextActionAfter(action);
      toucher = toucher === 'a' ? 'b' : 'a';
    }
    expect(touches).toEqual(['a:attack', 'b:dig', 'a:set', 'b:attack', 'a:dig', 'b:set']);
  });

  it('finds the partner', () => {
    expect(partnerOf([a, b], 'a')).toBe(b);
    expect(partnerOf([a, b], 'b')).toBe(a);
  });

  it('picks the athlete nearest to the ball to restart', () => {
    expect(nearestAthleteTo([a, b], Vec3.create(0.5, 0.1, 2))).toBe(b);
    expect(nearestAthleteTo([a, b], Vec3.create(-1, 2, -2))).toBe(a);
  });

  it('lets an athlete go only one or two steps from the base', () => {
    const near = Vec3.create(0.5, 1.9, -2.5);
    expect(reachableSpot(a, near)).toEqual(Vec3.create(0.5, 0, -2.5));

    const far = reachableSpot(a, Vec3.create(5, 0, -3));
    expect(Vec3.distance(far, a.basePosition)).toBeCloseTo(ATHLETE_STEP_REACH_M, 12);
    expect(far.x).toBeGreaterThan(0);
  });
});
