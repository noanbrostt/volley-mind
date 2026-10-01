import {
  LOCOMOTION_MAX_PLAYBACK_RATE,
  LOCOMOTION_MIN_PLAYBACK_RATE,
  type LocomotionClip,
} from '@config/athlete-model';
import { describe, expect, it } from 'vitest';
import { pickLocomotionClip, stepCrossfade } from './locomotion';

const CLIPS: readonly LocomotionClip[] = [
  { name: 'idle', speedMps: 0 },
  { name: 'walk', speedMps: 1.5 },
  { name: 'run', speedMps: 4 },
];

describe('pickLocomotionClip', () => {
  it('stands still at rest', () => {
    expect(pickLocomotionClip(0, CLIPS)).toEqual({ clipIndex: 0, playbackRate: 1 });
  });

  it('picks the moving clip closest to the speed', () => {
    expect(pickLocomotionClip(1.6, CLIPS).clipIndex).toBe(1);
    expect(pickLocomotionClip(3.5, CLIPS).clipIndex).toBe(2);
  });

  it('matches the playback to the ground speed', () => {
    expect(pickLocomotionClip(1.8, CLIPS).playbackRate).toBeCloseTo(1.2);
  });

  it('keeps the playback within limits', () => {
    expect(pickLocomotionClip(0.3, CLIPS).playbackRate).toBe(LOCOMOTION_MIN_PLAYBACK_RATE);
    expect(pickLocomotionClip(20, CLIPS).playbackRate).toBe(LOCOMOTION_MAX_PLAYBACK_RATE);
  });
});

describe('stepCrossfade', () => {
  it('fades toward the active clip over the crossfade time', () => {
    const weights = [1, 0, 0];
    stepCrossfade(weights, 1, 0.05, 0.1);
    expect(weights[0]).toBeCloseTo(0.5);
    expect(weights[1]).toBeCloseTo(0.5);
    stepCrossfade(weights, 1, 0.05, 0.1);
    expect(weights).toEqual([0, 1, 0]);
  });

  it('always sums to 1', () => {
    const weights = [0.2, 0.5, 0.3];
    stepCrossfade(weights, 2, 0.01, 0.1);
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
  });
});
