import { SIMULATION_STEP_S } from '@config/simulation';
import { AIM_SLOW_MOTION_SCALE } from '@config/touch-control';
import { aimFromDrag, type Drag, idealDragLength } from '@input/drag-aim';
import { listenForTouchGesture } from '@input/touch-gesture';
import { syncAthleteViews } from '@render/athlete-view';
import { syncBallView } from '@render/ball-view';
import { syncContactCue } from '@render/contact-cue';
import { createCourtScene } from '@render/court-scene';
import { createEngine, watchCanvasResize } from '@render/create-engine';
import { advanceSimulation, createSimulationRunner } from '@simulation/simulation-runner';
import { aimTimeLeft, isAwaitingAim, previewTouch } from '@simulation/touch-flow';
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
// The finger currently on the screen, if any: while it is down and the ball waits for the
// player's aim, the game runs in slow motion and the predicted arc follows the drag.
let activeDrag: Drag | null = null;
let activeFullDragPx = 0;
// The arc is recomputed at most once per frame, and only after the drag changed.
let previewOutdated = false;
listenForTouchGesture(canvas, {
  athleteId: PLAYER_ATHLETE_ID,
  emit: (command) => commands.push(command),
  onDrag: (drag, fullDragPx) => {
    activeDrag = drag;
    activeFullDragPx = fullDragPx;
    previewOutdated = drag !== null;
    if (!drag) {
      aimGuide.hide();
      view.aimPath.hide();
      return;
    }
    aimGuide.show(drag.startX, drag.startY, drag.x, drag.y, idealDragLength(fullDragPx));
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
  // Slow motion lasts the whole aiming time, finger down or not: a quick tap leaves room to
  // press and drag again.
  const aiming = isAwaitingAim(runner.current, PLAYER_ATHLETE_ID);
  const gameSeconds = aiming ? frameSeconds * AIM_SLOW_MOTION_SCALE : frameSeconds;
  const advance = advanceSimulation(runner, gameSeconds, commands);
  runner = advance.runner;
  // The runner copied what it needed; reuse the same array next frame.
  commands.length = 0;
  for (const event of advance.events) {
    feedback.onEvent(event);
  }
  const aimTime = aimTimeLeft(runner.current, PLAYER_ATHLETE_ID, SIMULATION_STEP_S);
  aimGuide.setTimeLeft(aimTime ? aimTime.remainingS / aimTime.totalS : null);
  if (!isAwaitingAim(runner.current, PLAYER_ATHLETE_ID)) {
    view.aimPath.hide();
  } else if (activeDrag && previewOutdated) {
    const aim = aimFromDrag(activeDrag, activeFullDragPx);
    view.aimPath.show(previewTouch(runner.current, PLAYER_ATHLETE_ID, aim, SIMULATION_STEP_S));
    previewOutdated = false;
  }

  syncBallView(view.ball, runner.previous, runner.current, runner.alpha);
  syncAthleteViews(view.athletes, runner.previous, runner.current, runner.alpha);
  syncContactCue(view.contactCue, runner.current, PLAYER_ATHLETE_ID, runner.alpha);
  view.scene.render();
  devTools?.onFrame(engine.getFps(), frameSeconds);
});
