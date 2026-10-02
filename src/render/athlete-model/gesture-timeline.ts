import { BUMP_CONTACT_FORWARD_M, BUMP_CONTACT_HEIGHT_RATIO } from '@config/athlete';
import {
  FOLLOW_THROUGH_SHARE,
  type FrameOffset,
  GESTURE_RECOVER_S,
  GESTURES,
  type GestureName,
  type GestureShape,
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
 * preparation, full at contact, fading during the recovery.
 */
export function gestureStrength(moment: GestureMoment, nowTick: number, stepSeconds: number) {
  const secondsToContact = (moment.contactTick - nowTick) * stepSeconds;
  if (secondsToContact >= 0) {
    return smoothstep(1 - secondsToContact / GESTURES[moment.name].prepareS);
  }
  return smoothstep(1 + secondsToContact / GESTURE_RECOVER_S);
}

/** Seconds from now to the contact (negative once it has passed). */
export function secondsToContact(moment: GestureMoment, nowTick: number, stepSeconds: number) {
  return (moment.contactTick - nowTick) * stepSeconds;
}

/** A frame offset written in place, so the per-frame gesture math allocates nothing. */
export type MutableFrameOffset = { -readonly [Key in keyof FrameOffset]: number };

/**
 * Where one hand goes relative to the ball center at contact, at this moment of the gesture:
 * through the preparation (if any) and the swing, at the ball on contact, then on into the
 * follow-through. Writes into `out`; returns false when the gesture leaves this hand free.
 */
export function handOffsetAt(
  shape: GestureShape,
  dominant: boolean,
  untilContactS: number,
  out: MutableFrameOffset,
): boolean {
  const atContact = dominant ? shape.dominantHand : shape.otherHand;
  const windup = shape.windup;
  if (untilContactS > 0 && windup) {
    const prepared = (dominant ? windup.dominantHand : windup.otherHand) ?? atContact;
    if (!prepared) {
      return false;
    }
    if (untilContactS >= windup.swingS) {
      copyOffset(prepared, out);
      return true;
    }
    if (!atContact) {
      return false;
    }
    mixOffsets(prepared, atContact, smoothstep(1 - untilContactS / windup.swingS), out);
    return true;
  }
  if (!atContact) {
    return false;
  }
  copyOffset(atContact, out);
  if (untilContactS < 0) {
    const followed = smoothstep(-untilContactS / (GESTURE_RECOVER_S * FOLLOW_THROUGH_SHARE));
    out.forward += shape.followThrough.forward * followed;
    out.outward += shape.followThrough.outward * followed;
    out.up += shape.followThrough.up * followed;
  }
  return true;
}

/** Where the elbows point at this moment: the preparation's pole until the swing. */
export function elbowPoleAt(
  shape: GestureShape,
  untilContactS: number,
  out: MutableFrameOffset,
): void {
  const windup = shape.windup;
  if (!windup || untilContactS <= 0) {
    copyOffset(shape.elbowPole, out);
  } else if (untilContactS >= windup.swingS) {
    copyOffset(windup.elbowPole, out);
  } else {
    mixOffsets(
      windup.elbowPole,
      shape.elbowPole,
      smoothstep(1 - untilContactS / windup.swingS),
      out,
    );
  }
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
