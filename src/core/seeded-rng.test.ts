import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt, nextRange, type RngState } from './seeded-rng';

function drawFloats(seed: number, count: number): number[] {
  let state: RngState = createRng(seed);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const draw = nextFloat(state);
    values.push(draw.value);
    state = draw.next;
  }
  return values;
}

describe('seeded RNG', () => {
  it('repeats the exact sequence for the same seed', () => {
    expect(drawFloats(42, 100)).toEqual(drawFloats(42, 100));
  });

  it('produces different sequences for different seeds', () => {
    expect(drawFloats(1, 10)).not.toEqual(drawFloats(2, 10));
  });

  it('is pure: drawing from the same state twice gives the same value', () => {
    const state = createRng(7);
    expect(nextFloat(state)).toEqual(nextFloat(state));
  });

  it('keeps floats in [0, 1) with a roughly uniform mean', () => {
    const values = drawFloats(123, 10_000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeCloseTo(0.5, 1);
  });

  it('keeps ranges and integers inside their bounds', () => {
    let state = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const range = nextRange(state, -2, 3);
      expect(range.value).toBeGreaterThanOrEqual(-2);
      expect(range.value).toBeLessThan(3);
      const int = nextInt(range.next, 1, 7);
      expect(Number.isInteger(int.value)).toBe(true);
      seen.add(int.value);
      state = int.next;
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('normalizes any seed to a uint32 state that survives JSON', () => {
    const state = createRng(-1);
    expect(state).toBe(4294967295);
    expect(JSON.parse(JSON.stringify(state))).toBe(state);
  });
});
