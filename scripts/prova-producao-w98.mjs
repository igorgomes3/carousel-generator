/**
 * Prova do encaixe de texto no SELETOR DE FORMATO — em PRODUÇÃO.
 *
 * Diferente das outras provas: aqui não há mock nenhum. Faz login de verdade
 * (cookie do `POST /api/auth/login`), abre a tela de criação no domínio público
 * e mede `scrollWidth` vs `clientWidth` do card de formato e da badge de
 * estatística. É o número que precisa bater com o medido no build local; se não
 * bater, o problema é build/env, não CSS.
 *
 * A senha NUNCA é lida aqui: o cookie já vem pronto de `scripts/login-producao.sh`.
 */
import { chromium } from "@playwright/test";
import { promises as fs } from "node:fs";

const BASE = process.env.BASE_URL || "https://carrossel.149-56-214-54.sslip.io";
const JAR = process.env.JAR || "/tmp/w98-prod-cookies.txt";
const ROTULO = process.argv[2] || "prod";
const SAIDA = "screenshots/w98-prod";

/** Cookie jar (formato Netscape) do curl → cookies do Playwright. */
function cookiesDoJar(texto, host) {
  return texto
    .split("\n")
    .filter((l) => l && !l.startsWith("#") || l.startsWith("#HttpOnly_"))
    .map((l) => l.replace(/^#HttpOnly_/, "").split("\t"))
    .filter((c) => c.length >= 7)
    .map(([domain, , path, secure, expires, name, value]) => ({
      name,
      value,
      domain: domain.replace(/^\./, ""),
      path,
      expires: Number(expires) || -1,
      httpOnly: false,
      secure: secure === "TRUE",
      sameSite: "Lax",
    }))
    .filter((c) => c.domain.includes(host));
}

async function main() {
  await fs.mkdir(SAIDA, { recursive: true });
  const jar = await fs.readFile(JAR, "utf8");
  const cookies = cookiesDoJar(jar, "sslip.io");
  if (!cookies.length) throw new Error("jar de cookies vazio — login não rodou");
  console.log("cookies do login:", cookies.map((c) => `${c.name}(${c.value.length}b)`).join(", "));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("heading", { name: /Me conta a sua ideia/i }).waitFor({ timeout: 90_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  // Quem está logado (prova de que a sessão real abriu a tela, não um mock).
  const eu = await page.evaluate(async () => {
    const r = await fetch("/api/auth/eu", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, email: j?.usuario?.email ?? null };
  });
  console.log("sessão:", JSON.stringify(eu));

  const medir = () =>
    page.evaluate(() => {
      const secao = [...document.querySelectorAll("section")].find((s) =>
        (s.textContent || "").includes("Formato do carrossel"),
      );
      if (!secao) return { erro: "seção não encontrada" };
      const grid = secao.querySelector("[data-formato-grid]") ?? secao.querySelector(".grid");
      const chips = secao.querySelector("[data-formato-chips]");
      const cards = [...(grid?.querySelectorAll("[data-formato-card]") ?? [])];
      const verso = (el) =>
        el
          ? {
              texto: (el.textContent || "").trim().slice(0, 34),
              largura: Math.round(el.getBoundingClientRect().width),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              linhas:
                el.getBoundingClientRect().height > 0
                  ? Math.round(
                      el.getBoundingClientRect().height /
                        parseFloat(getComputedStyle(el).lineHeight || "14"),
                    )
                  : 0,
              foraDoCard: Math.round(
                el.getBoundingClientRect().right - (el.closest("button")?.getBoundingClientRect().right ?? 0),
              ),
              whiteSpace: getComputedStyle(el).whiteSpace,
            }
          : null;
      return {
        alignItems: grid ? getComputedStyle(grid).alignItems : null,
        colunas: grid ? getComputedStyle(grid).gridTemplateColumns : null,
        chips: chips
          ? {
              scrollWidth: chips.scrollWidth,
              clientWidth: chips.clientWidth,
              transborda: chips.scrollWidth - chips.clientWidth,
              flexWrap: getComputedStyle(chips).flexWrap,
            }
          : null,
        cards: cards.map((card) => ({
          altura: Math.round(card.getBoundingClientRect().height),
          scrollWidth: card.scrollWidth,
          clientWidth: card.clientWidth,
          transborda: card.scrollWidth - card.clientWidth,
          titulo: verso(card.querySelector("[data-formato-titulo]")),
          badge: verso(card.querySelector("[data-formato-badge]")),
        })),
      };
    });

  for (const [w, h] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const secao = page.locator("section").filter({ hasText: /Formato do carrossel/i }).first();
    await secao.scrollIntoViewIfNeeded();
    await secao.screenshot({ path: `${SAIDA}/${ROTULO}-${w}-secao.png` });
    const m = await medir();
    console.log(`\n=== PRODUÇÃO @ ${w}px ===`);
    console.log(`grid align=${m.alignItems} colunas=${m.colunas}`);
    console.log(`chips scroll=${m.chips?.scrollWidth} client=${m.chips?.clientWidth} transborda=${m.chips?.transborda} wrap=${m.chips?.flexWrap}`);
    m.cards.forEach((c, i) =>
      console.log(
        `card${i + 1} alt=${c.altura} card ${c.scrollWidth}/${c.clientWidth} transborda=${c.transborda} | titulo "${c.titulo?.texto}" w=${c.titulo?.largura} l=${c.titulo?.linhas} | badge "${c.badge?.texto}" ${c.badge?.scrollWidth}/${c.badge?.clientWidth} l=${c.badge?.linhas} fora=${c.badge?.foraDoCard}`,
      ),
    );
    await fs.writeFile(`${SAIDA}/${ROTULO}-${w}.json`, JSON.stringify(m, null, 2));
  }

  const build = await page.evaluate(() => document.documentElement.innerHTML.match(/"buildId":"([^"]+)"/)?.[1] ?? null);
  console.log("\nbuildId no HTML:", build);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
