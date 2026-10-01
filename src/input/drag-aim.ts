import { AIM_IDEAL_FORCE } from '@config/touch';
import { CONTROL_DEADZONE_RATIO, CONTROL_MAX_AIM_ANGLE_RAD } from '@config/touch-control';
import type { TouchAim } from '@domain/contact/touch-aim';

/** A finger on the screen, in CSS pixels (y grows downward). */
export interface Drag {
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Turns the player's drag into the same aim the AI produces. Straight up the screen points
 * at the partner; tilting the drag aims left or right; the drag length is the force, with
 * the ideal force at AIM_IDEAL_FORCE of a full drag. There is no free aim: without a drag
 * the ball gets almost no force (Noan found a tap that aims perfectly too generous).
 */
export function aimFromDrag(drag: Drag, fullDragPx: number): TouchAim {
  const dx = drag.x - drag.startX;
  const up = drag.startY - drag.y;
  const length = Math.hypot(dx, up) / fullDragPx;
  if (length < CONTROL_DEADZONE_RATIO) {
    // Too short to read a direction from: straight ahead, with the little force there is.
    return { lateral: 0, force: length };
  }
  // Angle away from straight up: positive to the right.
  const angle = Math.atan2(dx, up);
  return {
    lateral: clamp(angle / CONTROL_MAX_AIM_ANGLE_RAD, -1, 1),
    force: clamp(length, 0, 1),
  };
}

/** Where on the drag the ideal force sits, for the aim guide, in CSS pixels. */
export function idealDragLength(fullDragPx: number): number {
  return fullDragPx * AIM_IDEAL_FORCE;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
