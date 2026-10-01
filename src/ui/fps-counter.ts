import { FPS_COUNTER_REFRESH_S } from '@config/fps-counter';
import './fps-counter.css';

export interface FpsCounter {
  /** Call once per frame; the text only changes every FPS_COUNTER_REFRESH_S. */
  update(fps: number, frameSeconds: number): void;
}

export function createFpsCounter(parent: HTMLElement): FpsCounter {
  const element = document.createElement('div');
  element.className = 'fps-counter';
  parent.append(element);

  let sinceRefresh = FPS_COUNTER_REFRESH_S;
  return {
    update(fps, frameSeconds) {
      sinceRefresh += frameSeconds;
      if (sinceRefresh < FPS_COUNTER_REFRESH_S) {
        return;
      }
      sinceRefresh = 0;
      element.textContent = `${Math.round(fps)} fps`;
    },
  };
}
