import { AIM_HOLD_MAX_S, TOUCH_TIMING_WINDOW_S } from '@config/touch';
import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import {
  chooseAim,
  createIncomingTouch,
  hasWindowClosed,
  type IncomingTouch,
  isHoldExpired,
  isTouchDue,
  releaseTouch,
  startHold,
  timingErrorAt,
} from './incoming-touch';
import type { TouchPlan } from './plan-touch';
import { IDEAL_AIM } from './touch-aim';

const DT = 1 / 60;
const plan: TouchPlan = {
  technique: 'overhead',
  contact: { point: Vec3.create(0, 1.9, -2.8), velocity: Vec3.create(0, -5, 0), secondsFromNow: 1 },
  standPosition: Vec3.create(0, 0, -3),
  badBallReasons: [],
  hardReasons: [],
};
// Ball leaves at tick 100 and meets the contact point 1 s (60 ticks) later.
const incoming = createIncomingTouch('a', 'set', plan, 100, DT, 0.2);
const windowTicks = TOUCH_TIMING_WINDOW_S / DT;

describe('incoming touch', () => {
  it('knows the contact tick from the plan', () => {
    expect(incoming.contactTick).toBeCloseTo(160, 9);
    expect(incoming.spent).toBe(false);
    expect(timingErrorAt(incoming, 154, DT)).toBeCloseTo(-0.1, 9);
  });

  it('is spent from the start when the ball cannot be played', () => {
    expect(createIncomingTouch('a', 'dig', null, 100, DT, 0.2).spent).toBe(true);
  });

  it('accepts one release inside the window and ignores the rest', () => {
    const released = releaseTouch(incoming, IDEAL_AIM, 155, DT);
    expect(released.release).toEqual({ tick: 155, aim: IDEAL_AIM });
    expect(releaseTouch(released, { lateral: 1, force: 1 }, 158, DT)).toBe(released);
  });

  it('spends the chance on a release far too early', () => {
    const whiff = releaseTouch(incoming, IDEAL_AIM, 160 - windowTicks - 5, DT);
    expect(whiff.spent).toBe(true);
    expect(whiff.release).toBeNull();
  });

  it('touches at the contact tick after an early release, or right away after a late one', () => {
    const early = releaseTouch(incoming, IDEAL_AIM, 150, DT);
    expect(isTouchDue(early, 159)).toBe(false);
    expect(isTouchDue(early, 160)).toBe(true);

    const late = releaseTouch(incoming, IDEAL_AIM, 165, DT);
    expect(isTouchDue(late, 165)).toBe(true);
  });

  it('closes the window when nobody releases in time', () => {
    const closingTick = Math.ceil(160 + windowTicks) + 1;
    expect(hasWindowClosed(incoming, 160, DT)).toBe(false);
    expect(hasWindowClosed(incoming, closingTick, DT)).toBe(true);
    const released: IncomingTouch = releaseTouch(incoming, IDEAL_AIM, 158, DT);
    expect(hasWindowClosed(released, closingTick, DT)).toBe(false);
  });

  it('commits without an aim, then takes the aim once', () => {
    const committed = releaseTouch(incoming, null, 158, DT);
    expect(committed.release).toEqual({ tick: 158, aim: null });
    const aimed = chooseAim(committed, IDEAL_AIM);
    expect(aimed.release?.aim).toEqual(IDEAL_AIM);
    expect(chooseAim(aimed, { lateral: 1, force: 1 })).toBe(aimed);
    expect(chooseAim(incoming, IDEAL_AIM)).toBe(incoming);
  });

  it('holds the ball from contact until the hold limit', () => {
    const held = startHold(releaseTouch(incoming, null, 158, DT), 160);
    expect(held.holdStartTick).toBe(160);
    expect(startHold(held, 170)).toBe(held);
    const limitTicks = Math.ceil(AIM_HOLD_MAX_S / DT);
    expect(isHoldExpired(held, 160 + limitTicks - 1, DT)).toBe(false);
    expect(isHoldExpired(held, 160 + limitTicks, DT)).toBe(true);
    expect(isHoldExpired(incoming, 999, DT)).toBe(false);
  });
});
