import {
  LOCOMOTION_MAX_PLAYBACK_RATE,
  LOCOMOTION_MIN_PLAYBACK_RATE,
  LOCOMOTION_STANDING_SPEED_MPS,
  type LocomotionClip,
} from '@config/athlete-model';

export interface LocomotionPick {
  /** Index in the clip list. */
  readonly clipIndex: number;
  /** Playback speed multiplier, so the feet keep up with the ground speed. */
  readonly playbackRate: number;
}

/**
 * The clip whose own speed is closest to the athlete's: the first clip (standing) below the
 * standing threshold, otherwise the closest moving one, sped up or slowed down within limits.
 */
export function pickLocomotionClip(
  speedMps: number,
  clips: readonly LocomotionClip[],
): LocomotionPick {
  if (speedMps < LOCOMOTION_STANDING_SPEED_MPS || clips.length < 2) {
    return { clipIndex: 0, playbackRate: 1 };
  }
  let clipIndex = 1;
  for (let i = 2; i < clips.length; i++) {
    const clip = clips[i];
    const best = clips[clipIndex];
    if (clip && best && Math.abs(clip.speedMps - speedMps) < Math.abs(best.speedMps - speedMps)) {
      clipIndex = i;
    }
  }
  const clipSpeed = clips[clipIndex]?.speedMps ?? speedMps;
  const playbackRate = Math.min(
    LOCOMOTION_MAX_PLAYBACK_RATE,
    Math.max(LOCOMOTION_MIN_PLAYBACK_RATE, speedMps / clipSpeed),
  );
  return { clipIndex, playbackRate };
}

/**
 * Moves clip weights toward the active clip (linear crossfade over `crossfadeS`), keeping
 * them summing to 1 so blended poses never shrink toward the rest pose. Writes in place.
 */
export function stepCrossfade(
  weights: number[],
  activeIndex: number,
  seconds: number,
  crossfadeS: number,
): void {
  const step = crossfadeS > 0 ? seconds / crossfadeS : 1;
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i] ?? 0;
    const next = i === activeIndex ? Math.min(1, weight + step) : Math.max(0, weight - step);
    weights[i] = next;
    total += next;
  }
  if (total <= 0) {
    weights[activeIndex] = 1;
    return;
  }
  for (let i = 0; i < weights.length; i++) {
    weights[i] = (weights[i] ?? 0) / total;
  }
}

export interface Heading {
  /** Body yaw relative to the athlete's facing, in rad (positive turns toward the right). */
  readonly yaw: number;
  /** Moving backward: the clips play in reverse while the body keeps facing forward. */
  readonly reversed: boolean;
}

/**
 * Which way the body points while moving `relativeAngle` away from the facing (0 = ahead,
 * +π/2 = to the right): toward the movement when it is mostly ahead or sideways; otherwise
 * facing ahead, backpedaling. `squareUp` (0–1) turns the body back toward the facing.
 */
export function headingFor(relativeAngle: number, maxTurn: number, squareUp: number): Heading {
  const backward = Math.abs(relativeAngle) > maxTurn;
  const turn = backward ? relativeAngle - Math.PI * Math.sign(relativeAngle) : relativeAngle;
  return { yaw: turn * (1 - squareUp), reversed: backward };
}

/** Moves `current` toward `target` along the shortest way around the circle. */
export function approachAngle(current: number, target: number, blend: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * blend;
}
