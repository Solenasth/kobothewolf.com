import { defineConfig, devices } from '@playwright/test';

// Renders the exports that `kobo check-exports` checks (DESIGN §10), in
// Chromium and WebKit, to exports/<browser>/.
const port = 4175;

export default defineConfig({
  testDir: 'e2e/exports',
  testMatch: 'render.ts',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // The renderer reads the faces through the test hook (DESIGN §5.6).
    command: `VITE_TEST_HOOK=1 npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
