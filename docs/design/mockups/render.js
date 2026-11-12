// Renderiza os mockups em PNG: 1280×900 (desktop) e 390×844 (mobile).
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const DIR = path.resolve(__dirname);
const SHOTS = path.resolve(__dirname, "..", "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const ARQUIVOS = [
  "editor-a-neutro-denso",
  "editor-b-claro-arejado",
  "editor-c-acento-confiante",
  "galeria-a-neutro-denso",
  "galeria-b-claro-arejado",
  "galeria-c-acento-confiante",
];

(async () => {
  const browser = await chromium.launch({
    executablePath: "/root/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const nome of ARQUIVOS) {
    for (const [vp, w, h, dpr] of [["1280", 1280, 900, 2], ["390", 390, 844, 3]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const page = await ctx.newPage();
      await page.goto("file://" + path.join(DIR, nome + ".html"), { waitUntil: "load" });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const saida = path.join(SHOTS, `${nome}-${vp}.png`);
      await page.screenshot({ path: saida, fullPage: nome.startsWith("galeria") && vp === "390" });
      console.log(nome, vp, "overflow-x:", overflow, "->", path.basename(saida));
      await ctx.close();
    }
  }
  await browser.close();
})();
