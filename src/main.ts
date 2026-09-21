import './style.css';
import { Combat } from './game/combat';
import { DIFFICULTIES, POSITION_LABELS } from './game/config';
import { OpponentAI, seededRandom } from './game/ai';
import { Keyboard } from './game/input';
import { FightAudio } from './game/audio';
import { ArenaView } from './render/scene';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="arena" class="menu-view"></div><div class="vignette"></div>
  <header class="topbar"><a class="brand" href="./" aria-label="TUC Startseite">TUC<span>TYLER’S ULTIMATE<br>CHAMPIONSHIP</span></a><div class="build"><span class="live-dot"></span> THE PROVING GROUND <b>01 / PROTOTYP</b></div><button id="help-button" class="icon-button" aria-label="Steuerung anzeigen">?</button></header>
  <main id="menu" class="menu">
    <div class="eyebrow"><span></span> DEIN PLATZ IST IM OKTAGON.</div>
    <h1>MAKE<br><span>AN <em>IMPACT.</em></span></h1>
    <p class="intro">Jeder Treffer zählt. Finde deine Distanz.<br>Kontrolliere den Kampf.</p>
    <div class="mode-line"><span>01</span><strong>TESTKAMPF</strong><small>3 RUNDEN · 3 MINUTEN</small></div>
    <div class="difficulty-heading"><label for="difficulty">DEIN GEGNER</label><span id="difficulty-number">STUFE 03 / 05</span></div>
    <div class="difficulty-row"><button id="difficulty-down" aria-label="Schwierigkeit verringern">−</button><div><strong id="difficulty-name">Profi</strong><p id="difficulty-description">Lücken bleiben selten unbestraft.</p></div><button id="difficulty-up" aria-label="Schwierigkeit erhöhen">+</button></div>
    <select id="difficulty" aria-label="Schwierigkeitsstufe">${DIFFICULTIES.map(p => `<option value="${p.level}" ${p.level === 3 ? 'selected' : ''}>${p.level} · ${p.name}</option>`).join('')}</select>
    <div class="difficulty-ticks" aria-hidden="true">${[1,2,3,4,5].map(n => `<i data-level="${n}"></i>`).join('')}</div>
    <button id="start" class="primary" disabled><span id="start-label">OKTAGON WIRD VORBEREITET</span><span>↗</span></button>
    <div class="menu-meta"><span>⌨ NUR TASTATUR</span><button id="controls-link">Steuerung ansehen <span>→</span></button></div>
    <div id="load-error" role="alert" hidden></div>
  </main>
  <div id="arena-caption"><span class="caption-line"></span><div><strong>THE PROVING GROUND</strong><p>Ein Oktagon. Keine Ausreden.</p></div><span class="arena-code">TUC—001<br>TRAINING FACILITY</span></div>
  <section id="hud" hidden aria-label="Kampfstatus">
    <div class="fighter-hud blue"><div><small>BLAUE ECKE</small><strong>TYLER</strong></div><div class="stamina-track"><i id="player-stamina"></i></div><span id="player-state">BEREIT</span></div>
    <div class="round-hud"><span id="round">RUNDE 1 / 3</span><strong id="timer">3:00</strong><small id="fight-level">PROFI</small></div>
    <div class="fighter-hud red"><div><small>ROTE ECKE</small><strong>ALEX VOLK</strong></div><div class="stamina-track"><i id="opponent-stamina"></i></div><span id="opponent-state">BEREIT</span></div>
  </section>
  <div id="fight-message" role="status" aria-live="polite"></div>
  <div id="ground-context" hidden><span id="position-label"></span><div id="submission-track" hidden><i></i></div><small id="position-help"></small></div>
  <div id="fight-controls" hidden><span><kbd>W A S D</kbd> BEWEGEN</span><span><kbd>J K</kbd> SCHLAGEN</span><span><kbd>U I</kbd> TRETEN</span><span><kbd>SPACE</kbd> DECKEN</span><span><kbd>G</kbd> GRAPPLING</span><button id="pause-button"><kbd>ESC</kbd> PAUSE</button></div>
  <footer id="footer"><span>TYLER’S ULTIMATE CHAMPIONSHIP <b>© 2026</b></span><div><button id="sound-toggle" aria-label="Ton umschalten">TON AN</button><span> / </span><label>GRAFIK <select id="quality" aria-label="Grafikqualität"><option value="high">HOCH</option><option value="low">NIEDRIG</option></select></label></div><span>IN DEVELOPMENT <i>●</i></span></footer>
  <div id="modal" class="modal" hidden><section id="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"></section></div>
  <pre id="debug" hidden></pre>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let game = new Combat(), ai = new OpponentAI(3), view: ArenaView, level = 3, active = false, modalType = '', returnFocus: HTMLElement | null = null;
