import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { turnBone } from './turn-bone';

/**
 * Two directions fixed to a bone, in its local space, recognized once in a known pose: for
 * a hand, where the fingers point and where the palm faces.
 */
export interface BoneFrame {
  readonly bone: TransformNode;
  readonly primaryLocal: Vector3;
  readonly secondaryLocal: Vector3;
}

const inverseWorld = new Matrix();
const origin = new Vector3();
const current = new Vector3();
const desired = new Vector3();
const scaled = new Vector3();

/** Records which local directions of `bone` point along these world directions right now. */
export function captureBoneFrame(
  bone: TransformNode,
  worldPrimary: Vector3,
  worldSecondary: Vector3,
): BoneFrame {
  bone.getWorldMatrix().invertToRef(inverseWorld);
  return {
    bone,
    primaryLocal: Vector3.TransformNormal(worldPrimary, inverseWorld).normalize(),
    secondaryLocal: Vector3.TransformNormal(worldSecondary, inverseWorld).normalize(),
  };
}

/**
 * Turns the bone so its primary direction points along `primary` and its secondary one as
 * close to `secondary` as the primary allows, blended by `weight` (0–1). Inputs are world
 * directions; they are not modified.
 */
export function orientBone(
  frame: BoneFrame,
  primary: Vector3,
  secondary: Vector3,
  weight: number,
): void {
  const { bone } = frame;
  bone.computeWorldMatrix(true);
  origin.copyFrom(bone.getAbsolutePosition());
  Vector3.TransformNormalToRef(frame.primaryLocal, bone.getWorldMatrix(), current);
  desired.copyFrom(primary);
  turnBone(bone, origin, current, desired, weight);
  bone.computeWorldMatrix(true);

  // Then roll around the primary direction: compare both secondaries across its plane.
  Vector3.TransformNormalToRef(frame.primaryLocal, bone.getWorldMatrix(), scaled);
  const axis = scaled.normalize();
  Vector3.TransformNormalToRef(frame.secondaryLocal, bone.getWorldMatrix(), current);
  removeAlong(current, axis);
  desired.copyFrom(secondary);
  removeAlong(desired, axis);
  turnBone(bone, origin, current, desired, weight);
  bone.computeWorldMatrix(true);
}

const along = new Vector3();

function removeAlong(vector: Vector3, unitAxis: Vector3): void {
  unitAxis.scaleToRef(Vector3.Dot(vector, unitAxis), along);
  vector.subtractInPlace(along);
}
