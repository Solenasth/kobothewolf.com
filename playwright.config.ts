import { defineConfig, devices } from '@playwright/test';

const port = 4173;
/** E2E fixture pages (DESIGN §10), built separately so the site build stays unchanged. */
export const fixturePort = 4174;
const fixtureConfig = 'e2e/fixtures/vite.config.ts';

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite build --config ${fixtureConfig} && npx vite preview --config ${fixtureConfig} --port ${fixturePort} --strictPort`,
      url: `http://localhost:${fixturePort}/caras/`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
