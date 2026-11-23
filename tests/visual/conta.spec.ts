import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Conta e sessão (issue #19) — quem está logado, como sair, e o que a pessoa lê
 * quando a sessão vence ou a credencial está errada.
 *
 * O que estes testes provam, e por que não bastava olhar a tela:
 *
 * 1. **A identidade aparece.** O estúdio não mostrava ninguém; aqui o e-mail do
 *    `/me` tem que estar visível (1440) e alcançável (390, dentro do menu).
 * 2. **Sair limpa de verdade.** Não é só navegar: o `ac_refresh` do
 *    `localStorage` e o cookie `ac_sessao` precisam sumir. Se ficarem, a pessoa
 *    "sai" e o próximo `/` entra direto.
 * 3. **Sessão vencida explica.** O evento `ac:sessao-expirada` leva para
 *    `/login?expirado=1` com a frase na tela — o alvo joga a pessoa no muro de
 *    login sem dizer nada.
 * 4. **Erro de credencial em português.** O texto vem do servidor; a tela só
 *    mostra. É o caso que mais aparece para o usuário leigo.
 *
 * As APIs são mockadas (`/api/ac/**`, `/api/auth/*`, `/api/projetos`): o
 * ambiente de teste não tem o GoTrue do AutoClinic, e o que se mede aqui é o
 * comportamento da tela, não o do auth.
 */

const PASTA = "screenshots/auth";

async function preparar(page: Page) {
  await page.route("**/api/projetos", (rota) => rota.fulfill({ json: { projetos: [] } }));

  await page.route("**/api/auth/refresh", (rota) =>
    rota.fulfill({ json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" } }),
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
    return rota.fulfill({ json: {} });
  });

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("ac_refresh", "refresh-de-teste");
    } catch {
      /* origem opaca */
    }
  });
}

test("estúdio mostra quem está logado e abre o menu da conta", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const botao = page.getByRole("button", { name: /conta de ana@autoclinic\.com/i });
  await expect(botao).toBeVisible();
  // Desktop: o e-mail fica na barra, não escondido no menu.
  await expect(botao).toContainText("ana@autoclinic.com");

  await page.screenshot({ path: `${PASTA}/01-estudio-1440.png`, fullPage: false });

  await botao.click();
  const menu = page.getByRole("menu", { name: "Conta" });
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("ana@autoclinic.com");
  await expect(menu).toContainText("Administrador");
  await expect(page.getByRole("menuitem", { name: /sair da conta/i })).toBeVisible();

  await page.screenshot({ path: `${PASTA}/02-menu-1440.png` });

  // Esc fecha: o menu não vira armadilha de teclado.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("menu da conta em 390: só a inicial na barra, e-mail dentro do menu", async ({ page }) => {
  await preparar(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const botao = page.getByRole("button", { name: /conta de ana@autoclinic\.com/i });
  await expect(botao).toBeVisible();
  // O e-mail NÃO aparece na barra em 390 (não cabe) — e o nome acessível continua.
  // `toContainText` olha `textContent` e veria o texto escondido; aqui medimos o
  // que a pessoa enxerga.
  await expect(page.getByText("ana@autoclinic.com", { exact: true })).toBeHidden();

  await page.screenshot({ path: `${PASTA}/03-barra-390.png` });

  await botao.click();
  await expect(page.getByRole("menu", { name: "Conta" })).toContainText("ana@autoclinic.com");
  await page.screenshot({ path: `${PASTA}/04-menu-390.png` });
});

test("sair limpa a sessão e volta ao login explicando a saída", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const antes = await page.evaluate(() => ({
    refresh: window.localStorage.getItem("ac_refresh"),
    cookie: document.cookie.includes("ac_sessao=1"),
  }));
  expect(antes.refresh).toBe("refresh-de-teste");
  expect(antes.cookie).toBe(true);

  await page.getByRole("button", { name: /conta de/i }).click();
  await page.getByRole("menuitem", { name: /sair da conta/i }).click();

  await page.waitForURL(/\/login\?saiu=1/);

  const depois = await page.evaluate(() => ({
    refresh: window.localStorage.getItem("ac_refresh"),
    cookie: document.cookie.includes("ac_sessao=1"),
  }));
  expect(depois.refresh).toBeNull();
  expect(depois.cookie).toBe(false);

  await expect(page.getByRole("status")).toContainText("Você saiu da sua conta");
  await page.screenshot({ path: `${PASTA}/05-login-apos-sair-1440.png` });
});

test("sessão expirada leva ao login com a explicação", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  // É o mesmo evento que `apiFetch` dispara quando o refresh é recusado.
  await page.evaluate(() => window.dispatchEvent(new Event("ac:sessao-expirada")));
  await page.waitForURL(/\/login\?expirado=1/);

  await expect(page.getByRole("status")).toContainText("Sua sessão expirou");
  await page.screenshot({ path: `${PASTA}/06-login-sessao-expirada-1440.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${PASTA}/07-login-sessao-expirada-390.png` });
});

test("credencial errada aparece em português, no formulário", async ({ page }) => {
  await preparar(page);
  // O texto é o que o route handler devolve (mensagens.ts). Aqui só se mede que
  // a tela mostra a frase do servidor e não um erro técnico.
  await page.route("**/api/auth/login", (rota) =>
    rota.fulfill({ status: 401, json: { erro: "E-mail ou senha incorretos." } }),
  );

  await page.goto("/login");
  await page.getByLabel("E-mail").fill("ana@autoclinic.com");
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await page.screenshot({ path: `${PASTA}/08-login-erro-credencial-1440.png` });
});

test("o login não aceita destino externo no ?de=", async ({ page }) => {
  await preparar(page);
  await page.route("**/api/auth/login", (rota) =>
    rota.fulfill({ json: { access_token: "t", refresh_token: "r" } }),
  );

  // `//exemplo.com` é host, não caminho: sem a trava, a pessoa recém-logada
  // sairia do produto para um site de terceiro.
  await page.goto("/login?de=//exemplo.com");
  await page.getByLabel("E-mail").fill("ana@autoclinic.com");
  await page.getByLabel("Senha").fill("senha-certa");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL((url) => url.host === new URL(page.url()).host && !url.pathname.startsWith("/login"));
  expect(new URL(page.url()).pathname).toBe("/");
});

test("o menu da conta não tem violação crítica ou séria de acessibilidade", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  await page.getByRole("button", { name: /conta de ana@autoclinic\.com/i }).click();
  const menu = page.getByRole("menu", { name: "Conta" });
  await expect(menu).toBeVisible();

  // Escopo no menu: o resto do estúdio tem dívida de acessibilidade anterior a
  // esta issue, e misturar as duas transformaria o portão em ruído.
  const resultado = await new AxeBuilder({ page })
    .include('[role="menu"][aria-label="Conta"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const bloqueantes = resultado.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => `${v.id}: ${v.help}`);

  expect(bloqueantes, bloqueantes.join(" | ")).toEqual([]);
});
