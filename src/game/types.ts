export type FighterId = 0 | 1;
export type Vec2 = { x: number; z: number };
export type Zone = 'head' | 'body' | 'leg';
export type CombatState = 'idle' | 'moving' | 'guarding' | 'attacking' | 'stunned' | 'knockedDown' | 'clinch' | 'takedown' | 'ground' | 'submission' | 'finished';
export type GroundPosition = 'guard' | 'halfGuard' | 'sideControl' | 'mount';
export interface FighterStats { maxStamina: number; power: number; speed: number; resilience: number; grappling: number }
export interface DamageState { head: number; body: number; leg: number; balance: number; stamina: number }
export interface Technique { id: string; label: string; kind: 'punch' | 'hook' | 'kick' | 'groundPunch' | 'clinchPunch'; hand: number; zone: Zone; windup: number; active: number; recovery: number; reach: number; radius: number; damage: number; cost: number; impulse: number; comboAt: number }
export interface Attack { technique: Technique; elapsed: number; hit: boolean; previousTip: Vec2 | null }
export interface Fighter { id: FighterId; name: string; position: Vec2; velocity: Vec2; heading: number; state: CombatState; stats: FighterStats; damage: DamageState; attack: Attack | null; guard: 'high' | 'low' | null; dodge: number; stun: number; cooldown: number; knockdowns: number; knockdownTime: number; reaction: number; reactionSide: number; cut: number; swelling: number; unanswered: number; lastHit: number }
export interface Controls { move: Vec2; guard: 'high' | 'low' | null; action?: string; direction?: 'advance' | 'reverse' | 'left' | 'right' }
export interface DifficultyProfile { level: number; name: string; subtitle: string; reaction: number; accuracy: number; combo: number; spacing: number; reserve: number; grappling: number; aggression: number }
export interface MatchRules { rounds: number; roundSeconds: number; breakSeconds: number; cageApothem: number }
export interface RoundScore { damage: [number, number]; grappling: [number, number]; control: [number, number]; knockdowns: [number, number] }
export interface Scorecard { round: number; points: [number, number]; scores: RoundScore }
export interface Grapple { mode: 'clinch' | 'takedown' | 'ground' | 'submission'; top: FighterId; position: GroundPosition; timer: number; progress: number; transition: { by: FighterId; direction: string; elapsed: number } | null }
export interface MatchResult { winner: FighterId | null; method: 'KO' | 'TKO' | 'Submission' | 'Entscheidung' | 'Unentschieden'; detail: string }
export type CombatEvent = { type: 'hit'; attacker: FighterId; target: FighterId; zone: Zone; strength: number; blocked: boolean; position: Vec2 } | { type: 'message'; text: string } | { type: 'bell' } | { type: 'end'; result: MatchResult };
export const EMPTY_CONTROLS = (): Controls => ({ move: { x: 0, z: 0 }, guard: null });
