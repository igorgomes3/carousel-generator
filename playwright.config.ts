import { defineConfig, devices } from "@playwright/test";

/**
 * Testes visuais, de acessibilidade e de responsividade do carrossel.
 *
 * Sessão: o middleware exige o cookie `ac_sessao=1` para renderizar `/` e
 * `/projetos`. Sem ele todo teste caía em `/login` e falhava por timeout — o
 * estado encontrado no início da direção A (7 de 7 vermelhos). O `storageState`
 * abaixo injeta o marcador e o refresh token; a API é mockada por teste.
 *
 * Servidor: reaproveita o de produção quando já está rodando (porta 8099).
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
    storageState: {
      cookies: ["127.0.0.1", "localhost"].map((dominio) => ({
        name: "ac_sessao",
        value: "1",
        domain: dominio,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 86_400,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      })),
      origins: [],
    },
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
        // §2.6 / §8.1 item 9: os estados de dev da tela inicial
        // (`?estado=vazio|carregando|erro`) só existem quando o servidor diz que
        // podem existir. `next start` roda com NODE_ENV=production, então o
        // portão é esta variável — e é por isso que o teste 9 tem como passar
        // aqui sem afrouxar o portão em produção.
        env: { ESTADOS_DEV: "1" },
      },
});
