import { FPS_COUNTER_REFRESH_S } from '@config/fps-counter';
import './fps-counter.css';

const MILLISECONDS_PER_SECOND = 1000;

export interface FpsCounter {
  /** Call once per frame; the text only changes every FPS_COUNTER_REFRESH_S. */
  update(fps: number, frameSeconds: number, renderWidth: number, renderHeight: number): void;
}

/**
 * Performance readout: average frames per second, the slowest frame since the last refresh
 * (what a stutter looks like) and the internal render resolution.
 */
export function createFpsCounter(parent: HTMLElement): FpsCounter {
  const element = document.createElement('div');
  element.className = 'fps-counter';
  parent.append(element);

  let sinceRefresh = FPS_COUNTER_REFRESH_S;
  let worstFrameSeconds = 0;
  return {
    update(fps, frameSeconds, renderWidth, renderHeight) {
      sinceRefresh += frameSeconds;
      worstFrameSeconds = Math.max(worstFrameSeconds, frameSeconds);
      if (sinceRefresh < FPS_COUNTER_REFRESH_S) {
        return;
      }
      const worstMs = Math.round(worstFrameSeconds * MILLISECONDS_PER_SECOND);
      element.textContent = `${Math.round(fps)} fps · pior ${worstMs} ms · ${renderWidth}×${renderHeight}`;
      sinceRefresh = 0;
      worstFrameSeconds = 0;
    },
  };
}
