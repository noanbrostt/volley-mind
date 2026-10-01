import { DIVE_CONTACT_HEIGHT_M, DIVE_RECOVERY_S } from '@config/athlete';
import { DRILL_FIRST_TOSS_DELAY_S, DRILL_PARTNER_DISTANCE_M } from '@config/attack-defense-drill';
import { SIMULATION_STEP_S } from '@config/simulation';
import { AIM_HOLD_MAX_S } from '@config/touch';
import { Vec3 } from '@core/vec3';
import type { AthleteId } from '@domain/athlete/athlete-state';
import { forwardOf } from '@domain/athlete/athlete-state';
import { uniformAttributes } from '@domain/athlete/attributes';
import { IDEAL_AIM } from '@domain/contact/touch-aim';
import { describe, expect, it } from 'vitest';
import { stepWorld } from './step-world';
import { aimTimeLeft, previewTouch } from './touch-flow';
import type { WorldCommand } from './world-command';
import type { WorldEvent } from './world-event';
import {
  ATHLETE_A_ID,
  ATHLETE_B_ID,
  createWorld,
  findAthlete,
  type WorldState,
} from './world-state';

const DT = SIMULATION_STEP_S;
const BOTH_AI = [ATHLETE_A_ID, ATHLETE_B_ID];

function drillWorld(
  options: { attribute?: number; ai?: readonly AthleteId[]; seed?: number } = {},
): WorldState {
  const world = createWorld({ seed: options.seed ?? 1, aiAthleteIds: options.ai ?? BOTH_AI });
  const { attribute } = options;
  if (attribute === undefined) {
    return world;
  }
  return {
    ...world,
    athletes: world.athletes.map((athlete) => ({
      ...athlete,
      attributes: uniformAttributes(attribute),
    })),
  };
}

interface Run {
  readonly world: WorldState;
  readonly events: readonly WorldEvent[];
}

function run(
  start: WorldState,
  seconds: number,
  commandsFor: (world: WorldState) => readonly WorldCommand[] = () => [],
): Run {
  let world = start;
  const events: WorldEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const step = stepWorld(world, commandsFor(world), DT);
    world = step.world;
    events.push(...step.events);
  }
  return { world, events };
}

function eventsOf<T extends WorldEvent['type']>(
  events: readonly WorldEvent[],
  type: T,
): Extract<WorldEvent, { type: T }>[] {
  return events.filter((event): event is Extract<WorldEvent, { type: T }> => event.type === type);
}

describe('createWorld', () => {
  it('places A and B on their bases, the drill distance apart, facing each other', () => {
    const world = drillWorld();
    const a = findAthlete(world, ATHLETE_A_ID);
    const b = findAthlete(world, ATHLETE_B_ID);
    if (!a || !b) {
      throw new Error('drill athletes missing');
    }
    expect(Vec3.distance(a.basePosition, b.basePosition)).toBeCloseTo(DRILL_PARTNER_DISTANCE_M);
    const aLooksAtB = Vec3.dot(
      forwardOf(a.facing),
      Vec3.normalize(Vec3.sub(b.position, a.position)),
    );
    expect(aLooksAtB).toBeCloseTo(1, 12);
  });

  it('starts with A due to open the drill with a self-toss', () => {
    const world = drillWorld();
    expect(world.tick).toBe(0);
    expect(world.drill).toEqual({
      phase: 'broken',
      restart: { athleteId: ATHLETE_A_ID, tick: Math.round(DRILL_FIRST_TOSS_DELAY_S / DT) },
    });
  });

  it('finds no athlete for an unknown id', () => {
    expect(findAthlete(drillWorld(), 'nobody')).toBeUndefined();
  });
});

