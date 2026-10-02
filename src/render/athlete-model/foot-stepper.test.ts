import { describe, expect, it } from 'vitest';
import {
  createFoot,
  type FloorPoint,
  type Foot,
  footPosition,
  resetFeet,
  type StepRules,
  stepFeet,
} from './foot-stepper';

const RULES: StepRules = { triggerM: 0.1, durationS: 0.2, leadS: 0 };
const DT = 1 / 60;
const STILL: FloorPoint = { x: 0, z: 0 };

function feetAt(left: FloorPoint, right: FloorPoint): [Foot, Foot] {
  return [createFoot(left), createFoot(right)];
}

describe('stepFeet', () => {
  it('keeps both feet planted while the body stays close', () => {
    const feet = feetAt({ x: -0.2, z: 0 }, { x: 0.2, z: 0 });
    stepFeet(
      feet,
      [
        { x: -0.15, z: 0 },
        { x: 0.25, z: 0 },
      ],
      STILL,
      DT,
      RULES,
    );
    expect(feet[0].step).toBeNull();
    expect(feet[1].step).toBeNull();
  });

  it('steps one foot at a time, the one farther from home first', () => {
    const feet = feetAt({ x: -0.2, z: 0 }, { x: 0.2, z: 0 });
    stepFeet(
      feet,
      [
        { x: 0, z: 0 },
        { x: 0.5, z: 0 },
      ],
      STILL,
      DT,
      RULES,
    );
    expect(feet[1].step?.to).toEqual({ x: 0.5, z: 0 });
    expect(feet[0].step).toBeNull();
  });

  it('lands the step after its duration and lets the other foot go', () => {
    const feet = feetAt({ x: -0.2, z: 0 }, { x: 0.2, z: 0 });
    const homes: [FloorPoint, FloorPoint] = [
      { x: 0, z: 0 },
      { x: 0.5, z: 0 },
    ];
    for (let t = 0; t < RULES.durationS + DT; t += DT) {
      stepFeet(feet, homes, STILL, DT, RULES);
    }
    expect(feet[1].planted).toEqual({ x: 0.5, z: 0 });
    expect(feet[0].step).not.toBeNull();
  });

  it('leads the landing spot with the body velocity', () => {
    const feet = feetAt({ x: 0, z: 0 }, { x: 0.4, z: 0 });
    stepFeet(
      feet,
      [
        { x: 0.3, z: 0 },
        { x: 0.4, z: 0 },
      ],
      { x: 2, z: 0 },
      DT,
      {
        ...RULES,
        leadS: 0.1,
      },
    );
    expect(feet[0].step?.to.x).toBeCloseTo(0.5);
  });
});

describe('footPosition', () => {
  it('lifts the foot in an arc and moves it along the floor', () => {
    const foot = createFoot({ x: 0, z: 0 });
    foot.step = { from: { x: 0, z: 0 }, to: { x: 1, z: 0 }, progress: 0.5 };
    const at: FloorPoint = { x: 0, z: 0 };
    expect(footPosition(foot, at)).toBeCloseTo(1);
    expect(at.x).toBeCloseTo(0.5);
  });
});

describe('resetFeet', () => {
  it('stands both feet on their homes', () => {
    const feet = feetAt({ x: 3, z: 3 }, { x: 4, z: 4 });
    resetFeet(feet, [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ]);
    expect(feet[0].planted).toEqual({ x: 0, z: 0 });
    expect(feet[1].step).toBeNull();
  });
});
