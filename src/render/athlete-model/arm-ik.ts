import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  SHOULDER_SHRUG_MAX_RAD,
  SHOULDER_SHRUG_SHARE,
  WRIST_MAX_BEND_RAD,
} from '@config/athlete-gestures';
import { type BoneFrame, captureBoneFrame, orientBone } from './orient-bone';
import { turnBone } from './turn-bone';

/**
 * An arm rigged with human limits: the shoulder girdle lifts a little with the arm, the
 * elbow is a hinge, the forearm turns the palm (pronation) and the wrist only bends so far.
 */
export interface ArmRig {
  readonly clavicle: TransformNode;
  /** Upper arm: points at the elbow; its secondary axis is the elbow's hinge. */
  readonly upper: BoneFrame;
  /** Forearm: points at the wrist; its secondary axis is where the palm faces. */
  readonly lower: BoneFrame;
  /** Hand: the fingers' direction and where the palm faces. */
  readonly hand: BoneFrame;
  /** Every node above the clavicle, top first, so world matrices refresh in order. */
  readonly ancestors: readonly TransformNode[];
}

export interface ArmBones {
  readonly clavicle: TransformNode;
  readonly upper: TransformNode;
  readonly lower: TransformNode;
  readonly hand: TransformNode;
  readonly finger: TransformNode;
  readonly ancestors: readonly TransformNode[];
}

const DOWN = new Vector3(0, -1, 0);

/**
 * Reads the arm's axes from the model's rest pose (T-pose, palms down): the elbow hinges so
 * the forearm folds toward the body's front.
 */
export function captureArmRig(bones: ArmBones, bodyFront: Vector3): ArmRig {
  for (const node of [...bones.ancestors, bones.clavicle, bones.upper, bones.lower]) {
    node.computeWorldMatrix(true);
  }
  bones.hand.computeWorldMatrix(true);
  bones.finger.computeWorldMatrix(true);
  const shoulder = bones.upper.getAbsolutePosition();
  const elbow = bones.lower.getAbsolutePosition();
  const wrist = bones.hand.getAbsolutePosition();
  const alongArm = elbow.subtract(shoulder).normalize();
  const hinge = Vector3.Cross(alongArm, bodyFront).normalize();
  const fingers = bones.finger.getAbsolutePosition().subtract(wrist);
  return {
    clavicle: bones.clavicle,
    upper: captureBoneFrame(bones.upper, alongArm, hinge),
    lower: captureBoneFrame(bones.lower, wrist.subtract(elbow), DOWN),
    hand: captureBoneFrame(bones.hand, fingers, DOWN),
    ancestors: bones.ancestors,
  };
}

// Scratch values: arms are solved every frame and must not allocate.
const shoulder = new Vector3();
const elbow = new Vector3();
const toTarget = new Vector3();
const bendDirection = new Vector3();
const desiredElbow = new Vector3();
const scaled = new Vector3();
const upperDirection = new Vector3();
const flexDirection = new Vector3();
const hinge = new Vector3();
const forearm = new Vector3();
const palm = new Vector3();
const fingers = new Vector3();
const clavicleFrom = new Vector3();
const clavicleTo = new Vector3();
const MIN_LENGTH = 1e-4;

/**
 * Reaches `target` (the wrist) with the elbow bending toward `pole`, the palm facing
 * `palmFacing` and the fingers along `fingersAlong` as far as the wrist allows, blended over
 * the animated pose by `weight` (0–1). Directions are world space and are not modified.
 */
