import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { AnimatorAvatar } from '@babylonjs/core/Animations/animatorAvatar';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import {
  ATHLETE_ANIMATIONS_FILE,
  ATHLETE_MODEL_FILES,
  ATHLETE_MODELS_FOLDER,
  JERSEY_MATERIAL_NAME,
} from '@config/athlete-model';
import { ATHLETE_COLORS_HEX } from '@config/court-scene';
import { RIG_BONE_NAMES } from './rig-bone-names';

/** The clips move the hips (crouching, jumping); scaled to each model's proportions. */
const RETARGET_ROOT_BONE = 'pelvis';
/** A toe: how far the hips sit above it tells each model's leg length. */
const RETARGET_GROUND_BONE = 'ball_l';

/** A character in the scene, in its rest pose, with every generic clip retargeted to it. */
export interface AthleteModel {
  /** Top node of the model; its feet are at its origin and it looks toward +z. */
  readonly root: TransformNode;
  /** Standing height of the model as modeled, in m. */
  readonly heightM: number;
  /** Retargeted clips by their name in the animations file. Stopped. */
  readonly clips: ReadonlyMap<string, AnimationGroup>;
}

/**
 * Loads one model per athlete (in world order) and the shared clips. The glTF loader is
 * downloaded here, on demand, so the game starts without waiting for it.
 */
export async function loadAthleteModels(scene: Scene, baseUrl: string): Promise<AthleteModel[]> {
  const [{ GLTFLoaderAnimationStartMode }] = await Promise.all([
    import('@babylonjs/loaders/glTF/glTFFileLoader'),
    import('@babylonjs/loaders/glTF/2.0/glTFLoader'),
    import('@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp'),
  ]);
  const options = {
    pluginOptions: { gltf: { animationStartMode: GLTFLoaderAnimationStartMode.NONE } },
  };
  const folder = `${baseUrl}${ATHLETE_MODELS_FOLDER}`;
  const [animations, ...characters] = await Promise.all(
    [ATHLETE_ANIMATIONS_FILE, ...ATHLETE_MODEL_FILES].map((file) =>
      LoadAssetContainerAsync(`${folder}${file}`, scene, options),
    ),
  );
  if (!animations) {
    throw new Error('The animations file did not load');
  }
  try {
    return characters.map((character, index) =>
      setUpModel(
        character,
        animations.animationGroups,
        `athlete-model-${index}`,
        ATHLETE_COLORS_HEX[index],
      ),
    );
  } finally {
    // The retargeted copies no longer need the source skeleton or clips.
    animations.dispose();
  }
}

function setUpModel(
  character: AssetContainer,
  sourceClips: readonly AnimationGroup[],
  name: string,
  jerseyColorHex: string | undefined,
): AthleteModel {
  character.addAllToScene();
  if (jerseyColorHex) {
    tintJersey(character, jerseyColorHex);
  }
  const root = character.rootNodes.find((node) => node instanceof TransformNode);
  if (!(root instanceof TransformNode)) {
    throw new Error(`Model ${name} has no root node`);
  }
  root.name = name;
  const { min, max } = root.getHierarchyBoundingVectors();

  // Retarget while the model still stands at the origin in its rest pose.
  const avatar = new AnimatorAvatar(name, root);
  const clips = new Map<string, AnimationGroup>();
  for (const source of sourceClips) {
    const clip = avatar.retargetAnimationGroup(source, {
      animationGroupName: `${name}-${source.name}`,
      mapNodeNames: new Map(RIG_BONE_NAMES),
      rootNodeName: RETARGET_ROOT_BONE,
      groundReferenceNodeName: RETARGET_GROUND_BONE,
    });
    clips.set(source.name, clip);
  }
  return { root, heightM: max.y - min.y, clips };
}

/** Each model has its own jersey material, so tinting one leaves the other alone. */
function tintJersey(character: AssetContainer, colorHex: string): void {
  for (const material of character.materials) {
    if (material instanceof PBRMaterial && material.name === JERSEY_MATERIAL_NAME) {
      // glTF colors are linear; the hex value is how it should look on screen.
      material.albedoColor = Color3.FromHexString(colorHex).toLinearSpace();
    }
  }
}
