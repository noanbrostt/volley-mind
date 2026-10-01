import { describe, expect, it } from 'vitest';
import {
  advanceClock,
  createFixedStepClock,
  type FixedStepClock,
  type FixedStepClockSettings,
} from './fixed-step-clock';

const STEP = 1 / 60;
const settings: FixedStepClockSettings = { stepSeconds: STEP, maxStepsPerFrame: 5 };

function runFrames(frames: number[]): { steps: number; clock: FixedStepClock } {
  let clock = createFixedStepClock();
  let steps = 0;
  for (const frame of frames) {
    const advance = advanceClock(clock, settings, frame);
    steps += advance.steps;
    clock = advance.clock;
  }
  return { steps, clock };
}

describe('fixed-step clock', () => {
  it('runs one step per frame when the frame matches the step', () => {
    const advance = advanceClock(createFixedStepClock(), settings, STEP);
    expect(advance.steps).toBe(1);
    expect(advance.alpha).toBeCloseTo(0);
  });

  it('accumulates short frames until a full step is due', () => {
    const first = advanceClock(createFixedStepClock(), settings, STEP * 0.4);
    expect(first.steps).toBe(0);
    expect(first.alpha).toBeCloseTo(0.4);

    const second = advanceClock(first.clock, settings, STEP * 0.4);
    expect(second.steps).toBe(0);
    expect(second.alpha).toBeCloseTo(0.8);

    const third = advanceClock(second.clock, settings, STEP * 0.4);
    expect(third.steps).toBe(1);
    expect(third.alpha).toBeCloseTo(0.2);
  });

  it('runs several steps in one long frame, even at exact floating-point boundaries', () => {
    const advance = advanceClock(createFixedStepClock(), settings, 0.05);
    expect(advance.steps).toBe(3);
    expect(advance.alpha).toBeCloseTo(0);
  });

  it('keeps simulated time in sync with real time over many uneven frames', () => {
    // Mix of 120 Hz, 60 Hz and 30 Hz frame times, never long enough to hit the cap.
    const pattern = [1 / 120, 1 / 60, 1 / 30];
    const frames = Array.from({ length: 300 }, (_, i) => pattern[i % pattern.length] ?? 0);
    const elapsed = frames.reduce((sum, frame) => sum + frame, 0);

    const { steps, clock } = runFrames(frames);

    expect(steps * STEP + clock.accumulatorSeconds).toBeCloseTo(elapsed, 9);
  });

  it('caps steps after a long pause and drops the backlog instead of catching up', () => {
    const advance = advanceClock(createFixedStepClock(), settings, 10);
    expect(advance.steps).toBe(5);
    expect(advance.clock.accumulatorSeconds).toBeLessThan(STEP);
    expect(advance.droppedSeconds).toBeGreaterThan(9.9);

    const next = advanceClock(advance.clock, settings, STEP);
    expect(next.steps).toBe(1);
    expect(next.droppedSeconds).toBe(0);
  });

  it('ignores negative and non-finite frame times', () => {
    for (const frame of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const advance = advanceClock(createFixedStepClock(), settings, frame);
      expect(advance.steps).toBe(0);
      expect(advance.clock.accumulatorSeconds).toBe(0);
    }
  });

  it('always keeps alpha in [0, 1)', () => {
    let clock = createFixedStepClock();
    for (let i = 0; i < 500; i++) {
      const advance = advanceClock(clock, settings, ((i * 7) % 13) / 240);
      expect(advance.alpha).toBeGreaterThanOrEqual(0);
      expect(advance.alpha).toBeLessThan(1);
      clock = advance.clock;
    }
  });
});
