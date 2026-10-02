// Volleyball gestures, animated in code over the model's arms (inverse kinematics): the
// hands reach the ball exactly at contact. Shapes follow Noan's descriptions; the numbers
// are initial values, to be calibrated by eye with him.

/** Every gesture the athletes play: the drill's techniques plus the self-toss. */
export type GestureName = 'overhead' | 'bump' | 'spike' | 'roll-shot' | 'dive' | 'self-toss';

/**
 * An offset or a direction in the athlete's frame: along their front, outward to the side of
 * the arm it belongs to (so the same numbers mirror for both arms), and up. Offsets are in m;
 * directions only matter by their proportions.
 */
export interface FrameOffset {
  readonly forward: number;
  readonly outward: number;
  readonly up: number;
}

/** How a hand is turned: where the palm faces and where the fingers point. */
export interface PalmShape {
  readonly facing: FrameOffset;
  readonly fingers: FrameOffset;
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
  readonly palm: PalmShape;
  /** How far the knees bend into the crouching stance, 0–1. */
  readonly crouch: number;
  /** How far the fingers open from the running fist toward a flat hand, 0–1. */
  readonly fingersOpen: number;
}

/**
 * Posição de expectativa (Noan): while the ball is in play and its path is still unknown —
 * crouched, arms down, slightly away from the body and forward, elbows bent near 90° so the
 * forearms point ahead, hands open with the palms up and slightly toward each other. Every
 * gesture starts from here, so the hands travel in front of the body.
 */
export const READY_STANCE = {
  /** Wrist, relative to the feet: ahead, outward, and up as a fraction of the height. */
  hand: { forward: 0.38, outward: 0.2, up: 0 },
  handHeightRatio: 0.52,
  /** Elbows down, back and slightly out. */
  elbowPole: { forward: -0.3, outward: 0.35, up: -0.6 },
  /** Palms up, slightly toward each other; fingers ahead. */
  palm: {
    facing: { forward: 0, outward: -0.35, up: 1 },
    fingers: { forward: 1, outward: 0.1, up: 0 },
  },
  crouch: 0.45,
  fingersOpen: 0.9,
} as const;

/** The ready stance holds while walking and gives way to running arms above jogging pace. */
export const READY_FULL_BELOW_MPS = 1.6;
export const READY_NONE_ABOVE_MPS = 3.2;
/** How quickly the athlete settles into or leaves the ready stance, in s. */
export const READY_SMOOTHING_S = 0.2;

export const GESTURES: Readonly<Record<GestureName, GestureShape>> = {
  /**
   * Toque: the elbows bend and the hands stay in front of the body all the way up, ending in
   * a cup around the back of the ball, in front of the forehead, elbows out.
   */
  overhead: {
    prepareS: 0.45,
    dominantHand: { forward: -0.06, outward: 0.1, up: -0.11 },
    otherHand: { forward: -0.06, outward: 0.1, up: -0.11 },
    elbowPole: { forward: 0.5, outward: 0.6, up: -0.4 },
    palm: {
      facing: { forward: 0.5, outward: -0.3, up: 0.8 },
      fingers: { forward: -0.2, outward: 0.3, up: 1 },
    },
    crouch: 0.35,
    fingersOpen: 0.85,
  },
  /** Manchete: wrists together beyond the ball, forearms making a platform under it. */
  bump: {
    prepareS: 0.4,
    dominantHand: { forward: 0.12, outward: 0.03, up: -0.12 },
    otherHand: { forward: 0.12, outward: 0.03, up: -0.12 },
    elbowPole: { forward: 0, outward: 0.3, up: -0.5 },
    palm: {
      facing: { forward: 0, outward: -1, up: 0.3 },
      fingers: { forward: 1, outward: 0, up: -0.6 },
    },
    crouch: 0.7,
    fingersOpen: 0.5,
  },
  /** Cortada: the dominant arm stretched up, the open hand behind the ball. */
  spike: {
    prepareS: 0.5,
    dominantHand: { forward: -0.08, outward: 0, up: -0.03 },
    otherHand: null,
    elbowPole: { forward: -0.3, outward: 0.5, up: 0 },
    palm: {
      facing: { forward: 1, outward: 0, up: 0.2 },
      fingers: { forward: 0, outward: 0, up: 1 },
    },
    crouch: 0,
    fingersOpen: 1,
  },
  /** Largada (roll shot): like the spike, but the hand softly behind and under the ball. */
  'roll-shot': {
    prepareS: 0.5,
    dominantHand: { forward: -0.09, outward: 0, up: -0.06 },
    otherHand: null,
    elbowPole: { forward: -0.2, outward: 0.5, up: 0 },
    palm: {
      facing: { forward: 0.6, outward: 0, up: 0.8 },
      fingers: { forward: 0.3, outward: 0, up: 1 },
    },
    crouch: 0,
    fingersOpen: 0.8,
  },
  /** Peixinho: both arms stretched toward the ball. */
  dive: {
    prepareS: 0.35,
    dominantHand: { forward: -0.05, outward: 0.05, up: -0.1 },
    otherHand: { forward: -0.05, outward: 0.05, up: -0.1 },
    elbowPole: { forward: 0, outward: 0.3, up: -0.5 },
    palm: {
      facing: { forward: 0.3, outward: -0.3, up: 1 },
      fingers: { forward: 1, outward: 0, up: 0 },
    },
    crouch: 0.9,
    fingersOpen: 0.8,
  },
  /** Auto-lançamento: both hands under the ball, lifting it. */
  'self-toss': {
    prepareS: 0.5,
    dominantHand: { forward: -0.04, outward: 0.1, up: -0.06 },
    otherHand: { forward: -0.04, outward: 0.1, up: -0.06 },
    elbowPole: { forward: 0, outward: 0.4, up: -0.5 },
    palm: {
      facing: { forward: 0, outward: -0.3, up: 1 },
      fingers: { forward: 1, outward: 0.2, up: 0 },
    },
    crouch: 0.3,
    fingersOpen: 1,
  },
};

/** After contact the arms go back to the ready stance (or the running arms) over this time, in s. */
export const GESTURE_RECOVER_S = 0.35;
/** Below this strength the arms barely move, so the hands may jump to a new target unseen. */
export const GESTURE_RETARGET_BELOW_STRENGTH = 0.02;
/** The crouching stance comes from this clip, applied to the legs only. */
export const CROUCH_CLIP = 'Crouch_Idle_Loop';
/** Crouch cap, 0–1: a full crouch would need an infinite weight over the running clips. */
export const CROUCH_MAX = 0.9;
/** The body tips toward the floor over this time before a dive meets the ball, in s. */
export const DIVE_LEAN_S = 0.3;
/** After a dive the athlete gets up over the last part of the recovery, this long, in s. */
export const DIVE_GET_UP_S = 0.4;
/** Smoothing of the gesture's strength and of where the hands go, in s: never a pop. */
export const GESTURE_SMOOTHING_S = 0.06;
