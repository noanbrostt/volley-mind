// Dresses a base character for volleyball: the body mesh is split into uniform regions
// (jersey, shorts, knee pads, socks, shoes) chosen from the skeleton, each with its own flat
// material. The game tints the jersey per athlete; the rest keeps these colors.

import { cutPrimitive } from './cut-mesh.mjs';

/**
 * Region boundaries, measured on the rest pose (T-pose, y up, in m) and relative to the
 * joints, so they fit any body of the pack.
 */
const UNIFORM = {
  /** Sleeves cover this fraction of the upper arm, from the shoulder. */
  sleeveArmFraction: 0.4,
  /** The collar opens this far below the neck joint and this wide to each side. */
  collarBelowNeckM: 0.04,
  collarHalfWidthM: 0.09,
  /** Shorts start this far above the pelvis joint. */
  waistAbovePelvisM: 0.05,
  /** Shorts cover this fraction of the thigh, from the hip down. */
  shortsThighFraction: 0.35,
  /** Knee pads around the knee joint. */
  kneePadAboveKneeM: 0.06,
  kneePadBelowKneeM: 0.08,
  /** Shoes up to this height above the ankle joint; socks above them. */
  shoeAboveAnkleM: 0.04,
  sockAboveAnkleM: 0.12,
  /** Shoe soles, from the floor, in m. */
  soleHeightM: 0.025,
};

/** Flat uniform colors, linear RGBA. The jersey is white so the game can tint it. */
const REGION_MATERIALS = {
  jersey: { color: [1, 1, 1, 1], roughness: 0.75 },
  shorts: { color: [0.02, 0.02, 0.03, 1], roughness: 0.8 },
  kneePad: { color: [0.015, 0.015, 0.02, 1], roughness: 0.9 },
  sock: { color: [0.85, 0.85, 0.85, 1], roughness: 0.9 },
  shoe: { color: [0.9, 0.9, 0.92, 1], roughness: 0.6 },
  sole: { color: [0.12, 0.12, 0.13, 1], roughness: 0.9 },
};

/** The game tints the jersey by this name (JERSEY_MATERIAL_NAME in src/config/athlete-model.ts). */
const JERSEY_MATERIAL_NAME = 'Jersey';
const MATERIAL_NAMES = {
  jersey: JERSEY_MATERIAL_NAME,
  shorts: 'Shorts',
  kneePad: 'KneePad',
  sock: 'Sock',
  shoe: 'Shoe',
  sole: 'Sole',
};

/**
 * @param document glTF-Transform document of one character.
 * @param bodyMaterialPrefix name prefix of the skin material ("MI_Superhero").
 * @param hairColor linear RGBA multiplied over the grayscale hair texture.
 */
export function dressAthlete(document, { bodyMaterialPrefix, hairColor }) {
  const root = document.getRoot();
  for (const material of root.listMaterials()) {
    if (material.getName().startsWith('MI_Hair')) {
      material.setBaseColorFactor(hairColor);
    }
  }
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      // The pack's vertex colors are all white: they cost bytes and a shader feature.
      primitive.setAttribute('COLOR_0', null);
      if (primitive.getMaterial()?.getName().startsWith(bodyMaterialPrefix)) {
        splitIntoUniform(document, mesh, primitive);
      }
    }
  }
}

function splitIntoUniform(document, mesh, body) {
  const skin = document
    .getRoot()
    .listNodes()
    .find((node) => node.getMesh() === mesh)
    ?.getSkin();
  if (!skin) {
    throw new Error(`Body mesh ${mesh.getName()} has no skin`);
  }
  const joints = skin.listJoints();
  const lines = uniformLines(joints);
  cutAlongHems(body, lines);
  const regionOf = createRegionClassifier(lines);
  const position = body.getAttribute('POSITION');
  const jointIndices = body.getAttribute('JOINTS_0');
  const weights = body.getAttribute('WEIGHTS_0');
  const indices = body.getIndices();
  const trianglesByRegion = new Map();
  for (let i = 0; i < indices.getCount(); i += 3) {
    const corners = [indices.getScalar(i), indices.getScalar(i + 1), indices.getScalar(i + 2)];
    const center = triangleCenter(position, corners);
    const joint = joints[dominantJoint(jointIndices, weights, corners)]?.getName() ?? '';
    const region = regionOf(center, joint);
    if (!trianglesByRegion.has(region)) {
      trianglesByRegion.set(region, []);
    }
    trianglesByRegion.get(region).push(...corners);
  }

  const buffer = document.getRoot().listBuffers()[0];
  for (const [region, triangleIndices] of trianglesByRegion) {
    const regionIndices = document
      .createAccessor(`${mesh.getName()}-${region}-indices`)
      .setType('SCALAR')
      .setArray(indexArray(triangleIndices, position.getCount()))
      .setBuffer(buffer);
    if (region === 'skin') {
      body.setIndices(regionIndices);
      continue;
    }
    const primitive = document.createPrimitive().setIndices(regionIndices);
    for (const semantic of body.listSemantics()) {
      primitive.setAttribute(semantic, body.getAttribute(semantic));
    }
    primitive.setMaterial(uniformMaterial(document, region));
    mesh.addPrimitive(primitive);
  }
}

