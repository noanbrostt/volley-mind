import { Axis } from '@babylonjs/core/Maths/math.axis';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  DIVE_LEAN_S,
  type FrameOffset,
  GESTURE_RETARGET_BELOW_STRENGTH,
  GESTURE_SMOOTHING_S,
  GESTURES,
  type GestureShape,
  type PalmShape,
  READY_FULL_BELOW_MPS,
  READY_NONE_ABOVE_MPS,
  READY_SMOOTHING_S,
  READY_STANCE,
} from '@config/athlete-gestures';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';
import { ancestorsOf, findBone } from './find-bone';
import {
  elbowPoleAt,
  type GestureMoment,
  gestureStrength,
  handOffsetAt,
  type MutableFrameOffset,
  secondsToContact,
  trackGesture,
} from './gesture-timeline';
import { type BoneFrame, captureBoneFrame, orientBone } from './orient-bone';
import { CHARACTER_ARMS, CHARACTER_SPINE } from './rig-bone-names';
import { turnBone } from './turn-bone';
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
  /** How far the knees bend right now, 0–1. */
  readonly crouch: number;
  /** How much the gesture leads the body right now, 0–1. */
  readonly strength: number;
  /** How far a coming dive tips the body toward the floor, 0–1. */
  readonly diveLean: number;
  /** Direction of the coming dive relative to the facing, in rad (+ toward the right). */
  readonly diveYaw: number;
}

type Side = 'right' | 'left';

interface Arm {
  readonly side: Side;
  /** +1 for the right arm, −1 for the left: mirrors the frame offsets. */
  readonly outward: number;
  readonly chain: LimbChain;
  readonly hand: BoneFrame;
  /** Finger bones with their rest rotation: the model rests with flat, open hands. */
  readonly fingers: readonly Finger[];
  /** Where the gesture wants this hand right now, in world space. */
  readonly gestureTarget: Vector3;
  /** Whether the current gesture uses this hand at all. */
  inGesture: boolean;
}

interface Finger {
  readonly node: TransformNode;
  readonly rest: Quaternion;
}

type MutableOffset = MutableFrameOffset;

/** The athlete's frame on the floor: where they face, their right, and their feet. */
class FloorFrame {
  readonly forward = new Vector3();
  readonly right = new Vector3();
  readonly feet = new Vector3();

  fromFacing(facing: number): void {
    this.forward.set(Math.sin(facing), 0, Math.cos(facing));
    this.right.set(Math.cos(facing), 0, -Math.sin(facing));
  }

