import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Combat, canStrikeHit, strikeTip } from '../src/game/combat';
import { TECHNIQUES } from '../src/game/config';
import { attackTempo, contactEfficiency } from '../src/game/impact';
import { groundMoveOptions } from '../src/game/ground';
import { EMPTY_CONTROLS, type Attack, type GroundPosition } from '../src/game/types';
import { FighterRig } from '../src/render/fighter';
import { GroundContactSystem } from '../src/render/groundContact';

const tick = (g: Combat, seconds: number) => { for (let i = 0; i < seconds * 60; i++) g.step(1 / 60); };
const action = (g: Combat, id: 0 | 1, name: string) => g.command(id, { ...EMPTY_CONTROLS(), action: name });
const standing = () => { const g = new Combat(); g.start(); g.fighters[0].position.x = -.45; g.fighters[1].position.x = .45; return g; };
const ground = (position: GroundPosition) => { const g = standing(); g.grapple = { mode: 'ground', top: 0, position, timer: 1, progress: 0, transition: null }; g.fighters.forEach(f => f.state = 'ground'); return g; };

describe('Weighted contact and recovery', () => {
  it('slows exhausted commitments moderately and penalizes an unstable base', () => {
    const g = standing(), [f, target] = g.fighters, tempo = attackTempo(f);
    f.damage.stamina = 10; expect(attackTempo(f)).toBeLessThan(tempo); expect(attackTempo(f)).toBeGreaterThan(tempo * .75);
    const attack: Attack = { technique: TECHNIQUES['punch-1-head'], elapsed: .2, hit: false, previousTip: null };
    const stable = contactEfficiency(f, target, attack); f.damage.balance = 10;
    expect(contactEfficiency(f, target, attack)).toBeLessThan(stable);
  });
  it('uses measured limb speed and cannot score during a merely loading glove pose', () => {
    const g = standing(), [a, b] = g.fighters, t = TECHNIQUES['punch-0-head'];
    const attack: Attack = { technique: t, elapsed: t.windup, hit: false, previousTip: null, contactSpeed: 1 };
    expect(canStrikeHit(a, b, attack)).toBe(false);
    const glancing = contactEfficiency(a, b, attack); attack.contactSpeed = 18;
    expect(contactEfficiency(a, b, attack)).toBeGreaterThan(glancing);
    attack.elapsed = t.windup + t.active / 2; expect(canStrikeHit(a, b, attack)).toBe(true);
  });
  it('mirrors contact geometry along with a southpaw stance', () => {
    const g = standing(), f = g.fighters[0], t = TECHNIQUES['hook-0-head']; f.heading = 0;
    const a: Attack = { technique: t, elapsed: t.windup + t.active * .25, hit: false, previousTip: null };
    const orthodox = strikeTip(f, a); f.stance = 'southpaw'; const southpaw = strikeTip(f, a);
    expect(orthodox.x - f.position.x).toBeCloseTo(-(southpaw.x - f.position.x)); expect(orthodox.z).toBeCloseTo(southpaw.z);
  });
  it('keeps a jab additive, while heavy counters rock and interrupt an attacker', () => {
    const jab = standing(); action(jab, 1, 'kick-1-head'); action(jab, 0, 'punch-0-head'); tick(jab, .25);
    expect(jab.fighters[1].hurt).toBe('hurt'); expect(jab.fighters[1].attack).not.toBeNull();
    const heavy = standing(); heavy.fighters[1].shock = 30; heavy.fighters[0].counterWindow = 1;
    action(heavy, 1, 'kick-1-head'); action(heavy, 0, 'hook-1-head'); tick(heavy, .32);
    expect(heavy.fighters[1].hurt).toBe('rocked'); expect(heavy.fighters[1].attack).toBeNull();
    tick(heavy, 7); expect(heavy.fighters[1].hurt).toBe('normal');
  });
  it('selects controlled knee, side and rear knockdowns from the impact type', () => {
    for (const [technique, kind] of [['punch-1-head', 'back'], ['hook-1-head', 'side'], ['kick-1-leg', 'knee']]) {
      const g = standing(); g.fighters[1].damage.balance = 0;
      action(g, 0, technique); tick(g, .5); expect(g.fighters[1].state).toBe('knockedDown'); expect(g.fighters[1].knockdownKind).toBe(kind);
      tick(g, 4); expect(g.fighters[1].state).not.toBe('knockedDown'); expect(g.fighters[1].position.x).toBeGreaterThan(.45);
    }
  });
});

