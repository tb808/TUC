import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Combat, canStrikeHit } from '../src/game/combat';
import { TECHNIQUES } from '../src/game/config';
import { strikeMotion } from '../src/game/motion';
import { FighterRig } from '../src/render/fighter';
import { EMPTY_CONTROLS, type Attack } from '../src/game/types';

describe('Contact timing and weighted movement', () => {
  it('keeps the contact curve continuous and peaks inside the active window for every strike', () => {
    for (const technique of Object.values(TECHNIQUES)) {
      const attack: Attack = { technique, elapsed: 0, hit: false, previousTip: null };
      for (const boundary of [technique.windup, technique.windup + technique.active / 2, technique.windup + technique.active]) {
        attack.elapsed = boundary - .00001; const before = strikeMotion(attack).extension;
        attack.elapsed = boundary + .00001; expect(Math.abs(strikeMotion(attack).extension - before)).toBeLessThan(.001);
      }
      attack.elapsed = technique.windup + technique.active / 2; expect(strikeMotion(attack).extension).toBeCloseTo(1);
      attack.elapsed = technique.windup + technique.active + technique.recovery; expect(strikeMotion(attack).extension).toBe(0);
    }
  });
  it('moves a struck opponent over following frames instead of teleporting at contact', () => {
    const game = new Combat(); game.start();
    game.fighters[0].position.x = -.525; game.fighters[1].position.x = .525;
    game.command(0, { ...EMPTY_CONTROLS(), action: 'punch-1-head' });
    let hit = false;
    for (let i = 0; i < 40; i++) {
      const before = game.fighters[1].position.x; game.step(1 / 60);
      if (game.drainEvents().some(e => e.type === 'hit')) {
        expect(game.fighters[1].position.x).toBeCloseTo(before, 7);
        game.step(1 / 60); expect(game.fighters[1].position.x).toBeGreaterThan(before);
        expect(game.fighters[1].position.x - before).toBeLessThan(.06); hit = true; break;
      }
    }
    expect(hit).toBe(true);
  });
  it('still allows head strikes against a moving guard without an evasion window', () => {
    const game = new Combat(); game.start();
    game.fighters[0].position.x = -.525; game.fighters[1].position.x = .525;
    game.command(1, { move: { x: -1, z: 0 }, guard: 'high' }); game.step(1 / 60);
    const technique = TECHNIQUES['punch-0-head'];
    expect(canStrikeHit(...game.fighters, { technique, elapsed: technique.windup + technique.active / 2, hit: false, previousTip: null })).toBe(true);
  });
});

describe('Procedural skeleton', () => {
  it('keeps stationary feet on the mat while breathing and freezes the entire pose when paused', () => {
    const rig = new FighterRig(0), f = new Combat().fighters[0], impact = new THREE.Quaternion();
    let planted: THREE.Vector3[] = [];
    for (let frame = 0; frame < 120; frame++) {
      rig.update(f, null, frame / 60, 1 / 60, impact, null); rig.root.updateMatrixWorld(true);
      const feet = rig.feet.map(foot => foot.getWorldPosition(new THREE.Vector3()));
      feet.forEach(p => expect(p.y).toBeCloseTo(.062, 4));
      if (!frame) planted = feet;
      else feet.forEach((p, i) => expect(p.distanceTo(planted[i])).toBeLessThan(.001));
    }
    const before = rig.skeleton.bones.map(b => b.matrixWorld.toArray());
    f.guard = 'high'; rig.update(f, null, 99, 0, impact, null); rig.root.updateMatrixWorld(true);
    expect(rig.skeleton.bones.map(b => b.matrixWorld.toArray())).toEqual(before);
  });
  it('keeps all bones finite and joints connected through strikes and ground transitions', () => {
    const rig = new FighterRig(0), f = new Combat().fighters[0], impact = new THREE.Quaternion();
    for (const technique of Object.values(TECHNIQUES)) {
      f.attack = { technique, elapsed: 0, hit: false, previousTip: null };
      for (let frame = 0; frame < 80; frame++) {
        f.attack.elapsed = frame / 60; rig.update(f, null, frame / 60, 1 / 60, impact, null);
        rig.skeleton.bones.forEach(b => expect(b.quaternion.toArray().every(Number.isFinite)).toBe(true));
      }
    }
    f.attack = null;
    for (const top of [0, 1] as const) for (const position of ['guard', 'halfGuard', 'sideControl', 'mount'] as const) {
      rig.update(f, { mode: 'ground', top, position, timer: 1, progress: 0, transition: null }, 10, 1 / 60, impact, null);
      expect(rig.hips.position.toArray().every(Number.isFinite)).toBe(true);
      rig.shins.forEach(shin => expect(shin.position.length()).toBeCloseTo(.405));
    }
  });
});
