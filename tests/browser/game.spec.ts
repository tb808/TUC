import { test, expect } from '@playwright/test';
test('menu, keyboard combat, pause, full match end and rematch', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('IMPACT.');
  await page.screenshot({ path: 'output/playwright/menu.png' });
  await page.locator('#difficulty-down').click(); await page.locator('#difficulty-down').click(); await expect(page.locator('#difficulty-name')).toHaveText('Einsteiger');
  await page.locator('#controls-link').click(); await expect(page.locator('#modal')).toBeVisible(); await page.locator('#close-help').click();
  await page.locator('#start').click(); await expect(page.locator('#hud')).toBeVisible();
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
  await page.goto('/'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 }); await page.locator('#start').click();
  await page.evaluate(() => { const t = (window as any).__TUC__; t.ai.update = () => ({ move: { x: 0, z: 0 }, guard: null }); t.match.fighters[0].position.x = -.5; t.match.fighters[1].position.x = .5; });
  await page.keyboard.press('KeyG'); await page.waitForTimeout(150); await expect(page.locator('#position-label')).toHaveText('CLINCH');
  await page.keyboard.press('Shift+KeyG'); await page.waitForTimeout(1000); await expect(page.locator('#position-label')).toContainText('GUARD');
  for (const position of ['HALF GUARD','SIDE CONTROL','MOUNT']) { await page.keyboard.press('KeyG'); await page.waitForTimeout(1050); await expect(page.locator('#position-label')).toContainText(position); }
  await page.screenshot({ path: 'output/playwright/ground.png' });
  await page.keyboard.press('KeyU'); await page.keyboard.down('KeyG'); await expect(page.locator('#submission-track')).toBeVisible();
  await expect(page.locator('#rematch')).toBeVisible({ timeout: 15000 }); await page.keyboard.up('KeyG'); await expect(page.locator('.result-method')).toHaveText('SUBMISSION');
});
