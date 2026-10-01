import { BALL_LAUNCH_SPEED_MPS } from '@config/ball-launch';
import { Vec3 } from '@core/vec3';
import { DEFAULT_BALL_PHYSICS } from '@domain/ball/ball-physics';
import type { BallState } from '@domain/ball/ball-state';
import { stepBall } from '@domain/ball/step-ball';
import type { WorldCommand } from './world-command';
import type { WorldEvent } from './world-event';
import type { WorldState } from './world-state';

export interface WorldStep {
  readonly world: WorldState;
  readonly events: readonly WorldEvent[];
}

/** Applies this step's commands, then advances the world by one fixed step. */
export function stepWorld(
  world: WorldState,
  commands: readonly WorldCommand[],
  dt: number,
): WorldStep {
  const commanded = commands.reduce(applyCommand, world);
  const tick = world.tick + 1;
  const ballStep = stepBall(commanded.ball, DEFAULT_BALL_PHYSICS, dt);
  const events: WorldEvent[] = ballStep.bounce
    ? [{ type: 'ball-bounced', tick, bounce: ballStep.bounce }]
    : [];

  return { world: { tick, ball: ballStep.ball }, events };
}

function applyCommand(world: WorldState, command: WorldCommand): WorldState {
  switch (command.type) {
    case 'launch-ball':
      return { ...world, ball: launchUp(world.ball) };
  }
}

function launchUp(ball: BallState): BallState {
  return { position: ball.position, velocity: Vec3.create(0, BALL_LAUNCH_SPEED_MPS, 0) };
}
