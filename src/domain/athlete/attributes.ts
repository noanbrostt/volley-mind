/** Top of the attribute scale; attributes go from 0 to this value. */
export const ATTRIBUTE_SCALE_MAX = 100;

/**
 * What the athlete is good at, on a 0–100 scale (names from the glossary). Only the
 * attributes the attack-defense drill uses so far.
 */
export interface AthleteAttributes {
  readonly attack: number;
  readonly dig: number;
  readonly set: number;
  readonly overhead: number;
  readonly bump: number;
  readonly speed: number;
  readonly reading: number;
}

export function uniformAttributes(value: number): AthleteAttributes {
  return {
    attack: value,
    dig: value,
    set: value,
    overhead: value,
    bump: value,
    speed: value,
    reading: value,
  };
}

/** Attribute as a 0–1 fraction, clamped, for use in formulas. */
export function attributeFraction(value: number): number {
  return Math.min(1, Math.max(0, value / ATTRIBUTE_SCALE_MAX));
}
