import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import {
  CAMERA_BEHIND_M,
  CAMERA_FOLLOW_SMOOTHING_S,
  CAMERA_HEIGHT_M,
  CAMERA_LOOK_HEIGHT_M,
  CAMERA_SHOULDER_OFFSET_M,
} from '@config/court-scene';
import type { AthleteId, AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';

export interface OverShoulderCamera {
  /** Eases the camera toward its spot behind the viewer and its aim at the partner. */
  update(world: WorldState, frameSeconds: number): void;
}

/**
 * Camera behind the viewer's athlete, over their right shoulder, looking at the partner.
 * It follows both smoothly, so an athlete stepping aside or diving stays in the frame. No
 * inputs: touches belong to the game.
 */
export function createOverShoulderCamera(
  scene: Scene,
  world: WorldState,
  viewerId: AthleteId,
): OverShoulderCamera {
  // Athletes keep their order in every world state, so their indices find them each frame
  // without searching (and without allocating).
  const viewerIndex = world.athletes.findIndex((athlete) => athlete.id === viewerId);
  const partnerIndex = world.athletes.findIndex((athlete) => athlete.id !== viewerId);
  const viewer = world.athletes[viewerIndex];
  const partner = world.athletes[partnerIndex];
  if (!viewer || !partner) {
    throw new Error(`The camera needs the viewer "${viewerId}" and a partner`);
  }
  const position = Vector3.Zero();
  const target = Vector3.Zero();
  const desiredPosition = Vector3.Zero();
  const desiredTarget = Vector3.Zero();

  placeBehind(viewer, desiredPosition);
  position.copyFrom(desiredPosition);
  lookAt(partner, target);
  const camera = new FreeCamera('over-shoulder-camera', position.clone(), scene);
  camera.setTarget(target);
  camera.inputs.clear();

  return {
    update(current, frameSeconds) {
      const currentViewer = current.athletes[viewerIndex];
      const currentPartner = current.athletes[partnerIndex];
      if (!currentViewer || !currentPartner) {
        return;
      }
      placeBehind(currentViewer, desiredPosition);
      lookAt(currentPartner, desiredTarget);
      const blend = 1 - Math.exp(-frameSeconds / CAMERA_FOLLOW_SMOOTHING_S);
      ease(position, desiredPosition, blend);
      ease(target, desiredTarget, blend);
      camera.position.copyFrom(position);
      camera.setTarget(target);
    },
  };
}

/** Same convention as the domain: forward (sin, 0, cos), right (cos, 0, -sin). */
function placeBehind(athlete: AthleteState, out: Vector3): void {
  const sin = Math.sin(athlete.facing);
  const cos = Math.cos(athlete.facing);
  out.set(
    athlete.position.x - sin * CAMERA_BEHIND_M + cos * CAMERA_SHOULDER_OFFSET_M,
    CAMERA_HEIGHT_M,
    athlete.position.z - cos * CAMERA_BEHIND_M - sin * CAMERA_SHOULDER_OFFSET_M,
  );
}

function lookAt(athlete: AthleteState, out: Vector3): void {
  out.set(athlete.position.x, CAMERA_LOOK_HEIGHT_M, athlete.position.z);
}

function ease(current: Vector3, desired: Vector3, blend: number): void {
  current.set(
    current.x + (desired.x - current.x) * blend,
    current.y + (desired.y - current.y) * blend,
    current.z + (desired.z - current.z) * blend,
  );
}
