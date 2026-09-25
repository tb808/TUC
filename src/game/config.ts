import type { AnatomicalTarget, DifficultyProfile, FighterStats, MatchRules, Technique, TechniqueKind, Zone } from './types';
export const RULES: MatchRules = { rounds: 3, roundSeconds: 180, breakSeconds: 6, cageApothem: 4.65 };
export const STATS: FighterStats = { maxStamina: 100, power: 1, speed: 1, resilience: 1, grappling: 1, striking: 1 };
export const DIFFICULTIES: DifficultyProfile[] = [
  { level: 1, name: 'Einsteiger', subtitle: 'Lerne Abstand und Timing.', reaction: .72, accuracy: .2, combo: 1, spacing: .4, reserve: 12, grappling: .16, aggression: .48 },
  { level: 2, name: 'Amateur', subtitle: 'Erste Kombinationen. Echte Gegenwehr.', reaction: .48, accuracy: .38, combo: 2, spacing: .58, reserve: 20, grappling: .3, aggression: .58 },
  { level: 3, name: 'Profi', subtitle: 'Lücken bleiben selten unbestraft.', reaction: .3, accuracy: .59, combo: 3, spacing: .75, reserve: 28, grappling: .5, aggression: .68 },
  { level: 4, name: 'Contender', subtitle: 'Druck, Konter und Positionskontrolle.', reaction: .21, accuracy: .75, combo: 4, spacing: .9, reserve: 34, grappling: .72, aggression: .76 },
  { level: 5, name: 'Champion', subtitle: 'Präzision in jeder Phase.', reaction: .15, accuracy: .9, combo: 5, spacing: 1, reserve: 39, grappling: .9, aggression: .84 },
];
export const TECHNIQUES: Record<string, Technique> = {};
const add = (id: string, label: string, kind: TechniqueKind, hand: number, zone: Zone, target: AnatomicalTarget, windup: number, active: number, recovery: number, reach: number, radius: number, damage: number, cost: number, impulse: number, comboAt: number) => {
  TECHNIQUES[id] = { id, label, kind, hand, zone, target, windup, active, recovery, reach, radius, damage, cost, impulse, comboAt };
};
for (const hand of [0, 1]) {
  for (const zone of ['head', 'body'] as Zone[]) {
    for (const hook of [false, true]) {
      const id = `${hook ? 'hook' : 'punch'}-${hand}-${zone}`;
      add(id, hook ? 'Haken' : hand ? 'Cross' : 'Jab', hook ? 'hook' : 'punch', hand, zone, zone === 'head' ? hook ? 'temple' : 'chin' : hand ? 'liver' : 'ribs', hook ? .22 : hand ? .16 : .12, .11, hook ? .35 : hand ? .29 : .22, hook ? .76 : hand ? .99 : .91, .1, hook ? 10 : hand ? 8 : 5, hook ? 11 : hand ? 8 : 5, hook ? .22 : hand ? .18 : .09, hook ? .23 : .15);
    }
  }
  add(`uppercut-${hand}-head`, hand ? 'Rear Uppercut' : 'Lead Uppercut', 'uppercut', hand, 'head', 'chin', .2, .1, .34, .7, .11, hand ? 12 : 9, hand ? 13 : 10, .22, .22);
  add(`uppercut-${hand}-body`, 'Body Uppercut', 'uppercut', hand, 'body', hand ? 'liver' : 'solarPlexus', .18, .1, .31, .68, .11, hand ? 10 : 8, 10, .14, .2);
  add(`elbow-${hand}-head`, hand ? 'Rear Elbow' : 'Lead Elbow', 'elbow', hand, 'head', 'temple', .18, .08, .38, .53, .12, hand ? 15 : 12, 15, .3, .25);
  add(`elbow-${hand}-body`, 'Body Elbow', 'elbow', hand, 'body', hand ? 'liver' : 'ribs', .18, .08, .35, .5, .12, 11, 13, .18, .24);
  for (const zone of ['head', 'body', 'leg'] as Zone[]) {
    const id = `kick-${hand}-${zone}`;
    add(id, zone === 'head' ? 'High-Kick' : zone === 'body' ? 'Body-Kick' : 'Low-Kick', 'kick', hand, zone, zone === 'head' ? 'temple' : zone === 'body' ? hand ? 'liver' : 'ribs' : 'thigh', zone === 'head' ? .4 : .28, .14, zone === 'head' ? .52 : .4, 1.24, .14, zone === 'head' ? 16 : zone === 'body' ? 12 : 9, zone === 'head' ? 19 : 13, .3, .38);
  }
  add(`frontKick-${hand}-body`, hand ? 'Rear Front-Kick' : 'Lead Teep', 'frontKick', hand, 'body', 'solarPlexus', .26, .13, .37, 1.38, .13, hand ? 11 : 8, 12, .34, .3);
  add(`sideKick-${hand}-body`, 'Side-Kick', 'sideKick', hand, 'body', 'ribs', .38, .12, .55, 1.46, .14, 14, 18, .42, .42);
  add(`knee-${hand}-body`, 'Knie zum Körper', 'knee', hand, 'body', hand ? 'liver' : 'solarPlexus', .2, .1, .33, .68, .14, 12, 13, .24, .22);
  add(`knee-${hand}-head`, 'Knie zum Kopf', 'knee', hand, 'head', 'chin', .3, .11, .46, .62, .14, 17, 20, .38, .34);
  for (const kind of ['groundPunch', 'clinchPunch'] as const) {
    const id = `${kind}-${hand}`;
    add(id, kind === 'groundPunch' ? 'Ground & Pound' : 'Kurzer Schlag', kind, hand, 'head', 'temple', .2, .1, .35, 1.4, .2, kind === 'groundPunch' ? 7 : 5, 9, .14, .3);
  }
}
export const POSITION_LABELS = { guard: 'Guard', halfGuard: 'Half Guard', sideControl: 'Side Control', mount: 'Mount' };
