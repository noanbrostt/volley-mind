import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import {
  AIM_PATH_COLOR_HEX,
  AIM_PATH_HIDDEN_ALPHA,
  AIM_PATH_POINTS,
  AIM_RIPPLE_COLOR_HEX,
  AIM_RIPPLE_COUNT,
  AIM_RIPPLE_MAX_ALPHA,
  AIM_RIPPLE_MAX_DIAMETER_M,
  AIM_RIPPLE_MIN_DIAMETER_M,
  AIM_RIPPLE_PERIOD_S,
  AIM_RIPPLE_THICKNESS_M,
} from '@config/court-scene';
import type { Vec3 } from '@core/vec3';
import type { TouchPreview } from '@simulation/touch-flow';
import { OVERLAY_RENDERING_GROUP } from './overlay-rendering-group';

const RIPPLE_TESSELLATION = 32;

export interface AimPath {
  /** Draws the predicted arc and the impact ripples; null hides them. */
  show(preview: TouchPreview | null): void;
  hide(): void;
  /** Advances the ripple animation; call once per frame with the real frame time. */
  animate(frameSeconds: number): void;
}

interface Ripple {
  readonly ring: Mesh;
  readonly material: StandardMaterial;
}

/**
 * The aiming aid. The arc is drawn twice: normally (hidden where something stands in front)
 * and faintly on top, so a stretch behind the partner reads as behind. Where the ball would
 * hit — the partner, or else the floor — ripples spread on that surface.
 */
export function createAimPath(scene: Scene): AimPath {
  // Babylon updates a line in place only with the same point count: resample into a buffer.
  const buffer = Array.from({ length: AIM_PATH_POINTS }, () => Vector3.Zero());
  const color = Color3.FromHexString(AIM_PATH_COLOR_HEX);
  const solid = createLine('aim-path', buffer, color, scene);
  const ghost = createLine('aim-path-hidden', buffer, color, scene);
  ghost.alpha = AIM_PATH_HIDDEN_ALPHA;
  ghost.renderingGroupId = OVERLAY_RENDERING_GROUP;

  const impact = new TransformNode('aim-impact', scene);
  const rippleColor = Color3.FromHexString(AIM_RIPPLE_COLOR_HEX);
  const ripples = Array.from({ length: AIM_RIPPLE_COUNT }, (_, i) =>
    createRipple(`aim-ripple-${i}`, impact, rippleColor, scene),
  );
  let clock = 0;

  const hide = (): void => {
    solid.setEnabled(false);
    ghost.setEnabled(false);
    impact.setEnabled(false);
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
      if (!preview.impact) {
        impact.setEnabled(false);
        return;
      }
      const { point, surface } = preview.impact;
      impact.position.set(point.x, point.y, point.z);
      // Tori lie flat (floor); stood up they face the player's camera (partner).
      impact.rotation.x = surface === 'floor' ? 0 : Math.PI / 2;
      impact.setEnabled(true);
    },
    hide,
    animate(frameSeconds) {
      if (!impact.isEnabled()) {
        return;
      }
      clock = (clock + frameSeconds) % AIM_RIPPLE_PERIOD_S;
      for (let i = 0; i < ripples.length; i++) {
        const ripple = ripples[i];
        if (!ripple) {
          continue;
        }
        // Evenly staggered waves, each growing and fading over one period.
        const phase = (clock / AIM_RIPPLE_PERIOD_S + i / ripples.length) % 1;
        const diameter =
          AIM_RIPPLE_MIN_DIAMETER_M +
          (AIM_RIPPLE_MAX_DIAMETER_M - AIM_RIPPLE_MIN_DIAMETER_M) * phase;
        ripple.ring.scaling.set(diameter, 1, diameter);
        ripple.material.alpha = AIM_RIPPLE_MAX_ALPHA * (1 - phase);
      }
    },
  };
}

function createLine(name: string, points: Vector3[], color: Color3, scene: Scene): LinesMesh {
  const lines = CreateLines(name, { points, updatable: true }, scene);
  lines.color = color;
  lines.isPickable = false;
  return lines;
}

function createRipple(name: string, parent: TransformNode, color: Color3, scene: Scene): Ripple {
  const ring = CreateTorus(
    name,
    { diameter: 1, thickness: AIM_RIPPLE_THICKNESS_M, tessellation: RIPPLE_TESSELLATION },
    scene,
  );
  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = color;
  material.disableLighting = true;
  ring.material = material;
  ring.isPickable = false;
  ring.renderingGroupId = OVERLAY_RENDERING_GROUP;
  ring.parent = parent;
  return { ring, material };
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
