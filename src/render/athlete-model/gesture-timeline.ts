import { BUMP_CONTACT_FORWARD_M, BUMP_CONTACT_HEIGHT_RATIO } from '@config/athlete';
import {
  FOLLOW_THROUGH_SHARE,
  type FrameOffset,
  GESTURE_RECOVER_S,
  GESTURES,
  type GestureName,
  type GestureShape,
  type WindupPose,
} from '@config/athlete-gestures';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';

/** The gesture an athlete is heading into, or coming out of. */
export interface GestureMoment {
  readonly name: GestureName;
  /** Ball center at contact, in world coordinates (m). */
  readonly ball: Vec3;
  /** Simulation tick (fractional) of the contact. */
  readonly contactTick: number;
}

/**
 * What the athlete's arms are doing at `nowTick`: preparing the coming touch, holding the
 * ball while aiming (contact kept at "now"), tossing to restart, or finishing the last
 * gesture (`previous`) until its recovery is over.
 */
export function trackGesture(
  previous: GestureMoment | null,
  athlete: AthleteState,
  world: WorldState,
  nowTick: number,
  stepSeconds: number,
): GestureMoment | null {
  const { drill } = world;
  const plan = drill.phase === 'rally' ? drill.incoming.plan : null;
  if (drill.phase === 'rally' && drill.incoming.athleteId === athlete.id && plan) {
    const { incoming } = drill;
    return {
      name: plan.technique,
      ball: plan.contact.point,
      contactTick: incoming.holdStartTick === null ? incoming.contactTick : nowTick,
    };
  }
  if (drill.phase === 'broken' && drill.restart.athleteId === athlete.id) {
    return { name: 'self-toss', ball: tossHands(athlete), contactTick: drill.restart.tick };
  }
  if (previous && (nowTick - previous.contactTick) * stepSeconds < GESTURE_RECOVER_S) {
    return previous;
  }
  return null;
}

/**
 * How strongly the gesture overrides the running animation, 0–1: rising over the gesture's
 * preparation (full by its first preparation pose, if any, so the arms follow that path
 * rather than cutting through the body), full at contact, fading during the recovery.
 */
export function gestureStrength(moment: GestureMoment, nowTick: number, stepSeconds: number) {
  const secondsToContact = (moment.contactTick - nowTick) * stepSeconds;
  if (secondsToContact >= 0) {
    const shape = GESTURES[moment.name];
    const fullAtS = shape.windup[0]?.atS ?? 0;
    return smoothstep((shape.prepareS - secondsToContact) / (shape.prepareS - fullAtS));
  }
  return smoothstep(1 + secondsToContact / GESTURE_RECOVER_S);
}

/** Seconds from now to the contact (negative once it has passed). */
export function secondsToContact(moment: GestureMoment, nowTick: number, stepSeconds: number) {
  return (moment.contactTick - nowTick) * stepSeconds;
}

/** A frame offset written in place, so the per-frame gesture math allocates nothing. */
export type MutableFrameOffset = { -readonly [Key in keyof FrameOffset]: number };

/** A pose on the gesture's way to the ball; the contact itself is the last one (at 0 s). */
type GestureKey = WindupPose;

const keyCache = new WeakMap<GestureShape, readonly GestureKey[]>();

/** The preparation poses followed by the contact pose, earliest first (built once per shape). */
function keysOf(shape: GestureShape): readonly GestureKey[] {
  let keys = keyCache.get(shape);
  if (!keys) {
    keys = [
      ...shape.windup,
      {
        atS: 0,
        dominantHand: shape.dominantHand,
        otherHand: shape.otherHand,
        elbowPole: shape.elbowPole,
        torsoLeanRad: shape.torsoLeanRad,
        torsoTwistRad: shape.torsoTwistRad,
      },
    ];
    keyCache.set(shape, keys);
  }
  return keys;
}

/** The two poses around this moment before contact, and how far from one to the other. */
interface KeySpan {
  from: GestureKey;
  to: GestureKey;
  amount: number;
}
/** Starting value of the reused span; every read fills it with real poses first. */
const NO_POSE: GestureKey = {
  atS: 0,
  dominantHand: null,
  otherHand: null,
  elbowPole: { forward: 0, outward: 0, up: 0 },
  torsoLeanRad: 0,
  torsoTwistRad: 0,
};
const span: KeySpan = { from: NO_POSE, to: NO_POSE, amount: 0 };

