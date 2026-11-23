/**
 * Prova de transbordo de texto nos cards do carrossel (W98).
 *
 * Mede, no card real de 1080×1440, cada bloco de texto de cada slide com o
 * roteiro de estouro: manchete de ~90 caracteres e corpo de ~400. Responde
 * quatro perguntas por bloco, com número:
 *
 *   1. o bloco está cortando conteúdo?  ->  scrollHeight vs clientHeight
 *   2. quantas linhas ele ocupa?        ->  caixas de linha do Range
 *   3. sai do card?                     ->  bottom do bloco vs bottom da arte
 *   4. sai da janela 4:5?               ->  bottom vs sangria + área segura
 *
 * Roda contra qualquer build servido: `BASE_URL=http://127.0.0.1:8099 node
 * scripts/prova-transbordo.mjs antes`. É o "antes" e o "depois" medidos pelo
 * MESMO instrumento, senão os dois números não são comparáveis.
 *
 * Também baixa o PNG do card de estouro pelo botão de verdade ("Baixar PNG"),
 * para provar que o arquivo exportado não transborda — preview passar e PNG
 * sair errado é exatamente o risco que este trabalho existe para fechar.
 */
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";
import { promises as fs } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8099";
const ROTULO = process.argv[2] || "medida";
const SAIDA = process.env.SAIDA || "screenshots/w98";
const TEMA = "por que ninguém salva seu carrossel";

/** Manchete de 92 caracteres e corpo de 402 — texto de gente, não "lorem". */
const MANCHETE =
  "POR QUE NINGUÉM SALVA O SEU CARROSSEL MESMO QUANDO ELE ESTÁ BOM DE VERDADE";
const CORPO =
  "Você escreve, revisa, escolhe a fonte, monta os sete cards e publica. Aí o " +
  "post morre na terceira imagem, porque o texto do meio virou um bloco de " +
  "letra miúda que ninguém termina de ler no celular. O problema quase nunca é " +
  "o assunto: é o tamanho de cada card e a quantidade de palavras que você " +
  "tentou encaixar nele sem medir.";

const SLIDES = [
  { tipo: "capa", titulo: MANCHETE, corpo: CORPO, imagem: null },
  { tipo: "conteudo", titulo: MANCHETE, corpo: CORPO, imagem: null },
  { tipo: "conteudo", titulo: "CABEÇALHO DE CARD CURTO", corpo: CORPO, imagem: null },
  { tipo: "cta", titulo: MANCHETE, corpo: CORPO, imagem: null },
];

/** Área segura: 45 px de sangria em cima e embaixo da arte de 1440 (janela 4:5). */
const SANGRIA = 45;
const JANELA_TOPO = SANGRIA;
const JANELA_PE = 1440 - SANGRIA;

async function preparar(page) {
  await page.context().addCookies([
    { name: "ac_sessao", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "ac_sessao", value: "1", domain: "localhost", path: "/" },
  ]);
  await page.route("**/api/ac/**", (r) => {
    const url = r.request().url();
    if (url.includes("/me"))
      return r.fulfill({
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
    if (url.includes("marca"))
      return r.fulfill({ json: { marca: { nome: "Clínica Aurora", handle: "@clinicaaurora", avatar_url: null } } });
    return r.fulfill({ json: {} });
  });
  await page.route("**/api/auth/**", (r) =>
    r.fulfill({ json: { access_token: "token-de-teste", refresh_token: "refresh-de-teste" } }),
  );
  await page.route("**/api/marca", (r) =>
    r.fulfill({ json: { marca: { nome: "Clínica Aurora", handle: "@clinicaaurora", avatar_url: null } } }),
  );
  await page.route("**/api/projetos/*", (r) => r.fulfill({ status: 404, json: { erro: "x" } }));
  await page.route("**/api/projetos", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { projetos: [] } })
      : r.fulfill({ status: 201, json: { projeto: { id: "p", nome: "n", slides: [] } } }),
  );
  await page.route("**/api/gerar", async (r) => {
    const corpo = (r.request().postDataJSON() ?? {}) || {};
    await r.fulfill({
      json: {
        carrossel: {
          id: "11111111-2222-3333-4444-555555555555",
          titulo: SLIDES[0].titulo,
          templateId: "minimalist",
          tema: corpo.tema ?? TEMA,
          slides: SLIDES,
          criadoEm: new Date().toISOString(),
        },
      },
    });
  });
  await page.route("**/api/imagem**", (r) =>
    r.request().method() === "POST"
      ? r.fulfill({ json: { jobId: "job" } })
      : r.fulfill({ json: { status: "erro", erro: "sem IA no gate" } }),
  );
}

