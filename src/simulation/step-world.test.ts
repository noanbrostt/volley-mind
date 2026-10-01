import { DRILL_PARTNER_DISTANCE_M } from '@config/attack-defense-drill';
import { BALL_LAUNCH_SPEED_MPS, BALL_SPAWN_HEIGHT_M } from '@config/ball-launch';
import { SIMULATION_STEP_S } from '@config/simulation';
import { Vec3 } from '@core/vec3';
import { forwardOf } from '@domain/athlete/athlete-state';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import { describe, expect, it } from 'vitest';
import { stepWorld } from './step-world';
import type { WorldEvent } from './world-event';
import {
  ATHLETE_A_ID,
  ATHLETE_B_ID,
  createWorld,
  findAthlete,
  type WorldState,
} from './world-state';

const DT = SIMULATION_STEP_S;

describe('createWorld', () => {
  it('starts at tick 0 with a still ball above the floor', () => {
    const world = createWorld();
    expect(world.tick).toBe(0);
    expect(world.ball.position).toEqual(Vec3.create(0, BALL_SPAWN_HEIGHT_M, 0));
    expect(world.ball.velocity).toEqual(Vec3.ZERO);
  });

  it('places A and B on their bases, the drill distance apart, facing each other', () => {
    const world = createWorld();
    const a = findAthlete(world, ATHLETE_A_ID);
    const b = findAthlete(world, ATHLETE_B_ID);
    if (!a || !b) {
      throw new Error('drill athletes missing');
    }
    expect(Vec3.distance(a.basePosition, b.basePosition)).toBeCloseTo(DRILL_PARTNER_DISTANCE_M);
    expect(a.position).toEqual(a.basePosition);
    const aLooksAtB = Vec3.dot(
      forwardOf(a.facing),
      Vec3.normalize(Vec3.sub(b.position, a.position)),
    );
    const bLooksAtA = Vec3.dot(
      forwardOf(b.facing),
      Vec3.normalize(Vec3.sub(a.position, b.position)),
    );
    expect(aLooksAtB).toBeCloseTo(1, 12);
    expect(bLooksAtA).toBeCloseTo(1, 12);
  });

  it('finds no athlete for an unknown id', () => {
    expect(findAthlete(createWorld(), 'nobody')).toBeUndefined();
  });
});

describe('stepWorld', () => {
  it('advances the tick and lets the ball fall', () => {
    const { world } = stepWorld(createWorld(), [], DT);
    expect(world.tick).toBe(1);
    expect(world.ball.position.y).toBeLessThan(BALL_SPAWN_HEIGHT_M);
  });

  it('launches the ball straight up from where it is', () => {
    const resting: WorldState = {
      ...createWorld(),
      tick: 10,
      ball: { position: Vec3.create(2, DEFAULT_BALL_PHYSICS.radius, -1), velocity: Vec3.ZERO },
    };
    const { world } = stepWorld(resting, [{ type: 'launch-ball' }], DT);
    expect(world.ball.velocity.y).toBeGreaterThan(BALL_LAUNCH_SPEED_MPS - 1);
    expect(world.ball.position.y).toBeGreaterThan(DEFAULT_BALL_PHYSICS.radius);
    expect(world.ball.position.x).toBeCloseTo(2);
    expect(world.ball.position.z).toBeCloseTo(-1);
  });

  it('reports a bounce event with the tick it happened on', () => {
    let world = createWorld();
    const events: WorldEvent[] = [];
    for (let i = 0; i < 120 && events.length === 0; i++) {
      const result = stepWorld(world, [], DT);
      events.push(...result.events);
      world = result.world;
    }
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('ball-bounced');
    expect(events[0]?.tick).toBe(world.tick);
  });

  it('is deterministic and leaves its input untouched', () => {
    const start = createWorld();
    const snapshot = JSON.stringify(start);
    const a = stepWorld(start, [{ type: 'launch-ball' }], DT);
    const b = stepWorld(start, [{ type: 'launch-ball' }], DT);
    expect(a).toEqual(b);
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});
