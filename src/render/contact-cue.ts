import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import {
  CONTACT_CUE_COLOR_HEX,
  CONTACT_CUE_HIT_ALPHA,
  CONTACT_CUE_HIT_DIAMETER_M,
  CONTACT_CUE_MIN_DIAMETER_M,
  CONTACT_CUE_SHRINK_S,
  CONTACT_CUE_START_DIAMETER_M,
  CONTACT_CUE_THICKNESS_M,
} from '@config/court-scene';
import { SIMULATION_STEP_S } from '@config/simulation';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';
import { OVERLAY_RENDERING_GROUP } from './overlay-rendering-group';

const CUE_TESSELLATION = 32;

/**
 * Timing aid for the player, as in rhythm games: a faint ring of fixed size marks the hit,
 * and the approach ring shrinks onto it exactly at the ideal moment (inside it means late).
 * A visual cue, not a volleyball rule.
 */
export interface ContactCue {
  readonly approach: Mesh;
  readonly hit: Mesh;
}

export function createContactCue(scene: Scene): ContactCue {
  const approach = createRing('contact-cue-approach', 1, scene);
  const hit = createRing('contact-cue-hit', CONTACT_CUE_HIT_ALPHA, scene);
  hit.scaling.set(
    CONTACT_CUE_HIT_DIAMETER_M,
    CONTACT_CUE_HIT_DIAMETER_M,
    CONTACT_CUE_HIT_DIAMETER_M,
  );
  return { approach, hit };
}

/** Shows and sizes the cue for the viewer's coming touch; writes in place, no allocation. */
export function syncContactCue(
  cue: ContactCue,
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
    cue.approach.setEnabled(false);
    cue.hit.setEnabled(false);
    return;
  }

  // 1 at the start of the shrink, 0 at the ideal moment, negative once late.
  const secondsLeft = (incoming.contactTick - world.tick - alpha) * SIMULATION_STEP_S;
  const progress = Math.min(1, secondsLeft / CONTACT_CUE_SHRINK_S);
  const diameter = Math.max(
    CONTACT_CUE_MIN_DIAMETER_M,
    CONTACT_CUE_HIT_DIAMETER_M +
      (CONTACT_CUE_START_DIAMETER_M - CONTACT_CUE_HIT_DIAMETER_M) * progress,
  );
  const { x, y, z } = plan.contact.point;
  cue.approach.scaling.set(diameter, diameter, diameter);
  cue.approach.position.set(x, y, z);
  cue.hit.position.set(x, y, z);
  cue.approach.setEnabled(true);
  cue.hit.setEnabled(true);
}

function createRing(name: string, alpha: number, scene: Scene): Mesh {
  const ring = CreateTorus(
    name,
    { diameter: 1, thickness: CONTACT_CUE_THICKNESS_M, tessellation: CUE_TESSELLATION },
    scene,
  );
  // The torus lies flat; stand it up to face the camera behind the player.
  ring.rotation.x = Math.PI / 2;
  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = Color3.FromHexString(CONTACT_CUE_COLOR_HEX);
  material.disableLighting = true;
  material.alpha = alpha;
  ring.material = material;
  ring.isPickable = false;
  // Drawn after the scene with depth cleared, so the athlete's body never hides it.
  ring.renderingGroupId = OVERLAY_RENDERING_GROUP;
  ring.setEnabled(false);
  return ring;
}
