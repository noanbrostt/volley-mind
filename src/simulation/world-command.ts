import type { AthleteId } from '@domain/athlete/athlete-state';
import type { TouchAim } from '@domain/contact/touch-aim';

/**
 * Intentions sent into the simulation. The human player and the AI emit the very same
 * commands; nothing else can change the world.
 */
export type WorldCommand =
  | {
      /**
       * The moment of the touch. With an aim, the ball leaves at contact; without one, it
       * rests in the hands at contact until an `aim` command (or the hold limit).
       */
      readonly type: 'touch';
      readonly athleteId: AthleteId;
      readonly aim?: TouchAim;
    }
  | {
      /** Where the ball goes, for a touch committed without an aim. */
      readonly type: 'aim';
      readonly athleteId: AthleteId;
      readonly aim: TouchAim;
    };
