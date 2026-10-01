import {
  BUMP_CONTACT_FORWARD_M,
  BUMP_CONTACT_HEIGHT_RATIO,
  OVERHEAD_CONTACT_FORWARD_M,
  OVERHEAD_CONTACT_HEIGHT_RATIO,
  SPIKE_CONTACT_DOMINANT_SIDE_M,
  SPIKE_CONTACT_FORWARD_M,
  SPIKE_CONTACT_HEIGHT_RATIO,
} from '@config/athlete';
import { Vec3 } from '@core/vec3';
import type { Technique } from '@domain/contact/technique';
import { type AthleteState, forwardOf, rightOf } from './athlete-state';

interface ContactOffset {
  readonly heightRatio: number;
  readonly forward: number;
  /** Toward the dominant arm; negative would mean the other side. */
  readonly dominantSide: number;
}

const CONTACT_OFFSETS: Readonly<Record<Technique, ContactOffset>> = {
  overhead: {
    heightRatio: OVERHEAD_CONTACT_HEIGHT_RATIO,
    forward: OVERHEAD_CONTACT_FORWARD_M,
    dominantSide: 0,
  },
  bump: {
    heightRatio: BUMP_CONTACT_HEIGHT_RATIO,
    forward: BUMP_CONTACT_FORWARD_M,
    dominantSide: 0,
  },
  spike: {
    heightRatio: SPIKE_CONTACT_HEIGHT_RATIO,
    forward: SPIKE_CONTACT_FORWARD_M,
    dominantSide: SPIKE_CONTACT_DOMINANT_SIDE_M,
  },
};

/** Where, in the world, the athlete's body meets the ball with this technique. */
export function contactPoint(athlete: AthleteState, technique: Technique): Vec3 {
  const offset = CONTACT_OFFSETS[technique];
  const sideSign = athlete.dominantArm === 'right' ? 1 : -1;
  const horizontal = Vec3.add(
    Vec3.scale(forwardOf(athlete.facing), offset.forward),
    Vec3.scale(rightOf(athlete.facing), offset.dominantSide * sideSign),
  );
  return Vec3.add(
    Vec3.add(athlete.position, horizontal),
    Vec3.create(0, athlete.heightM * offset.heightRatio, 0),
  );
}
