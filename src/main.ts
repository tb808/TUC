import './style.css';
import { Combat, groundMoveOptions } from './game/combat';
import { DIFFICULTIES, POSITION_LABELS } from './game/config';
import { OpponentAI, seededRandom } from './game/ai';
import { Keyboard } from './game/input';
import { FightAudio } from './game/audio';
import { ArenaView } from './render/scene';
import { ARENAS } from './render/arenaDetails';
import { EMPTY_CONTROLS, type Controls } from './game/types';
import { TRAINING_LESSONS, TrainingCoach } from './game/training';
import { walkoutAt, WALKOUT_DURATION, type WalkoutStage } from './game/walkout';
import { FIGHTERS, fighterProfile, randomOpponent, type FighterProfile } from './game/fighters';

const portrait = (profile: FighterProfile) => `<span class="fighter-portrait" style="--portrait-skin:${profile.visual.skin};--portrait-shorts:${profile.visual.shorts};--portrait-hair:${profile.visual.hair};--portrait-accent:${profile.visual.accent}"><i></i></span>`;
const fighterOptions = (corner: 'player' | 'opponent') => FIGHTERS.map(profile => `<button type="button" data-${corner}-fighter="${profile.id}" aria-pressed="false">${portrait(profile)}<strong>${profile.name}</strong><small>${profile.specialty}</small></button>`).join('');

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="arena" class="menu-view"></div><div class="vignette"></div>
  <header class="topbar"><a class="brand" href="./" aria-label="TUC Startseite">TUC<span>TYLER’S ULTIMATE<br>CHAMPIONSHIP</span></a><div class="build"><span class="live-dot"></span> THE PROVING GROUND <b>01 / PROTOTYP</b></div><button id="help-button" class="icon-button" aria-label="Steuerung anzeigen">?</button></header>
  <main id="menu" class="menu">
    <div class="eyebrow"><span></span> DEIN PLATZ IST IM OKTAGON.</div>
    <h1>MAKE<br><span>AN <em>IMPACT.</em></span></h1>
    <p class="intro">Jeder Treffer zählt. Finde deine Distanz.<br>Kontrolliere den Kampf.</p>
    <div class="first-step"><b>EMPFOHLENER ERSTER SCHRITT</b><span>Lerne zuerst die Grundlagen im Training.</span></div>
    <div class="mode-switch" role="group" aria-label="Spielmodus"><button id="mode-training" class="selected" aria-pressed="true"><small>EMPFOHLEN</small>TRAINING</button><button id="mode-fight" aria-pressed="false"><small>3 × 3 MIN</small>TESTKAMPF</button></div>
    <div class="mode-line"><span id="mode-number">01</span><strong id="mode-name">TRAININGSMODUS</strong><small id="mode-detail">OHNE GEGENWEHR</small></div>
    <section class="roster-select" aria-labelledby="player-select-label"><div class="roster-heading"><span id="player-select-label">DEIN KÄMPFER</span><span>BLAUE ECKE</span></div><div class="fighter-options">${fighterOptions('player')}</div><div id="player-profile" class="fighter-profile"></div></section>
    <section id="training-panel" class="training-select" aria-labelledby="training-select-label">
      <div class="training-heading"><span id="training-select-label">WAS WILLST DU LERNEN?</span><span id="lesson-number">01 / ${TRAINING_LESSONS.length.toString().padStart(2, '0')}</span></div>
      <div class="lesson-grid">${TRAINING_LESSONS.map((lesson, index) => `<button data-lesson="${lesson.id}" ${index === 0 ? 'class="selected" aria-pressed="true"' : 'aria-pressed="false"'}><strong>${lesson.name}</strong><span>${lesson.subtitle}</span></button>`).join('')}</div>
    </section>
    <div id="fight-settings" hidden>
    <section class="roster-select opponent-select" aria-labelledby="opponent-select-label"><div class="roster-heading"><span id="opponent-select-label">DEIN GEGNER</span><span>ROTE ECKE</span></div><div class="fighter-options">${fighterOptions('opponent')}<button type="button" id="opponent-random" aria-pressed="false"><span class="random-icon">?</span><strong>ZUFALL</strong><small>NEUE PAARUNG</small></button></div><div id="opponent-profile" class="fighter-profile"></div></section>
    <section class="arena-select" aria-labelledby="arena-select-label">
      <div class="arena-heading"><span id="arena-select-label">DEINE ARENA</span><span id="arena-number">01 / 05</span></div>
      <div class="arena-picker"><button id="arena-down" aria-label="Vorherige Arena">←</button><div><strong id="arena-name">${ARENAS[0].name}</strong><p id="arena-description">${ARENAS[0].subtitle}</p></div><button id="arena-up" aria-label="Nächste Arena">→</button></div>
      <div class="arena-dots" aria-label="Arena direkt auswählen">${ARENAS.map((arena, index) => `<button data-arena="${index}" aria-label="${arena.name}" ${index === 0 ? 'class="selected" aria-current="true"' : ''}></button>`).join('')}</div>
    </section>
    <div class="difficulty-heading"><label for="difficulty">KI-SCHWIERIGKEIT</label><span id="difficulty-number">STUFE 03 / 05</span></div>
    <div class="difficulty-row"><button id="difficulty-down" aria-label="Schwierigkeit verringern">−</button><div><strong id="difficulty-name">Profi</strong><p id="difficulty-description">Lücken bleiben selten unbestraft.</p></div><button id="difficulty-up" aria-label="Schwierigkeit erhöhen">+</button></div>
    <select id="difficulty" aria-label="Schwierigkeitsstufe">${DIFFICULTIES.map(p => `<option value="${p.level}" ${p.level === 3 ? 'selected' : ''}>${p.level} · ${p.name}</option>`).join('')}</select>
    <div class="difficulty-ticks" aria-hidden="true">${[1,2,3,4,5].map(n => `<i data-level="${n}"></i>`).join('')}</div>
    </div>
    <button id="start" class="primary" disabled><span id="start-label">OKTAGON WIRD VORBEREITET</span><span>↗</span></button>
    <div class="menu-meta"><span>⌨ NUR TASTATUR</span><button id="controls-link">Steuerung ansehen <span>→</span></button></div>
    <div id="load-error" role="alert" hidden></div>
  </main>
  <div id="arena-caption"><span class="caption-line"></span><div><strong>THE PROVING GROUND</strong><p>Ein Oktagon. Keine Ausreden.</p></div><span class="arena-code">TUC—001<br>TRAINING FACILITY</span></div>
  <section id="hud" hidden aria-label="Kampfstatus">
    <div class="fighter-hud blue"><div><small>BLAUE ECKE</small><strong id="player-name">TYLER</strong></div><div class="stamina-track"><i id="player-stamina"></i></div><span id="player-state">BEREIT</span></div>
    <div class="round-hud"><span id="round">RUNDE 1 / 3</span><strong id="timer">3:00</strong><small id="fight-level">PROFI</small></div>
    <div class="fighter-hud red"><div><small id="opponent-corner">ROTE ECKE</small><strong id="opponent-name">ALEX VOLK</strong></div><div class="stamina-track"><i id="opponent-stamina"></i></div><span id="opponent-state">BEREIT</span></div>
  </section>
  <section id="walkout" hidden aria-live="polite">
    <div class="walkout-live"><i></i> LIVE · FIGHT NIGHT</div>
    <div class="walkout-card"><small id="walkout-kicker"></small><strong id="walkout-title"></strong><p id="walkout-detail"></p><div class="walkout-progress"><i id="walkout-progress-fill"></i></div></div>
    <button id="skip-walkout">WALKOUT ÜBERSPRINGEN <span>→</span></button>
  </section>
  <div id="fight-message" role="status" aria-live="polite"></div>
  <aside id="training-coach" hidden aria-live="polite"><div class="coach-heading"><span>COACH</span><small id="coach-progress"></small></div><strong id="coach-title"></strong><p id="coach-instruction"></p><kbd id="coach-keys"></kbd><div class="coach-track"><i id="coach-track-fill"></i></div><button id="leave-training">TRAINING BEENDEN</button></aside>
  <div id="ground-context" hidden><span id="position-label"></span><div id="ground-compass" hidden><div class="ground-option up" data-ground-direction="advance"><kbd>W</kbd><span></span></div><div class="ground-option left" data-ground-direction="left"><kbd>A</kbd><span></span></div><div class="ground-center">POSITION</div><div class="ground-option right" data-ground-direction="right"><kbd>D</kbd><span></span></div><div class="ground-option down" data-ground-direction="reverse"><kbd>S</kbd><span></span></div></div><div id="submission-track" hidden><i></i></div><small id="position-help"></small></div>
  <div id="fight-controls" hidden><span><kbd>W A S D</kbd> BEWEGEN / SLIP</span><span><kbd>J K</kbd> HÄNDE</span><span><kbd>U I</kbd> BEINE</span><span><kbd>Q</kbd> AUSLAGE</span><span><kbd>SPACE</kbd> DECKUNG / PARADE</span><span><kbd>G / ⇧G</kbd> GRAPPLING</span><button id="pause-button"><kbd>ESC</kbd> PAUSE</button></div>
  <footer id="footer"><span>TYLER’S ULTIMATE CHAMPIONSHIP <b>© 2026</b></span><div><button id="sound-toggle" aria-label="Ton umschalten">TON AN</button><span> / </span><label>GRAFIK <select id="quality" aria-label="Grafikqualität"><option value="high">HOCH</option><option value="low">NIEDRIG</option></select></label></div><span>IN DEVELOPMENT <i>●</i></span></footer>
  <div id="modal" class="modal" hidden><section id="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"></section></div>
  <pre id="debug" hidden></pre>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type GameMode = 'training' | 'fight';
