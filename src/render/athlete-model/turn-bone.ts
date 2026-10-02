import { Matrix, Quaternion, type Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

// Scratch values: bones turn every frame and must not allocate.
const IDENTITY = Quaternion.Identity();
const fullTurn = new Quaternion();
const partialTurn = new Quaternion();
const turnMatrix = new Matrix();
const toOrigin = new Matrix();
const fromOrigin = new Matrix();
const shifted = new Matrix();
const turned = new Matrix();
const newWorld = new Matrix();
const inverseParent = new Matrix();
const newLocal = new Matrix();
const MIN_LENGTH = 1e-8;

/**
 * Rotates `bone` about its world `origin` so the world direction `from` points along `to`
 * (partly, by `weight` 0–1), and stores the result as the bone's local rotation. Working in
 * world space keeps it independent of each skeleton's bone axes. Normalizes both inputs.
 * The caller refreshes the world matrices of the bone and its children afterwards.
 */
export function turnBone(
  bone: TransformNode,
  origin: Vector3,
  from: Vector3,
  to: Vector3,
  weight: number,
): void {
  if (from.lengthSquared() < MIN_LENGTH || to.lengthSquared() < MIN_LENGTH || weight <= 0) {
    return;
  }
  from.normalize();
  to.normalize();
  Quaternion.FromUnitVectorsToRef(from, to, fullTurn);
  Quaternion.SlerpToRef(IDENTITY, fullTurn, Math.min(1, weight), partialTurn);
  // World' = World · T(−origin) · R · T(origin); Local' = World' · Parent⁻¹ (row vectors).
  Matrix.TranslationToRef(-origin.x, -origin.y, -origin.z, toOrigin);
  Matrix.FromQuaternionToRef(partialTurn, turnMatrix);
  Matrix.TranslationToRef(origin.x, origin.y, origin.z, fromOrigin);
  bone.getWorldMatrix().multiplyToRef(toOrigin, shifted);
  shifted.multiplyToRef(turnMatrix, turned);
  turned.multiplyToRef(fromOrigin, newWorld);
  const parent = bone.parent;
  if (parent) {
    parent.getWorldMatrix().invertToRef(inverseParent);
    newWorld.multiplyToRef(inverseParent, newLocal);
  } else {
    newLocal.copyFrom(newWorld);
  }
  if (!bone.rotationQuaternion) {
    bone.rotationQuaternion = new Quaternion();
  }
  newLocal.decompose(undefined, bone.rotationQuaternion);
}
