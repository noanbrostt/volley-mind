import type { AthleteId } from '@domain/athlete/athlete-state';
import type { BallBounce } from '@domain/ball/step-ball';
import type { Action } from '@domain/contact/action';
import type { BadBallReason } from '@domain/contact/plan-touch';
import type { Technique } from '@domain/contact/technique';

/** Facts the simulation reports after a step, for render, audio and UI to react to. */
export type WorldEvent =
  | { readonly type: 'ball-bounced'; readonly tick: number; readonly bounce: BallBounce }
  | {
      readonly type: 'ball-touched';
      readonly tick: number;
      readonly athleteId: AthleteId;
      readonly action: Action;
      readonly technique: Technique;
      /** 0–1. */
      readonly quality: number;
      /** Release moment minus the ideal one, in s (negative = early). */
      readonly timingErrorS: number;
      readonly badBallReasons: readonly BadBallReason[];
    }
  | { readonly type: 'touch-missed'; readonly tick: number; readonly athleteId: AthleteId }
  | { readonly type: 'loop-broken'; readonly tick: number; readonly restarterId: AthleteId }
  | { readonly type: 'loop-restarted'; readonly tick: number; readonly athleteId: AthleteId };
