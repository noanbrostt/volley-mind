import type { WorldCommand } from '@simulation/world-command';

const LAUNCH_BALL: WorldCommand = Object.freeze({ type: 'launch-ball' });

/** A tap or click anywhere on the target launches the ball. Returns a detach function. */
export function listenForLaunch(
  target: HTMLElement,
  emit: (command: WorldCommand) => void,
): () => void {
  const onPointerDown = (): void => emit(LAUNCH_BALL);
  target.addEventListener('pointerdown', onPointerDown);
  return () => target.removeEventListener('pointerdown', onPointerDown);
}
