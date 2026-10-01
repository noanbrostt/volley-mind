import type { Scene } from '@babylonjs/core/scene';

const INSPECTOR_TOGGLE_KEY = 'KeyI';

declare global {
  interface Window {
    /** Development only: lets debugging tools (Playwright) reach the scene. */
    volleyMindScene?: Scene;
  }
}

/**
 * Development-only helpers. This module is loaded through dynamic import behind
 * import.meta.env.DEV, so none of it reaches production builds.
 */
export function startDevTools(scene: Scene): void {
  window.volleyMindScene = scene;
  listenForInspectorToggle(scene);
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
