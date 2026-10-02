import type { Attack, Fighter } from './types';

const limit = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Readable fatigue limits: exhaustion changes commitment without freezing the fighter. */
export function attackTempo(f: Fighter) {
  return f.stats.speed * (.82 + .18 * f.damage.stamina / 100) * (.9 + .1 * f.damage.balance / 100);
}

/** Tip velocity, angle and the attacker's base determine how much mass reaches contact. */
export function contactEfficiency(attacker: Fighter, target: Fighter, attack: Attack) {
  const t = attack.technique;
  const angle = Math.atan2(target.position.x - attacker.position.x, target.position.z - attacker.position.z) - attacker.heading;
  const alignment = limit(Math.cos(angle), .72, 1);
  const nominal = t.reach * .58 / (t.active * .5);
  const velocity = attack.contactSpeed === undefined ? 1 : limit(.8 + .2 * attack.contactSpeed / nominal, .8, 1.12);
  const base = .78 + .22 * attacker.damage.balance / 100;
  return alignment * velocity * base;
}

export function reactToImpact(target: Fighter, attack: Attack, damage: number, blocked: boolean, grounded: boolean) {
  const t = attack.technique;
  target.reactionTarget = t.target;
  // A hook rotates the head away from the incoming glove; straights extend the neck.
  target.reactionSide = t.hand ? -1 : 1;
  target.reaction = blocked ? limit(damage / 5, .09, .24) : limit(damage / 16, .12, 1.15);
  target.reactionZone = t.zone; target.reactionKind = t.kind;
  if (blocked || grounded) return;
  target.shock = limit(target.shock + damage * (t.zone === 'head' ? 1.55 : t.zone === 'body' ? .65 : .4), 0, 100);
  target.hurtTime = Math.max(target.hurtTime, damage > 10 ? 2.8 : 1.2);
  target.hurt = target.shock > 42 || target.damage.balance < 32 ? 'rocked' : target.shock > 23 ? 'stunned' : 'hurt';
  // Glancing and small strikes blend over an ongoing attack. A clean heavy hit interrupts it.
  if (damage >= 8 || target.hurt === 'rocked') {
    target.stun = Math.max(target.stun, .08 + damage * .007 + (target.hurt === 'rocked' ? .16 : 0));
    target.attack = null; target.state = 'stunned';
  }
}

export function recoverImpact(target: Fighter, dt: number) {
  target.shock = Math.max(0, target.shock - dt * 7 * (target.stats.recovery ?? 1));
  target.hurtTime = Math.max(0, target.hurtTime - dt);
  if (target.state === 'knockedDown') target.hurt = 'knockdown';
  else target.hurt = target.hurtTime <= 0 ? 'normal' : target.shock > 42 || target.damage.balance < 32 ? 'rocked' : target.stun > 0 ? 'stunned' : 'hurt';
}
