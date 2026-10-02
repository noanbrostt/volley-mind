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
import {
  type AnimationFrame,
  type AthleteAnimator,
  createAthleteAnimator,
} from './athlete-model/athlete-animator';
import type { AthleteModel } from './athlete-model/load-athlete-models';

/**
 * One view per athlete: the root stands at the feet and turns with the athlete; the pose
 * node under it tilts the body down to lie on the floor after a dive. A simple capsule
 * stands in until the 3D model has loaded.
 */
export interface AthleteView {
  readonly root: TransformNode;
  readonly pose: TransformNode;
  readonly placeholder: TransformNode;
  animator: AthleteAnimator | null;
}

export type AthleteViews = readonly AthleteView[];

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
    view.root.position.set(
      from.position.x + (to.position.x - from.position.x) * alpha,
      0,
      from.position.z + (to.position.z - from.position.z) * alpha,
    );
    const { recovery } = to;
    if (recovery) {
      // Lying stretched out along the dive: turn toward it and tip the body forward.
      view.root.rotation.y = Math.atan2(recovery.direction.x, recovery.direction.z);
      view.pose.rotation.x = Math.PI / 2;
      view.pose.position.y = ATHLETE_BODY_RADIUS_M;
    } else {
      // Babylon's yaw matches the domain's: facing 0 looks toward +z with +x on the right.
      view.root.rotation.y = to.facing;
      view.pose.rotation.x = 0;
      view.pose.position.y = 0;
    }
  }
}

/**
 * Swaps the capsule for the 3D model, scaled to the athlete's height. Views and models are
 * both in world order.
 */
export function dressAthleteViews(
  views: AthleteViews,
  models: readonly AthleteModel[],
  athletes: readonly AthleteState[],
): void {
  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const model = models[i];
    const athlete = athletes[i];
    if (!view || !model || !athlete) {
      continue;
    }
    model.root.parent = view.pose;
    // Scaling keeps the sign of the loader's handedness flip.
    model.root.scaling.scaleInPlace(athlete.heightM / model.heightM);
    view.placeholder.setEnabled(false);
    view.animator = createAthleteAnimator(model);
  }
}

/** Plays each model's clips for what its athlete is doing now. */
export function animateAthleteViews(
  views: AthleteViews,
  current: WorldState,
  frame: AnimationFrame,
): void {
  for (let i = 0; i < views.length; i++) {
    const athlete = current.athletes[i];
    if (athlete) {
      views[i]?.animator?.update(athlete, current, frame);
    }
  }
}

function createAthleteView(scene: Scene, athlete: AthleteState, colorHex: string): AthleteView {
  const root = new TransformNode(`athlete-${athlete.id}`, scene);
  const pose = new TransformNode(`athlete-${athlete.id}-pose`, scene);
  pose.parent = root;
  const placeholder = new TransformNode(`athlete-${athlete.id}-placeholder`, scene);
  placeholder.parent = pose;
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
  body.parent = placeholder;

  const head = CreateSphere(
    `athlete-${athlete.id}-head`,
    { diameter: ATHLETE_HEAD_RADIUS_M * 2, segments: ATHLETE_MESH_TESSELLATION },
    scene,
  );
  head.position.y = bodyHeight + ATHLETE_HEAD_RADIUS_M;
  head.material = material;
  head.parent = placeholder;

  root.position.set(athlete.position.x, 0, athlete.position.z);
  root.rotation.y = athlete.facing;
  return { root, pose, placeholder, animator: null };
}
