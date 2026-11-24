/**
 * Prova do upload manual no editor de resultado (24/11/2026).
 * Envia um arquivo real pelo input do primeiro card e mede o efeito no DOM.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io";
const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
const id = process.argv[2];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1200 } });
await ctx.addCookies([
  { name: "ac_sessao", value: "1", url: BASE },
  { name: "cr_sessao", value: tok, url: BASE, httpOnly: true, secure: true },
]);
const p = await ctx.newPage();
await p.goto(`${BASE}/?abrir=${id}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);

const antes = await p.locator("button", { hasText: "Remover imagem" }).count();
await p.locator('input[type="file"]').first().setInputFiles("/tmp/foto-teste.png");
await p.waitForTimeout(3000);
const depois = await p.locator("button", { hasText: "Remover imagem" }).count();
const imgs = await p.locator('[data-card-export] img').count();

console.log("remover-antes:", antes, "| remover-depois:", depois, "| imgs nos cards:", imgs);
console.log("upload aplicou:", depois > antes || imgs > 0);
await p.screenshot({ path: "screenshots/24-11/editor-upload-1440.png", fullPage: true });
await b.close();
