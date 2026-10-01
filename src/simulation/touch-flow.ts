import { ATHLETE_ARRIVAL_LEAD_MAX_S, ATHLETE_ARRIVAL_LEAD_MIN_S } from '@config/athlete';
import { nextRange } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { decideAiTouch } from '@domain/ai/decide-touch';
import type { AthleteId } from '@domain/athlete/athlete-state';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import type { Action } from '@domain/contact/action';
import {
  createIncomingTouch,
  hasWindowClosed,
  isTouchDue,
  releaseTouch,
  timingErrorAt,
} from '@domain/contact/incoming-touch';
import { planTouch } from '@domain/contact/plan-touch';
import { resolveTouch } from '@domain/contact/resolve-touch';
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

/** A toucher lets go. Only the expected toucher counts, and only once per ball. */
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
  const incoming = releaseTouch(drill.incoming, command.aim, nowTick, dt);
  if (incoming.spent && !drill.incoming.spent) {
    const reason = timingErrorAt(drill.incoming, nowTick, dt) < 0 ? 'early' : 'late';
    events.push({ type: 'touch-missed', tick: nowTick, athleteId: command.athleteId, reason });
  }
  return { ...world, drill: { phase: 'rally', incoming } };
}

/**
 * Plays the expected touch when it is due: judge its quality, send the ball to the partner
 * and expect the partner's touch. If nobody released in time, the chance is gone.
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
  const receiver = partnerOf(world.athletes, incoming.athleteId);
  const { plan, release } = incoming;
  if (!isTouchDue(incoming, nowTick) || !toucher || !receiver || !plan || !release) {
    return world;
  }

  const positionErrorM = Vec3.distance(toucher.position, plan.standPosition);
  if (!isWithinReach(positionErrorM)) {
    // Touches are rules, but the athlete still has to be there: the ball goes by.
    events.push({
      type: 'touch-missed',
      tick: nowTick,
      athleteId: incoming.athleteId,
      reason: 'out-of-reach',
    });
    return { ...world, drill: { phase: 'rally', incoming: { ...incoming, spent: true } } };
  }
  const timingErrorS = timingErrorAt(incoming, release.tick, dt);
  const quality = touchQuality(
    toucher.attributes,
    incoming.action,
    plan.technique,
    plan.hardReasons.length > 0,
    { timingErrorS, positionErrorM, aim: release.aim },
  );
  const resolution = resolveTouch({
    contactPosition: world.ball.position,
    toucher,
    receiver,
    action: incoming.action,
    technique: plan.technique,
    aim: release.aim,
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
