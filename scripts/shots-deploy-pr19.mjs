/**
 * Prova visual do deploy do PR #19 em produção.
 *
 * Não autentica de verdade: o GoTrue do AutoClinic não é tocado. O middleware
 * só exige o cookie marcador `ac_sessao=1` (ver src/middleware.ts) e as rotas
 * `/api/**` são interceptadas no navegador com o mesmo fixture dos testes
 * visuais. O que se fotografa é o build servido por https://carrossel.149-56-214-54.sslip.io.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.CAROUSEL_URL || "https://carrossel.149-56-214-54.sslip.io";
const PASTA = process.env.SAIDA || "screenshots/deploy-pr19";
const EMAIL = "ana@autoclinic.com";

const USUARIO = {
  usuario: {
    id: "u1",
    email: EMAIL,
    nome: "Ana Prado",
    papel: "admin",
    organization_id: "org-autoclinic",
    deve_trocar_senha: false,
  },
};

async function mocks(context) {
  await context.route("**/api/projetos**", (r) => r.fulfill({ json: { carrosseis: [] } }));
  await context.route("**/api/auth/refresh", (r) =>
    r.fulfill({ json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" } }),
  );
  await context.route("**/api/ac/**", (r) => {
    const url = r.request().url();
    if (url.includes("/me")) return r.fulfill({ json: USUARIO });
    return r.fulfill({ json: {} });
  });
}

async function sessao(context) {
  await context.addCookies([
    {
      name: "ac_sessao",
      value: "1",
      url: BASE,
      expires: Math.floor(Date.now() / 1000) + 86400,
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("ac_refresh", "refresh-de-teste");
    } catch {}
  });
}

const browser = await chromium.launch();
await mkdir(PASTA, { recursive: true });
const feito = [];

for (const [rotulo, width, height] of [
  ["1440", 1440, 900],
  ["390", 390, 844],
]) {
  // --- logado: barra da conta + menu aberto ---
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  await mocks(ctx);
  await sessao(ctx);
  const page = await ctx.newPage();
  const resp = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const botao = page.getByRole("button", { name: new RegExp(`conta de ${EMAIL.replace(".", "\\.")}`, "i") });
  await botao.waitFor({ state: "visible", timeout: 20000 });
  const p1 = `${PASTA}/01-logado-${rotulo}.png`;
  await page.screenshot({ path: p1 });
  feito.push({ arquivo: p1, url: page.url(), status: resp?.status() });

  await botao.click();
  const menu = page.getByRole("menu", { name: "Conta" });
  await menu.waitFor({ state: "visible", timeout: 20000 });
  const p2 = `${PASTA}/02-menu-${rotulo}.png`;
  await page.screenshot({ path: p2 });
  feito.push({ arquivo: p2, texto: (await menu.innerText()).replace(/\n+/g, " | ") });
  await ctx.close();

  // --- deslogado: sem cookie, middleware manda para /login ---
  const ctx2 = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page2 = await ctx2.newPage();
  const r2 = await page2.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page2.evaluate(() => document.fonts.ready);
  await page2.waitForTimeout(800);
  const p3 = `${PASTA}/03-deslogado-${rotulo}.png`;
  await page2.screenshot({ path: p3 });
  feito.push({ arquivo: p3, url: page2.url(), status: r2?.status() });
  await ctx2.close();
}

await browser.close();
console.log(JSON.stringify(feito, null, 2));
