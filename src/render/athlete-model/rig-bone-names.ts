const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;
const FINGER_JOINTS = ['01', '02', '03'] as const;

/**
 * The animation pack and the character pack use different skeletons with the same shape:
 * the clips animate "DEF-" bones (Rigify names), the characters have Unreal-style bones.
 * This maps each clip bone to its character bone, for retargeting.
 */
export const RIG_BONE_NAMES: ReadonlyMap<string, string> = new Map([
  ['DEF-hips', 'pelvis'],
  ['DEF-spine.001', 'spine_01'],
  ['DEF-spine.002', 'spine_02'],
  ['DEF-spine.003', 'spine_03'],
  ['DEF-neck', 'neck_01'],
  ['DEF-head', 'Head'],
  ...sideBones('L', 'l'),
  ...sideBones('R', 'r'),
]);

function sideBones(clipSide: string, characterSide: string): [string, string][] {
  const bones: [string, string][] = [
    [`DEF-shoulder.${clipSide}`, `clavicle_${characterSide}`],
    [`DEF-upper_arm.${clipSide}`, `upperarm_${characterSide}`],
    [`DEF-forearm.${clipSide}`, `lowerarm_${characterSide}`],
    [`DEF-hand.${clipSide}`, `hand_${characterSide}`],
    [`DEF-thigh.${clipSide}`, `thigh_${characterSide}`],
    [`DEF-shin.${clipSide}`, `calf_${characterSide}`],
    [`DEF-foot.${clipSide}`, `foot_${characterSide}`],
    [`DEF-toe.${clipSide}`, `ball_${characterSide}`],
  ];
  for (const joint of FINGER_JOINTS) {
    bones.push([`DEF-thumb.${joint}.${clipSide}`, `thumb_${joint}_${characterSide}`]);
    for (const finger of FINGERS) {
      bones.push([`DEF-f_${finger}.${joint}.${clipSide}`, `${finger}_${joint}_${characterSide}`]);
    }
  }
  return bones;
}

/**
 * The character's arm bones, by side: shoulder joint, elbow joint, wrist joint, and the
 * middle finger's base (it tells where the fingers point).
 */
export const CHARACTER_ARMS = {
  right: { upper: 'upperarm_r', lower: 'lowerarm_r', end: 'hand_r', finger: 'middle_01_r' },
  left: { upper: 'upperarm_l', lower: 'lowerarm_l', end: 'hand_l', finger: 'middle_01_l' },
} as const;

/** The character's leg bones (with the pelvis, which carries the crouch's height). */
export const CHARACTER_LEGS: readonly string[] = [
  'pelvis',
  ...['l', 'r'].flatMap((side) => [
    `thigh_${side}`,
    `calf_${side}`,
    `foot_${side}`,
    `ball_${side}`,
  ]),
];

/** The lower back: the torso bends forward from here. */
export const CHARACTER_SPINE = 'spine_01';

/** The character's leg bones, by side: hip joint, knee joint, ankle joint, and the toes. */
export const CHARACTER_LEG_CHAINS = {
  right: { upper: 'thigh_r', lower: 'calf_r', end: 'foot_r', toes: 'ball_r' },
  left: { upper: 'thigh_l', lower: 'calf_l', end: 'foot_l', toes: 'ball_l' },
} as const;

/** Bones that turn to look at the ball, and the chest the look is measured from. */
export const CHARACTER_LOOK = { chest: 'spine_03', neck: 'neck_01', head: 'Head' } as const;

/** The upper back: the torso turns from here (the attack's shoulder rotation). */
export const CHARACTER_TWIST_SPINE = 'spine_02';
