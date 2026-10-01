import { createRng, nextRange, type RngState } from '@core/seeded-rng';
import { Vec3 } from '@core/vec3';
import { describe, expect, it } from 'vitest';
import { type BallPhysics, DEFAULT_BALL_PHYSICS } from './ball-physics';
import type { BallState } from './ball-state';
import { solveLaunchByApex, solveLaunchBySpeed } from './solve-launch';
import { stepBall } from './step-ball';

const DT = 1 / 60;
const physics = DEFAULT_BALL_PHYSICS;
const noDrag: BallPhysics = { ...physics, dragFactor: 0 };

interface Path {
  /** Closest the ball center gets to the target, in m. */
  readonly closest: number;
  /** Highest ball center height, in m. */
  readonly apex: number;
}

/** Flies the ball on the simulation's steps and measures how close it passes to `target`. */
function fly(start: Vec3, velocity: Vec3, target: Vec3, params: BallPhysics): Path {
  let current: BallState = { position: start, velocity };
  let closest = Vec3.distance(start, target);
  let apex = start.y;
  for (let i = 0; i < 600; i++) {
    const result = stepBall(current, params, DT);
    closest = Math.min(closest, distanceToSegment(target, current.position, result.ball.position));
    apex = Math.max(apex, result.ball.position.y);
    if (result.bounce) {
      break;
    }
    current = result.ball;
  }
  return { closest, apex };
}

function distanceToSegment(point: Vec3, a: Vec3, b: Vec3): number {
  const ab = Vec3.sub(b, a);
  const lengthSquared = Vec3.lengthSquared(ab);
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, Vec3.dot(Vec3.sub(point, a), ab) / lengthSquared));
  return Vec3.distance(point, Vec3.add(a, Vec3.scale(ab, t)));
}

/** Drill-like launches: contact heights 0.8–2.5 m, partners 4–8 m away. */
function randomPairs(seed: number, count: number): { start: Vec3; target: Vec3 }[] {
  let rng: RngState = createRng(seed);
  const draw = (min: number, max: number): number => {
    const result = nextRange(rng, min, max);
    rng = result.next;
    return result.value;
  };
  return Array.from({ length: count }, () => {
    const start = Vec3.create(draw(-1, 1), draw(0.8, 2.5), draw(-3.5, -2.5));
    const target = Vec3.create(draw(-1.5, 1.5), draw(0.8, 2.5), draw(1.5, 4.5));
    return { start, target };
  });
}

describe('solveLaunchByApex', () => {
  const pairs = randomPairs(7, 60);

  for (const [label, params] of [
    ['with drag', physics],
    ['without drag', noDrag],
  ] as const) {
    it(`passes within 1 cm of the target at the requested apex, ${label}`, () => {
      for (const { start, target } of pairs) {
        const apexHeight = Math.max(start.y, target.y) + 1.5;
        const velocity = solveLaunchByApex(start, target, apexHeight, params, DT);
        if (!velocity) {
          throw new Error('expected a solution');
        }
        const path = fly(start, velocity, target, params);
        expect(path.closest).toBeLessThan(0.01);
        expect(Math.abs(path.apex - apexHeight)).toBeLessThan(0.02);
      }
    });
  }

  it('refuses an apex that is not above both points', () => {
    const start = Vec3.create(0, 2, -3);
    const target = Vec3.create(0, 2.4, 3);
    expect(solveLaunchByApex(start, target, 2.3, physics, DT)).toBeNull();
  });
});

describe('solveLaunchBySpeed', () => {
  it('passes within 1 cm of the target at exactly the requested speed', () => {
    for (const { start, target } of randomPairs(11, 60)) {
      const velocity = solveLaunchBySpeed(start, target, 12, physics, DT);
      if (!velocity) {
        throw new Error('expected a solution');
      }
      expect(Vec3.length(velocity)).toBeCloseTo(12, 9);
      expect(fly(start, velocity, target, physics).closest).toBeLessThan(0.01);
    }
  });

  it('takes the direct (low) arc, not the lob', () => {
    // Spike contact to the partner's bump height: gravity alone drops the ball ~1.5 m over
    // the flight, so even the direct arc leaves slightly upward — but far below a lob.
    const start = Vec3.create(0.25, 2.46, -2.85);
    const target = Vec3.create(0, 1.02, 3.45);
    const velocity = solveLaunchBySpeed(start, target, 12, physics, DT);
    if (!velocity) {
      throw new Error('expected a solution');
    }
    const elevation = Math.asin(velocity.y / Vec3.length(velocity));
    expect(elevation).toBeLessThan(0.4);
  });

  it('returns null when the speed cannot carry the ball that far', () => {
    const start = Vec3.create(0, 1, -3);
    const target = Vec3.create(0, 1, 30);
    expect(solveLaunchBySpeed(start, target, 5, physics, DT)).toBeNull();
  });
});
