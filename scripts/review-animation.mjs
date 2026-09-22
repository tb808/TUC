import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('output/playwright/animation', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__TUC__?.view && !document.querySelector('#start').disabled, undefined, { timeout: 60000 });
  await page.locator('#start').click();
  const poses = process.argv.length > 2 ? process.argv.slice(2) : ['stance', 'southpaw', 'jab', 'hook', 'uppercut', 'elbow', 'body', 'low-kick', 'front-kick', 'side-kick', 'knee', 'high-kick', 'parry', 'slip', 'check', 'clinch', 'guard', 'mount', 'submission'];
  for (const pose of poses) {
    await page.evaluate(async pose => {
      const { TECHNIQUES } = await import('/src/game/config.ts');
      const { match, view } = window.__TUC__; match.paused = true; match.grapple = null; match.result = null;
      match.inputs = [{ move: { x: 0, z: 0 }, guard: null }, { move: { x: 0, z: 0 }, guard: null }];
      for (const [i, f] of match.fighters.entries()) {
        f.position = { x: i ? .53 : -.53, z: 0 }; f.heading = i ? -Math.PI / 2 : Math.PI / 2;
        f.velocity = { x: 0, z: 0 }; f.attack = null; f.guard = null; f.state = 'idle'; f.reaction = 0;
        f.stance = 'orthodox'; f.stanceSwitch = 0; f.defense = null; f.defenseTime = 0;
      }
      const actions = { jab: 'punch-0-head', hook: 'hook-1-head', uppercut: 'uppercut-1-head', elbow: 'elbow-0-head', body: 'punch-1-body', 'low-kick': 'kick-0-leg', 'front-kick': 'frontKick-1-body', 'side-kick': 'sideKick-1-body', knee: 'knee-1-body', 'high-kick': 'kick-1-head' };
      if (pose === 'southpaw') match.fighters[0].stance = 'southpaw';
      if (pose === 'parry') { match.fighters[0].defense = 'parry'; match.fighters[0].defenseTime = .15; }
      if (pose === 'slip') { match.fighters[0].defense = 'slipLeft'; match.fighters[0].defenseTime = .2; }
      if (pose === 'check') { match.fighters[0].defense = 'check'; match.fighters[0].defenseTime = .2; }
      if (actions[pose]) {
        const technique = TECHNIQUES[actions[pose]];
        match.fighters[0].attack = { technique, elapsed: technique.windup + technique.active / 2, hit: false, previousTip: null };
      }
      if (['clinch', 'guard', 'mount', 'submission'].includes(pose)) {
        match.grapple = { mode: pose === 'clinch' ? 'clinch' : pose === 'submission' ? 'submission' : 'ground', top: 0, position: pose === 'guard' ? 'guard' : 'mount', timer: 1, progress: .3, transition: null };
        match.paused = false; match.step(1 / 60); match.paused = true;
        for (let i = 0; i < 40; i++) { match.paused = false; match.step(1 / 60); match.paused = true; }
      }
      view.camera.position.set(.3, 3.05, 6.3);
      for (let i = 0; i < 90; i++) view.rigs.forEach((rig, id) => rig.update(match.fighters[id], match.grapple, 2, 1 / 60, view.physics.rotation(id), null));
      view.draw(match, 1 / 60, false, false);
      document.querySelector('#fight-message').textContent = '';
    }, pose);
    await page.screenshot({ path: `output/playwright/animation/${pose}.png` });
  }
  console.log(JSON.stringify({ errors, screenshots: poses.length }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