function spanAt(shape: GestureShape, untilContactS: number): KeySpan {
  const keys = keysOf(shape);
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) {
    throw new Error('A gesture always has its contact pose');
  }
  span.from = first;
  span.to = first;
  span.amount = 0;
  if (untilContactS >= first.atS) {
    return span;
  }
  for (let i = 1; i < keys.length; i++) {
    const from = keys[i - 1];
    const to = keys[i];
    if (from && to && untilContactS >= to.atS) {
      span.from = from;
      span.to = to;
      const progress = (from.atS - untilContactS) / (from.atS - to.atS);
      // Into the ball the limb accelerates all the way (fastest at contact, Noan); the
      // preparation poses ease in and out.
      span.amount = to.atS === 0 && from !== to ? accelerate(progress) : smoothstep(progress);
      return span;
    }
  }
  span.from = last;
  span.to = last;
  return span;
}

/**
 * Where one hand goes relative to the ball center at contact, at this moment of the gesture:
 * through the preparation poses, at the ball on contact, then on into the follow-through.
 * Writes into `out`; returns false when the gesture leaves this hand free.
 */
export function handOffsetAt(
  shape: GestureShape,
  dominant: boolean,
  untilContactS: number,
  out: MutableFrameOffset,
): boolean {
  if (untilContactS > 0) {
    const { from, to, amount } = spanAt(shape, untilContactS);
    const fromHand = dominant ? from.dominantHand : from.otherHand;
    const toHand = dominant ? to.dominantHand : to.otherHand;
    // A hand the next pose sets free leaves the gesture (the spike's other arm drops).
    if (!fromHand || !toHand) {
      return false;
    }
    mixOffsets(fromHand, toHand, amount, out);
    return true;
  }
  const atContact = dominant ? shape.dominantHand : shape.otherHand;
  if (!atContact) {
    return false;
  }
  copyOffset(atContact, out);
  const followed = followThroughAt(untilContactS);
  out.forward += shape.followThrough.forward * followed;
  out.outward += shape.followThrough.outward * followed;
  out.up += shape.followThrough.up * followed;
  return true;
}

/** Where the elbows point at this moment, following the preparation poses. */
export function elbowPoleAt(
  shape: GestureShape,
  untilContactS: number,
  out: MutableFrameOffset,
): void {
  if (untilContactS <= 0) {
    copyOffset(shape.elbowPole, out);
    return;
  }
  const { from, to, amount } = spanAt(shape, untilContactS);
  mixOffsets(from.elbowPole, to.elbowPole, amount, out);
}

/** The torso's forward bend and turn at this moment of the gesture, in rad. */
export interface TorsoPose {
  leanRad: number;
  twistRad: number;
}

export function torsoAt(shape: GestureShape, untilContactS: number, out: TorsoPose): void {
  if (untilContactS <= 0) {
    out.leanRad = shape.torsoLeanRad;
    out.twistRad =
      shape.torsoTwistRad +
      (shape.followThroughTwistRad - shape.torsoTwistRad) * followThroughAt(untilContactS);
    return;
  }
  const { from, to, amount } = spanAt(shape, untilContactS);
  out.leanRad = from.torsoLeanRad + (to.torsoLeanRad - from.torsoLeanRad) * amount;
  out.twistRad = from.torsoTwistRad + (to.torsoTwistRad - from.torsoTwistRad) * amount;
}

/**
 * How far into the follow-through, 0–1, at this moment after contact: leaving the ball at
 * full speed and slowing down.
 */
function followThroughAt(untilContactS: number): number {
  return untilContactS >= 0
    ? 0
    : decelerate(-untilContactS / (GESTURE_RECOVER_S * FOLLOW_THROUGH_SHARE));
}

/** Starts slow, fastest at the end (a whip). */
function accelerate(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t;
}

/** Starts fastest, slows to a stop. */
function decelerate(x: number): number {
  const t = 1 - Math.min(1, Math.max(0, x));
  return 1 - t * t * t;
}

function copyOffset(from: FrameOffset, out: MutableFrameOffset): void {
  out.forward = from.forward;
  out.outward = from.outward;
  out.up = from.up;
}

function mixOffsets(
  from: FrameOffset,
  to: FrameOffset,
  amount: number,
  out: MutableFrameOffset,
): void {
  out.forward = from.forward + (to.forward - from.forward) * amount;
  out.outward = from.outward + (to.outward - from.outward) * amount;
  out.up = from.up + (to.up - from.up) * amount;
}

/** Where the hands hold the ball before the self-toss: where the toss leaves from. */
function tossHands(athlete: AthleteState): Vec3 {
  const forward = Vec3.create(Math.sin(athlete.facing), 0, Math.cos(athlete.facing));
  return Vec3.add(
    Vec3.add(athlete.position, Vec3.scale(forward, BUMP_CONTACT_FORWARD_M)),
    Vec3.create(0, athlete.heightM * BUMP_CONTACT_HEIGHT_RATIO, 0),
  );
}

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
