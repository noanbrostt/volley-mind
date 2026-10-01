import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import {
  AIM_PATH_COLOR_HEX,
  AIM_PATH_HIDDEN_ALPHA,
  AIM_PATH_POINTS,
  AIM_TARGET_DIAMETER_M,
  AIM_TARGET_REACHABLE_COLOR_HEX,
  AIM_TARGET_THICKNESS_M,
  AIM_TARGET_UNREACHABLE_COLOR_HEX,
} from '@config/court-scene';
import type { Vec3 } from '@core/vec3';
import type { TouchPreview } from '@simulation/touch-flow';
import { OVERLAY_RENDERING_GROUP } from './overlay-rendering-group';

const TARGET_TESSELLATION = 32;

export interface AimPath {
  /** Draws the predicted arc and the target on the partner; null hides them. */
  show(preview: TouchPreview | null): void;
  hide(): void;
}

/**
 * The aiming aid. The arc is drawn twice: normally (hidden where something stands in front)
 * and faintly on top, so a stretch behind the partner reads as behind. A ring marks where
 * the partner would meet the ball: green when they can play it, red when they cannot.
 */
export function createAimPath(scene: Scene): AimPath {
  // Babylon updates a line in place only with the same point count: resample into a buffer.
  const buffer = Array.from({ length: AIM_PATH_POINTS }, () => Vector3.Zero());
  const color = Color3.FromHexString(AIM_PATH_COLOR_HEX);
  const solid = createLine('aim-path', buffer, color, scene);
  const ghost = createLine('aim-path-hidden', buffer, color, scene);
  ghost.alpha = AIM_PATH_HIDDEN_ALPHA;
  ghost.renderingGroupId = OVERLAY_RENDERING_GROUP;

  const target = CreateTorus(
    'aim-target',
    {
      diameter: AIM_TARGET_DIAMETER_M,
      thickness: AIM_TARGET_THICKNESS_M,
      tessellation: TARGET_TESSELLATION,
    },
    scene,
  );
  // Stand the ring up, facing back toward the player's camera.
  target.rotation.x = Math.PI / 2;
  const targetMaterial = new StandardMaterial('aim-target-material', scene);
  targetMaterial.disableLighting = true;
  target.material = targetMaterial;
  target.isPickable = false;
  target.renderingGroupId = OVERLAY_RENDERING_GROUP;
  const reachableColor = Color3.FromHexString(AIM_TARGET_REACHABLE_COLOR_HEX);
  const unreachableColor = Color3.FromHexString(AIM_TARGET_UNREACHABLE_COLOR_HEX);

  const hide = (): void => {
    solid.setEnabled(false);
    ghost.setEnabled(false);
    target.setEnabled(false);
  };
  hide();

  return {
    show(preview) {
      if (!preview || preview.path.length < 2) {
        hide();
        return;
      }
      resample(preview.path, buffer);
      CreateLines('aim-path', { points: buffer, instance: solid }, scene);
      CreateLines('aim-path-hidden', { points: buffer, instance: ghost }, scene);
      solid.setEnabled(true);
      ghost.setEnabled(true);
      showTarget(target, targetMaterial, preview, reachableColor, unreachableColor);
    },
    hide,
  };
}

function createLine(name: string, points: Vector3[], color: Color3, scene: Scene): LinesMesh {
  const lines = CreateLines(name, { points, updatable: true }, scene);
  lines.color = color;
  lines.isPickable = false;
  return lines;
}

function showTarget(
  target: Mesh,
  material: StandardMaterial,
  preview: TouchPreview,
  reachableColor: Color3,
  unreachableColor: Color3,
): void {
  if (!preview.target) {
    target.setEnabled(false);
    return;
  }
  const { point, reachable } = preview.target;
  target.position.set(point.x, point.y, point.z);
  material.emissiveColor = reachable ? reachableColor : unreachableColor;
  target.setEnabled(true);
}

/** Spreads `path` evenly (by index) over the fixed buffer, interpolating between points. */
function resample(path: readonly Vec3[], buffer: Vector3[]): void {
  const last = path.length - 1;
  for (let i = 0; i < buffer.length; i++) {
    const at = (i / (buffer.length - 1)) * last;
    const index = Math.min(Math.floor(at), last - 1);
    const t = at - index;
    const a = path[index];
    const b = path[index + 1];
    const point = buffer[i];
    if (!a || !b || !point) {
      continue;
    }
    point.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  }
}
