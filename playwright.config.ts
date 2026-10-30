import { defineConfig } from '@playwright/test';
export default defineConfig({
  webServer: {
    command: 'npx expo start --web --localhost --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { EXPO_NO_DOTENV: '1', EXPO_PUBLIC_ANALYSIS_URL: '' },
  },
  testDir: './tests/ui',
  outputDir: './test-results/ui',
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  use: {
    channel: 'chromium',
    baseURL: 'http://localhost:8081',
    viewport: { width: 1440, height: 1050 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1050 } } },
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
