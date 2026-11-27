/**
 * Prova do botão Admin no topo (27/11/2026): aparece para administrador e some
 * para usuário comum. Mede o DOM, não só o print.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.CAROUSEL_URL ?? "https://app.contentx.com.br";
mkdirSync("screenshots/27-11", { recursive: true });

async function abrir(browser, tok, refresh, nome) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 400 } });
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
  await p.goto(`${BASE}/projetos`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);

  const linkAdmin = p.locator('header a[href="/admin"]');
  const visivel = await linkAdmin.count();
  const rotulos = await p.locator("header a").allInnerTexts();
  console.log(`[${nome}] links no topo:`, rotulos.map((t) => t.replace(/\s+/g, " ").trim()).join(" | "));
  console.log(`[${nome}] botão Admin presente:`, visivel > 0);

  await p.screenshot({ path: `screenshots/27-11/topo-${nome}.png`, clip: { x: 0, y: 0, width: 1440, height: 70 } });
  await ctx.close();
  return visivel;
}

const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
const refresh = readFileSync("/tmp/refresh.txt", "utf8").trim();
const tokComum = readFileSync("/tmp/tok_naoadmin.txt", "utf8").trim();
const refreshComum = readFileSync("/tmp/refresh_naoadmin.txt", "utf8").trim();

const b = await chromium.launch();
const admin = await abrir(b, tok, refresh, "admin");
const comum = await abrir(b, tokComum, refreshComum, "comum");
await b.close();

console.log("resultado:", admin > 0 && comum === 0 ? "OK (admin vê, comum não)" : "FALHOU");