  /** From the node that turns with the body (facing plus heading), flattened on the floor. */
  fromBody(body: TransformNode): void {
    body.getDirectionToRef(Axis.Z, this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.set(this.forward.z, 0, -this.forward.x);
    this.feet.copyFrom(body.getAbsolutePosition());
  }

  place(offset: FrameOffset, outward: number, out: Vector3): Vector3 {
    return out.set(
      this.forward.x * offset.forward + this.right.x * offset.outward * outward,
      offset.up,
      this.forward.z * offset.forward + this.right.z * offset.outward * outward,
    );
  }
}

// Scratch values shared by every athlete's arms (they are solved one after another).
const readyTarget = new Vector3();
const target = new Vector3();
const pole = new Vector3();
const desired = new Vector3();
const fingersDirection = new Vector3();
const palmDirection = new Vector3();
const mixedPole: MutableOffset = { forward: 0, outward: 0, up: 0 };
const mixedFacing: MutableOffset = { forward: 0, outward: 0, up: 0 };
const mixedFingers: MutableOffset = { forward: 0, outward: 0, up: 0 };
const handOffset: MutableOffset = { forward: 0, outward: 0, up: 0 };
const leanFrom = new Vector3();
const leanTo = new Vector3();
const DOWN = new Vector3(0, -1, 0);

/**
 * Volleyball arms over the model's animation: the ready stance while the ball is in play,
 * and each gesture reaching from it to the ball through inverse kinematics, so the hands
 * travel in front of the body and meet the ball at the very moment of contact.
 */
export function createArmGestures(modelRoot: TransformNode): ArmGestures {
  const body = modelRoot.parent;
  if (!(body instanceof TransformNode)) {
    throw new Error(`Model ${modelRoot.name} needs a parent node that turns with the body`);
  }
  const arms = (['right', 'left'] as const).map((side) => createArm(modelRoot, side));
  const spine = findBone(modelRoot, CHARACTER_SPINE);
  const frame = new FloorFrame();
  /** The ball at contact, smoothed: predictions shift a little as the ball flies. */
  const anchor = new Vector3();
  const gesturePole: MutableOffset = { forward: 0, outward: 0, up: 0 };
  let torsoLean = 0;
  let moment: GestureMoment | null = null;
  let shape: GestureShape | null = null;
  let strength = 0;
  let readiness = 0;
  let crouch = 0;
  let diveLean = 0;
  let diveYaw = 0;
  let heightM = 0;

  modelRoot.getScene().onAfterAnimationsObservable.add(() => {
    frame.fromBody(body);
    if (torsoLean > 0) {
      // Bend forward from the lower back: turn "up" toward the front by the lean angle.
      leanFrom.set(0, 1, 0);
      leanTo.copyFrom(frame.forward).scaleInPlace(Math.sin(torsoLean));
      leanTo.y = Math.cos(torsoLean);
      spine.computeWorldMatrix(true);
      turnBone(spine, spine.getAbsolutePosition(), leanFrom, leanTo, 1);
    }
    for (const arm of arms) {
      const gestureShape = arm.inGesture ? shape : null;
      const gesture = gestureShape ? strength : 0;
      // A hand left out of the gesture (the spike's other arm) drops the ready stance.
      const ready = gestureShape ? readiness : readiness * (1 - strength);
      const weight = Math.max(ready, gesture);
      if (weight <= 0) {
        continue;
      }
      frame.place(READY_STANCE.hand, arm.outward, readyTarget);
      readyTarget.y += heightM * READY_STANCE.handHeightRatio;
      readyTarget.addInPlace(frame.feet);
      Vector3.LerpToRef(readyTarget, arm.gestureTarget, gesture, target);

      const armPole = gestureShape ? gesturePole : undefined;
      mixOffsets(READY_STANCE.elbowPole, armPole, gesture, mixedPole);
      frame.place(mixedPole, arm.outward, pole);
      pole.addInPlace(arm.chain.upper.getAbsolutePosition());
      solveTwoBoneIk(arm.chain, target, pole, weight);

      placePalm(frame, READY_STANCE.palm, gestureShape?.palm, gesture, arm.outward);
      orientBone(arm.hand, fingersDirection, palmDirection, weight);
      const open = lerp(READY_STANCE.fingersOpen, gestureShape?.fingersOpen ?? 0, gesture);
      openFingers(arm.fingers, weight * open);
    }
  });

  return {
    get crouch() {
      return crouch;
    },
    get strength() {
      return strength;
    },
    get diveLean() {
      return diveLean;
    },
    get diveYaw() {
      return diveYaw;
    },
    update(athlete, world, nowTick, stepSeconds, gameSeconds) {
      heightM = athlete.heightM;
      moment = trackGesture(moment, athlete, world, nowTick, stepSeconds);
      const blend = smoothing(gameSeconds, GESTURE_SMOOTHING_S);
      const wanted = moment ? gestureStrength(moment, nowTick, stepSeconds) : 0;
      strength += (wanted - strength) * blend;
      const readyWanted = world.drill.phase === 'rally' ? readyForSpeed(athlete) : 0;
      readiness += (readyWanted - readiness) * smoothing(gameSeconds, READY_SMOOTHING_S);

      shape = moment ? GESTURES[moment.name] : null;
      const readyCrouch = READY_STANCE.crouch * readiness;
      crouch = shape ? lerp(readyCrouch, shape.crouch, strength) : readyCrouch;
      const readyLean = READY_STANCE.torsoLeanRad * readiness;
      torsoLean = shape ? lerp(readyLean, shape.torsoLeanRad, strength) : readyLean;
      diveLean = moment?.name === 'dive' ? leanBeforeContact(moment, nowTick, stepSeconds) : 0;
      if (moment?.name === 'dive') {
        diveYaw = directionFromFacing(athlete, moment.ball.x, moment.ball.z);
      }
      if (!moment || !shape) {
        for (const arm of arms) {
          arm.inGesture = false;
        }
        return;
      }
      // A fresh gesture starts right on the ball; afterwards the anchor glides.
      desired.set(moment.ball.x, moment.ball.y, moment.ball.z);
      if (strength < GESTURE_RETARGET_BELOW_STRENGTH) {
        anchor.copyFrom(desired);
      } else {
        Vector3.LerpToRef(anchor, desired, blend, anchor);
      }
      const untilContactS = secondsToContact(moment, nowTick, stepSeconds);
      elbowPoleAt(shape, untilContactS, gesturePole);
      frame.fromFacing(athlete.facing);
      for (const arm of arms) {
        const dominant = arm.side === athlete.dominantArm;
        arm.inGesture = handOffsetAt(shape, dominant, untilContactS, handOffset);
        if (arm.inGesture) {
          frame.place(handOffset, arm.outward, arm.gestureTarget).addInPlace(anchor);
        }
      }
    },
  };
}

function createArm(modelRoot: TransformNode, side: Side): Arm {
  const names = CHARACTER_ARMS[side];
  const find = (name: string): TransformNode => findBone(modelRoot, name);
  const upper = find(names.upper);
  const lower = find(names.lower);
  const end = find(names.end);
  const finger = find(names.finger);
  const ancestors = ancestorsOf(upper);
  // The model is still in its rest pose: palms face down, fingers point along the arm.
  for (const node of [...ancestors, upper, lower, end, finger]) {
    node.computeWorldMatrix(true);
  }
  const fingerDirection = finger.getAbsolutePosition().subtract(end.getAbsolutePosition());
  return {
    side,
    outward: side === 'right' ? 1 : -1,
    chain: { upper, lower, end, ancestors },
    hand: captureBoneFrame(end, fingerDirection, DOWN),
    fingers: end
      .getDescendants(false)
      .filter((node): node is TransformNode => node instanceof TransformNode)
      .map((node) => ({ node, rest: node.rotationQuaternion?.clone() ?? Quaternion.Identity() })),
    gestureTarget: new Vector3(),
    inGesture: false,
  };
}

/** Angle from the athlete's facing to a point on the floor, in rad (+ toward the right). */
function directionFromFacing(athlete: AthleteState, x: number, z: number): number {
  const dx = x - athlete.position.x;
  const dz = z - athlete.position.z;
  const sin = Math.sin(athlete.facing);
  const cos = Math.cos(athlete.facing);
  return Math.atan2(dx * cos - dz * sin, dx * sin + dz * cos);
}

/** Full ready stance while walking, none at a run. */
function readyForSpeed(athlete: AthleteState): number {
  const speed = Math.hypot(athlete.velocity.x, athlete.velocity.z);
  const t = (READY_NONE_ABOVE_MPS - speed) / (READY_NONE_ABOVE_MPS - READY_FULL_BELOW_MPS);
  return Math.min(1, Math.max(0, t));
}

function leanBeforeContact(moment: GestureMoment, nowTick: number, stepSeconds: number): number {
  const secondsToContact = (moment.contactTick - nowTick) * stepSeconds;
  if (secondsToContact < 0) {
    return 1;
  }
  const t = Math.min(1, Math.max(0, 1 - secondsToContact / DIVE_LEAN_S));
  return t * t * (3 - 2 * t);
}

/** World directions of the palm and fingers, between the ready stance and the gesture. */
function placePalm(
  frame: FloorFrame,
  ready: PalmShape,
  gesture: PalmShape | undefined,
  amount: number,
  outward: number,
): void {
  mixOffsets(ready.facing, gesture?.facing, amount, mixedFacing);
  mixOffsets(ready.fingers, gesture?.fingers, amount, mixedFingers);
  frame.place(mixedFacing, outward, palmDirection).normalize();
  frame.place(mixedFingers, outward, fingersDirection).normalize();
}

function mixOffsets(
  from: FrameOffset,
  to: FrameOffset | undefined,
  amount: number,
  out: MutableOffset,
): void {
  const end = to ?? from;
  out.forward = lerp(from.forward, end.forward, amount);
  out.outward = lerp(from.outward, end.outward, amount);
  out.up = lerp(from.up, end.up, amount);
}

/** Blends the animated fingers toward the open rest hand. */
function openFingers(fingers: readonly Finger[], amount: number): void {
  for (const { node, rest } of fingers) {
    if (node.rotationQuaternion) {
      Quaternion.SlerpToRef(node.rotationQuaternion, rest, amount, node.rotationQuaternion);
    }
  }
}

function smoothing(seconds: number, timeConstantS: number): number {
  return 1 - Math.exp(-seconds / timeConstantS);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
