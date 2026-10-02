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
  /** Forward bend of the torso at contact, in rad. */
  readonly torsoLeanRad: number;
  /** Where the hands go after contact, relative to where they met the ball (frame offset). */
  readonly followThrough: FrameOffset;
  /** A preparation the hands pass through before swinging to the ball; null = straight. */
  readonly windup: GestureWindup | null;
}

/** Cortada's "bow and arrow": the hitting hand back behind the head, the other one up. */
export interface GestureWindup {
  /** Hands during the preparation, relative to the ball center at contact; null = free. */
  readonly dominantHand: FrameOffset | null;
  readonly otherHand: FrameOffset | null;
  readonly elbowPole: FrameOffset;
  /** The swing from the preparation to the ball lasts this long before contact, in s. */
  readonly swingS: number;
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
  /** Upper body slightly forward (coaching references: Volleyball Canada). */
  torsoLeanRad: 12 * (Math.PI / 180),
} as const;

/**
 * Reading the play (Noan): the ready stance is for defending. Before a set the athlete is
 * halfway into it, before an attack a quarter; never stiffly upright. While the partner
 * plays, the athlete is relaxed and settles in as the partner's touch nears. How deep into
 * the stance, by the athlete's own next action (0–1).
 */
export const READY_BY_ACTION: Readonly<Record<'attack' | 'dig' | 'set', number>> = {
  dig: 1,
  set: 0.5,
  attack: 0.25,
};
/** How ready a relaxed athlete still is, 0–1. */
export const RELAXED_READINESS = 0.15;
/** The athlete is set this long before the partner's touch, in s... */
export const READY_LEAD_S = 0.15;
/** ...after settling in over this time, in s. */
export const READY_RAMP_S = 0.8;

/** The ready stance holds while walking and gives way to running arms above jogging pace. */
export const READY_FULL_BELOW_MPS = 1.6;
export const READY_NONE_ABOVE_MPS = 3.2;
/** How quickly the athlete settles into or leaves the ready stance, in s. */
export const READY_SMOOTHING_S = 0.2;
/**
 * Moving, the athlete stands taller than when waiting (Noan): at this ground speed and above
 * the ready crouch keeps only MOVING_CROUCH_SHARE of its depth, in m/s.
 */
export const MOVING_CROUCH_SPEED_MPS = 2;
export const MOVING_CROUCH_SHARE = 0.5;

export const GESTURES: Readonly<Record<GestureName, GestureShape>> = {
  /**
   * Toque (references: Volleyball Canada): the elbows bend and the hands stay in front of the
   * body all the way up, ending in a cup around the back of the ball, in front of the
   * forehead, elbows out; the legs extend into the contact and the arms follow the ball.
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
    crouch: 0.1,
    fingersOpen: 0.85,
    torsoLeanRad: 0,
    followThrough: { forward: 0.12, outward: 0.02, up: 0.12 },
    windup: null,
  },
  /** Manchete: low and wide, torso forward, arms straight and together in a platform. */
  bump: {
    prepareS: 0.4,
    dominantHand: { forward: 0.12, outward: 0.03, up: -0.12 },
    otherHand: { forward: 0.12, outward: 0.03, up: -0.12 },
    elbowPole: { forward: 0, outward: 0.3, up: -0.5 },
    palm: {
      facing: { forward: 0, outward: -1, up: 0.3 },
      fingers: { forward: 1, outward: 0, up: -0.6 },
    },
    crouch: 0.8,
    fingersOpen: 0.5,
    torsoLeanRad: 30 * (Math.PI / 180),
    followThrough: { forward: 0.05, outward: 0, up: 0.08 },
    windup: null,
  },
  /**
   * Cortada: "bow and arrow" preparation, then the hitting arm swings to the ball and on
   * down across the body.
   */
  spike: {
    prepareS: 0.7,
    dominantHand: { forward: -0.08, outward: 0, up: -0.03 },
    otherHand: null,
    elbowPole: { forward: -0.3, outward: 0.5, up: 0 },
    palm: {
      facing: { forward: 1, outward: 0, up: 0.2 },
      fingers: { forward: 0, outward: 0, up: 1 },
    },
    crouch: 0,
    fingersOpen: 1,
    torsoLeanRad: 0,
    followThrough: { forward: 0.45, outward: -0.35, up: -1.1 },
    windup: {
      dominantHand: { forward: -0.55, outward: 0, up: -0.55 },
      otherHand: { forward: 0.1, outward: 0.35, up: -0.25 },
      elbowPole: { forward: -0.3, outward: 0.6, up: 0.3 },
      swingS: 0.18,
    },
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
    torsoLeanRad: 0,
    followThrough: { forward: 0.15, outward: 0, up: 0.05 },
    windup: null,
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
    torsoLeanRad: 0,
    followThrough: { forward: 0, outward: 0, up: 0 },
    windup: null,
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
    torsoLeanRad: 0,
    followThrough: { forward: 0, outward: 0, up: 0.35 },
    windup: null,
  },
};

/** The follow-through takes this share of the recovery; the rest eases back. */
export const FOLLOW_THROUGH_SHARE = 0.6;
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
