// Volleyball gestures, animated in code over the model's arms (inverse kinematics): the
// hands reach the ball exactly at contact. Initial values, to be calibrated by eye with Noan.

/** Every gesture the athletes play: the drill's techniques plus the self-toss. */
export type GestureName = 'overhead' | 'bump' | 'spike' | 'roll-shot' | 'dive' | 'self-toss';

/**
 * An offset in the athlete's frame, in m: along their facing, outward to the side of the
 * arm it belongs to (so the same numbers mirror for both arms), and up.
 */
export interface FrameOffset {
  readonly forward: number;
  readonly outward: number;
  readonly up: number;
}

export interface GestureShape {
  /** The arms start moving toward the ball this long before contact, in s. */
  readonly prepareS: number;
  /** Hand (wrist) of the dominant arm, relative to the ball center at contact; null = free. */
  readonly dominantHand: FrameOffset | null;
  /** Hand of the other arm, relative to the ball center at contact; null = free. */
  readonly otherHand: FrameOffset | null;
  /** Where each elbow points while reaching, relative to its shoulder. */
  readonly elbowPole: FrameOffset;
  /** How far the knees bend into the crouching stance, 0–1. */
  readonly crouch: number;
  /** How far the fingers open from the running fist toward a flat hand, 0–1. */
  readonly fingersOpen: number;
}

export const GESTURES: Readonly<Record<GestureName, GestureShape>> = {
  /** Toque: both hands in a cup around the back of the ball, in front of the forehead, elbows out and bent. */
  overhead: {
    prepareS: 0.45,
    dominantHand: { forward: -0.06, outward: 0.1, up: -0.11 },
    otherHand: { forward: -0.06, outward: 0.1, up: -0.11 },
    elbowPole: { forward: 0.5, outward: 0.6, up: -0.4 },
    crouch: 0.35,
    fingersOpen: 0.85,
  },
  /** Manchete: wrists together beyond the ball, forearms making a platform under it. */
  bump: {
    prepareS: 0.4,
    dominantHand: { forward: 0.12, outward: 0.03, up: -0.12 },
    otherHand: { forward: 0.12, outward: 0.03, up: -0.12 },
    elbowPole: { forward: 0, outward: 0.3, up: -0.5 },
    crouch: 0.7,
    fingersOpen: 0.5,
  },
  /** Cortada: the dominant arm stretched up, the hand behind the ball. */
  spike: {
    prepareS: 0.5,
    dominantHand: { forward: -0.08, outward: 0, up: -0.03 },
    otherHand: null,
    elbowPole: { forward: -0.3, outward: 0.5, up: 0 },
    crouch: 0,
    fingersOpen: 1,
  },
  /** Largada (roll shot): like the spike, but the hand softly behind and under the ball. */
  'roll-shot': {
    prepareS: 0.5,
    dominantHand: { forward: -0.09, outward: 0, up: -0.06 },
    otherHand: null,
    elbowPole: { forward: -0.2, outward: 0.5, up: 0 },
    crouch: 0,
    fingersOpen: 0.8,
  },
  /** Peixinho: both arms stretched toward the ball. */
  dive: {
    prepareS: 0.35,
    dominantHand: { forward: -0.05, outward: 0.05, up: -0.1 },
    otherHand: { forward: -0.05, outward: 0.05, up: -0.1 },
    elbowPole: { forward: 0, outward: 0.3, up: -0.5 },
    crouch: 0.9,
    fingersOpen: 0.8,
  },
  /** Auto-lançamento: both hands under the ball, lifting it. */
  'self-toss': {
    prepareS: 0.5,
    dominantHand: { forward: -0.04, outward: 0.1, up: -0.06 },
    otherHand: { forward: -0.04, outward: 0.1, up: -0.06 },
    elbowPole: { forward: 0, outward: 0.4, up: -0.5 },
    crouch: 0.3,
    fingersOpen: 1,
  },
};

/** After contact the arms go back to the running animation over this time, in s. */
export const GESTURE_RECOVER_S = 0.35;
/** Below this strength the arms barely move, so the hands may jump to a new target unseen. */
export const GESTURE_RETARGET_BELOW_STRENGTH = 0.02;
/** The crouching stance comes from this clip, applied to the legs only. */
export const CROUCH_CLIP = 'Crouch_Idle_Loop';
/** Crouch cap, 0–1: a full crouch would need an infinite weight over the running clips. */
export const CROUCH_MAX = 0.9;
/** Smoothing of the gesture's strength and of where the hands go, in s: never a pop. */
export const GESTURE_SMOOTHING_S = 0.06;
