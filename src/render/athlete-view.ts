import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import {
  ATHLETE_BODY_RADIUS_M,
  ATHLETE_COLORS_HEX,
  ATHLETE_HEAD_RADIUS_M,
  ATHLETE_MESH_TESSELLATION,
} from '@config/court-scene';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';

/** One root node per athlete, standing at the feet; body and head hang from it. */
export type AthleteViews = readonly TransformNode[];

const FALLBACK_COLOR_HEX = '#cccccc';

export function createAthleteViews(scene: Scene, athletes: readonly AthleteState[]): AthleteViews {
  return athletes.map((athlete, index) =>
    createAthleteView(scene, athlete, ATHLETE_COLORS_HEX[index] ?? FALLBACK_COLOR_HEX),
  );
}

/**
 * Places every athlete between the last two simulation states. Athletes keep the same
 * order in every state, so views match by index; writes in place, allocating nothing.
 */
export function syncAthleteViews(
  views: AthleteViews,
  previous: WorldState,
  current: WorldState,
  alpha: number,
): void {
  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const from = previous.athletes[i];
    const to = current.athletes[i];
    if (!view || !from || !to) {
      continue;
    }
    view.position.set(
      from.position.x + (to.position.x - from.position.x) * alpha,
      0,
      from.position.z + (to.position.z - from.position.z) * alpha,
    );
    // Babylon's yaw matches the domain's: facing 0 looks toward +z with +x on the right.
    view.rotation.y = to.facing;
  }
}

function createAthleteView(scene: Scene, athlete: AthleteState, colorHex: string): TransformNode {
  const root = new TransformNode(`athlete-${athlete.id}`, scene);
  const material = new StandardMaterial(`athlete-${athlete.id}-material`, scene);
  material.diffuseColor = Color3.FromHexString(colorHex);
  material.specularColor = Color3.Black();

  const bodyHeight = athlete.heightM - ATHLETE_HEAD_RADIUS_M * 2;
  const body = CreateCapsule(
    `athlete-${athlete.id}-body`,
    { height: bodyHeight, radius: ATHLETE_BODY_RADIUS_M, tessellation: ATHLETE_MESH_TESSELLATION },
    scene,
  );
  body.position.y = bodyHeight / 2;
  body.material = material;
  body.parent = root;

  const head = CreateSphere(
    `athlete-${athlete.id}-head`,
    { diameter: ATHLETE_HEAD_RADIUS_M * 2, segments: ATHLETE_MESH_TESSELLATION },
    scene,
  );
  head.position.y = bodyHeight + ATHLETE_HEAD_RADIUS_M;
  head.material = material;
  head.parent = root;

  root.position.set(athlete.position.x, 0, athlete.position.z);
  root.rotation.y = athlete.facing;
  return root;
}
