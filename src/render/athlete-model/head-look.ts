import { Axis } from '@babylonjs/core/Maths/math.axis';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  HEAD_LOOK_MAX_RAD,
  HEAD_LOOK_SMOOTHING_S,
  NECK_LOOK_SHARE,
} from '@config/athlete-footwork';
import type { WorldState } from '@simulation/world-state';
import { findBone } from './find-bone';
import { CHARACTER_LOOK } from './rig-bone-names';
import { turnBone } from './turn-bone';

export interface HeadLook {
  /** Moves the gaze toward the ball; the head turns after the model's animations. */
  update(world: WorldState, gameSeconds: number): void;
}

interface LookingBone {
  readonly bone: TransformNode;
  /** The face's front, in the bone's own space (captured in the rest pose). */
  readonly frontLocal: Vector3;
}

const front = new Vector3();
const chestFront = new Vector3();
const toBall = new Vector3();
const desired = new Vector3();
const inverse = new Matrix();

/**
 * Athletes always watch the ball (Noan): the neck and the head turn toward it, within what a
 * neck can do, the gaze gliding rather than snapping.
 */
export function createHeadLook(modelRoot: TransformNode): HeadLook {
  const body = modelRoot.parent;
  if (!(body instanceof TransformNode)) {
    throw new Error(`Model ${modelRoot.name} needs a parent node that turns with the body`);
  }
  const chest = capture(modelRoot, body, CHARACTER_LOOK.chest);
  const neck = capture(modelRoot, body, CHARACTER_LOOK.neck);
  const head = capture(modelRoot, body, CHARACTER_LOOK.head);
  const gaze = new Vector3();
  let hasGaze = false;

  modelRoot.getScene().onAfterAnimationsObservable.add(() => {
    if (!hasGaze) {
      return;
    }
    chest.bone.computeWorldMatrix(true);
    neck.bone.computeWorldMatrix(true);
    head.bone.computeWorldMatrix(true);
    Vector3.TransformNormalToRef(chest.frontLocal, chest.bone.getWorldMatrix(), chestFront);
    chestFront.normalize();
    gaze.subtractToRef(head.bone.getAbsolutePosition(), toBall).normalize();
    // Within the neck's reach: past the limit, look as far toward the ball as allowed.
    const angle = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(chestFront, toBall))));
    const share = angle > HEAD_LOOK_MAX_RAD ? HEAD_LOOK_MAX_RAD / angle : 1;
    Vector3.SlerpToRef(chestFront, toBall, share, desired);

    turnToward(neck, desired, NECK_LOOK_SHARE);
    head.bone.computeWorldMatrix(true);
    turnToward(head, desired, 1);
  });

  return {
    update(world, gameSeconds) {
      const ball = world.ball.position;
      if (!hasGaze) {
        gaze.set(ball.x, ball.y, ball.z);
        hasGaze = true;
        return;
      }
      const blend = 1 - Math.exp(-gameSeconds / HEAD_LOOK_SMOOTHING_S);
      gaze.x += (ball.x - gaze.x) * blend;
      gaze.y += (ball.y - gaze.y) * blend;
      gaze.z += (ball.z - gaze.z) * blend;
    },
  };
}

/** In the rest pose, the face looks where the body does. */
function capture(modelRoot: TransformNode, body: TransformNode, name: string): LookingBone {
  const bone = findBone(modelRoot, name);
  body.computeWorldMatrix(true);
  bone.computeWorldMatrix(true);
  body.getDirectionToRef(Axis.Z, front);
  bone.getWorldMatrix().invertToRef(inverse);
  return { bone, frontLocal: Vector3.TransformNormal(front, inverse).normalize() };
}

const current = new Vector3();
const wanted = new Vector3();

function turnToward(looking: LookingBone, direction: Vector3, weight: number): void {
  Vector3.TransformNormalToRef(looking.frontLocal, looking.bone.getWorldMatrix(), current);
  wanted.copyFrom(direction);
  turnBone(looking.bone, looking.bone.getAbsolutePosition(), current, wanted, weight);
}
