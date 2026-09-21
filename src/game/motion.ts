import type { Attack } from './types';

export const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** One contact curve for collision and animation: load, accelerate, contact, recover. */
export function strikeMotion(attack: Attack) {
  const { technique: t, elapsed } = attack;
  const peak = t.windup + t.active * .5;
  const end = t.windup + t.active;
  const load = smooth(elapsed / t.windup);
  const extension = elapsed < t.windup
    ? .12 * load
    : elapsed < peak
      ? .12 + .88 * smooth((elapsed - t.windup) / (t.active * .5))
      : elapsed < end
        ? 1 - .14 * smooth((elapsed - peak) / (t.active * .5))
        : .86 * (1 - smooth((elapsed - end) / t.recovery));
  const preparation = elapsed < t.windup ? Math.sin(load * Math.PI) : 0;
  return { extension, preparation, recovery: smooth((elapsed - end) / t.recovery) };
}

/** Local +Z is forward. Hooks and round kicks sweep across the opponent. */
export function strikeLocal(attack: Attack) {
  const t = attack.technique, side = t.hand ? -1 : 1;
  const { extension } = strikeMotion(attack);
  const phase = Math.max(0, Math.min(1, (attack.elapsed - t.windup) / t.active));
  const arc = t.kind === 'hook' ? .3 : t.kind === 'kick' ? .36 : 0;
  return {
    x: side * (.09 + Math.cos(phase * Math.PI) * arc),
    z: t.reach * (.42 + extension * .58),
    y: t.zone === 'head' ? 1.65 : t.zone === 'body' ? 1.18 : .52,
  };
}
