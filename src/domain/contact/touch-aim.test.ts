import { AIM_IDEAL_FORCE } from '@config/touch';
import { describe, expect, it } from 'vitest';
import { aimDeviation, IDEAL_AIM } from './touch-aim';

describe('touch aim', () => {
  it('has no deviation at the ideal aim', () => {
    expect(IDEAL_AIM).toEqual({ lateral: 0, force: AIM_IDEAL_FORCE });
    expect(aimDeviation(IDEAL_AIM)).toBe(0);
  });

  it('grows with lateral and force deviations, symmetric left and right', () => {
    expect(aimDeviation({ lateral: 0.5, force: AIM_IDEAL_FORCE })).toBe(0.5);
    expect(aimDeviation({ lateral: -0.5, force: AIM_IDEAL_FORCE })).toBe(0.5);
    expect(aimDeviation({ lateral: 0, force: 0 })).toBe(1);
    expect(aimDeviation({ lateral: 0.5, force: 0 })).toBeGreaterThan(1);
  });
});
