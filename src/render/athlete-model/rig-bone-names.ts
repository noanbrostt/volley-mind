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