let messageTime = 0, last = performance.now(), accumulator = 0, hitStop = 0, renderTime = 0, breathTime = 0;
const audio = new FightAudio();
const controlsHTML = `<div class="control-grid"><div><kbd>W A S D</kbd><strong>Bewegen</strong><span>W / S in die Tiefe, A / D seitlich</span></div><div><kbd>J / K</kbd><strong>Jab / Cross</strong><span>Shift: Haken · Strg: Körper</span></div><div><kbd>U / I</kbd><strong>Low-Kicks</strong><span>Strg: Body-Kick · Shift: High-Kick</span></div><div><kbd>LEERTASTE</kbd><strong>Hohe Deckung</strong><span>Strg: tief / Sprawl · A / D: Ausweichen</span></div><div><kbd>G</kbd><strong>Clinch / Übergang</strong><span>Shift + G: Takedown · R: lösen / aufstehen</span></div><div><kbd>W A S D + G</kbd><strong>Bodenposition wechseln</strong><span>Oben: vorarbeiten · Unten: befreien</span></div><div><kbd>J / K · U</kbd><strong>Ground & Pound / Armbar</strong><span>Armbar aus Mount · G halten zum Angriff</span></div><div><kbd>LEERTASTE · ESC</kbd><strong>Verteidigen / Pause</strong><span>Am Boden: Übergang / Armbar abwehren</span></div></div><p class="help-note">Achte auf deine Ausdauer: Leere Schläge kosten Kraft, saubere Treffer brauchen die richtige Distanz. Bei einer Armbar G halten; der Verteidiger hält die Leertaste. F3 öffnet die Diagnoseansicht.</p>`;
function openModal(title: string, body: string, type: string) {
  returnFocus = document.activeElement as HTMLElement; modalType = type; keyboard.clear();
  el('modal-card').innerHTML = `<div class="eyebrow">TYLER’S ULTIMATE CHAMPIONSHIP</div><h2 id="modal-title">${title}</h2>${body}`;
  el('modal').hidden = false; el('modal-card').querySelector<HTMLButtonElement>('button')?.focus();
}
function closeModal() { el('modal').hidden = true; modalType = ''; keyboard.clear(); returnFocus?.focus(); returnFocus?.blur(); }
function showHelp() { if (active && game.phase !== 'finished') game.paused = true; openModal('DEIN MOVE.', controlsHTML + '<button class="primary" id="close-help">VERSTANDEN <span>→</span></button>', 'help'); el('close-help').onclick = () => { closeModal(); if (active) game.paused = false; }; }
function togglePause() {
  if (!active || game.phase === 'finished') { if (modalType === 'help') closeModal(); return; }
  if (game.paused) { game.paused = false; closeModal(); return; }
  game.paused = true;
  openModal('DURCHATMEN.', '<p class="modal-description">Dein Kampf ist pausiert.</p><button class="primary" id="resume">WEITERKÄMPFEN <span>→</span></button><div class="modal-actions"><button id="restart">Neu starten</button><button id="pause-help">Steuerung</button><button id="to-menu">Hauptmenü</button></div>', 'pause');
  el('resume').onclick = togglePause; el('restart').onclick = start; el('pause-help').onclick = showHelp; el('to-menu').onclick = toMenu;
}
const keyboard = new Keyboard(togglePause, () => { if (view) { view.debug = !view.debug; el('debug').hidden = !view.debug; } });
function setLevel(value: number) { level = Math.max(1, Math.min(5, value)); const p = DIFFICULTIES[level - 1]; el<HTMLSelectElement>('difficulty').value = String(level); el('difficulty-number').textContent = `STUFE 0${level} / 05`; el('difficulty-name').textContent = p.name; el('difficulty-description').textContent = p.subtitle; document.querySelectorAll<HTMLElement>('[data-level]').forEach(e => e.classList.toggle('lit', Number(e.dataset.level) <= level)); el<HTMLButtonElement>('difficulty-down').disabled = level === 1; el<HTMLButtonElement>('difficulty-up').disabled = level === 5; }
function start() {
  void audio.start().catch(() => { el('sound-toggle').textContent = 'TON NICHT VERFÜGBAR'; });
  game = new Combat(); ai = new OpponentAI(level); active = true; closeModal(); keyboard.clear();
  el('menu').hidden = true; el('arena-caption').hidden = true; el('hud').hidden = false; el('fight-controls').hidden = false; el('footer').hidden = true; el('arena').classList.remove('menu-view'); app.classList.add('in-fight');
  el('fight-level').textContent = DIFFICULTIES[level - 1].name.toUpperCase(); accumulator = 0; hitStop = 0; game.start(); view.renderer.domElement.focus({ preventScroll: true });
}
function toMenu() { active = false; game = new Combat(); keyboard.clear(); closeModal(); el('menu').hidden = false; el('arena-caption').hidden = false; el('hud').hidden = true; el('fight-controls').hidden = true; el('footer').hidden = false; el('ground-context').hidden = true; el('fight-message').textContent = ''; el('arena').classList.add('menu-view'); app.classList.remove('in-fight'); }
el('start').onclick = start; el('help-button').onclick = showHelp; el('controls-link').onclick = showHelp; el('pause-button').onclick = togglePause;
el('difficulty-down').onclick = () => setLevel(level - 1); el('difficulty-up').onclick = () => setLevel(level + 1); el('difficulty').onchange = () => setLevel(Number(el<HTMLSelectElement>('difficulty').value));
el('sound-toggle').onclick = () => { audio.setMuted(!audio.muted); el('sound-toggle').textContent = audio.muted ? 'TON AUS' : 'TON AN'; };
el('quality').onchange = () => view?.setQuality(el<HTMLSelectElement>('quality').value);
window.addEventListener('blur', () => { if (active && !game.paused && game.phase !== 'finished') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !game.paused && game.phase !== 'finished') togglePause(); });
el('modal').addEventListener('keydown', e => { if (e.key === 'Tab') { const buttons = Array.from(el('modal-card').querySelectorAll<HTMLElement>('button,select,a')); const first = buttons[0], last = buttons.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } if (e.key === 'Escape') { e.stopPropagation(); if (modalType === 'help') { closeModal(); game.paused = false; } else if (modalType === 'pause') togglePause(); } });
function updateHUD() {
  el('timer').textContent = game.phase === 'break' ? `0:${Math.ceil(game.breakRemaining).toString().padStart(2, '0')}` : `${Math.floor(Math.ceil(game.remaining) / 60)}:${(Math.ceil(game.remaining) % 60).toString().padStart(2, '0')}`;
  el('round').textContent = game.phase === 'break' ? 'RUNDENPAUSE' : `RUNDE ${game.round} / ${game.rules.rounds}`;
  game.fighters.forEach((f, i) => { el(i ? 'opponent-stamina' : 'player-stamina').style.transform = `scaleX(${f.damage.stamina / 100})`; el(i ? 'opponent-state' : 'player-state').textContent = f.state === 'knockedDown' ? 'NIEDERSCHLAG' : f.stun > 0 ? 'ERSCHÜTTERT' : f.damage.stamina < 25 ? 'ERSCHÖPFT' : f.damage.leg > 50 ? 'BEIN ANGESCHLAGEN' : 'AUSDAUER'; });
  const g = game.grapple; el('ground-context').hidden = !g || game.phase === 'finished';
  if (g) { el('position-label').textContent = g.mode === 'clinch' ? 'CLINCH' : g.mode === 'takedown' ? 'TAKEDOWN' : `${POSITION_LABELS[g.position].toUpperCase()} · ${g.top === 0 ? 'DU BIST OBEN' : 'DU BIST UNTEN'}`; el('position-help').textContent = g.mode === 'submission' ? g.top === 0 ? 'ARMBAR · G HALTEN' : 'ARMBAR · LEERTASTE HALTEN ZUM BEFREIEN' : g.transition ? 'POSITIONSWECHSEL …' : 'WASD + G ÜBERGANG  /  SPACE VERTEIDIGEN  /  R AUFSTEHEN'; el('submission-track').hidden = g.mode !== 'submission'; el('submission-track').querySelector<HTMLElement>('i')!.style.width = `${g.progress * 100}%`; }
  if (view.debug) el('debug').textContent = `${Math.round(view.fps)} FPS | ${view.renderer.info.render.calls} draws | ${(view.renderer.info.render.triangles / 1000).toFixed(1)}k triangles\nKI ${level}: ${ai.decision}\n${game.fighters.map(f => `${f.name}: ${f.state}\n Kopf ${f.damage.head.toFixed(1)} | Körper ${f.damage.body.toFixed(1)} | Bein ${f.damage.leg.toFixed(1)}\n Balance ${f.damage.balance.toFixed(1)} | Ausdauer ${f.damage.stamina.toFixed(1)}`).join('\n')}\n${game.grapple ? JSON.stringify(game.grapple) : 'Standkampf'}`;
}
function events() {
  for (const e of game.drainEvents()) {
    if (e.type === 'hit') { view.impact(e); audio.hit(e.strength, e.blocked); if (!e.blocked && e.strength > 6) hitStop = Math.min(.055, e.strength * .003); }
    if (e.type === 'bell') audio.bell();
    if (e.type === 'message') { el('fight-message').textContent = e.text; messageTime = 2.1; }
    if (e.type === 'end') {
      const r = e.result; const winner = r.winner === null ? 'UNENTSCHIEDEN.' : r.winner === 0 ? 'DEIN SIEG.' : 'ZURÜCK INS TRAINING.';
      openModal(winner, `<div class="result-method">${r.method.toUpperCase()}</div><p class="modal-description">${r.winner === null ? '' : game.fighters[r.winner].name + ' gewinnt. '}${r.detail}</p><div class="result-stats"><div><small>RUNDE</small><strong>${game.round}</strong></div><div><small>DEIN WIRKSAMER SCHADEN</small><strong>${Math.round(game.score.damage[0] + game.cards.reduce((n,c) => n + c.scores.damage[0], 0))}</strong></div><div><small>NIEDERSCHLÄGE</small><strong>${game.fighters[1].knockdowns}</strong></div></div><button class="primary" id="rematch">REVANCHE <span>↗</span></button><button class="text-button" id="result-menu">Zurück zum Hauptmenü</button>`, 'result');
      el('rematch').onclick = start; el('result-menu').onclick = toMenu;
    }
  }
}
function frame(now: number) {
  const frameDt = Math.max(0, (now - last) / 1000), dt = Math.min(.25, frameDt); last = now;
  if (!game.paused) {
    if (hitStop > 0) hitStop -= dt;
    else {
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        if (active) { game.command(0, keyboard.read(game)); game.command(1, ai.update(game)); game.step(1 / 60); }
        view.physics.step(game); accumulator -= 1 / 60;
      }
    }
    messageTime -= dt; if (messageTime <= 0) el('fight-message').textContent = '';
    breathTime += dt; if (breathTime > 2.2 && active) { breathTime = 0; audio.breath(1 - game.fighters[0].damage.stamina / 100); }
  }
  events(); view.draw(game, dt, !active, game.paused || hitStop > 0, frameDt);
  renderTime += dt; if (renderTime > .08) { updateHUD(); renderTime = 0; }
  requestAnimationFrame(frame);
}
async function init() {
  setLevel(3);
  try { view = new ArenaView(el('arena')); await view.init(); el<HTMLButtonElement>('start').disabled = false; el('start-label').textContent = 'BETRITT DAS OKTAGON'; requestAnimationFrame(frame); }
  catch (error) { el('load-error').hidden = false; el('load-error').textContent = `Die 3D-Ansicht konnte nicht starten. Bitte WebGL in Chrome oder Edge aktivieren und neu laden. ${error instanceof Error ? error.message : ''}`; el('start-label').textContent = '3D-START FEHLGESCHLAGEN'; console.error(error); }
}
// Development-only observability for automated real-browser integration tests.
if (import.meta.env.DEV) Object.defineProperty(window, '__TUC__', { value: { get match() { return game; }, get view() { return view; }, get ai() { return ai; }, simulate(seconds: number, bothAI = false) { const playerAI = new OpponentAI(5, seededRandom(441), 0); for (let i = 0; i < seconds * 60 && game.phase !== 'finished'; i++) { if (bothAI) game.command(0, playerAI.update(game)); game.command(1, ai.update(game)); game.step(1 / 60); } }, } });
void init();
