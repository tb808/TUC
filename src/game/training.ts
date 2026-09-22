import type { Combat } from './combat';
import type { CombatEvent, Controls, GroundPosition } from './types';

type TrainingCheck =
  | { kind: 'move'; seconds: number }
  | { kind: 'guard'; seconds: number }
  | { kind: 'hit'; techniques: string[] }
  | { kind: 'grapple'; mode: 'clinch' | 'ground' }
  | { kind: 'position'; position: GroundPosition };

export interface TrainingStep { title: string; instruction: string; keys: string; check: TrainingCheck }
export interface TrainingLesson { id: string; name: string; subtitle: string; steps: TrainingStep[] }

export const TRAINING_LESSONS: TrainingLesson[] = [
  {
    id: 'basics', name: 'Grundlagen', subtitle: 'Bewegung, Jab und Deckung', steps: [
      { title: 'Bleib in Bewegung', instruction: 'Bewege dich mit WASD und finde deine Distanz.', keys: 'W A S D', check: { kind: 'move', seconds: .65 } },
      { title: 'Lande einen Jab', instruction: 'Geh nah genug heran und triff den Kopf des Dummys.', keys: 'J', check: { kind: 'hit', techniques: ['punch-0-head'] } },
      { title: 'Schließ die Deckung', instruction: 'Halte die hohe Deckung für einen Moment.', keys: 'LEERTASTE HALTEN', check: { kind: 'guard', seconds: .8 } },
    ],
  },
  {
    id: 'striking', name: 'Striking', subtitle: 'Boxkombinationen und Kicks', steps: [
      { title: 'Jab', instruction: 'Eröffne die Kombination mit der Führhand.', keys: 'J', check: { kind: 'hit', techniques: ['punch-0-head'] } },
      { title: 'Cross', instruction: 'Setze mit der Schlaghand nach.', keys: 'K', check: { kind: 'hit', techniques: ['punch-1-head'] } },
      { title: 'Low-Kick', instruction: 'Greife das vordere Bein an.', keys: 'U ODER I', check: { kind: 'hit', techniques: ['kick-0-leg', 'kick-1-leg'] } },
      { title: 'Body-Kick', instruction: 'Wechsle die Ebene und triff den Körper.', keys: 'STRG + U / I', check: { kind: 'hit', techniques: ['kick-0-body', 'kick-1-body'] } },
    ],
  },
  {
    id: 'grappling', name: 'Grappling', subtitle: 'Clinch, Takedown und Positionen', steps: [
      { title: 'Clinch herstellen', instruction: 'Geh dicht heran und sichere den Clinch.', keys: 'G', check: { kind: 'grapple', mode: 'clinch' } },
      { title: 'Takedown', instruction: 'Bring den Dummy aus dem Clinch zu Boden.', keys: 'SHIFT + G', check: { kind: 'grapple', mode: 'ground' } },
      { title: 'Half Guard passieren', instruction: 'Rücke aus der Guard eine Position vor.', keys: 'W', check: { kind: 'position', position: 'halfGuard' } },
      { title: 'Side Control', instruction: 'Verbessere deine Kontrolle erneut.', keys: 'W', check: { kind: 'position', position: 'sideControl' } },
      { title: 'Mount', instruction: 'Erreiche die dominante Mount-Position.', keys: 'W', check: { kind: 'position', position: 'mount' } },
    ],
  },
  { id: 'free', name: 'Freies Training', subtitle: 'Alles ausprobieren, keine Gegenwehr', steps: [] },
];

export class TrainingCoach {
  step = 0;
  private held = 0;
  constructor(readonly lesson: TrainingLesson) {}
  get complete() { return this.lesson.steps.length > 0 && this.step >= this.lesson.steps.length; }
  get current() { return this.lesson.steps[this.step] ?? null; }
  observe(input: Controls, game: Combat, events: CombatEvent[], dt: number) {
    const task = this.current;
    if (!task) return false;
    let done = false;
    if (task.check.kind === 'move') {
      this.held = Math.hypot(input.move.x, input.move.z) > .1 ? this.held + dt : 0;
      done = this.held >= task.check.seconds;
    } else if (task.check.kind === 'guard') {
      this.held = input.guard === 'high' ? this.held + dt : 0;
      done = this.held >= task.check.seconds;
    } else if (task.check.kind === 'hit') {
      done = events.some(event => event.type === 'hit' && event.attacker === 0 && !event.blocked && task.check.kind === 'hit' && task.check.techniques.includes(event.technique));
    } else if (task.check.kind === 'grapple') {
      done = game.grapple?.mode === task.check.mode;
    } else if (task.check.kind === 'position') {
      done = game.grapple?.mode === 'ground' && game.grapple.top === 0 && game.grapple.position === task.check.position;
    }
    if (done) { this.step++; this.held = 0; }
    return done;
  }
}
