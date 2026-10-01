import { ATHLETE_ARRIVAL_LEAD_MAX_S, ATHLETE_ARRIVAL_LEAD_MIN_S } from '@config/athlete';
import { PREVIEW_PATH_MAX_S, PREVIEW_SAMPLE_EVERY_STEPS } from '@config/touch-control';
import { nextRange } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { decideAiTouch } from '@domain/ai/decide-touch';
import type { AthleteId } from '@domain/athlete/athlete-state';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { stepBall } from '@domain/ball/step-ball';
import type { Action } from '@domain/contact/action';
import {
  aimDeadlineTick,
  chooseAim,
  createIncomingTouch,
  hasWindowClosed,
  isHoldExpired,
  isTouchDue,
  releaseTouch,
  startHold,
  timingErrorAt,
} from '@domain/contact/incoming-touch';
import { planTouch } from '@domain/contact/plan-touch';
import { resolveTouch } from '@domain/contact/resolve-touch';
import { NO_AIM, type TouchAim } from '@domain/contact/touch-aim';
import { isWithinReach, touchQuality } from '@domain/contact/touch-quality';
import { nextActionAfter, partnerOf } from '@domain/drills/attack-defense/drill-state';
import type { WorldCommand } from './world-command';
import type { WorldEvent } from './world-event';
import { findAthlete, type WorldState } from './world-state';

const physics = DEFAULT_BALL_PHYSICS;

/**
 * The ball is on its way to `athleteId`: plan how they will play it. An AI athlete decides
 * right away when it will release, and that release later arrives as a normal touch command.
 */
export function expectTouch(
  world: WorldState,
  athleteId: AthleteId,
  action: Action,
  nowTick: number,
  dt: number,
): WorldState {
  const athlete = findAthlete(world, athleteId);
  if (!athlete) {
    return world;
  }
  const plan = planTouch(athlete, action, world.ball, physics, dt);
  // A fresh arrival lead for every ball, so nobody gets under it the same way twice.
  const lead = nextRange(world.rng, ATHLETE_ARRIVAL_LEAD_MIN_S, ATHLETE_ARRIVAL_LEAD_MAX_S);
  const incoming = createIncomingTouch(athleteId, action, plan, nowTick, dt, lead.value);
  const expecting: WorldState = { ...world, drill: { phase: 'rally', incoming }, rng: lead.next };
  if (!plan || !world.aiAthleteIds.includes(athleteId)) {
    return expecting;
  }
  const decision = decideAiTouch(athlete, action, expecting.rng);
  return {
    ...expecting,
    rng: decision.rng,
    aiReleases: [
      ...world.aiReleases.filter((release) => release.athleteId !== athleteId),
      {
        athleteId,
        tick: Math.round(incoming.contactTick + decision.releaseOffsetS / dt),
        aim: decision.aim,
      },
    ],
  };
}

/**
 * A toucher commits to the touch (with or without an aim) or, having committed, chooses the
 * aim. Only the expected toucher counts, and only once per ball.
 */
export function applyTouchCommand(
  world: WorldState,
  command: WorldCommand,
  nowTick: number,
  dt: number,
  events: WorldEvent[],
): WorldState {
  const { drill } = world;
  if (drill.phase !== 'rally' || drill.incoming.athleteId !== command.athleteId) {
    return world;
  }
  if (command.type === 'aim') {
    return {
      ...world,
      drill: { phase: 'rally', incoming: chooseAim(drill.incoming, command.aim, command.final) },
    };
  }
  const incoming = releaseTouch(drill.incoming, command.aim ?? null, nowTick, dt);
  if (incoming.spent && !drill.incoming.spent) {
    const reason = timingErrorAt(drill.incoming, nowTick, dt) < 0 ? 'early' : 'late';
    events.push({ type: 'touch-missed', tick: nowTick, athleteId: command.athleteId, reason });
  }
  return { ...world, drill: { phase: 'rally', incoming } };
}

/**
 * Plays the expected touch when it is due. The athlete must be there at contact; then the
 * ball leaves at once if the aim is known, or rests in the hands until it is (or until the
 * hold limit, leaving with the ideal aim). If nobody committed in time, the chance is gone.
 */
export function playDueTouch(
  world: WorldState,
  nowTick: number,
  dt: number,
  events: WorldEvent[],
): WorldState {
  const { drill } = world;
  if (drill.phase !== 'rally') {
    return world;
  }
  const { incoming } = drill;
  if (hasWindowClosed(incoming, nowTick, dt)) {
    events.push({
      type: 'touch-missed',
      tick: nowTick,
      athleteId: incoming.athleteId,
      reason: 'no-release',
    });
    return { ...world, drill: { phase: 'rally', incoming: { ...incoming, spent: true } } };
  }
  const toucher = findAthlete(world, incoming.athleteId);
  const { plan, release } = incoming;
  if (!isTouchDue(incoming, nowTick) || !toucher || !plan || !release) {
    return world;
  }

  if (incoming.holdStartTick === null) {
    // Touches are rules, but the athlete still has to be there at contact.
    if (!isWithinReach(Vec3.distance(toucher.position, plan.standPosition))) {
      events.push({
        type: 'touch-missed',
        tick: nowTick,
        athleteId: incoming.athleteId,
        reason: 'out-of-reach',
      });
      return { ...world, drill: { phase: 'rally', incoming: { ...incoming, spent: true } } };
    }
    if (!release.aimConfirmed) {
      return { ...world, drill: { phase: 'rally', incoming: startHold(incoming, nowTick) } };
    }
  }

  // A confirmed aim sends the ball; when time runs out it leaves with the aim so far.
  if (release.aimConfirmed && release.aim) {
    return sendBall(world, release.aim, nowTick, dt, events);
  }
  return isHoldExpired(incoming, nowTick, dt)
    ? sendBall(world, release.aim ?? NO_AIM, nowTick, dt, events)
    : world;
}

