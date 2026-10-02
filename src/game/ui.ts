import type { Combat } from './combat';
import type { CombatEvent } from './types';

const silhouette = `<svg class="body-map" viewBox="0 0 56 126" aria-label="Körperzustand"><circle data-region="head" cx="28" cy="12" r="9"/><path data-region="body" d="M21 25L35 25L41 39L37 66L19 66L15 39Z"/><path data-region="leftLeg" d="M19 69L27 69L25 96L22 120L15 120L17 94Z"/><path data-region="rightLeg" d="M29 69L37 69L39 94L41 120L34 120L31 96Z"/><path class="body-outline" d="M18 27L10 35L5 61L3 77L8 79L14 58L17 44M38 27L46 35L51 61L53 77L48 79L42 58L39 44"/></svg>`;
const corner = (id: string, red: boolean) => `<div class="fighter-hud ${red ? 'red' : 'blue'}" data-corner="${id}">
  ${silhouette}<div class="fighter-heading"><small ${red ? 'id="opponent-corner"' : ''}>${red ? 'ROTE' : 'BLAUE'} ECKE</small><strong id="${id}-name">${red ? 'ALEX VOLK' : 'TYLER'}</strong></div>
  <div class="health-track" aria-label="Kopfzustand"><i class="damage-trail"></i><i class="health-fill"></i></div>
  <div class="stamina-track" aria-label="Ausdauer"><i id="${id}-stamina"></i></div>
  <div class="damage-readout">${['head', 'body', 'leg'].map((zone, i) => `<div><small>${['HEAD', 'BODY', 'LEGS'][i]}</small><span><i data-damage="${zone}"></i></span></div>`).join('')}</div>
  <span id="${id}-state">BEREIT</span>
</div>`;
export const broadcastHUD = `${corner('player', false)}<div class="round-hud"><b>TUC</b><strong id="timer">3:00</strong><span id="round">RUNDE 1 / 3</span><small id="fight-level">PROFI</small></div>${corner('opponent', true)}`;
export const groundActions = `<aside id="ground-actions" hidden><small>GROUND & POUND</small><strong id="ground-role"></strong><div id="ground-action-list"></div></aside><div id="hit-feedback" aria-hidden="true"></div>`;

/** Cached DOM references. Health has an immediate layer and a delayed loss trail. */
export class FightUI {
  private corners = ['player', 'opponent'].map(id => {
    const root = document.querySelector<HTMLElement>(`[data-corner="${id}"]`)!;
    return { root, health: root.querySelector<HTMLElement>('.health-fill')!, trail: root.querySelector<HTMLElement>('.damage-trail')!, regions: Array.from(root.querySelectorAll<SVGElement>('[data-region]')), bars: Array.from(root.querySelectorAll<HTMLElement>('[data-damage]')) };
  });
  private health = [1, 1]; private trail = [1, 1]; private lossDelay = [0, 0];
  private feedback = document.getElementById('hit-feedback')!;
  private actions = document.getElementById('ground-actions')!;
  private role = document.getElementById('ground-role')!;
  private actionList = document.getElementById('ground-action-list')!;
  private feedbackTime = 0; private combo = 0; private lastHit = -99; private lastRole = '';
  reset() { this.health.fill(1); this.trail.fill(1); this.lossDelay.fill(0); this.feedbackTime = 0; this.combo = 0; this.lastHit = -99; this.feedback.textContent = ''; }
  hit(event: Extract<CombatEvent, { type: 'hit' }>, time: number) {
    if (event.blocked || event.attacker !== 0) return;
    this.combo = time - this.lastHit < 1.5 ? this.combo + 1 : 1; this.lastHit = time;
    this.feedback.textContent = `${event.counter ? 'COUNTER' : event.zone === 'body' ? 'BODY SHOT' : event.strength >= 9 ? 'CLEAN HIT' : ''}${this.combo >= 2 ? ` · ${this.combo} HIT COMBO` : ''}`;
    this.feedbackTime = 1.3;
  }
  update(match: Combat, dt: number, active: boolean) {
    this.feedbackTime = Math.max(0, this.feedbackTime - dt); this.feedback.style.opacity = active && this.feedbackTime > 0 ? '1' : '0';
    this.corners.forEach((nodes, id) => {
      const f = match.fighters[id], remaining = Math.max(0, 1 - f.damage.head / 100);
      if (remaining < this.health[id] - .001) this.lossDelay[id] = .45;
      this.health[id] += (remaining - this.health[id]) * (1 - Math.exp(-dt * 16));
      this.lossDelay[id] -= dt;
      if (this.lossDelay[id] <= 0) this.trail[id] += (remaining - this.trail[id]) * (1 - Math.exp(-dt * 3));
      nodes.health.style.transform = `scaleX(${this.health[id]})`; nodes.trail.style.transform = `scaleX(${this.trail[id]})`;
      nodes.root.dataset.hurt = f.hurt;
      nodes.bars.forEach(bar => { const damage = f.damage[bar.dataset.damage as 'head' | 'body' | 'leg']; bar.style.transform = `scaleX(${Math.max(0, 1 - damage / 100)})`; bar.dataset.critical = String(damage >= 65); });
      nodes.regions.forEach(region => { const value = f.damage[region.dataset.region as 'head' | 'body' | 'leftLeg' | 'rightLeg']; region.style.fill = value < 15 ? '#81868a' : value < 45 ? '#a58b72' : value < 70 ? '#a46750' : '#c14b4c'; region.style.fillOpacity = String(.25 + Math.min(1, value / 100) * .65); });
    });
    const g = match.grapple, visible = active && g?.mode === 'ground' && match.phase !== 'finished'; this.actions.hidden = !visible;
    if (visible && g) {
      const key = `${g.top === 0 ? 'top' : 'bottom'}-${g.position === 'mount' || g.position === 'backControl'}`;
      if (key !== this.lastRole) {
        this.lastRole = key; this.role.textContent = g.top === 0 ? 'TOP CONTROL' : 'DEFENSE OPTIONS';
        this.actionList.innerHTML = g.top === 0 ? `<div><kbd>J / K</kbd> SHORT STRIKE</div><div><kbd>⇧ J / K</kbd> HOOK</div><div><kbd>⌃ J / K</kbd> BODY SHOT</div><div><kbd>⌥ ⇧ J / K</kbd> HAMMERFIST</div><div><kbd>Q</kbd> POSTURE UP / DOWN</div>${['mount', 'backControl'].includes(g.position) ? '<div><kbd>U</kbd> SUBMISSION</div>' : ''}` : '<div><kbd>SPACE</kbd> HIGH BLOCK / DENY</div><div><kbd>⌃ SPACE</kbd> BODY BLOCK</div><div><kbd>W A S D</kbd> BRIDGE / ESCAPE</div><div><kbd>R</kbd> STAND WHEN FREE</div>';
      }
    }
  }
}