export function solveArm(
  rig: ArmRig,
  target: Vector3,
  pole: Vector3,
  palmFacing: Vector3,
  fingersAlong: Vector3,
  weight: number,
): void {
  if (weight <= 0) {
    return;
  }
  for (const node of rig.ancestors) {
    node.computeWorldMatrix(true);
  }
  refresh(rig);
  liftShoulder(rig, target, weight);

  shoulder.copyFrom(rig.upper.bone.getAbsolutePosition());
  elbow.copyFrom(rig.lower.bone.getAbsolutePosition());
  const upperLength = Vector3.Distance(shoulder, elbow);
  const lowerLength = Vector3.Distance(elbow, rig.hand.bone.getAbsolutePosition());

  // The elbow's place: law of cosines, in the plane of shoulder, target and pole.
  target.subtractToRef(shoulder, toTarget);
  const reach = Math.min(
    Math.max(toTarget.length(), Math.abs(upperLength - lowerLength) + MIN_LENGTH),
    upperLength + lowerLength - MIN_LENGTH,
  );
  toTarget.normalize();
  const cosShoulder =
    (upperLength * upperLength + reach * reach - lowerLength * lowerLength) /
    (2 * upperLength * reach);
  const sinShoulder = Math.sqrt(Math.max(0, 1 - cosShoulder * cosShoulder));
  pole.subtractToRef(shoulder, bendDirection);
  removeAlong(bendDirection, toTarget);
  if (bendDirection.lengthSquared() < MIN_LENGTH) {
    return;
  }
  bendDirection.normalize();
  desiredElbow.copyFrom(shoulder);
  desiredElbow.addInPlace(toTarget.scaleToRef(cosShoulder * upperLength, scaled));
  desiredElbow.addInPlace(bendDirection.scaleToRef(sinShoulder * upperLength, scaled));

  // Upper arm: at the elbow, rolled so the hinge lies across the bend plane — the forearm
  // can then only fold the way a real elbow does.
  desiredElbow.subtractToRef(shoulder, upperDirection).normalize();
  target.subtractToRef(desiredElbow, flexDirection);
  removeAlong(flexDirection, upperDirection);
  if (flexDirection.lengthSquared() < MIN_LENGTH) {
    // Arm straight: the bend plane comes from the pole.
    flexDirection.copyFrom(bendDirection);
    removeAlong(flexDirection, upperDirection);
  }
  flexDirection.normalize();
  Vector3.CrossToRef(upperDirection, flexDirection, hinge);
  orientBone(rig.upper, upperDirection, hinge, weight);
  refresh(rig);

  // Forearm: at the wrist, turned around its own axis so the palm faces where asked.
  target.subtractToRef(rig.lower.bone.getAbsolutePosition(), forearm).normalize();
  palm.copyFrom(palmFacing);
  orientBone(rig.lower, forearm, palm, weight);
  refresh(rig);

  // Hand: the wrist bends toward the asked finger direction, but only so far.
  Vector3.TransformNormalToRef(rig.lower.primaryLocal, rig.lower.bone.getWorldMatrix(), forearm);
  forearm.normalize();
  fingers.copyFrom(fingersAlong).normalize();
  const bend = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(forearm, fingers))));
  if (bend > WRIST_MAX_BEND_RAD) {
    Vector3.SlerpToRef(forearm, fingers, WRIST_MAX_BEND_RAD / bend, fingers);
  }
  palm.copyFrom(palmFacing);
  orientBone(rig.hand, fingers, palm, weight);
}

/** The shoulder girdle rises with the arm: a share of how high the hand reaches, capped. */
function liftShoulder(rig: ArmRig, target: Vector3, weight: number): void {
  const { clavicle } = rig;
  const clavicleStart = clavicle.getAbsolutePosition();
  target.subtractToRef(rig.upper.bone.getAbsolutePosition(), toTarget);
  const length = toTarget.length();
  if (length < MIN_LENGTH) {
    return;
  }
  const elevation = Math.asin(Math.min(1, Math.max(-1, toTarget.y / length)));
  const shrug = Math.min(SHOULDER_SHRUG_MAX_RAD, Math.max(0, elevation) * SHOULDER_SHRUG_SHARE);
  if (shrug <= 0) {
    return;
  }
  rig.upper.bone.getAbsolutePosition().subtractToRef(clavicleStart, clavicleFrom);
  const horizontal = Math.hypot(clavicleFrom.x, clavicleFrom.z);
  if (horizontal < MIN_LENGTH) {
    return;
  }
  // Tip the collarbone up by the shrug angle, keeping its direction across the body.
  clavicleTo.set(clavicleFrom.x, horizontal * Math.tan(shrug) + clavicleFrom.y, clavicleFrom.z);
  turnBone(clavicle, clavicleStart, clavicleFrom, clavicleTo, weight);
  refresh(rig);
}

function refresh(rig: ArmRig): void {
  rig.clavicle.computeWorldMatrix(true);
  rig.upper.bone.computeWorldMatrix(true);
  rig.lower.bone.computeWorldMatrix(true);
  rig.hand.bone.computeWorldMatrix(true);
}

const along = new Vector3();

function removeAlong(vector: Vector3, unitAxis: Vector3): void {
  unitAxis.scaleToRef(Vector3.Dot(vector, unitAxis), along);
  vector.subtractInPlace(along);
}
