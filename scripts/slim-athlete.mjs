// Slims the pack's "superhero" bodies toward a volleyball build (Noan: volleyball players are
// not that muscular). Each vertex moves toward the axis of the bones that move it, by a
// share that depends on the body part, so arms and chest lose bulk while hands, feet and
// head keep their size.

/**
 * How much of its distance to the bone axis each body part keeps, 0–1 (1 = unchanged).
 * Initial values, to judge by eye with Noan.
 */
const KEEP_BY_JOINT = {
  clavicle: 0.88,
  upperarm: 0.8,
  lowerarm: 0.86,
  spine_03: 0.88,
  spine_02: 0.9,
  spine_01: 0.94,
  pelvis: 0.97,
  thigh: 0.9,
  calf: 0.93,
};

/** Each bone runs from its joint to this child joint ("_l"/"_r" are added for limbs). */
const BONE_ENDS = {
  pelvis: 'spine_01',
  spine_01: 'spine_02',
  spine_02: 'spine_03',
  spine_03: 'neck_01',
  clavicle: 'upperarm',
  upperarm: 'lowerarm',
  lowerarm: 'hand',
  thigh: 'calf',
  calf: 'foot',
};

/**
 * @param document glTF-Transform document of one character.
 * @param bodyMaterialPrefix name prefix of the skin material ("MI_Superhero").
 */
export function slimAthlete(document, { bodyMaterialPrefix }) {
  const root = document.getRoot();
  for (const mesh of root.listMeshes()) {
    const skin = root
      .listNodes()
      .find((node) => node.getMesh() === mesh)
      ?.getSkin();
    for (const primitive of mesh.listPrimitives()) {
      if (skin && primitive.getMaterial()?.getName().startsWith(bodyMaterialPrefix)) {
        slimPrimitive(primitive, boneAxes(skin.listJoints()));
      }
    }
  }
}

/** For every joint index that slims: its bone's axis segment and how much to keep. */
function boneAxes(joints) {
  const byName = new Map(joints.map((joint) => [joint.getName(), joint]));
  return joints.map((joint) => {
    const [part, side] = splitSide(joint.getName());
    const keep = KEEP_BY_JOINT[part];
    const end = BONE_ENDS[part];
    const child = end && byName.get(side ? `${end}_${side}` : end);
    if (keep === undefined || !child) {
      return null;
    }
    return { start: positionOf(joint), end: positionOf(child), keep };
  });
}

function slimPrimitive(primitive, axes) {
  const position = primitive.getAttribute('POSITION');
  const jointIndices = primitive.getAttribute('JOINTS_0');
  const weights = primitive.getAttribute('WEIGHTS_0');
  const point = [];
  const vertexJoints = [];
  const vertexWeights = [];
  for (let i = 0; i < position.getCount(); i++) {
    position.getElement(i, point);
    jointIndices.getElement(i, vertexJoints);
    weights.getElement(i, vertexWeights);
    const shift = [0, 0, 0];
    vertexJoints.forEach((joint, slot) => {
      const axis = axes[joint];
      const weight = vertexWeights[slot] ?? 0;
      if (!axis || weight <= 0) {
        return;
      }
      const closest = closestOnSegment(point, axis.start, axis.end);
      for (let k = 0; k < 3; k++) {
        shift[k] += (closest[k] - point[k]) * (1 - axis.keep) * weight;
      }
    });
    position.setElement(i, [point[0] + shift[0], point[1] + shift[1], point[2] + shift[2]]);
  }
}

function closestOnSegment(point, start, end) {
  const along = end.map((value, k) => value - start[k]);
  const lengthSquared = along.reduce((sum, value) => sum + value * value, 0);
  const t =
    lengthSquared > 0
      ? Math.min(
          1,
          Math.max(
            0,
            along.reduce((sum, value, k) => sum + value * (point[k] - start[k]), 0) / lengthSquared,
          ),
        )
      : 0;
  return start.map((value, k) => value + along[k] * t);
}

function splitSide(name) {
  const match = /^(.*)_([lr])$/.exec(name);
  return match ? [match[1], match[2]] : [name, null];
}

function positionOf(joint) {
  const matrix = joint.getWorldMatrix();
  return [matrix[12], matrix[13], matrix[14]];
}
