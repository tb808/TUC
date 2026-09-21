import type { DifficultyProfile, FighterStats, MatchRules, Technique, Zone } from './types';
export const RULES: MatchRules = { rounds: 3, roundSeconds: 180, breakSeconds: 6, cageApothem: 4.65 };
export const STATS: FighterStats = { maxStamina: 100, power: 1, speed: 1, resilience: 1, grappling: 1 };
export const DIFFICULTIES: DifficultyProfile[] = [
  { level: 1, name: 'Einsteiger', subtitle: 'Lerne Abstand und Timing.', reaction: .72, accuracy: .2, combo: 1, spacing: .4, reserve: 12, grappling: .16, aggression: .48 },
  { level: 2, name: 'Amateur', subtitle: 'Erste Kombinationen. Echte Gegenwehr.', reaction: .48, accuracy: .38, combo: 2, spacing: .58, reserve: 20, grappling: .3, aggression: .58 },
  { level: 3, name: 'Profi', subtitle: 'Lücken bleiben selten unbestraft.', reaction: .3, accuracy: .59, combo: 3, spacing: .75, reserve: 28, grappling: .5, aggression: .68 },
  { level: 4, name: 'Contender', subtitle: 'Druck, Konter und Positionskontrolle.', reaction: .21, accuracy: .75, combo: 4, spacing: .9, reserve: 34, grappling: .72, aggression: .76 },
  { level: 5, name: 'Champion', subtitle: 'Präzision in jeder Phase.', reaction: .15, accuracy: .9, combo: 5, spacing: 1, reserve: 39, grappling: .9, aggression: .84 },
];
export const TECHNIQUES: Record<string, Technique> = {};
for (const hand of [0, 1]) {
  for (const zone of ['head', 'body'] as Zone[]) {
    for (const hook of [false, true]) {
      const id = `${hook ? 'hook' : 'punch'}-${hand}-${zone}`;
      TECHNIQUES[id] = { id, label: hook ? 'Haken' : hand ? 'Cross' : 'Jab', kind: hook ? 'hook' : 'punch', hand, zone, windup: hook ? .22 : hand ? .16 : .12, active: .11, recovery: hook ? .35 : hand ? .29 : .22, reach: hook ? .76 : hand ? .99 : .91, radius: .1, damage: hook ? 10 : hand ? 8 : 5, cost: hook ? 11 : hand ? 8 : 5, impulse: hook ? .22 : hand ? .18 : .09, comboAt: hook ? .23 : .15 };
    }
  }
  for (const zone of ['head', 'body', 'leg'] as Zone[]) {
    const id = `kick-${hand}-${zone}`;
    TECHNIQUES[id] = { id, label: zone === 'head' ? 'High-Kick' : zone === 'body' ? 'Body-Kick' : 'Low-Kick', kind: 'kick', hand, zone, windup: zone === 'head' ? .4 : .28, active: .14, recovery: zone === 'head' ? .52 : .4, reach: 1.24, radius: .14, damage: zone === 'head' ? 16 : zone === 'body' ? 12 : 9, cost: zone === 'head' ? 19 : 13, impulse: .3, comboAt: .38 };
  }
  for (const kind of ['groundPunch', 'clinchPunch'] as const) {
    const id = `${kind}-${hand}`;
    TECHNIQUES[id] = { id, label: kind === 'groundPunch' ? 'Ground & Pound' : 'Kurzer Schlag', kind, hand, zone: 'head', windup: .2, active: .1, recovery: .35, reach: 1.4, radius: .2, damage: kind === 'groundPunch' ? 7 : 5, cost: 9, impulse: .14, comboAt: .3 };
  }
}
export const POSITION_LABELS = { guard: 'Guard', halfGuard: 'Half Guard', sideControl: 'Side Control', mount: 'Mount' };
