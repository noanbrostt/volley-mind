import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/** A bone (joint node) of a loaded model, by name; throws when the model lacks it. */
export function findBone(modelRoot: TransformNode, name: string): TransformNode {
  const node = modelRoot.getDescendants(false, (candidate) => candidate.name === name)[0];
  if (!(node instanceof TransformNode)) {
    throw new Error(`Bone ${name} not found in ${modelRoot.name}`);
  }
  return node;
}

/** Every node above `bone`, top first, so their world matrices can refresh in order. */
export function ancestorsOf(bone: TransformNode): TransformNode[] {
  const ancestors: TransformNode[] = [];
  for (let node = bone.parent; node; node = node.parent) {
    if (node instanceof TransformNode) {
      ancestors.unshift(node);
    }
  }
  return ancestors;
}
