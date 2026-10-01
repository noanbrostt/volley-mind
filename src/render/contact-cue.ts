import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { BALL_RADIUS_M } from '@config/ball';
import {
  CONTACT_CUE_COLOR_HEX,
  CONTACT_CUE_SHRINK_S,
  CONTACT_CUE_START_DIAMETER_M,
  CONTACT_CUE_THICKNESS_M,
} from '@config/court-scene';
import { SIMULATION_STEP_S } from '@config/simulation';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';

const CUE_TESSELLATION = 32;

/**
 * Timing aid for the player: a ring at their contact point that shrinks onto the ball
 * exactly at the ideal release moment. A visual cue, not a volleyball rule.
 */
export function createContactCue(scene: Scene): Mesh {
  const ring = CreateTorus(
    'contact-cue',
    { diameter: 1, thickness: CONTACT_CUE_THICKNESS_M, tessellation: CUE_TESSELLATION },
    scene,
  );
  // The torus lies flat; stand it up to face the camera behind the player.
  ring.rotation.x = Math.PI / 2;
  const material = new StandardMaterial('contact-cue-material', scene);
  material.emissiveColor = Color3.FromHexString(CONTACT_CUE_COLOR_HEX);
  material.disableLighting = true;
  ring.material = material;
  ring.isPickable = false;
  ring.setEnabled(false);
  return ring;
}

/** Shows and sizes the cue for the viewer's coming touch; writes in place, no allocation. */
export function syncContactCue(
  ring: Mesh,
  world: WorldState,
  viewerId: AthleteId,
  alpha: number,
): void {
  const { drill } = world;
  const incoming = drill.phase === 'rally' ? drill.incoming : null;
  const plan = incoming?.plan;
  const waiting =
    incoming && plan && incoming.athleteId === viewerId && !incoming.spent && !incoming.release;
  if (!waiting || !plan) {
    ring.setEnabled(false);
    return;
  }

  const secondsLeft = (incoming.contactTick - world.tick - alpha) * SIMULATION_STEP_S;
  const progress = Math.min(1, Math.max(0, secondsLeft / CONTACT_CUE_SHRINK_S));
  const ballDiameter = BALL_RADIUS_M * 2;
  const diameter = ballDiameter + (CONTACT_CUE_START_DIAMETER_M - ballDiameter) * progress;
  ring.scaling.set(diameter, diameter, diameter);
  ring.position.set(plan.contact.point.x, plan.contact.point.y, plan.contact.point.z);
  ring.setEnabled(true);
}
