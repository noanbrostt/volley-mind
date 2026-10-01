import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import type { Scene } from '@babylonjs/core/scene';
import { AIM_PATH_COLOR_HEX, AIM_PATH_POINTS } from '@config/court-scene';
import type { Vec3 } from '@core/vec3';
import { OVERLAY_RENDERING_GROUP } from './overlay-rendering-group';

export interface AimPath {
  /** Draws the predicted arc of the ball; an empty path hides it. */
  show(path: readonly Vec3[]): void;
  hide(): void;
}

/**
 * The aiming aid: the arc the ball would fly with the current aim. Babylon updates a line
 * in place only with the same point count, so the path is resampled into a fixed buffer.
 */
export function createAimPath(scene: Scene): AimPath {
  const buffer = Array.from({ length: AIM_PATH_POINTS }, () => Vector3.Zero());
  const lines: LinesMesh = CreateLines('aim-path', { points: buffer, updatable: true }, scene);
  lines.color = Color3.FromHexString(AIM_PATH_COLOR_HEX);
  lines.isPickable = false;
  lines.renderingGroupId = OVERLAY_RENDERING_GROUP;
  lines.setEnabled(false);

  return {
    show(path) {
      if (path.length < 2) {
        lines.setEnabled(false);
        return;
      }
      resample(path, buffer);
      CreateLines('aim-path', { points: buffer, instance: lines }, scene);
      lines.setEnabled(true);
    },
    hide() {
      lines.setEnabled(false);
    },
  };
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
    const target = buffer[i];
    if (!a || !b || !target) {
      continue;
    }
    target.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  }
}
