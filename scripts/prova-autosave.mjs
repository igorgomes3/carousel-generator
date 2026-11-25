/**
 * Prova do salvamento automático (25/11/2026): edita um card e espera — o PATCH
 * deve sair sem ninguém clicar em Salvar.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const BASE = process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io";
const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
const refresh = readFileSync("/tmp/refresh.txt", "utf8").trim();
const id = process.argv[2];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript((r) => { try { localStorage.setItem("ac_refresh", r); } catch {} }, refresh);
await ctx.addCookies([
  { name: "ac_sessao", value: "1", url: BASE },
  { name: "cr_sessao", value: tok, url: BASE, httpOnly: true, secure: true },
]);
let patches = 0;
ctx.on("request", (r) => {
  if (r.method() === "PATCH" && r.url().includes("/api/projetos/")) patches += 1;
});
const p = await ctx.newPage();
await p.goto(`${BASE}/?abrir=${id}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
patches = 0; // zera ruído da abertura

await p.locator("button", { hasText: /^Editar$/ }).first().click();
await p.waitForTimeout(400);
const campo = p.locator('textarea').first();
await campo.fill("Titulo alterado pelo teste de autosave");
await p.waitForTimeout(6000);

console.log("PATCH automático disparado:", patches > 0, "| total:", patches);
await b.close();
