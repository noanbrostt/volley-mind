import { listenForLaunch } from '@input/pointer-launch';
import { syncBallView } from '@render/ball-view';
import { createBeachScene } from '@render/beach-scene';
import { createEngine, watchCanvasResize } from '@render/create-engine';
import { advanceSimulation, createSimulationRunner } from '@simulation/simulation-runner';
import type { WorldCommand } from '@simulation/world-command';
import { createWorld } from '@simulation/world-state';
import type { FpsCounter } from '@ui/fps-counter';
import './app.css';

const MILLISECONDS_PER_SECOND = 1000;

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) {
  throw new Error('Missing <canvas id="game"> in index.html');
}

const engine = createEngine(canvas);
watchCanvasResize(engine);
const view = createBeachScene(engine);

let runner = createSimulationRunner(createWorld());
const commands: WorldCommand[] = [];
listenForLaunch(canvas, (command) => commands.push(command));

// Dev-only tools load through dynamic import so production bundles never contain them.
let fpsCounter: FpsCounter | null = null;
if (import.meta.env.DEV) {
  void import('@ui/fps-counter').then(({ createFpsCounter }) => {
    fpsCounter = createFpsCounter(document.body);
  });
}

engine.runRenderLoop(() => {
  const frameSeconds = engine.getDeltaTime() / MILLISECONDS_PER_SECOND;
  runner = advanceSimulation(runner, frameSeconds, commands).runner;
  // The runner copied what it needed; reuse the same array next frame.
  commands.length = 0;

  syncBallView(view.ball, runner.previous, runner.current, runner.alpha);
  view.scene.render();
  fpsCounter?.update(engine.getFps(), frameSeconds);
});
