import type { AthleteId } from '@domain/athlete/athlete-state';
import type { Action } from '@domain/contact/action';
import { nextActionAfter } from '@domain/drills/attack-defense/drill-state';
import type { WorldState } from './world-state';

/**
 * The action an athlete plays next in the rally: their own coming touch, or the one that
 * follows the partner's. Null while the drill restarts.
 */
export function upcomingAction(world: WorldState, athleteId: AthleteId): Action | null {
  if (world.drill.phase !== 'rally') {
    return null;
  }
  const { incoming } = world.drill;
  return incoming.athleteId === athleteId ? incoming.action : nextActionAfter(incoming.action);
}
