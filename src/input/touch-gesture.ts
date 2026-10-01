import {
  CONTROL_FULL_DRAG_SCREEN_RATIO,
  CONTROL_MIN_CONFIRM_DRAG_RATIO,
} from '@config/touch-control';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { WorldCommand } from '@simulation/world-command';
import { aimFromDrag, type Drag } from './drag-aim';

export interface TouchGestureOptions {
  /** The athlete the player controls. */
  readonly athleteId: AthleteId;
  /** Touch when the finger goes down; draft aims while it drags; the final aim on lift. */
  readonly emit: (command: WorldCommand) => void;
  /** The drag in progress (null when the finger lifts), for the aim guide. */
  readonly onDrag: (drag: Drag | null, fullDragPx: number) => void;
}

/**
 * One thumb: the first finger down is the moment of the touch; dragging aims (each move
 * updates the aim) and lifting after a real drag confirms it. A quick tap confirms nothing:
 * the player may press and drag again while the aiming time lasts. Only the first finger
 * counts. Returns a detach function.
 */
export function listenForTouchGesture(
  target: HTMLElement,
  options: TouchGestureOptions,
): () => void {
  let pointerId: number | null = null;
  let drag: Drag | null = null;
  let fullDragPx = 0;

  const onDown = (event: PointerEvent): void => {
    if (pointerId !== null) {
      return;
    }
    pointerId = event.pointerId;
    target.setPointerCapture(event.pointerId);
    fullDragPx = Math.min(window.innerWidth, window.innerHeight) * CONTROL_FULL_DRAG_SCREEN_RATIO;
    drag = { startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY };
    options.emit({ type: 'touch', athleteId: options.athleteId });
    options.onDrag(drag, fullDragPx);
  };

  const onMove = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId || !drag) {
      return;
    }
    drag = { ...drag, x: event.clientX, y: event.clientY };
    options.emit({
      type: 'aim',
      athleteId: options.athleteId,
      aim: aimFromDrag(drag, fullDragPx),
      final: false,
    });
    options.onDrag(drag, fullDragPx);
  };

  const onUp = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId || !drag) {
      return;
    }
    const released = { ...drag, x: event.clientX, y: event.clientY };
    reset();
    // A quick tap never confirms: no free aim. The player keeps aiming and can press again.
    const dragged = Math.hypot(released.x - released.startX, released.y - released.startY);
    if (dragged < fullDragPx * CONTROL_MIN_CONFIRM_DRAG_RATIO) {
      return;
    }
    options.emit({
      type: 'aim',
      athleteId: options.athleteId,
      aim: aimFromDrag(released, fullDragPx),
      final: true,
    });
  };

  const onCancel = (event: PointerEvent): void => {
    if (event.pointerId === pointerId) {
      reset();
    }
  };

  function reset(): void {
    pointerId = null;
    drag = null;
    options.onDrag(null, fullDragPx);
  }

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);
  return () => {
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onCancel);
  };
}
