import {
  ATTACK_CONTROLLED_SPEED_MPS,
  DIG_RISE_M,
  ROLL_SHOT_RISE_M,
  SET_RISE_M,
} from '@config/touch';
import type { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import type { Action } from './action';
import type { Technique } from './technique';

/** How the ball travels: an arc of a given rise, or driven at a given speed. */
export type Trajectory =
  | {
      readonly kind: 'arc' /** Above the higher of contact and target, in m. */;
      readonly rise: number;
    }
  | { readonly kind: 'drive' /** In m/s. */; readonly speed: number };

export interface TouchTarget {
  /** Where the ball should reach the receiver, in m. */
  readonly point: Vec3;
  readonly trajectory: Trajectory;
}

/**
 * The ideal destination of a touch in the drill: always on the receiver standing on their
 * base position, so nobody has to move when the touch is good.
 */
export function touchTargetFor(
  action: Action,
  technique: Technique,
  receiver: AthleteState,
): TouchTarget {
  const atBase: AthleteState = { ...receiver, position: receiver.basePosition };
  switch (action) {
    case 'set':
      // Above the attacker, to hit with the arm stretched up.
      return {
        point: contactPoint(atBase, 'spike'),
        trajectory: { kind: 'arc', rise: SET_RISE_M },
      };
    case 'dig':
      // High, to the setter's hands.
      return {
        point: contactPoint(atBase, 'overhead'),
        trajectory: { kind: 'arc', rise: DIG_RISE_M },
      };
    case 'attack':
      // Aimed at the defender's body, at bump height.
      return {
        point: contactPoint(atBase, 'bump'),
        trajectory:
          technique === 'roll-shot'
            ? { kind: 'arc', rise: ROLL_SHOT_RISE_M }
            : { kind: 'drive', speed: ATTACK_CONTROLLED_SPEED_MPS },
      };
  }
}
