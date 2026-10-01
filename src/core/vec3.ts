/**
 * Immutable 3D vector as plain data, so it can live inside serializable domain state.
 * Readonly fields guarantee immutability at compile time; we skip Object.freeze to keep
 * the hot simulation path allocation-light.
 */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function create(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

const ZERO: Vec3 = Object.freeze(create(0, 0, 0));
const UP: Vec3 = Object.freeze(create(0, 1, 0));

function add(a: Vec3, b: Vec3): Vec3 {
  return create(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return create(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scale(v: Vec3, factor: number): Vec3 {
  return create(v.x * factor, v.y * factor, v.z * factor);
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return create(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

function lengthSquared(v: Vec3): number {
  return dot(v, v);
}

function length(v: Vec3): number {
  return Math.sqrt(lengthSquared(v));
}

/** A zero vector has no direction, so it normalizes to zero instead of NaN. */
function normalize(v: Vec3): Vec3 {
  const len = length(v);
  return len === 0 ? ZERO : scale(v, 1 / len);
}

function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/** Linear interpolation: t = 0 gives `a`, t = 1 gives `b`. */
function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return create(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
}

export const Vec3 = Object.freeze({
  create,
  ZERO,
  UP,
  add,
  sub,
  scale,
  dot,
  cross,
  lengthSquared,
  length,
  normalize,
  distance,
  lerp,
});
