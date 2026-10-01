import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { ANIMATION_CROSSFADE_S, LOCOMOTION_CLIPS } from '@config/athlete-model';
import type { AthleteState } from '@domain/athlete/athlete-state';
import { pickLocomotionClip, stepCrossfade } from './locomotion';

export interface AthleteAnimator {
  /**
   * Blends the clips toward what the athlete is doing.
   * @param gameSeconds game time since the last frame (slowed down during the aim).
   * @param timeScale game time per real second, so clips slow down with the game.
   */
  update(athlete: AthleteState, gameSeconds: number, timeScale: number): void;
}

/** Plays the locomotion clips of one model, crossfading by the athlete's ground speed. */
export function createAthleteAnimator(clips: ReadonlyMap<string, AnimationGroup>): AthleteAnimator {
  const groups = LOCOMOTION_CLIPS.map(({ name }) => {
    const group = clips.get(name);
    if (!group) {
      throw new Error(`Missing locomotion clip "${name}"`);
    }
    return group;
  });
  const weights = groups.map((_, index) => (index === 0 ? 1 : 0));
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group) {
      group.weight = weights[i] ?? 0;
      group.play(true);
    }
  }

  return {
    update(athlete, gameSeconds, timeScale) {
      const speed = Math.hypot(athlete.velocity.x, athlete.velocity.z);
      const pick = pickLocomotionClip(speed, LOCOMOTION_CLIPS);
      stepCrossfade(weights, pick.clipIndex, gameSeconds, ANIMATION_CROSSFADE_S);
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        if (!group) {
          continue;
        }
        group.weight = weights[i] ?? 0;
        group.speedRatio = (i === pick.clipIndex ? pick.playbackRate : 1) * timeScale;
      }
    },
  };
}
