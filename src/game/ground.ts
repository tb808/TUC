import type { FighterId, Grapple, GroundDirection, GroundPosition } from './types';

export const POSITION_LABELS: Record<GroundPosition, string> = { guard: 'Full Guard', halfGuard: 'Half Guard', sideControl: 'Side Control', mount: 'Mount', backControl: 'Back Control', turtle: 'Turtle' };
export const POSITION_CONTROL: Record<GroundPosition, number> = { guard: .72, halfGuard: .88, sideControl: 1.08, mount: 1.25, backControl: 1.15, turtle: .85 };
export interface GroundMoveOption { direction: GroundDirection; key: 'W' | 'A' | 'S' | 'D'; label: string; target: GroundPosition; flips: boolean }
const keys = { advance: 'W', left: 'A', reverse: 'S', right: 'D' } as const;
const forward: Record<GroundPosition, GroundPosition> = { guard: 'halfGuard', halfGuard: 'sideControl', sideControl: 'mount', mount: 'backControl', backControl: 'mount', turtle: 'backControl' };
const backward: Record<GroundPosition, GroundPosition> = { guard: 'guard', halfGuard: 'guard', sideControl: 'halfGuard', mount: 'sideControl', backControl: 'turtle', turtle: 'guard' };

export function groundMoveOption(g: Grapple, actor: FighterId, direction: GroundDirection): GroundMoveOption | null {
  if (g.mode !== 'ground' || g.transition) return null;
  const top = actor === g.top, flips = !top && g.position === 'guard';
  if (top && g.position === 'guard' && direction === 'reverse') return null;
  const turnOut = !top && direction === 'right' && (g.position === 'mount' || g.position === 'sideControl');
  const target = flips ? 'guard' : turnOut ? 'turtle' : top && direction !== 'reverse' ? forward[g.position] : backward[g.position];
  const move = flips ? 'SWEEP' : turnOut ? 'TURN OUT' : top ? direction === 'reverse' ? 'ZURÜCK' : direction === 'left' ? 'PASS LINKS' : direction === 'right' ? 'PASS RECHTS' : 'VORRÜCKEN' : 'ESCAPE';
  return { direction, key: keys[direction], label: `${move} · ${POSITION_LABELS[target]}`, target, flips };
}
export function groundMoveOptions(g: Grapple, actor: FighterId) {
  return (['advance', 'left', 'right', 'reverse'] as GroundDirection[]).map(d => groundMoveOption(g, actor, d)).filter((o): o is GroundMoveOption => !!o);
}

/** Layout is shared by transitions and contact posing. Distances are in metres. */
export function groundLayout(position: GroundPosition, side: number) {
  return {
    longitudinal: position === 'mount' ? .2 : position === 'sideControl' ? .06 : position === 'halfGuard' ? -.22 : position === 'backControl' ? -.36 : position === 'turtle' ? -.3 : -.48,
    lateral: position === 'sideControl' ? .4 * side : position === 'turtle' ? .28 * side : 0,
  };
}
