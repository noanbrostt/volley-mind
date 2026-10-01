import { AIM_IDEAL_FORCE } from '@config/touch';
import { CONTROL_MAX_AIM_ANGLE_RAD } from '@config/touch-control';
import { describe, expect, it } from 'vitest';
import { aimFromDrag, idealDragLength } from './drag-aim';

const FULL = 200;
const from = (dx: number, dy: number) => ({ startX: 100, startY: 300, x: 100 + dx, y: 300 + dy });

describe('aimFromDrag', () => {
  it('gives a tap no free aim: straight ahead with almost no force', () => {
    expect(aimFromDrag(from(0, 0), FULL)).toEqual({ lateral: 0, force: 0 });
    const tiny = aimFromDrag(from(5, -5), FULL);
    expect(tiny.lateral).toBe(0);
    expect(tiny.force).toBeLessThan(0.05);
  });

  it('reads a drag straight up at the ideal length as the ideal aim', () => {
    const aim = aimFromDrag(from(0, -idealDragLength(FULL)), FULL);
    expect(aim.lateral).toBeCloseTo(0, 12);
    expect(aim.force).toBeCloseTo(AIM_IDEAL_FORCE, 12);
  });

  it('uses the drag length as force, capped at a full drag', () => {
    expect(aimFromDrag(from(0, -60), FULL).force).toBeCloseTo(0.3, 12);
    expect(aimFromDrag(from(0, -400), FULL).force).toBe(1);
  });

  it('tilts the aim with the drag angle, right positive and capped', () => {
    const halfway = Math.tan(CONTROL_MAX_AIM_ANGLE_RAD / 2) * 100;
    expect(aimFromDrag(from(halfway, -100), FULL).lateral).toBeCloseTo(0.5, 9);
    expect(aimFromDrag(from(-halfway, -100), FULL).lateral).toBeCloseTo(-0.5, 9);
    expect(aimFromDrag(from(150, 0), FULL).lateral).toBe(1);
    expect(aimFromDrag(from(-80, 40), FULL).lateral).toBe(-1);
  });
});
