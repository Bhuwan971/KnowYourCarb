import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ai',
  outputDir: './test-results/ai',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8082',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
});
