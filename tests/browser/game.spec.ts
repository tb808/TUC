import { test, expect } from '@playwright/test';
test('menu, keyboard combat, pause, full match end and rematch', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('IMPACT.');
  await page.screenshot({ path: 'output/playwright/menu.png' });
  await page.locator('#mode-fight').click();
  await page.locator('#difficulty-down').click(); await page.locator('#difficulty-down').click(); await expect(page.locator('#difficulty-name')).toHaveText('Einsteiger');
  await page.locator('#controls-link').click(); await expect(page.locator('#modal')).toBeVisible(); await page.locator('#close-help').click();
  await page.locator('#start').click(); await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#walkout')).toBeVisible(); await expect(page.locator('#walkout-title')).toHaveText('THE PROVING GROUND');
  await page.waitForTimeout(3500); await expect(page.locator('#walkout-title')).toHaveText('LETZTE FREIGABE'); await page.screenshot({ path: 'output/playwright/walkout-check.png' });
  await page.waitForTimeout(2500); await expect(page.locator('#walkout-title')).toHaveText('ALEX VOLK'); await page.screenshot({ path: 'output/playwright/walkout-aisle.png' });
  await page.evaluate(() => (window as any).__TUC__.setWalkout(26)); await expect(page.locator('#walkout-kicker')).toHaveText('CAGESIDE CHECK'); await page.waitForTimeout(300); await page.screenshot({ path: 'output/playwright/walkout-inspection.png' });
  await page.evaluate(() => (window as any).__TUC__.setWalkout(32)); await expect(page.locator('#walkout-kicker')).toHaveText('OFFIZIELLE VORSTELLUNG'); await page.waitForTimeout(300); await page.screenshot({ path: 'output/playwright/walkout-introductions.png' });
  await page.locator('#skip-walkout').click(); await expect(page.locator('#walkout')).toBeHidden();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(650); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(300); await page.keyboard.press('KeyK');
  await page.waitForTimeout(500); await page.screenshot({ path: 'output/playwright/fight.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#modal-title')).toHaveText('DURCHATMEN.');
  const time = await page.locator('#timer').textContent(); await page.waitForTimeout(300); await expect(page.locator('#timer')).toHaveText(time!);
  await page.locator('#resume').click();
  await page.evaluate(() => (window as any).__TUC__.simulate(560, true));
  await expect(page.locator('#rematch')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'output/playwright/result.png' });
  await page.locator('#rematch').click(); await expect(page.locator('#round')).toHaveText('RUNDE 1 / 3');
  await page.keyboard.press('Escape'); await page.locator('#to-menu').click(); await expect(page.locator('#start')).toBeVisible();
  expect(errors).toEqual([]);
});
test('player can finish the complete grapple and submission loop with keys', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 }); await page.locator('#mode-fight').click(); await page.locator('#start').click(); await page.locator('#skip-walkout').click();
  await page.evaluate(() => { const t = (window as any).__TUC__; t.ai.update = () => ({ move: { x: 0, z: 0 }, guard: null }); t.match.fighters[0].position.x = -.5; t.match.fighters[1].position.x = .5; });
  await page.keyboard.press('KeyG'); await page.waitForTimeout(150); await expect(page.locator('#position-label')).toHaveText('CLINCH');
  await page.keyboard.press('Shift+KeyG'); await page.waitForTimeout(1000); await expect(page.locator('#position-label')).toContainText('GUARD');
  await expect(page.locator('#ground-compass')).toBeVisible(); await expect(page.locator('[data-ground-direction="advance"]')).toContainText('HALF GUARD');
  for (const position of ['HALF GUARD','SIDE CONTROL','MOUNT']) { await page.keyboard.press('KeyW'); await page.waitForTimeout(1050); await expect(page.locator('#position-label')).toContainText(position); }
  await page.screenshot({ path: 'output/playwright/ground.png' });
  await page.keyboard.down('KeyU'); await expect(page.locator('#submission-track')).toBeVisible();
  await expect(page.locator('#rematch')).toBeVisible({ timeout: 15000 }); await page.keyboard.up('KeyU'); await expect(page.locator('.result-method')).toHaveText('SUBMISSION');
});

test('all five arenas can be selected before the fight', async ({ page }) => {
  const names = ['The Proving Ground', 'Neon District', 'Alpine Crown', 'Imperial Dome', 'Harbor Forge'];
  await page.goto('/'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#mode-fight').click();
  await expect(page.locator('[data-arena]')).toHaveCount(5);
  for (let index = 0; index < names.length; index++) {
    await page.locator(`[data-arena="${index}"]`).click();
    await expect(page.locator('#arena-name')).toHaveText(names[index]);
    await expect(page.locator('#arena-number')).toHaveText(`0${index + 1} / 05`);
    await expect(page.locator('#arena-caption strong')).toHaveText(names[index].toUpperCase());
  }
  await page.screenshot({ path: 'output/playwright/arena-harbor-forge.png' });
  await page.locator('#start').click(); await expect(page.locator('#hud')).toBeVisible();
});

test('training is recommended and starts a guided lesson against a passive dummy', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('.first-step')).toContainText('EMPFOHLENER ERSTER SCHRITT');
  await expect(page.locator('#mode-training')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#start').click();
  await expect(page.locator('#training-coach')).toBeVisible(); await expect(page.locator('#opponent-name')).toHaveText('TRAININGSDUMMY');
  await expect(page.locator('#round')).toHaveText('TRAINING'); await expect(page.locator('#coach-title')).toHaveText('BLEIB IN BEWEGUNG');
  await page.locator('#leave-training').click(); await expect(page.locator('#menu')).toBeVisible();
});
