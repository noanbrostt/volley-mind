import { ATHLETE_RETURN_WALK_SPEED_MPS } from '@config/athlete';
import { DRILL_RESTART_DELAY_S } from '@config/attack-defense-drill';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { moveAthleteToward, paceSpeed } from '@domain/athlete/move-athlete';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import { type BallBounce, stepBall } from '@domain/ball/step-ball';
import { selfToss } from '@domain/contact/self-toss';
import { nearestAthleteTo, reachableSpot } from '@domain/drills/attack-defense/drill-state';
import { applyTouchCommand, expectTouch, playDueTouch } from './touch-flow';
import type { WorldCommand } from './world-command';
import type { WorldEvent } from './world-event';
import { findAthlete, type WorldState } from './world-state';

export interface WorldStep {
  readonly world: WorldState;
  readonly events: readonly WorldEvent[];
}

/**
 * Advances the world by one fixed step: releases (player commands and the AI's own), the
 * drill restart, the touch itself, the athletes' footwork and finally the ball's flight.
 */
export function stepWorld(
  world: WorldState,
  commands: readonly WorldCommand[],
  dt: number,
): WorldStep {
  const now = world.tick;
  const events: WorldEvent[] = [];

  const aiCommands: WorldCommand[] = world.aiReleases
    .filter((release) => release.tick <= now)
    .map((release) => ({ type: 'touch', athleteId: release.athleteId, aim: release.aim }));
  let state: WorldState = {
    ...world,
    aiReleases: world.aiReleases.filter((release) => release.tick > now),
  };
  for (const command of [...commands, ...aiCommands]) {
    state = applyTouchCommand(state, command, now, dt, events);
  }
  state = restartIfDue(state, now, dt, events);
  state = playDueTouch(state, now, dt, events);
  state = { ...state, athletes: state.athletes.map((athlete) => footwork(state, athlete, dt)) };

  if (isBallHeld(state)) {
    // The ball rests in the toucher's hands while they aim.
    return { world: { ...state, tick: now + 1 }, events };
  }
  const ballStep = stepBall(state.ball, DEFAULT_BALL_PHYSICS, dt);
  state = { ...state, ball: ballStep.ball, tick: now + 1 };
  if (ballStep.bounce) {
    events.push({ type: 'ball-bounced', tick: state.tick, bounce: ballStep.bounce });
    if (state.drill.phase === 'rally') {
      state = breakLoop(state, ballStep.bounce, dt, events);
    }
  }
  return { world: state, events };
}

/** The athlete nearest the ball picks it up and tosses it to themselves to attack. */
function restartIfDue(
  world: WorldState,
  now: number,
  dt: number,
  events: WorldEvent[],
): WorldState {
  const { drill } = world;
  if (drill.phase !== 'broken' || now < drill.restart.tick) {
    return world;
  }
  const tosser = findAthlete(world, drill.restart.athleteId);
  if (!tosser) {
    return world;
  }
  events.push({ type: 'loop-restarted', tick: now, athleteId: tosser.id });
  const tossed: WorldState = { ...world, ball: selfToss(tosser, DEFAULT_BALL_PHYSICS, dt) };
  return expectTouch(tossed, tosser.id, 'attack', now, dt);
}

/** The ball touched the floor during a rally: the loop is broken. */
function breakLoop(
  world: WorldState,
  bounce: BallBounce,
  dt: number,
  events: WorldEvent[],
): WorldState {
  const restarter = nearestAthleteTo(world.athletes, bounce.groundPoint) ?? world.athletes[0];
  if (!restarter) {
    return world;
  }
  events.push({ type: 'loop-broken', tick: world.tick, restarterId: restarter.id });
  return {
    ...world,
    drill: {
      phase: 'broken',
      restart: {
        athleteId: restarter.id,
        tick: world.tick + Math.round(DRILL_RESTART_DELAY_S / dt),
      },
    },
    aiReleases: [],
  };
}

/**
 * Footwork in the drill (Noan): an athlete moves toward the ball only once it starts coming
 * to them, pacing themselves to be in place a little early when the ball is high. After a
 * touch, whoever went to fetch the ball walks back to base.
 */
function footwork(world: WorldState, current: AthleteState, dt: number): AthleteState {
  // After a dive the athlete stays down until the recovery ends (Noan: about 1 s).
  if (current.recovery && world.tick < current.recovery.untilTick) {
    return current;
  }
  const athlete: AthleteState = current.recovery ? { ...current, recovery: null } : current;
  // Going back to base is never urgent (Noan): a walk, not a run.
  const returnSpeed = ATHLETE_RETURN_WALK_SPEED_MPS;
  if (world.drill.phase === 'broken') {
    return moveAthleteToward(athlete, athlete.basePosition, dt, returnSpeed);
  }
  const { incoming } = world.drill;
  const plan = !incoming.spent && incoming.athleteId === athlete.id ? incoming.plan : null;
  if (!plan) {
    return moveAthleteToward(athlete, athlete.basePosition, dt, returnSpeed);
  }
  const spot = reachableSpot(athlete, plan.standPosition);
  const secondsLeft = (incoming.contactTick - world.tick) * dt - incoming.arrivalLeadS;
  const pace = paceSpeed(athlete, Vec3.distance(athlete.position, spot), secondsLeft);
  return moveAthleteToward(athlete, spot, dt, pace);
}

function isBallHeld(world: WorldState): boolean {
  return (
    world.drill.phase === 'rally' &&
    !world.drill.incoming.spent &&
    world.drill.incoming.holdStartTick !== null
  );
}
