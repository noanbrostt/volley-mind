import { ATTACK_CONTROLLED_SPEED_MPS } from '@config/touch';
import { createRng } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { createAthlete } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { stepBall } from '@domain/ball/step-ball';
import { describe, expect, it } from 'vitest';
import { resolveTouch, type TouchContext } from './resolve-touch';
import { IDEAL_AIM } from './touch-aim';
import { touchTargetFor } from './touch-target';

const DT = 1 / 60;
const physics = DEFAULT_BALL_PHYSICS;
const toucher = createAthlete({ id: 'a', basePosition: Vec3.create(0, 0, -3), facing: 0 });
const receiver = createAthlete({ id: 'b', basePosition: Vec3.create(0, 0, 3), facing: Math.PI });

const setContext: TouchContext = {
  contactPosition: contactPoint(toucher, 'overhead'),
  toucher,
  receiver,
  action: 'set',
  technique: 'overhead',
  aim: IDEAL_AIM,
  quality: 1,
  physics,
  stepSeconds: DT,
  rng: createRng(1),
};

/** Closest the ball center passes to `target` when launched from the context. */
function closestApproach(context: TouchContext, velocity: Vec3, target: Vec3): number {
  let current: BallState = { position: context.contactPosition, velocity };
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 600; i++) {
    const result = stepBall(current, physics, DT);
    const a = current.position;
    const ab = Vec3.sub(result.ball.position, a);
    const t = Math.min(1, Math.max(0, Vec3.dot(Vec3.sub(target, a), ab) / Vec3.lengthSquared(ab)));
    closest = Math.min(closest, Vec3.distance(target, Vec3.add(a, Vec3.scale(ab, t))));
    if (result.bounce) {
      break;
    }
    current = result.ball;
  }
  return closest;
}

describe('resolveTouch', () => {
  it('sends a perfect set to the attacker’s ideal point', () => {
    const { velocity } = resolveTouch(setContext);
    const ideal = touchTargetFor('set', 'overhead', receiver).point;
    expect(closestApproach(setContext, velocity, ideal)).toBeLessThan(0.01);
  });

  it('drives a perfect controlled attack at the defender, at the controlled speed', () => {
    const context: TouchContext = {
      ...setContext,
      contactPosition: contactPoint(toucher, 'spike'),
      action: 'attack',
      technique: 'spike',
    };
    const { velocity } = resolveTouch(context);
    expect(Vec3.length(velocity)).toBeCloseTo(ATTACK_CONTROLLED_SPEED_MPS, 6);
    const ideal = touchTargetFor('attack', 'spike', receiver).point;
    expect(closestApproach(context, velocity, ideal)).toBeLessThan(0.01);
  });

  it('moves the ball to the toucher’s right with lateral aim', () => {
    const { velocity } = resolveTouch({ ...setContext, aim: { lateral: 0.5, force: 0.5 } });
    expect(velocity.x).toBeGreaterThan(0.5);
  });

  it('scatters more as quality drops', () => {
    const ideal = touchTargetFor('set', 'overhead', receiver).point;
    const meanMiss = (quality: number): number => {
      let total = 0;
      for (let seed = 0; seed < 40; seed++) {
        const context = { ...setContext, quality, rng: createRng(seed) };
        total += closestApproach(context, resolveTouch(context).velocity, ideal);
      }
      return total / 40;
    };
    expect(meanMiss(0.3)).toBeGreaterThan(meanMiss(0.9) * 2);
  });

  it('is deterministic and always advances the RNG', () => {
    const context = { ...setContext, quality: 0.5 };
    expect(resolveTouch(context)).toEqual(resolveTouch(context));
    expect(resolveTouch(context).rng).not.toBe(context.rng);
  });

  it('changes the ball smoothly as the aim moves, with no jumps (attack and set)', () => {
    const attack: TouchContext = {
      ...setContext,
      contactPosition: contactPoint(toucher, 'spike'),
      action: 'attack',
      technique: 'spike',
    };
    for (const context of [attack, setContext]) {
      let previous = resolveTouch({ ...context, aim: { lateral: -0.5, force: 0.05 } }).velocity;
      for (let i = 1; i <= 90; i++) {
        const aim = { lateral: -0.5 + i / 90, force: 0.05 + (0.9 * i) / 90 };
        const velocity = resolveTouch({ ...context, aim }).velocity;
        expect(Vec3.distance(velocity, previous)).toBeLessThan(0.6);
        previous = velocity;
      }
    }
  });
});
