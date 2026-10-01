import { listenForLaunch } from '@input/pointer-launch';
import { syncAthleteViews } from '@render/athlete-view';
import { syncBallView } from '@render/ball-view';
import { createCourtScene } from '@render/court-scene';
import { createEngine, watchCanvasResize } from '@render/create-engine';
import { advanceSimulation, createSimulationRunner } from '@simulation/simulation-runner';
import type { WorldCommand } from '@simulation/world-command';
import { ATHLETE_A_ID, createWorld } from '@simulation/world-state';
import './app.css';
import type { DevTools } from './dev-tools';

const MILLISECONDS_PER_SECOND = 1000;

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) {
  throw new Error('Missing <canvas id="game"> in index.html');
}

// A long press on mobile would open the "save image" menu over the game.
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

const engine = createEngine(canvas);
watchCanvasResize(engine);

// The player controls athlete A; the camera stands behind them.
const PLAYER_ATHLETE_ID = ATHLETE_A_ID;
const world = createWorld();
const view = createCourtScene(engine, world, PLAYER_ATHLETE_ID);

let runner = createSimulationRunner(world);
const commands: WorldCommand[] = [];
listenForLaunch(canvas, (command) => commands.push(command));

// Dev-only tools load through dynamic import so production bundles never contain them.
let devTools: DevTools | null = null;
if (import.meta.env.DEV) {
  void import('./dev-tools').then(({ startDevTools }) => {
    devTools = startDevTools(view.scene);
  });
}

engine.runRenderLoop(() => {
  const frameSeconds = engine.getDeltaTime() / MILLISECONDS_PER_SECOND;
  runner = advanceSimulation(runner, frameSeconds, commands).runner;
  // The runner copied what it needed; reuse the same array next frame.
  commands.length = 0;

  syncBallView(view.ball, runner.previous, runner.current, runner.alpha);
  syncAthleteViews(view.athletes, runner.previous, runner.current, runner.alpha);
  view.scene.render();
  devTools?.onFrame(engine.getFps(), frameSeconds);
});
