import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_SCALE_MAX, attributeFraction, uniformAttributes } from './attributes';

describe('athlete attributes', () => {
  it('builds a profile with the same value everywhere', () => {
    const attributes = uniformAttributes(70);
    expect(Object.values(attributes).every((value) => value === 70)).toBe(true);
  });

  it('maps the 0–100 scale to a clamped 0–1 fraction', () => {
    expect(attributeFraction(0)).toBe(0);
    expect(attributeFraction(50)).toBe(0.5);
    expect(attributeFraction(ATTRIBUTE_SCALE_MAX)).toBe(1);
    expect(attributeFraction(-10)).toBe(0);
    expect(attributeFraction(130)).toBe(1);
  });
});
