import {
  BAD_BALL_QUALITY_FACTOR,
  TOUCH_POSITION_TOLERANCE_M,
  TOUCH_SKILL_FLOOR,
  TOUCH_TIMING_WINDOW_S,
} from '@config/touch';
import { uniformAttributes } from '@domain/athlete/attributes';
import { describe, expect, it } from 'vitest';
import { IDEAL_AIM } from './touch-aim';
import {
  isWithinReach,
  isWithinTimingWindow,
  type TouchExecution,
  touchQuality,
} from './touch-quality';

const perfect: TouchExecution = { timingErrorS: 0, positionErrorM: 0, aim: IDEAL_AIM };
const best = uniformAttributes(100);

describe('touchQuality', () => {
  it('is 1 for a perfect touch by a top athlete, and the skill floor for a novice', () => {
    expect(touchQuality(best, 'set', 'overhead', false, perfect)).toBeCloseTo(1, 12);
    expect(touchQuality(uniformAttributes(0), 'set', 'overhead', false, perfect)).toBeCloseTo(
      TOUCH_SKILL_FLOOR,
      12,
    );
  });

  it('drops as timing drifts, early or late, down to 0 at the window edge', () => {
    const at = (timingErrorS: number): number =>
      touchQuality(best, 'dig', 'bump', false, { ...perfect, timingErrorS });
    expect(at(0.05)).toBeLessThan(1);
    expect(at(0.1)).toBeLessThan(at(0.05));
    expect(at(-0.1)).toBeCloseTo(at(0.1), 12);
    expect(at(TOUCH_TIMING_WINDOW_S)).toBe(0);
  });

  it('drops with distance from the ideal standing spot', () => {
    const at = (positionErrorM: number): number =>
      touchQuality(best, 'dig', 'bump', false, { ...perfect, positionErrorM });
    expect(at(0.2)).toBeLessThan(1);
    expect(at(TOUCH_POSITION_TOLERANCE_M)).toBe(0);
  });

  it('drops when the aim points away from the ideal', () => {
    const offAim = touchQuality(best, 'set', 'overhead', false, {
      ...perfect,
      aim: { lateral: 0.6, force: 0.5 },
    });
    expect(offAim).toBeLessThan(1);
    expect(offAim).toBeGreaterThan(0);
  });

  it('is lower on a bad ball (chained quality)', () => {
    expect(touchQuality(best, 'set', 'bump', true, perfect)).toBeCloseTo(
      BAD_BALL_QUALITY_FACTOR,
      12,
    );
  });

  it('weighs the action attribute together with the technique attribute', () => {
    const goodSetterWeakBump = { ...uniformAttributes(90), bump: 20 };
    const overhead = touchQuality(goodSetterWeakBump, 'set', 'overhead', false, perfect);
    const bump = touchQuality(goodSetterWeakBump, 'set', 'bump', false, perfect);
    expect(bump).toBeLessThan(overhead);
  });

  it('uses only the attack attribute for spikes and roll shots (athletes.md)', () => {
    const attacker = { ...uniformAttributes(10), attack: 90 };
    const spike = touchQuality(attacker, 'attack', 'spike', false, perfect);
    const rollShot = touchQuality(attacker, 'attack', 'roll-shot', false, perfect);
    expect(spike).toBeCloseTo(TOUCH_SKILL_FLOOR + (1 - TOUCH_SKILL_FLOOR) * 0.9, 12);
    expect(rollShot).toBeCloseTo(spike, 12);
  });
});

describe('isWithinTimingWindow', () => {
  it('accepts releases inside the window, early or late', () => {
    expect(isWithinTimingWindow(0)).toBe(true);
    expect(isWithinTimingWindow(-TOUCH_TIMING_WINDOW_S)).toBe(true);
    expect(isWithinTimingWindow(TOUCH_TIMING_WINDOW_S + 0.01)).toBe(false);
  });
});

describe('isWithinReach', () => {
  it('reaches the ball only up to the position tolerance', () => {
    expect(isWithinReach(0)).toBe(true);
    expect(isWithinReach(TOUCH_POSITION_TOLERANCE_M)).toBe(true);
    expect(isWithinReach(TOUCH_POSITION_TOLERANCE_M + 0.01)).toBe(false);
  });
});
