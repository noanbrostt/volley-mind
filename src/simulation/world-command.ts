/**
 * Intentions sent into the simulation. The human player and the AI emit the very same
 * commands; nothing else can change the world.
 */
export type WorldCommand = { readonly type: 'launch-ball' };
