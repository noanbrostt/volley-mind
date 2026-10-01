import { Engine } from '@babylonjs/core/Engines/engine';
import { MAX_RENDER_PIXEL_RATIO } from '@config/render';

export function createEngine(canvas: HTMLCanvasElement): Engine {
  // adaptToDeviceRatio stays off: we pick the internal resolution ourselves, capped below.
  const engine = new Engine(canvas, true, { stencil: false }, false);
  applyResolutionCap(engine);
  return engine;
}

/** Keeps the canvas sized to its element and the internal resolution capped. Returns a detach. */
export function watchCanvasResize(engine: Engine): () => void {
  const onResize = (): void => {
    applyResolutionCap(engine);
    engine.resize();
  };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

/** Hardware scaling level = CSS pixels per rendered pixel, so 1 / DPR renders at full density. */
function applyResolutionCap(engine: Engine): void {
  const pixelRatio = Math.min(window.devicePixelRatio, MAX_RENDER_PIXEL_RATIO);
  engine.setHardwareScalingLevel(1 / pixelRatio);
}
