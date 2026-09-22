export type FighterId = 0 | 1;
export type Vec2 = { x: number; z: number };
export type Zone = 'head' | 'body' | 'leg';
export type AnatomicalTarget = 'chin' | 'temple' | 'liver' | 'ribs' | 'solarPlexus' | 'thigh';
export type Stance = 'orthodox' | 'southpaw';
export type DefenseMove = 'parry' | 'check' | 'slipLeft' | 'slipRight' | 'pull' | null;
export type CombatState = 'idle' | 'moving' | 'guarding' | 'attacking' | 'stunned' | 'knockedDown' | 'clinch' | 'takedown' | 'ground' | 'submission' | 'finished';
export type GroundPosition = 'guard' | 'halfGuard' | 'sideControl' | 'mount';
export type GroundDirection = 'advance' | 'reverse' | 'left' | 'right';
export interface FighterStats { maxStamina: number; power: number; speed: number; resilience: number; grappling: number }
export interface DamageState { head: number; body: number; leg: number; balance: number; stamina: number }
export type TechniqueKind = 'punch' | 'hook' | 'uppercut' | 'elbow' | 'kick' | 'frontKick' | 'sideKick' | 'knee' | 'groundPunch' | 'clinchPunch';
export interface Technique { id: string; label: string; kind: TechniqueKind; hand: number; zone: Zone; target: AnatomicalTarget; windup: number; active: number; recovery: number; reach: number; radius: number; damage: number; cost: number; impulse: number; comboAt: number }
export interface Attack { technique: Technique; elapsed: number; hit: boolean; previousTip: Vec2 | null }
export interface Fighter { id: FighterId; name: string; position: Vec2; velocity: Vec2; heading: number; stance: Stance; stanceSwitch: number; state: CombatState; stats: FighterStats; damage: DamageState; attack: Attack | null; guard: 'high' | 'low' | null; defense: DefenseMove; defenseTime: number; counterWindow: number; stun: number; cooldown: number; knockdowns: number; knockdownTime: number; reaction: number; reactionSide: number; reactionZone: Zone; reactionKind: TechniqueKind; cut: number; swelling: number; unanswered: number; lastHit: number }
export interface Controls { move: Vec2; guard: 'high' | 'low' | null; action?: string; direction?: GroundDirection }
export interface DifficultyProfile { level: number; name: string; subtitle: string; reaction: number; accuracy: number; combo: number; spacing: number; reserve: number; grappling: number; aggression: number }
export interface MatchRules { rounds: number; roundSeconds: number; breakSeconds: number; cageApothem: number }
export interface RoundScore { damage: [number, number]; grappling: [number, number]; control: [number, number]; knockdowns: [number, number] }
export interface Scorecard { round: number; points: [number, number]; scores: RoundScore }
export interface GroundTransition { by: FighterId; direction: GroundDirection; elapsed: number; duration?: number; from?: GroundPosition; to?: GroundPosition; targetSide?: -1 | 1; flips?: boolean; resolved?: boolean; defended?: boolean }
export interface Grapple { mode: 'clinch' | 'takedown' | 'ground' | 'submission'; top: FighterId; position: GroundPosition; timer: number; progress: number; side?: -1 | 1; transition: GroundTransition | null }
export interface MatchResult { winner: FighterId | null; method: 'KO' | 'TKO' | 'Submission' | 'Entscheidung' | 'Unentschieden'; detail: string }
export type CombatEvent = { type: 'hit'; attacker: FighterId; target: FighterId; technique: string; zone: Zone; strength: number; blocked: boolean; defense?: 'guard' | 'parry' | 'check' | 'catch'; position: Vec2 } | { type: 'message'; text: string } | { type: 'bell' } | { type: 'end'; result: MatchResult };
export const EMPTY_CONTROLS = (): Controls => ({ move: { x: 0, z: 0 }, guard: null });
