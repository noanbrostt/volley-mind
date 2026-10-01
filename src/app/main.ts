import { syncAthleteViews } from '@render/athlete-view';
import { syncBallView } from '@render/ball-view';
import { createCourtScene } from '@render/court-scene';
import { createEngine, watchCanvasResize } from '@render/create-engine';
import { advanceSimulation, createSimulationRunner } from '@simulation/simulation-runner';
import type { WorldCommand } from '@simulation/world-command';
import { ATHLETE_A_ID, ATHLETE_B_ID, createWorld } from '@simulation/world-state';
import './app.css';
import type { DevTools } from './dev-tools';

const MILLISECONDS_PER_SECOND = 1000;
const UINT32_RANGE = 2 ** 32;

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) {
  throw new Error('Missing <canvas id="game"> in index.html');
}

// A long press on mobile would open the "save image" menu over the game.
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

const engine = createEngine(canvas);
watchCanvasResize(engine);

// The camera stands behind athlete A. For now the AI plays both athletes, so the drill can
// be watched and tuned before the player takes A over.
const VIEWER_ATHLETE_ID = ATHLETE_A_ID;
const world = createWorld({
  // Only the session seed comes from outside the simulation; everything after is deterministic.
  seed: Math.floor(Math.random() * UINT32_RANGE),
  aiAthleteIds: [ATHLETE_A_ID, ATHLETE_B_ID],
});
const view = createCourtScene(engine, world, VIEWER_ATHLETE_ID);

let runner = createSimulationRunner(world);
const NO_COMMANDS: readonly WorldCommand[] = [];

// Dev-only tools load through dynamic import so production bundles never contain them.
let devTools: DevTools | null = null;
if (import.meta.env.DEV) {
  void import('./dev-tools').then(({ startDevTools }) => {
    devTools = startDevTools(view.scene);
  });
}

engine.runRenderLoop(() => {
  const frameSeconds = engine.getDeltaTime() / MILLISECONDS_PER_SECOND;
  runner = advanceSimulation(runner, frameSeconds, NO_COMMANDS).runner;

  syncBallView(view.ball, runner.previous, runner.current, runner.alpha);
  syncAthleteViews(view.athletes, runner.previous, runner.current, runner.alpha);
  view.scene.render();
  devTools?.onFrame(engine.getFps(), frameSeconds);
});
