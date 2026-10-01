import { DIVE_REACH_RATIO } from '@config/athlete';
import { describe, expect, it } from 'vitest';
import { DIVE_EXTENSION_M, TOUCH_REACH_M } from './reach';

describe('reach', () => {
  it('lets a dive reach half again as far as a normal touch (Noan)', () => {
    expect(DIVE_REACH_RATIO).toBe(1.5);
    expect(TOUCH_REACH_M + DIVE_EXTENSION_M).toBeCloseTo(TOUCH_REACH_M * 1.5, 12);
  });
});
