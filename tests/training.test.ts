import { describe, expect, it } from 'vitest';
import { Combat } from '../src/game/combat';
import { EMPTY_CONTROLS } from '../src/game/types';
import { TRAINING_LESSONS, TrainingCoach } from '../src/game/training';

describe('training mode', () => {
  it('includes an advanced standing lesson and recognizes a stance switch', () => {
    const lesson = TRAINING_LESSONS.find(item => item.id === 'advanced-striking')!;
    const game = new Combat({}, true); game.start(); const coach = new TrainingCoach(lesson);
    expect(lesson.steps.map(step => step.title)).toEqual(expect.arrayContaining(['Uppercut', 'Front-Kick', 'Knie zum Körper', 'Ellbogen']));
    expect(coach.observe({ ...EMPTY_CONTROLS(), action: 'stance' }, game, [], 1 / 60)).toBe(true);
    expect(coach.current?.title).toBe('Uppercut');
  });
  it('advances a lesson only after the requested technique was performed', () => {
    const game = new Combat({}, true); game.start();
    const coach = new TrainingCoach(TRAINING_LESSONS[0]);
    const moving = { ...EMPTY_CONTROLS(), move: { x: 1, z: 0 } };
    expect(coach.observe(moving, game, [], .7)).toBe(true);
    expect(coach.current?.title).toBe('Lande einen Jab');
    expect(coach.observe(EMPTY_CONTROLS(), game, [{ type: 'hit', attacker: 0, target: 1, technique: 'kick-0-leg', zone: 'leg', strength: 5, blocked: false, position: { x: 0, z: 0 } }], .1)).toBe(false);
    expect(coach.observe(EMPTY_CONTROLS(), game, [{ type: 'hit', attacker: 0, target: 1, technique: 'punch-0-head', zone: 'head', strength: 5, blocked: false, position: { x: 0, z: 0 } }], .1)).toBe(true);
  });

  it('keeps the passive dummy available instead of ending by damage', () => {
    const game = new Combat({}, true); game.start();
    game.fighters[1].damage.head = 99;
    game.fighters[0].position = { x: -.5, z: 0 }; game.fighters[1].position = { x: .5, z: 0 };
    game.command(0, { ...EMPTY_CONTROLS(), action: 'punch-1-head' });
    for (let i = 0; i < 60; i++) game.step(1 / 60);
    expect(game.phase).toBe('fight'); expect(game.result).toBeNull(); expect(game.fighters[1].damage.head).toBeLessThanOrEqual(55);
  });

  it('continues training after a successful submission', () => {
    const game = new Combat({}, true); game.start();
    game.grapple = { mode: 'submission', top: 0, position: 'mount', timer: 0, progress: .99, transition: null };
    game.command(0, { ...EMPTY_CONTROLS(), action: 'holdSubmission' }); game.step(.2);
    expect(game.result).toBeNull(); expect(game.phase).toBe('fight'); expect(game.grapple?.mode).toBe('ground');
  });
});
