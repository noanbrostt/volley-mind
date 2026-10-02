import {
  READY_LEAD_S,
  READY_RAMP_S,
  READY_WHILE_PARTNER,
  RELAXED_READINESS,
} from '@config/athlete-gestures';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';

/**
 * How far into the ready stance an athlete should be now, 0–1 (Noan): fully when the ball
 * is theirs; while the partner plays, relaxed at first and settling in as the partner's touch
 * nears, as much as what comes next asks for. Nothing while the drill restarts.
 */
export function readinessAt(
  athleteId: AthleteId,
  world: WorldState,
  nowTick: number,
  stepSeconds: number,
): number {
  const { drill } = world;
  if (drill.phase !== 'rally') {
    return 0;
  }
  const { incoming } = drill;
  if (incoming.athleteId === athleteId) {
    return 1;
  }
  const level = READY_WHILE_PARTNER[incoming.action];
  const untilPartnerS = (incoming.contactTick - nowTick) * stepSeconds;
  const t = Math.min(1, Math.max(0, 1 - (untilPartnerS - READY_LEAD_S) / READY_RAMP_S));
  const settled = t * t * (3 - 2 * t);
  return RELAXED_READINESS + (level - RELAXED_READINESS) * settled;
}
