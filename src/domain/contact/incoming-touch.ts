import { AIM_HOLD_MAX_S } from '@config/touch';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { Action } from './action';
import type { TouchPlan } from './plan-touch';
import type { TouchAim } from './touch-aim';
import { isWithinTimingWindow } from './touch-quality';

export interface TouchRelease {
  /** Simulation tick of the touch moment: when the toucher committed to it. */
  readonly tick: number;
  /** The aim so far: null until the toucher starts aiming, then their latest choice. */
  readonly aim: TouchAim | null;
  /** True once the aim is final: the ball leaves as soon as it is in the hands. */
  readonly aimConfirmed: boolean;
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
  return { ...incoming, release: { tick: nowTick, aim, aimConfirmed: aim !== null } };
}

/**
 * After committing, the toucher aims: each choice replaces the last until one is confirmed.
 * Once confirmed the aim cannot change.
 */
export function chooseAim(incoming: IncomingTouch, aim: TouchAim, confirm: boolean): IncomingTouch {
  if (incoming.spent || !incoming.release || incoming.release.aimConfirmed) {
    return incoming;
  }
  return { ...incoming, release: { ...incoming.release, aim, aimConfirmed: confirm } };
}

/**
 * The tick by which the ball leaves the hands at the latest: the hold limit counted from
 * contact (or from a late commit). Null before the toucher commits.
 */
export function aimDeadlineTick(incoming: IncomingTouch, stepSeconds: number): number | null {
  if (!incoming.release) {
    return null;
  }
  const holdStart =
    incoming.holdStartTick ?? Math.max(Math.round(incoming.contactTick), incoming.release.tick);
  return holdStart + AIM_HOLD_MAX_S / stepSeconds;
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

/** At contact without a confirmed aim, the ball rests in the hands while the toucher aims. */
export function startHold(incoming: IncomingTouch, nowTick: number): IncomingTouch {
  return incoming.holdStartTick === null ? { ...incoming, holdStartTick: nowTick } : incoming;
}

/** The hands cannot keep the ball forever: past the limit it leaves with the aim so far. */
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
