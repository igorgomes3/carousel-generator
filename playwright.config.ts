import { defineConfig, devices } from "@playwright/test";

/**
 * Testes visuais e de acessibilidade do editor de carrossel.
 *
 * O editor usa localStorage, então cada projeto já entra com documento limpo.
 * O servidor de produção é reaproveitado quando já está rodando (porta 8099),
 * evitando subir um segundo Next.
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.CAROUSEL_URL || "http://127.0.0.1:8099",
    viewport: { width: 1600, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CAROUSEL_URL
    ? undefined
    : {
        command: "npm run start -- --port 8099",
        url: "http://127.0.0.1:8099",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
