import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 2 : 0,
  workers: process.env.CI === 'true' ? 1 : undefined,
  reporter: process.env.CI === 'true' ? [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }]
  ] : [
    ['list'],  // リアルタイム進捗表示
    ['html']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 30 * 1000,  // 30秒に短縮
    stdout: 'pipe',
    stderr: 'pipe'
  },
});