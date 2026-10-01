import { SELF_TOSS_RISE_M } from '@config/attack-defense-drill';
import { Vec3 } from '@core/vec3';
import { createAthlete } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import { predictCrossing } from '@domain/ball/predict-crossing';
import { describe, expect, it } from 'vitest';
import { selfToss } from './self-toss';

const DT = 1 / 60;
const athlete = createAthlete({ id: 'b', basePosition: Vec3.create(0, 0, 3), facing: Math.PI });

describe('selfToss', () => {
  it('leaves the hands and comes down onto the athlete’s own spike point', () => {
    const ball = selfToss(athlete, DEFAULT_BALL_PHYSICS, DT);
    const strike = contactPoint(athlete, 'spike');
    expect(ball.position).toEqual(contactPoint(athlete, 'bump'));

    const crossing = predictCrossing(ball, DEFAULT_BALL_PHYSICS, DT, strike.y);
    expect(Vec3.distance(crossing?.point ?? Vec3.ZERO, strike)).toBeLessThan(0.01);
  });

  it('rises the configured height above the spike point', () => {
    const ball = selfToss(athlete, DEFAULT_BALL_PHYSICS, DT);
    const rise = ball.velocity.y ** 2 / (2 * DEFAULT_BALL_PHYSICS.gravity);
    const apexWithoutDrag = ball.position.y + rise;
    expect(apexWithoutDrag).toBeGreaterThan(
      contactPoint(athlete, 'spike').y + SELF_TOSS_RISE_M * 0.9,
    );
  });
});
