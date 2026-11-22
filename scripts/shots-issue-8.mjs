/**
 * Capturas da issue #8 ("remover temas e Google News"), antes e depois.
 *
 * Não é teste: é a prova que o CEO pede ("quero ver"). O script sobe contra um
 * servidor já rodando, mocka a API do AutoClinic rota a rota (a API de verdade
 * exige token e não é o objeto desta medição) e salva PNG em 390 e 1440:
 *
 *   01-estudio            o estúdio, com "Minhas pautas" (só existe no depois)
 *   02-editor-sugestoes   o editor com a fila de pauta por notícia respondendo —
 *                         o painel "Sugestões para aprovar" aparece no antes e
 *                         não existe no depois
 *   03-editor-salvo       carrossel salvo com campo fora do schema (cor "red"
 *                         escrita à mão e paleta "aqua"): no antes o documento é
 *                         descartado e a tela mostra o padrão; no depois os
 *                         textos do usuário aparecem
 *
 * Uso:
 *   node scripts/shots-issue-8.mjs --base http://127.0.0.1:8099 --saida screenshots/issue-8/depois
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};

const BASE = arg("base", "http://127.0.0.1:8099");
const SAIDA = arg("saida", "screenshots/issue-8/depois");
const ID = "7e7ded22-878b-4b4f-b18f-a7b891bb20b7";
mkdirSync(SAIDA, { recursive: true });

/** Documento real do banco, com dois campos que versões antigas gravavam. */
const docReal = JSON.parse(readFileSync("tests/visual/fixtures/documento-real.json", "utf8"));
const DOC_SALVO = {
  ...docReal,
  config: {
    ...docReal.config,
    theme: { ...docReal.config.theme, pallette: "aqua" }, // paleta que saiu do produto
    fonts: { ...docReal.config.fonts, font1: "Playfair_Display" }, // fonte que não existe aqui
  },
  slides: docReal.slides.map((slide, i) =>
    i === 0
      ? {
          ...slide,
          elements: slide.elements.map((el, j) =>
            j === 0 && el.type === "Title" ? { ...el, color: "red" } : el, // cor fora do hex
          ),
        }
      : slide,
  ),
};

const FILA = {
  fila: [
    {
      id: "f1",
      estado: "ideia",
      briefing: {
        angulo: "Vigilância sanitária aperta o cerco em clínicas de estética",
        gancho: "A fiscalização mudou o que ela olha primeiro",
        plano_slides: [
          { funcao: "gancho", ideia: "O que mudou na fiscalização" },
          { funcao: "contexto", ideia: "Onde a clínica erra primeiro" },
          { funcao: "cta", ideia: "Salve o checklist" },
        ],
        visual: { tipo_imagem: "foto_pessoa", descricao: "Recepção de clínica, luz fria", paleta: "black" },
      },
      sinal_titulo: "Anvisa publica nova regra para procedimentos estéticos",
      sinal_url: "https://news.google.com/exemplo",
      origem: "google_news",
      pontuacao: 8.4,
      sinal_id: "s1",
      slides: 7,
    },
  ],
};

async function preparar(page) {
  await page.route("**/api/auth/refresh", (rota) =>
    rota.fulfill({ json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" } }),
  );
  await page.route("**/api/ac/**", (rota) => {
    const url = rota.request().url();
    const metodo = rota.request().method();
    if (url.includes("/me")) {
      return rota.fulfill({
        json: {
          usuario: {
            id: "u1",
            email: "ana@autoclinic.com",
            nome: "Ana Prado",
            papel: "admin",
            organization_id: "org-autoclinic",
            deve_trocar_senha: false,
          },
        },
      });
    }
    if (url.includes("/carrossel/marca")) {
      return rota.fulfill({ json: { marca: { nome: "Clínica Aurora", handle: "@clinicaaurora", avatar_url: null } } });
    }
    if (url.includes("/conteudo/fila") && metodo === "GET") return rota.fulfill({ json: FILA });
    if (url.includes(`/carrossel/carrosseis/${ID}`) && metodo === "GET") {
      return rota.fulfill({
        json: {
          carrossel: {
            id: ID,
            titulo: "Fiscalização na estética",
            versao_atual: 3,
            documento: DOC_SALVO,
          },
        },
      });
    }
    if (url.includes("/carrossel/carrosseis") && metodo === "GET") {
      return rota.fulfill({
        json: {
          carrosseis: [
            {
              id: ID,
              titulo: "Fiscalização na estética",
              estado: "aprovada",
              estado_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString(),
              slides: 7,
            },
          ],
        },
      });
    }
    return rota.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("ac_refresh", "refresh-de-teste");
    } catch {
      /* origem opaca */
    }
  });
}

async function capturar(browser, largura) {
  const ctx = await browser.newContext({
    viewport: { width: largura, height: largura < 500 ? 844 : 900 },
    deviceScaleFactor: 2,
    locale: "pt-BR",
  });
  await ctx.addCookies([{ name: "ac_sessao", value: "1", domain: "127.0.0.1", path: "/" }]);
  const page = await ctx.newPage();
  await preparar(page);

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SAIDA}/01-estudio-${largura}.png`, fullPage: true });

  await page.goto(`${BASE}/carrossel/${ID}/editar`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[id^="page-base-"]', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SAIDA}/02-editor-sugestoes-${largura}.png`, fullPage: true });

  // O painel de sugestões vive abaixo do slide; o recorte prova presença/ausência
  // sem depender da altura total da página.
  const painel = page.getByText("Sugestões para aprovar", { exact: false });
  const temPainel = (await painel.count()) > 0;
  console.log(`${largura}px · painel "Sugestões para aprovar" presente: ${temPainel}`);

  const textoSalvo = await page.locator('[id^="page-base-"]').first().innerText();
  console.log(`${largura}px · primeiro slide começa com: ${JSON.stringify(textoSalvo.slice(0, 60))}`);

  await ctx.close();
}

const browser = await chromium.launch();
for (const largura of [390, 1440]) await capturar(browser, largura);
await browser.close();
console.log(`capturas em ${SAIDA}`);
