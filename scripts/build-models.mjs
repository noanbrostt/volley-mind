// Builds the optimized athlete models in public/models from the raw Quaternius packs (CC0).
// The raw packs live in the git-ignored asset-packs/ folder (see public/models/LICENSE.txt
// for where to download them); only this script's output is committed.
//
// Usage: npm run models

import { access, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  mergeDocuments,
  prune,
  resample,
  textureCompress,
  unpartition,
} from '@gltf-transform/functions';
import sharp from 'sharp';

const PACKS = 'asset-packs';
const OUTPUT = 'public/models';
const BODY_DIR = `${PACKS}/universal-base-characters/Base Characters/Godot - UE`;
const HAIR_DIR = `${PACKS}/universal-base-characters/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)`;
const ANIMATION_LIBRARY = `${PACKS}/universal-animation-library/Godot/AnimationLibrary_Godot_Standard.glb`;

/** Athlete A is male and B is female (Noan's choice). */
const ATHLETES = [
  {
    output: 'athlete-male.glb',
    body: 'Superhero_Male_FullBody.gltf',
    hair: 'Hair_SimpleParted.gltf',
  },
  { output: 'athlete-female.glb', body: 'Superhero_Female_FullBody.gltf', hair: 'Hair_Buns.gltf' },
];

/** Generic clips the volleyball gestures build on; the gestures themselves are code. */
const ANIMATION_CLIPS = new Set([
  'Idle_Loop',
  'Walk_Loop',
  'Jog_Fwd_Loop',
  'Sprint_Loop',
  'Crouch_Idle_Loop',
  'Crouch_Fwd_Loop',
  'Jump_Start',
  'Jump_Loop',
  'Jump_Land',
  'Roll',
]);

// Colors carry the look, so they keep more pixels than the detail maps. Phones pay for every
// texel in GPU memory, which is why nothing stays at the packs' 2048 px.
const COLOR_TEXTURE_SIZE_PX = 1024;
const DETAIL_TEXTURE_SIZE_PX = 512;
const DETAIL_SLOTS = /normalTexture|metallicRoughnessTexture/;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

await requirePacks();
await mkdir(OUTPUT, { recursive: true });
for (const athlete of ATHLETES) {
  await buildAthlete(athlete);
}
await buildAnimations();

async function requirePacks() {
  try {
    await access(BODY_DIR);
    await access(ANIMATION_LIBRARY);
  } catch {
    throw new Error(
      `Raw packs not found in ${PACKS}/. Download them as described in ${OUTPUT}/LICENSE.txt.`,
    );
  }
}

async function buildAthlete({ output, body, hair }) {
  const document = await readGltf(path.join(BODY_DIR, body));
  const hairDocument = await readGltf(path.join(HAIR_DIR, hair));
  attachHair(document, hairDocument);
  await document.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      slots: DETAIL_SLOTS,
      resize: [DETAIL_TEXTURE_SIZE_PX, DETAIL_TEXTURE_SIZE_PX],
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [COLOR_TEXTURE_SIZE_PX, COLOR_TEXTURE_SIZE_PX],
    }),
    prune(),
    dedup(),
    // The merged hair brings its own buffer; a GLB holds only one.
    unpartition(),
  );
  await write(document, output);
}

/**
 * The hair is skinned to its own copy of the 65-joint skeleton. It is rebound to the body's
 * joints (same names, same order) and keeps its own bind matrices, so it sits on the head
 * the way it was modeled and follows every head animation.
 */
function attachHair(document, hairDocument) {
  const scene = document.getRoot().listScenes()[0];
  const bodySkin = document.getRoot().listSkins()[0];
  const sourceScenes = hairDocument.getRoot().listScenes();
  const sourceHairNodes = hairDocument
    .getRoot()
    .listNodes()
    .filter((node) => node.getMesh() && node.getSkin());
  const copies = mergeDocuments(document, hairDocument);

  for (const sourceNode of sourceHairNodes) {
    const hairNode = copies.get(sourceNode);
    const hairSkin = hairNode.getSkin();
    rebindJoints(hairSkin, bodySkin);
    scene.addChild(hairNode);
  }
  for (const sourceScene of sourceScenes) {
    copies.get(sourceScene).dispose();
  }
}

function rebindJoints(skin, targetSkin) {
  const joints = skin.listJoints();
  const targetJoints = targetSkin.listJoints();
  const sameSkeleton =
    joints.length === targetJoints.length &&
    joints.every((joint, index) => joint.getName() === targetJoints[index]?.getName());
  if (!sameSkeleton) {
    throw new Error('Hair and body skeletons differ; the joints cannot be rebound by order');
  }
  for (const joint of joints) {
    skin.removeJoint(joint);
    // The hair's copy of the skeleton is not in any scene, and prune() keeps it anyway.
    joint.dispose();
  }
  for (const joint of targetJoints) {
    skin.addJoint(joint);
  }
  skin.setSkeleton(targetSkin.getSkeleton());
}

/** One file with the generic clips and the bare skeleton they animate (no mesh). */
async function buildAnimations() {
  const document = await io.read(ANIMATION_LIBRARY);
  const root = document.getRoot();
  for (const animation of root.listAnimations()) {
    if (!ANIMATION_CLIPS.has(animation.getName())) {
      disposeAnimation(animation);
    }
  }
  const kept = root.listAnimations().map((animation) => animation.getName());
  const missing = [...ANIMATION_CLIPS].filter((name) => !kept.includes(name));
  if (missing.length > 0) {
    throw new Error(`Clips not found in the animation library: ${missing.join(', ')}`);
  }
  for (const node of root.listNodes()) {
    node.setMesh(null).setSkin(null);
  }
  for (const property of [...root.listMeshes(), ...root.listSkins(), ...root.listMaterials()]) {
    property.dispose();
  }
  await document.transform(resample(), dedup(), prune());
  await write(document, 'athlete-animations.glb');
}

/**
 * Disposing an animation leaves its samplers alive, and they keep their keyframe data out of
 * the reach of prune(). They go first.
 */
function disposeAnimation(animation) {
  for (const sampler of animation.listSamplers()) {
    sampler.dispose();
  }
  animation.dispose();
}

/**
 * Some packed .gltf files reference "<name>_png.png" while the pack ships "<name>.png", so
 * resources are read by hand with that one fallback.
 */
async function readGltf(file) {
  const directory = path.dirname(file);
  const json = JSON.parse(await readFile(file, 'utf8'));
  const resources = {};
  for (const { uri } of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (uri) {
      resources[uri] = await readFile(await existingResource(directory, decodeURIComponent(uri)));
    }
  }
  return io.readJSON({ json, resources });
}

async function existingResource(directory, name) {
  const file = path.join(directory, name);
  try {
    await access(file);
    return file;
  } catch {
    return path.join(directory, name.replace(/_png\.png$/, '.png'));
  }
}

async function write(document, name) {
  const file = path.join(OUTPUT, name);
  await io.write(file, document);
  const { size } = await stat(file);
  console.log(`${file}: ${(size / 1024).toFixed(0)} KB`);
}
