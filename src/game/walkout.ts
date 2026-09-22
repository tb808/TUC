import type { FighterId, Vec2 } from './types';

export type WalkoutStage =
  | 'broadcast' | 'red-check' | 'red-walk' | 'red-inspection' | 'red-entry'
  | 'blue-check' | 'blue-walk' | 'blue-inspection' | 'blue-entry'
  | 'introductions' | 'instructions' | 'corners';

export interface WalkoutBeat {
  stage: WalkoutStage;
  start: number;
  end: number;
  kicker: string;
  title: string;
  detail: string;
  corner?: FighterId;
}

export interface WalkoutFighterPose { position: Vec2; heading: number; moving: boolean; visible: boolean }
export interface WalkoutPresentation {
  active: boolean;
  elapsed: number;
  duration: number;
  beat: WalkoutBeat;
  fighters: [WalkoutFighterPose, WalkoutFighterPose];
}

export const WALKOUT_BEATS: WalkoutBeat[] = [
  { stage: 'broadcast', start: 0, end: 2.5, kicker: 'TUC · LIVE', title: 'THE PROVING GROUND', detail: 'Drei Runden im Weltergewicht' },
  { stage: 'red-check', start: 2.5, end: 5, kicker: 'ROTE ECKE · BACKSTAGE', title: 'LETZTE FREIGABE', detail: 'Bandagen, Mundschutz und Corner-Equipment werden geprüft.', corner: 1 },
  { stage: 'red-walk', start: 5, end: 11.5, kicker: 'ROTE ECKE', title: 'ALEX VOLK', detail: 'Begleitet von seinem Team und einem Kommissionsoffiziellen.', corner: 1 },
  { stage: 'red-inspection', start: 11.5, end: 14.5, kicker: 'CAGESIDE CHECK', title: 'AUSRÜSTUNG · VASELINE', detail: 'Körperkontrolle, Tiefschutz, Mundschutz und Vaseline.', corner: 1 },
  { stage: 'red-entry', start: 14.5, end: 16.5, kicker: 'ROTE ECKE', title: 'IM OKTAGON', detail: 'Volk betritt den Käfig und bezieht seine Ecke.', corner: 1 },
  { stage: 'blue-check', start: 16.5, end: 19, kicker: 'BLAUE ECKE · BACKSTAGE', title: 'LETZTE FREIGABE', detail: 'Die Kommission gibt Tyler und sein Team frei.', corner: 0 },
  { stage: 'blue-walk', start: 19, end: 25.5, kicker: 'BLAUE ECKE', title: 'TYLER', detail: 'Walkout-Musik, Cornermen und Security führen zum Käfig.', corner: 0 },
  { stage: 'blue-inspection', start: 25.5, end: 28.5, kicker: 'CAGESIDE CHECK', title: 'AUSRÜSTUNG · VASELINE', detail: 'Letzter Check durch Cutman und Referee.', corner: 0 },
  { stage: 'blue-entry', start: 28.5, end: 30.5, kicker: 'BLAUE ECKE', title: 'IM OKTAGON', detail: 'Tyler betritt den Käfig und bezieht seine Ecke.', corner: 0 },
  { stage: 'introductions', start: 30.5, end: 35.5, kicker: 'OFFIZIELLE VORSTELLUNG', title: 'TYLER  VS  ALEX VOLK', detail: 'Der Ringsprecher stellt beide Kämpfer mit Ecke und Gewicht vor.' },
  { stage: 'instructions', start: 35.5, end: 38.5, kicker: 'CENTER OF THE CAGE', title: 'REFEREE-INSTRUKTIONEN', detail: 'Regeln beachten. Jederzeit schützen. Handschuhe berühren.' },
  { stage: 'corners', start: 38.5, end: 41, kicker: 'KÄFIGTÜR GESCHLOSSEN', title: 'BEREIT ZUM KAMPF', detail: 'Beide Kämpfer zurück in ihre Ecken.' },
];

export const WALKOUT_DURATION = WALKOUT_BEATS.at(-1)!.end;
const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * ease(t);
const pose = (x: number, z: number, heading: number, moving = false, visible = true): WalkoutFighterPose => ({ position: { x, z }, heading, moving, visible });

export function walkoutAt(elapsed: number): WalkoutPresentation {
  const time = Math.max(0, Math.min(WALKOUT_DURATION, elapsed));
  const beat = WALKOUT_BEATS.find(item => time >= item.start && time < item.end) ?? WALKOUT_BEATS.at(-1)!;
  const local = (time - beat.start) / Math.max(.001, beat.end - beat.start);
  let blue = pose(-6.8, -10.05, 0, false, false);
  let red = pose(6.8, -10.05, 0, false, false);

  if (time >= 2.5) red = pose(6.8, -9.4, 0, false, true);
  if (beat.stage === 'red-walk') red = pose(6.8, mix(-9.4, -.9, local), 0, true);
  if (time >= 11.5) red = pose(5.45, -.55, -Math.PI / 2);
  if (beat.stage === 'red-entry') red = pose(mix(5.45, 2.8, local), mix(-.55, 0, local), -Math.PI / 2, true);
  if (time >= 16.5) red = pose(2.8, 0, -Math.PI / 2);

  if (time >= 16.5) blue = pose(-6.8, -9.4, 0, false, true);
  if (beat.stage === 'blue-walk') blue = pose(-6.8, mix(-9.4, -.9, local), 0, true);
  if (time >= 25.5) blue = pose(-5.45, -.55, Math.PI / 2);
  if (beat.stage === 'blue-entry') blue = pose(mix(-5.45, -2.8, local), mix(-.55, 0, local), Math.PI / 2, true);
  if (time >= 30.5) blue = pose(-2.8, 0, Math.PI / 2);

  if (beat.stage === 'introductions') {
    red = pose(2.55, 0, -Math.PI / 2); blue = pose(-2.55, 0, Math.PI / 2);
  }
  if (beat.stage === 'instructions') {
    red = pose(mix(2.55, .72, local), 0, -Math.PI / 2, true);
    blue = pose(mix(-2.55, -.72, local), 0, Math.PI / 2, true);
  }
  if (beat.stage === 'corners') {
    red = pose(mix(.72, 1.5, local), 0, -Math.PI / 2, true);
    blue = pose(mix(-.72, -1.5, local), 0, Math.PI / 2, true);
  }
  return { active: time < WALKOUT_DURATION, elapsed: time, duration: WALKOUT_DURATION, beat, fighters: [blue, red] };
}
