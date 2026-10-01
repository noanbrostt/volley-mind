import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { WorldState } from '@simulation/world-state';

/**
 * Places the ball mesh between the last two simulation states. Writes the components in
 * place instead of building vectors, so the render loop allocates nothing per frame.
 */
export function syncBallView(
  mesh: Mesh,
  previous: WorldState,
  current: WorldState,
  alpha: number,
): void {
  const from = previous.ball.position;
  const to = current.ball.position;
  mesh.position.set(
    from.x + (to.x - from.x) * alpha,
    from.y + (to.y - from.y) * alpha,
    from.z + (to.z - from.z) * alpha,
  );
}
