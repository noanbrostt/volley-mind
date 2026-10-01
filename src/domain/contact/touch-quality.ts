import {
  AIM_QUALITY_PENALTY,
  BAD_BALL_QUALITY_FACTOR,
  DIVE_QUALITY_FACTOR,
  TOUCH_POSITION_TOLERANCE_M,
  TOUCH_SKILL_FLOOR,
  TOUCH_TIMING_WINDOW_S,
} from '@config/touch';
import type { AthleteAttributes } from '@domain/athlete/attributes';
import { attributeFraction } from '@domain/athlete/attributes';
import type { Action } from './action';
import type { Technique } from './technique';
import { aimDeviation, type TouchAim } from './touch-aim';

/** How the touch was executed, as measured by the simulation. */
export interface TouchExecution {
  /** Release moment minus the ideal contact moment, in s (negative = early). */
  readonly timingErrorS: number;
  /** Distance between the athlete's feet and the ideal standing spot, in m. */
  readonly positionErrorM: number;
  readonly aim: TouchAim;
}

/** Whether a release this far from the ideal moment still touches the ball. */
export function isWithinTimingWindow(timingErrorS: number): boolean {
  return Math.abs(timingErrorS) <= TOUCH_TIMING_WINDOW_S;
}

/** Whether an athlete this far from the ideal standing spot can still reach the ball. */
export function isWithinReach(positionErrorM: number): boolean {
  return positionErrorM <= TOUCH_POSITION_TOLERANCE_M;
}

/**
 * Touch quality from 0 to 1. Execution (timing, position, aim) is weighted by the athlete's
 * skill — the action attribute together with the technique attribute (athletes.md) — and a
 * bad ball makes everything harder (chained quality).
 */
export function touchQuality(
  attributes: AthleteAttributes,
  action: Action,
  technique: Technique,
  badBall: boolean,
  execution: TouchExecution,
): number {
  const timing = clamp01(1 - (execution.timingErrorS / TOUCH_TIMING_WINDOW_S) ** 2);
  const position = clamp01(1 - (execution.positionErrorM / TOUCH_POSITION_TOLERANCE_M) ** 2);
  const aim = clamp01(1 - aimDeviation(execution.aim) * AIM_QUALITY_PENALTY);
  const skill =
    TOUCH_SKILL_FLOOR + (1 - TOUCH_SKILL_FLOOR) * skillFor(attributes, action, technique);
  const difficulty =
    (badBall ? BAD_BALL_QUALITY_FACTOR : 1) * (technique === 'dive' ? DIVE_QUALITY_FACTOR : 1);
  return timing * position * aim * skill * difficulty;
}

/** athletes.md: spike and roll shot use the attack attribute only. */
function skillFor(attributes: AthleteAttributes, action: Action, technique: Technique): number {
  switch (technique) {
    case 'spike':
    case 'roll-shot':
      return attributeFraction(attributes.attack);
    case 'overhead':
      return (attributeFraction(attributes[action]) + attributeFraction(attributes.overhead)) / 2;
    // athletes.md: the dive uses the bump attribute.
    case 'bump':
    case 'dive':
      return (attributeFraction(attributes[action]) + attributeFraction(attributes.bump)) / 2;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
