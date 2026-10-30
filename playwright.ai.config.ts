import { defineConfig } from '@playwright/test';
export default defineConfig({
  webServer: {
    command: 'npx expo start --web --localhost --port 8082',
    url: 'http://localhost:8082',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { EXPO_NO_DOTENV: '1', EXPO_PUBLIC_ANALYSIS_URL: 'http://localhost:3001' },
  },
  testDir: './tests/ai',
  outputDir: './test-results/ai',
  timeout: 30_000,
  use: {
    channel: 'chromium',
    baseURL: 'http://localhost:8082',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
});
