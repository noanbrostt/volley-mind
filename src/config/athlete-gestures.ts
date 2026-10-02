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
  /** Turn of the torso toward the dominant side at contact, in rad (that shoulder back). */
  readonly torsoTwistRad: number;
  /** How the hands travel the last stretch into the ball: a whip accelerates all the way. */
  readonly contactEase: 'whip' | 'smooth';
  /** Where the dominant hand goes after contact, relative to where it met the ball. */
  readonly followThrough: FrameOffset;
  /** The same for the other hand. */
  readonly otherFollowThrough: FrameOffset;
  /** Torso turn at the end of the follow-through, in rad. */
  readonly followThroughTwistRad: number;
  /** Poses the body passes through before contact, earliest first; empty = straight. */
  readonly windup: readonly WindupPose[];
}

/** One pose of a preparation (the attack's arm swing), reached some time before contact. */
export interface WindupPose {
  /** Seconds before contact the pose is reached. */
  readonly atS: number;
  /** Hands, relative to the ball center at contact; null = free. */
  readonly dominantHand: FrameOffset | null;
  readonly otherHand: FrameOffset | null;
  readonly elbowPole: FrameOffset;
  readonly torsoLeanRad: number;
  readonly torsoTwistRad: number;
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
    prepareS: 0.75,
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
    torsoTwistRad: 0,
    contactEase: 'smooth',
    followThrough: { forward: 0.12, outward: 0.02, up: 0.12 },
    otherFollowThrough: { forward: 0.12, outward: 0.02, up: 0.12 },
    followThroughTwistRad: 0,
    windup: [
      {
        // Set early (Noan): the hands wait almost on the spot, only lower, and meet the ball
        // with a short, smooth push instead of a last-moment reach.
        atS: 0.3,
        dominantHand: { forward: -0.12, outward: 0.11, up: -0.32 },
        otherHand: { forward: -0.12, outward: 0.11, up: -0.32 },
        elbowPole: { forward: 0.5, outward: 0.6, up: -0.5 },
        torsoLeanRad: 0,
        torsoTwistRad: 0,
      },
    ],
  },
  /** Manchete: low and wide, torso forward, arms straight and together in a platform. */
  bump: {
    prepareS: 0.7,
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
    torsoTwistRad: 0,
    contactEase: 'smooth',
    followThrough: { forward: 0.05, outward: 0, up: 0.08 },
    otherFollowThrough: { forward: 0.05, outward: 0, up: 0.08 },
    followThroughTwistRad: 0,
    windup: [
      {
        // The platform forms early, a little below the ball, and rises gently into it.
        atS: 0.3,
        dominantHand: { forward: 0.16, outward: 0.03, up: -0.24 },
        otherHand: { forward: 0.16, outward: 0.03, up: -0.24 },
        elbowPole: { forward: 0, outward: 0.3, up: -0.5 },
        torsoLeanRad: 30 * (Math.PI / 180),
        torsoTwistRad: 0,
      },
    ],
  },
  /**
   * Cortada, standing (drill rule: no jump) and controlled. Circular arm swing, the one most
   * elite players use (Journal of Sports Science and Medicine, 2022): the arm drops back,
   * comes round behind with the elbow high, whips to the ball high and slightly ahead, and
   * follows through down across the body, while the torso turns back and uncoils.
   */
  spike: {
    prepareS: 1.15,
    dominantHand: { forward: -0.08, outward: 0, up: -0.03 },
    // The other arm pulls down in front of the chest as the hitting arm comes through.
    otherHand: { forward: 0.1, outward: 0.37, up: -1.2 },
    elbowPole: { forward: -0.1, outward: 0.5, up: 0.2 },
    palm: {
      facing: { forward: 1, outward: 0, up: 0.2 },
      fingers: { forward: 0, outward: 0, up: 1 },
    },
    crouch: 0.15,
    fingersOpen: 1,
    // Weight moves onto the front foot; the shoulders face the ball at contact.
    torsoLeanRad: 10 * (Math.PI / 180),
    torsoTwistRad: 0,
    contactEase: 'whip',
    followThrough: { forward: 0.45, outward: -0.4, up: -1.1 },
    otherFollowThrough: { forward: -0.1, outward: -0.05, up: -0.3 },
    followThroughTwistRad: -25 * (Math.PI / 180),
    // Hands in these poses are where they sit relative to the turned torso: the arms turn
    // with it, so the hitting hand goes back because the trunk turns, not the shoulder alone.
    windup: [
      {
        // The wind-up is unhurried (Noan). From the ready stance the hitting arm first drops
        // to the side of the body...
        atS: 0.9,
        dominantHand: { forward: -0.1, outward: 0.15, up: -1.45 },
        otherHand: { forward: 0, outward: 0.45, up: -0.9 },
        elbowPole: { forward: -0.2, outward: 0.5, up: -0.4 },
        torsoLeanRad: 0,
        torsoTwistRad: 15 * (Math.PI / 180),
      },
      {
        // ...then back beside the hip as the trunk turns; the other arm rises to the ball.
        atS: 0.6,
        dominantHand: { forward: -0.35, outward: 0.05, up: -1.4 },
        otherHand: { forward: 0.15, outward: 0.45, up: -0.5 },
        elbowPole: { forward: -0.4, outward: 0.5, up: -0.3 },
        torsoLeanRad: -3 * (Math.PI / 180),
        torsoTwistRad: 35 * (Math.PI / 180),
      },
      {
        // Cocked: the trunk well turned, the elbow high and the hand behind the hitting
        // shoulder; the other arm points at the ball. From here the whip to the ball is short
        // and as fast as the athlete can make it.
        atS: 0.17,
        dominantHand: { forward: -0.3, outward: 0, up: -0.5 },
        otherHand: { forward: 0.2, outward: 0.4, up: -0.25 },
        elbowPole: { forward: -0.2, outward: 0.7, up: 0.5 },
        torsoLeanRad: -6 * (Math.PI / 180),
        torsoTwistRad: 50 * (Math.PI / 180),
      },
    ],
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
    torsoTwistRad: 0,
    contactEase: 'smooth',
    followThrough: { forward: 0.15, outward: 0, up: 0.05 },
    otherFollowThrough: { forward: 0.15, outward: 0, up: 0.05 },
    followThroughTwistRad: 0,
    windup: [],
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
    torsoTwistRad: 0,
    contactEase: 'smooth',
    followThrough: { forward: 0, outward: 0, up: 0 },
    otherFollowThrough: { forward: 0, outward: 0, up: 0 },
    followThroughTwistRad: 0,
    windup: [],
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
    torsoTwistRad: 0,
    contactEase: 'smooth',
    followThrough: { forward: 0, outward: 0, up: 0.35 },
    otherFollowThrough: { forward: 0, outward: 0, up: 0.35 },
    followThroughTwistRad: 0,
    windup: [],
  },
};

// Human limits of the arm (see render/athlete-model/arm-ik.ts).
/** The collarbone lifts by this share of the arm's elevation above horizontal... */
export const SHOULDER_SHRUG_SHARE = 0.3;
/** ...up to this much, in rad. */
export const SHOULDER_SHRUG_MAX_RAD = (20 * Math.PI) / 180;
/** The wrist bends at most this far from the forearm's line, in rad. */
export const WRIST_MAX_BEND_RAD = (50 * Math.PI) / 180;
/** Share of the trunk's turn taken by the lower back; the upper back takes the rest. */
export const LOWER_BACK_TWIST_SHARE = 0.4;
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
