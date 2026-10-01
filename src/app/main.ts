import { idealDragLength } from '@input/drag-aim';
import { listenForTouchGesture } from '@input/touch-gesture';
import { syncAthleteViews } from '@render/athlete-view';
import { syncBallView } from '@render/ball-view';
import { syncContactCue } from '@render/contact-cue';
import { createCourtScene } from '@render/court-scene';
import { createEngine, watchCanvasResize } from '@render/create-engine';
import { advanceSimulation, createSimulationRunner } from '@simulation/simulation-runner';
import type { WorldCommand } from '@simulation/world-command';
import { ATHLETE_A_ID, ATHLETE_B_ID, createWorld } from '@simulation/world-state';
import { createAimGuide } from '@ui/aim-guide';
import { createTouchFeedback } from '@ui/touch-feedback';
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

// The player controls athlete A, with the camera behind them; the AI plays B.
const PLAYER_ATHLETE_ID = ATHLETE_A_ID;
const world = createWorld({
  // Only the session seed comes from outside the simulation; everything after is deterministic.
  seed: Math.floor(Math.random() * UINT32_RANGE),
  aiAthleteIds: [ATHLETE_B_ID],
});
const view = createCourtScene(engine, world, PLAYER_ATHLETE_ID);

let runner = createSimulationRunner(world);
const commands: WorldCommand[] = [];

const aimGuide = createAimGuide(document.body);
const feedback = createTouchFeedback(document.body, PLAYER_ATHLETE_ID);
listenForTouchGesture(canvas, {
  athleteId: PLAYER_ATHLETE_ID,
  emit: (command) => commands.push(command),
  onDrag: (drag, fullDragPx) => {
    if (drag) {
      aimGuide.show(drag.startX, drag.startY, drag.x, drag.y, idealDragLength(fullDragPx));
    } else {
      aimGuide.hide();
    }
  },
});

// Dev-only tools load through dynamic import so production bundles never contain them.
let devTools: DevTools | null = null;
if (import.meta.env.DEV) {
  void import('./dev-tools').then(({ startDevTools }) => {
    devTools = startDevTools(view.scene);
  });
}

engine.runRenderLoop(() => {
  const frameSeconds = engine.getDeltaTime() / MILLISECONDS_PER_SECOND;
  const advance = advanceSimulation(runner, frameSeconds, commands);
  runner = advance.runner;
  // The runner copied what it needed; reuse the same array next frame.
  commands.length = 0;
  for (const event of advance.events) {
    feedback.onEvent(event);
  }

  syncBallView(view.ball, runner.previous, runner.current, runner.alpha);
  syncAthleteViews(view.athletes, runner.previous, runner.current, runner.alpha);
  syncContactCue(view.contactCue, runner.current, PLAYER_ATHLETE_ID, runner.alpha);
  view.scene.render();
  devTools?.onFrame(engine.getFps(), frameSeconds);
});
