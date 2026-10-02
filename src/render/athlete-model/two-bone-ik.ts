import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/** A limb of two bones: upper (shoulder joint), lower (elbow joint) and end (wrist joint). */
export interface LimbChain {
  readonly upper: TransformNode;
  readonly lower: TransformNode;
  readonly end: TransformNode;
  /** Every node above `upper`, top first, so world matrices refresh in order. */
  readonly ancestors: readonly TransformNode[];
}

// Scratch values: the solver runs every frame for every arm and must not allocate.
const shoulder = new Vector3();
const elbow = new Vector3();
const wrist = new Vector3();
const toTarget = new Vector3();
const bendDirection = new Vector3();
const desiredElbow = new Vector3();
const scaled = new Vector3();
const from = new Vector3();
const to = new Vector3();
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
const MIN_LENGTH_M = 1e-4;

/**
 * Turns the limb so its end reaches `target`, with the middle joint bending toward `pole`,
 * blended over the current (animated) pose by `weight` (0–1). Works on any skeleton: it only
 * rotates bones from where they point now to where they should, in world space.
 */
export function solveTwoBoneIk(
  chain: LimbChain,
  target: Vector3,
  pole: Vector3,
  weight: number,
): void {
  if (weight <= 0) {
    return;
  }
  for (const node of chain.ancestors) {
    node.computeWorldMatrix(true);
  }
  refresh(chain);
  shoulder.copyFrom(chain.upper.getAbsolutePosition());
  elbow.copyFrom(chain.lower.getAbsolutePosition());
  wrist.copyFrom(chain.end.getAbsolutePosition());
  const upperLength = Vector3.Distance(shoulder, elbow);
  const lowerLength = Vector3.Distance(elbow, wrist);

  // Where the elbow must be: law of cosines in the plane of shoulder, target and pole.
  target.subtractToRef(shoulder, toTarget);
  const reach = Math.min(
    Math.max(toTarget.length(), Math.abs(upperLength - lowerLength) + MIN_LENGTH_M),
    upperLength + lowerLength - MIN_LENGTH_M,
  );
  toTarget.normalize();
  const cosShoulder =
    (upperLength * upperLength + reach * reach - lowerLength * lowerLength) /
    (2 * upperLength * reach);
  const sinShoulder = Math.sqrt(Math.max(0, 1 - cosShoulder * cosShoulder));
  pole.subtractToRef(shoulder, bendDirection);
  toTarget.scaleToRef(Vector3.Dot(bendDirection, toTarget), scaled);
  bendDirection.subtractInPlace(scaled);
  if (bendDirection.lengthSquared() < MIN_LENGTH_M) {
    return;
  }
  bendDirection.normalize();
  desiredElbow.copyFrom(shoulder);
  desiredElbow.addInPlace(toTarget.scaleToRef(cosShoulder * upperLength, scaled));
  desiredElbow.addInPlace(bendDirection.scaleToRef(sinShoulder * upperLength, scaled));

  elbow.subtractToRef(shoulder, from);
  desiredElbow.subtractToRef(shoulder, to);
  turnBone(chain.upper, shoulder, from, to, weight);
  refresh(chain);

  elbow.copyFrom(chain.lower.getAbsolutePosition());
  wrist.copyFrom(chain.end.getAbsolutePosition());
  wrist.subtractToRef(elbow, from);
  target.subtractToRef(elbow, to);
  turnBone(chain.lower, elbow, from, to, weight);
  refresh(chain);
}

function refresh(chain: LimbChain): void {
  chain.upper.computeWorldMatrix(true);
  chain.lower.computeWorldMatrix(true);
  chain.end.computeWorldMatrix(true);
}

/**
 * Rotates `bone` about its world `origin` so the direction `from` points along `to` (partly,
 * by `weight`), then stores the result as the bone's local rotation.
 */
function turnBone(
  bone: TransformNode,
  origin: Vector3,
  fromDirection: Vector3,
  toDirection: Vector3,
  weight: number,
): void {
  if (fromDirection.lengthSquared() < MIN_LENGTH_M || toDirection.lengthSquared() < MIN_LENGTH_M) {
    return;
  }
  fromDirection.normalize();
  toDirection.normalize();
  Quaternion.FromUnitVectorsToRef(fromDirection, toDirection, fullTurn);
  Quaternion.SlerpToRef(IDENTITY, fullTurn, weight, partialTurn);
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
