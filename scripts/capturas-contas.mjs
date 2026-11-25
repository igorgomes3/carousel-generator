/** Capturas de 25/11: Entrada no /admin e chaves por usuário em /configuracoes. */
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const BASE = process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io";
const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
const refresh = readFileSync("/tmp/refresh.txt", "utf8").trim();
mkdirSync("screenshots/25-11", { recursive: true });
const b = await chromium.launch();
for (const [largura, sufixo] of [[1440, "1440"], [390, "390"]]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 1200 } });
  // `garantirSessao` olha o refresh em localStorage; sem isto a tela privada
  // redireciona para /login mesmo com cookie válido.
  await ctx.addInitScript((r) => { try { localStorage.setItem("ac_refresh", r); } catch {} }, refresh);
  await ctx.addCookies([
    { name: "ac_sessao", value: "1", url: BASE },
    { name: "cr_sessao", value: tok, url: BASE, httpOnly: true, secure: true },
  ]);
  for (const [rota, nome] of [["/admin", "admin"], ["/configuracoes", "configuracoes"]]) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `screenshots/25-11/${nome}-${sufixo}.png`, fullPage: true });
    console.log(rota, sufixo, await p.locator("h1,h2").first().textContent().catch(() => "?"));
    await p.close();
  }
  await ctx.close();
}
await b.close();
