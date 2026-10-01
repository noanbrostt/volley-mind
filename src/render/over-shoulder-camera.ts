import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import {
  CAMERA_BEHIND_M,
  CAMERA_HEIGHT_M,
  CAMERA_LOOK_HEIGHT_M,
  CAMERA_SHOULDER_OFFSET_M,
} from '@config/court-scene';
import type { AthleteState } from '@domain/athlete/athlete-state';

/**
 * Fixed camera behind the viewer's athlete, over their right shoulder, looking at the
 * partner. No inputs: touches belong to the game.
 */
export function createOverShoulderCamera(
  scene: Scene,
  viewer: AthleteState,
  partner: AthleteState,
): FreeCamera {
  // Same convention as the domain: forward (sin, 0, cos), right (cos, 0, -sin).
  const sin = Math.sin(viewer.facing);
  const cos = Math.cos(viewer.facing);
  const position = new Vector3(
    viewer.basePosition.x - sin * CAMERA_BEHIND_M + cos * CAMERA_SHOULDER_OFFSET_M,
    CAMERA_HEIGHT_M,
    viewer.basePosition.z - cos * CAMERA_BEHIND_M - sin * CAMERA_SHOULDER_OFFSET_M,
  );

  const camera = new FreeCamera('over-shoulder-camera', position, scene);
  camera.setTarget(
    new Vector3(partner.basePosition.x, CAMERA_LOOK_HEIGHT_M, partner.basePosition.z),
  );
  camera.inputs.clear();
  return camera;
}
