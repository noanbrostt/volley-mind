/** A point on the floor, in world coordinates (m). */
export interface FloorPoint {
  x: number;
  z: number;
}

export interface FootStep {
  readonly from: FloorPoint;
  readonly to: FloorPoint;
  /** Progress through the step, 0–1. */
  progress: number;
}

/** One foot: where it stands on the floor, and the step it is taking, if any. */
export interface Foot {
  readonly planted: FloorPoint;
  step: FootStep | null;
}

export interface StepRules {
  /** A planted foot steps once its home spot is this far away, in m. */
  readonly triggerM: number;
  /** Time in the air per step, in s. */
  readonly durationS: number;
  /** Steps land where the home spot will be this long from now, in s. */
  readonly leadS: number;
}

export function createFoot(at: FloorPoint): Foot {
  return { planted: { x: at.x, z: at.z }, step: null };
}

/**
 * Advances a pair of feet. Only one foot is in the air at a time, so the feet never both
 * leave the floor; when both want to step, the one farther from its home goes first, which
 * on a lateral move is the leading foot — a shuffle, not a crossover.
 * @param homes where each foot belongs now (the stance around the body).
 * @param velocity of the body on the floor, in m/s.
 */
export function stepFeet(
  feet: readonly [Foot, Foot],
  homes: readonly [FloorPoint, FloorPoint],
  velocity: FloorPoint,
  seconds: number,
  rules: StepRules,
): void {
  for (const foot of feet) {
    const step = foot.step;
    if (!step) {
      continue;
    }
    step.progress = Math.min(1, step.progress + seconds / rules.durationS);
    if (step.progress >= 1) {
      foot.planted.x = step.to.x;
      foot.planted.z = step.to.z;
      foot.step = null;
    }
  }
  if (feet[0].step || feet[1].step) {
    return;
  }
  const distances = [distance(feet[0].planted, homes[0]), distance(feet[1].planted, homes[1])];
  const first = (distances[0] ?? 0) >= (distances[1] ?? 0) ? 0 : 1;
  const foot = feet[first];
  const home = homes[first];
  if (!foot || !home || (distances[first] ?? 0) < rules.triggerM) {
    return;
  }
  foot.step = {
    from: { x: foot.planted.x, z: foot.planted.z },
    to: { x: home.x + velocity.x * rules.leadS, z: home.z + velocity.z * rules.leadS },
    progress: 0,
  };
}

/** Where the foot is now on the floor, and how high it is lifted (0–1 of the step height). */
export function footPosition(foot: Foot, out: FloorPoint): number {
  const step = foot.step;
  if (!step) {
    out.x = foot.planted.x;
    out.z = foot.planted.z;
    return 0;
  }
  // Ease in and out along the floor; lift in an arc.
  const t = step.progress * step.progress * (3 - 2 * step.progress);
  out.x = step.from.x + (step.to.x - step.from.x) * t;
  out.z = step.from.z + (step.to.z - step.from.z) * t;
  return Math.sin(Math.PI * step.progress);
}

/** Puts both feet straight back on their homes, standing (after running, a dive...). */
export function resetFeet(feet: readonly [Foot, Foot], homes: readonly [FloorPoint, FloorPoint]) {
  feet.forEach((foot, index) => {
    const home = homes[index];
    if (home) {
      foot.planted.x = home.x;
      foot.planted.z = home.z;
    }
    foot.step = null;
  });
}

function distance(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
