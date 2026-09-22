import { EMPTY_CONTROLS, type Controls } from './types';
import type { Combat } from './combat';
import type { GroundDirection } from './types';
export class Keyboard {
  keys = new Set<string>(); private actions: KeyboardEvent[] = [];
  constructor(private pause: () => void, private debug: () => void) {
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') { e.preventDefault(); if (!e.repeat) this.pause(); return; }
      if (e.code === 'F3') { e.preventDefault(); if (!e.repeat) this.debug(); return; }
      if ((e.target as HTMLElement).matches('input,select,textarea,button')) return;
      if (['Space','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','KeyU','KeyI','KeyG','KeyR','Tab'].includes(e.code) || (e.ctrlKey && ['KeyJ','KeyK','KeyU','KeyI','KeyG'].includes(e.code))) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.actions.push(e);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }
  clear() { this.keys.clear(); this.actions = []; }
  read(match: Combat): Controls {
    const result = EMPTY_CONTROLS(), down = (k: string) => this.keys.has(k);
    result.move = { x: Number(down('KeyD')) - Number(down('KeyA')), z: Number(down('KeyS')) - Number(down('KeyW')) };
    result.guard = down('Space') ? down('ControlLeft') || down('ControlRight') ? 'low' : 'high' : null;
    const e = this.actions.shift();
    if (e) {
      const groundDirections: Partial<Record<string, GroundDirection>> = { KeyW: 'advance', KeyA: 'left', KeyS: 'reverse', KeyD: 'right' };
      const hand = e.code === 'KeyK' || e.code === 'KeyI' ? 1 : 0;
      if (['KeyJ', 'KeyK'].includes(e.code)) result.action = `${e.shiftKey ? 'hook' : 'punch'}-${hand}-${e.ctrlKey ? 'body' : 'head'}`;
      if (['KeyU', 'KeyI'].includes(e.code)) result.action = match.grapple?.mode === 'ground' && e.code === 'KeyU' ? 'submission' : `kick-${hand}-${e.shiftKey ? 'head' : e.ctrlKey ? 'body' : 'leg'}`;
      if (match.grapple?.mode === 'ground' && groundDirections[e.code]) { result.action = 'grapple'; result.direction = groundDirections[e.code]; }
      if (e.code === 'KeyG' && match.grapple?.mode !== 'ground' && match.grapple?.mode !== 'submission') { result.action = e.shiftKey ? 'takedown' : 'grapple'; result.direction = 'advance'; }
      if (e.code === 'KeyR') result.action = 'stand';
    }
    if (match.grapple?.mode === 'submission' && down('KeyU')) result.action = 'holdSubmission';
    return result;
  }
}
