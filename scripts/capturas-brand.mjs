/** Capturas do rebrand CONTENTX (25/11): estúdio, login, admin, projetos. */
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const BASE = process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io";
const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
const refresh = readFileSync("/tmp/refresh.txt", "utf8").trim();
mkdirSync("screenshots/25-11-brand", { recursive: true });
const b = await chromium.launch();
for (const [largura, sufixo] of [[1440, "1440"], [390, "390"]]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 1000 } });
  await ctx.addInitScript((r) => { try { localStorage.setItem("ac_refresh", r); } catch {} }, refresh);
  await ctx.addCookies([
    { name: "ac_sessao", value: "1", url: BASE },
    { name: "cr_sessao", value: tok, url: BASE, httpOnly: true, secure: true },
  ]);
  for (const [rota, nome] of [["/", "estudio"], ["/projetos", "projetos"], ["/admin", "admin"]]) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1100);
    await p.screenshot({ path: `screenshots/25-11-brand/${nome}-${sufixo}.png`, fullPage: false });
    await p.close();
  }
  // login sem sessão
  const anon = await b.newContext({ viewport: { width: largura, height: 900 } });
  const lp = await anon.newPage();
  await lp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await lp.waitForTimeout(600);
  await lp.screenshot({ path: `screenshots/25-11-brand/login-${sufixo}.png`, fullPage: false });
  await anon.close();
  await ctx.close();
}
await b.close();
