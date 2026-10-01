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

export interface TouchGesture {
  /** Forget the aim carried between presses: call once the ball no longer waits for it. */
  resetAimCarry(): void;
  detach(): void;
}

/**
 * One thumb: the first finger down is the moment of the touch; dragging aims (each move
 * updates the aim) and lifting after a real drag confirms it. A quick tap confirms nothing:
 * the player may press and drag again while the aiming time lasts, and that new drag picks
 * up from the aim already set instead of starting over. Only the first finger counts.
 */
export function listenForTouchGesture(
  target: HTMLElement,
  options: TouchGestureOptions,
): TouchGesture {
  let pointerId: number | null = null;
  let drag: Drag | null = null;
  let fullDragPx = 0;
  // Where this press began, to tell a quick tap from a real drag.
  let pressX = 0;
  let pressY = 0;
  // The drag vector set by earlier presses on this same ball.
  let carryX = 0;
  let carryY = 0;

  const onDown = (event: PointerEvent): void => {
    if (pointerId !== null) {
      return;
    }
    pointerId = event.pointerId;
    target.setPointerCapture(event.pointerId);
    fullDragPx = Math.min(window.innerWidth, window.innerHeight) * CONTROL_FULL_DRAG_SCREEN_RATIO;
    pressX = event.clientX;
    pressY = event.clientY;
    // The drag is anchored as if the earlier presses never stopped: the aim continues.
    drag = {
      startX: event.clientX - carryX,
      startY: event.clientY - carryY,
      x: event.clientX,
      y: event.clientY,
    };
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
    carryX = released.x - released.startX;
    carryY = released.y - released.startY;
    endPress();
    // A quick tap never confirms: no free aim. The player keeps aiming and can press again.
    const moved = Math.hypot(released.x - pressX, released.y - pressY);
    if (moved < fullDragPx * CONTROL_MIN_CONFIRM_DRAG_RATIO) {
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
      endPress();
    }
  };

  function endPress(): void {
    pointerId = null;
    drag = null;
    options.onDrag(null, fullDragPx);
  }

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);
  return {
    resetAimCarry() {
      carryX = 0;
      carryY = 0;
    },
    detach() {
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
    },
  };
}
