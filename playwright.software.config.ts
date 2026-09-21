import { defineConfig } from '@playwright/test';
import config from './playwright.config';

// Same desktop layout and inputs, fewer raster pixels for CPU-only WebGL runners.
export default defineConfig({
  ...config,
  timeout: 120000,
  use: { ...config.use, deviceScaleFactor: .5 },
  outputDir: 'output/playwright/software-results',
});
