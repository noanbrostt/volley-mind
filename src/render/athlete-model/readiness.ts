import {
  READY_BY_ACTION,
  READY_LEAD_S,
  READY_RAMP_S,
  RELAXED_READINESS,
} from '@config/athlete-gestures';
import type { AthleteId } from '@domain/athlete/athlete-state';
import { upcomingAction } from '@simulation/upcoming-action';
import type { WorldState } from '@simulation/world-state';

/**
 * How far into the ready stance an athlete should be now, 0–1 (Noan): as deep as their next
 * action asks for (a dig most); while the partner plays, relaxed at first and settling in as
 * the partner's touch nears. Nothing while the drill restarts.
 */
export function readinessAt(
  athleteId: AthleteId,
  world: WorldState,
  nowTick: number,
  stepSeconds: number,
): number {
  const next = upcomingAction(world, athleteId);
  if (!next || world.drill.phase !== 'rally') {
    return 0;
  }
  const level = READY_BY_ACTION[next];
  const { incoming } = world.drill;
  if (incoming.athleteId === athleteId) {
    return level;
  }
  const untilPartnerS = (incoming.contactTick - nowTick) * stepSeconds;
  const t = Math.min(1, Math.max(0, 1 - (untilPartnerS - READY_LEAD_S) / READY_RAMP_S));
  const settled = t * t * (3 - 2 * t);
  return RELAXED_READINESS + (level - RELAXED_READINESS) * settled;
}
