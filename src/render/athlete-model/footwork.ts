import { Axis } from '@babylonjs/core/Maths/math.axis';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  FOOTWORK_FULL_BELOW_MPS,
  FOOTWORK_NONE_ABOVE_MPS,
  FOOTWORK_SMOOTHING_S,
  KNEE_OUTWARD_SHARE,
  STANCE_HALF_WIDTH_M,
  STANCE_STAGGER_M,
  STEP_DURATION_S,
  STEP_FAST_DURATION_S,
  STEP_FAST_SPEED_MPS,
  STEP_HEIGHT_M,
  STEP_LEAD_S,
  STEP_TRIGGER_M,
} from '@config/athlete-footwork';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { upcomingAction } from '@simulation/upcoming-action';
import type { WorldState } from '@simulation/world-state';
import { ancestorsOf, findBone } from './find-bone';
import {
  createFoot,
  type FloorPoint,
  type Foot,
  footPosition,
  resetFeet,
  type StepRules,
  stepFeet,
} from './foot-stepper';
import { type BoneFrame, captureBoneFrame, orientBone } from './orient-bone';
import { CHARACTER_LEG_CHAINS } from './rig-bone-names';
import { type LimbChain, solveTwoBoneIk } from './two-bone-ik';

export interface Footwork {
  /** Steps the feet for this frame; the legs follow after the model's animations. */
  update(athlete: AthleteState, world: WorldState, gameSeconds: number, allowed: boolean): void;
  /** How much the footwork drives the legs right now, 0–1 (the rest is the running clips). */
  readonly weight: number;
}

/** Below this weight the legs belong to the clips and the feet are re-planted. */
const FOOTWORK_RESET_BELOW = 0.02;

const RULES: StepRules = {
  triggerM: STEP_TRIGGER_M,
  durationS: STEP_DURATION_S,
  fastDurationS: STEP_FAST_DURATION_S,
  fastSpeedMps: STEP_FAST_SPEED_MPS,
  leadS: STEP_LEAD_S,
};

type Side = 'right' | 'left';

interface Leg {
  readonly side: Side;
  readonly outward: number;
  readonly chain: LimbChain;
  readonly foot: BoneFrame;
  readonly home: FloorPoint;
  readonly at: FloorPoint;
  lift: number;
}

const UP = new Vector3(0, 1, 0);
const forward = new Vector3();
const right = new Vector3();
const feetCenter = new Vector3();
const target = new Vector3();
const pole = new Vector3();
const toes = new Vector3();
const kneeOut = new Vector3();

/**
 * Volleyball footwork in code: feet planted on the floor, stepping along the real direction
 * of travel (lateral, frontal or in between), the legs reaching them through inverse
 * kinematics. The running clips take over at high speed.
 */
