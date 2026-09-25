import type { FighterStats } from './types';

export interface FighterProfile {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
  description: string;
  stats: FighterStats;
  visual: { skin: string; shorts: string; hair: string; hairStyle: 'crop' | 'buzz' | 'high' | 'bald' | 'swept'; beard: boolean; build: number; accent: string };
}

export const FIGHTERS: readonly FighterProfile[] = [
  { id: 'tyler', name: 'TYLER', nickname: 'THE ALLROUNDER', specialty: 'ALLROUNDER', description: 'Ausgeglichen in jeder Phase des Kampfes.', stats: { maxStamina: 100, power: 1, speed: 1, resilience: 1, grappling: 1, striking: 1 }, visual: { skin: '#ba8263', shorts: '#153f77', hair: '#201914', hairStyle: 'crop', beard: false, build: 1, accent: '#72aeed' } },
  { id: 'alex', name: 'ALEX VOLK', nickname: 'THE STRIKER', specialty: 'STRIKING', description: 'Präzise Kombinationen und gefährliche Konter.', stats: { maxStamina: 96, power: 1.05, speed: 1.04, resilience: .96, grappling: .82, striking: 1.18 }, visual: { skin: '#976448', shorts: '#851e30', hair: '#171411', hairStyle: 'buzz', beard: true, build: 1.03, accent: '#e26b72' } },
  { id: 'malik', name: 'MALIK RAHMAN', nickname: 'THE WRESTLER', specialty: 'GRAPPLING', description: 'Takedowns, Kontrolle und Submissions.', stats: { maxStamina: 104, power: .96, speed: .94, resilience: 1.05, grappling: 1.25, striking: .88 }, visual: { skin: '#694430', shorts: '#315d44', hair: '#101012', hairStyle: 'high', beard: true, build: 1.08, accent: '#75c992' } },
  { id: 'sofia', name: 'SOFIA REYES', nickname: 'THE TECHNICIAN', specialty: 'TEMPO', description: 'Schnelle Beinarbeit und hoher Druck.', stats: { maxStamina: 108, power: .88, speed: 1.18, resilience: .9, grappling: .92, striking: 1.06 }, visual: { skin: '#ad775b', shorts: '#603780', hair: '#241814', hairStyle: 'swept', beard: false, build: .92, accent: '#bd86ed' } },
  { id: 'bruno', name: 'BRUNO COSTA', nickname: 'THE HAMMER', specialty: 'POWER', description: 'Schwere Treffer und hohe Widerstandskraft.', stats: { maxStamina: 92, power: 1.24, speed: .86, resilience: 1.16, grappling: .95, striking: .99 }, visual: { skin: '#87583e', shorts: '#a26825', hair: '#171412', hairStyle: 'bald', beard: true, build: 1.13, accent: '#e6aa5d' } },
];

export function fighterProfile(id: string): FighterProfile { return FIGHTERS.find(fighter => fighter.id === id) ?? FIGHTERS[0]; }
export function randomOpponent(playerId: string, random = Math.random): FighterProfile {
  const choices = FIGHTERS.filter(fighter => fighter.id !== playerId);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
