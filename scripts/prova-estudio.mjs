/**
 * Prova visual do estúdio: sobe na 3010, percorre o fluxo de verdade
 * (tema → gerar → resultado) e salva PNGs de 1440 e 390.
 *
 * Não é teste de unidade: é o gate que o CEO pede ("eu quero ver"). Se a
 * geração falhar, o script falha — sem screenshot de mentira.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3010";
const TEMA = process.env.TEMA ?? "5 erros que fazem seu carrossel não ser salvo";
const SAIDA = "screenshots/estudio";
mkdirSync(SAIDA, { recursive: true });

async function novoContexto(browser, width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: "pt-BR",
    acceptDownloads: true,
  });
  await ctx.addCookies([
    { name: "ac_sessao", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
  return ctx;
}

async function passo1(page, sufixo) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SAIDA}/01-estudio-${sufixo}.png`, fullPage: false });
  await page.screenshot({ path: `${SAIDA}/01-estudio-full-${sufixo}.png`, fullPage: true });
}

async function fluxo(page, sufixo) {
  await passo1(page, sufixo);

  // Passo 2 pelo caminho do template (a vitrine é a home, como no alvo).
  await page.getByRole("button", { name: /Minimalist/i }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SAIDA}/02-tema-${sufixo}.png` });

  const campo = page.locator("textarea").first();
  await campo.fill(TEMA);
  await page.screenshot({ path: `${SAIDA}/02b-tema-preenchido-${sufixo}.png` });

  await page.getByRole("button", { name: /Gerar carrossel/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SAIDA}/03-gerando-${sufixo}.png` });

  // O resultado pode levar até ~2 min (roteiro + capa). Espera o botão de baixar.
  await page.getByRole("button", { name: /Baixar todos/i }).waitFor({ timeout: 300_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SAIDA}/04-resultado-${sufixo}.png` });
  await page.screenshot({ path: `${SAIDA}/04-resultado-full-${sufixo}.png`, fullPage: true });

  // Prova de que o download sai mesmo: um clique real, um arquivo.
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByRole("button", { name: /Baixar card 1 de/i }).first().click(),
  ]);
  const destino = `${SAIDA}/card-baixado-${sufixo}.png`;
  await download.saveAs(destino);
  console.log(`download ok (${sufixo}):`, download.suggestedFilename(), "→", destino);

  return destino;
}

const browser = await chromium.launch();

const ctx1440 = await novoContexto(browser, 1440, 1000);
const page1440 = await ctx1440.newPage();
await fluxo(page1440, "1440");
await ctx1440.close();

// No mobile o fluxo é o mesmo; só a captura muda. Rodar de novo é aceitável:
// é a mesma conta, e o que se prova aqui é layout, não economia de token.
const ctx390 = await novoContexto(browser, 390, 844);
const page390 = await ctx390.newPage();
await page390.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page390.waitForTimeout(1000);
await page390.screenshot({ path: `${SAIDA}/01-estudio-390.png` });
await page390.screenshot({ path: `${SAIDA}/01-estudio-full-390.png`, fullPage: true });
await page390.getByRole("button", { name: /Minimalist/i }).first().click();
await page390.waitForTimeout(500);
await page390.screenshot({ path: `${SAIDA}/02-tema-390.png` });
await ctx390.close();

await browser.close();
console.log("screenshots em", SAIDA);
