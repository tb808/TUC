import { DIFFICULTIES } from './config';
import { Combat, distance } from './combat';
import { EMPTY_CONTROLS, type Controls, type DifficultyProfile, type FighterId } from './types';
export function seededRandom(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export class OpponentAI {
  profile: DifficultyProfile; decision = 'Distanz lesen'; private next = 0; private combo = 0; private hand = 0; private current = EMPTY_CONTROLS();
  constructor(level: number, private random = Math.random, public id: FighterId = 1) { this.profile = DIFFICULTIES[Math.max(0, Math.min(4, level - 1))]; }
  update(match: Combat): Controls {
    const self = match.fighters[this.id], rival = match.fighters[this.id === 0 ? 1 : 0], p = this.profile;
    if (match.phase !== 'fight') return EMPTY_CONTROLS();
    // Never sees the opponent's control buffer. Only already visible combat state.
    if (match.elapsed < this.next) return { ...this.current, action: this.current.action === 'holdG' ? 'holdG' : undefined };
    this.next = match.elapsed + p.reaction * (.85 + this.random() * .3);
    const input = EMPTY_CONTROLS();
    const d = distance(self.position, rival.position), dx = (rival.position.x - self.position.x) / Math.max(d, .01), dz = (rival.position.z - self.position.z) / Math.max(d, .01);
    const threat = rival.attack && rival.attack.elapsed >= p.reaction;
    if (threat && this.random() < p.accuracy) { input.guard = rival.attack!.technique.zone === 'head' ? 'high' : 'low'; this.decision = 'Deckung lesen'; }
    const g = match.grapple;
    if (g) {
      if (g.mode === 'submission') { input.action = g.top === this.id ? 'holdG' : undefined; input.guard = g.top !== this.id && this.random() < p.accuracy + .1 ? 'high' : null; this.decision = 'Armbar'; }
      else if (g.mode === 'takedown') { if (g.top !== this.id && g.timer >= p.reaction && this.random() < p.grappling) input.guard = 'low'; this.decision = 'Sprawl'; }
      else if (g.transition && g.transition.by !== this.id && g.transition.elapsed >= p.reaction && this.random() < p.grappling) { input.guard = 'high'; this.decision = 'Übergang verteidigen'; }
      else if (self.damage.stamina < p.reserve) { input.guard = 'high'; this.decision = 'Erholen'; }
      else if (g.mode === 'clinch') { input.action = this.random() < p.grappling * .5 ? 'takedown' : this.random() < .15 ? 'stand' : `punch-${this.hand++ % 2}-head`; this.decision = 'Clinch-Angriff'; }
      else if (g.top === this.id) {
        if (g.position === 'mount' && this.random() < p.grappling * .55) input.action = 'submission';
        else input.action = this.random() < p.grappling * .55 ? 'grapple' : `punch-${this.hand++ % 2}-head`;
        this.decision = 'Bodenkontrolle';
      } else { input.guard = this.random() < p.accuracy ? 'high' : null; input.action = this.random() < p.grappling + .15 ? (g.position === 'guard' && this.random() < .4 ? 'stand' : 'grapple') : undefined; input.direction = 'reverse'; this.decision = 'Position befreien'; }
    } else {
      const desired = self.damage.stamina < p.reserve ? 2.2 : this.random() < .3 ? 1.43 : .97;
      const approach = d > desired + .14 ? 1 : d < desired - .16 ? -p.spacing : 0;
      const strafe = Math.sin(match.elapsed * .8) * .28 * p.spacing;
      input.move = { x: dx * approach - dz * strafe, z: dz * approach + dx * strafe };
      if (self.damage.stamina < p.reserve) { input.guard ??= 'high'; this.combo = 0; this.decision = 'Ausdauer verwalten'; }
      else if (!input.guard && d < 1.75 && this.random() < p.aggression) {
        if (d < 1.4 && this.random() < p.grappling * .13) { input.action = this.random() < .65 ? 'takedown' : 'grapple'; this.decision = 'Grappling suchen'; }
        else {
          const kick = d > 1.26 || this.random() < .23;
          const zone = kick ? this.random() < .18 ? 'head' : this.random() < .5 ? 'body' : 'leg' : rival.guard === 'high' && this.random() < p.accuracy ? 'body' : 'head';
          const kind = kick ? 'kick' : d < 1.05 && this.random() < .3 ? 'hook' : 'punch';
          input.action = `${kind}-${this.hand++ % 2}-${zone}`; this.decision = kick ? 'Kick-Distanz' : 'Kombination';
          this.combo++;
          if (this.combo >= p.combo) { this.next += .25; this.combo = 0; }
        }
      } else this.decision = 'Winkel und Distanz';
    }
    this.current = input; return input;
  }
}
