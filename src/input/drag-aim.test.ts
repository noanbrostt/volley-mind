import { AIM_IDEAL_FORCE } from '@config/touch';
import { CONTROL_FULL_LATERAL_DRAG_RATIO } from '@config/touch-control';
import { describe, expect, it } from 'vitest';
import { aimFromDrag, idealDragLength } from './drag-aim';

const FULL = 200;
const from = (dx: number, dy: number) => ({ startX: 100, startY: 300, x: 100 + dx, y: 300 + dy });

describe('aimFromDrag', () => {
  it('gives a tap no free aim: straight ahead with no force', () => {
    expect(aimFromDrag(from(0, 0), FULL)).toEqual({ lateral: 0, force: 0 });
  });

  it('reads a drag straight up at the ideal length as the ideal aim', () => {
    const aim = aimFromDrag(from(0, -idealDragLength(FULL)), FULL);
    expect(aim.lateral).toBe(0);
    expect(aim.force).toBeCloseTo(AIM_IDEAL_FORCE, 12);
  });

  it('uses the upward drag as force, capped, and ignores dragging down', () => {
    expect(aimFromDrag(from(0, -60), FULL).force).toBeCloseTo(0.3, 12);
    expect(aimFromDrag(from(0, -400), FULL).force).toBe(1);
    expect(aimFromDrag(from(0, 80), FULL).force).toBe(0);
  });

  it('uses the sideways drag as lateral aim, right positive and capped', () => {
    const fullLateral = FULL * CONTROL_FULL_LATERAL_DRAG_RATIO;
    expect(aimFromDrag(from(fullLateral / 2, -100), FULL).lateral).toBeCloseTo(0.5, 12);
    expect(aimFromDrag(from(-fullLateral / 2, -100), FULL).lateral).toBeCloseTo(-0.5, 12);
    expect(aimFromDrag(from(fullLateral * 3, -100), FULL).lateral).toBe(1);
  });

  it('is linear: a tiny move never makes the aim jump', () => {
    const a = aimFromDrag(from(1, -2), FULL);
    const b = aimFromDrag(from(-1, -2), FULL);
    expect(Math.abs(a.lateral - b.lateral)).toBeLessThan(0.02);
  });
});