async function abrirResultado(page) {
  await page.goto("/");
  await page.getByRole("heading", { name: /Me conta a sua ideia/i }).waitFor({ timeout: 90_000 });
  await page.locator("button").filter({ hasText: "Minimalist" }).first().click({ force: true, timeout: 15_000 });
  await page.getByRole("heading", { name: /Qual é o tema do carrossel/i }).waitFor();
  await page.getByPlaceholder(/por que ninguém salva/i).fill(TEMA);
  await page.getByRole("button", { name: /Gerar \d+ cards?/ }).click();
  await page.getByRole("heading", { name: /Seu carrossel está pronto/i }).waitFor({ timeout: 90_000 });
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Mede os blocos de texto do palco de export (o nó que vira PNG, tamanho real
 * 1080×1440, sem `transform`). Medir na prévia escalada daria números de tela;
 * o que interessa é a arte.
 */
async function medir(page) {
  return page.evaluate(
    ({ manchete, corpo, janelaTopo, janelaPe }) => {
      /** Bloco do card: atributo quando existe (depois), texto quando não (antes). */
      function acharBloco(raiz, prefixo, nome) {
        const porAtributo = raiz.querySelector(`[data-bloco="${nome}"]`);
        if (porAtributo) return porAtributo;
        const alvo = prefixo.slice(0, 24);
        const cands = [...raiz.querySelectorAll("div")].filter((el) =>
          el.textContent.trim().replace(/\s+/g, " ").startsWith(alvo),
        );
        return cands.length ? cands[cands.length - 1] : null;
      }

      function linhas(el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const tops = new Set(
          [...range.getClientRects()].filter((r) => r.height > 0).map((r) => Math.round(r.top)),
        );
        return tops.size;
      }

      const cards = [...document.querySelectorAll("[data-card-export] [data-card-arte]")];
      return cards.map((card) => {
        const rc = card.getBoundingClientRect();
        const nome = card.getAttribute("data-tipo-card");
        const blocos = [];

        const pares = [
          { nome: "manchete", el: acharBloco(card, manchete, "manchete") },
          { nome: "corpo", el: acharBloco(card, corpo, "corpo") },
        ];
        for (const { nome: n, el } of pares) {
          if (!el) {
            blocos.push({ bloco: n, presente: false });
            continue;
          }
          const r = el.getBoundingClientRect();
          const est = getComputedStyle(el);
          blocos.push({
            bloco: n,
            presente: true,
            fontSize: Math.round(parseFloat(est.fontSize)),
            linhas: linhas(el),
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            // >0 = conteúdo cortado dentro da caixa (o "corte silencioso").
            corteInterno: el.scrollHeight - el.clientHeight,
            // >0 = bloco passa do pé da arte (1440) → fora do PNG.
            passaDoCard: Math.round(r.bottom - rc.bottom),
            // >0 = bloco entra na sangria de baixo (janela 4:5 acaba em 1395).
            passaDaJanela: Math.round(r.bottom - (rc.top + janelaPe)),
            acimaDaJanela: Math.round(rc.top + janelaTopo - r.top),
            altura: Math.round(r.height),
            overflowY: est.overflowY,
            lineClamp: est.webkitLineClamp,
            reticencias: /…|\.\.\.$/.test(el.textContent.trim()),
            textoVisivel: el.textContent.trim().replace(/\s+/g, " ").slice(-24),
          });
        }
        return { tipo: nome, blocos };
      });
    },
    { manchete: MANCHETE, corpo: CORPO, janelaTopo: JANELA_TOPO, janelaPe: JANELA_PE },
  );
}

async function main() {
  await fs.mkdir(SAIDA, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await preparar(page);
  await abrirResultado(page);

  const medidas = await medir(page);
  console.log(
    JSON.stringify({ rotulo: ROTULO, base: BASE, quando: new Date().toISOString(), medidas }, null, 2),
  );

  // --- Screenshots da tira de cards: 1440 e 390 ---
  for (const [w, h] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => document.fonts.ready);
    const faixa = page.locator("[data-cartao]").first();
    await faixa.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SAIDA}/${ROTULO}-${w}.png`, fullPage: true });
    // Recorte só dos cards (o que importa: o texto dentro da arte).
    await page
      .locator("[data-cartao]")
      .first()
      .screenshot({ path: `${SAIDA}/${ROTULO}-${w}-card1.png` });
  }

  // --- PNG exportado pelo caminho real (botão "Baixar PNG") ---
  // O índice vem do TIPO na DOM, não de uma posição chutada: o wizard completa a
  // quantidade escolhida com cards vazios e empurra o CTA para o fim, então
  // "card 4" não é o CTA. Chutar posição aqui foi o que exportou um card vazio.
  const indices = await page.evaluate(() => {
    const alvos = {};
    document
      .querySelectorAll("[data-card-export] [data-card-arte]")
      .forEach((el, i) => {
        const tipo = el.getAttribute("data-tipo-card");
        if (!(tipo in alvos)) alvos[tipo] = i;
      });
    return alvos;
  });
  for (const rotulo of ["capa", "conteudo", "cta"]) {
    const i = indices[rotulo];
    if (i === undefined) continue;
    const botao = page.locator(`[aria-label^="Baixar card ${i + 1} de"]`);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      botao.click(),
    ]);
    const destino = path.join(SAIDA, `${ROTULO}-png-${rotulo}.png`);
    await download.saveAs(destino);
    const buf = await fs.readFile(destino);
    const png = PNG.sync.read(buf);
    console.log(
      JSON.stringify({
        exportado: rotulo,
        indiceNaTira: i + 1,
        arquivo: destino,
        bytes: buf.length,
        largura: png.width,
        altura: png.height,
      }),
    );
  }

  await fs.writeFile(
    `${SAIDA}/${ROTULO}-medidas.json`,
    JSON.stringify({ rotulo: ROTULO, base: BASE, medidas }, null, 2),
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
