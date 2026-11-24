/**
 * Capturas de prova do pacote de 24/11/2026 — roda contra o servidor já publicado.
 *
 * Cobre o que o dono pediu e o que só print prova:
 *   1. card SEM imagem agora é cor sólida (antes tinha halo translúcido);
 *   2. carrossel com a MESMA capa em todos os cards (o "repetir capa");
 *   3. tela do painel /admin.
 *
 * Sessão: injeta o cookie `cr_sessao` com o access token real e o marcador
 * `ac_sessao`. Nenhuma senha é digitada — o token já foi obtido pelo BFF.
 *
 * Uso: node scripts/capturas-24-11.mjs <token-sem-imagem> <token-com-imagem>
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io";
const SEM = process.argv[2];
const COM = process.argv[3];
const token = readFileSync("/tmp/tok.txt", "utf8").trim();

mkdirSync("screenshots/24-11", { recursive: true });

async function novoContexto(browser, largura) {
  const ctx = await browser.newContext({
    viewport: { width: largura, height: 1000 },
    deviceScaleFactor: 1,
  });
  const url = new URL(BASE);
  await ctx.addCookies([
    { name: "ac_sessao", value: "1", url: BASE },
    { name: "cr_sessao", value: token, url: BASE, httpOnly: true, secure: url.protocol === "https:" },
  ]);
  return ctx;
}

const browser = await chromium.launch();
try {
  for (const [largura, sufixo] of [
    [1440, "1440"],
    [390, "390"],
  ]) {
    const ctx = await novoContexto(browser, largura);

    const semImg = await ctx.newPage();
    await semImg.goto(`${BASE}/p/${SEM}`, { waitUntil: "networkidle" });
    await semImg.waitForTimeout(1200);
    await semImg.screenshot({ path: `screenshots/24-11/sem-imagem-${sufixo}.png`, fullPage: true });

    const comImg = await ctx.newPage();
    await comImg.goto(`${BASE}/p/${COM}`, { waitUntil: "networkidle" });
    await comImg.waitForTimeout(1500);
    await comImg.screenshot({ path: `screenshots/24-11/capa-repetida-${sufixo}.png`, fullPage: true });

    if (sufixo === "1440") {
      const admin = await ctx.newPage();
      await admin.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
      await admin.waitForTimeout(800);
      const titulo = await admin.locator("h1").first().textContent().catch(() => null);
      console.log("admin h1:", titulo);
      await admin.screenshot({ path: "screenshots/24-11/admin-1440.png", fullPage: true });
    }

    await ctx.close();
  }

  // Prova textual do fundo sólido: o HTML do card não deve trazer mais os halos.
  const ctx = await novoContexto(browser, 1440);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/p/${SEM}`, { waitUntil: "networkidle" });
  const halos = await page.evaluate(() =>
    document.body.innerHTML.includes("radial-gradient"),
  );
  console.log("halos translucidos no HTML:", halos, "(esperado: false)");
  await ctx.close();
} finally {
  await browser.close();
}
