import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { turnBone } from './turn-bone';

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
