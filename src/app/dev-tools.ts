import type { Scene } from '@babylonjs/core/scene';
import { createFpsCounter } from '@ui/fps-counter';

const INSPECTOR_TOGGLE_KEY = 'KeyI';

export interface DevTools {
  onFrame(fps: number, frameSeconds: number): void;
}

/**
 * Development-only helpers. This module is loaded through dynamic import behind
 * import.meta.env.DEV, so none of it reaches production builds.
 */
export function startDevTools(scene: Scene): DevTools {
  const fpsCounter = createFpsCounter(document.body);
  listenForInspectorToggle(scene);
  return { onFrame: (fps, frameSeconds) => fpsCounter.update(fps, frameSeconds) };
}

/** Press I to show or hide the Babylon inspector. It is only downloaded on first use. */
function listenForInspectorToggle(scene: Scene): void {
  let hideInspector: (() => Promise<void>) | null = null;

  window.addEventListener('keydown', async (event) => {
    if (event.code !== INSPECTOR_TOGGLE_KEY || event.repeat) {
      return;
    }
    if (hideInspector) {
      const hide = hideInspector;
      hideInspector = null;
      await hide();
      return;
    }
    const { ShowInspector } = await import('@babylonjs/inspector');
    const token = ShowInspector(scene);
    hideInspector = () => token.dispose();
  });
}
