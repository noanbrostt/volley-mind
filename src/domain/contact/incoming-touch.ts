import type { AthleteId } from '@domain/athlete/athlete-state';
import type { Action } from './action';
import type { TouchPlan } from './plan-touch';
import type { TouchAim } from './touch-aim';
import { isWithinTimingWindow } from './touch-quality';

export interface TouchRelease {
  /** Simulation tick at which the toucher released. */
  readonly tick: number;
  readonly aim: TouchAim;
}

/**
 * The touch the next athlete is expected to make, from the moment the ball leaves the
 * previous toucher until it is played or the chance is gone.
 */
export interface IncomingTouch {
  readonly athleteId: AthleteId;
  readonly action: Action;
  /** Null when the ball cannot be played at all. */
  readonly plan: TouchPlan | null;
  /** Simulation tick (fractional) at which the ball meets the contact point. */
  readonly contactTick: number;
  readonly release: TouchRelease | null;
  /** True once the chance is gone: released out of time, never released, or unplayable. */
  readonly spent: boolean;
}

export function createIncomingTouch(
  athleteId: AthleteId,
  action: Action,
  plan: TouchPlan | null,
  nowTick: number,
  stepSeconds: number,
): IncomingTouch {
  return {
    athleteId,
    action,
    plan,
    contactTick: plan ? nowTick + plan.contact.secondsFromNow / stepSeconds : nowTick,
    release: null,
    spent: plan === null,
  };
}

/** Release moment minus the ideal contact moment, in s (negative = early). */
export function timingErrorAt(incoming: IncomingTouch, tick: number, stepSeconds: number): number {
  return (tick - incoming.contactTick) * stepSeconds;
}

/**
 * The toucher lets go (the player lifts the finger, or the AI decides). One chance per
 * ball: a release outside the timing window spends it.
 */
export function releaseTouch(
  incoming: IncomingTouch,
  aim: TouchAim,
  nowTick: number,
  stepSeconds: number,
): IncomingTouch {
  if (incoming.spent || incoming.release) {
    return incoming;
  }
  if (!isWithinTimingWindow(timingErrorAt(incoming, nowTick, stepSeconds))) {
    return { ...incoming, spent: true };
  }
  return { ...incoming, release: { tick: nowTick, aim } };
}

/**
 * A release inside the window turns into contact when the ball reaches the contact point,
 * or right away if the release came late: the ball never jumps to the hands.
 */
export function isTouchDue(incoming: IncomingTouch, nowTick: number): boolean {
  return (
    !incoming.spent && incoming.release !== null && nowTick >= Math.round(incoming.contactTick)
  );
}

/** No release and the window has closed: the ball goes by. */
export function hasWindowClosed(
  incoming: IncomingTouch,
  nowTick: number,
  stepSeconds: number,
): boolean {
  return (
    !incoming.spent &&
    incoming.release === null &&
    !isWithinTimingWindow(timingErrorAt(incoming, nowTick, stepSeconds)) &&
    nowTick > incoming.contactTick
  );
}
