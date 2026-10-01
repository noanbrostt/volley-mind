import { AIM_IDEAL_FORCE } from '@config/touch';

/**
 * Where the toucher points the ball, relative to the ideal target: the player's drag, or
 * the AI's equivalent. The same shape for both, so the AI has no shortcut.
 */
export interface TouchAim {
  /** −1 (full left) to 1 (full right) of the ideal direction. */
  readonly lateral: number;
  /** 0 (no force) to 1 (full force); AIM_IDEAL_FORCE reaches the target exactly. */
  readonly force: number;
}

export const IDEAL_AIM: TouchAim = Object.freeze({ lateral: 0, force: AIM_IDEAL_FORCE });

/** How far the aim is from ideal: 0 when perfect, about 1 at a full-scale miss. */
export function aimDeviation(aim: TouchAim): number {
  const forceDeviation = (aim.force - AIM_IDEAL_FORCE) / AIM_IDEAL_FORCE;
  return Math.hypot(aim.lateral, forceDeviation);
}
