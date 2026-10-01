import { AI_MAX_TIMING_ERROR_S } from '@config/ai';
import { TOUCH_TIMING_WINDOW_S } from '@config/touch';
import { createRng } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { type AthleteState, createAthlete } from '@domain/athlete/athlete-state';
import { uniformAttributes } from '@domain/athlete/attributes';
import { IDEAL_AIM } from '@domain/contact/touch-aim';
import { describe, expect, it } from 'vitest';
import { decideAiTouch } from './decide-touch';

const base = createAthlete({ id: 'b', basePosition: Vec3.create(0, 0, 3), facing: Math.PI });
const withAll = (value: number): AthleteState => ({
  ...base,
  attributes: uniformAttributes(value),
});

describe('decideAiTouch', () => {
  it('plays the ideal touch with perfect attributes', () => {
    const decision = decideAiTouch(withAll(100), 'set', createRng(3));
    expect(decision.releaseOffsetS).toBe(0);
    expect(decision.aim).toEqual(IDEAL_AIM);
  });

  it('misses by more as attributes drop, always inside the timing window', () => {
    const spread = (value: number): number => {
      let total = 0;
      let rng = createRng(9);
      for (let i = 0; i < 200; i++) {
        const decision = decideAiTouch(withAll(value), 'dig', rng);
        expect(Math.abs(decision.releaseOffsetS)).toBeLessThanOrEqual(AI_MAX_TIMING_ERROR_S);
        expect(Math.abs(decision.releaseOffsetS)).toBeLessThan(TOUCH_TIMING_WINDOW_S);
        total += Math.abs(decision.releaseOffsetS) + Math.abs(decision.aim.lateral);
        rng = decision.rng;
      }
      return total;
    };
    expect(spread(20)).toBeGreaterThan(spread(80));
  });

  it('is deterministic for the same RNG state', () => {
    const rng = createRng(42);
    expect(decideAiTouch(withAll(50), 'attack', rng)).toEqual(
      decideAiTouch(withAll(50), 'attack', rng),
    );
  });
});
