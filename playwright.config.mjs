import { defineConfig } from '@playwright/test';

const port = Number(process.env.VISDELTA_TEST_PORT || process.env.SCROLLYLITE_TEST_PORT || 5511);
const baseURL = `http://127.0.0.1:${port}`;
const chromePath = process.env.VISDELTA_CHROME_PATH || process.env.SCROLLYLITE_CHROME_PATH;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1100, height: 850 },
    launchOptions: chromePath ? { executablePath: chromePath } : {}
  },
  webServer: {
    command: 'node scripts/serve-tests.mjs',
    url: `${baseURL}/tests/fixtures/runtime.html`,
    env: { VISDELTA_TEST_PORT: String(port) },
    reuseExistingServer: !process.env.CI
  }
});
