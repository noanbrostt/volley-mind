import { describe, expect, it } from 'vitest';
import { Vec3 } from './vec3';

const a = Vec3.create(1, 2, 3);
const b = Vec3.create(4, -5, 6);

describe('Vec3', () => {
  it('adds, subtracts and scales component-wise', () => {
    expect(Vec3.add(a, b)).toEqual({ x: 5, y: -3, z: 9 });
    expect(Vec3.sub(a, b)).toEqual({ x: -3, y: 7, z: -3 });
    expect(Vec3.scale(a, 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  it('never mutates its inputs', () => {
    Vec3.add(a, b);
    Vec3.scale(a, 10);
    Vec3.normalize(a);
    expect(a).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('computes dot and cross products', () => {
    expect(Vec3.dot(a, b)).toBe(4 - 10 + 18);
    const x = Vec3.create(1, 0, 0);
    const y = Vec3.create(0, 1, 0);
    expect(Vec3.cross(x, y)).toEqual({ x: 0, y: 0, z: 1 });
    expect(Vec3.dot(Vec3.cross(a, b), a)).toBeCloseTo(0);
  });

  it('measures length and distance', () => {
    const v = Vec3.create(3, 4, 12);
    expect(Vec3.lengthSquared(v)).toBe(169);
    expect(Vec3.length(v)).toBe(13);
    expect(Vec3.distance(Vec3.ZERO, v)).toBe(13);
  });

  it('normalizes to unit length and maps zero to zero', () => {
    expect(Vec3.length(Vec3.normalize(b))).toBeCloseTo(1);
    expect(Vec3.normalize(Vec3.ZERO)).toEqual(Vec3.ZERO);
  });

  it('interpolates linearly between two vectors', () => {
    expect(Vec3.lerp(a, b, 0)).toEqual(a);
    expect(Vec3.lerp(a, b, 1)).toEqual(b);
    expect(Vec3.lerp(a, b, 0.5)).toEqual({ x: 2.5, y: -1.5, z: 4.5 });
  });

  it('survives a JSON round trip as plain data', () => {
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it('exposes Y as the up axis', () => {
    expect(Vec3.UP).toEqual({ x: 0, y: 1, z: 0 });
  });
});