describe('Connected ground fight', () => {
  it('advances from mount to back control and offers a timed choke finish', () => {
    const g = ground('mount'); action(g, 0, 'grapple'); tick(g, 1); expect(g.grapple?.position).toBe('backControl');
    expect(groundMoveOptions(g.grapple!, 1).some(o => o.target === 'turtle')).toBe(true);
    action(g, 0, 'submission'); tick(g, .1); expect(g.grapple?.submissionKind).toBe('choke');
    g.command(0, { ...EMPTY_CONTROLS(), action: 'holdSubmission' }); tick(g, 8);
    expect(g.result?.method).toBe('Submission'); expect(g.result?.detail).toContain('Rear Naked Choke');
  });
  it('lets turtle recover guard and denies a guarded transition', () => {
    const g = ground('turtle'); action(g, 1, 'grapple'); tick(g, 1); expect(g.grapple?.position).toBe('guard');
    g.command(1, { ...EMPTY_CONTROLS(), guard: 'high' }); action(g, 0, 'grapple'); tick(g, 1);
    expect(g.grapple?.position).toBe('guard'); expect(g.grapple?.transition).toBeNull();
  });
  it('preserves body targets, distinct hammerfists and posture strength', () => {
    const hit = (posture: boolean, block: boolean) => {
      const g = ground('mount'); if (posture) { action(g, 0, 'posture'); tick(g, .3); }
      if (block) g.command(1, { ...EMPTY_CONTROLS(), guard: 'low' });
      action(g, 0, 'punch-1-body'); tick(g, .4); expect(g.fighters[1].damage.head).toBe(0); return g.fighters[1].damage.body;
    };
    expect(hit(true, false)).toBeGreaterThan(hit(false, false)); expect(hit(false, true)).toBeLessThan(hit(false, false) * .2);
    const g = ground('mount'); action(g, 0, 'elbow-1-head'); tick(g, .05); expect(g.fighters[0].attack?.technique.label).toBe('Hammerfist');
  });
  it('matches a ground punch to the moving defender and keeps all six positions finite', () => {
    const rigs: [FighterRig, FighterRig] = [new FighterRig(0), new FighterRig(1)], contacts = new GroundContactSystem(), identity = new THREE.Quaternion();
    for (const position of ['guard', 'halfGuard', 'sideControl', 'mount', 'backControl', 'turtle'] as GroundPosition[]) {
      const g = ground(position); tick(g, 1);
      const t = TECHNIQUES['ground-punch-1-head']; g.fighters[0].attack = { technique: t, elapsed: t.windup + t.active / 2, hit: false, previousTip: null };
      for (let i = 0; i < 80; i++) { rigs.forEach((r, id) => r.update(g.fighters[id], g.grapple, 3, 1 / 60, identity, null)); contacts.update(g, rigs); }
      rigs.forEach(r => r.skeleton.bones.forEach(b => expect(b.quaternion.toArray().every(Number.isFinite)).toBe(true)));
      {
        const glove = rigs[0].forearms[1].localToWorld(new THREE.Vector3(0, -.289, 0));
        const head = rigs[1].head.localToWorld(new THREE.Vector3(-.025, 0, .1));
        expect(glove.distanceTo(head), position).toBeLessThan(.2);
      }
    }
  });
});