export function createFootwork(modelRoot: TransformNode): Footwork {
  const body = modelRoot.parent;
  if (!(body instanceof TransformNode)) {
    throw new Error(`Model ${modelRoot.name} needs a parent node that turns with the body`);
  }
  const legs = (['left', 'right'] as const).map((side) => createLeg(modelRoot, body, side));
  const [left, right_] = legs;
  if (!left || !right_) {
    throw new Error('The model needs two legs');
  }
  // In the model's rest pose the ankles sit this high above the soles (scaled with it).
  const ankleHeightM = left.chain.end.getAbsolutePosition().y - body.getAbsolutePosition().y;
  const feet: [Foot, Foot] = [createFoot(left.home), createFoot(right_.home)];
  const homes: [FloorPoint, FloorPoint] = [left.home, right_.home];
  const velocity: FloorPoint = { x: 0, z: 0 };
  let weight = 0;

  modelRoot.getScene().onAfterAnimationsObservable.add(() => {
    if (weight <= 0) {
      return;
    }
    readFrame(body);
    legs.forEach((leg, index) => {
      const foot = feet[index];
      if (!foot) {
        return;
      }
      leg.lift = footPosition(foot, leg.at);
      target.set(leg.at.x, ankleHeightM + leg.lift * STEP_HEIGHT_M, leg.at.z);
      // Knees bend forward and slightly out, over the toes.
      right.scaleToRef(KNEE_OUTWARD_SHARE * leg.outward, kneeOut);
      pole.copyFrom(forward).addInPlace(kneeOut);
      pole.addInPlace(leg.chain.upper.getAbsolutePosition());
      solveTwoBoneIk(leg.chain, target, pole, weight);
      toes.copyFrom(forward);
      orientBone(leg.foot, toes, UP, weight);
    });
  });

  return {
    get weight() {
      return weight;
    },
    update(athlete, world, gameSeconds, allowed) {
      const wanted = allowed && world.drill.phase === 'rally' ? footworkForSpeed(athlete) : 0;
      weight += (wanted - weight) * (1 - Math.exp(-gameSeconds / FOOTWORK_SMOOTHING_S));
      body.computeWorldMatrix(true);
      readFrame(body);
      placeHomes(legs, athlete, upcomingAction(world, athlete.id) === 'attack');
      // Barely in use: the feet wait on their homes, ready to plant where the body is.
      if (weight < FOOTWORK_RESET_BELOW) {
        resetFeet(feet, homes);
        return;
      }
      velocity.x = athlete.velocity.x;
      velocity.z = athlete.velocity.z;
      stepFeet(feet, homes, velocity, gameSeconds, RULES);
    },
  };
}

function createLeg(modelRoot: TransformNode, body: TransformNode, side: Side): Leg {
  const names = CHARACTER_LEG_CHAINS[side];
  const upper = findBone(modelRoot, names.upper);
  const lower = findBone(modelRoot, names.lower);
  const end = findBone(modelRoot, names.end);
  const toesBone = findBone(modelRoot, names.toes);
  const ancestors = ancestorsOf(upper);
  // The model is still in its rest pose: soles flat, toes pointing to the front.
  for (const node of [body, ...ancestors, upper, lower, end, toesBone]) {
    node.computeWorldMatrix(true);
  }
  const toeDirection = toesBone.getAbsolutePosition().subtract(end.getAbsolutePosition());
  toeDirection.y = 0;
  return {
    side,
    outward: side === 'right' ? 1 : -1,
    chain: { upper, lower, end, ancestors },
    foot: captureBoneFrame(end, toeDirection, UP),
    home: { x: 0, z: 0 },
    at: { x: 0, z: 0 },
    lift: 0,
  };
}

/** The body's front and right on the floor, and the point between the feet. */
function readFrame(body: TransformNode): void {
  body.getDirectionToRef(Axis.Z, forward);
  forward.y = 0;
  forward.normalize();
  right.set(forward.z, 0, -forward.x);
  feetCenter.copyFrom(body.getAbsolutePosition());
}

/**
 * Each foot's home: a wide base, one foot a little ahead (Noan) — the dominant-side one, or
 * the other one to attack.
 */
function placeHomes(legs: readonly Leg[], athlete: AthleteState, attacking: boolean): void {
  for (const leg of legs) {
    const leads = (leg.side === athlete.dominantArm) !== attacking;
    const ahead = (leads ? 0.5 : -0.5) * STANCE_STAGGER_M;
    const side = STANCE_HALF_WIDTH_M * leg.outward;
    leg.home.x = feetCenter.x + forward.x * ahead + right.x * side;
    leg.home.z = feetCenter.z + forward.z * ahead + right.z * side;
  }
}

/** Full footwork while shuffling, none at a sprint. */
function footworkForSpeed(athlete: AthleteState): number {
  const speed = Math.hypot(athlete.velocity.x, athlete.velocity.z);
  const t = (FOOTWORK_NONE_ABOVE_MPS - speed) / (FOOTWORK_NONE_ABOVE_MPS - FOOTWORK_FULL_BELOW_MPS);
  return Math.min(1, Math.max(0, t));
}
