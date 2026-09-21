import { describe, expect, it } from 'vitest';
import { Combat, canStrikeHit, insideCage, scoreRound } from '../src/game/combat';
import { DIFFICULTIES, STATS, TECHNIQUES } from '../src/game/config';
import { OpponentAI, seededRandom } from '../src/game/ai';
import { EMPTY_CONTROLS, type Attack, type FighterId } from '../src/game/types';

function tick(game: Combat, seconds: number) { for (let i = 0; i < Math.ceil(seconds * 60); i++) game.step(1 / 60); }
function arrange(distance = 1.12) { const g = new Combat(); g.start(); g.fighters[0].position = { x: -distance / 2, z: 0 }; g.fighters[1].position = { x: distance / 2, z: 0 }; return g; }
function act(g: Combat, id: FighterId, action: string) { g.command(id, { ...EMPTY_CONTROLS(), action }); }
function hit(g: Combat, action = 'punch-1-head') { act(g, 0, action); tick(g, .65); }

describe('Treffergeometrie und Timing', () => {
  it('does not hit during preparation or recovery, behind the attacker or out of range', () => {
    const g = arrange(1.05), [a, b] = g.fighters, t = TECHNIQUES['punch-0-head'];
    const attack: Attack = { technique: t, elapsed: 0, hit: false, previousTip: null };
    expect(canStrikeHit(a, b, attack)).toBe(false);
    attack.elapsed = t.windup + t.active / 2; expect(canStrikeHit(a, b, attack)).toBe(true);
    b.position.x = 4; expect(canStrikeHit(a, b, attack)).toBe(false);
    b.position.x = a.position.x - 1.35; expect(canStrikeHit(a, b, attack)).toBe(false);
    b.position.x = a.position.x + 1.35; attack.elapsed = t.windup + t.active + .1; expect(canStrikeHit(a, b, attack)).toBe(false);
  });
  it('applies one hit per active window, never every frame', () => { const g = arrange(1.05); hit(g); expect(g.drainEvents().filter(e => e.type === 'hit')).toHaveLength(1); expect(g.fighters[1].damage.head).toBeGreaterThan(0); });
  it('an out-of-range attack costs stamina but causes no damage', () => { const g = arrange(4); act(g, 0, 'kick-0-head'); tick(g, .6); expect(g.fighters[1].damage.head).toBe(0); expect(g.fighters[0].damage.stamina).toBeLessThan(95); });
  it('a guarded jab causes much less damage and drains the defender stamina', () => { const open = arrange(1.05), guarded = arrange(1.05); guarded.command(1, { ...EMPTY_CONTROLS(), guard: 'high' }); hit(open); hit(guarded); expect(guarded.fighters[1].damage.head).toBeLessThan(open.fighters[1].damage.head * .2); });
  it('treats lateral movement while guarding as ordinary movement', () => { const g = arrange(); g.command(1, { ...EMPTY_CONTROLS(), move: { x: 1, z: 0 }, guard: 'high' }); tick(g, .1); expect(g.fighters[1].cooldown).toBe(0); expect(g.fighters[1].damage.stamina).toBe(100); });
  it('high guard does not block body strikes; low guard does', () => { const high = arrange(1.05), low = arrange(1.05); high.command(1, { ...EMPTY_CONTROLS(), guard: 'high' }); low.command(1, { ...EMPTY_CONTROLS(), guard: 'low' }); hit(high, 'punch-1-body'); hit(low, 'punch-1-body'); expect(high.fighters[1].damage.body).toBeGreaterThan(low.fighters[1].damage.body * 5); });
  it('exhaustion prevents initiating a costly kick', () => { const g = arrange(); g.fighters[0].damage.stamina = 0; act(g, 0, 'kick-0-head'); tick(g, .15); expect(g.fighters[0].attack).toBeNull(); });
  it('does not permit simultaneous attacks or immediate cancelling', () => { const g = arrange(); act(g, 0, 'kick-0-head'); tick(g, .08); act(g, 0, 'punch-1-head'); tick(g, .12); expect(g.fighters[0].attack?.technique.kind).toBe('kick'); });
  it('body and leg damage have distinct consequences', () => { const g = arrange(1.3); hit(g, 'kick-0-leg'); expect(g.fighters[1].damage.leg).toBeGreaterThan(0); expect(g.fighters[1].damage.head).toBe(0); });
});
describe('Arena, Pause und Runden', () => {
  it('clamps positions against every octagonal side', () => { for (let i = 0; i < 360; i++) { const p = insideCage({ x: Math.cos(i) * 20, z: Math.sin(i) * 20 }); for (let j = 0; j < 8; j++) expect(p.x * Math.cos(j * Math.PI / 4) + p.z * Math.sin(j * Math.PI / 4)).toBeLessThanOrEqual(4.300001); } });
  it('pausing freezes combat time, damage and actions', () => { const g = arrange(); g.paused = true; act(g, 0, 'punch-0-head'); const before = JSON.stringify(g.fighters); tick(g, 3); expect(g.remaining).toBe(180); expect(JSON.stringify(g.fighters)).toBe(before); });
  it('plays three rounds with accelerated breaks and reaches a decision', () => { const g = new Combat({ roundSeconds: 1, breakSeconds: .2 }); g.start(); g.score.damage[0] = 20; tick(g, 4); expect(g.round).toBe(3); expect(g.phase).toBe('finished'); expect(g.cards).toHaveLength(3); expect(g.result?.method).toBe('Entscheidung'); expect(g.result?.winner).toBe(0); });
  it('round breaks reset positions and restore only limited health and stamina', () => { const g = new Combat({ roundSeconds: .2, breakSeconds: .2 }); g.start(); g.fighters[0].damage.head = 40; g.fighters[0].damage.stamina = 10; tick(g, .5); expect(g.round).toBe(2); expect(g.fighters[0].damage.head).toBe(33); expect(g.fighters[0].damage.stamina).toBeLessThan(60); });
  it('damage outweighs passive control in judging', () => { expect(scoreRound({ damage: [20, 5], grappling: [0, 6], control: [0, 170], knockdowns: [0, 0] })).toEqual([10, 9]); });
  it('a fresh match has no leaked state', () => { const g = arrange(); g.finish(0, 'KO', 'test'); const fresh = new Combat(); expect(fresh.result).toBeNull(); expect(fresh.round).toBe(1); expect(fresh.fighters[0].damage.head).toBe(0); });
});
describe('Clinch, Boden und Kampfenden', () => {
  it('links clinch → takedown → guard → half guard → side control → mount → armbar', () => {
    const g = arrange(1); act(g, 0, 'grapple'); tick(g, .1); expect(g.grapple?.mode).toBe('clinch');
    act(g, 0, 'takedown'); tick(g, .9); expect(g.grapple?.position).toBe('guard'); expect(g.grapple?.mode).toBe('ground');
    for (const position of ['halfGuard','sideControl','mount']) { act(g, 0, 'grapple'); tick(g, 1); expect(g.grapple?.position).toBe(position); }
    g.fighters[0].damage.stamina = 100; act(g, 0, 'submission'); tick(g, .1); expect(g.grapple?.mode).toBe('submission');
    g.command(0, { ...EMPTY_CONTROLS(), action: 'holdG' }); tick(g, 9); expect(g.result?.method).toBe('Submission'); expect(g.result?.winner).toBe(0);
  });
  it('a timely low guard sprawls a takedown', () => { const g = arrange(); g.command(1, { ...EMPTY_CONTROLS(), guard: 'low' }); act(g, 0, 'takedown'); tick(g, 1); expect(g.grapple).toBeNull(); expect(g.fighters[1].state).not.toBe('ground'); });
  it('defends a ground transition then allows a sweep and standup', () => {
    const g = arrange(); act(g, 0, 'takedown'); tick(g, .9);
    g.command(1, { ...EMPTY_CONTROLS(), guard: 'high' }); act(g, 0, 'grapple'); tick(g, 1); expect(g.grapple?.position).toBe('guard');
    g.command(1, EMPTY_CONTROLS()); act(g, 1, 'grapple'); tick(g, 1); expect(g.grapple?.top).toBe(1);
    act(g, 1, 'stand'); tick(g, .1); expect(g.grapple).toBeNull();
  });
  it('submission defense escapes without a stuck state', () => { const g = arrange(); g.grapple = { mode: 'submission', top: 0, position: 'mount', timer: 0, progress: .1, transition: null }; g.fighters.forEach(f => f.state = 'submission'); g.command(1, { ...EMPTY_CONTROLS(), guard: 'high' }); tick(g, 1); expect(g.grapple?.mode).toBe('ground'); expect(g.result).toBeNull(); });
  it('KO is terminal and cannot apply more damage afterwards', () => { const g = arrange(1.05); g.fighters[1].damage.head = 98; hit(g); expect(g.result?.method).toBe('KO'); const damage = g.fighters[1].damage.head; tick(g, 10); expect(g.fighters[1].damage.head).toBe(damage); });
  it('repeated knockdowns trigger TKO', () => { const g = arrange(1.05); g.fighters[1].knockdowns = 2; g.fighters[1].damage.balance = 0; hit(g); expect(g.result?.method).toBe('TKO'); });
  it('unanswered ground strikes lead to referee stoppage', () => { const g = arrange(); g.grapple = { mode: 'ground', top: 0, position: 'mount', timer: 0, progress: 0, transition: null }; g.fighters.forEach(f => f.state = 'ground'); g.fighters[1].damage.head = 65; g.fighters[1].unanswered = 8; g.fighters[1].lastHit = g.elapsed; hit(g); expect(g.result?.method).toBe('TKO'); });
});
describe('Faire KI', () => {
  it('all levels use identical fighter stats and progressively shorter reaction times', () => { for (let l = 1; l <= 5; l++) { const ai = new OpponentAI(l), g = new Combat(); expect(g.fighters[1].stats).toEqual(STATS); if (l > 1) expect(ai.profile.reaction).toBeLessThan(DIFFICULTIES[l - 2].reaction); } });
  it('ignores an opponent action that exists only in the input buffer', () => { const a = arrange(), b = arrange(); const ai1 = new OpponentAI(5, seededRandom(99)), ai2 = new OpponentAI(5, seededRandom(99)); act(b, 0, 'kick-0-head'); expect(ai1.update(a)).toEqual(ai2.update(b)); });
  it('all five levels complete seeded full matches', () => {
    const outcomes: string[] = [];
    for (let level = 1; level <= 5; level++) { const g = new Combat(); g.start(); const p = new OpponentAI(3, seededRandom(40), 0), ai = new OpponentAI(level, seededRandom(80)); for (let i = 0; i < 560 * 60 && !g.result; i++) { g.command(0, p.update(g)); g.command(1, ai.update(g)); g.step(1 / 60); } expect(g.result).not.toBeNull(); outcomes.push(`${level}:${g.result?.method}`); }
    console.log('Full match outcomes', outcomes.join(', '));
  });
  it('higher levels protect themselves better over multiple fixed-seed sparring matches', () => {
    function run(level: number) { let received = 0; for (let seed = 1; seed <= 8; seed++) { const g = new Combat({ roundSeconds: 45, rounds: 1 }); g.start(); const p = new OpponentAI(3, seededRandom(seed * 11), 0), ai = new OpponentAI(level, seededRandom(seed * 13)); for (let i = 0; i < 45 * 60 && !g.result; i++) { g.command(0, p.update(g)); g.command(1, ai.update(g)); g.step(1 / 60); } received += g.score.damage[0]; } return received; }
    const beginner = run(1), champion = run(5); console.log('Damage received across 8 bouts', { beginner, champion }); expect(champion).toBeLessThan(beginner);
  });
});
