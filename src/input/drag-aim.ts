import { AIM_IDEAL_FORCE } from '@config/touch';
import { CONTROL_FULL_LATERAL_DRAG_RATIO } from '@config/touch-control';
import type { TouchAim } from '@domain/contact/touch-aim';

/** A finger on the screen, in CSS pixels (y grows downward). */
export interface Drag {
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Turns the player's drag into the same aim the AI produces, linearly so the aim never
 * jumps: dragging up sets the force (ideal at AIM_IDEAL_FORCE of a full drag), dragging
 * sideways aims left or right. There is no free aim: without a drag the ball gets no force.
 */
export function aimFromDrag(drag: Drag, fullDragPx: number): TouchAim {
  const sideways = (drag.x - drag.startX) / (fullDragPx * CONTROL_FULL_LATERAL_DRAG_RATIO);
  const up = (drag.startY - drag.y) / fullDragPx;
  return { lateral: clamp(sideways, -1, 1), force: clamp(up, 0, 1) };
}

/** Where on the drag the ideal force sits, for the aim guide, in CSS pixels. */
export function idealDragLength(fullDragPx: number): number {
  return fullDragPx * AIM_IDEAL_FORCE;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
