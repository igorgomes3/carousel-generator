/** Capturas do autopilot (24/11): entrevista salva e lista de projetos. */
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const BASE = process.env.CAROUSEL_URL ?? "https://carrossel.149-56-214-54.sslip.io";
const tok = readFileSync("/tmp/tok.txt", "utf8").trim();
mkdirSync("screenshots/24-11", { recursive: true });
const b = await chromium.launch();
for (const [largura, sufixo] of [[1440, "1440"], [390, "390"]]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 1100 } });
  await ctx.addCookies([
    { name: "ac_sessao", value: "1", url: BASE },
    { name: "cr_sessao", value: tok, url: BASE, httpOnly: true, secure: true },
  ]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/autopilot`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  console.log("autopilot h1:", await p.locator("h1").first().textContent().catch(() => null));
  await p.screenshot({ path: `screenshots/24-11/autopilot-${sufixo}.png`, fullPage: true });
  if (sufixo === "1440") {
    const l = await ctx.newPage();
    await l.goto(`${BASE}/projetos`, { waitUntil: "networkidle" });
    await l.waitForTimeout(1200);
    await l.screenshot({ path: "screenshots/24-11/projetos-1440.png", fullPage: true });
  }
  await ctx.close();
}
await b.close();
