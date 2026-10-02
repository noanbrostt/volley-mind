import { AnimationGroupMask } from '@babylonjs/core/Animations/animationGroupMask';
import { CROUCH_CLIP, CROUCH_MAX } from '@config/athlete-gestures';
import { ANIMATION_CROSSFADE_S, LOCOMOTION_CLIPS } from '@config/athlete-model';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';
import { createArmGestures } from './arm-gestures';
import type { AthleteModel } from './load-athlete-models';
import { pickLocomotionClip, stepCrossfade } from './locomotion';
import { CHARACTER_LEGS } from './rig-bone-names';

export interface AthleteAnimator {
  /**
   * Blends the clips toward what the athlete is doing and plays the volleyball gestures.
   * @param nowTick the rendered moment, in simulation ticks (fractional).
   * @param gameSeconds game time since the last frame (slowed down during the aim).
   * @param timeScale game time per real second, so clips slow down with the game.
   */
  update(athlete: AthleteState, world: WorldState, frame: AnimationFrame): void;
}

export interface AnimationFrame {
  readonly nowTick: number;
  readonly stepSeconds: number;
  readonly gameSeconds: number;
  readonly timeScale: number;
}

/**
 * Plays one model: locomotion clips crossfaded by the athlete's ground speed, with the
 * volleyball gestures over the arms.
 */
export function createAthleteAnimator(model: AthleteModel): AthleteAnimator {
  const arms = createArmGestures(model.root);
  const groups = LOCOMOTION_CLIPS.map(({ name }) => {
    const group = model.clips.get(name);
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
  const crouchGroup = model.clips.get(CROUCH_CLIP);
  if (!crouchGroup) {
    throw new Error(`Missing crouch clip "${CROUCH_CLIP}"`);
  }
  // Only the legs crouch: the arms belong to the gesture, the torso to the running clips.
  crouchGroup.mask = new AnimationGroupMask([...CHARACTER_LEGS]);
  crouchGroup.weight = 0;
  crouchGroup.play(true);

  return {
    update(athlete, world, { nowTick, stepSeconds, gameSeconds, timeScale }) {
      arms.update(athlete, world, nowTick, stepSeconds, gameSeconds);
      // Weights above 1 get normalized, so a crouch fraction f over the running clips (which
      // sum to 1) needs the weight f / (1 − f).
      const crouch = Math.min(arms.crouch, CROUCH_MAX);
      crouchGroup.weight = crouch / (1 - crouch);
      crouchGroup.speedRatio = timeScale;
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
