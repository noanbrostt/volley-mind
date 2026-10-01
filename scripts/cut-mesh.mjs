// Cuts a skinned triangle mesh along a plane, so material borders can follow a straight line
// instead of the zigzag of the existing triangles.

const MAX_INFLUENCES = 4;

/**
 * Splits every triangle of `primitive` that crosses the plane `point[axis] === value`.
 * New vertices sit on the crossed edges, with every attribute interpolated (skin weights
 * blended), and are shared by the triangles on both sides of an edge, so no cracks appear.
 * @param axis 0, 1 or 2 (x, y, z).
 */
export function cutPrimitive(primitive, axis, value) {
  const semantics = primitive.listSemantics();
  const attributes = Object.fromEntries(
    semantics.map((semantic) => [semantic, readElements(primitive.getAttribute(semantic))]),
  );
  const positions = attributes.POSITION;
  const indices = primitive.getIndices();
  const triangles = [];
  for (let i = 0; i < indices.getCount(); i++) {
    triangles.push(indices.getScalar(i));
  }

  const edgeVertices = new Map();
  const vertexOnEdge = (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeVertices.has(key)) {
      const t = (value - positions[a][axis]) / (positions[b][axis] - positions[a][axis]);
      for (const semantic of semantics) {
        attributes[semantic].push(interpolate(semantic, attributes, a, b, t));
      }
      edgeVertices.set(key, positions.length - 1);
    }
    return edgeVertices.get(key);
  };

  const result = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const corners = [triangles[i], triangles[i + 1], triangles[i + 2]];
    const sides = corners.map((corner) => Math.sign(positions[corner][axis] - value));
    if (!(sides.includes(1) && sides.includes(-1))) {
      result.push(...corners);
      continue;
    }
    result.push(...splitTriangle(corners, sides, vertexOnEdge));
  }

  for (const semantic of semantics) {
    writeElements(primitive.getAttribute(semantic), attributes[semantic]);
  }
  const indexArray = positions.length <= 0xffff ? Uint16Array : Uint32Array;
  indices.setArray(new indexArray(result));
}

/**
 * Rotates the triangle so its lone corner (alone on its side of the plane, or on the plane)
 * comes first, keeping the winding, then cuts it into one triangle and one quad.
 */
function splitTriangle(corners, sides, vertexOnEdge) {
  const lone = sides.findIndex(
    (side) => side !== 0 && sides.filter((other) => other === side).length === 1,
  );
  const [a, b, c] = [0, 1, 2].map((offset) => corners[(lone + offset) % 3]);
  const [, sideB, sideC] = [0, 1, 2].map((offset) => sides[(lone + offset) % 3]);
  if (sideB === 0) {
    // b lies on the plane: only the edge c–a is crossed.
    const ca = vertexOnEdge(c, a);
    return [a, b, ca, b, c, ca];
  }
  if (sideC === 0) {
    const ab = vertexOnEdge(a, b);
    return [a, ab, c, ab, b, c];
  }
  const ab = vertexOnEdge(a, b);
  const ca = vertexOnEdge(c, a);
  return [a, ab, ca, ab, b, c, ab, c, ca];
}

function interpolate(semantic, attributes, a, b, t) {
  if (semantic.startsWith('JOINTS_')) {
    return blendInfluences(attributes, semantic, a, b, t).joints;
  }
  if (semantic.startsWith('WEIGHTS_')) {
    const jointsSemantic = semantic.replace('WEIGHTS_', 'JOINTS_');
    return blendInfluences(attributes, jointsSemantic, a, b, t).weights;
  }
  const from = attributes[semantic][a];
  const to = attributes[semantic][b];
  const mixed = from.map((component, index) => component + (to[index] - component) * t);
  return semantic === 'NORMAL' ? normalize(mixed) : mixed;
}

/** Mixes both vertices' joint weights, keeping the strongest four, renormalized. */
function blendInfluences(attributes, jointsSemantic, a, b, t) {
  const weightsSemantic = jointsSemantic.replace('JOINTS_', 'WEIGHTS_');
  const totals = new Map();
  for (const [vertex, share] of [
    [a, 1 - t],
    [b, t],
  ]) {
    attributes[jointsSemantic][vertex].forEach((joint, slot) => {
      const weight = attributes[weightsSemantic][vertex][slot] * share;
      totals.set(joint, (totals.get(joint) ?? 0) + weight);
    });
  }
  const strongest = [...totals]
    .filter(([, weight]) => weight > 0)
    .sort((x, y) => y[1] - x[1])
    .slice(0, MAX_INFLUENCES);
  const sum = strongest.reduce((total, [, weight]) => total + weight, 0);
  const joints = [0, 0, 0, 0];
  const weights = [0, 0, 0, 0];
  strongest.forEach(([joint, weight], slot) => {
    joints[slot] = joint;
    weights[slot] = weight / sum;
  });
  return { joints, weights };
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((component) => component / length);
}

function readElements(accessor) {
  const elements = [];
  for (let i = 0; i < accessor.getCount(); i++) {
    elements.push(accessor.getElement(i, []));
  }
  return elements;
}

/** Same component type as before; setElement handles normalized components. */
function writeElements(accessor, elements) {
  const ArrayType = accessor.getArray().constructor;
  accessor.setArray(new ArrayType(elements.length * accessor.getElementSize()));
  elements.forEach((element, index) => {
    accessor.setElement(index, element);
  });
}