/** 16-bit indices whenever the vertices fit, as in the original mesh. */
function indexArray(indices, vertexCount) {
  return vertexCount <= 0xffff ? new Uint16Array(indices) : new Uint32Array(indices);
}

/** Where each piece of the uniform starts and ends on this body, in m (rest pose, y up). */
function uniformLines(joints) {
  const height = (name) => jointPosition(joints, name)[1];
  const across = (name) => Math.abs(jointPosition(joints, name)[0]);
  const hip = height('thigh_l');
  const knee = height('calf_l');
  const ankle = height('foot_l');
  const shoulder = across('upperarm_l');
  return {
    collar: height('neck_01') - UNIFORM.collarBelowNeckM,
    sleeveEnd: shoulder + (across('lowerarm_l') - shoulder) * UNIFORM.sleeveArmFraction,
    waist: height('pelvis') + UNIFORM.waistAbovePelvisM,
    shortsEnd: hip - (hip - knee) * UNIFORM.shortsThighFraction,
    kneePadTop: knee + UNIFORM.kneePadAboveKneeM,
    kneePadBottom: knee - UNIFORM.kneePadBelowKneeM,
    sockTop: ankle + UNIFORM.sockAboveAnkleM,
    shoeTop: ankle + UNIFORM.shoeAboveAnkleM,
    soleTop: UNIFORM.soleHeightM,
  };
}

const X = 0;
const Y = 1;

/** Cuts the body along every straight hem, so each border is a clean line. */
function cutAlongHems(body, lines) {
  for (const height of [
    lines.waist,
    lines.shortsEnd,
    lines.kneePadTop,
    lines.kneePadBottom,
    lines.sockTop,
    lines.shoeTop,
    lines.soleTop,
  ]) {
    cutPrimitive(body, Y, height);
  }
  // In the T-pose the arms stretch along x, so the sleeves end at a fixed |x|.
  cutPrimitive(body, X, lines.sleeveEnd);
  cutPrimitive(body, X, -lines.sleeveEnd);
}

function createRegionClassifier(lines) {
  // Joints only tell limbs and head apart; hems are straight heights, so they read as clean
  // lines around the body.
  return ([x, y], joint) => {
    if (
      /^(neck_01|Head)$/.test(joint) ||
      /^(lowerarm|hand|index|middle|ring|pinky|thumb)/.test(joint)
    ) {
      return 'skin';
    }
    if (/^(clavicle|upperarm)_[lr]$/.test(joint)) {
      return Math.abs(x) < lines.sleeveEnd ? 'jersey' : 'skin';
    }
    if (y > lines.collar && Math.abs(x) < UNIFORM.collarHalfWidthM) {
      return 'skin';
    }
    if (y >= lines.waist) {
      return 'jersey';
    }
    if (y >= lines.shortsEnd) {
      return 'shorts';
    }
    if (y > lines.kneePadBottom && y < lines.kneePadTop) {
      return 'kneePad';
    }
    if (y < lines.soleTop) {
      return 'sole';
    }
    if (y < lines.shoeTop) {
      return 'shoe';
    }
    return y < lines.sockTop ? 'sock' : 'skin';
  };
}

function jointPosition(joints, name) {
  const joint = joints.find((node) => node.getName() === name);
  if (!joint) {
    throw new Error(`Joint ${name} not found`);
  }
  const matrix = joint.getWorldMatrix();
  return [matrix[12], matrix[13], matrix[14]];
}

/**
 * Whole triangles are classified, by their center and the joint that moves them most, so
 * region borders follow the mesh edges instead of zigzagging between vertices.
 */
function triangleCenter(position, corners) {
  const center = [0, 0, 0];
  const point = [];
  for (const corner of corners) {
    position.getElement(corner, point);
    for (let axis = 0; axis < 3; axis++) {
      center[axis] += point[axis] / corners.length;
    }
  }
  return center;
}

function dominantJoint(jointIndices, weights, corners) {
  const totals = new Map();
  const vertexJoints = [];
  const vertexWeights = [];
  for (const corner of corners) {
    jointIndices.getElement(corner, vertexJoints);
    weights.getElement(corner, vertexWeights);
    vertexJoints.forEach((joint, slot) => {
      totals.set(joint, (totals.get(joint) ?? 0) + (vertexWeights[slot] ?? 0));
    });
  }
  return [...totals].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

const materialCache = new WeakMap();

function uniformMaterial(document, region) {
  let materials = materialCache.get(document);
  if (!materials) {
    materials = new Map();
    materialCache.set(document, materials);
  }
  if (!materials.has(region)) {
    const { color, roughness } = REGION_MATERIALS[region];
    materials.set(
      region,
      document
        .createMaterial(MATERIAL_NAMES[region])
        .setBaseColorFactor(color)
        .setMetallicFactor(0)
        .setRoughnessFactor(roughness),
    );
  }
  return materials.get(region);
}