/**
 * The arc the ball would fly if it left now with `aim`, without the scatter of imperfect
 * quality: the aiming aid shown to the player. Empty when `athleteId` has no committed touch.
 */
export function previewTouchPath(
  world: WorldState,
  athleteId: AthleteId,
  aim: TouchAim,
  dt: number,
): readonly Vec3[] {
  const { drill } = world;
  if (drill.phase !== 'rally' || drill.incoming.athleteId !== athleteId) {
    return [];
  }
  const { incoming } = drill;
  const toucher = findAthlete(world, athleteId);
  const receiver = partnerOf(world.athletes, athleteId);
  if (incoming.spent || !incoming.release || !incoming.plan || !toucher || !receiver) {
    return [];
  }
  const contactPosition =
    incoming.holdStartTick !== null ? world.ball.position : incoming.plan.contact.point;
  const { velocity } = resolveTouch({
    contactPosition,
    toucher,
    receiver,
    action: incoming.action,
    technique: incoming.plan.technique,
    aim,
    quality: 1,
    physics,
    stepSeconds: dt,
    rng: world.rng,
  });

  const points: Vec3[] = [contactPosition];
  let ball: BallState = { position: contactPosition, velocity };
  const maxSteps = Math.round(PREVIEW_PATH_MAX_S / dt);
  for (let step = 1; step <= maxSteps; step++) {
    const result = stepBall(ball, physics, dt);
    ball = result.ball;
    if (result.bounce || step % PREVIEW_SAMPLE_EVERY_STEPS === 0) {
      points.push(ball.position);
    }
    if (result.bounce) {
      break;
    }
  }
  return points;
}

/** The ball leaves the hands: judge the touch, send the ball and expect the partner's touch. */
function sendBall(
  world: WorldState,
  aim: TouchAim,
  nowTick: number,
  dt: number,
  events: WorldEvent[],
): WorldState {
  const { drill } = world;
  if (drill.phase !== 'rally') {
    return world;
  }
  const { incoming } = drill;
  const toucher = findAthlete(world, incoming.athleteId);
  const receiver = partnerOf(world.athletes, incoming.athleteId);
  const { plan, release } = incoming;
  if (!toucher || !receiver || !plan || !release) {
    return world;
  }
  const timingErrorS = timingErrorAt(incoming, release.tick, dt);
  const quality = touchQuality(
    toucher.attributes,
    incoming.action,
    plan.technique,
    plan.hardReasons.length > 0,
    {
      timingErrorS,
      positionErrorM: Vec3.distance(toucher.position, plan.standPosition),
      aim,
    },
  );
  const resolution = resolveTouch({
    contactPosition: world.ball.position,
    toucher,
    receiver,
    action: incoming.action,
    technique: plan.technique,
    aim,
    quality,
    physics,
    stepSeconds: dt,
    rng: world.rng,
  });
  events.push({
    type: 'ball-touched',
    tick: nowTick,
    athleteId: toucher.id,
    action: incoming.action,
    technique: plan.technique,
    quality,
    timingErrorS,
    badBallReasons: plan.badBallReasons,
  });

  const touched: WorldState = {
    ...world,
    ball: { position: world.ball.position, velocity: resolution.velocity },
    rng: resolution.rng,
  };
  return expectTouch(touched, receiver.id, nextActionAfter(incoming.action), nowTick, dt);
}

/** Whether `athleteId` has committed to a touch and the ball now waits for their aim. */
export function isAwaitingAim(world: WorldState, athleteId: AthleteId): boolean {
  const { drill } = world;
  return (
    drill.phase === 'rally' &&
    drill.incoming.athleteId === athleteId &&
    !drill.incoming.spent &&
    drill.incoming.release !== null &&
    !drill.incoming.release.aimConfirmed
  );
}

export interface AimTime {
  /** Game seconds left before the ball leaves with the aim so far. */
  readonly remainingS: number;
  /** Game seconds the toucher had to aim, from the commit. */
  readonly totalS: number;
}

/** How long `athleteId` still has to aim, for the countdown; null when not aiming. */
export function aimTimeLeft(world: WorldState, athleteId: AthleteId, dt: number): AimTime | null {
  if (!isAwaitingAim(world, athleteId) || world.drill.phase !== 'rally') {
    return null;
  }
  const { incoming } = world.drill;
  const deadline = aimDeadlineTick(incoming, dt);
  if (deadline === null || !incoming.release) {
    return null;
  }
  return {
    remainingS: Math.max(0, (deadline - world.tick) * dt),
    totalS: (deadline - incoming.release.tick) * dt,
  };
}