describe('stepWorld: the attack-defense drill', () => {
  it('opens with A tossing to themselves and expecting their own attack', () => {
    const { world, events } = run(drillWorld(), DRILL_FIRST_TOSS_DELAY_S + 2 * DT);
    expect(eventsOf(events, 'loop-restarted')).toEqual([
      { type: 'loop-restarted', tick: Math.round(DRILL_FIRST_TOSS_DELAY_S / DT), athleteId: 'a' },
    ]);
    expect(world.drill.phase).toBe('rally');
    if (world.drill.phase === 'rally') {
      expect(world.drill.incoming.athleteId).toBe(ATHLETE_A_ID);
      expect(world.drill.incoming.action).toBe('attack');
    }
  });

  it('never breaks the loop between perfect athletes, alternating attack → dig → set', () => {
    const { events } = run(drillWorld({ attribute: 100 }), 60);
    expect(eventsOf(events, 'loop-broken')).toEqual([]);

    const touches = eventsOf(events, 'ball-touched');
    expect(touches.length).toBeGreaterThan(20);
    touches.forEach((touch, i) => {
      expect(touch.athleteId).toBe(i % 2 === 0 ? ATHLETE_A_ID : ATHLETE_B_ID);
      expect(touch.action).toBe(['attack', 'dig', 'set'][i % 3]);
      expect(touch.quality).toBeGreaterThan(0.9);
    });
  });

  it('breaks the loop with weak athletes, and the nearest athlete restarts it', () => {
    const { events } = run(drillWorld({ attribute: 5, seed: 3 }), 120);
    const broken = eventsOf(events, 'loop-broken');
    expect(broken.length).toBeGreaterThan(0);
    expect(eventsOf(events, 'loop-restarted').length).toBeGreaterThan(1);
  });

  it('moves only toward the ball coming in, or back to base: a resting athlete waits', () => {
    let world = drillWorld({ attribute: 40, seed: 5 });
    let waited = 0;
    for (let i = 0; i < Math.round(40 / DT); i++) {
      const next = stepWorld(world, [], DT).world;
      if (world.drill.phase === 'rally' && next.drill.phase === 'rally') {
        const comingTo = next.drill.incoming.athleteId;
        next.athletes.forEach((athlete, index) => {
          const before = world.athletes[index];
          const restingOnBase =
            before &&
            Vec3.lengthSquared(before.velocity) === 0 &&
            Vec3.distance(before.position, before.basePosition) === 0;
          if (athlete.id !== comingTo && restingOnBase) {
            expect(athlete.position).toEqual(athlete.basePosition);
            waited++;
          }
        });
      }
      world = next;
    }
    expect(waited).toBeGreaterThan(0);
  });

  it('walks back to base after going to fetch a ball', () => {
    const { world } = run(drillWorld({ attribute: 40, seed: 5 }), 40);
    // Whoever is not expecting the ball is on base or heading there.
    if (world.drill.phase === 'rally') {
      const comingTo = world.drill.incoming.athleteId;
      for (const athlete of world.athletes) {
        if (athlete.id !== comingTo && Vec3.lengthSquared(athlete.velocity) > 0) {
          const toBase = Vec3.sub(athlete.basePosition, athlete.position);
          expect(Vec3.dot(athlete.velocity, toBase)).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps a diver down for the recovery, then lets them move again', () => {
    let world = drillWorld({ attribute: 30, seed: 2 });
    let diverId: AthleteId | null = null;
    for (let i = 0; i < Math.round(300 / DT) && !diverId; i++) {
      const step = stepWorld(world, [], DT);
      world = step.world;
      diverId =
        eventsOf(step.events, 'ball-touched').find((t) => t.technique === 'dive')?.athleteId ??
        null;
    }
    if (!diverId) {
      throw new Error('no dive happened');
    }
    const diver = findAthlete(world, diverId);
    const until = diver?.recovery?.untilTick ?? 0;
    // The touch happened on the step that ended at this tick.
    expect(until - (world.tick - 1)).toBe(Math.round(DIVE_RECOVERY_S / DT));
    while (world.tick < until) {
      world = stepWorld(world, [], DT).world;
      expect(findAthlete(world, diverId)?.position).toEqual(diver?.position);
    }
    world = stepWorld(world, [], DT).world;
    expect(findAthlete(world, diverId)?.recovery).toBeNull();
  });

  it('is deterministic for the same seed', () => {
    const first = run(drillWorld({ seed: 7 }), 30);
    const second = run(drillWorld({ seed: 7 }), 30);
    expect(second.events).toEqual(first.events);
    expect(second.world).toEqual(first.world);
  });

  it('keeps the world as plain data that survives JSON', () => {
    const { world } = run(drillWorld(), 5);
    expect(JSON.parse(JSON.stringify(world))).toEqual(world);
  });
});

describe('stepWorld: a player-controlled athlete', () => {
  const playerWorld = (): WorldState => drillWorld({ ai: [ATHLETE_B_ID] });

  it('misses when the player never releases, and the loop breaks', () => {
    const { events } = run(playerWorld(), 5);
    const missed = eventsOf(events, 'touch-missed')[0];
    expect(missed?.athleteId).toBe(ATHLETE_A_ID);
    expect(missed?.reason).toBe('no-release');
    expect(eventsOf(events, 'loop-broken').length).toBe(1);
  });

  it('spends the chance on a release far too early, and says so', () => {
    const tossed = run(playerWorld(), DRILL_FIRST_TOSS_DELAY_S + DT).world;
    const early: WorldCommand = { type: 'touch', athleteId: ATHLETE_A_ID, aim: IDEAL_AIM };
    const { events } = stepWorld(tossed, [early], DT);
    expect(eventsOf(events, 'touch-missed')).toEqual([
      { type: 'touch-missed', tick: tossed.tick, athleteId: ATHLETE_A_ID, reason: 'early' },
    ]);
  });

  it('plays the touch when the player releases at the right moment', () => {
    const releaseOnTime = (world: WorldState): readonly WorldCommand[] => {
      const { drill } = world;
      const due =
        drill.phase === 'rally' &&
        drill.incoming.athleteId === ATHLETE_A_ID &&
        world.tick === Math.round(drill.incoming.contactTick);
      return due ? [{ type: 'touch', athleteId: ATHLETE_A_ID, aim: IDEAL_AIM }] : [];
    };
    const { events } = run(playerWorld(), 3, releaseOnTime);
    const touch = eventsOf(events, 'ball-touched')[0];
    expect(touch?.athleteId).toBe(ATHLETE_A_ID);
    expect(touch?.action).toBe('attack');
    expect(Math.abs(touch?.timingErrorS ?? 1)).toBeLessThan(DT);
  });

  it('ignores a release from an athlete who is not expected to touch', () => {
    const tossed = run(playerWorld(), DRILL_FIRST_TOSS_DELAY_S + DT).world;
    const wrong: WorldCommand = { type: 'touch', athleteId: ATHLETE_B_ID, aim: IDEAL_AIM };
    const withWrong = stepWorld(tossed, [wrong], DT);
    const without = stepWorld(tossed, [], DT);
    expect(withWrong).toEqual(without);
  });

  describe('committing first, aiming after (the player’s flow)', () => {
    const commitOnTime = (world: WorldState): readonly WorldCommand[] => {
      const { drill } = world;
      const due =
        drill.phase === 'rally' &&
        drill.incoming.athleteId === ATHLETE_A_ID &&
        world.tick === Math.round(drill.incoming.contactTick);
      return due ? [{ type: 'touch', athleteId: ATHLETE_A_ID }] : [];
    };

    function untilHeld(): WorldState {
      let world = playerWorld();
      for (let i = 0; i < 300; i++) {
        world = stepWorld(world, commitOnTime(world), DT).world;
        if (world.drill.phase === 'rally' && world.drill.incoming.holdStartTick !== null) {
          return world;
        }
      }
      throw new Error('the ball never rested in the hands');
    }

    it('judges the timing the moment the player commits', () => {
      const { events } = run(playerWorld(), 3, commitOnTime);
      const committed = eventsOf(events, 'touch-committed').find(
        (event) => event.athleteId === ATHLETE_A_ID,
      );
      expect(committed?.technique).toBe('spike');
      expect(Math.abs(committed?.timingErrorS ?? 1)).toBeLessThan(DT);
    });

    it('rests the ball in the hands while the player aims', () => {
      const held = untilHeld();
      const later = run(held, 0.2).world;
      expect(later.ball.position).toEqual(held.ball.position);
    });

    it('sends the ball once the aim arrives', () => {
      const held = untilHeld();
      const aim: WorldCommand = {
        type: 'aim',
        athleteId: ATHLETE_A_ID,
        aim: IDEAL_AIM,
        final: true,
      };
      const { events } = stepWorld(held, [aim], DT);
      expect(eventsOf(events, 'ball-touched')[0]?.athleteId).toBe(ATHLETE_A_ID);
    });

    it('keeps the ball while the aim is only a draft', () => {
      const held = untilHeld();
      const draft: WorldCommand = {
        type: 'aim',
        athleteId: ATHLETE_A_ID,
        aim: IDEAL_AIM,
        final: false,
      };
      const { events, world } = stepWorld(held, [draft], DT);
      expect(eventsOf(events, 'ball-touched')).toEqual([]);
      expect(world.ball.position).toEqual(held.ball.position);
    });

    it('sends the ball with the latest draft when time runs out', () => {
      const held = untilHeld();
      const draft: WorldCommand = {
        type: 'aim',
        athleteId: ATHLETE_A_ID,
        aim: IDEAL_AIM,
        final: false,
      };
      const withDraft = run(stepWorld(held, [draft], DT).world, AIM_HOLD_MAX_S + 2 * DT);
      const withoutDraft = run(held, AIM_HOLD_MAX_S + 2 * DT);
      const drafted = eventsOf(withDraft.events, 'ball-touched')[0];
      const unaimed = eventsOf(withoutDraft.events, 'ball-touched')[0];
      expect(drafted?.athleteId).toBe(ATHLETE_A_ID);
      // Never aiming is not free: it costs quality compared with the drafted ideal aim.
      expect(unaimed?.quality ?? 1).toBeLessThan(drafted?.quality ?? 0);
    });

    it('counts down the aiming time, and stops counting once the ball leaves', () => {
      const held = untilHeld();
      const time = aimTimeLeft(held, ATHLETE_A_ID, DT);
      expect(time?.remainingS).toBeGreaterThan(0);
      expect(time?.remainingS).toBeLessThanOrEqual(time?.totalS ?? 0);
      const later = aimTimeLeft(run(held, 0.1).world, ATHLETE_A_ID, DT);
      expect(later?.remainingS).toBeLessThan(time?.remainingS ?? 0);
      expect(aimTimeLeft(run(held, AIM_HOLD_MAX_S + 2 * DT).world, ATHLETE_A_ID, DT)).toBeNull();
    });

    it('previews the arc and the partner as a reachable target once committed', () => {
      expect(previewTouch(playerWorld(), ATHLETE_A_ID, IDEAL_AIM, DT)).toBeNull();
      const preview = previewTouch(untilHeld(), ATHLETE_A_ID, IDEAL_AIM, DT);
      expect(preview?.path.length).toBeGreaterThan(5);
      expect(preview?.impact?.surface).toBe('partner');
      const b = findAthlete(playerWorld(), ATHLETE_B_ID);
      const target = preview?.impact?.point ?? Vec3.ZERO;
      expect(
        Vec3.distance(Vec3.create(target.x, 0, target.z), b?.basePosition ?? Vec3.ZERO),
      ).toBeLessThan(0.6);
    });

    it('previews a dive when the aim goes wide but within a dive', () => {
      const dive = previewTouch(untilHeld(), ATHLETE_A_ID, { lateral: 1, force: 0.5 }, DT);
      expect(dive?.impact?.surface).toBe('partner');
      expect(dive?.impact?.point.y).toBeCloseTo(DIVE_CONTACT_HEIGHT_M, 6);
    });

    it('shows the impact on the floor when the aim goes out of the partner’s reach', () => {
      // Strong and wide: past even a dive (a medium wide ball is now saved by one).
      const wide = previewTouch(untilHeld(), ATHLETE_A_ID, { lateral: 1, force: 1 }, DT);
      expect(wide?.impact?.surface).toBe('floor');
      expect(wide?.impact?.point.y).toBe(0);
      const last = wide?.path[wide.path.length - 1];
      expect(last?.y).toBeLessThan(0.3);
    });
  });
});
