import type { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { BALL_RADIUS_M } from '@config/ball';
import {
  BALL_COLOR_HEX,
  BALL_MESH_SEGMENTS,
  CEILING_LIGHT_INTENSITY,
  COURT_FLOOR_AREA_SIZE_M,
  COURT_FLOOR_COLOR_HEX,
  GYM_BACKGROUND_COLOR_HEX,
} from '@config/court-scene';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';
import { type AimPath, createAimPath } from './aim-path';
import { type AthleteViews, createAthleteViews } from './athlete-view';
import { createContactCue } from './contact-cue';
import { createOverShoulderCamera } from './over-shoulder-camera';

export interface CourtScene {
  readonly scene: Scene;
  readonly ball: Mesh;
  readonly athletes: AthleteViews;
  /** Timing ring for the viewer's coming touch. */
  readonly contactCue: Mesh;
  /** Predicted arc of the ball while the viewer aims. */
  readonly aimPath: AimPath;
}

/** Builds the court, the ball, the athletes and the camera behind the viewer's athlete. */
export function createCourtScene(
  engine: Engine,
  world: WorldState,
  viewerId: AthleteId,
): CourtScene {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromColor3(Color3.FromHexString(GYM_BACKGROUND_COLOR_HEX));

  const viewer = world.athletes.find((athlete) => athlete.id === viewerId);
  const partner = world.athletes.find((athlete) => athlete.id !== viewerId);
  if (!viewer || !partner) {
    throw new Error(`The court scene needs the viewer "${viewerId}" and a partner`);
  }
  createOverShoulderCamera(scene, viewer, partner);

  const light = new HemisphericLight('ceiling-light', Vector3.Up(), scene);
  light.intensity = CEILING_LIGHT_INTENSITY;

  const floor = CreateGround(
    'court-floor',
    { width: COURT_FLOOR_AREA_SIZE_M, height: COURT_FLOOR_AREA_SIZE_M },
    scene,
  );
  floor.material = flatMaterial('court-floor-material', COURT_FLOOR_COLOR_HEX, scene);

  const ball = CreateSphere(
    'ball',
    { diameter: BALL_RADIUS_M * 2, segments: BALL_MESH_SEGMENTS },
    scene,
  );
  ball.material = flatMaterial('ball-material', BALL_COLOR_HEX, scene);

  return {
    scene,
    ball,
    athletes: createAthleteViews(scene, world.athletes),
    contactCue: createContactCue(scene),
    aimPath: createAimPath(scene),
  };
}

function flatMaterial(name: string, colorHex: string, scene: Scene): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(colorHex);
  material.specularColor = Color3.Black();
  return material;
}
