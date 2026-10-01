import type { AthleteId } from '@domain/athlete/athlete-state';
import type { TouchAim } from '@domain/contact/touch-aim';

/**
 * Intentions sent into the simulation. The human player and the AI emit the very same
 * commands; nothing else can change the world.
 */
export type WorldCommand = {
  /** The toucher lets go: the moment of the touch, with where they aimed. */
  readonly type: 'touch';
  readonly athleteId: AthleteId;
  readonly aim: TouchAim;
};