let game = new Combat(), ai = new OpponentAI(3), view: ArenaView, level = 3, arenaIndex = 0, active = false, modalType = '', returnFocus: HTMLElement | null = null;
let playerProfile = FIGHTERS[0], opponentChoice = FIGHTERS[1].id, activeOpponent = FIGHTERS[1];
let mode: GameMode = 'training', lessonId = TRAINING_LESSONS[0].id, coach: TrainingCoach | null = null, playerInput: Controls = EMPTY_CONTROLS();
let messageTime = 0, last = performance.now(), accumulator = 0, hitStop = 0, renderTime = 0, breathTime = 0;
let walkoutElapsed: number | null = null, walkoutStage: WalkoutStage | null = null;
let observedAction: string | null = null, observedActionSerial = 0;
const audio = new FightAudio();
const controlsHTML = `<div class="control-grid"><div><kbd>W A S D · Q</kbd><strong>Bewegen / Auslage</strong><span>Q wechselt orthodox / Southpaw</span></div><div><kbd>J / K</kbd><strong>Jab / Cross</strong><span>Shift: Haken · Strg: Körper · Alt: Uppercut</span></div><div><kbd>ALT + SHIFT + J / K</kbd><strong>Ellbogen</strong><span>Kurze Distanz; Strg wählt den Körper</span></div><div><kbd>U / I</kbd><strong>Round-Kicks</strong><span>Strg: Körper · Shift: Kopf</span></div><div><kbd>ALT + U / I</kbd><strong>Front-Kick / Knie</strong><span>Strg + Alt: Körperknie · Shift + Alt: Kopfknie</span></div><div><kbd>STRG + SHIFT + U / I</kbd><strong>Side-Kick</strong><span>Gerader harter Kick zum Körper</span></div><div><kbd>LEERTASTE</kbd><strong>Deckung / Timing</strong><span>Antippen: Parade · Strg antippen: Check / Kick-Catch</span></div><div><kbd>SPACE + A / D / S</kbd><strong>Slip / Pull</strong><span>Kopfbewegung öffnet ein Konterfenster</span></div><div><kbd>G / SHIFT + G</kbd><strong>Clinch / Takedown</strong><span>R: lösen oder aufstehen</span></div><div><kbd>W A S D</kbd><strong>Bodenposition wechseln</strong><span>Einzeln drücken; das Boden-Menü zeigt jedes Ziel</span></div><div><kbd>J / K · U</kbd><strong>Ground & Pound / Armbar</strong><span>Armbar aus Mount · U halten zum Angriff</span></div><div><kbd>LEERTASTE · ESC</kbd><strong>Verteidigen / Pause</strong><span>Am Boden: Übergang / Armbar abwehren</span></div></div><p class="help-note">Distanz und Standfestigkeit bestimmen die Wirkung. Paraden, Slips, Pulls und gefangene Kicks öffnen kurze Konterfenster. Am Boden reicht ein einzelner Druck auf W, A, S oder D. F3 öffnet die Diagnoseansicht.</p>`;
function openModal(title: string, body: string, type: string) {
  returnFocus = document.activeElement as HTMLElement; modalType = type; keyboard.clear();
  el('modal-card').innerHTML = `<div class="eyebrow">TYLER’S ULTIMATE CHAMPIONSHIP</div><h2 id="modal-title">${title}</h2>${body}`;
  el('modal').hidden = false; el('modal-card').querySelector<HTMLButtonElement>('button')?.focus();
}
function closeModal() { el('modal').hidden = true; modalType = ''; keyboard.clear(); returnFocus?.focus(); returnFocus?.blur(); }
function showHelp() { if (active && game.phase !== 'finished') game.paused = true; openModal('DEIN MOVE.', controlsHTML + '<button class="primary" id="close-help">VERSTANDEN <span>→</span></button>', 'help'); el('close-help').onclick = () => { closeModal(); if (active) game.paused = false; }; }
function togglePause() {
  if (!active || game.phase === 'finished') { if (modalType === 'help') closeModal(); return; }
  if (walkoutElapsed !== null) finishWalkout();
  if (game.paused) { game.paused = false; closeModal(); return; }
  game.paused = true;
  openModal('DURCHATMEN.', '<p class="modal-description">Dein Kampf ist pausiert.</p><button class="primary" id="resume">WEITERKÄMPFEN <span>→</span></button><div class="modal-actions"><button id="restart">Neu starten</button><button id="pause-help">Steuerung</button><button id="to-menu">Hauptmenü</button></div>', 'pause');
  el('resume').onclick = togglePause; el('restart').onclick = start; el('pause-help').onclick = showHelp; el('to-menu').onclick = toMenu;
}
const keyboard = new Keyboard(togglePause, () => { if (view) { view.debug = !view.debug; el('debug').hidden = !view.debug; } });
function setLevel(value: number) { level = Math.max(1, Math.min(5, value)); const p = DIFFICULTIES[level - 1]; el<HTMLSelectElement>('difficulty').value = String(level); el('difficulty-number').textContent = `STUFE 0${level} / 05`; el('difficulty-name').textContent = p.name; el('difficulty-description').textContent = p.subtitle; document.querySelectorAll<HTMLElement>('[data-level]').forEach(e => e.classList.toggle('lit', Number(e.dataset.level) <= level)); el<HTMLButtonElement>('difficulty-down').disabled = level === 1; el<HTMLButtonElement>('difficulty-up').disabled = level === 5; }
function setArena(value: number) {
  arenaIndex = (value + ARENAS.length) % ARENAS.length;
  const arena = ARENAS[arenaIndex];
  el('arena-number').textContent = `0${arenaIndex + 1} / 05`; el('arena-name').textContent = arena.name; el('arena-description').textContent = arena.subtitle;
  const caption = el('arena-caption'); caption.querySelector('strong')!.textContent = arena.name.toUpperCase(); caption.querySelector('p')!.textContent = arena.subtitle;
  el('arena-caption').querySelector<HTMLElement>('.arena-code')!.innerHTML = `${arena.code}<br>${arena.location}`;
  document.querySelectorAll<HTMLElement>('[data-arena]').forEach(node => { const selected = Number(node.dataset.arena) === arenaIndex; node.classList.toggle('selected', selected); if (selected) node.setAttribute('aria-current', 'true'); else node.removeAttribute('aria-current'); });
  app.style.setProperty('--lime', arena.accent); view?.setArena(arenaIndex);
}
function profileHTML(profile: FighterProfile) {
  const ratings: [string, number][] = [['STRIKING', profile.stats.striking], ['GRAPPLING', profile.stats.grappling], ['POWER', profile.stats.power], ['TEMPO', profile.stats.speed], ['NEHMERQUALITÄT', profile.stats.resilience], ['AUSDAUER', profile.stats.maxStamina / 100]];
  return `<strong>${profile.nickname}</strong><p>${profile.description}</p><div class="fighter-ratings">${ratings.map(([name, score]) => `<div><span>${name}</span><i><b style="width:${Math.round(score / 1.3 * 100)}%"></b></i></div>`).join('')}</div>`;
}
function setPlayer(id: string) {
  playerProfile = fighterProfile(id);
  document.querySelectorAll<HTMLButtonElement>('[data-player-fighter]').forEach(button => { const selected = button.dataset.playerFighter === playerProfile.id; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
  el('player-profile').innerHTML = profileHTML(playerProfile); previewFighters();
}
function setOpponent(id: string) {
  opponentChoice = id;
  document.querySelectorAll<HTMLButtonElement>('[data-opponent-fighter]').forEach(button => { const selected = button.dataset.opponentFighter === id; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
  const random = id === 'random'; el('opponent-random').classList.toggle('selected', random); el('opponent-random').setAttribute('aria-pressed', String(random));
  el('opponent-profile').innerHTML = random ? '<strong>ÜBERRASCHUNGSGEGNER</strong><p>Bei jedem Kampf wird einer der anderen vier Kämpfer gezogen.</p>' : profileHTML(fighterProfile(id));
  previewFighters();
}
function previewFighters() { if (view && !active) view.setFighters([playerProfile, opponentChoice === 'random' ? FIGHTERS.find(fighter => fighter.id !== playerProfile.id)! : fighterProfile(opponentChoice)]); }
function setMode(value: GameMode) {
  mode = value; const training = mode === 'training';
  el('mode-training').classList.toggle('selected', training); el('mode-training').setAttribute('aria-pressed', String(training));
  el('mode-fight').classList.toggle('selected', !training); el('mode-fight').setAttribute('aria-pressed', String(!training));
  el('training-panel').hidden = !training; el('fight-settings').hidden = training;
  el('mode-number').textContent = training ? '01' : '02'; el('mode-name').textContent = training ? 'TRAININGSMODUS' : 'TESTKAMPF'; el('mode-detail').textContent = training ? 'OHNE GEGENWEHR' : '3 RUNDEN · 3 MINUTEN';
  if (!(el<HTMLButtonElement>('start').disabled)) el('start-label').textContent = training ? 'TRAINING STARTEN' : 'BETRITT DAS OKTAGON';
}
function selectLesson(id: string) {
  const index = Math.max(0, TRAINING_LESSONS.findIndex(lesson => lesson.id === id)); lessonId = TRAINING_LESSONS[index].id;
  el('lesson-number').textContent = `${String(index + 1).padStart(2, '0')} / ${String(TRAINING_LESSONS.length).padStart(2, '0')}`;
  document.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(button => { const selected = button.dataset.lesson === lessonId; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
}
function updateCoach(completedStep = false) {
  if (!coach) return;
  const total = coach.lesson.steps.length, current = coach.current;
  el('coach-progress').textContent = total ? `${Math.min(coach.step + 1, total)} / ${total}` : 'FREI';
  el('coach-track-fill').style.width = total ? `${coach.step / total * 100}%` : '100%';
  if (coach.complete) {
    el('coach-title').textContent = 'LEKTION GESCHAFFT'; el('coach-instruction').textContent = 'Stark. Übe frei weiter oder wähle im Menü die nächste Lektion.'; el('coach-keys').textContent = '✓';
  } else if (!current) {
    el('coach-title').textContent = 'FREIES TRAINING'; el('coach-instruction').textContent = 'Der Dummy greift nicht an und kann nicht besiegt werden. Probiere jede Technik in Ruhe aus.'; el('coach-keys').textContent = 'ALLE TECHNIKEN';
  } else {
    el('coach-title').textContent = current.title.toUpperCase(); el('coach-instruction').textContent = current.instruction; el('coach-keys').textContent = current.keys;
    if (completedStep) { el('fight-message').textContent = coach.complete ? 'LEKTION ABGESCHLOSSEN' : 'GUT · NÄCHSTE TECHNIK'; messageTime = 1.6; }
  }
}
function start() {
  void audio.start().catch(() => { el('sound-toggle').textContent = 'TON NICHT VERFÜGBAR'; });
  const training = mode === 'training';
  activeOpponent = training ? FIGHTERS[1] : opponentChoice === 'random' ? randomOpponent(playerProfile.id) : fighterProfile(opponentChoice);
  game = new Combat(training ? { rounds: 1, roundSeconds: 86400 } : {}, training, [playerProfile, activeOpponent]); ai = new OpponentAI(level); coach = training ? new TrainingCoach(TRAINING_LESSONS.find(lesson => lesson.id === lessonId) ?? TRAINING_LESSONS[0]) : null; active = true; closeModal(); keyboard.clear(); view.setFighters([playerProfile, activeOpponent]);
  el('menu').hidden = true; el('arena-caption').hidden = true; el('hud').hidden = false; el('fight-controls').hidden = !training; el('footer').hidden = true; el('arena').classList.remove('menu-view'); app.classList.add('in-fight');
  el('training-coach').hidden = !training; el('player-name').textContent = playerProfile.name; el('opponent-name').textContent = training ? 'TRAININGSDUMMY' : activeOpponent.name; el('opponent-corner').textContent = training ? 'PASSIVER PARTNER' : 'ROTE ECKE';
  el('fight-level').textContent = training ? (coach?.lesson.name.toUpperCase() ?? 'TRAINING') : DIFFICULTIES[level - 1].name.toUpperCase(); accumulator = 0; hitStop = 0; playerInput = EMPTY_CONTROLS();
  walkoutElapsed = training ? null : 0; walkoutStage = null; el('walkout').hidden = training; app.classList.toggle('walkout-active', !training);
  if (training) game.start(); else updateWalkout();
  updateCoach(); view.renderer.domElement.focus({ preventScroll: true }); requestAnimationFrame(() => view.renderer.domElement.focus({ preventScroll: true }));
}
function updateWalkout() {
  if (walkoutElapsed === null) return;
  const presentation = walkoutAt(walkoutElapsed), beat = presentation.beat;
  el('walkout-kicker').textContent = beat.kicker; el('walkout-title').textContent = beat.stage === 'red-walk' ? activeOpponent.name : beat.stage === 'blue-walk' ? playerProfile.name : beat.stage === 'introductions' ? `${playerProfile.name}  VS  ${activeOpponent.name}` : beat.title;
  el('walkout-detail').textContent = beat.detail.replaceAll('Volk', activeOpponent.name).replaceAll('Tyler', playerProfile.name);
  el('walkout-progress-fill').style.width = `${Math.min(100, walkoutElapsed / WALKOUT_DURATION * 100)}%`;
  if (beat.stage !== walkoutStage) { walkoutStage = beat.stage; audio.walkoutCue(beat.stage, beat.corner); }
}
function finishWalkout() {
  if (walkoutElapsed === null) return;
  audio.stopWalkout(); walkoutElapsed = null; walkoutStage = null; app.classList.remove('walkout-active'); el('walkout').hidden = true; el('fight-controls').hidden = false;
  game.start(); accumulator = 0; keyboard.clear();
}
function toMenu() { active = false; coach = null; walkoutElapsed = null; walkoutStage = null; game = new Combat(); keyboard.clear(); closeModal(); el('menu').hidden = false; el('arena-caption').hidden = false; el('hud').hidden = true; el('walkout').hidden = true; el('fight-controls').hidden = true; el('training-coach').hidden = true; el('footer').hidden = false; el('ground-context').hidden = true; el('fight-message').textContent = ''; el('arena').classList.add('menu-view'); app.classList.remove('in-fight', 'walkout-active'); previewFighters(); }
el('start').onclick = start; el('help-button').onclick = showHelp; el('controls-link').onclick = showHelp; el('pause-button').onclick = togglePause;
el('skip-walkout').onclick = finishWalkout;
el('mode-training').onclick = () => setMode('training'); el('mode-fight').onclick = () => setMode('fight'); el('leave-training').onclick = toMenu;
document.querySelectorAll<HTMLButtonElement>('[data-player-fighter]').forEach(button => button.onclick = () => setPlayer(button.dataset.playerFighter!));
document.querySelectorAll<HTMLButtonElement>('[data-opponent-fighter]').forEach(button => button.onclick = () => setOpponent(button.dataset.opponentFighter!));
el('opponent-random').onclick = () => setOpponent('random');
document.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(button => button.onclick = () => selectLesson(button.dataset.lesson!));
el('difficulty-down').onclick = () => setLevel(level - 1); el('difficulty-up').onclick = () => setLevel(level + 1); el('difficulty').onchange = () => setLevel(Number(el<HTMLSelectElement>('difficulty').value));
el('arena-down').onclick = () => setArena(arenaIndex - 1); el('arena-up').onclick = () => setArena(arenaIndex + 1); document.querySelectorAll<HTMLButtonElement>('[data-arena]').forEach(node => node.onclick = () => setArena(Number(node.dataset.arena)));
el('sound-toggle').onclick = () => { audio.setMuted(!audio.muted); el('sound-toggle').textContent = audio.muted ? 'TON AUS' : 'TON AN'; };
el('quality').onchange = () => view?.setQuality(el<HTMLSelectElement>('quality').value);
window.addEventListener('blur', () => { if (active && !game.paused && game.phase !== 'finished') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !game.paused && game.phase !== 'finished') togglePause(); });
el('modal').addEventListener('keydown', e => { if (e.key === 'Tab') { const buttons = Array.from(el('modal-card').querySelectorAll<HTMLElement>('button,select,a')); const first = buttons[0], last = buttons.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } if (e.key === 'Escape') { e.stopPropagation(); if (modalType === 'help') { closeModal(); game.paused = false; } else if (modalType === 'pause') togglePause(); } });
function updateHUD() {
  el('timer').textContent = coach ? `${Math.floor(game.elapsed / 60)}:${Math.floor(game.elapsed % 60).toString().padStart(2, '0')}` : game.phase === 'break' ? `0:${Math.ceil(game.breakRemaining).toString().padStart(2, '0')}` : `${Math.floor(Math.ceil(game.remaining) / 60)}:${(Math.ceil(game.remaining) % 60).toString().padStart(2, '0')}`;
  el('round').textContent = coach ? 'TRAINING' : game.phase === 'break' ? 'RUNDENPAUSE' : `RUNDE ${game.round} / ${game.rules.rounds}`;
  game.fighters.forEach((f, i) => { el(i ? 'opponent-stamina' : 'player-stamina').style.transform = `scaleX(${f.damage.stamina / 100})`; const condition = f.state === 'knockedDown' ? 'NIEDERSCHLAG' : f.stun > 0 ? 'ERSCHÜTTERT' : f.counterWindow > 0 ? 'KONTERFENSTER' : f.damage.stamina < 25 ? 'ERSCHÖPFT' : f.damage.leg > 50 ? 'BEIN ANGESCHLAGEN' : 'AUSDAUER'; el(i ? 'opponent-state' : 'player-state').textContent = `${condition} · ${f.stance === 'orthodox' ? 'ORTHODOX' : 'SOUTHPAW'}`; });
  const g = game.grapple; el('ground-context').hidden = !g || game.phase === 'finished';
  if (g) {
    el('position-label').textContent = g.mode === 'clinch' ? 'CLINCH' : g.mode === 'takedown' ? 'TAKEDOWN' : `${POSITION_LABELS[g.position].toUpperCase()} · ${g.top === 0 ? 'DU BIST OBEN' : 'DU BIST UNTEN'}`;
    const compass = el('ground-compass'); compass.hidden = g.mode !== 'ground' || !!g.transition;
    document.querySelectorAll<HTMLElement>('[data-ground-direction]').forEach(node => { node.hidden = true; node.querySelector('span')!.textContent = ''; });
    if (g.mode === 'ground' && !g.transition) for (const option of groundMoveOptions(g, 0)) {
      const node = document.querySelector<HTMLElement>(`[data-ground-direction="${option.direction}"]`)!;
      node.hidden = false; node.querySelector('span')!.textContent = option.label.toUpperCase();
    }
    el('position-help').textContent = g.mode === 'submission' ? g.top === 0 ? 'ARMBAR · U HALTEN' : 'ARMBAR · LEERTASTE HALTEN ZUM BEFREIEN' : g.mode === 'standup' ? 'AUFSTEHEN' : g.transition ? `${POSITION_LABELS[g.transition.from ?? g.position].toUpperCase()}  →  ${POSITION_LABELS[g.transition.to ?? g.position].toUpperCase()}${g.transition.defended ? ' · ABGEWEHRT' : ''}` : g.mode === 'ground' ? 'WASD EINZELN DRÜCKEN  /  SPACE VERTEIDIGEN  /  R AUFSTEHEN' : 'G KONTROLLE  /  SHIFT + G TAKEDOWN  /  R LÖSEN';
    el('submission-track').hidden = g.mode !== 'submission'; el('submission-track').querySelector<HTMLElement>('i')!.style.width = `${g.progress * 100}%`;
  }
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
    else if (active && walkoutElapsed !== null) {
      walkoutElapsed += dt; updateWalkout();
      if (walkoutElapsed >= WALKOUT_DURATION) finishWalkout();
    }
    else {
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        if (active) {
          playerInput = keyboard.read(game);
          if (playerInput.action) { observedAction = playerInput.action; observedActionSerial++; }
          game.command(0, playerInput); game.command(1, coach ? EMPTY_CONTROLS() : ai.update(game)); game.step(1 / 60);
          if (coach && coach.observe(playerInput, game, game.events, 1 / 60)) updateCoach(true);
        }
        view.physics.step(game); accumulator -= 1 / 60;
      }
    }
    messageTime -= dt; if (messageTime <= 0) el('fight-message').textContent = '';
    breathTime += dt; if (breathTime > 2.2 && active && walkoutElapsed === null) { breathTime = 0; audio.breath(1 - game.fighters[0].damage.stamina / 100); }
  }
  events(); view.draw(game, dt, !active, game.paused || hitStop > 0, frameDt, walkoutElapsed === null ? null : walkoutAt(walkoutElapsed));
  renderTime += dt; if (renderTime > .08) { updateHUD(); renderTime = 0; }
  requestAnimationFrame(frame);
}
async function init() {
  setLevel(3); setArena(0); selectLesson(lessonId); setMode('training'); setPlayer(playerProfile.id); setOpponent(opponentChoice);
  try { view = new ArenaView(el('arena')); await view.init(); view.setArena(arenaIndex); el<HTMLButtonElement>('start').disabled = false; el('start-label').textContent = 'TRAINING STARTEN'; requestAnimationFrame(frame); }
  catch (error) { el('load-error').hidden = false; el('load-error').textContent = `Die 3D-Ansicht konnte nicht starten. Bitte WebGL in Chrome oder Edge aktivieren und neu laden. ${error instanceof Error ? error.message : ''}`; el('start-label').textContent = '3D-START FEHLGESCHLAGEN'; console.error(error); }
}
// Development-only observability for automated real-browser integration tests.
if (import.meta.env.DEV) Object.defineProperty(window, '__TUC__', { value: { get match() { return game; }, get view() { return view; }, get ai() { return ai; }, get lastInput() { return { action: observedAction, serial: observedActionSerial }; }, get walkout() { return walkoutElapsed === null ? null : walkoutAt(walkoutElapsed); }, setWalkout(seconds: number) { if (active && walkoutElapsed !== null) { walkoutElapsed = Math.max(0, Math.min(WALKOUT_DURATION - .01, seconds)); updateWalkout(); } }, simulate(seconds: number, bothAI = false) { const playerAI = new OpponentAI(5, seededRandom(441), 0); for (let i = 0; i < seconds * 60 && game.phase !== 'finished'; i++) { if (bothAI) game.command(0, playerAI.update(game)); game.command(1, ai.update(game)); game.step(1 / 60); } }, } });
void init();
