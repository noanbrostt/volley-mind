import { FEEDBACK_PERFECT_TIMING_S, FEEDBACK_VISIBLE_S } from '@config/touch-control';
import type { AthleteId } from '@domain/athlete/athlete-state';
import type { Technique } from '@domain/contact/technique';
import type { TouchMissReason, WorldEvent } from '@simulation/world-event';
import './touch-feedback.css';

const MILLISECONDS_PER_SECOND = 1000;

/** Glossary names, as the player reads them. */
const TECHNIQUE_LABELS: Readonly<Record<Technique, string>> = {
  overhead: 'Toque',
  bump: 'Manchete',
  spike: 'Cortada',
  'roll-shot': 'Caixinha',
  dive: 'Peixinho',
};

const MISS_LABELS: Readonly<Record<TouchMissReason, string>> = {
  early: 'Cedo demais',
  late: 'Tarde demais',
  'no-release': 'Não tocou',
  'out-of-reach': 'Não alcançou',
};

export interface TouchFeedback {
  /** Shows a short message when the player commits to a touch, or misses one. */
  onEvent(event: WorldEvent): void;
}

/** A short line after each of the player's touches, to teach timing and technique. */
export function createTouchFeedback(parent: HTMLElement, playerId: AthleteId): TouchFeedback {
  const element = document.createElement('div');
  element.className = 'touch-feedback';
  parent.append(element);

  const show = (text: string, tone: 'good' | 'ok' | 'miss'): void => {
    element.textContent = text;
    element.dataset.tone = tone;
    element.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], {
      duration: FEEDBACK_VISIBLE_S * MILLISECONDS_PER_SECOND,
      fill: 'forwards',
    });
  };

  return {
    onEvent(event) {
      // The timing is shown the moment the player commits, so they aim already knowing it.
      if (event.type === 'touch-committed' && event.athleteId === playerId) {
        const perfect = Math.abs(event.timingErrorS) <= FEEDBACK_PERFECT_TIMING_S;
        const timing = perfect ? 'Perfeito!' : event.timingErrorS < 0 ? 'Adiantado' : 'Atrasado';
        show(`${TECHNIQUE_LABELS[event.technique]} · ${timing}`, perfect ? 'good' : 'ok');
      } else if (event.type === 'touch-missed' && event.athleteId === playerId) {
        show(MISS_LABELS[event.reason], 'miss');
      }
    },
  };
}
