import { AIM_HOLD_MAX_S } from '@config/touch';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { Action } from './action';
import type { TouchPlan } from './plan-touch';
import type { TouchAim } from './touch-aim';
import { isWithinTimingWindow } from './touch-quality';

export interface TouchRelease {
  /** Simulation tick of the touch moment: when the toucher committed to it. */
  readonly tick: number;
  /** Null while the toucher is still choosing where to send the ball. */
  readonly aim: TouchAim | null;
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
  /** How long before contact the athlete means to be in place, when time allows, in s. */
  readonly arrivalLeadS: number;
  readonly release: TouchRelease | null;
  /** Tick at which the ball started resting in the hands, waiting for the aim; else null. */
  readonly holdStartTick: number | null;
  /** True once the chance is gone: released out of time, never released, or unplayable. */
  readonly spent: boolean;
}

export function createIncomingTouch(
  athleteId: AthleteId,
  action: Action,
  plan: TouchPlan | null,
  nowTick: number,
  stepSeconds: number,
  arrivalLeadS: number,
): IncomingTouch {
  return {
    athleteId,
    action,
    plan,
    contactTick: plan ? nowTick + plan.contact.secondsFromNow / stepSeconds : nowTick,
    arrivalLeadS,
    release: null,
    holdStartTick: null,
    spent: plan === null,
  };
}

/** Touch moment minus the ideal contact moment, in s (negative = early). */
export function timingErrorAt(incoming: IncomingTouch, tick: number, stepSeconds: number): number {
  return (tick - incoming.contactTick) * stepSeconds;
}

/**
 * The toucher commits to the touch — the player's finger goes down, or the AI decides —
 * with the aim if already known. One chance per ball: outside the timing window it is spent.
 */
export function releaseTouch(
  incoming: IncomingTouch,
  aim: TouchAim | null,
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

/** The toucher decides where the ball goes, after having committed to the touch. */
export function chooseAim(incoming: IncomingTouch, aim: TouchAim): IncomingTouch {
  if (incoming.spent || !incoming.release || incoming.release.aim) {
    return incoming;
  }
  return { ...incoming, release: { ...incoming.release, aim } };
}

/**
 * A committed touch turns into contact when the ball reaches the contact point, or right
 * away if the commit came late: the ball never jumps to the hands.
 */
export function isTouchDue(incoming: IncomingTouch, nowTick: number): boolean {
  return (
    !incoming.spent && incoming.release !== null && nowTick >= Math.round(incoming.contactTick)
  );
}

/** At contact without an aim, the ball rests in the hands while the toucher aims. */
export function startHold(incoming: IncomingTouch, nowTick: number): IncomingTouch {
  return incoming.holdStartTick === null ? { ...incoming, holdStartTick: nowTick } : incoming;
}

/** The hands cannot keep the ball forever: past the limit it leaves with the ideal aim. */
export function isHoldExpired(
  incoming: IncomingTouch,
  nowTick: number,
  stepSeconds: number,
): boolean {
  return (
    incoming.holdStartTick !== null &&
    (nowTick - incoming.holdStartTick) * stepSeconds >= AIM_HOLD_MAX_S
  );
}

/** No commit and the window has closed: the ball goes by. */
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
