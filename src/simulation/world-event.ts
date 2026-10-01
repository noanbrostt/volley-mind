import type { BallBounce } from '@domain/ball/step-ball';

/** Facts the simulation reports after a step, for render, audio and UI to react to. */
export type WorldEvent = {
  readonly type: 'ball-bounced';
  readonly tick: number;
  readonly bounce: BallBounce;
};
