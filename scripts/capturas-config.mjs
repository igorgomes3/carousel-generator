/**
 * Capturas da tela de configurações redesenhada (27/11/2026).
 * Roda contra o servidor publicado, com cookie de sessão + refresh em localStorage
 * (a tela chama garantirSessao, que olha o refresh).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.CAROUSEL_URL ?? "https://app.contentx.com.br";
const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
const refresh = readFileSync("/tmp/refresh.txt", "utf8").trim();

mkdirSync("screenshots/27-11", { recursive: true });

const b = await chromium.launch();
for (const [w, sufixo] of [
  [1440, "1440"],
  [390, "390"],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1200 } });
  await ctx.addInitScript((r) => {
    try {
      localStorage.setItem("ac_refresh", r);
    } catch {}
  }, refresh);
  await ctx.addCookies([
    { name: "ac_sessao", value: "1", url: BASE },
    { name: "cr_sessao", value: tok, url: BASE, httpOnly: true, secure: true },
  ]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  console.log(sufixo, "h1:", await p.locator("h1").first().textContent().catch(() => "?"));
  await p.screenshot({ path: `screenshots/27-11/configuracoes-${sufixo}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
