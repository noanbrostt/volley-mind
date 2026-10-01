/**
 * Seeded pseudo-random generator (mulberry32). The whole state is one uint32, kept as plain
 * data so the simulation can store, snapshot and replay it. Every draw returns the next
 * state instead of mutating, which keeps callers pure and deterministic.
 */
export type RngState = number;

export interface RngDraw<T> {
  readonly value: T;
  readonly next: RngState;
}

// mulberry32 constants (algorithm definition, not tuning).
const GOLDEN_GAMMA = 0x6d2b79f5;
const UINT32_RANGE = 4294967296;

export function createRng(seed: number): RngState {
  return seed >>> 0;
}

/** Uniform float in [0, 1). */
export function nextFloat(state: RngState): RngDraw<number> {
  const next = (state + GOLDEN_GAMMA) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  return { value, next };
}

/** Uniform float in [min, max). */
export function nextRange(state: RngState, min: number, max: number): RngDraw<number> {
  const draw = nextFloat(state);
  return { value: min + (max - min) * draw.value, next: draw.next };
}

/** Uniform integer in [min, maxExclusive). */
export function nextInt(state: RngState, min: number, maxExclusive: number): RngDraw<number> {
  const draw = nextRange(state, min, maxExclusive);
  return { value: Math.floor(draw.value), next: draw.next };
}
