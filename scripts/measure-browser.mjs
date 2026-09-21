import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('output/playwright', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('#start').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await page.screenshot({ path: 'output/playwright/menu-1080.png' });
  await page.locator('#start').click();
  await page.waitForTimeout(1500);
  const results = [];
  for (const quality of ['high', 'low']) {
    await page.evaluate(quality => window.__TUC__.view.setQuality(quality), quality);
    await page.waitForTimeout(500);
    const measurement = await page.evaluate(() => new Promise(resolve => {
      const durations = []; let previous = performance.now(), finished = false;
      function finish() {
        if (finished) return; finished = true;
        const view = window.__TUC__.view, gl = view.renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
        const sorted = [...durations].sort((a,b) => a-b), mean = durations.reduce((a,b) => a+b,0) / Math.max(1,durations.length);
        resolve({ samples: durations.length, meanFPS: Number((1000 / mean).toFixed(1)), p95FrameMs: Number((sorted[Math.floor(sorted.length * .95)] ?? 0).toFixed(1)), drawCalls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles, renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) });
      }
      function sample(now) {
        if (finished) return;
        durations.push(now - previous); previous = now;
        if (durations.length < 150) requestAnimationFrame(sample);
        else finish();
      }
      requestAnimationFrame(sample);
      setTimeout(finish, 8000);
    }));
    results.push({ quality, viewport: '1920x1080', ...measurement });
  }
  await page.evaluate(() => window.__TUC__.view.setQuality('high'));
  await page.screenshot({ path: 'output/playwright/fight-1080.png' });
  await writeFile('output/playwright/performance.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
