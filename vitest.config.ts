import { defineConfig } from 'vitest/config';

// Unit and database tests only. The browser tests in e2e/ are run by Playwright (npm run e2e).
export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'supabase/tests/**/*.test.ts'] },
});
