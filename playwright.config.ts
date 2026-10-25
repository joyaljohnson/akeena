import { defineConfig } from '@playwright/test';

const PORT = 5199;

// Tests run against the dev server with made-up Supabase settings; every network call to that
// address is answered by the test itself, so nothing real is touched. Uses the installed Chrome.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    acceptDownloads: true,
  },
  projects: [
    { name: 'phone-390' },
    { name: 'phone-360', use: { viewport: { width: 360, height: 740 } }, grep: /@responsive/ },
    { name: 'phone-430', use: { viewport: { width: 430, height: 932 } }, grep: /@responsive/ },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: 'https://e2e.supabase.test',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_e2e',
      VITE_BASE_PATH: '/',
      VITE_SITE_URL: 'http://localhost',
      VITE_USE_SAMPLE: '1',
    },
  },
});
