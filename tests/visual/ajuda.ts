import type { Page } from "@playwright/test";

/**
 * Ajudantes dos testes visuais.
 *
 * Contexto que este arquivo resolve: o middleware do carrossel exige o cookie
 * `ac_sessao=1` para renderizar `/` e `/projetos`, e a API do AutoClinic não
 * está disponível no ambiente de teste. Sem isso, todo teste caía em `/login` e
 * falhava por timeout — foi o estado encontrado ao começar a direção A: 7 de 7
 * testes vermelhos, todos pelo mesmo motivo.
 *
 * O cookie é só o marcador de "tem sessão" (ver src/middleware.ts): não autoriza
 * nada, e a API é mockada rota a rota.
 */

export const COOKIE_SESSAO = { name: "ac_sessao", value: "1" };

/** Estado de sessão para o `storageState` do playwright.config.ts. */
export const estadoDeSessao = {
  cookies: ["127.0.0.1", "localhost"].map((dominio) => ({
    ...COOKIE_SESSAO,
    domain: dominio,
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 86400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  })),
  origins: [
    {
      origin: "http://127.0.0.1:8099",
      localStorage: [{ name: "ac_refresh", value: "refresh-de-teste" }],
    },
  ],
};

export const PROJETOS_MOCK = [
  {
    id: "p1",
    titulo: "Fiscalização na estética: 7 pontos que a Vigilância olha antes de autuar",
    versao_atual: 4,
    publico_ativo: true,
    atualizado_em: new Date(Date.now() - 2 * 3600_000).toISOString(),
    slides: 7,
    autor_nome: "Ana Prado",
    autor_email: "ana@autoclinic.com",
  },
  {
    id: "p2",
    titulo: "Harmonização facial: o que muda com a nova regra da Anvisa",
    versao_atual: 2,
    publico_ativo: false,
    atualizado_em: new Date(Date.now() - 26 * 3600_000).toISOString(),
    slides: 6,
    autor_nome: "Ana Prado",
    autor_email: "ana@autoclinic.com",
  },
  {
    id: "p3",
    titulo: "Precificação de protocolo: como parar de perder margem",
    versao_atual: 1,
    publico_ativo: false,
    atualizado_em: new Date(Date.now() - 3 * 86400_000).toISOString(),
    slides: 5,
    autor_nome: "Clécio Menezes",
    autor_email: "clecio@autoclinic.com",
  },
];

/** Sessão + API mockada. Chamar ANTES do `goto`. */
export async function prepararSessao(page: Page) {
  await page.route("**/api/auth/refresh", (rota) =>
    rota.fulfill({
      json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" },
    }),
  );
  await page.route("**/api/ac/**", (rota) => {
    const url = rota.request().url();
    if (url.includes("/me")) {
      return rota.fulfill({
        json: {
          usuario: {
            id: "u1",
            email: "ana@autoclinic.com",
            nome: "Ana Prado",
            papel: "admin",
            organization_id: "org-autoclinic",
            deve_trocar_senha: false,
          },
        },
      });
    }
    if (url.includes("/carrossel/projetos") && rota.request().method() === "GET") {
      return rota.fulfill({ json: { projetos: PROJETOS_MOCK } });
    }
    if (url.includes("/conteudo/fila")) return rota.fulfill({ json: { fila: [] } });
    return rota.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("ac_refresh", "refresh-de-teste");
    } catch {
      /* origem opaca: sem localStorage */
    }
  });
}

/** Editor com documento limpo, pronto para medir. */
export async function abrirEditorLimpo(page: Page) {
  await prepararSessao(page);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Galeria com a lista mockada, pronta para medir. */
export async function abrirGaleria(page: Page) {
  await prepararSessao(page);
  await page.goto("/projetos");
  await page.waitForSelector("article", { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}
