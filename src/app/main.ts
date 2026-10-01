import { SIMULATION_STEP_S } from '@config/simulation';
import {
  AIM_DISPLAY_EPSILON,
  AIM_DISPLAY_SMOOTHING_S,
  AIM_SLOW_MOTION_SCALE,
} from '@config/touch-control';
import { aimFromDrag, idealDragLength } from '@input/drag-aim';
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
import type { FpsCounter } from '@ui/fps-counter';

const MILLISECONDS_PER_SECOND = 1000;
const FPS_QUERY_PARAM = 'fps';
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
// The aim the player's finger sets, and the aim the arc shows: the shown one glides toward
// the finger's (a short smoothing), so the arc and ripples move fluidly instead of stepping
// with each pointer event. Commands always carry the finger's own aim.
const fingerAim = { lateral: 0, force: 0 };
const shownAim = { lateral: 0, force: 0 };
let shownAimValid = false;
const gesture = listenForTouchGesture(canvas, {
  athleteId: PLAYER_ATHLETE_ID,
  emit: (command) => commands.push(command),
  onDrag: (drag, fullDragPx) => {
    if (!drag) {
      aimGuide.hide();
      return;
    }
    const aim = aimFromDrag(drag, fullDragPx);
    fingerAim.lateral = aim.lateral;
    fingerAim.force = aim.force;
    aimGuide.show(drag.startX, drag.startY, drag.x, drag.y, idealDragLength(fullDragPx));
  },
});

// Dev-only tools load through dynamic import so production bundles never contain them.
if (import.meta.env.DEV) {
  void import('./dev-tools').then(({ startDevTools }) => startDevTools(view.scene));
}

// The FPS readout: always in development; in the published game only with ?fps in the
// address, to measure on real phones. Loaded on demand so normal play never pays for it.
let fpsCounter: FpsCounter | null = null;
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has(FPS_QUERY_PARAM)) {
  void import('@ui/fps-counter').then(({ createFpsCounter }) => {
    fpsCounter = createFpsCounter(document.body);
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
  updateAimPreview(frameSeconds);
  view.aimPath.animate(frameSeconds);

  syncBallView(view.ball, runner.previous, runner.current, runner.alpha);
  syncAthleteViews(view.athletes, runner.previous, runner.current, runner.alpha);
  syncContactCue(view.contactCue, runner.current, PLAYER_ATHLETE_ID, runner.alpha);
  view.scene.render();
  fpsCounter?.update(
    engine.getFps(),
    frameSeconds,
    engine.getRenderWidth(),
    engine.getRenderHeight(),
  );
});

/** Keeps the aiming arc and ripples on the (smoothed) aim while the ball waits for it. */
function updateAimPreview(frameSeconds: number): void {
  if (!isAwaitingAim(runner.current, PLAYER_ATHLETE_ID)) {
    view.aimPath.hide();
    shownAimValid = false;
    fingerAim.lateral = 0;
    fingerAim.force = 0;
    gesture.resetAimCarry();
    return;
  }
  let changed = !shownAimValid;
  if (shownAimValid) {
    const blend = 1 - Math.exp(-frameSeconds / AIM_DISPLAY_SMOOTHING_S);
    const lateralStep = (fingerAim.lateral - shownAim.lateral) * blend;
    const forceStep = (fingerAim.force - shownAim.force) * blend;
    changed = Math.abs(lateralStep) + Math.abs(forceStep) > AIM_DISPLAY_EPSILON;
    shownAim.lateral += lateralStep;
    shownAim.force += forceStep;
  } else {
    shownAim.lateral = fingerAim.lateral;
    shownAim.force = fingerAim.force;
    shownAimValid = true;
  }
  if (changed) {
    view.aimPath.show(previewTouch(runner.current, PLAYER_ATHLETE_ID, shownAim, SIMULATION_STEP_S));
  }
}
