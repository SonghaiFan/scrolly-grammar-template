import { defineConfig } from '@playwright/test';

const port = Number(process.env.SCROLLYLITE_TEST_PORT || 5511);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1100, height: 850 },
    launchOptions: process.env.SCROLLYLITE_CHROME_PATH
      ? { executablePath: process.env.SCROLLYLITE_CHROME_PATH } : {}
  },
  webServer: {
    command: 'node scripts/serve-tests.mjs',
    url: `${baseURL}/examples/transition/`,
    env: { SCROLLYLITE_TEST_PORT: String(port) },
    reuseExistingServer: !process.env.CI
  }
});
