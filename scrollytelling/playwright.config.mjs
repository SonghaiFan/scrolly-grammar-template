import { defineConfig } from '@playwright/test';

const port = Number(process.env.SCROLLYTELLING_TEST_PORT || 5512);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs/,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1100, height: 850 },
    launchOptions: process.env.VISDELTA_CHROME_PATH
      ? { executablePath: process.env.VISDELTA_CHROME_PATH }
      : {}
  },
  webServer: {
    command: 'node ../scripts/serve-tests.mjs',
    url: `${baseURL}/scrollytelling/examples/minimal/`,
    env: { VISDELTA_TEST_PORT: String(port) },
    reuseExistingServer: !process.env.CI
  }
});
