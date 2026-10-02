import { BUMP_CONTACT_FORWARD_M, BUMP_CONTACT_HEIGHT_RATIO } from '@config/athlete';
import { GESTURE_RECOVER_S, GESTURES, type GestureName } from '@config/athlete-gestures';
import { Vec3 } from '@core/vec3';
import type { AthleteState } from '@domain/athlete/athlete-state';
import type { WorldState } from '@simulation/world-state';

/** The gesture an athlete is heading into, or coming out of. */
export interface GestureMoment {
  readonly name: GestureName;
  /** Ball center at contact, in world coordinates (m). */
  readonly ball: Vec3;
  /** Simulation tick (fractional) of the contact. */
  readonly contactTick: number;
}

/**
 * What the athlete's arms are doing at `nowTick`: preparing the coming touch, holding the
 * ball while aiming (contact kept at "now"), tossing to restart, or finishing the last
 * gesture (`previous`) until its recovery is over.
 */
export function trackGesture(
  previous: GestureMoment | null,
  athlete: AthleteState,
  world: WorldState,
  nowTick: number,
  stepSeconds: number,
): GestureMoment | null {
  const { drill } = world;
  const plan = drill.phase === 'rally' ? drill.incoming.plan : null;
  if (drill.phase === 'rally' && drill.incoming.athleteId === athlete.id && plan) {
    const { incoming } = drill;
    return {
      name: plan.technique,
      ball: plan.contact.point,
      contactTick: incoming.holdStartTick === null ? incoming.contactTick : nowTick,
    };
  }
  if (drill.phase === 'broken' && drill.restart.athleteId === athlete.id) {
    return { name: 'self-toss', ball: tossHands(athlete), contactTick: drill.restart.tick };
  }
  if (previous && (nowTick - previous.contactTick) * stepSeconds < GESTURE_RECOVER_S) {
    return previous;
  }
  return null;
}

/**
 * How strongly the gesture overrides the running animation, 0–1: rising over the gesture's
 * preparation, full at contact, fading during the recovery.
 */
export function gestureStrength(moment: GestureMoment, nowTick: number, stepSeconds: number) {
  const secondsToContact = (moment.contactTick - nowTick) * stepSeconds;
  if (secondsToContact >= 0) {
    return smoothstep(1 - secondsToContact / GESTURES[moment.name].prepareS);
  }
  return smoothstep(1 + secondsToContact / GESTURE_RECOVER_S);
}

/** Where the hands hold the ball before the self-toss: where the toss leaves from. */
function tossHands(athlete: AthleteState): Vec3 {
  const forward = Vec3.create(Math.sin(athlete.facing), 0, Math.cos(athlete.facing));
  return Vec3.add(
    Vec3.add(athlete.position, Vec3.scale(forward, BUMP_CONTACT_FORWARD_M)),
    Vec3.create(0, athlete.heightM * BUMP_CONTACT_HEIGHT_RATIO, 0),
  );
}

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
