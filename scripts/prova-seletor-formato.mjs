/**
 * Prova do transbordo no SELETOR DE FORMATO (W98, alvo corrigido).
 *
 * Mede, no card do formato e na badge de estatística, `scrollWidth` vs
 * `clientWidth` — que é o número que separa "texto cortado" de "texto contido".
 * Um card que estoura tem `scrollWidth > clientWidth`; uma badge que estoura
 * também, e é ela que empurra o card.
 *
 * Roda contra qualquer build: `BASE_URL=http://127.0.0.1:8101 node
 * scripts/prova-seletor-formato.mjs antes`. O MESMO instrumento mede antes e
 * depois — sem isso os dois números não são comparáveis.
 */
import { chromium } from "@playwright/test";
import { promises as fs } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8101";
const ROTULO = process.argv[2] || "medida";
const SAIDA = "screenshots/w98-formato";

async function preparar(page) {
  await page.context().addCookies([
    { name: "ac_sessao", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "ac_sessao", value: "1", domain: "localhost", path: "/" },
  ]);
  await page.route("**/api/ac/**", (r) =>
    r.request().url().includes("/me")
      ? r.fulfill({
          json: {
            usuario: {
              id: "u1",
              email: "igorgomes@mail.com",
              nome: "Igor",
              papel: "admin",
              organization_id: "org-autoclinic",
              deve_trocar_senha: false,
            },
          },
        })
      : r.fulfill({ json: {} }),
  );
  await page.route("**/api/auth/**", (r) =>
    r.fulfill({ json: { access_token: "t", refresh_token: "r" } }),
  );
  await page.route("**/api/projetos/*", (r) => r.fulfill({ status: 404, json: { erro: "x" } }));
  await page.route("**/api/projetos", (r) => r.fulfill({ json: { projetos: [] } }));
}

/**
 * Mede o seletor de formato. Cada card de formato é um `<button>` que contém a
 * linha do título + badge; medir o card e a badge separadamente mostra QUAL dos
 * dois transborda (o card é vítima; a badge é culpada).
 */
async function medir(page) {
  return page.evaluate(() => {
    const secao = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").includes("Formato do carrossel"),
    );
    if (!secao) return { erro: "seção de formato não encontrada" };

    const grid = secao.querySelector("[data-formato-grid]") ?? secao.querySelector(".grid");
    const chips = secao.querySelector("[data-formato-chips]") ?? (grid ? grid.previousElementSibling : null);

    const cards = grid ? [...grid.querySelectorAll("[data-formato-card], :scope > button")] : [];
    return {
      viewport: window.innerWidth,
      grid: grid
        ? {
            largura: Math.round(grid.getBoundingClientRect().width),
            colunas: getComputedStyle(grid).gridTemplateColumns,
            alignItems: getComputedStyle(grid).alignItems,
          }
        : null,
      chips: chips
        ? {
            scrollWidth: chips.scrollWidth,
            clientWidth: chips.clientWidth,
            transborda: chips.scrollWidth - chips.clientWidth,
            flexWrap: getComputedStyle(chips).flexWrap,
            overflowX: getComputedStyle(chips).overflowX,
            filhos: [...chips.querySelectorAll(":scope > button")].map((b) => ({
              texto: (b.textContent || "").trim(),
              largura: Math.round(b.getBoundingClientRect().width),
              // cortado pela borda da seção?
              direita: Math.round(b.getBoundingClientRect().right),
            })),
            bordaDaSecao: Math.round(secao.getBoundingClientRect().right),
          }
        : null,
      cards: cards.map((card) => {
        const rc = card.getBoundingClientRect();
        const linha = card.querySelector("[data-formato-titulo]")?.parentElement ?? card.querySelector(":scope > span");
        const titulo = card.querySelector("[data-formato-titulo]") ?? linha?.querySelector(":scope > span");
        const badge = card.querySelector("[data-formato-badge]") ?? linha?.querySelectorAll(":scope > span")[1] ?? null;
        const exemplo = card.querySelector("[data-formato-exemplo]") ?? card.querySelectorAll(":scope > span")[1] ?? null;
        const cs = linha ? getComputedStyle(linha) : null;
        const verso = (el) =>
          el
            ? {
                texto: (el.textContent || "").trim().slice(0, 46),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                transborda: el.scrollWidth - el.clientWidth,
                largura: Math.round(el.getBoundingClientRect().width),
                direitaForaDoCard: Math.round(el.getBoundingClientRect().right - rc.right),
                linhas: Math.round(
                  el.getBoundingClientRect().height /
                    parseFloat(getComputedStyle(el).lineHeight || "14"),
                ),
                whiteSpace: getComputedStyle(el).whiteSpace,
                flexShrink: getComputedStyle(el).flexShrink,
                minWidth: getComputedStyle(el).minWidth,
                overflow: getComputedStyle(el).overflow,
                textOverflow: getComputedStyle(el).textOverflow,
              }
            : null;
        return {
          card: {
            texto: (card.textContent || "").trim().slice(0, 20),
            largura: Math.round(rc.width),
            altura: Math.round(rc.height),
            scrollWidth: card.scrollWidth,
            clientWidth: card.clientWidth,
            transborda: card.scrollWidth - card.clientWidth,
            overflow: getComputedStyle(card).overflow,
          },
          linha: cs ? { display: cs.display, flexWrap: cs.flexWrap, minWidth: cs.minWidth } : null,
          titulo: verso(titulo),
          badge: verso(badge),
          exemplo: verso(exemplo),
        };
      }),
    };
  });
}

async function main() {
  await fs.mkdir(SAIDA, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await preparar(page);
  await page.goto("/");
  await page.getByRole("heading", { name: /Me conta a sua ideia/i }).waitFor({ timeout: 90_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const medidas = {};
  for (const [w, h] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const secao = page
      .locator("section")
      .filter({ hasText: /Formato do carrossel/i })
      .first();
    await secao.scrollIntoViewIfNeeded();
    await secao.screenshot({ path: `${SAIDA}/${ROTULO}-${w}-secao.png` });
    await page.screenshot({ path: `${SAIDA}/${ROTULO}-${w}.png`, fullPage: true });
    medidas[w] = await medir(page);
    console.log(`\n=== ${ROTULO} @ ${w}px ===`);
    console.log(JSON.stringify(medidas[w], null, 1));
  }
  await fs.writeFile(`${SAIDA}/${ROTULO}-medidas.json`, JSON.stringify({ rotulo: ROTULO, base: BASE, medidas }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
