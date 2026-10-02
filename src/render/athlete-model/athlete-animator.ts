import { AnimationGroupMask } from '@babylonjs/core/Animations/animationGroupMask';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CROUCH_CLIP, CROUCH_MAX } from '@config/athlete-gestures';
import {
  ANIMATION_CROSSFADE_S,
  HEADING_MAX_TURN_RAD,
  HEADING_SMOOTHING_S,
  LOCOMOTION_CLIPS,
  LOCOMOTION_STANDING_SPEED_MPS,
} from '@config/athlete-model';
import { ATHLETE_BODY_RADIUS_M } from '@config/court-scene';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';
import { createArmGestures } from './arm-gestures';
import type { AthleteModel } from './load-athlete-models';
import { approachAngle, headingFor, pickLocomotionClip, stepCrossfade } from './locomotion';
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
 * volleyball gestures over the arms. `heading` turns the body (around the feet) toward where
 * it runs, relative to the athlete's facing.
 */
export function createAthleteAnimator(
  model: AthleteModel,
  heading: TransformNode,
): AthleteAnimator {
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
      const direction = runningDirection(athlete, speed);
      const turn = headingFor(direction, HEADING_MAX_TURN_RAD, arms.strength);
      const turnBlend = 1 - Math.exp(-gameSeconds / HEADING_SMOOTHING_S);
      if (athlete.recovery) {
        // Lying after a dive: the athlete view lays the whole body down.
        heading.rotation.set(0, 0, 0);
        heading.position.y = 0;
      } else {
        // A dive turns the body toward the ball; otherwise toward the run, squaring up.
        const yaw = arms.diveLean > 0 ? arms.diveYaw : turn.yaw;
        heading.rotation.y = approachAngle(heading.rotation.y, yaw, turnBlend);
        // Tipping toward the floor before a dive; at contact it matches the lying pose.
        heading.rotation.x = (Math.PI / 2) * arms.diveLean;
        heading.position.y = ATHLETE_BODY_RADIUS_M * arms.diveLean;
      }
      const playDirection = turn.reversed ? -1 : 1;
      stepCrossfade(weights, pick.clipIndex, gameSeconds, ANIMATION_CROSSFADE_S);
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        if (!group) {
          continue;
        }
        group.weight = weights[i] ?? 0;
        group.speedRatio =
          (i === pick.clipIndex ? pick.playbackRate : 1) * timeScale * playDirection;
      }
    },
  };
}

/** Running direction relative to the facing, in rad (0 = ahead, +π/2 = right); 0 at rest. */
function runningDirection(athlete: AthleteState, speed: number): number {
  if (speed < LOCOMOTION_STANDING_SPEED_MPS) {
    return 0;
  }
  const sin = Math.sin(athlete.facing);
  const cos = Math.cos(athlete.facing);
  const ahead = athlete.velocity.x * sin + athlete.velocity.z * cos;
  const toRight = athlete.velocity.x * cos - athlete.velocity.z * sin;
  return Math.atan2(toRight, ahead);
}
