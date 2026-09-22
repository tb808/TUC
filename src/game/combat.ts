import { RULES, STATS, TECHNIQUES } from './config';
import { strikeLocal } from './motion';
import { EMPTY_CONTROLS, type Attack, type CombatEvent, type Controls, type Fighter, type FighterId, type Grapple, type GroundDirection, type GroundPosition, type MatchResult, type MatchRules, type RoundScore, type Scorecard, type Vec2 } from './types';
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const other = (id: FighterId): FighterId => id === 0 ? 1 : 0;
const GROUND_POSITIONS: GroundPosition[] = ['guard', 'halfGuard', 'sideControl', 'mount'];
export interface GroundMoveOption { direction: GroundDirection; key: 'W' | 'A' | 'S' | 'D'; label: string; target: GroundPosition; flips: boolean }
const directionKeys: Record<GroundDirection, GroundMoveOption['key']> = { advance: 'W', left: 'A', reverse: 'S', right: 'D' };
const positionName: Record<GroundPosition, string> = { guard: 'Guard', halfGuard: 'Half Guard', sideControl: 'Side Control', mount: 'Mount' };
export function groundMoveOption(g: Grapple, actor: FighterId, direction: GroundDirection): GroundMoveOption | null {
  if (g.mode !== 'ground' || g.transition) return null;
  const index = GROUND_POSITIONS.indexOf(g.position), onTop = g.top === actor;
  let targetIndex = index, flips = false, move = '';
  if (onTop) {
    if (direction === 'reverse') { targetIndex = index - 1; move = 'ZURÜCK'; }
    else { targetIndex = index + 1; move = direction === 'left' ? 'PASS LINKS' : direction === 'right' ? 'PASS RECHTS' : 'VORRÜCKEN'; }
  } else if (index === 0) {
    flips = true; move = direction === 'left' ? 'SWEEP LINKS' : direction === 'right' ? 'SWEEP RECHTS' : 'SWEEP';
  } else {
    targetIndex = index - 1;
    move = direction === 'left' ? 'ESCAPE LINKS' : direction === 'right' ? 'ESCAPE RECHTS' : direction === 'advance' ? 'BRIDGE' : 'GUARD HOLEN';
  }
  if (!flips && (targetIndex < 0 || targetIndex >= GROUND_POSITIONS.length)) return null;
  const target = flips ? 'guard' : GROUND_POSITIONS[targetIndex];
  return { direction, key: directionKeys[direction], label: `${move} · ${positionName[target]}`, target, flips };
}
export function groundMoveOptions(g: Grapple, actor: FighterId) {
  return (['advance', 'left', 'right', 'reverse'] as GroundDirection[]).map(direction => groundMoveOption(g, actor, direction)).filter((option): option is GroundMoveOption => !!option);
}
const newScore = (): RoundScore => ({ damage: [0, 0], grappling: [0, 0], control: [0, 0], knockdowns: [0, 0] });
const createFighter = (id: FighterId): Fighter => ({ id, name: id ? 'ALEX VOLK' : 'TYLER', position: { x: id ? 1.5 : -1.5, z: 0 }, velocity: { x: 0, z: 0 }, heading: id ? -Math.PI / 2 : Math.PI / 2, state: 'idle', stats: { ...STATS }, damage: { head: 0, body: 0, leg: 0, balance: 100, stamina: 100 }, attack: null, guard: null, stun: 0, cooldown: 0, knockdowns: 0, knockdownTime: 0, reaction: 0, reactionSide: 1, cut: 0, swelling: 0, unanswered: 0, lastHit: -99 });
export function insideCage(p: Vec2, apothem = RULES.cageApothem, radius = .35): Vec2 {
  const result = { ...p };
  // Radial projection satisfies all eight half-planes, including distant corner inputs.
  let maximum = 0;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4; const x = Math.cos(a), z = Math.sin(a);
    maximum = Math.max(maximum, result.x * x + result.z * z);
  }
  if (maximum > apothem - radius) { const scale = (apothem - radius) / maximum; result.x *= scale; result.z *= scale; }
  return result;
}
export function strikeTip(f: Fighter, a: Attack): Vec2 {
  const tip = strikeLocal(a);
  return { x: f.position.x + Math.sin(f.heading) * tip.z + Math.cos(f.heading) * tip.x, z: f.position.z + Math.cos(f.heading) * tip.z - Math.sin(f.heading) * tip.x };
}
function segmentDistance(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / Math.max(.0001, dx * dx + dz * dz), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function canStrikeHit(attacker: Fighter, target: Fighter, attack: Attack): boolean {
  const t = attack.technique;
  if (attack.hit || attack.elapsed < t.windup || attack.elapsed > t.windup + t.active) return false;
  const angle = Math.atan2(target.position.x - attacker.position.x, target.position.z - attacker.position.z);
  if (Math.abs(angleDelta(angle, attacker.heading)) > (t.kind === 'hook' || t.kind === 'kick' ? .68 : .48)) return false;
  const tip = strikeTip(attacker, attack);
  return segmentDistance(target.position, attack.previousTip ?? tip, tip) < t.radius + .29;
}
export function scoreRound(score: RoundScore): [number, number] {
  // Damage dominates, positional control resolves otherwise close rounds.
  const value = (id: FighterId) => score.damage[id] + score.knockdowns[id] * 8 + score.grappling[id] * .5 + score.control[id] * .015;
  const delta = value(0) - value(1);
  if (Math.abs(delta) < .5) return [10, 10];
  const loser = Math.abs(delta) > 45 && Math.max(...score.knockdowns) > 0 ? 8 : 9;
  return delta > 0 ? [10, loser] : [loser, 10];
}
export class Combat {
  fighters: [Fighter, Fighter] = [createFighter(0), createFighter(1)];
  rules: MatchRules; phase: 'ready' | 'fight' | 'break' | 'finished' = 'ready';
  round = 1; remaining: number; breakRemaining = 0; elapsed = 0; paused = false;
  grapple: Grapple | null = null; result: MatchResult | null = null;
  score = newScore(); cards: Scorecard[] = []; events: CombatEvent[] = [];
  inputs: [Controls, Controls] = [EMPTY_CONTROLS(), EMPTY_CONTROLS()];
  private buffer: ({ action: string; direction?: string; until: number } | null)[] = [null, null];
  private recoil: [Vec2, Vec2] = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
  constructor(rules: Partial<MatchRules> = {}, readonly training = false) { this.rules = { ...RULES, ...rules }; this.remaining = this.rules.roundSeconds; }
  start() { if (this.phase === 'ready') { this.phase = 'fight'; this.events.push({ type: 'bell' }, { type: 'message', text: 'RUNDE 1 · FIGHT' }); } }
  command(id: FighterId, input: Controls) {
    this.inputs[id] = input;
    if (input.action && this.phase === 'fight' && !this.paused) this.buffer[id] = { action: input.action, direction: input.direction, until: this.elapsed + .18 };
  }
  drainEvents() { return this.events.splice(0); }
  step(dt: number) {
    if (this.paused || this.phase === 'ready' || this.phase === 'finished') return;
    this.elapsed += dt;
    if (this.phase === 'break') {
      this.breakRemaining -= dt;
      if (this.breakRemaining <= 0) this.nextRound();
      return;
    }
    this.remaining = Math.max(0, this.remaining - dt);
    for (const f of this.fighters) this.updateFighter(f, dt);
    if (this.grapple) this.updateGrapple(dt);
    else this.separateFighters();
    for (const f of this.fighters) this.updateAttack(f, dt);
    if (this.phase === 'fight' && this.remaining <= 0) this.endRound();
  }
  private updateFighter(f: Fighter, dt: number) {
    const input = this.inputs[f.id], enemy = this.fighters[other(f.id)];
    f.cooldown = Math.max(0, f.cooldown - dt); f.stun = Math.max(0, f.stun - dt);
    f.reaction *= Math.exp(-dt * 9);
    const recoil = this.recoil[f.id];
    if (!this.grapple) {
      // Integrate the impact over time instead of teleporting the struck fighter.
      const decay = Math.exp(-dt * 11), travel = (1 - decay) / 11;
      f.position = insideCage({ x: f.position.x + recoil.x * travel, z: f.position.z + recoil.z * travel }, this.rules.cageApothem);
      recoil.x *= decay; recoil.z *= decay;
    } else { recoil.x = 0; recoil.z = 0; }
    f.damage.balance = Math.min(100, f.damage.balance + dt * 8);
    const regen = f.attack || f.stun > 0 || this.grapple?.mode === 'submission' ? 1.2 : input.guard ? 7 : 12;
    const maximum = Math.max(48, 100 - f.damage.body * .28);
    f.damage.stamina = Math.min(maximum, f.damage.stamina + regen * dt);
    if (this.elapsed - f.lastHit > 4) f.unanswered = Math.max(0, f.unanswered - dt);
    if (f.state === 'knockedDown') {
      f.knockdownTime -= dt;
      if (f.knockdownTime <= 0) { f.state = 'idle'; f.damage.balance = 52; this.message('Wieder auf den Beinen'); }
      return;
    }
    if (f.state === 'finished') return;
    const targetAngle = Math.atan2(enemy.position.x - f.position.x, enemy.position.z - f.position.z);
    if (!this.grapple && (!f.attack || f.attack.elapsed < f.attack.technique.windup * .45)) f.heading += clamp(angleDelta(targetAngle, f.heading), -dt * 7, dt * 7);
    f.guard = !f.attack && f.stun <= 0 ? input.guard : null;
    const queued = this.buffer[f.id];
    if (queued && queued.until < this.elapsed) this.buffer[f.id] = null;
    else if (queued && f.stun <= 0 && f.cooldown <= 0 && this.tryAction(f, queued.action, queued.direction)) this.buffer[f.id] = null;
    if (!this.grapple) {
      const length = Math.hypot(input.move.x, input.move.z);
      const forward = length ? (input.move.x * Math.sin(f.heading) + input.move.z * Math.cos(f.heading)) / length : 0;
      const footwork = forward < -.2 ? .78 : Math.abs(forward) < .45 ? .88 : 1;
      const committed = f.attack?.technique.kind === 'kick' ? .08 : .28;
      const pace = (f.attack ? committed : f.guard ? .58 : 1) * footwork * (f.stun > 0 ? .12 : 1) * (1 - f.damage.leg * .004) * (1.2 + f.damage.stamina * .007);
      const vx = length ? input.move.x / Math.max(1, length) * pace : 0;
      const vz = length ? input.move.z / Math.max(1, length) * pace : 0;
      const response = 1 - Math.exp(-dt * (length ? 10 : 16));
      f.velocity.x += (vx - f.velocity.x) * response;
      f.velocity.z += (vz - f.velocity.z) * response;
      f.position = insideCage({ x: f.position.x + f.velocity.x * dt, z: f.position.z + f.velocity.z * dt }, this.rules.cageApothem);
      if (!f.attack) f.state = f.stun > 0 ? 'stunned' : f.guard ? 'guarding' : length > .1 ? 'moving' : 'idle';
    } else { f.velocity.x = 0; f.velocity.z = 0; }
  }
  private tryAction(f: Fighter, action: string, direction?: string): boolean {
    const enemy = this.fighters[other(f.id)];
    if (enemy.state === 'knockedDown') return false;
    if (action === 'stand') return this.tryStand(f);
    if (action === 'grapple' || action === 'takedown') return this.tryGrapple(f, action, direction);
    if (action === 'submission') {
      if (this.grapple?.mode === 'ground' && this.grapple.position === 'mount' && this.grapple.top === f.id && f.damage.stamina > 24 && !f.attack) {
        this.grapple.mode = 'submission'; this.grapple.progress = .28; this.grapple.timer = 0; this.grapple.transition = null;
        this.fighters.forEach(x => { x.state = 'submission'; x.attack = null; }); this.message('ARMBAR · Halte G zum Angriff / LEERTASTE zur Verteidigung'); return true;
      } return false;
    }
    let technique = TECHNIQUES[action];
    if (!technique) return false;
    if (this.grapple) {
      if (this.grapple.mode === 'submission' || this.grapple.mode === 'takedown' || this.grapple.transition) return false;
      if (technique.kind === 'kick') return false;
      technique = TECHNIQUES[`${this.grapple.mode === 'clinch' ? 'clinchPunch' : 'groundPunch'}-${technique.hand}`];
      if (this.grapple.mode === 'ground' && this.grapple.top !== f.id) return false;
    }
    if (f.attack) {
      const a = f.attack, t = a.technique;
      if (a.elapsed < t.windup + t.active + t.comboAt || t.hand === technique.hand || t.kind === 'kick') return false;
    }
    if (f.damage.stamina < technique.cost + 2) return false;
    f.damage.stamina -= technique.cost; f.attack = { technique, elapsed: 0, hit: false, previousTip: null }; f.guard = null; f.state = 'attacking';
    return true;
  }
  private updateAttack(f: Fighter, dt: number) {
    const a = f.attack; if (!a) return;
    a.elapsed += dt;
    const enemy = this.fighters[other(f.id)], t = a.technique;
    const linked = this.grapple && (t.kind === 'groundPunch' || t.kind === 'clinchPunch');
    if (enemy.state !== 'knockedDown' && enemy.state !== 'finished' && (linked ? !a.hit && a.elapsed >= t.windup && a.elapsed <= t.windup + t.active : canStrikeHit(f, enemy, a))) {
      a.hit = true; this.applyHit(f, enemy, a);
    }
    if (a.elapsed >= t.windup) a.previousTip = strikeTip(f, a);
    if (a.elapsed >= t.windup + t.active + t.recovery && f.attack === a) { f.attack = null; f.state = this.grapple ? this.grapple.mode === 'clinch' ? 'clinch' : 'ground' : 'idle'; }
  }
  private applyHit(attacker: Fighter, target: Fighter, a: Attack) {
    const t = a.technique;
    const facing = Math.abs(angleDelta(Math.atan2(attacker.position.x - target.position.x, attacker.position.z - target.position.z), target.heading)) < 1.1;
    const blocked = facing && (t.zone === 'head' ? target.guard === 'high' : target.guard === 'low') && target.damage.stamina > 3;
    const relativeSpeed = (attacker.velocity.x - target.velocity.x) * Math.sin(attacker.heading) + (attacker.velocity.z - target.velocity.z) * Math.cos(attacker.heading);
    const vulnerable = target.attack && target.attack.elapsed < target.attack.technique.windup ? 1.2 : 1;
    const damage = t.damage * attacker.stats.power / target.stats.resilience * (.65 + attacker.damage.stamina / 200) * clamp(1 + relativeSpeed * .075, .75, 1.22) * vulnerable * (blocked ? .12 : 1);
    target.damage[t.zone] = clamp(target.damage[t.zone] + damage, 0, 120);
    target.damage.balance = Math.max(0, target.damage.balance - damage * (t.zone === 'head' ? 2.5 : 1));
    target.damage.stamina = Math.max(0, target.damage.stamina - (blocked ? t.damage * .65 : t.zone === 'body' ? damage * 1.7 : damage * .25));
    target.reaction = blocked ? .18 : clamp(damage / 15, .2, 1.2); target.reactionSide = t.hand ? -1 : 1;
    target.cut = clamp(target.damage.head / 100, 0, 1); target.swelling = clamp(target.damage.head / 90, 0, 1);
    target.lastHit = this.elapsed;
    if (!blocked) { target.unanswered += 1; attacker.unanswered = 0; }
    this.score.damage[attacker.id] += damage;
    this.events.push({ type: 'hit', attacker: attacker.id, target: target.id, technique: t.id, zone: t.zone, strength: damage, blocked, position: { ...target.position } });
    if (!blocked && !this.grapple) {
      this.recoil[target.id].x += Math.sin(attacker.heading) * t.impulse * 11;
      this.recoil[target.id].z += Math.cos(attacker.heading) * t.impulse * 11;
      if (damage >= 7) { target.stun = .1 + damage * .008; target.attack = null; target.state = 'stunned'; }
    }
    if (this.training) {
      target.damage.head = Math.min(55, target.damage.head); target.damage.body = Math.min(55, target.damage.body); target.damage.leg = Math.min(55, target.damage.leg);
      target.damage.balance = Math.max(35, target.damage.balance); target.unanswered = Math.min(3, target.unanswered); target.knockdowns = 0;
      return;
    }
    if (target.damage.head >= 100 || target.damage.body >= 110) { this.finish(attacker.id, target.damage.head >= 100 ? 'KO' : 'TKO', t.zone === 'head' ? 'Entscheidender Kopftreffer' : 'Abbruch nach Körpertreffern'); return; }
    if (this.grapple?.mode === 'ground' && target.unanswered >= 9 && target.damage.head >= 60) { this.finish(attacker.id, 'TKO', 'Abbruch durch Ground & Pound'); return; }
    if (!this.grapple && !blocked && (target.damage.balance <= 15 || (target.damage.head >= 65 && damage >= 12))) {
      target.knockdowns++; target.knockdownTime = 2.6; target.state = 'knockedDown'; target.attack = null; target.guard = null;
      this.score.knockdowns[attacker.id]++;
      if (target.knockdowns >= 3) this.finish(attacker.id, 'TKO', 'Abbruch nach wiederholten Niederschlägen');
      else this.message('NIEDERSCHLAG');
    }
  }
  private tryGrapple(f: Fighter, action: string, direction?: string) {
    if (f.attack || f.damage.stamina < 16) return false;
    const enemy = this.fighters[other(f.id)];
    if (!this.grapple) {
      if (distance(f.position, enemy.position) > (action === 'takedown' ? 1.65 : 1.22)) return false;
      if (Math.abs(angleDelta(Math.atan2(enemy.position.x - f.position.x, enemy.position.z - f.position.z), f.heading)) > .6) return false;
      f.damage.stamina -= action === 'takedown' ? 18 : 8;
      this.grapple = { mode: action === 'takedown' ? 'takedown' : 'clinch', top: f.id, position: 'guard', timer: 0, progress: 0, transition: null };
      this.fighters.forEach(x => { x.attack = null; x.state = this.grapple!.mode === 'clinch' ? 'clinch' : 'takedown'; });
      this.message(action === 'takedown' ? 'TAKEDOWN · Tief decken zum Sprawl' : 'CLINCH · G für Kontrolle / R zum Lösen'); return true;
    }
    const g = this.grapple;
    if (g.mode === 'clinch' && action === 'takedown') {
      f.damage.stamina -= 18; g.mode = 'takedown'; g.top = f.id; g.timer = 0; this.fighters.forEach(x => { x.state = 'takedown'; x.attack = null; }); return true;
    }
    if (g.mode === 'ground' && !g.transition) {
      const moveDirection = (direction ?? 'advance') as GroundDirection;
      const option = groundMoveOption(g, f.id, moveDirection);
      if (!option) return false;
      const index = GROUND_POSITIONS.indexOf(g.position), duration = option.flips ? .96 : .84 + index * .04;
      const targetSide = moveDirection === 'left' ? -1 : moveDirection === 'right' ? 1 : (g.side ?? 1);
      g.transition = { by: f.id, direction: moveDirection, elapsed: 0, duration, from: g.position, to: option.target, targetSide, flips: option.flips };
      f.damage.stamina -= g.top === f.id ? 8 : 11; f.cooldown = duration;
      this.message(option.label.toUpperCase()); return true;
    }
    if (g.mode === 'clinch' && !g.transition) {
      g.transition = { by: f.id, direction: (direction ?? 'advance') as GroundDirection, elapsed: 0, duration: .8 }; f.damage.stamina -= 10; f.cooldown = .9; return true;
    }
    return false;
  }
  private tryStand(f: Fighter) {
    const g = this.grapple; if (!g || g.mode === 'submission' || g.mode === 'takedown' || g.transition || f.attack) return false;
    if (g.mode === 'clinch' || g.top === f.id || (g.position === 'guard' && this.fighters[g.top].damage.stamina < f.damage.stamina + 8)) {
      if (f.damage.stamina < 12) return false;
      f.damage.stamina -= 12; this.release(); this.message('ZURÜCK IM STAND'); return true;
    }
    this.message('Erst Position verbessern: WASD drücken'); f.cooldown = .6; return true;
  }
  private updateGrapple(dt: number) {
    const g = this.grapple!; g.timer += dt;
    const top = this.fighters[g.top], bottom = this.fighters[other(g.top)];
    this.score.control[g.top] += dt;
    if (g.mode === 'takedown' && g.timer >= .78) {
      const sprawl = bottom.guard === 'low' && bottom.damage.stamina >= 15;
      if (sprawl) { bottom.damage.stamina -= 12; this.release(); top.stun = .35; this.message('SPRAWL · Takedown abgewehrt'); }
      else { g.mode = 'ground'; g.timer = 0; this.fighters.forEach(f => { f.state = 'ground'; f.attack = null; }); this.score.grappling[g.top] += 6; this.message('AM BODEN · Guard'); }
      return;
    }
    if (g.transition) {
      const tr = g.transition, duration = tr.duration ?? .8;
      if (tr.defended) {
        tr.elapsed = Math.max(0, tr.elapsed - dt * 1.8);
        if (tr.elapsed <= 0) g.transition = null;
      } else {
        tr.elapsed += dt;
        if (!tr.resolved && tr.elapsed >= duration * .62) {
          tr.resolved = true;
          const actor = this.fighters[tr.by], defender = this.fighters[other(tr.by)];
          const defended = defender.guard !== null && defender.damage.stamina >= actor.damage.stamina * .55 && defender.damage.stamina > 10;
          if (defended) { tr.defended = true; defender.damage.stamina -= 9; this.message('ÜBERGANG ABGEWEHRT'); }
        }
        if (!tr.defended && tr.elapsed >= duration) {
          if (g.mode === 'clinch') { g.top = tr.by; this.score.grappling[tr.by] += 2; this.message('CLINCH-KONTROLLE'); }
          else {
            g.position = tr.to ?? g.position; g.side = tr.targetSide ?? g.side ?? 1;
            if (tr.flips) { g.top = tr.by; g.side = (-(g.side ?? 1)) as -1 | 1; this.message('SWEEP · Position gedreht'); }
            this.score.grappling[tr.by] += 3;
          }
          g.transition = null;
        }
      }
    }
    if (g.mode === 'submission') {
      const attacking = this.inputs[g.top].action === 'holdSubmission';
      const defending = this.inputs[other(g.top)].guard !== null;
      const advantage = (top.damage.stamina - bottom.damage.stamina) / 250;
      g.progress = clamp(g.progress + dt * ((attacking ? .19 : -.13) - (defending ? .22 : 0) + advantage), 0, 1);
      top.damage.stamina = Math.max(0, top.damage.stamina - dt * (attacking ? 5 : 1));
      bottom.damage.stamina = Math.max(0, bottom.damage.stamina - dt * (defending ? 7 : 1));
      if (g.progress >= 1) {
        if (this.training) { g.mode = 'ground'; g.position = 'sideControl'; g.progress = 0; g.timer = 0; this.fighters.forEach(f => f.state = 'ground'); this.message('ARMBAR ERFOLGREICH · Weiter trainieren'); return; }
        this.finish(g.top, 'Submission', 'Armbar aus der Mount'); return;
      }
      if (g.progress <= 0 || g.timer > 14) { g.mode = 'ground'; g.position = 'sideControl'; g.timer = 0; this.fighters.forEach(f => f.state = 'ground'); this.message('ARMBAR VERTEIDIGT'); }
    }
    const middle = { x: (top.position.x + bottom.position.x) / 2, z: (top.position.z + bottom.position.z) / 2 };
    const layout = (position: GroundPosition, side: number) => ({
      longitudinal: position === 'mount' ? .2 : position === 'sideControl' ? .06 : position === 'halfGuard' ? -.22 : -.48,
      lateral: position === 'sideControl' ? .4 * side : 0,
    });
    let longitudinal = g.mode === 'clinch' ? -.62 : g.mode === 'takedown' ? -.52 : g.mode === 'submission' ? .6 : layout(g.position, g.side ?? 1).longitudinal;
    let lateral = g.mode === 'submission' ? .56 : g.mode === 'ground' ? layout(g.position, g.side ?? 1).lateral : 0;
    if (g.mode === 'ground' && g.transition?.from && g.transition.to) {
      const tr = g.transition, p = clamp(tr.elapsed / (tr.duration ?? .8), 0, 1), eased = p * p * (3 - 2 * p);
      const from = layout(tr.from ?? g.position, g.side ?? 1), to = layout(tr.to ?? g.position, tr.targetSide ?? g.side ?? 1);
      longitudinal = from.longitudinal + (to.longitudinal - from.longitudinal) * eased;
      lateral = from.lateral + (to.lateral - from.lateral) * eased;
      if (tr.flips) { longitudinal *= 1 - 2 * eased; lateral *= 1 - 2 * eased; }
    }
    const dx = (Math.sin(top.heading) * longitudinal + Math.cos(top.heading) * lateral) / 2;
    const dz = (Math.cos(top.heading) * longitudinal - Math.sin(top.heading) * lateral) / 2;
    const blend = Math.min(1, dt * 10);
    top.position = insideCage({ x: top.position.x + (middle.x + dx - top.position.x) * blend, z: top.position.z + (middle.z + dz - top.position.z) * blend }, this.rules.cageApothem);
    bottom.position = insideCage({ x: bottom.position.x + (middle.x - dx - bottom.position.x) * blend, z: bottom.position.z + (middle.z - dz - bottom.position.z) * blend }, this.rules.cageApothem);
  }
  private release() {
    this.grapple = null;
    this.fighters.forEach(f => { f.state = 'idle'; f.attack = null; f.cooldown = .6; f.position = insideCage({ x: f.position.x - Math.sin(f.heading) * .42, z: f.position.z - Math.cos(f.heading) * .42 }, this.rules.cageApothem); });
  }
  private separateFighters() {
    const [a, b] = this.fighters; const d = distance(a.position, b.position);
    if (d < .78) {
      const x = (b.position.x - a.position.x) / (d || 1) || 1, z = (b.position.z - a.position.z) / (d || 1);
      const push = (.78 - d) / 2;
      a.position = insideCage({ x: a.position.x - x * push, z: a.position.z - z * push }, this.rules.cageApothem);
      b.position = insideCage({ x: b.position.x + x * push, z: b.position.z + z * push }, this.rules.cageApothem);
    }
  }
  private endRound() {
    this.cards.push({ round: this.round, points: scoreRound(this.score), scores: structuredClone(this.score) });
    this.events.push({ type: 'bell' });
    if (this.round >= this.rules.rounds) {
      const totals = this.cards.reduce((sum, c) => [sum[0] + c.points[0], sum[1] + c.points[1]], [0, 0]);
      this.finish(totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1, totals[0] === totals[1] ? 'Unentschieden' : 'Entscheidung', `${totals[0]} : ${totals[1]} · vereinfachte 10-Punkte-Wertung`);
    } else { this.phase = 'break'; this.breakRemaining = this.rules.breakSeconds; this.grapple = null; this.fighters.forEach(f => { f.attack = null; f.state = 'idle'; }); this.message('RUNDENPAUSE · Durchatmen'); }
  }
  private nextRound() {
    this.round++; this.remaining = this.rules.roundSeconds; this.phase = 'fight'; this.score = newScore(); this.buffer = [null, null]; this.recoil = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
    this.fighters.forEach(f => { const fresh = createFighter(f.id); f.position = fresh.position; f.heading = fresh.heading; f.velocity = fresh.velocity; f.damage.stamina = Math.min(100 - f.damage.body * .28, f.damage.stamina + 35); f.damage.balance = 100; f.damage.head = Math.max(0, f.damage.head - 7); f.stun = 0; f.cooldown = 0; f.guard = null; f.unanswered = 0; f.state = 'idle'; });
    this.events.push({ type: 'bell' }); this.message(`RUNDE ${this.round} · FIGHT`);
  }
  finish(winner: FighterId | null, method: MatchResult['method'], detail: string) {
    if (this.result) return;
    this.result = { winner, method, detail }; this.phase = 'finished';
    this.fighters.forEach(f => { f.attack = null; f.state = 'finished'; f.guard = null; }); this.events.push({ type: 'end', result: this.result });
  }
  private message(text: string) { this.events.push({ type: 'message', text }); }
}
