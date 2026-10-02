import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  type FrameOffset,
  GESTURE_RETARGET_BELOW_STRENGTH,
  GESTURE_SMOOTHING_S,
  GESTURES,
} from '@config/athlete-gestures';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';
import { type GestureMoment, gestureStrength, trackGesture } from './gesture-timeline';
import { CHARACTER_ARMS } from './rig-bone-names';
import { type LimbChain, solveTwoBoneIk } from './two-bone-ik';

export interface ArmGestures {
  /** Decides what the arms do now; they move after the model's animations are applied. */
  update(
    athlete: AthleteState,
    world: WorldState,
    nowTick: number,
    stepSeconds: number,
    gameSeconds: number,
  ): void;
  /** How far the gesture bends the knees right now, 0–1. */
  readonly crouch: number;
}

type Side = 'right' | 'left';

interface Arm {
  readonly side: Side;
  readonly chain: LimbChain;
  readonly target: Vector3;
  readonly poleOffset: Vector3;
  readonly pole: Vector3;
  /** Finger bones with their rest rotation: the model rests with flat, open hands. */
  readonly fingers: readonly Finger[];
  active: boolean;
}

interface Finger {
  readonly node: TransformNode;
  readonly rest: Quaternion;
}

/**
 * Volleyball gestures over the model's animation: each arm reaches for the ball through
 * inverse kinematics, so the hands meet it at the very moment of contact.
 */
export function createArmGestures(modelRoot: TransformNode): ArmGestures {
  const arms = (['right', 'left'] as const).map((side) => createArm(modelRoot, side));
  const forward = new Vector3();
  const right = new Vector3();
  const desired = new Vector3();
  let moment: GestureMoment | null = null;
  let strength = 0;
  let fingersOpen = 0;
  let crouch = 0;

  modelRoot.getScene().onAfterAnimationsObservable.add(() => {
    for (const arm of arms) {
      if (arm.active && strength > 0) {
        arm.chain.upper.getAbsolutePosition().addToRef(arm.poleOffset, arm.pole);
        solveTwoBoneIk(arm.chain, arm.target, arm.pole, strength);
        openFingers(arm.fingers, strength * fingersOpen);
      }
    }
  });

  return {
    get crouch() {
      return crouch;
    },
    update(athlete, world, nowTick, stepSeconds, gameSeconds) {
      moment = trackGesture(moment, athlete, world, nowTick, stepSeconds);
      const wanted = moment ? gestureStrength(moment, nowTick, stepSeconds) : 0;
      const blend = smoothingBlend(gameSeconds);
      strength += (wanted - strength) * blend;
      if (!moment) {
        crouch = 0;
        return;
      }
      const shape = GESTURES[moment.name];
      fingersOpen = shape.fingersOpen;
      crouch = strength * shape.crouch;
      forward.set(Math.sin(athlete.facing), 0, Math.cos(athlete.facing));
      right.set(Math.cos(athlete.facing), 0, -Math.sin(athlete.facing));
      const ball = moment.ball;
      for (const arm of arms) {
        const dominant = arm.side === athlete.dominantArm;
        const hand = dominant ? shape.dominantHand : shape.otherHand;
        arm.active = hand !== null;
        if (!hand) {
          continue;
        }
        const outward = arm.side === 'right' ? 1 : -1;
        placeInFrame(hand, forward, right, outward, desired).addInPlaceFromFloats(
          ball.x,
          ball.y,
          ball.z,
        );
        // A fresh gesture starts right on its target; afterwards the hands glide.
        if (strength < GESTURE_RETARGET_BELOW_STRENGTH) {
          arm.target.copyFrom(desired);
        } else {
          Vector3.LerpToRef(arm.target, desired, blend, arm.target);
        }
        placeInFrame(shape.elbowPole, forward, right, outward, arm.poleOffset);
      }
    },
  };
}

function createArm(modelRoot: TransformNode, side: Side): Arm {
  const names = CHARACTER_ARMS[side];
  const find = (name: string): TransformNode => {
    const node = modelRoot.getDescendants(false, (candidate) => candidate.name === name)[0];
    if (!(node instanceof TransformNode)) {
      throw new Error(`Bone ${name} not found in ${modelRoot.name}`);
    }
    return node;
  };
  const upper = find(names.upper);
  const end = find(names.end);
  const fingers = end
    .getDescendants(false)
    .filter((node): node is TransformNode => node instanceof TransformNode)
    .map((node) => ({ node, rest: node.rotationQuaternion?.clone() ?? Quaternion.Identity() }));
  const ancestors: TransformNode[] = [];
  for (let node = upper.parent; node; node = node.parent) {
    if (node instanceof TransformNode) {
      ancestors.unshift(node);
    }
  }
  return {
    side,
    chain: { upper, lower: find(names.lower), end, ancestors },
    target: new Vector3(),
    poleOffset: new Vector3(),
    pole: new Vector3(),
    fingers,
    active: false,
  };
}

/** Blends the animated fingers toward the open rest hand. */
function openFingers(fingers: readonly Finger[], amount: number): void {
  for (const { node, rest } of fingers) {
    if (node.rotationQuaternion) {
      Quaternion.SlerpToRef(node.rotationQuaternion, rest, amount, node.rotationQuaternion);
    }
  }
}

function placeInFrame(
  offset: FrameOffset,
  forward: Vector3,
  right: Vector3,
  outward: number,
  out: Vector3,
): Vector3 {
  return out.set(
    forward.x * offset.forward + right.x * offset.outward * outward,
    offset.up,
    forward.z * offset.forward + right.z * offset.outward * outward,
  );
}

function smoothingBlend(seconds: number): number {
  return 1 - Math.exp(-seconds / GESTURE_SMOOTHING_S);
}
