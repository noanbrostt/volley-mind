import {
  AI_MAX_FORCE_AIM_ERROR,
  AI_MAX_LATERAL_AIM_ERROR,
  AI_MAX_TIMING_ERROR_S,
} from '@config/ai';
import { nextRange, type RngState } from '@core/seeded-rng';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { attributeFraction } from '@domain/athlete/attributes';
import type { Action } from '@domain/contact/action';
import { IDEAL_AIM, type TouchAim } from '@domain/contact/touch-aim';

export interface AiTouchDecision {
  /** When to release relative to the ideal contact moment, in s (negative = early). */
  readonly releaseOffsetS: number;
  readonly aim: TouchAim;
  readonly rng: RngState;
}

/**
 * The AI's touch, for any function (dig, set, attack): it aims for the ideal and misses by
 * what its attributes allow. Reading drives timing; the action attribute drives the aim.
 * It decides once per ball and then emits the same touch the player would.
 */
export function decideAiTouch(
  athlete: AthleteState,
  action: Action,
  rng: RngState,
): AiTouchDecision {
  const timingSpread = (1 - attributeFraction(athlete.attributes.reading)) * AI_MAX_TIMING_ERROR_S;
  const aimSpread = 1 - attributeFraction(athlete.attributes[action]);

  const timing = nextRange(rng, -timingSpread, timingSpread);
  const lateral = nextRange(
    timing.next,
    -aimSpread * AI_MAX_LATERAL_AIM_ERROR,
    aimSpread * AI_MAX_LATERAL_AIM_ERROR,
  );
  const force = nextRange(
    lateral.next,
    -aimSpread * AI_MAX_FORCE_AIM_ERROR,
    aimSpread * AI_MAX_FORCE_AIM_ERROR,
  );

  return {
    releaseOffsetS: timing.value,
    aim: { lateral: IDEAL_AIM.lateral + lateral.value, force: IDEAL_AIM.force + force.value },
    rng: force.next,
  };
}
